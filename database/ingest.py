#!/usr/bin/env python3
"""
Sangfor SCP Database Ingestion Module

This module provides functions to ingest data from Sangfor SCP API JSON
into the PostgreSQL database.

Usage:
    from database.ingest import SangforDataIngester
    
    ingester = SangforDataIngester()
    ingester.ingest_from_file('sangfor_servers_20251120_144303.json')
"""

import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal

import psycopg2
from psycopg2.extras import execute_batch, RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class DatabaseConnection:
    """PostgreSQL database connection manager."""
    
    def __init__(self):
        self.host = os.getenv('pgSQL_HOST', 'localhost')
        self.port = int(os.getenv('pgSQL_HOST_PORT', 5432))
        self.dbname = os.getenv('pgSQL_DBNAME', 'sangfor_scp')
        self.user = os.getenv('pgSQL_USERNAME', 'postgres')
        self.password = os.getenv('pgSQL_PASSWORD', '')
        self.conn = None
        
    def connect(self):
        """Establish database connection."""
        if self.conn is None or self.conn.closed:
            self.conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                dbname=self.dbname,
                user=self.user,
                password=self.password,
                cursor_factory=RealDictCursor
            )
            self.conn.autocommit = False
        return self.conn
    
    def close(self):
        """Close database connection."""
        if self.conn and not self.conn.closed:
            self.conn.close()
            
    def __enter__(self):
        return self.connect()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            if self.conn:
                self.conn.rollback()
        else:
            if self.conn:
                self.conn.commit()
        self.close()


class SangforDataIngester:
    """
    Ingests Sangfor SCP API data into PostgreSQL database.
    
    Handles both static data (vm_master, host_master, etc.) and
    time-series metrics (vm_metrics, vm_alarm_snapshot).
    """
    
    def __init__(self, db_connection: DatabaseConnection = None):
        self.db = db_connection or DatabaseConnection()
        self.batch_id = None
        self.collected_at = None
        
    def ingest_from_file(self, filepath: str) -> Dict[str, Any]:
        """
        Ingest data from a JSON file.
        
        Args:
            filepath: Path to the JSON file
            
        Returns:
            Dictionary with ingestion statistics
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return self.ingest_data(data)
    
    def ingest_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingest data from a dictionary (parsed JSON).
        
        Args:
            data: Dictionary containing metadata and servers
            
        Returns:
            Dictionary with ingestion statistics
        """
        stats = {
            'batch_id': None,
            'collected_at': None,
            'total_vms': 0,
            'vms_inserted': 0,
            'vms_updated': 0,
            'metrics_inserted': 0,
            'alarms_inserted': 0,
            'hosts_processed': set(),
            'groups_processed': set(),
            'errors': []
        }
        
        # Extract metadata
        metadata = data.get('metadata', {})
        timestamp_str = metadata.get('timestamp', datetime.now().isoformat())
        
        try:
            self.collected_at = datetime.fromisoformat(timestamp_str)
        except ValueError:
            self.collected_at = datetime.now()
            
        self.batch_id = str(uuid.uuid4())
        stats['batch_id'] = self.batch_id
        stats['collected_at'] = self.collected_at.isoformat()
        
        servers = data.get('servers', [])
        stats['total_vms'] = len(servers)
        
        with self.db as conn:
            cursor = conn.cursor()
            
            try:
                # Ensure partition exists
                self._ensure_partition(cursor)
                
                # Process each server
                for server in servers:
                    try:
                        result = self._process_server(cursor, server)
                        
                        if result['action'] == 'INSERT':
                            stats['vms_inserted'] += 1
                        else:
                            stats['vms_updated'] += 1
                            
                        stats['metrics_inserted'] += result['metrics_inserted']
                        stats['alarms_inserted'] += result['alarms_inserted']
                        
                        if result.get('host_id'):
                            stats['hosts_processed'].add(result['host_id'])
                        if result.get('group_id'):
                            stats['groups_processed'].add(result['group_id'])
                            
                    except Exception as e:
                        # Get detailed traceback
                        import traceback
                        error_traceback = traceback.format_exc()
                        
                        # Rollback on error and re-establish connection
                        conn.rollback()
                        stats['errors'].append({
                            'vm_id': server.get('id', 'unknown'),
                            'vm_name': server.get('name', 'unknown'),
                            'error': str(e),
                            'traceback': error_traceback[-800:]  # Last 800 chars
                        })
                        # Skip this VM and continue
                        continue
                
                # Log the collection batch
                try:
                    self._log_collection(cursor, stats)
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    stats['errors'].append({'log_error': str(e)})
                    # Try to commit without logging
                    conn.commit()
                
            except Exception as e:
                conn.rollback()
                stats['errors'].append({'general_error': str(e)})
                raise
        
        # Convert sets to counts for JSON serialization
        stats['hosts_processed'] = len(stats['hosts_processed'])
        stats['groups_processed'] = len(stats['groups_processed'])
        
        return stats
    
    def _ensure_partition(self, cursor):
        """Ensure partition exists for current timestamp."""
        cursor.execute(
            "SELECT metrics.ensure_partition_exists(%s)",
            (self.collected_at,)
        )
    
    def _process_server(self, cursor, server: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single server/VM record."""
        result = {
            'action': None,
            'metrics_inserted': 0,
            'alarms_inserted': 0,
            'host_id': None,
            'group_id': None
        }
        
        # Extract VM UUID
        vm_uuid = server.get('id')
        if not vm_uuid:
            raise ValueError("VM has no ID")
        
        # 1. Process availability zone FIRST (required by host)
        az_id = server.get('az_id')
        if az_id:
            self._upsert_az(cursor, server)
        
        # 2. Process host (depends on AZ)
        host_id = server.get('host_id')
        if host_id:
            result['host_id'] = host_id
            self._upsert_host(cursor, server)
        
        # 3. Process storage
        storage_id = server.get('storage_id')
        if storage_id:
            self._upsert_storage(cursor, server)
        
        # 4. Process group (depends on AZ)
        group_id = server.get('group_id')
        if group_id:
            result['group_id'] = group_id
            self._upsert_group(cursor, server)
        
        # 5. Process protection policy
        protection_id = server.get('protection_id')
        if protection_id:
            self._upsert_protection(cursor, server)
        
        # 6. Upsert VM master
        action = self._upsert_vm_master(cursor, server)
        result['action'] = action
        
        # 7. Process disk configuration
        disks = server.get('disks', [])
        for disk in disks:
            self._upsert_disk(cursor, vm_uuid, disk)
        
        # 8. Process network configuration
        networks = server.get('networks', [])
        for network in networks:
            self._upsert_network_config(cursor, vm_uuid, network)
        
        # 9. Insert metrics
        self._insert_metrics(cursor, server)
        result['metrics_inserted'] = 1
        
        # 10. Insert alarm if exists
        alarm_inserted = self._insert_alarm_if_exists(cursor, server)
        result['alarms_inserted'] = 1 if alarm_inserted else 0
        
        return result
    
    def _upsert_az(self, cursor, server: Dict[str, Any]):
        """Upsert availability zone."""
        az_id = server.get('az_id')
        az_name = server.get('az_name', 'Default')
        
        if not az_id:
            return
        
        cursor.execute(
            "SELECT sangfor.upsert_az(%s, %s, %s)",
            (az_id, az_name, None)
        )
    
    def _upsert_host(self, cursor, server: Dict[str, Any]):
        """Upsert host master."""
        host_id = server.get('host_id')
        host_name = server.get('host_name', host_id)
        az_id = server.get('az_id')
        
        if not host_id:
            return
        
        cursor.execute(
            "SELECT sangfor.upsert_host(%s, %s, %s, %s, %s, %s)",
            (host_id, host_name, az_id, 'hci', None, None)
        )
    
    def _upsert_storage(self, cursor, server: Dict[str, Any]):
        """Upsert storage master."""
        storage_id = server.get('storage_id')
        storage_name = server.get('storage_name', storage_id)
        storage_policy_id = server.get('storage_policy_id')
        
        if not storage_id:
            return
        
        cursor.execute(
            "SELECT sangfor.upsert_storage(%s, %s, %s, %s, %s)",
            (storage_id, storage_name, storage_policy_id, None, None)
        )
    
    def _upsert_group(self, cursor, server: Dict[str, Any]):
        """Upsert VM group."""
        group_id = server.get('group_id')
        group_name = server.get('group_name', 'Default')
        group_name_path = server.get('group_name_path')
        group_id_path = server.get('group_id_path')
        az_id = server.get('az_id')
        
        if not group_id:
            return
        
        cursor.execute(
            "SELECT sangfor.upsert_vm_group(%s, %s, %s, %s, %s, %s)",
            (group_id, group_name, group_name_path, group_id_path, None, az_id)
        )
    
    def _upsert_protection(self, cursor, server: Dict[str, Any]):
        """Upsert protection policy."""
        protection_id = server.get('protection_id')
        if not protection_id or (isinstance(protection_id, str) and protection_id.strip() == ''):
            return
            
        protection_name = server.get('protection_name', 'Default')
        protection_type = server.get('protection_type')
        protection_enabled = server.get('protection_enable') == 'True'
        
        cursor.execute(
            "SELECT sangfor.upsert_protection(%s, %s, %s, %s)",
            (protection_id, protection_name, protection_type, protection_enabled)
        )
    
    def _upsert_vm_master(self, cursor, server: Dict[str, Any]) -> str:
        """Upsert VM master and return action (INSERT/UPDATE)."""
        vm_uuid = server.get('id')
        vm_id = server.get('vm_id')
        
        # Extract OS info (ensure it's a dict)
        os_option = server.get('os_option')
        if not isinstance(os_option, dict):
            os_option = {}
        
        # Extract advance params (ensure it's a dict)
        advance_param = server.get('advance_param')
        if not isinstance(advance_param, dict):
            advance_param = {}
        
        # Check if VM exists
        cursor.execute(
            "SELECT vm_uuid FROM sangfor.vm_master WHERE vm_uuid = %s",
            (vm_uuid,)
        )
        exists = cursor.fetchone() is not None
        
        # Build parameters (convert empty strings to None for UUID/numeric types)
        def clean_value(val):
            """Convert empty string to None"""
            if isinstance(val, str) and val.strip() == '':
                return None
            return val
        
        params = (
            clean_value(vm_uuid),                       # p_vm_uuid
            vm_id,                                      # p_vm_id
            server.get('name', 'Unknown'),              # p_name
            clean_value(server.get('vmtype')),          # p_vmtype
            server.get('type', 'hci'),                  # p_platform_type
            clean_value(server.get('az_id')),           # p_az_id
            clean_value(server.get('host_id')),         # p_host_id
            clean_value(server.get('group_id')),        # p_group_id
            clean_value(server.get('storage_id')),      # p_storage_id
            clean_value(server.get('project_id')),      # p_project_id
            clean_value(server.get('project_name')),    # p_project_name
            clean_value(server.get('user_id')),         # p_user_id
            clean_value(server.get('user_name')),       # p_user_name
            clean_value(server.get('os_type')),         # p_os_type
            clean_value(server.get('os_name')),         # p_os_name
            server.get('os_installed'),                 # p_os_installed
            clean_value(os_option.get('arch')),         # p_os_arch
            clean_value(os_option.get('kernel_name')),  # p_os_kernel
            clean_value(os_option.get('distribution_name')),  # p_os_distribution
            server.get('sockets'),                      # p_cpu_sockets
            server.get('cores'),                        # p_cpu_cores
            server.get('cores_per_socket'),             # p_cpu_cores_per_socket
            server.get('mhz'),                          # p_cpu_total_mhz
            server.get('memory_mb'),                    # p_memory_total_mb
            server.get('storage_mb'),                   # p_storage_total_mb
            server.get('has_gpu', 0) == 1,              # p_has_gpu
            json.dumps(server.get('gpu_conf')) if server.get('gpu_conf') else None,  # p_gpu_conf
            server.get('vtool_installed', 0) == 1,      # p_vtool_installed
            server.get('encrypted', 0) == 1,            # p_encrypted
            advance_param.get('balloon_memory', 0) == 1, # p_balloon_memory
            advance_param.get('onboot', 1) == 1,        # p_onboot
            advance_param.get('abnormal_recovery', 1) == 1, # p_abnormal_recovery
            clean_value(advance_param.get('vga')),      # p_vga_type
            clean_value(server.get('protection_id')),   # p_protection_id
            server.get('protection_enable') == 'True',  # p_protection_enabled
            server.get('in_protection', 0) == 1,        # p_in_protection
            server.get('backup_policy_enable', 0) == 1, # p_backup_policy_enable
            server.get('backup_file_count', 0),         # p_backup_file_count
            clean_value(server.get('template_id')),     # p_template_id
            clean_value(server.get('image_id')),        # p_image_id
            clean_value(server.get('image_name')),      # p_image_name
            clean_value(server.get('expire_time')),     # p_expire_time
            # Convert tags to array (handle dict, list, or None)
            server.get('tags') if isinstance(server.get('tags'), list) else [],  # p_tags
            clean_value(server.get('description')),     # p_description
        )
        
        # Debug: Check for dict values in params
        for i, param in enumerate(params):
            if isinstance(param, dict):
                print(f"WARNING: Parameter {i} is a dict: {param}")
                raise ValueError(f"Parameter {i} at line {i+1} is a dict and cannot be inserted")
        
        cursor.execute(
            """SELECT * FROM sangfor.upsert_vm_master(
                %s::UUID, %s::BIGINT, %s, %s, %s, 
                %s::UUID, %s, %s::UUID, %s, %s,
                %s, %s, %s, %s, %s, 
                %s::SMALLINT, %s, %s, %s, %s::SMALLINT,
                %s::SMALLINT, %s::SMALLINT, %s::NUMERIC, %s::NUMERIC, %s::NUMERIC, 
                %s::BOOLEAN, %s::JSONB, %s::BOOLEAN, %s::BOOLEAN, %s::BOOLEAN,
                %s::BOOLEAN, %s::BOOLEAN, %s, %s::UUID, %s::BOOLEAN, 
                %s::BOOLEAN, %s::BOOLEAN, %s::INTEGER, %s, %s,
                %s, %s, %s::TEXT[], %s
            )""",
            params
        )
        
        return 'INSERT' if not exists else 'UPDATE'
    
    def _upsert_disk(self, cursor, vm_uuid: str, disk: Dict[str, Any]):
        """Upsert disk configuration."""
        cursor.execute(
            "SELECT sangfor.upsert_vm_disk(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                vm_uuid,
                disk.get('id'),                         # disk_id
                disk.get('storage_id'),                 # storage_id
                disk.get('storage_name'),               # storage_name
                disk.get('storage_file'),               # storage_file
                disk.get('size_mb'),                    # size_mb
                disk.get('preallocate'),                # preallocate
                disk.get('eagerly_scrub', 0) == 1,      # eagerly_scrub
                disk.get('storage_tag_id'),             # storage_tag_id
                disk.get('physical_disk_type'),         # physical_disk_type
            )
        )
    
    def _upsert_network_config(self, cursor, vm_uuid: str, network: Dict[str, Any]):
        """Upsert network interface configuration."""
        # Parse IP address (convert empty string to None)
        ip_address = network.get('ip_address')
        if not ip_address or ip_address.strip() == '':
            ip_address = None
        
        ipv6_address = network.get('ipv6_address')
        if not ipv6_address or ipv6_address.strip() == '':
            ipv6_address = None
        
        # Parse port_id as UUID if present (convert empty string to None)
        port_id = network.get('port_id')
        if not port_id or port_id.strip() == '':
            port_id = None
        else:
            try:
                uuid.UUID(port_id)  # Validate UUID format
            except (ValueError, TypeError):
                port_id = None
        
        # Parse device_id as UUID if present (convert empty string to None)
        device_id = network.get('device_id')
        if not device_id or device_id.strip() == '':
            device_id = None
        else:
            try:
                uuid.UUID(device_id)
            except (ValueError, TypeError):
                device_id = None
        
        cursor.execute(
            "SELECT sangfor.upsert_vm_nic(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                vm_uuid,
                network.get('vif_id'),                  # vif_id
                port_id,                                # port_id
                network.get('name'),                    # network_name
                network.get('mac_address'),             # mac_address
                ip_address,                             # ip_address
                ipv6_address,                           # ipv6_address
                network.get('model', 'virtio'),         # model
                network.get('connect', 1) == 1,         # is_connected
                network.get('vpc_id'),                  # vpc_id
                network.get('vpc_name'),                # vpc_name
                network.get('subnet_id'),               # subnet_id
                network.get('subnet_name'),             # subnet_name
                device_id,                              # device_id
            )
        )
    
    def _insert_metrics(self, cursor, server: Dict[str, Any]):
        """Insert VM metrics."""
        vm_uuid = server.get('id')
        
        # Extract metrics from nested objects
        cpu_status = server.get('cpu_status', {})
        memory_status = server.get('memory_status', {})
        storage_status = server.get('storage_status', {})
        network_status = server.get('network_status', {})
        io_status = server.get('io_status', {})
        gpu_status = server.get('gpu_status', {})
        
        cursor.execute(
            """SELECT metrics.insert_vm_metrics(
                %s::TIMESTAMPTZ, %s::UUID, %s::UUID, %s::VARCHAR, %s::VARCHAR, 
                %s::BIGINT, %s::BOOLEAN,
                %s::NUMERIC, %s::NUMERIC, %s::NUMERIC, 
                %s::NUMERIC, %s::NUMERIC, %s::NUMERIC,
                %s::NUMERIC, %s::NUMERIC, %s::NUMERIC, %s::NUMERIC, 
                %s::NUMERIC, %s::NUMERIC,
                %s::NUMERIC, %s::NUMERIC, %s::NUMERIC, %s::NUMERIC,
                %s::SMALLINT, %s::BIGINT, %s::BIGINT, 
                %s::NUMERIC, %s::NUMERIC, 
                %s::VARCHAR, %s::VARCHAR
            )""",
            (
                self.collected_at,                           # p_collected_at
                self.batch_id,                               # p_batch_id
                vm_uuid,                                     # p_vm_uuid
                server.get('power_state'),                   # p_power_state
                server.get('status'),                        # p_status
                server.get('uptime'),                        # p_uptime_seconds
                server.get('is_stopped', 0) == 1,            # p_is_stopped
                cpu_status.get('total_mhz'),                 # p_cpu_total_mhz
                cpu_status.get('used_mhz'),                  # p_cpu_used_mhz
                cpu_status.get('ratio'),                     # p_cpu_ratio
                memory_status.get('total_mb'),               # p_memory_total_mb
                memory_status.get('used_mb'),                # p_memory_used_mb
                memory_status.get('ratio'),                  # p_memory_ratio
                storage_status.get('total_mb'),              # p_storage_total_mb
                storage_status.get('used_mb'),               # p_storage_used_mb
                storage_status.get('storage_file_size_mb'),  # p_storage_file_size_mb
                storage_status.get('ratio'),                 # p_storage_ratio
                network_status.get('read_speed_bitps'),      # p_network_read_bitps
                network_status.get('write_speed_bitps'),     # p_network_write_bitps
                io_status.get('read_speed_byteps'),          # p_disk_read_byteps
                io_status.get('write_speed_byteps'),         # p_disk_write_byteps
                io_status.get('read_iops'),                  # p_disk_read_iops
                io_status.get('write_iops'),                 # p_disk_write_iops
                gpu_status.get('graphics_count', 0),         # p_gpu_count
                gpu_status.get('graphics_mem_total', 0),     # p_gpu_mem_total
                gpu_status.get('graphics_mem_used', 0),      # p_gpu_mem_used
                gpu_status.get('graphics_mem_ratio', 0),     # p_gpu_mem_ratio
                gpu_status.get('graphics_ratio', 0),         # p_gpu_ratio
                server.get('host_id'),                       # p_host_id
                server.get('host_name'),                     # p_host_name
            )
        )
    
    def _insert_alarm_if_exists(self, cursor, server: Dict[str, Any]) -> bool:
        """Insert alarm/warning if exists."""
        vm_uuid = server.get('id')
        
        alarm = server.get('alarm', {})
        warning = server.get('warning', {})
        
        has_alarm = alarm.get('alarm', 0) > 0
        has_warning = warning.get('warning', 0) > 0
        
        if not has_alarm and not has_warning:
            return False
        
        cursor.execute(
            """SELECT metrics.insert_vm_alarm_if_exists(
                %s::TIMESTAMP, %s::UUID, %s::UUID, 
                %s::BOOLEAN, %s::INTEGER, %s::JSONB, 
                %s::BOOLEAN, %s::TEXT, %s::TEXT, 
                %s::TEXT, %s::TEXT
            )""",
            (
                self.collected_at,                    # p_collected_at
                self.batch_id,                        # p_batch_id
                vm_uuid,                              # p_vm_uuid
                has_alarm,                            # p_has_alarm
                alarm.get('alarm', 0),                # p_alarm_count
                json.dumps(alarm.get('alarm_info', [])),  # p_alarm_info
                has_warning,                          # p_has_warning
                warning.get('warning_type'),          # p_warning_type
                warning.get('warning_info'),          # p_warning_info
                server.get('power_state'),            # p_power_state
                server.get('status'),                 # p_status
            )
        )
        
        return True
    
    def _log_collection(self, cursor, stats: Dict[str, Any]):
        """Log the collection batch."""
        cursor.execute(
            """INSERT INTO sangfor.collection_log 
               (batch_id, collected_at, source, total_vms, processed_vms, 
                failed_vms, status, error_message, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                self.batch_id,
                self.collected_at,
                'sangfor_scp_api',
                stats['total_vms'],
                stats['vms_inserted'] + stats['vms_updated'],
                len(stats['errors']),
                'success' if not stats['errors'] else 'partial',
                json.dumps(stats['errors']) if stats['errors'] else None,
                json.dumps({
                    'vms_inserted': stats['vms_inserted'],
                    'vms_updated': stats['vms_updated'],
                    'metrics_inserted': stats['metrics_inserted'],
                    'alarms_inserted': stats['alarms_inserted']
                })
            )
        )


def main():
    """Example usage."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <json_file>")
        print("Example: python ingest.py sangfor_servers_20251120_144303.json")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    print(f"Ingesting data from: {filepath}")
    
    ingester = SangforDataIngester()
    stats = ingester.ingest_from_file(filepath)
    
    print("\n=== Ingestion Complete ===")
    print(f"Batch ID: {stats['batch_id']}")
    print(f"Collected at: {stats['collected_at']}")
    print(f"Total VMs: {stats['total_vms']}")
    print(f"VMs Inserted: {stats['vms_inserted']}")
    print(f"VMs Updated: {stats['vms_updated']}")
    print(f"Metrics Inserted: {stats['metrics_inserted']}")
    print(f"Alarms Inserted: {stats['alarms_inserted']}")
    print(f"Hosts Processed: {stats['hosts_processed']}")
    print(f"Groups Processed: {stats['groups_processed']}")
    
    if stats['errors']:
        print(f"\nErrors ({len(stats['errors'])}):")
        for error in stats['errors'][:5]:  # Show first 5 errors
            print(f"  - {error}")


if __name__ == "__main__":
    main()
