"""
Sync Service V2
Main orchestrator for sync operations
"""

import logging
import re
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import text

from .sangfor_client import SangforClient, SangforCredentials
from .db_handler import SyncDbHandler
from .scheduler import SyncScheduler
from ...database import SessionLocal
from ...config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SyncServiceV2:
    """
    Main sync service orchestrator
    Coordinates API client, database handler, and scheduler
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._is_syncing = False
        self._current_job_id: Optional[UUID] = None
        
        # Initialize scheduler with callback
        self._scheduler = SyncScheduler(sync_callback=self._scheduled_sync)
        
        # Auto-cleanup stuck jobs on startup
        try:
            db = SessionLocal()
            handler = SyncDbHandler(db)
            cleaned = handler.cleanup_stuck_jobs()
            if cleaned > 0:
                logger.warning(f"🧹 Cleaned up {cleaned} stuck sync jobs on startup")
            db.close()
        except Exception as e:
            logger.error(f"Failed to cleanup stuck jobs: {e}")
        
        # Load initial config
        self._load_config()
        
        logger.info("✅ SyncServiceV2 initialized")
    
    def _load_config(self):
        """Load configuration from database"""
        try:
            db = SessionLocal()
            handler = SyncDbHandler(db)
            config = handler.get_config()
            
            self._scp_ip = config.get('scp_ip', '') or settings.SCP_IP
            self._scp_username = config.get('scp_username', '') or settings.SCP_USERNAME
            self._scp_password = handler.get_password() or settings.SCP_PASSWORD
            self._scheduler_enabled = config.get('scheduler_enabled', False)
            self._scheduler_interval = config.get('scheduler_interval_minutes', 5)
            
            db.close()
            
            # Auto-start scheduler if enabled
            if self._scheduler_enabled:
                self._scheduler.start(self._scheduler_interval)
                
        except Exception as e:
            logger.warning(f"Failed to load config from DB, using env: {e}")
            self._scp_ip = settings.SCP_IP
            self._scp_username = settings.SCP_USERNAME
            self._scp_password = settings.SCP_PASSWORD

    def _safe_int(self, value: Any) -> int:
        """Safely convert value to int"""
        try:
            if value is None or value == "":
                return 0
            return int(float(value))
        except (ValueError, TypeError):
            return 0
    
    # ============================================================
    # Status & Info
    # ============================================================
    
    @property
    def status(self) -> Dict[str, Any]:
        """Get current sync service status"""
        return {
            "is_syncing": self._is_syncing,
            "current_job_id": str(self._current_job_id) if self._current_job_id else None,
            "scheduler": self._scheduler.status,
            "config": {
                "scp_ip": self._scp_ip,
                "scp_username": self._scp_username,
                "scp_password_set": bool(self._scp_password)
            }
        }
    
    def get_config(self) -> Dict[str, Any]:
        """Get sync configuration"""
        db = SessionLocal()
        try:
            handler = SyncDbHandler(db)
            return handler.get_config()
        finally:
            db.close()
    
    def update_config(self, **kwargs) -> Dict[str, Any]:
        """Update sync configuration"""
        db = SessionLocal()
        try:
            handler = SyncDbHandler(db)
            
            # Handle password separately (encrypt if provided)
            if 'scp_password' in kwargs and kwargs['scp_password']:
                kwargs['scp_password_encrypted'] = kwargs.pop('scp_password')
            elif 'scp_password' in kwargs:
                del kwargs['scp_password']
            
            handler.update_config(**kwargs)
            
            # Reload config
            self._load_config()
            
            return {"success": True, "message": "Configuration updated"}
        finally:
            db.close()
    
    # ============================================================
    # Sync Execution
    # ============================================================
    
    def run_sync(self, source: str = "manual", triggered_by: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a sync job
        Returns job info
        """
        if self._is_syncing:
            return {
                "success": False,
                "error": "Sync already in progress",
                "job_id": str(self._current_job_id) if self._current_job_id else None
            }
        
        db = SessionLocal()
        handler = SyncDbHandler(db)
        
        try:
            # DB-level concurrency check
            running_job = handler.get_running_job()
            if running_job:
                # If found a running job in DB but _is_syncing is False, it's a zombie from another process
                # or race condition. We should fail this request.
                return {
                    "success": False,
                    "error": "Another sync job is already running (DB lock)",
                    "job_id": str(running_job['job_id'])
                }

            self._is_syncing = True
            
            # Create job
            job_id = handler.create_job(source=source, triggered_by=triggered_by)
            self._current_job_id = job_id
            
            logger.info(f"🚀 Starting sync job {job_id}")
            handler.log_job_detail(job_id, "info", "Sync job started", step="init")
            
            # Step 1: Validate configuration
            handler.update_job_progress(job_id, 5, "validating_config")
            if not self._scp_ip or not self._scp_username or not self._scp_password:
                raise ValueError("Missing SCP configuration. Please configure SCP IP, username, and password.")
            
            # Step 2: Connect and authenticate
            handler.update_job_progress(job_id, 10, "authenticating")
            handler.log_job_detail(job_id, "info", f"Connecting to SCP at {self._scp_ip}", step="auth")
            
            credentials = SangforCredentials(
                ip=self._scp_ip,
                username=self._scp_username,
                password=self._scp_password
            )
            client = SangforClient(credentials)
            client.authenticate()
            
            handler.log_job_detail(job_id, "info", "Authentication successful", step="auth")
            
            # Step 3: Fetch servers
            handler.update_job_progress(job_id, 20, "fetching_servers")
            handler.log_job_detail(job_id, "info", "Fetching server list from SCP", step="fetch")
            
            servers = client.fetch_servers()
            total_servers = len(servers)
            
            handler.log_job_detail(job_id, "info", f"Fetched {total_servers} servers", step="fetch")
            
            # Step 4: Process servers
            handler.update_job_progress(job_id, 30, "processing_servers")
            
            # Initialize set to track all active alarms across VMs and System
            all_active_alarm_ids = []
            
            stats = self._process_servers(handler, job_id, servers, all_active_alarm_ids)
            
            # Step 4.5: Sync datastores
            handler.update_job_progress(job_id, 80, "syncing_datastores")
            handler.log_job_detail(job_id, "info", "Fetching datastores from SCP", step="datastores")
            
            try:
                datastores = client.fetch_datastores()
                ds_stats = self._sync_datastores(handler, datastores)
                stats["datastores_synced"] = ds_stats["synced"]
                stats["datastores_inserted"] = ds_stats["inserted"]
                stats["datastores_updated"] = ds_stats["updated"]
                handler.log_job_detail(job_id, "info", f"Synced {ds_stats['synced']} datastores", step="datastores")
            except Exception as ds_err:
                logger.warning(f"Datastore sync error (non-fatal): {ds_err}")
                handler.log_job_detail(job_id, "warning", f"Datastore sync skipped: {ds_err}", step="datastores")
            
            # Step 4.8: Sync System Alarms
            handler.update_job_progress(job_id, 85, "syncing_system_alarms")
            handler.log_job_detail(job_id, "info", "Fetching system alarms from SCP", step="alarms")
            
            try:
                system_alarms = client.get_active_alarms()
                if system_alarms:
                    # We treat system alarms as belonging to a "special" VM or just use a dummy UUID if strict FK
                    # But schema says vm_uuid REFERENCES vm_master.
                    # Usually system alarms are associated with a host or just global. 
                    # If global, maybe we assign to a specific "System" VM or leave null?
                    # Schema has `vm_uuid NOT NULL`. 
                    # Strategy: For now, we only sync alarms attached to specific VMs found in `process_servers`
                    # BUT `get_active_alarms` might return internal alarms not attached to VMs.
                    # Let's inspect `connect_alarm.py` strategy: it maps source='system' to VMs if possible or drops them?
                    # The JSON shows "alarms": [] inside "vms". 
                    # Actually `get_active_alarms` returns a list. 
                    # If the alarm has a resource ID matching a VM, we map it.
                    # Or we just rely on `_extract_vm_alarms` from the server list if it already includes them?
                    # `connect_alarm.py` fetches `fetch_alarms` separately. 
                    
                    # For simplicty and safety given the generated JSON structure:
                    # The `server` object in `fetch_servers` usually contains an `alarms` field if we use the right endpoint/params?
                    # Wait, `connect_alarm.py` calls `fetch_alarms` (global) and then `map_system_alarms` to distribute them to VMs.
                    
                    # Implementation:
                    # Distribute system alarms to VMs based on resource ID or Name.
                    dist_result = self._distribute_system_alarms(handler, system_alarms, all_active_alarm_ids, servers)
                    mapped_count = dist_result["mapped_count"]
                    stats["system_alarms_mapped"] = mapped_count
                    
                    unmapped = dist_result["unmapped_alarms"]
                    if unmapped:
                         handler.upsert_other_alarms(unmapped)
                         stats["system_alarms_unmapped"] = len(unmapped)
                    
            except Exception as alarm_err:
                logger.warning(f"System alarm sync error: {alarm_err}")
                handler.log_job_detail(job_id, "warning", f"System alarm sync skipped: {alarm_err}", step="alarms")
            
            # Step 4.9: Close missing alarms (VM Context)
            # This ensures any alarm not found in this run is marked closed
            if all_active_alarm_ids:
                handler.close_missing_alarms(all_active_alarm_ids)
                stats["alarms_active"] = len(all_active_alarm_ids)
            
            # Step 4.95: Sync Hosts (New Requirement)
            handler.update_job_progress(job_id, 90, "syncing_hosts")
            handler.log_job_detail(job_id, "info", "Starting Host Sync...", step="hosts")
            
            try:
                from app.services.sync_v2.host_aggregator import HostResourceAggregator
                from app.services.host_sync import HostSyncService

                # Fetch required host data natively
                handler.log_job_detail(job_id, "info", "Fetching raw host data from SCP...", step="hosts_collect")
                hosts_raw = client.fetch_hosts()
                datastores_raw = client.fetch_datastores()
                
                alarms_raw = client.get_active_alarms()
                
                handler.log_job_detail(job_id, "info", "Aggregating host resources natively...", step="hosts_collect")
                aggregator = HostResourceAggregator(hosts_raw, servers, datastores_raw, alarms_raw)
                hosts_data = aggregator.build()
                
                # Get AZ mapping
                az_result = db.execute(text("SELECT az_name, az_id FROM sangfor.az_master WHERE is_active = TRUE"))
                az_mapping = {row[0]: row[1] for row in az_result.fetchall()}

                # Let's handle Host Alarms specifically for `other_alarms`
                host_alarms_to_sync = []
                for host_id, h_data in hosts_data.items():
                    alarms_data = h_data.get("alarms", {}).get("details", [])
                    for alarm in alarms_data:
                        host_alarms_to_sync.append({
                            "source": "host",
                            "resource_id": host_id,
                            "resource_name": h_data.get("host_name"),
                            "severity": alarm.get("level") or alarm.get("severity"),
                            "title": alarm.get("title") or alarm.get("name") or "Host Alarm",
                            "description": self._safe_get_description(alarm),
                            "status": "open",
                            "object_type": "host",
                            "begin_time": alarm.get("begin_time") or alarm.get("start_time")
                        })
                
                if host_alarms_to_sync:
                    h_alarm_count = handler.upsert_other_alarms(host_alarms_to_sync)
                    stats["host_alarms_synced"] = h_alarm_count

                host_sync_svc = HostSyncService(db)
                host_stats = host_sync_svc.sync_hosts(hosts_data, az_mapping, handler, job_id)
                
                # Merge stats
                stats["hosts_synced"] = host_stats.get("inserted", 0) + host_stats.get("updated", 0)
                stats["alarms_synced"] = stats.get("alarms_synced", 0) + host_stats.get("alarms_synced", 0)
                
                # 4. Collect Metrics
                collected_at = datetime.utcnow()
                for host_id, host_info in hosts_data.items():
                    try:
                        host_sync_svc.insert_host_metrics(host_id, host_info, collected_at)
                    except Exception as metric_err:
                        logger.warning(f"Failed to insert host metrics: {metric_err}")
                
                handler.log_job_detail(job_id, "info", f"Synced {len(hosts_data)} hosts", step="hosts")
                
            except Exception as host_err:
                logger.error(f"Host sync failed: {host_err}")
                handler.log_job_detail(job_id, "warning", f"Host sync skipped: {host_err}", step="hosts", error_details={"error": str(host_err)})
                handler.commit() # Fix silent rollback bug

            
            # Step 5: Complete job
            handler.update_job_progress(job_id, 95, "finalizing")
            handler.commit()

            # Refresh materialized views immediately after sync so frontend sees fresh data
            try:
                handler.log_job_detail(job_id, "info", "Refreshing materialized views...", step="mv_refresh")
                handler.db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_vm_overview"))
                handler.db.commit()
                try:
                    handler.db.execute(text("REFRESH MATERIALIZED VIEW analytics.mv_dashboard_summary"))
                    handler.db.commit()
                except Exception:
                    pass
                try:
                    handler.db.execute(text("REFRESH MATERIALIZED VIEW analytics.mv_top_consumers"))
                    handler.db.commit()
                except Exception:
                    pass
                handler.log_job_detail(job_id, "info", "Materialized views refreshed", step="mv_refresh")
                logger.info("✅ Materialized views refreshed after sync")
            except Exception as mv_err:
                logger.warning(f"MV refresh after sync failed (non-fatal): {mv_err}")

            handler.complete_job(job_id, "success", stats)
            handler.log_job_detail(job_id, "info", "Sync completed successfully", step="complete")
            
            logger.info(f"✅ Sync job {job_id} completed: {stats}")
            
            return {
                "success": True,
                "job_id": str(job_id),
                "stats": stats
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Sync failed: {error_msg}")
            
            if self._current_job_id:
                handler.complete_job(
                    self._current_job_id, 
                    "failed", 
                    {"total_vms": 0},
                    error_message=error_msg
                )
                handler.log_job_detail(self._current_job_id, "error", error_msg, step="error")
            
            return {
                "success": False,
                "error": error_msg,
                "job_id": str(self._current_job_id) if self._current_job_id else None
            }
            
        finally:
            self._is_syncing = False
            self._current_job_id = None
            db.close()
    
    def _process_servers(self, handler: SyncDbHandler, job_id: UUID, servers: List[Dict], all_active_alarm_ids: List[int]) -> Dict[str, Any]:
        """Process and save server data"""
        stats = {
            "total_vms": len(servers),
            "vms_inserted": 0,
            "vms_updated": 0,
            "vms_unchanged": 0,
            "vms_errors": 0,
            "metrics_inserted": 0,
            "azs_synced": 0,
            "hosts_synced": 0,
            "groups_synced": 0,
            "alarms_synced": 0
        }
        
        azs_seen = set()
        hosts_seen = set()
        groups_seen = set()
        active_vm_uuids = []
        
        total = len(servers)
        
        for idx, server in enumerate(servers):
            try:
                # Update progress
                if idx % 50 == 0:
                    progress = 30 + int((idx / total) * 50)
                    handler.update_job_progress(job_id, progress, f"processing_vm_{idx}")
                
                # Track active VM
                if server.get('id'):
                    active_vm_uuids.append(server.get('id'))
                
                # Upsert AZ
                az_id = server.get('az_id')
                if az_id and az_id not in azs_seen:
                    handler.upsert_az(az_id, server.get('az_name', ''))
                    azs_seen.add(az_id)
                    stats["azs_synced"] += 1
                
                # Upsert Host
                host_id = server.get('host_id')
                if host_id and host_id not in hosts_seen:
                    handler.upsert_host(host_id, server.get('host_name', ''), az_id)
                    hosts_seen.add(host_id)
                    stats["hosts_synced"] += 1
                
                # Upsert Group
                group_id = server.get('group_id')
                if group_id and group_id not in groups_seen:
                    handler.upsert_group(
                        group_id, 
                        server.get('group_name', ''),
                        server.get('group_name_path'),
                        az_id
                    )
                    groups_seen.add(group_id)
                    stats["groups_synced"] += 1
                
                # Process VM
                vm_data = self._extract_vm_data(server)
                action = handler.upsert_vm(vm_data)
                
                if action == 'inserted':
                    stats["vms_inserted"] += 1
                elif action == 'updated':
                    stats["vms_updated"] += 1
                elif action == 'error':
                    stats["vms_errors"] += 1
                else:
                    stats["vms_unchanged"] += 1
                
                # Insert metrics
                metrics = self._extract_metrics(server)
                handler.insert_metrics(server.get('id'), metrics)
                stats["metrics_inserted"] += 1
                
                # Sync disks
                disks = server.get('disks', [])
                if disks:
                    active_disk_ids = []
                    for disk in disks:
                        handler.upsert_disk(server.get('id'), disk)
                        active_disk_ids.append(disk.get('id'))
                    # Mark old disks as inactive
                    if active_disk_ids:
                        handler.deactivate_old_disks(server.get('id'), active_disk_ids)
                    stats["disks_synced"] = stats.get("disks_synced", 0) + len(disks)

                # Sync Networks
                interfaces = self._extract_network_info(server)
                if interfaces:
                    active_vif_ids = []
                    for iface in interfaces:
                        handler.upsert_network_interface(server.get('id'), iface)
                        active_vif_ids.append(iface.get('vif_id'))
                    
                    if active_vif_ids:
                        handler.deactivate_old_interfaces(server.get('id'), active_vif_ids)
                    
                    stats["networks_synced"] = stats.get("networks_synced", 0) + len(interfaces)
                
                # Sync Alarms (VM Level)
                # Some APIs return alarms directly in VM object
                vm_alarms = self._extract_vm_alarms(server)
                if vm_alarms:
                    alarm_ids = handler.upsert_alarms(server.get('id'), vm_alarms)
                    all_active_alarm_ids.extend(alarm_ids)
                    stats["alarms_synced"] += len(alarm_ids)

                # Commit every 100 records
                if idx % 100 == 0:
                    handler.commit()
                    
            except Exception as e:
                handler.rollback()
                stats["vms_errors"] += 1
                try:
                    handler.log_job_detail(
                        job_id, "warning", 
                        f"Error processing VM {server.get('name', 'unknown')}: {e}",
                        step="process",
                        vm_uuid=server.get('id'),
                        vm_name=server.get('name')
                    )
                except Exception as log_err:
                    logger.error(f"Failed to log error details: {log_err}")
        
        # Final commit for remaining records
        try:
            handler.commit()
            
            # Mark missing VMs as deleted
            deleted_count = handler.mark_missing_vms_as_deleted(active_vm_uuids)
            if deleted_count > 0:
                stats["vms_deleted"] = deleted_count
                logger.info(f"Marked {deleted_count} VMs as deleted")
                
        except Exception as e:
            handler.rollback()
            logger.error(f"Failed to commit final batch or marked deleted: {e}")
            stats["vms_errors"] += 1
        
        return stats
    
    def _sync_datastores(self, handler: SyncDbHandler, datastores: List[Dict]) -> Dict[str, Any]:
        """Sync datastores to database"""
        stats = {
            "synced": 0,
            "inserted": 0,
            "updated": 0,
            "errors": 0
        }
        
        for ds in datastores:
            try:
                result = handler.upsert_datastore(ds)
                if result == 'inserted':
                    stats["inserted"] += 1
                    stats["synced"] += 1
                elif result == 'updated':
                    stats["updated"] += 1
                    stats["synced"] += 1
                else:
                    stats["errors"] += 1
                
                # Insert metrics for historical tracking
                if result in ('inserted', 'updated'):
                    handler.insert_datastore_metrics(ds.get('id'), ds)
                    
            except Exception as e:
                logger.warning(f"Failed to sync datastore {ds.get('id')}: {e}")
                stats["errors"] += 1
        
        # Commit datastore changes
        try:
            handler.commit()
        except Exception as e:
            logger.error(f"Failed to commit datastores: {e}")
        
        return stats
    
    def _build_os_display(self, server: Dict) -> str:
        """
        Build a friendly OS display name
        Logic adapted from connect_os.py
        """
        image_name = server.get("image_name")
        os_option = server.get("os_option", {}) or {}

        kernel = os_option.get("kernel_name")
        distro = os_option.get("distribution_name")
        arch = os_option.get("arch")

        # 1) If image_name exists -> highest priority
        if image_name:
            if arch:
                return f"{image_name} ({arch})"
            return image_name

        # 2) No image -> Use Kernel + Distro
        parts = []
        if distro:
            parts.append(distro.capitalize())
        if kernel and kernel.lower() != distro:
            parts.append(kernel.capitalize())

        if parts:
            name = " ".join(parts)
            if arch:
                name += f" ({arch})"
            return name

        # 3) Fallback
        return server.get("os_name", "unknown")

    def _extract_vm_data(self, server: Dict) -> Dict[str, Any]:
        """Extract VM data from server response"""
        storage_status = server.get('storage_status') or {}
        os_option = server.get('os_option') or {}
        
        return {
            "id": server.get('id'),
            "vm_id": server.get('vm_id') or server.get('vmid'),
            "name": server.get('name', ''),
            "vmtype": server.get('vmtype', 'vm'),
            "host_id": server.get('host_id'),
            "group_id": server.get('group_id'),
            "az_id": server.get('az_id'),
            "os_type": server.get('os_type'),
            "os_name": server.get('os_name'),
            "os_display_name": self._build_os_display(server),
            "os_kernel": os_option.get('kernel_name'),
            "os_distribution": os_option.get('distribution_name'),
            "os_arch": os_option.get('arch'),
            "cores": server.get('cores', 0),
            "memory_mb": server.get('memory_mb', 0),
            "storage_mb": storage_status.get('total_mb', 0),
            "uptime_seconds": self._safe_int(server.get('uptime'))
        }
    
    def _extract_metrics(self, server: Dict) -> Dict[str, Any]:
        """Extract metrics from server response"""
        cpu_status = server.get('cpu_status') or {}
        memory_status = server.get('memory_status') or {}
        storage_status = server.get('storage_status') or {}
        network_status = server.get('network_status') or {}
        
        power_state = 'on' if (
            server.get('power_state') == 'on' or
            server.get('status') in ('active', 'running')
        ) else 'off'

        io_status = server.get('io_status') or {}

        return {
            "power_state": power_state,
            "status": server.get('status', ''),
            "uptime_seconds": self._safe_int(server.get('uptime')),
            "cpu_total_mhz": cpu_status.get('total_mhz', 0),
            "cpu_used_mhz": cpu_status.get('used_mhz', 0),
            "cpu_ratio": cpu_status.get('ratio', 0),
            "memory_total_mb": memory_status.get('total_mb', 0),
            "memory_used_mb": memory_status.get('used_mb', 0),
            "memory_ratio": memory_status.get('ratio', 0),
            "storage_total_mb": storage_status.get('total_mb', 0),
            "storage_used_mb": storage_status.get('used_mb', 0),
            "storage_file_size_mb": storage_status.get('storage_file_size_mb'),
            "storage_ratio": storage_status.get('ratio', 0),
            "network_read_bitps": network_status.get('read_speed_bitps', 0),
            "network_write_bitps": network_status.get('write_speed_bitps', 0),
            "disk_read_byteps": io_status.get('read_speed_byteps', 0),
            "disk_write_byteps": io_status.get('write_speed_byteps', 0),
            "disk_read_iops": io_status.get('read_iops', 0),
            "disk_write_iops": io_status.get('write_iops', 0),
            "host_id": server.get('host_id', ''),
            "host_name": server.get('host_name', '')
        }

    def _extract_network_info(self, server: Dict) -> List[Dict[str, Any]]:
        """Extract network interface info"""
        interfaces = []
        for net in server.get("networks", []):
            nic = {
                "network_name": net.get("name"),
                "vif_id": net.get("vif_id"),
                "port_id": net.get("port_id"),
                "mac_address": net.get("mac_address"),
                "model": net.get("model"),
                "connected": bool(net.get("connect")),
                "ip_address": net.get("ip_address"),
                "ipv6_address": net.get("ipv6_address"),
                "subnet_id": net.get("subnet_id"),
                "subnet_name": net.get("subnet_name"),
                "cidr": net.get("cidr"),
                "gateway": net.get("subnet_gateway_ip"),
                "custom_gateway": net.get("custom_gateway_ip"),
                "vpc_id": net.get("vpc_id"),
                "vpc_name": net.get("vpc_name"),
                "device_id": net.get("device_id")
            }
            interfaces.append(nic)
        return interfaces
    
    def _safe_get_description(self, alarm_obj: Dict[str, Any]) -> str:
        """
        Extract alarm description safely from various fields
        """
        return (
            alarm_obj.get("description")
            or alarm_obj.get("alarm_desc")
            or alarm_obj.get("desc")
            or alarm_obj.get("detail")
            or alarm_obj.get("content")
            or ""
        )

    def _extract_resource_from_description(self, description: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract resource name and type from alarm description text.
        Looks for patterns like: 'VM (WUH-PACS)', 'host (10.x.x.x)', 'cluster (HCI-DC)'
        Returns (resource_name, object_type) or (None, None)
        """
        if not description:
            return None, None

        patterns = [
            (r'(?:virtual machine|\bVM\b)\s+\(([^)]+)\)', 'vm'),
            (r'\bhost\s+\(([^)]+)\)', 'host'),
            (r'\bcluster\s+\(([^)]+)\)', 'cluster'),
            (r'\bnode\s+\(([^)]+)\)', 'node'),
            (r'\bdatastore\s+\(([^)]+)\)', 'datastore'),
            (r'\bpod\s+\(([^)]+)\)', 'pod'),
            (r'\bworkload\s+\(([^)]+)\)', 'workload'),
            (r'\bnamespace\s+\(([^)]+)\)', 'namespace'),
        ]

        for pattern, rtype in patterns:
            m = re.search(pattern, description, re.IGNORECASE)
            if m:
                return m.group(1).strip(), rtype

        return None, None

    def _extract_vm_alarms(self, server: Dict) -> List[Dict[str, Any]]:
        """Extract existing alarms from VM data"""
        alarms = []
        raw_alarms = server.get("alarms", [])

        # Sometimes it's a list, sometimes dict with 'total', 'data'
        if isinstance(raw_alarms, dict) and "data" in raw_alarms:
            raw_alarms = raw_alarms["data"]

        if not isinstance(raw_alarms, list):
            return []

        for alarm in raw_alarms:
            severity = alarm.get("severity")
            title = alarm.get("title")
            description = self._safe_get_description(alarm)

            # System alarms embedded in VM data may have null title/severity (platform events)
            if not title:
                # Generate a meaningful title from description
                if description:
                    title = description[:80].split('.')[0].strip() or "Platform Alert"
                else:
                    title = "Platform Alert"

            # Extract resource name from description if not provided
            resource_name = alarm.get('resource_name') or alarm.get('resname')
            object_type = "vm"
            if not resource_name and description:
                extracted_name, extracted_type = self._extract_resource_from_description(description)
                if extracted_name:
                    resource_name = extracted_name
                    object_type = extracted_type or 'vm'

            alarms.append({
                "source": "vm",
                "severity": severity,
                "title": title,
                "description": description,
                "status": alarm.get("status", "open"),
                "begin_time": alarm.get("begin_time"),
                "object_type": object_type,
                "resource_name": resource_name,
                "recommendation": alarm.get("suggestion") or alarm.get("recommendation"),
            })

        return alarms

    def _distribute_system_alarms(self, handler: SyncDbHandler, system_alarms: List[Dict], all_active_alarm_ids: List[int], servers: List[Dict]) -> Dict[str, Any]:
        """
        Map system alarms to VMs if possible, grouping duplicates and tracking alert_count.
        Return dict with 'mapped_count' and 'unmapped_alarms' list.
        """
        mapped_count = 0
        # Group unmapped alarms by (source, resource_id, title) for deduplication
        unmapped_grouped: Dict[str, Dict[str, Any]] = {}

        # Create a lookup map for VM ID/Name -> UUID
        vm_lookup = {}
        for s in servers:
            if s.get('id'):
                vm_lookup[s.get('id')] = s.get('id')
            if s.get('name'):
                vm_lookup[s.get('name')] = s.get('id')

        # Group mapped alarms by (vm_uuid, title) for deduplication
        mapped_grouped: Dict[str, Dict[str, Any]] = {}

        for alarm in system_alarms:
            # Check if alarm relates to a VM
            resource_id = alarm.get('resource_id') or alarm.get('resid')
            resource_name = alarm.get('resource_name') or alarm.get('resname') or alarm.get('object_name')

            # Generate title from null-title system alerts
            severity = alarm.get("level") or alarm.get("severity")
            title = alarm.get("title") or alarm.get("name")
            description = self._safe_get_description(alarm)
            recommendation = alarm.get("suggestion") or alarm.get("recommendation")

            if not title:
                if description:
                    title = description[:80].split('.')[0].strip() or "Platform Alert"
                else:
                    title = "Platform Alert"

            begin_time = alarm.get("generate_time") or alarm.get("start_time") or alarm.get("begin_time")
            object_type = alarm.get("object_type", "system")

            # Extract resource name from description when not provided by API
            if not resource_name and description:
                extracted_name, extracted_type = self._extract_resource_from_description(description)
                if extracted_name:
                    resource_name = extracted_name
                    # Refine object_type from description if still generic 'system'
                    if object_type == 'system' and extracted_type:
                        object_type = extracted_type

            target_vm_uuid = None
            if resource_id and resource_id in vm_lookup:
                target_vm_uuid = vm_lookup[resource_id]
            elif resource_name and resource_name in vm_lookup:
                target_vm_uuid = vm_lookup[resource_name]

            if target_vm_uuid:
                key = f"{target_vm_uuid}|{title}"
                if key not in mapped_grouped:
                    mapped_grouped[key] = {
                        "vm_uuid": target_vm_uuid,
                        "source": "system",
                        "severity": severity,
                        "title": title,
                        "description": description,
                        "status": "open",
                        "begin_time": begin_time,
                        "object_type": "vm",
                        "recommendation": recommendation,
                        "alert_count": 1,
                    }
                else:
                    mapped_grouped[key]['alert_count'] += 1
            else:
                key = f"system|{resource_id or resource_name or 'unknown'}|{title}"
                if key not in unmapped_grouped:
                    unmapped_grouped[key] = {
                        "source": "system",
                        "resource_id": resource_id,
                        "resource_name": resource_name,
                        "severity": severity,
                        "title": title,
                        "description": description,
                        "status": "open",
                        "object_type": object_type,
                        "begin_time": begin_time,
                        "recommendation": recommendation,
                        "alert_count": 1,
                    }
                else:
                    unmapped_grouped[key]['alert_count'] += 1

        # Upsert mapped alarms grouped by vm_uuid
        from collections import defaultdict
        by_vm: Dict[str, List[Dict]] = defaultdict(list)
        for alarm_data in mapped_grouped.values():
            by_vm[alarm_data['vm_uuid']].append(alarm_data)

        for vm_uuid, vm_alarms in by_vm.items():
            ids = handler.upsert_alarms(vm_uuid, vm_alarms)
            if ids:
                all_active_alarm_ids.extend(ids)
                mapped_count += len(ids)

        return {"mapped_count": mapped_count, "unmapped_alarms": list(unmapped_grouped.values())}

    
    def _scheduled_sync(self):
        """Callback for scheduled sync"""
        self.run_sync(source="scheduler", triggered_by="scheduler")
    
    # ============================================================
    # Scheduler Control
    # ============================================================
    
    def start_scheduler(self, interval_minutes: int = 5) -> Dict[str, Any]:
        """Start the sync scheduler"""
        result = self._scheduler.start(interval_minutes)
        
        if result["success"]:
            # Save state to database
            db = SessionLocal()
            try:
                handler = SyncDbHandler(db)
                handler.update_config(
                    scheduler_enabled=True,
                    scheduler_interval_minutes=interval_minutes
                )
            finally:
                db.close()
        
        return result
    
    def stop_scheduler(self) -> Dict[str, Any]:
        """Stop the sync scheduler"""
        result = self._scheduler.stop()
        
        if result["success"]:
            # Save state to database
            db = SessionLocal()
            try:
                handler = SyncDbHandler(db)
                handler.update_config(scheduler_enabled=False)
            finally:
                db.close()
        
        return result
    
    # ============================================================
    # Jobs History
    # ============================================================
    
    def get_jobs(self, limit: int = 50, offset: int = 0, status: Optional[str] = None) -> Dict[str, Any]:
        """Get paginated job history"""
        db = SessionLocal()
        try:
            handler = SyncDbHandler(db)
            jobs = handler.get_jobs(limit=limit, offset=offset, status=status)
            total = handler.get_jobs_count(status=status)
            
            return {
                "jobs": jobs,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        finally:
            db.close()
    
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job details"""
        db = SessionLocal()
        try:
            handler = SyncDbHandler(db)
            job = handler.get_job(UUID(job_id))
            
            if job:
                job["details"] = handler.get_job_details(UUID(job_id), limit=50)
            
            return job
        finally:
            db.close()
    
    # ============================================================
    # Connection Test
    # ============================================================
    
    def test_connection(self) -> Dict[str, Any]:
        """Test connection to SCP"""
        if not self._scp_ip or not self._scp_username or not self._scp_password:
            return {
                "success": False,
                "message": "Missing SCP configuration"
            }
        
        credentials = SangforCredentials(
            ip=self._scp_ip,
            username=self._scp_username,
            password=self._scp_password
        )
        client = SangforClient(credentials)
        return client.test_connection()


# Global instance
sync_service_v2 = SyncServiceV2()
