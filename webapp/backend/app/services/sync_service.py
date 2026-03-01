"""
Sync Service - Connects to Sangfor SCP API and syncs data to database

This service handles:
1. Authentication with Sangfor SCP API
2. Fetching VM data
3. Saving data directly to PostgreSQL database
4. Scheduling periodic syncs
"""

import requests
import urllib3
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..config import get_settings

# Get settings instance
settings = get_settings()

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SyncService:
    """Service for syncing data from Sangfor SCP API to database"""
    
    def __init__(self):
        # Load settings from database
        self._load_settings_from_db()
        
        # Sync state
        self._is_running = False
        self._last_sync_at: Optional[datetime] = None
        self._last_sync_status: str = "never"
        self._last_sync_error: Optional[str] = None
        self._last_sync_stats: Dict[str, Any] = {}
        
        # Scheduler state
        self._scheduler_thread: Optional[threading.Thread] = None
        self._scheduler_running = False
        
        # Stats
        self._total_syncs = 0
        self._successful_syncs = 0
        self._failed_syncs = 0
    
    def _load_settings_from_db(self):
        """Load sync settings from database"""
        try:
            db = SessionLocal()
            result = db.execute(text("""
                SELECT scp_ip, scp_username, scp_password, sync_interval_minutes, scheduler_active
                FROM sangfor.sync_settings WHERE id = 1
            """))
            row = result.fetchone()
            
            if row:
                self.scp_ip = row.scp_ip or None
                self.username = row.scp_username or None
                self.password = row.scp_password or None
                self._sync_interval_minutes = row.sync_interval_minutes or 5
                # Note: scheduler_active is loaded but not auto-started
            else:
                # Use fallback from env if database is empty
                self.scp_ip = settings.SCP_IP
                self.username = settings.SCP_USERNAME
                self.password = settings.SCP_PASSWORD
                self._sync_interval_minutes = 5
            
            db.close()
            logger.info(f"📥 Settings loaded from database: SCP={self.scp_ip}")
        except Exception as e:
            # Fallback to env variables if database fails
            logger.warning(f"⚠️ Failed to load settings from DB, using env: {e}")
            self.scp_ip = settings.SCP_IP
            self.username = settings.SCP_USERNAME
            self.password = settings.SCP_PASSWORD
            self._sync_interval_minutes = 5
    
    def _save_settings_to_db(self):
        """Save current settings to database"""
        try:
            db = SessionLocal()
            db.execute(text("""
                UPDATE sangfor.sync_settings
                SET scp_ip = :scp_ip,
                    scp_username = :username,
                    scp_password = :password,
                    sync_interval_minutes = :interval,
                    scheduler_active = :active,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            """), {
                "scp_ip": self.scp_ip,
                "username": self.username,
                "password": self.password,
                "interval": self._sync_interval_minutes,
                "active": self._scheduler_running
            })
            db.commit()
            db.close()
            logger.info("💾 Settings saved to database")
        except Exception as e:
            logger.error(f"❌ Failed to save settings to DB: {e}")
    
    @property
    def status(self) -> Dict[str, Any]:
        """Get current sync service status"""
        return {
            "is_running": self._is_running,
            "scheduler_active": self._scheduler_running,
            "sync_interval_minutes": self._sync_interval_minutes,
            "last_sync_at": self._last_sync_at.isoformat() + 'Z' if self._last_sync_at else None,
            "last_sync_status": self._last_sync_status,
            "last_sync_error": self._last_sync_error,
            "last_sync_stats": self._last_sync_stats,
            "total_syncs": self._total_syncs,
            "successful_syncs": self._successful_syncs,
            "failed_syncs": self._failed_syncs,
            "next_sync_at": self._get_next_sync_time(),
            "scp_ip": self.scp_ip,
            "connected": self.scp_ip is not None
        }
    
    def _get_next_sync_time(self) -> Optional[str]:
        """Calculate next scheduled sync time"""
        if not self._scheduler_running:
            return None
        
        # If we have last sync time, calculate from there
        if self._last_sync_at:
            next_time = self._last_sync_at + timedelta(minutes=self._sync_interval_minutes)
        else:
            # If scheduler just started, next sync is immediate (now)
            next_time = datetime.utcnow()
        
        return next_time.isoformat() + 'Z'
    
    def _safe_int(self, value) -> Optional[int]:
        """Safely convert value to integer, returning None if not possible"""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def get_public_key(self) -> str:
        """Get public key modulus from Sangfor SCP server"""
        logger.info("🔑 Getting public key...")
        url = f'https://{self.scp_ip}/janus/public-key'
        response = requests.get(url, verify=False, timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"Failed to get public key: HTTP {response.status_code}")
        
        result = response.json()
        if 'data' in result and 'public_key' in result['data']:
            public_key = result['data']['public_key'].replace('\\n', '').strip()
            logger.info("✅ Public key obtained successfully")
            return public_key
        else:
            raise Exception("Public key not found in response")
    
    def encrypt_password(self, password: str, modulus: str) -> str:
        """Encrypt password using RSA public key"""
        logger.info("🔒 Encrypting password...")
        password_bytes = password.encode('utf-8')
        e = int(0x10001)
        n = bytes_to_long(a2b_hex(modulus))
        rsa_key = RSA.construct((n, e))
        public_key = rsa_key.publickey()
        cipher = PKCS1_v1_5.new(public_key)
        encrypted = cipher.encrypt(password_bytes)
        encrypted_hex = b2a_hex(encrypted).decode('utf-8')
        logger.info("✅ Password encrypted successfully")
        return encrypted_hex
    
    def get_token(self, username: str, encrypted_password: str) -> str:
        """Get authentication token using encrypted password"""
        logger.info("🔐 Requesting token...")
        url = f"https://{self.scp_ip}/janus/authenticate"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "auth": {
                "passwordCredentials": {
                    "username": username,
                    "password": encrypted_password
                }
            }
        }
        
        response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("code") == 0 and "data" in result:
                data = result["data"]
                if "access" in data and "token" in data["access"] and "id" in data["access"]["token"]:
                    token = data["access"]["token"]["id"]
                    logger.info("✅ Token acquired successfully")
                    return token
            
            # Try alternative token paths
            token_paths = [
                ["access", "token", "id"],
                ["token", "id"],
                ["access_token"],
                ["token"],
                ["id"]
            ]
            
            for path in token_paths:
                temp_token = result
                for key in path:
                    if isinstance(temp_token, dict) and key in temp_token:
                        temp_token = temp_token[key]
                    else:
                        temp_token = None
                        break
                
                if temp_token and isinstance(temp_token, str):
                    logger.info(f"✅ Token found at path: {' -> '.join(path)}")
                    return temp_token
        
        raise Exception(f"Authentication failed: HTTP {response.status_code}")
    
    def get_server_list(self, token: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get list of all servers with pagination support"""
        logger.info("📡 Fetching server list...")
        
        all_servers = []
        page_size = 100
        page_num = 0
        
        endpoints = [
            "/janus/20190725/servers",
            "/janus/20180725/servers"
        ]
        
        for endpoint in endpoints:
            all_servers = []
            page_num = 0
            
            while True:
                url = f"https://{self.scp_ip}{endpoint}"
                
                headers = {
                    "Authorization": f"Token {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                
                params = {
                    "page_num": page_num,
                    "page_size": page_size
                }
                
                try:
                    response = requests.get(url, headers=headers, params=params, verify=False, timeout=15)
                    
                    if response.status_code == 200:
                        result = response.json()
                        
                        servers = []
                        if "data" in result:
                            data = result["data"]
                            if "data" in data:
                                servers = data["data"]
                            elif isinstance(data, list):
                                servers = data
                        elif "servers" in result:
                            servers = result["servers"]
                        elif isinstance(result, list):
                            servers = result
                        
                        current_count = len(servers)
                        logger.info(f"📊 Found {current_count} servers on page {page_num}")
                        
                        if servers:
                            all_servers.extend(servers)
                            
                            if current_count < page_size:
                                break
                                
                            if limit and len(all_servers) >= limit:
                                all_servers = all_servers[:limit]
                                break
                                
                            page_num += 1
                            
                            if page_num > 100:
                                logger.warning("⚠️ Reached safety limit of 100 pages")
                                break
                        else:
                            break
                            
                    elif response.status_code == 400:
                        # Try without pagination
                        response = requests.get(url, headers=headers, verify=False, timeout=15)
                        
                        if response.status_code == 200:
                            result = response.json()
                            
                            servers = []
                            if "data" in result and "data" in result["data"]:
                                servers = result["data"]["data"]
                            elif "data" in result:
                                servers = result["data"]
                            elif isinstance(result, list):
                                servers = result
                            
                            logger.info(f"📊 Found {len(servers)} servers (no pagination)")
                            return servers
                        break
                        
                    else:
                        break
                        
                except Exception as e:
                    logger.error(f"❌ Error: {e}")
                    break
            
            if all_servers:
                logger.info(f"✅ Successfully retrieved {len(all_servers)} servers total")
                return all_servers
        
        raise Exception("Failed to get server list from all endpoints")
    
    def save_to_database(self, servers: List[Dict[str, Any]], db: Session) -> Dict[str, Any]:
        """Save servers data to PostgreSQL database with proper master table upserts"""
        logger.info(f"💾 Saving {len(servers)} servers to database...")
        
        stats = {
            "total_vms": len(servers),
            "vms_inserted": 0,
            "vms_updated": 0,
            "metrics_inserted": 0,
            "azs_upserted": 0,
            "hosts_upserted": 0,
            "groups_upserted": 0,
            "errors": [],
            "collected_at": datetime.now().isoformat()
        }
        
        # First pass: Upsert all master tables (AZ, Host, Group)
        logger.info("📊 Phase 1: Upserting master tables...")
        
        for server in servers:
            try:
                # Upsert AZ
                az_id = server.get('az_id')
                az_name = server.get('az_name', '')
                if az_id:
                    try:
                        db.execute(
                            text("""
                                INSERT INTO sangfor.az_master (az_id, az_name, is_active)
                                VALUES (CAST(:az_id AS uuid), :az_name, TRUE)
                                ON CONFLICT (az_id) DO UPDATE SET
                                    az_name = EXCLUDED.az_name,
                                    updated_at = CURRENT_TIMESTAMP,
                                    is_active = TRUE
                            """),
                            {"az_id": az_id, "az_name": az_name or 'Unknown'}
                        )
                        stats["azs_upserted"] += 1
                    except Exception as e:
                        logger.debug(f"AZ upsert issue: {e}")
                
                # Upsert Host
                host_id = server.get('host_id', '')
                host_name = server.get('host_name', '')
                if host_id:
                    try:
                        db.execute(
                            text("""
                                INSERT INTO sangfor.host_master (host_id, host_name, az_id, is_active)
                                VALUES (:host_id, :host_name, CAST(:az_id AS uuid), TRUE)
                                ON CONFLICT (host_id) DO UPDATE SET
                                    host_name = EXCLUDED.host_name,
                                    updated_at = CURRENT_TIMESTAMP,
                                    is_active = TRUE
                            """),
                            {"host_id": host_id, "host_name": host_name or host_id, "az_id": az_id}
                        )
                        stats["hosts_upserted"] += 1
                    except Exception as e:
                        logger.debug(f"Host upsert issue: {e}")
                
                # Upsert Group
                group_id = server.get('group_id')
                group_name = server.get('group_name', '')
                group_name_path = server.get('group_name_path', '')
                if group_id:
                    try:
                        db.execute(
                            text("""
                                INSERT INTO sangfor.vm_group_master (group_id, group_name, group_name_path, az_id, is_active)
                                VALUES (CAST(:group_id AS uuid), :group_name, :group_name_path, CAST(:az_id AS uuid), TRUE)
                                ON CONFLICT (group_id) DO UPDATE SET
                                    group_name = EXCLUDED.group_name,
                                    group_name_path = EXCLUDED.group_name_path,
                                    updated_at = CURRENT_TIMESTAMP,
                                    is_active = TRUE
                            """),
                            {"group_id": group_id, "group_name": group_name or 'Unknown', 
                             "group_name_path": group_name_path, "az_id": az_id}
                        )
                        stats["groups_upserted"] += 1
                    except Exception as e:
                        logger.debug(f"Group upsert issue: {e}")
                            
            except Exception as e:
                logger.warning(f"Master table upsert error: {e}")
        
        db.commit()
        logger.info(f"✅ Master tables: {stats['azs_upserted']} AZs, {stats['hosts_upserted']} hosts, {stats['groups_upserted']} groups")
        
        # Second pass: Upsert VMs and metrics
        logger.info("📊 Phase 2: Upserting VMs and metrics...")
        
        for server in servers:
            vm_uuid = server.get('id')
            name = server.get('name', '')
            if not vm_uuid:
                continue
            
            try:
                # Use SAVEPOINT for each VM to isolate errors
                db.execute(text("SAVEPOINT vm_savepoint"))
                
                # Check if VM exists
                result = db.execute(
                    text("SELECT vm_uuid FROM sangfor.vm_master WHERE vm_uuid = CAST(:uuid AS uuid)"),
                    {"uuid": vm_uuid}
                )
                exists = result.fetchone() is not None
                
                # Extract all fields from API response
                name = server.get('name', '')
                host_id = server.get('host_id', '')
                group_id = server.get('group_id')
                az_id = server.get('az_id')
                
                # Get resource status
                cpu_status = server.get('cpu_status') or {}
                memory_status = server.get('memory_status') or {}
                storage_status = server.get('storage_status') or {}
                network_status = server.get('network_status') or {}
                
                # Power state
                power_state = 'on' if server.get('power_state') == 'on' or server.get('status') == 'active' else 'off'
                
                # Clean function for nullable values
                def clean_val(v):
                    if v == '' or v is None:
                        return None
                    return v
                
                # Extract additional info
                storage_id = server.get('storage_id') or server.get('storage_vol_id')
                storage_name = server.get('storage_name') or storage_status.get('storage_name', '')
                protection_enable = server.get('protection_enable') or server.get('protection_enabled') or False
                protection_name = server.get('protection_name', '')
                backup_count = self._safe_int(server.get('backup_file_count')) or 0
                
                if exists:
                    # Update existing VM with all fields
                    try:
                        db.execute(
                            text("""
                                UPDATE sangfor.vm_master SET
                                    name = :name,
                                    host_id = :host_id,
                                    group_id = CAST(:group_id AS uuid),
                                    az_id = CAST(:az_id AS uuid),
                                    os_type = :os_type,
                                    os_name = :os_name,
                                    cpu_cores = :cpu_cores,
                                    cpu_sockets = :cpu_sockets,
                                    cpu_cores_per_socket = :cores_per_socket,
                                    cpu_total_mhz = :cpu_total_mhz,
                                    memory_total_mb = :memory_mb,
                                    storage_total_mb = :storage_mb,
                                    storage_id = :storage_id,
                                    project_id = :project_id,
                                    project_name = :project_name,
                                    protection_enabled = :protection_enabled,
                                    backup_file_count = :backup_count,
                                    description = :description,
                                    last_seen_at = CURRENT_TIMESTAMP,
                                    is_deleted = FALSE
                                WHERE vm_uuid = CAST(:uuid AS uuid)
                            """),
                            {
                                "uuid": vm_uuid, 
                                "name": name, 
                                "host_id": clean_val(host_id),
                                "group_id": clean_val(group_id),
                                "az_id": clean_val(az_id),
                                "os_type": clean_val(server.get('os_type')),
                                "os_name": clean_val(server.get('os_name')),
                                "cpu_cores": server.get('cores', 0),
                                "cpu_sockets": server.get('sockets', 1),
                                "cores_per_socket": server.get('cores_per_socket', 1),
                                "cpu_total_mhz": server.get('mhz') or cpu_status.get('total_mhz', 0),
                                "memory_mb": server.get('memory_mb', 0),
                                "storage_mb": storage_status.get('total_mb', 0),
                                "storage_id": clean_val(storage_id),
                                "project_id": clean_val(server.get('project_id')),
                                "project_name": clean_val(server.get('project_name')),
                                "protection_enabled": protection_enable,
                                "backup_count": backup_count,
                                "description": clean_val(server.get('description'))
                            }
                        )
                        stats["vms_updated"] += 1
                    except Exception as e:
                        # Re-raise to be handled by outer except with SAVEPOINT rollback
                        raise Exception(f"VM update error for {name}: {e}")
                else:
                    # Insert new VM with all fields
                    try:
                        db.execute(
                            text("""
                                INSERT INTO sangfor.vm_master (
                                    vm_uuid, vm_id, name, vmtype,
                                    host_id, group_id, az_id, storage_id,
                                    os_type, os_name, os_installed,
                                    cpu_cores, cpu_sockets, cpu_cores_per_socket, cpu_total_mhz,
                                    memory_total_mb, storage_total_mb,
                                    project_id, project_name, user_id, user_name,
                                    protection_enabled, backup_file_count,
                                    description,
                                    first_seen_at, last_seen_at, is_deleted
                                ) VALUES (
                                    CAST(:uuid AS uuid), :vm_id, :name, :vmtype,
                                    :host_id, CAST(:group_id AS uuid), CAST(:az_id AS uuid), :storage_id,
                                    :os_type, :os_name, :os_installed,
                                    :cpu_cores, :cpu_sockets, :cores_per_socket, :cpu_total_mhz,
                                    :memory_mb, :storage_mb,
                                    :project_id, :project_name, :user_id, :user_name,
                                    :protection_enabled, :backup_count,
                                    :description,
                                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE
                                )
                            """),
                            {
                                "uuid": vm_uuid,
                                "vm_id": self._safe_int(server.get('vm_id') or server.get('vmid')),
                                "name": name,
                                "vmtype": server.get('vmtype', 'vm'),
                                "host_id": clean_val(host_id),
                                "group_id": clean_val(group_id),
                                "az_id": clean_val(az_id),
                                "storage_id": clean_val(storage_id),
                                "os_type": clean_val(server.get('os_type')),
                                "os_name": clean_val(server.get('os_name')),
                                "os_installed": server.get('os_installed'),
                                "cpu_cores": server.get('cores', 0),
                                "cpu_sockets": server.get('sockets', 1),
                                "cores_per_socket": server.get('cores_per_socket', 1),
                                "cpu_total_mhz": server.get('mhz') or cpu_status.get('total_mhz', 0),
                                "memory_mb": server.get('memory_mb', 0),
                                "storage_mb": storage_status.get('total_mb', 0),
                                "project_id": clean_val(server.get('project_id')),
                                "project_name": clean_val(server.get('project_name')),
                                "user_id": clean_val(server.get('user_id')),
                                "user_name": clean_val(server.get('user_name')),
                                "protection_enabled": protection_enable,
                                "backup_count": backup_count,
                                "description": clean_val(server.get('description'))
                            }
                        )
                        stats["vms_inserted"] += 1
                    except Exception as e:
                        # Re-raise to be handled by outer except with SAVEPOINT rollback
                        raise Exception(f"VM insert error for {name}: {e}")
                
                # Insert metrics with uptime
                try:
                    disk_io = server.get('disk_io_status') or {}
                    db.execute(
                        text("""
                            INSERT INTO metrics.vm_metrics (
                                vm_uuid, collected_at, power_state, status, uptime_seconds,
                                cpu_total_mhz, cpu_used_mhz, cpu_ratio,
                                memory_total_mb, memory_used_mb, memory_ratio,
                                storage_total_mb, storage_used_mb, storage_ratio,
                                network_read_bitps, network_write_bitps,
                                disk_read_iops, disk_write_iops,
                                disk_read_byteps, disk_write_byteps,
                                host_id, host_name
                            ) VALUES (
                                CAST(:uuid AS uuid), CURRENT_TIMESTAMP, :power_state, :status, :uptime,
                                :cpu_total, :cpu_used, :cpu_ratio,
                                :mem_total, :mem_used, :mem_ratio,
                                :stor_total, :stor_used, :stor_ratio,
                                :net_read, :net_write,
                                :disk_read_iops, :disk_write_iops,
                                :disk_read_bps, :disk_write_bps,
                                :host_id, :host_name
                            )
                        """),
                        {
                            "uuid": vm_uuid,
                            "power_state": power_state,
                            "status": server.get('status', ''),
                            "uptime": self._safe_int(server.get('uptime')),
                            "cpu_total": cpu_status.get('total_mhz', 0),
                            "cpu_used": cpu_status.get('used_mhz', 0),
                            "cpu_ratio": cpu_status.get('ratio', 0),
                            "mem_total": memory_status.get('total_mb', 0),
                            "mem_used": memory_status.get('used_mb', 0),
                            "mem_ratio": memory_status.get('ratio', 0),
                            "stor_total": storage_status.get('total_mb', 0),
                            "stor_used": storage_status.get('used_mb', 0),
                            "stor_ratio": storage_status.get('ratio', 0),
                            "net_read": network_status.get('read_speed_bitps', 0),
                            "net_write": network_status.get('write_speed_bitps', 0),
                            "disk_read_iops": disk_io.get('read_iops', 0),
                            "disk_write_iops": disk_io.get('write_iops', 0),
                            "disk_read_bps": disk_io.get('read_byteps', 0),
                            "disk_write_bps": disk_io.get('write_byteps', 0),
                            "host_id": host_id,
                            "host_name": server.get('host_name', '')
                        }
                    )
                    stats["metrics_inserted"] += 1
                except Exception as e:
                    # Re-raise to be handled by outer except with SAVEPOINT rollback
                    raise Exception(f"Failed to insert metrics for {vm_uuid}: {e}")
                
                # Upsert network config (IP, MAC addresses)
                try:
                    networks = server.get('networks') or server.get('network_interfaces') or []
                    if isinstance(networks, list):
                        for idx, net in enumerate(networks):
                            vif_id = net.get('vif_id') or net.get('name') or f"net{idx}"
                            ip_addr = net.get('ip_address') or net.get('ip')
                            mac_addr = net.get('mac_address') or net.get('mac')
                            network_name = net.get('network_name') or net.get('network')
                            
                            if ip_addr or mac_addr:
                                db.execute(
                                    text("""
                                        INSERT INTO sangfor.vm_network_config 
                                            (vm_uuid, vif_id, ip_address, mac_address, network_name, is_active)
                                        VALUES 
                                            (CAST(:uuid AS uuid), :vif_id, :ip::inet, :mac, :network, TRUE)
                                        ON CONFLICT (vm_uuid, vif_id) DO UPDATE SET
                                            ip_address = EXCLUDED.ip_address,
                                            mac_address = EXCLUDED.mac_address,
                                            network_name = EXCLUDED.network_name,
                                            updated_at = CURRENT_TIMESTAMP,
                                            is_active = TRUE
                                    """),
                                    {
                                        "uuid": vm_uuid,
                                        "vif_id": vif_id,
                                        "ip": ip_addr,
                                        "mac": mac_addr,
                                        "network": network_name
                                    }
                                )
                    # Also check single network field
                    elif 'network' in server:
                        net = server.get('network') or {}
                        ip_addr = net.get('ip_address') or net.get('ip')
                        mac_addr = net.get('mac_address') or net.get('mac')
                        if ip_addr or mac_addr:
                            db.execute(
                                text("""
                                    INSERT INTO sangfor.vm_network_config 
                                        (vm_uuid, vif_id, ip_address, mac_address, network_name, is_active)
                                    VALUES 
                                        (CAST(:uuid AS uuid), 'net0', :ip::inet, :mac, :network, TRUE)
                                    ON CONFLICT (vm_uuid, vif_id) DO UPDATE SET
                                        ip_address = EXCLUDED.ip_address,
                                        mac_address = EXCLUDED.mac_address,
                                        network_name = EXCLUDED.network_name,
                                        updated_at = CURRENT_TIMESTAMP,
                                        is_active = TRUE
                                """),
                                {
                                    "uuid": vm_uuid,
                                    "ip": ip_addr,
                                    "mac": mac_addr,
                                    "network": net.get('network_name')
                                }
                            )
                except Exception as e:
                    # Rollback to savepoint and re-create it for next operations
                    db.execute(text("ROLLBACK TO SAVEPOINT vm_savepoint"))
                    db.execute(text("SAVEPOINT vm_savepoint"))
                    logger.debug(f"Network config upsert issue for {vm_uuid}: {e}")
                
                # Release savepoint on success
                db.execute(text("RELEASE SAVEPOINT vm_savepoint"))
                
            except Exception as e:
                # Rollback to savepoint on error (keeps other VMs working)
                db.execute(text("ROLLBACK TO SAVEPOINT vm_savepoint"))
                stats["errors"].append({
                    "vm_id": vm_uuid,
                    "vm_name": name,
                    "error": str(e)
                })
        
        db.commit()
        logger.info(f"✅ Saved: {stats['vms_inserted']} inserted, {stats['vms_updated']} updated, {stats['metrics_inserted']} metrics")
        return stats
    
    def _log_collection(self, db: Session, stats: Dict[str, Any], duration_ms: int, status: str, error_msg: Optional[str] = None):
        """Log the sync collection to database with detailed stats"""
        try:
            db.execute(
                text("""
                    INSERT INTO sangfor.collection_log (
                        collected_at, source, total_vms, processed_vms, 
                        failed_vms, duration_ms, status, error_message, metadata,
                        azs_upserted, hosts_upserted, groups_upserted,
                        vms_inserted, vms_updated, metrics_inserted
                    ) VALUES (
                        CURRENT_TIMESTAMP, :source, :total_vms, :processed_vms,
                        :failed_vms, :duration_ms, :status, :error_message, :metadata,
                        :azs_upserted, :hosts_upserted, :groups_upserted,
                        :vms_inserted, :vms_updated, :metrics_inserted
                    )
                """),
                {
                    "source": f"API sync from {self.scp_ip}",
                    "total_vms": stats.get("total_vms", 0),
                    "processed_vms": stats.get("vms_inserted", 0) + stats.get("vms_updated", 0),
                    "failed_vms": len(stats.get("errors", [])),
                    "duration_ms": duration_ms,
                    "status": status,
                    "error_message": error_msg,
                    "metadata": None,
                    "azs_upserted": stats.get("azs_upserted", 0),
                    "hosts_upserted": stats.get("hosts_upserted", 0),
                    "groups_upserted": stats.get("groups_upserted", 0),
                    "vms_inserted": stats.get("vms_inserted", 0),
                    "vms_updated": stats.get("vms_updated", 0),
                    "metrics_inserted": stats.get("metrics_inserted", 0)
                }
            )
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to log collection: {e}")
    
    def run_sync(self) -> Dict[str, Any]:
        """Run a complete sync cycle"""
        if self._is_running:
            return {"error": "Sync already in progress"}
        
        self._is_running = True
        self._total_syncs += 1
        start_time = datetime.now()
        
        try:
            logger.info("🚀 Starting sync...")
            
            # Validate configuration
            if not self.scp_ip or not self.username or not self.password:
                raise Exception("Missing SCP configuration (SCP_IP, SCP_USERNAME, SCP_PASSWORD)")
            
            # Step 1: Get token
            modulus = self.get_public_key()
            encrypted = self.encrypt_password(self.password, modulus)
            token = self.get_token(self.username, encrypted)
            
            # Step 2: Fetch servers
            servers = self.get_server_list(token)
            
            # Step 3: Save to database
            db = SessionLocal()
            try:
                stats = self.save_to_database(servers, db)
                
                # Log collection
                duration = (datetime.now() - start_time).total_seconds()
                self._log_collection(db, stats, int(duration * 1000), "success")
            finally:
                db.close()
            
            # Update state
            self._last_sync_at = datetime.now()
            self._last_sync_status = "success"
            self._last_sync_error = None
            self._last_sync_stats = stats
            self._successful_syncs += 1
            
            duration = (datetime.now() - start_time).total_seconds()
            stats["duration_seconds"] = duration
            
            logger.info(f"✅ Sync completed in {duration:.2f}s")
            return stats
            
        except Exception as e:
            self._last_sync_at = datetime.now()
            self._last_sync_status = "failed"
            self._last_sync_error = str(e)
            self._failed_syncs += 1
            
            # Log failed collection
            try:
                db = SessionLocal()
                duration = (datetime.now() - start_time).total_seconds()
                self._log_collection(db, {}, int(duration * 1000), "failed", str(e))
                db.close()
            except:
                pass
            
            logger.error(f"❌ Sync failed: {e}")
            return {"error": str(e)}
            
        finally:
            self._is_running = False
    
    def start_scheduler(self, interval_minutes: int = 5):
        """Start the background sync scheduler"""
        if self._scheduler_running:
            return {"message": "Scheduler already running"}
        
        self._sync_interval_minutes = interval_minutes
        self._scheduler_running = True
        
        # Save scheduler state to database
        self._save_settings_to_db()
        
        def scheduler_loop():
            while self._scheduler_running:
                try:
                    self.run_sync()
                except Exception as e:
                    logger.error(f"Scheduler sync error: {e}")
                
                # Wait for next interval
                for _ in range(self._sync_interval_minutes * 60):
                    if not self._scheduler_running:
                        break
                    time.sleep(1)
        
        self._scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
        self._scheduler_thread.start()
        
        logger.info(f"✅ Scheduler started with {interval_minutes} minute interval")
        return {"message": f"Scheduler started with {interval_minutes} minute interval"}
    
    def stop_scheduler(self):
        """Stop the background sync scheduler"""
        if not self._scheduler_running:
            return {"message": "Scheduler not running"}
        
        self._scheduler_running = False
        if self._scheduler_thread:
            self._scheduler_thread.join(timeout=5)
        
        # Save scheduler state to database
        self._save_settings_to_db()
        
        logger.info("✅ Scheduler stopped")
        return {"message": "Scheduler stopped"}
    
    def update_settings(self, scp_ip: Optional[str] = None, username: Optional[str] = None, 
                       password: Optional[str] = None, interval_minutes: Optional[int] = None) -> Dict[str, Any]:
        """Update sync settings and save to database"""
        if scp_ip is not None:
            self.scp_ip = scp_ip
        if username is not None:
            self.username = username
        if password is not None:
            self.password = password
        if interval_minutes is not None:
            self._sync_interval_minutes = interval_minutes
        
        # Save settings to database
        self._save_settings_to_db()
        
        return {
            "message": "Settings updated and saved to database",
            "scp_ip": self.scp_ip,
            "username": self.username,
            "interval_minutes": self._sync_interval_minutes
        }
    
    def test_connection(self) -> Dict[str, Any]:
        """Test connection to Sangfor SCP API"""
        try:
            if not self.scp_ip:
                return {"success": False, "error": "SCP_IP not configured"}
            
            # Try to get public key
            url = f'https://{self.scp_ip}/janus/public-key'
            response = requests.get(url, verify=False, timeout=10)
            
            if response.status_code == 200:
                return {"success": True, "message": "Connection successful"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
sync_service = SyncService()
