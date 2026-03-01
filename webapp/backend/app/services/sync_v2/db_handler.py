"""
Sync Database Handler
Handles all database operations for sync v2
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
import json

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class SyncDbHandler:
    """
    Database handler for sync operations
    Manages config, jobs, and data persistence
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================
    # Configuration
    # ============================================================
    
    def get_config(self) -> Dict[str, Any]:
        """Get sync configuration"""
        result = self.db.execute(text("""
            SELECT 
                scp_ip, scp_port, scp_username, scp_password_encrypted,
                scheduler_enabled, scheduler_interval_minutes,
                scheduler_last_run_at, scheduler_next_run_at,
                sync_timeout_seconds, max_retries, batch_size,
                collect_metrics, collection_interval_seconds,
                retain_raw_days, retain_hourly_days, retain_daily_days, auto_aggregate,
                updated_at
            FROM sync.config WHERE id = 1
        """))
        row = result.fetchone()
        
        if row:
            return {
                "scp_ip": row.scp_ip or "",
                "scp_port": row.scp_port or 443,
                "scp_username": row.scp_username or "",
                "scp_password_set": bool(row.scp_password_encrypted),
                "scheduler_enabled": row.scheduler_enabled or False,
                "scheduler_interval_minutes": row.scheduler_interval_minutes or 5,
                "scheduler_last_run_at": row.scheduler_last_run_at.isoformat() if row.scheduler_last_run_at else None,
                "scheduler_next_run_at": row.scheduler_next_run_at.isoformat() if row.scheduler_next_run_at else None,
                "sync_timeout_seconds": row.sync_timeout_seconds or 300,
                "max_retries": row.max_retries or 3,
                "batch_size": row.batch_size or 100,
                "collect_metrics": row.collect_metrics if row.collect_metrics is not None else True,
                "collection_interval_seconds": row.collection_interval_seconds or 60,
                "retain_raw_days": row.retain_raw_days or 7,
                "retain_hourly_days": row.retain_hourly_days or 30,
                "retain_daily_days": row.retain_daily_days or 365,
                "auto_aggregate": row.auto_aggregate if row.auto_aggregate is not None else True,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None
            }
        
        return {}
    
    def update_config(self, **kwargs) -> None:
        """Update sync configuration"""
        updates = []
        params = {}
        
        allowed_fields = [
            'scp_ip', 'scp_port', 'scp_username', 'scp_password_encrypted',
            'scheduler_enabled', 'scheduler_interval_minutes',
            'scheduler_last_run_at', 'scheduler_next_run_at',
            'sync_timeout_seconds', 'max_retries', 'batch_size',
            'collect_metrics', 'collection_interval_seconds',
            'retain_raw_days', 'retain_hourly_days', 'retain_daily_days', 'auto_aggregate'
        ]
        
        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                updates.append(f"{key} = :{key}")
                params[key] = value
        
        if updates:
            query = f"UPDATE sync.config SET {', '.join(updates)} WHERE id = 1"
            self.db.execute(text(query), params)
            self.db.commit()
    
    def get_password(self) -> Optional[str]:
        """Get encrypted password from config"""
        result = self.db.execute(text(
            "SELECT scp_password_encrypted FROM sync.config WHERE id = 1"
        ))
        row = result.fetchone()
        return row.scp_password_encrypted if row else None
    
    # ============================================================
    # Jobs
    # ============================================================
    
    def create_job(self, source: str = "manual", triggered_by: Optional[str] = None) -> UUID:
        """Create a new sync job and return its ID"""
        result = self.db.execute(text("""
            INSERT INTO sync.jobs (source, triggered_by, status, started_at)
            VALUES (:source, :triggered_by, 'running', CURRENT_TIMESTAMP)
            RETURNING job_id
        """), {"source": source, "triggered_by": triggered_by})
        
        self.db.commit()
        row = result.fetchone()
        return row.job_id
    
    def update_job_progress(self, job_id: UUID, progress: int, step: str) -> None:
        """Update job progress"""
        self.db.execute(text("""
            UPDATE sync.jobs 
            SET progress_percent = :progress, current_step = :step
            WHERE job_id = :job_id
        """), {"job_id": str(job_id), "progress": progress, "step": step})
        self.db.commit()
    
    def complete_job(self, job_id: UUID, status: str, stats: Dict[str, Any], error_message: Optional[str] = None) -> None:
        """Complete a job with final status and stats"""
        self.db.execute(text("""
            UPDATE sync.jobs SET
                status = :status,
                finished_at = CURRENT_TIMESTAMP,
                progress_percent = 100,
                current_step = 'completed',
                total_vms_fetched = :total_vms,
                vms_inserted = :vms_inserted,
                vms_updated = :vms_updated,
                vms_unchanged = :vms_unchanged,
                vms_errors = :vms_errors,
                metrics_inserted = :metrics_inserted,
                azs_synced = :azs_synced,
                hosts_synced = :hosts_synced,
                groups_synced = :groups_synced,
                error_message = :error_message,
                metadata = :metadata
            WHERE job_id = :job_id
        """), {
            "job_id": str(job_id),
            "status": status,
            "total_vms": stats.get("total_vms", 0),
            "vms_inserted": stats.get("vms_inserted", 0),
            "vms_updated": stats.get("vms_updated", 0),
            "vms_unchanged": stats.get("vms_unchanged", 0),
            "vms_errors": stats.get("vms_errors", 0),
            "metrics_inserted": stats.get("metrics_inserted", 0),
            "azs_synced": stats.get("azs_synced", 0),
            "hosts_synced": stats.get("hosts_synced", 0),
            "groups_synced": stats.get("groups_synced", 0),
            "error_message": error_message,
            "metadata": json.dumps(stats.get("metadata", {}))
        })
        self.db.commit()
    
    def get_job(self, job_id: UUID) -> Optional[Dict[str, Any]]:
        """Get job details by ID"""
        result = self.db.execute(text("""
            SELECT * FROM sync.jobs WHERE job_id = :job_id
        """), {"job_id": str(job_id)})
        
        row = result.fetchone()
        if row:
            return self._row_to_job_dict(row)
        return None
    
        if row:
            return self._row_to_job_dict(row)
        return None
    
    def cleanup_stuck_jobs(self) -> int:
        """Mark all currently running jobs as failed (stuck)"""
        try:
            with self.db.begin_nested():
                result = self.db.execute(text("""
                    UPDATE sync.jobs 
                    SET status = 'failed', 
                        finished_at = CURRENT_TIMESTAMP,
                        error_message = 'Interrupted by server restart',
                        current_step = 'interrupted'
                    WHERE status = 'running'
                """))
            self.db.commit()
            return result.rowcount
        except Exception as e:
            logger.error(f"Failed to cleanup stuck jobs: {e}")
            return 0
    
    def get_running_job(self) -> Optional[Dict[str, Any]]:
        """Get currently running job if any"""
        result = self.db.execute(text("""
            SELECT * FROM sync.jobs 
            WHERE status = 'running' 
            ORDER BY started_at DESC LIMIT 1
        """))
        
        row = result.fetchone()
        if row:
            return self._row_to_job_dict(row)
        return None
    
    def get_jobs(self, limit: int = 50, offset: int = 0, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get paginated job history"""
        query = """
            SELECT * FROM sync.jobs
            WHERE (:status IS NULL OR status = :status)
            ORDER BY started_at DESC
            LIMIT :limit OFFSET :offset
        """
        
        result = self.db.execute(text(query), {
            "status": status,
            "limit": limit,
            "offset": offset
        })
        
        return [self._row_to_job_dict(row) for row in result.fetchall()]
    
    def get_jobs_count(self, status: Optional[str] = None) -> int:
        """Get total job count"""
        result = self.db.execute(text("""
            SELECT COUNT(*) FROM sync.jobs
            WHERE (:status IS NULL OR status = :status)
        """), {"status": status})
        
        return result.scalar() or 0
    
    def _row_to_job_dict(self, row) -> Dict[str, Any]:
        """Convert database row to job dictionary"""
        return {
            "id": row.id,
            "job_id": str(row.job_id),
            "source": row.source,
            "triggered_by": row.triggered_by,
            "status": row.status,
            "started_at": row.started_at.isoformat() if row.started_at else None,
            "finished_at": row.finished_at.isoformat() if row.finished_at else None,
            "duration_ms": row.duration_ms,
            "progress_percent": row.progress_percent,
            "current_step": row.current_step,
            "total_vms_fetched": row.total_vms_fetched,
            "vms_inserted": row.vms_inserted,
            "vms_updated": row.vms_updated,
            "vms_unchanged": row.vms_unchanged,
            "vms_errors": row.vms_errors,
            "metrics_inserted": row.metrics_inserted,
            "azs_synced": row.azs_synced,
            "hosts_synced": row.hosts_synced,
            "groups_synced": row.groups_synced,
            "error_message": row.error_message
        }
    
    # ============================================================
    # Job Details (Logs)
    # ============================================================
    
    def log_job_detail(self, job_id: UUID, level: str, message: str, 
                       step: Optional[str] = None, vm_uuid: Optional[str] = None,
                       vm_name: Optional[str] = None, error_details: Optional[Dict] = None,
                       extra_data: Optional[Dict] = None) -> None:
        """Log a detail entry for a job

        Note: some callers pass `extra_data` (legacy). Map it to `error_details` for storage.
        """
        details_to_store = error_details or extra_data
        self.db.execute(text("""
            INSERT INTO sync.job_details (job_id, level, step, message, vm_uuid, vm_name, error_details)
            VALUES (:job_id, :level, :step, :message, CAST(:vm_uuid AS uuid), :vm_name, :error_details)
        """), {
            "job_id": str(job_id),
            "level": level,
            "step": step,
            "message": message,
            "vm_uuid": vm_uuid,
            "vm_name": vm_name,
            "error_details": json.dumps(details_to_store) if details_to_store else None
        })
    
    def get_job_details(self, job_id: UUID, level: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get job detail logs"""
        result = self.db.execute(text("""
            SELECT * FROM sync.job_details
            WHERE job_id = :job_id
            AND (:level IS NULL OR level = :level)
            ORDER BY timestamp DESC
            LIMIT :limit
        """), {"job_id": str(job_id), "level": level, "limit": limit})
        
        return [{
            "id": row.id,
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            "level": row.level,
            "step": row.step,
            "message": row.message,
            "vm_uuid": str(row.vm_uuid) if row.vm_uuid else None,
            "vm_name": row.vm_name
        } for row in result.fetchall()]
    
    # ============================================================
    # Data Sync (VMs, Metrics, etc.)
    # ============================================================
    
    def upsert_az(self, az_id: str, az_name: str) -> None:
        """Upsert availability zone"""
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO sangfor.az_master (az_id, az_name, is_active)
                    VALUES (CAST(:az_id AS uuid), :az_name, TRUE)
                    ON CONFLICT (az_id) DO UPDATE SET
                        az_name = EXCLUDED.az_name,
                        updated_at = CURRENT_TIMESTAMP,
                        is_active = TRUE
                """), {"az_id": az_id, "az_name": az_name or 'Unknown'})
        except Exception as e:
            logger.debug(f"AZ upsert issue: {e}")
    
    def upsert_host(self, host_id: str, host_name: str, az_id: Optional[str] = None) -> None:
        """Upsert host"""
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO sangfor.host_master (host_id, host_name, az_id, is_active)
                    VALUES (:host_id, :host_name, CAST(:az_id AS uuid), TRUE)
                    ON CONFLICT (host_id) DO UPDATE SET
                        host_name = EXCLUDED.host_name,
                        updated_at = CURRENT_TIMESTAMP,
                        is_active = TRUE
                """), {"host_id": host_id, "host_name": host_name or host_id, "az_id": az_id})
        except Exception as e:
            logger.debug(f"Host upsert issue: {e}")
    
    def upsert_group(self, group_id: str, group_name: str, group_path: Optional[str] = None, az_id: Optional[str] = None) -> None:
        """Upsert VM group"""
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO sangfor.vm_group_master (group_id, group_name, group_name_path, az_id, is_active)
                    VALUES (CAST(:group_id AS uuid), :group_name, :group_path, CAST(:az_id AS uuid), TRUE)
                    ON CONFLICT (group_id) DO UPDATE SET
                        group_name = EXCLUDED.group_name,
                        group_name_path = EXCLUDED.group_name_path,
                        updated_at = CURRENT_TIMESTAMP,
                        is_active = TRUE
                """), {"group_id": group_id, "group_name": group_name or 'Unknown', "group_path": group_path, "az_id": az_id})
        except Exception as e:
            logger.debug(f"Group upsert issue: {e}")
    
    def upsert_vm(self, vm_data: Dict[str, Any]) -> str:
        """
        Upsert VM and return action taken ('inserted', 'updated', 'unchanged')
        """
        vm_uuid = vm_data.get('id')
        if not vm_uuid:
            raise ValueError("VM UUID is required")
        
        # Check if exists
        result = self.db.execute(text(
            "SELECT vm_uuid FROM sangfor.vm_master WHERE vm_uuid = CAST(:uuid AS uuid)"
        ), {"uuid": vm_uuid})
        
        exists = result.fetchone() is not None
        
        # Prepare values
        def clean_val(v):
            return None if v == '' or v is None else v
        
        try:
            if exists:
                # Update
                with self.db.begin_nested():
                    self.db.execute(text("""
                        UPDATE sangfor.vm_master SET
                            name = :name,
                            host_id = :host_id,
                            group_id = CAST(:group_id AS uuid),
                            az_id = CAST(:az_id AS uuid),
                            os_type = :os_type,
                            os_name = :os_name,
                            os_display_name = :os_display_name,
                            os_kernel = :os_kernel,
                            os_distribution = :os_distribution,
                            os_arch = :os_arch,
                            cpu_cores = :cpu_cores,
                            memory_total_mb = :memory_mb,
                            storage_total_mb = :storage_mb,
                            uptime_seconds = :uptime,
                            last_seen_at = CURRENT_TIMESTAMP,
                            is_deleted = FALSE
                        WHERE vm_uuid = CAST(:uuid AS uuid)
                    """), {
                        "uuid": vm_uuid,
                        "name": vm_data.get('name', ''),
                        "host_id": clean_val(vm_data.get('host_id')),
                        "group_id": clean_val(vm_data.get('group_id')),
                        "az_id": clean_val(vm_data.get('az_id')),
                        "os_type": clean_val(vm_data.get('os_type')),
                        "os_name": clean_val(vm_data.get('os_name')),
                        "os_display_name": clean_val(vm_data.get('os_display_name')),
                        "os_kernel": clean_val(vm_data.get('os_kernel')),
                        "os_distribution": clean_val(vm_data.get('os_distribution')),
                        "os_arch": clean_val(vm_data.get('os_arch')),
                        "cpu_cores": vm_data.get('cores', 0),
                        "memory_mb": vm_data.get('memory_mb', 0),
                        "storage_mb": vm_data.get('storage_mb', 0),
                        "uptime": vm_data.get('uptime_seconds')
                    })
                return 'updated'
            else:
                # Insert
                with self.db.begin_nested():
                    self.db.execute(text("""
                        INSERT INTO sangfor.vm_master (
                            vm_uuid, vm_id, name, vmtype,
                            host_id, group_id, az_id,
                            os_type, os_name,
                            os_display_name, os_kernel, os_distribution, os_arch,
                            cpu_cores, memory_total_mb, storage_total_mb, uptime_seconds,
                            first_seen_at, last_seen_at, is_deleted
                        ) VALUES (
                            CAST(:uuid AS uuid), :vm_id, :name, :vmtype,
                            :host_id, CAST(:group_id AS uuid), CAST(:az_id AS uuid),
                            :os_type, :os_name,
                            :os_display_name, :os_kernel, :os_distribution, :os_arch,
                            :cpu_cores, :memory_mb, :storage_mb, :uptime,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE
                        )
                    """), {
                        "uuid": vm_uuid,
                        "vm_id": vm_data.get('vm_id'),
                        "name": vm_data.get('name', ''),
                        "vmtype": vm_data.get('vmtype', 'vm'),
                        "host_id": clean_val(vm_data.get('host_id')),
                        "group_id": clean_val(vm_data.get('group_id')),
                        "az_id": clean_val(vm_data.get('az_id')),
                        "os_type": clean_val(vm_data.get('os_type')),
                        "os_name": clean_val(vm_data.get('os_name')),
                        "os_display_name": clean_val(vm_data.get('os_display_name')),
                        "os_kernel": clean_val(vm_data.get('os_kernel')),
                        "os_distribution": clean_val(vm_data.get('os_distribution')),
                        "os_arch": clean_val(vm_data.get('os_arch')),
                        "cpu_cores": vm_data.get('cores', 0),
                        "memory_mb": vm_data.get('memory_mb', 0),
                        "storage_mb": vm_data.get('storage_mb', 0),
                        "uptime": vm_data.get('uptime_seconds')
                    })
                return 'inserted'
        except Exception as e:
            logger.error(f"VM upsert issue for {vm_uuid}: {e}")
            return 'error'
    
    def mark_missing_vms_as_deleted(self, active_vm_uuids: List[str]) -> int:
        """
        Mark VMs as deleted if they are not in the active_vm_uuids list.
        Only affects VMs that are currently not marked as deleted.
        Returns count of VMs marked as deleted.
        """
        if not active_vm_uuids:
            logger.warning("No active VM UUIDs provided - skipping deletion detection")
            return 0
            
        try:
            # Using a direct update with NOT IN
            # We need to pass the list as a tuple for postgres/sqlalchemy handling
            
            query = text("""
                UPDATE sangfor.vm_master 
                SET is_deleted = TRUE, 
                    deleted_at = CURRENT_TIMESTAMP
                WHERE vm_uuid NOT IN :active_uuids
                  AND is_deleted = FALSE
                  AND vmtype = 'vm'
            """)
            
            result = self.db.execute(query, {"active_uuids": tuple(active_vm_uuids)})
            deleted_count = result.rowcount
            
            if deleted_count > 0:
                logger.info(f"🗑️ Marked {deleted_count} VMs as deleted (not found in SCP)")
                
            self.db.commit()
            return deleted_count
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error marking missing VMs as deleted: {e}")
            return 0

    def insert_metrics(self, vm_uuid: str, metrics: Dict[str, Any]) -> None:
        """Insert VM metrics - uses two separate savepoints so vm_metrics always succeeds"""
        # 1. Insert into time-series vm_metrics (primary - must always succeed)
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO metrics.vm_metrics (
                        vm_uuid, collected_at, power_state, status, uptime_seconds,
                        cpu_total_mhz, cpu_used_mhz, cpu_ratio,
                        memory_total_mb, memory_used_mb, memory_ratio,
                        storage_total_mb, storage_used_mb, storage_file_size_mb, storage_ratio,
                        network_read_bitps, network_write_bitps,
                        disk_read_byteps, disk_write_byteps,
                        disk_read_iops, disk_write_iops,
                        host_id, host_name
                    ) VALUES (
                        CAST(:uuid AS uuid), CURRENT_TIMESTAMP, :power_state, :status, :uptime,
                        :cpu_total, :cpu_used, :cpu_ratio,
                        :mem_total, :mem_used, :mem_ratio,
                        :stor_total, :stor_used, :stor_file_size, :stor_ratio,
                        :net_read, :net_write,
                        :disk_read_b, :disk_write_b,
                        :disk_read_iops, :disk_write_iops,
                        :host_id, :host_name
                    )
                """), {
                    "uuid": vm_uuid,
                    "power_state": metrics.get('power_state', 'unknown'),
                    "status": metrics.get('status', ''),
                    "uptime": metrics.get('uptime_seconds'),
                    "cpu_total": metrics.get('cpu_total_mhz', 0),
                    "cpu_used": metrics.get('cpu_used_mhz', 0),
                    "cpu_ratio": metrics.get('cpu_ratio', 0),
                    "mem_total": metrics.get('memory_total_mb', 0),
                    "mem_used": metrics.get('memory_used_mb', 0),
                    "mem_ratio": metrics.get('memory_ratio', 0),
                    "stor_total": metrics.get('storage_total_mb', 0),
                    "stor_used": metrics.get('storage_used_mb', 0),
                    "stor_file_size": metrics.get('storage_file_size_mb'),
                    "stor_ratio": metrics.get('storage_ratio', 0),
                    "net_read": metrics.get('network_read_bitps', 0),
                    "net_write": metrics.get('network_write_bitps', 0),
                    "disk_read_b": metrics.get('disk_read_byteps', 0),
                    "disk_write_b": metrics.get('disk_write_byteps', 0),
                    "disk_read_iops": metrics.get('disk_read_iops', 0),
                    "disk_write_iops": metrics.get('disk_write_iops', 0),
                    "host_id": metrics.get('host_id', ''),
                    "host_name": metrics.get('host_name', '')
                })

        except Exception as e:
            logger.warning(f"vm_metrics insert failed for {vm_uuid}: {e}")

        # 2. Upsert into vm_latest_metrics (separate savepoint - failure here won't affect vm_metrics)
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO metrics.vm_latest_metrics (
                        vm_uuid, collected_at, power_state, status, uptime_seconds,
                        cpu_ratio, cpu_used_mhz,
                        memory_ratio, memory_used_mb,
                        storage_ratio, storage_used_mb,
                        network_read_bitps, network_write_bitps,
                        disk_read_iops, disk_write_iops
                    ) VALUES (
                        CAST(:uuid AS uuid), CURRENT_TIMESTAMP, :power_state, :status, :uptime,
                        :cpu_ratio, :cpu_used,
                        :mem_ratio, :mem_used,
                        :stor_ratio, :stor_used,
                        :net_read, :net_write,
                        :disk_read_iops, :disk_write_iops
                    )
                    ON CONFLICT (vm_uuid) DO UPDATE SET
                        collected_at = EXCLUDED.collected_at,
                        power_state = EXCLUDED.power_state,
                        status = EXCLUDED.status,
                        uptime_seconds = EXCLUDED.uptime_seconds,
                        cpu_ratio = EXCLUDED.cpu_ratio,
                        cpu_used_mhz = EXCLUDED.cpu_used_mhz,
                        memory_ratio = EXCLUDED.memory_ratio,
                        memory_used_mb = EXCLUDED.memory_used_mb,
                        storage_ratio = EXCLUDED.storage_ratio,
                        storage_used_mb = EXCLUDED.storage_used_mb,
                        network_read_bitps = EXCLUDED.network_read_bitps,
                        network_write_bitps = EXCLUDED.network_write_bitps,
                        disk_read_iops = EXCLUDED.disk_read_iops,
                        disk_write_iops = EXCLUDED.disk_write_iops
                """), {
                    "uuid": vm_uuid,
                    "power_state": metrics.get('power_state', 'unknown'),
                    "status": metrics.get('status', ''),
                    "uptime": metrics.get('uptime_seconds'),
                    "cpu_used": metrics.get('cpu_used_mhz', 0),
                    "cpu_ratio": metrics.get('cpu_ratio', 0),
                    "mem_used": metrics.get('memory_used_mb', 0),
                    "mem_ratio": metrics.get('memory_ratio', 0),
                    "stor_used": metrics.get('storage_used_mb', 0),
                    "stor_ratio": metrics.get('storage_ratio', 0),
                    "net_read": metrics.get('network_read_bitps', 0),
                    "net_write": metrics.get('network_write_bitps', 0),
                    "disk_read_iops": metrics.get('disk_read_iops', 0),
                    "disk_write_iops": metrics.get('disk_write_iops', 0)
                })
        except Exception as e:
            logger.debug(f"vm_latest_metrics upsert issue for {vm_uuid}: {e}")
    
    def upsert_disk(self, vm_uuid: str, disk_data: Dict[str, Any]) -> None:
        """Upsert VM disk configuration"""
        try:
            disk_id = disk_data.get('id')
            if not disk_id:
                return
            
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO sangfor.vm_disk_config (
                        vm_uuid, disk_id, storage_id, storage_name, storage_file,
                        size_mb, preallocate, eagerly_scrub, physical_disk_type, storage_tag_id,
                        is_active, updated_at
                    ) VALUES (
                        CAST(:vm_uuid AS uuid), :disk_id, :storage_id, :storage_name, :storage_file,
                        :size_mb, :preallocate, :eagerly_scrub, :physical_disk_type, :storage_tag_id,
                        TRUE, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (vm_uuid, disk_id) DO UPDATE SET
                        storage_id = EXCLUDED.storage_id,
                        storage_name = EXCLUDED.storage_name,
                        storage_file = EXCLUDED.storage_file,
                        size_mb = EXCLUDED.size_mb,
                        preallocate = EXCLUDED.preallocate,
                        eagerly_scrub = EXCLUDED.eagerly_scrub,
                        physical_disk_type = EXCLUDED.physical_disk_type,
                        storage_tag_id = EXCLUDED.storage_tag_id,
                        is_active = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                """), {
                    "vm_uuid": vm_uuid,
                    "disk_id": disk_id,
                    "storage_id": disk_data.get('storage_id'),
                    "storage_name": disk_data.get('storage_name'),
                    "storage_file": disk_data.get('storage_file'),
                    "size_mb": int(disk_data.get('size_mb', 0) or 0),
                    "preallocate": disk_data.get('preallocate', 'metadata'),
                    "eagerly_scrub": int(disk_data.get('eagerly_scrub', 0) or 0),
                    "physical_disk_type": disk_data.get('physical_disk_type'),
                    "storage_tag_id": disk_data.get('storage_tag_id')
                })
        except Exception as e:
            logger.debug(f"Disk upsert issue: {e}")
    
    def deactivate_old_disks(self, vm_uuid: str, active_disk_ids: List[str]) -> None:
        """Mark disks not in active list as inactive"""
        try:
            with self.db.begin_nested():
                if not active_disk_ids:
                    # Deactivate all disks for this VM
                    self.db.execute(text("""
                        UPDATE sangfor.vm_disk_config SET is_active = FALSE 
                        WHERE vm_uuid = CAST(:vm_uuid AS uuid)
                    """), {"vm_uuid": vm_uuid})
                else:
                    self.db.execute(text("""
                        UPDATE sangfor.vm_disk_config SET is_active = FALSE 
                        WHERE vm_uuid = CAST(:vm_uuid AS uuid) 
                        AND disk_id NOT IN :disk_ids
                    """), {"vm_uuid": vm_uuid, "disk_ids": tuple(active_disk_ids)})
        except Exception as e:
            logger.debug(f"Deactivate disks issue: {e}")

    def upsert_network_interface(self, vm_uuid: str, interface_data: Dict[str, Any]) -> None:
        """Upsert VM network interface"""
        try:
            vif_id = interface_data.get('vif_id')
            if not vif_id:
                return

            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO sangfor.vm_network_interfaces (
                        vm_uuid, vif_id, network_name, port_id, mac_address,
                        model, ip_address, ipv6_address,
                        subnet_id, subnet_name, cidr,
                        gateway, custom_gateway,
                        vpc_id, vpc_name, device_id,
                        connected, is_active, updated_at
                    ) VALUES (
                        CAST(:vm_uuid AS uuid), :vif_id, :network_name, :port_id, :mac_address,
                        :model, :ip_address, :ipv6_address,
                        :subnet_id, :subnet_name, :cidr,
                        :gateway, :custom_gateway,
                        :vpc_id, :vpc_name, :device_id,
                        :connected, TRUE, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (vm_uuid, vif_id) DO UPDATE SET
                        network_name = EXCLUDED.network_name,
                        port_id = EXCLUDED.port_id,
                        mac_address = EXCLUDED.mac_address,
                        model = EXCLUDED.model,
                        ip_address = EXCLUDED.ip_address,
                        ipv6_address = EXCLUDED.ipv6_address,
                        subnet_id = EXCLUDED.subnet_id,
                        subnet_name = EXCLUDED.subnet_name,
                        cidr = EXCLUDED.cidr,
                        gateway = EXCLUDED.gateway,
                        custom_gateway = EXCLUDED.custom_gateway,
                        vpc_id = EXCLUDED.vpc_id,
                        vpc_name = EXCLUDED.vpc_name,
                        device_id = EXCLUDED.device_id,
                        connected = EXCLUDED.connected,
                        is_active = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                """), {
                    "vm_uuid": vm_uuid,
                    "vif_id": vif_id,
                    "network_name": interface_data.get('network_name'),
                    "port_id": interface_data.get('port_id'),
                    "mac_address": interface_data.get('mac_address'),
                    "model": interface_data.get('model'),
                    "ip_address": interface_data.get('ip_address'),
                    "ipv6_address": interface_data.get('ipv6_address'),
                    "subnet_id": interface_data.get('subnet_id'),
                    "subnet_name": interface_data.get('subnet_name'),
                    "cidr": interface_data.get('cidr'),
                    "gateway": interface_data.get('gateway'),
                    "custom_gateway": interface_data.get('custom_gateway'),
                    "vpc_id": interface_data.get('vpc_id'),
                    "vpc_name": interface_data.get('vpc_name'),
                    "device_id": interface_data.get('device_id'),
                    "connected": interface_data.get('connected', False)
                })
        except Exception as e:
            logger.debug(f"Network Interface upsert issue: {e}")

    def deactivate_old_interfaces(self, vm_uuid: str, active_vif_ids: List[str]) -> None:
        """Mark interfaces not in active list as inactive"""
        try:
            with self.db.begin_nested():
                if not active_vif_ids:
                    self.db.execute(text("""
                        UPDATE sangfor.vm_network_interfaces SET is_active = FALSE
                        WHERE vm_uuid = CAST(:vm_uuid AS uuid)
                    """), {"vm_uuid": vm_uuid})
                else:
                    self.db.execute(text("""
                        UPDATE sangfor.vm_network_interfaces SET is_active = FALSE
                        WHERE vm_uuid = CAST(:vm_uuid AS uuid)
                        AND vif_id NOT IN :vif_ids
                    """), {"vm_uuid": vm_uuid, "vif_ids": tuple(active_vif_ids)})
        except Exception as e:
            logger.debug(f"Deactivate interfaces issue: {e}")

    def upsert_alarms(self, vm_uuid: str, alarms: List[Dict[str, Any]]) -> List[int]:
        """
        Upsert alarms for a VM.
        Groups duplicate alarms by (vm_uuid, title) and tracks alert_count.
        Returns list of active alarm IDs.
        """
        active_ids = []
        if not alarms:
            return active_ids

        # Group alarms by (title) to calculate alert_count for deduplication
        grouped: Dict[str, Dict[str, Any]] = {}
        for alarm in alarms:
            title = alarm.get('title') or 'Unknown Alarm'
            key = title
            if key not in grouped:
                grouped[key] = {**alarm, 'alert_count': 1}
            else:
                grouped[key]['alert_count'] += 1
                # Prefer the alarm with the most recent begin_time
                existing_time = grouped[key].get('begin_time')
                new_time = alarm.get('begin_time')
                if new_time and (not existing_time or new_time > existing_time):
                    grouped[key]['begin_time'] = new_time

        try:
            with self.db.begin_nested():
                for alarm in grouped.values():
                    # Construct valid timestamp or None
                    begin_time = alarm.get('begin_time')
                    if not begin_time:
                        begin_time = datetime.now()  # Fallback for system alarms without time

                    # Insert or update - unique key is (vm_uuid, title, begin_time)
                    result = self.db.execute(text("""
                        INSERT INTO sangfor.vm_alarms (
                            vm_uuid, source, severity, title, description,
                            status, object_type, begin_time, alert_count, recommendation, updated_at
                        ) VALUES (
                            CAST(:vm_uuid AS uuid), :source, :severity, :title, :description,
                            :status, :object_type, :begin_time, :alert_count, :recommendation, CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (vm_uuid, title, begin_time)
                        DO UPDATE SET
                            source = EXCLUDED.source,
                            severity = EXCLUDED.severity,
                            description = EXCLUDED.description,
                            status = EXCLUDED.status,
                            alert_count = GREATEST(sangfor.vm_alarms.alert_count, EXCLUDED.alert_count),
                            recommendation = COALESCE(EXCLUDED.recommendation, sangfor.vm_alarms.recommendation),
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING alarm_id
                    """), {
                        "vm_uuid": vm_uuid,
                        "source": alarm.get('source', 'unknown'),
                        "severity": alarm.get('severity'),
                        "title": alarm.get('title') or 'Unknown Alarm',
                        "description": alarm.get('description'),
                        "status": alarm.get('status', 'open'),
                        "object_type": alarm.get('object_type'),
                        "begin_time": begin_time,
                        "alert_count": alarm.get('alert_count', 1),
                        "recommendation": alarm.get('recommendation'),
                    })

                    row = result.fetchone()
                    if row:
                        active_ids.append(row.alarm_id)

        except Exception as e:
            logger.error(f"Alarm upsert error for VM {vm_uuid}: {e}")

        return active_ids

    def close_missing_alarms(self, active_alarm_ids: List[int]) -> None:
        """
        Close all open alarms that are NOT in the active_alarm_ids list
        """
        try:
            with self.db.begin_nested():
                # If no active alarms, close all open alarms
                if not active_alarm_ids:
                    self.db.execute(text("""
                        UPDATE sangfor.vm_alarms 
                        SET status = 'closed', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                        WHERE status = 'open'
                    """))
                else:
                    # Close alarms not in the active list
                    self.db.execute(text("""
                        UPDATE sangfor.vm_alarms 
                        SET status = 'closed', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                        WHERE status = 'open' AND alarm_id NOT IN :active_ids
                    """), {"active_ids": tuple(active_alarm_ids)})
                    
        except Exception as e:
            logger.error(f"Error closing missing alarms: {e}")

    
    def upsert_other_alarms(self, alarms: List[Dict[str, Any]]) -> int:
        """
        Upsert alarms into sangfor.other_alarms.
        Groups duplicate alarms by (source, resource_id, title) and tracks alert_count.
        Returns number of inserted/updated records.
        """
        if not alarms:
            return 0

        # Group alarms by (source, resource_id or object_name, title) for deduplication
        grouped: Dict[str, Dict[str, Any]] = {}
        for alarm in alarms:
            source = alarm.get('source', 'unknown')
            res_id = alarm.get('resource_id') or alarm.get('object_name') or 'unknown'
            title = alarm.get('title') or alarm.get('description', '')[:80] or 'Unknown Alert'
            key = f"{source}|{res_id}|{title}"
            if key not in grouped:
                grouped[key] = {**alarm, 'alert_count': 1, '_title': title, '_res_id': res_id}
            else:
                grouped[key]['alert_count'] += 1

        count = 0
        try:
            with self.db.begin_nested():
                for alarm in grouped.values():
                    begin_time = alarm.get('begin_time')
                    if not begin_time:
                        begin_time = datetime.now()

                    title = alarm.get('_title') or alarm.get('title') or 'Unknown Alert'
                    res_id = alarm.get('_res_id') or alarm.get('resource_id') or alarm.get('object_name')

                    self.db.execute(text("""
                        INSERT INTO sangfor.other_alarms (
                            source, resource_id, resource_name, severity, title,
                            description, status, object_type, begin_time,
                            alert_count, recommendation, az_name, updated_at
                        ) VALUES (
                            :source, :resource_id, :resource_name, :severity, :title,
                            :description, :status, :object_type, :begin_time,
                            :alert_count, :recommendation, :az_name, CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (source, resource_id, title, begin_time)
                        DO UPDATE SET
                            resource_name = COALESCE(EXCLUDED.resource_name, sangfor.other_alarms.resource_name),
                            severity = COALESCE(EXCLUDED.severity, sangfor.other_alarms.severity),
                            description = COALESCE(EXCLUDED.description, sangfor.other_alarms.description),
                            status = EXCLUDED.status,
                            alert_count = GREATEST(sangfor.other_alarms.alert_count, EXCLUDED.alert_count),
                            recommendation = COALESCE(EXCLUDED.recommendation, sangfor.other_alarms.recommendation),
                            az_name = COALESCE(EXCLUDED.az_name, sangfor.other_alarms.az_name),
                            updated_at = CURRENT_TIMESTAMP
                    """), {
                        "source": alarm.get('source', 'unknown'),
                        "resource_id": res_id,
                        "resource_name": alarm.get('resource_name') or alarm.get('object_name'),
                        "severity": alarm.get('severity'),
                        "title": title,
                        "description": alarm.get('description'),
                        "status": alarm.get('status', 'open'),
                        "object_type": alarm.get('object_type'),
                        "begin_time": begin_time,
                        "alert_count": alarm.get('alert_count', 1),
                        "recommendation": alarm.get('recommendation'),
                        "az_name": alarm.get('az_name'),
                    })
                    count += 1
        except Exception as e:
            logger.error(f"Other Alarm upsert error: {e}")

        return count

    def close_missing_other_alarms_by_time(self, source: str, cutoff_minutes: int = 10) -> None:
        """
        Close other_alarms for a given source that were not updated in the last cutoff_minutes.
        This is called after a full sync to mark stale alarms as closed.
        """
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    UPDATE sangfor.other_alarms
                    SET status = 'closed', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE source = :source
                      AND status = 'open'
                      AND updated_at < (CURRENT_TIMESTAMP - INTERVAL ':mins minutes')
                """), {"source": source, "mins": cutoff_minutes})
        except Exception as e:
            logger.error(f"Error closing stale other_alarms for source {source}: {e}")

    def upsert_datastore(self, datastore_data: Dict[str, Any]) -> str:

        """
        Upsert datastore and return action taken ('inserted', 'updated', 'error')
        """
        datastore_id = datastore_data.get('id')
        if not datastore_id:
            return 'error'
        
        try:
            # Check if exists
            result = self.db.execute(text(
                "SELECT datastore_id FROM sangfor.datastore_master WHERE datastore_id = :id"
            ), {"id": datastore_id})
            
            exists = result.fetchone() is not None
            
            # Clean az_id - convert empty string to None
            az_id = datastore_data.get('az_id')
            if az_id == '' or az_id is None:
                az_id = None
            
            # Prepare supported_allocate_types as array
            allocate_types = datastore_data.get('supported_allocate_types', [])
            if not isinstance(allocate_types, list):
                allocate_types = []
            
            if exists:
                with self.db.begin_nested():
                    self.db.execute(text("""
                        UPDATE sangfor.datastore_master SET
                            name = :name,
                            description = :description,
                            az_id = CAST(:az_id AS uuid),
                            type = :type,
                            status = :status,
                            total_mb = :total_mb,
                            used_mb = :used_mb,
                            ratio = :ratio,
                            backup_enable = :backup_enable,
                            backup_total_mb = :backup_total_mb,
                            backup_used_mb = :backup_used_mb,
                            backup_ratio = :backup_ratio,
                            archive_usable = :archive_usable,
                            shared = :shared,
                            connected_hosts = :connected_hosts,
                            storage_tag_id = :storage_tag_id,
                            target = :target,
                            read_byteps = :read_byteps,
                            write_byteps = :write_byteps,
                            max_read_byteps = :max_read_byteps,
                            max_write_byteps = :max_write_byteps,
                            is_active = TRUE,
                            last_seen_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE datastore_id = :datastore_id
                    """), {
                        "datastore_id": datastore_id,
                        "name": datastore_data.get('name', ''),
                        "description": datastore_data.get('description', ''),
                        "az_id": az_id,
                        "type": datastore_data.get('type', ''),
                        "status": datastore_data.get('status', ''),
                        "total_mb": datastore_data.get('total_mb', 0),
                        "used_mb": datastore_data.get('used_mb', 0),
                        "ratio": datastore_data.get('ratio', 0),
                        "backup_enable": datastore_data.get('backup_enable', 0),
                        "backup_total_mb": datastore_data.get('backup_total_mb', 0),
                        "backup_used_mb": datastore_data.get('backup_used_mb', 0),
                        "backup_ratio": datastore_data.get('backup_ratio', 0),
                        "archive_usable": datastore_data.get('archive_usable', 0),
                        "shared": datastore_data.get('shared', 0),
                        "connected_hosts": datastore_data.get('connected_hosts', 0),
                        "storage_tag_id": datastore_data.get('storage_tag_id', ''),
                        "target": datastore_data.get('target', ''),
                        "read_byteps": datastore_data.get('read_byteps', 0),
                        "write_byteps": datastore_data.get('write_byteps', 0),
                        "max_read_byteps": datastore_data.get('max_read_byteps', 0),
                        "max_write_byteps": datastore_data.get('max_write_byteps', 0)
                    })
                return 'updated'
            else:
                with self.db.begin_nested():
                    self.db.execute(text("""
                        INSERT INTO sangfor.datastore_master (
                            datastore_id, name, description, az_id,
                            type, status, total_mb, used_mb, ratio,
                            backup_enable, backup_total_mb, backup_used_mb, backup_ratio,
                            archive_usable, shared, connected_hosts, storage_tag_id, target,
                            read_byteps, write_byteps, max_read_byteps, max_write_byteps,
                            is_active, first_seen_at, last_seen_at
                        ) VALUES (
                            :datastore_id, :name, :description, CAST(:az_id AS uuid),
                            :type, :status, :total_mb, :used_mb, :ratio,
                            :backup_enable, :backup_total_mb, :backup_used_mb, :backup_ratio,
                            :archive_usable, :shared, :connected_hosts, :storage_tag_id, :target,
                            :read_byteps, :write_byteps, :max_read_byteps, :max_write_byteps,
                            TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                    """), {
                        "datastore_id": datastore_id,
                        "name": datastore_data.get('name', ''),
                        "description": datastore_data.get('description', ''),
                        "az_id": az_id,
                        "type": datastore_data.get('type', ''),
                        "status": datastore_data.get('status', ''),
                        "total_mb": datastore_data.get('total_mb', 0),
                        "used_mb": datastore_data.get('used_mb', 0),
                        "ratio": datastore_data.get('ratio', 0),
                        "backup_enable": datastore_data.get('backup_enable', 0),
                        "backup_total_mb": datastore_data.get('backup_total_mb', 0),
                        "backup_used_mb": datastore_data.get('backup_used_mb', 0),
                        "backup_ratio": datastore_data.get('backup_ratio', 0),
                        "archive_usable": datastore_data.get('archive_usable', 0),
                        "shared": datastore_data.get('shared', 0),
                        "connected_hosts": datastore_data.get('connected_hosts', 0),
                        "storage_tag_id": datastore_data.get('storage_tag_id', ''),
                        "target": datastore_data.get('target', ''),
                        "read_byteps": datastore_data.get('read_byteps', 0),
                        "write_byteps": datastore_data.get('write_byteps', 0),
                        "max_read_byteps": datastore_data.get('max_read_byteps', 0),
                        "max_write_byteps": datastore_data.get('max_write_byteps', 0)
                    })
                return 'inserted'
        except Exception as e:
            logger.error(f"Datastore upsert error for {datastore_id}: {e}")
            return 'error'
    
    def insert_datastore_metrics(self, datastore_id: str, datastore_data: Dict[str, Any]) -> None:
        """Insert datastore metrics for historical tracking"""
        try:
            with self.db.begin_nested():
                self.db.execute(text("""
                    INSERT INTO metrics.datastore_metrics (
                        datastore_id, collected_at,
                        total_mb, used_mb, ratio,
                        backup_total_mb, backup_used_mb, backup_ratio,
                        read_byteps, write_byteps,
                        status, connected_hosts
                    ) VALUES (
                        :datastore_id, CURRENT_TIMESTAMP,
                        :total_mb, :used_mb, :ratio,
                        :backup_total_mb, :backup_used_mb, :backup_ratio,
                        :read_byteps, :write_byteps,
                        :status, :connected_hosts
                    )
                """), {
                    "datastore_id": datastore_id,
                    "total_mb": datastore_data.get('total_mb', 0),
                    "used_mb": datastore_data.get('used_mb', 0),
                    "ratio": datastore_data.get('ratio', 0),
                    "backup_total_mb": datastore_data.get('backup_total_mb', 0),
                    "backup_used_mb": datastore_data.get('backup_used_mb', 0),
                    "backup_ratio": datastore_data.get('backup_ratio', 0),
                    "read_byteps": datastore_data.get('read_byteps', 0),
                    "write_byteps": datastore_data.get('write_byteps', 0),
                    "status": datastore_data.get('status', ''),
                    "connected_hosts": datastore_data.get('connected_hosts', 0)
                })
        except Exception as e:
            logger.debug(f"Datastore metrics insert issue: {e}")
    
    def commit(self) -> None:
        """Commit current transaction"""
        self.db.commit()
    
    def rollback(self) -> None:
        """Rollback current transaction"""
        self.db.rollback()
