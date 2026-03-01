"""
Host Sync Service
Handles syncing host data from SCP and storing to database
"""

import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class HostSyncService:
    """Service for syncing host data from Sangfor SCP"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def sync_hosts(self, hosts_data: Dict[str, Any], az_mapping: Dict[str, UUID], 
                   handler: Any = None, job_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Sync hosts data to database
        
        Args:
            hosts_data: Dict of host data from host_resources.json format
            az_mapping: Dict mapping AZ names to AZ IDs
            handler: Optional SyncDbHandler instance for logging
            job_id: Optional job UUID for logging
            
        Returns:
            Dict with sync statistics
        """
        stats = {
            "total": len(hosts_data),
            "inserted": 0,
            "updated": 0,
            "alarms_synced": 0,
            "datastores_synced": 0,
            "errors": []
        }
        
        try:
            # Log start with detailed info
            if handler and job_id:
                handler.log_job_detail(
                    job_id, "info", 
                    f"🚀 Starting host sync for {len(hosts_data)} hosts from host_resources.json", 
                    step="host_sync_start",
                    extra_data={"total_hosts": len(hosts_data), "source": "host_resources.json"}
                )
            
            for idx, (host_id, host_info) in enumerate(hosts_data.items()):
                try:
                    # Update progress with host details
                    if handler and job_id and idx % 3 == 0:
                         progress = int((idx / len(hosts_data)) * 100)
                         handler.update_job_progress(
                             job_id, progress, 
                             f"Processing host {idx+1}/{len(hosts_data)}: {host_info.get('host_name', host_id)}"
                         )
                         handler.log_job_detail(
                             job_id, "info", 
                             f"📡 Processing host: {host_info.get('host_name', host_id)} ({host_info.get('az', 'unknown')} AZ)",
                             step="host_processing",
                             extra_data={
                                 "host_id": host_id,
                                 "host_name": host_info.get('host_name'),
                                 "progress": f"{idx+1}/{len(hosts_data)}",
                                 "cpu_cores": host_info.get('cpu', {}).get('cores'),
                                 "memory_gb": round((host_info.get('memory', {}).get('total_mb', 0) or 0) / 1024, 1)
                             }
                         )

                    self._sync_single_host(host_info, az_mapping, stats)
                except Exception as e:
                    error_msg = f"Error syncing host {host_id}: {str(e)}"
                    logger.error(error_msg)
                    stats["errors"].append(error_msg)
                    
                    if handler and job_id:
                        handler.log_job_detail(
                            job_id, "error", 
                            f"❌ Host sync error for {host_info.get('host_name', host_id)}: {str(e)}", 
                            step="host_sync_error",
                            extra_data={
                                "host_id": host_id,
                                "host_name": host_info.get('host_name'),
                                "error": str(e),
                                "az": host_info.get('az')
                            }
                        )
            
            self.db.commit()
            
            # Enhanced completion logging
            msg = f"✅ Host sync completed: {stats['inserted']} new, {stats['updated']} updated, {stats['alarms_synced']} alarms, {stats['datastores_synced']} datastores"
            logger.info(msg)
            
            if handler and job_id:
                handler.log_job_detail(
                    job_id, "success", msg, 
                    step="host_sync_complete",
                    extra_data={
                        "hosts_inserted": stats['inserted'],
                        "hosts_updated": stats['updated'], 
                        "alarms_synced": stats['alarms_synced'],
                        "datastores_synced": stats['datastores_synced'],
                        "total_processed": stats['total'],
                        "errors_count": len(stats['errors'])
                    }
                )
            
        except Exception as e:
            self.db.rollback()
            error_msg = f"Host sync failed: {str(e)}"
            logger.error(error_msg)
            stats["errors"].append(error_msg)
            if handler and job_id:
                handler.log_job_detail(job_id, "error", error_msg, step="host_sync")
            raise
        
        return stats
    
    def _sync_single_host(self, host_info: Dict[str, Any], az_mapping: Dict[str, UUID], stats: Dict[str, Any]):
        """Sync a single host"""
        host_id = host_info.get("host_id")
        
        # Get or create AZ
        az_name = host_info.get("az", "unknown")
        az_id = self._get_or_create_az(az_name, az_mapping)
        
        # Check if host exists
        existing = self.db.execute(
            text("SELECT host_id FROM sangfor.host_master WHERE host_id = :host_id"),
            {"host_id": host_id}
        ).fetchone()
        
        # Prepare host data
        cpu = host_info.get("cpu", {})
        memory = host_info.get("memory", {})
        vm_stats = host_info.get("vm", {})
        alarms = host_info.get("alarms", {})
        
        host_data = {
            "host_id": host_id,
            "host_name": host_info.get("host_name"),
            "ip": host_info.get("ip", ""),
            "az_id": az_id,
            "host_type": "hci",  # Default type
            "host_type_detail": host_info.get("type"),
            "status": host_info.get("status", "unknown"),
            "cluster_id": host_info.get("cluster_id"),
            "cluster_name": host_info.get("cluster_name"),
            
# CPU - Handle nulls with defaults
        "cpu_cores": cpu.get("cores") or 0,
        "cpu_sockets": cpu.get("sockets") or 0,
        "cpu_total_mhz": cpu.get("total_mhz") or 0.0,
        "cpu_used_mhz": cpu.get("used_mhz") or 0.0,
        "cpu_usage_ratio": cpu.get("usage_ratio") or 0.0,
            
# Memory - Handle nulls with defaults
        "memory_total_mb": memory.get("total_mb") or 0.0,
        "memory_used_mb": memory.get("used_mb") or 0.0,
        "memory_free_mb": memory.get("free_mb") or 0.0,
        "memory_usage_ratio": memory.get("usage_ratio") or 0.0,
            
            # VMs
            "vm_total": vm_stats.get("total", 0),
            "vm_running": vm_stats.get("running", 0),
            "vm_stopped": vm_stats.get("stopped", 0),
            
            # Alarms
            "alarm_count": alarms.get("count", 0),
            
            "last_synced_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if existing:
            # Update existing host
            self._update_host(host_data)
            stats["updated"] += 1
        else:
            # Insert new host
            self._insert_host(host_data)
            stats["inserted"] += 1
        
        # Sync datastores
        datastores = host_info.get("datastores", [])
        if datastores:
            self._sync_host_datastores(host_id, datastores)
            stats["datastores_synced"] += len(datastores)
        
        # Sync alarms
        alarm_details = alarms.get("details", [])
        if alarm_details:
            self._sync_host_alarms(host_id, alarm_details, az_id)
            stats["alarms_synced"] += len(alarm_details)
    
    def _get_or_create_az(self, az_name: str, az_mapping: Dict[str, UUID]) -> Optional[UUID]:
        """Get or create availability zone"""
        if az_name in az_mapping:
            return az_mapping[az_name]
        
        # Check if exists in DB
        result = self.db.execute(
            text("SELECT az_id FROM sangfor.az_master WHERE az_name = :name"),
            {"name": az_name}
        ).fetchone()
        
        if result:
            az_id = result[0]
            az_mapping[az_name] = az_id
            return az_id
        
        # Create new AZ
        az_id = UUID(bytes=os.urandom(16), version=4) if az_name != "unknown" else None
        if az_id:
            self.db.execute(
                text("""
                    INSERT INTO sangfor.az_master (az_id, az_name, description)
                    VALUES (:az_id, :name, :desc)
                    ON CONFLICT (az_id) DO NOTHING
                """),
                {
                    "az_id": az_id,
                    "name": az_name,
                    "desc": f"Auto-created from host sync"
                }
            )
            az_mapping[az_name] = az_id
            logger.info(f"Created new AZ: {az_name}")
        
        return az_id
    
    def _insert_host(self, host_data: Dict[str, Any]):
        """Insert new host"""
        self.db.execute(
            text("""
                INSERT INTO sangfor.host_master (
                    host_id, host_name, ip, az_id, host_type, host_type_detail,
                    status, cluster_id, cluster_name,
                    cpu_cores, cpu_sockets, cpu_total_mhz, cpu_used_mhz, cpu_usage_ratio,
                    memory_total_mb, memory_used_mb, memory_free_mb, memory_usage_ratio,
                    vm_total, vm_running, vm_stopped, alarm_count,
                    last_synced_at, updated_at, created_at
                ) VALUES (
                    :host_id, :host_name, :ip, :az_id, :host_type, :host_type_detail,
                    :status, :cluster_id, :cluster_name,
                    :cpu_cores, :cpu_sockets, :cpu_total_mhz, :cpu_used_mhz, :cpu_usage_ratio,
                    :memory_total_mb, :memory_used_mb, :memory_free_mb, :memory_usage_ratio,
                    :vm_total, :vm_running, :vm_stopped, :alarm_count,
                    :last_synced_at, :updated_at, CURRENT_TIMESTAMP
                )
            """),
            host_data
        )
    
    def _update_host(self, host_data: Dict[str, Any]):
        """Update existing host"""
        self.db.execute(
            text("""
                UPDATE sangfor.host_master SET
                    host_name = :host_name,
                    ip = :ip,
                    az_id = :az_id,
                    host_type_detail = :host_type_detail,
                    status = :status,
                    cluster_id = :cluster_id,
                    cluster_name = :cluster_name,
                    cpu_cores = :cpu_cores,
                    cpu_sockets = :cpu_sockets,
                    cpu_total_mhz = :cpu_total_mhz,
                    cpu_used_mhz = :cpu_used_mhz,
                    cpu_usage_ratio = :cpu_usage_ratio,
                    memory_total_mb = :memory_total_mb,
                    memory_used_mb = :memory_used_mb,
                    memory_free_mb = :memory_free_mb,
                    memory_usage_ratio = :memory_usage_ratio,
                    vm_total = :vm_total,
                    vm_running = :vm_running,
                    vm_stopped = :vm_stopped,
                    alarm_count = :alarm_count,
                    last_synced_at = :last_synced_at,
                    updated_at = :updated_at
                WHERE host_id = :host_id
            """),
            host_data
        )
    
    def _sync_host_datastores(self, host_id: str, datastores: List[str]):
        """Sync host-datastore associations"""
        # Delete old associations
        self.db.execute(
            text("DELETE FROM sangfor.host_datastore WHERE host_id = :host_id"),
            {"host_id": host_id}
        )
        
        # Insert new associations
        for datastore_name in datastores:
            self.db.execute(
                text("""
                    INSERT INTO sangfor.host_datastore (host_id, datastore_name, updated_at)
                    VALUES (:host_id, :datastore_name, CURRENT_TIMESTAMP)
                    ON CONFLICT (host_id, datastore_name) DO UPDATE
                    SET updated_at = CURRENT_TIMESTAMP
                """),
                {"host_id": host_id, "datastore_name": datastore_name}
            )
    
    def _sync_host_alarms(self, host_id: str, alarms: List[Dict[str, Any]], az_id: Optional[UUID]):
        """Sync host alarms"""
        # Mark all existing alarms as inactive first
        self.db.execute(
            text("UPDATE sangfor.host_alarm SET is_active = FALSE WHERE host_id = :host_id"),
            {"host_id": host_id}
        )
        
        # Insert or update alarms
        for alarm in alarms:
            alarm_id = alarm.get("id")
            if not alarm_id:
                continue
            
            # Parse dates
            start_time = self._parse_datetime(alarm.get("start_time"))
            updated_at = self._parse_datetime(alarm.get("updated_at"))
            resolved_at = self._parse_datetime(alarm.get("resolved_at")) if alarm.get("status") == "resolved" else None
            
            self.db.execute(
                text("""
                    INSERT INTO sangfor.host_alarm (
                        id, host_id, alarm_type, level, status, description,
                        alarm_advice, policy_id, policy_name, project_id,
                        az_id, az_name, user_id, remark, converge_count,
                        start_time, updated_at, resolved_at, is_active
                    ) VALUES (
                        :id, :host_id, :alarm_type, :level, :status, :description,
                        :alarm_advice, :policy_id, :policy_name, :project_id,
                        :az_id, :az_name, :user_id, :remark, :converge_count,
                        :start_time, :updated_at, :resolved_at, TRUE
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        description = EXCLUDED.description,
                        alarm_advice = EXCLUDED.alarm_advice,
                        converge_count = EXCLUDED.converge_count,
                        updated_at = EXCLUDED.updated_at,
                        resolved_at = EXCLUDED.resolved_at,
                        is_active = TRUE
                """),
                {
                    "id": alarm_id,
                    "host_id": host_id,
                    "alarm_type": alarm.get("alarm_type"),
                    "level": alarm.get("level"),
                    "status": alarm.get("status", "open"),
                    "description": alarm.get("description"),
                    "alarm_advice": alarm.get("alarm_advice"),
                    "policy_id": alarm.get("policy_id"),
                    "policy_name": alarm.get("policy_name"),
                    "project_id": alarm.get("project_id"),
                    "az_id": az_id,
                    "az_name": alarm.get("az_name"),
                    "user_id": alarm.get("user_id"),
                    "remark": alarm.get("remark"),
                    "converge_count": alarm.get("converge_count", 0),
                    "start_time": start_time,
                    "updated_at": updated_at,
                    "resolved_at": resolved_at
                }
            )
    
    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse datetime string"""
        if not dt_str:
            return None
        
        try:
            # Try various formats
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S.%f"
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(dt_str, fmt)
                except ValueError:
                    continue
            
            return None
        except Exception as e:
            logger.warning(f"Failed to parse datetime '{dt_str}': {e}")
            return None
    
    def insert_host_metrics(self, host_id: str, host_info: Dict[str, Any], collected_at: datetime):
        """Insert host metrics into time-series table"""
        cpu = host_info.get("cpu", {})
        memory = host_info.get("memory", {})
        vm_stats = host_info.get("vm", {})
        alarms = host_info.get("alarms", {})
        
        try:
            # Insert only supported / existing columns for metrics.host_metrics (schema varies across deployments)
            self.db.execute(
                text("""
                    INSERT INTO metrics.host_metrics (
                        host_id, cpu_total_mhz, cpu_used_mhz, cpu_ratio,
                        memory_total_mb, memory_used_mb, memory_ratio, collected_at
                    ) VALUES (
                        :host_id, :cpu_total_mhz, :cpu_used_mhz, :cpu_ratio,
                        :memory_total_mb, :memory_used_mb, :memory_ratio, :collected_at
                    )
                """),
                {
                    "host_id": host_id,
                    "cpu_total_mhz": cpu.get("total_mhz"),
                    "cpu_used_mhz": cpu.get("used_mhz"),
                    "cpu_ratio": cpu.get("usage_ratio"),
                    "memory_total_mb": memory.get("total_mb"),
                    "memory_used_mb": memory.get("used_mb"),
                    "memory_ratio": memory.get("usage_ratio"),
                    "collected_at": collected_at
                }
            )
        except Exception as e:
            logger.warning(f"Skipping metrics insert for host {host_id}: {e}")
            # Do not raise - metrics insertion should not fail the whole sync
            return


# Import os for UUID generation
import os

