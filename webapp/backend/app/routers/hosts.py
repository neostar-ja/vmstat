"""
Hosts Router - API endpoints for host management
Provides sync and query capabilities for physical hosts
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging

from ..database import get_db
from ..utils.auth import get_current_user, require_admin
from ..services.host_sync import HostSyncService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hosts", tags=["Hosts"])


# ============================================================
# Pydantic Models
# ============================================================

class HostOverview(BaseModel):
    """Host overview model"""
    host_id: str
    host_name: str
    ip: Optional[str] = None
    type: Optional[str] = None
    status: str
    cluster_id: Optional[str] = None
    cluster_name: Optional[str] = None
    az_name: Optional[str] = None
    
    # CPU
    cpu_cores: Optional[int] = None
    cpu_sockets: Optional[int] = None
    cpu_total_mhz: Optional[float] = None
    cpu_used_mhz: Optional[float] = None
    cpu_usage_ratio: Optional[float] = None
    cpu_usage_pct: Optional[float] = None
    
    # Memory
    memory_total_mb: Optional[float] = None
    memory_used_mb: Optional[float] = None
    memory_free_mb: Optional[float] = None
    memory_usage_ratio: Optional[float] = None
    memory_usage_pct: Optional[float] = None
    memory_total_gb: Optional[float] = None
    memory_used_gb: Optional[float] = None
    
    # VMs
    vm_total: Optional[int] = 0
    vm_running: Optional[int] = 0
    vm_stopped: Optional[int] = 0
    
    # Alarms
    alarm_count: Optional[int] = 0
    has_alarm: Optional[bool] = False
    health_status: Optional[str] = "healthy"
    
    last_synced_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class HostDetail(HostOverview):
    """Extended host detail with datastores and alarms"""
    datastores: Optional[List[str]] = []
    datastore_count: Optional[int] = 0
    alarms: Optional[List[Dict[str, Any]]] = []


class HostStats(BaseModel):
    """Host statistics"""
    total_hosts: int
    running_hosts: int
    critical_hosts: int
    warning_hosts: int
    healthy_hosts: int
    total_vms: int
    total_cpu_mhz: float
    total_memory_gb: float
    avg_cpu_usage: float
    avg_memory_usage: float
    hosts_with_alarms: int


class HostSyncRequest(BaseModel):
    """Host sync request"""
    collect_metrics: Optional[bool] = True


# ============================================================
# Query Endpoints
# ============================================================

@router.get("/", response_model=List[HostOverview])
async def list_hosts(
    az: Optional[str] = Query(None, description="Filter by availability zone"),
    cluster: Optional[str] = Query(None, description="Filter by cluster"),
    status: Optional[str] = Query(None, description="Filter by status"),
    health: Optional[str] = Query(None, description="Filter by health status"),
    limit: Optional[int] = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    รายการ hosts ทั้งหมด
    
    - สามารถกรองตาม AZ, cluster, status, health
    - รองรับ pagination
    """
    query = """
        SELECT * FROM analytics.v_host_overview
        WHERE 1=1
    """
    params = {"limit": limit}
    
    if az:
        query += " AND az_name = :az"
        params["az"] = az
    
    if cluster:
        query += " AND cluster_name = :cluster"
        params["cluster"] = cluster
    
    if status:
        query += " AND status = :status"
        params["status"] = status
    
    if health:
        query += " AND health_status = :health"
        params["health"] = health
    
    query += " ORDER BY host_name LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/stats", response_model=HostStats)
async def get_host_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    สถิติโดยรวมของ hosts
    """
    query = """
        SELECT 
            COUNT(*) as total_hosts,
            COUNT(*) FILTER (WHERE status = 'running') as running_hosts,
            COUNT(*) FILTER (WHERE health_status = 'critical') as critical_hosts,
            COUNT(*) FILTER (WHERE health_status = 'warning') as warning_hosts,
            COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_hosts,
            COALESCE(SUM(vm_total), 0) as total_vms,
            COALESCE(SUM(cpu_total_mhz), 0) as total_cpu_mhz,
            ROUND(COALESCE(SUM(memory_total_mb) / 1024.0, 0)::numeric, 2) as total_memory_gb,
            ROUND(COALESCE(AVG(cpu_usage_ratio) * 100, 0)::numeric, 2) as avg_cpu_usage,
            ROUND(COALESCE(AVG(memory_usage_ratio) * 100, 0)::numeric, 2) as avg_memory_usage,
            COUNT(*) FILTER (WHERE alarm_count > 0) as hosts_with_alarms
        FROM analytics.v_host_overview
    """
    
    result = db.execute(text(query))
    row = result.fetchone()
    
    if row:
        return dict(row._mapping)
    
    return HostStats(
        total_hosts=0, running_hosts=0, critical_hosts=0, warning_hosts=0,
        healthy_hosts=0, total_vms=0, total_cpu_mhz=0, total_memory_gb=0,
        avg_cpu_usage=0, avg_memory_usage=0, hosts_with_alarms=0
    )


@router.get("/{host_id}", response_model=HostDetail)
async def get_host_detail(
    host_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    รายละเอียดของ host เฉพาะรายการ
    รวม datastores และ alarms
    """
    # Get host overview
    host_query = """
        SELECT * FROM analytics.v_host_overview
        WHERE host_id = :host_id
    """
    result = db.execute(text(host_query), {"host_id": host_id})
    host = result.fetchone()
    
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    
    host_dict = dict(host._mapping)
    
    # Get datastores
    ds_query = """
        SELECT datastore_name
        FROM sangfor.host_datastore
        WHERE host_id = :host_id
        ORDER BY datastore_name
    """
    ds_result = db.execute(text(ds_query), {"host_id": host_id})
    datastores = [row[0] for row in ds_result.fetchall()]
    
    # Get alarms
    alarm_query = """
        SELECT 
            id::text, alarm_type, level, status, description,
            alarm_advice, policy_name, start_time, updated_at
        FROM sangfor.host_alarm
        WHERE host_id = :host_id AND is_active = TRUE
        ORDER BY start_time DESC
    """
    alarm_result = db.execute(text(alarm_query), {"host_id": host_id})
    alarms = [dict(row._mapping) for row in alarm_result.fetchall()]
    
    host_dict["datastores"] = datastores
    host_dict["datastore_count"] = len(datastores)
    host_dict["alarms"] = alarms
    
    return host_dict


@router.get("/{host_id}/health-score")
async def get_host_health_score(
    host_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    คำนวณคะแนนสุขภาพของ host (0-100)
    """
    result = db.execute(
        text("SELECT sangfor.calculate_host_health_score(:host_id) as score"),
        {"host_id": host_id}
    )
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Host not found")
    
    return {"host_id": host_id, "health_score": row[0]}


@router.get("/{host_id}/metrics")
async def get_host_metrics_history(
    host_id: str,
    hours: int = Query(24, ge=1, le=168, description="Hours of history to retrieve"),
    time_range: Optional[str] = Query(None, description="Time range: 1h, 6h, 24h, 7d, 30d"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    ประวัติ metrics ของ host
    รองรับ time_range parameter เพิ่มเติม (1h, 6h, 24h, 7d, 30d)
    """
    # แปลง time_range เป็น hours
    time_range_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
    if time_range and time_range in time_range_map:
        hours = time_range_map[time_range]
    
    # แก้ bug: ใช้ f-string แทน parameterized interval เพราะ PostgreSQL ไม่รองรับ :param ใน INTERVAL string
    # รองรับทั้งคอลัมน์แบบเก่า (cpu_usage_ratio) และใหม่ (cpu_ratio)
    query = f"""
        SELECT 
            collected_at,
            COALESCE(cpu_ratio, 0) * 100 AS cpu_usage_pct,
            COALESCE(memory_ratio, 0) * 100 AS memory_usage_pct,
            COALESCE(cpu_used_mhz, 0) AS cpu_used_mhz,
            COALESCE(cpu_total_mhz, 0) AS cpu_total_mhz,
            COALESCE(memory_used_mb, 0) AS memory_used_mb,
            COALESCE(memory_total_mb, 0) AS memory_total_mb,
            COALESCE(vm_running_count, 0) AS vm_running,
            COALESCE(vm_count, 0) AS vm_total,
            0 AS alarm_count
        FROM metrics.host_metrics
        WHERE host_id = :host_id
            AND collected_at >= NOW() - INTERVAL '{hours} hours'
        ORDER BY collected_at ASC
    """
    
    result = db.execute(text(query), {"host_id": host_id})
    rows = result.fetchall()
    
    return [
        {
            "collected_at": row.collected_at.isoformat() if hasattr(row.collected_at, 'isoformat') else row.collected_at,
            "cpu_usage_pct": float(row.cpu_usage_pct or 0),
            "memory_usage_pct": float(row.memory_usage_pct or 0),
            "cpu_used_mhz": float(row.cpu_used_mhz or 0),
            "cpu_total_mhz": float(row.cpu_total_mhz or 0),
            "memory_used_mb": float(row.memory_used_mb or 0),
            "memory_total_mb": float(row.memory_total_mb or 0),
            "vm_running": int(row.vm_running or 0),
            "vm_total": int(row.vm_total or 0),
            "alarm_count": int(row.alarm_count or 0),
        }
        for row in rows
    ]


@router.get("/{host_id}/vms")
async def get_host_vms(
    host_id: str,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    ดึงรายการ VM ที่กำลังทำงานบน Host นี้
    """
    query = """
        SELECT 
            CAST(v.vm_uuid AS text) AS vm_uuid,
            v.vm_id,
            v.name,
            v.power_state,
            v.status,
            v.cpu_cores,
            ROUND(v.memory_total_mb::numeric, 0) AS memory_total_mb,
            ROUND(v.memory_usage::numeric * 100, 1) AS memory_usage_pct,
            ROUND(v.cpu_usage::numeric * 100, 1) AS cpu_usage_pct,
            v.os_display_name,
            v.group_name,
            CAST(v.ip_address AS text) AS ip_address,
            v.last_metrics_at
        FROM analytics.mv_vm_overview v
        JOIN sangfor.vm_master m ON v.vm_uuid = m.vm_uuid
        WHERE m.host_id = :host_id
          AND v.is_deleted = FALSE
        ORDER BY v.power_state DESC, v.name ASC
        LIMIT :limit
    """
    
    result = db.execute(text(query), {"host_id": host_id, "limit": limit})
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/clusters/list")
async def list_clusters(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    รายการ clusters ทั้งหมด
    """
    query = """
        SELECT DISTINCT 
            cluster_id,
            cluster_name,
            az_name,
            COUNT(*) as host_count,
            SUM(vm_total) as total_vms
        FROM analytics.v_host_overview
        WHERE cluster_name IS NOT NULL
        GROUP BY cluster_id, cluster_name, az_name
        ORDER BY cluster_name
    """
    
    result = db.execute(text(query))
    return [dict(row._mapping) for row in result.fetchall()]


# ============================================================
# Sync Endpoints (Admin only)
# ============================================================

from ..services.sync_v2.db_handler import SyncDbHandler

@router.post("/sync")
async def sync_hosts(
    sync_request: HostSyncRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Sync hosts จาก connect_hosts.py output
    
    - Admin เท่านั้น
    - ต้องอัปโหลด host_resources.json หรือระบุ path
    """
    handler = SyncDbHandler(db)
    job_id = handler.create_job(
        source="host_sync_manual", 
        triggered_by=current_user.get("username", "admin")
    )
    
    try:
        # Load host data from file
        import os
        host_file = os.path.join("/opt/code/sangfor_scp", "host_resources.json")
        
        if not os.path.exists(host_file):
            raise HTTPException(
                status_code=404, 
                detail="host_resources.json not found. Please run connect_hosts.py first."
            )
        
        with open(host_file, 'r') as f:
            hosts_data = json.load(f)
        
        # Get AZ mapping
        az_result = db.execute(text("SELECT az_name, az_id FROM sangfor.az_master WHERE is_active = TRUE"))
        az_mapping = {row[0]: row[1] for row in az_result.fetchall()}
        
        # Sync hosts
        host_sync = HostSyncService(db)
        stats = host_sync.sync_hosts(hosts_data, az_mapping, handler, job_id)
        
        # Optionally insert metrics
        if sync_request.collect_metrics:
            collected_at = datetime.utcnow()
            for host_id, host_info in hosts_data.items():
                try:
                    host_sync.insert_host_metrics(host_id, host_info, collected_at)
                except Exception as e:
                    logger.error(f"Error inserting metrics for {host_id}: {e}")
        
        # Complete job
        job_stats = {
            "hosts_synced": stats["inserted"] + stats["updated"],
            "alarms_synced": stats["alarms_synced"],
            "datastores_synced": stats["datastores_synced"],
            "total_vms": 0, # Not syncing VMs here
            "metadata": stats
        }
        handler.complete_job(job_id, "success", job_stats)
        
        return {
            "success": True,
            "message": "Host sync completed",
            "stats": stats,
            "job_id": str(job_id)
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Host sync failed: {error_msg}")
        handler.complete_job(job_id, "failed", {}, error_message=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/sync/upload")
async def sync_hosts_from_upload(
    file: UploadFile = File(..., description="host_resources.json file"),
    collect_metrics: bool = Query(True, description="Collect metrics"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Sync hosts โดยอัปโหลดไฟล์ JSON
    
    - Admin เท่านั้น
    """
    handler = SyncDbHandler(db)
    job_id = handler.create_job(
        source="host_sync_upload", 
        triggered_by=current_user.get("username", "admin")
    )

    try:
        # Read uploaded file
        content = await file.read()
        hosts_data = json.loads(content)
        
        # Get AZ mapping
        az_result = db.execute(text("SELECT az_name, az_id FROM sangfor.az_master WHERE is_active = TRUE"))
        az_mapping = {row[0]: row[1] for row in az_result.fetchall()}
        
        # Sync hosts
        host_sync = HostSyncService(db)
        stats = host_sync.sync_hosts(hosts_data, az_mapping, handler, job_id)
        
        # Optionally insert metrics
        if collect_metrics:
            collected_at = datetime.utcnow()
            for host_id, host_info in hosts_data.items():
                try:
                    host_sync.insert_host_metrics(host_id, host_info, collected_at)
                except Exception as e:
                    logger.error(f"Error inserting metrics for {host_id}: {e}")
        
        # Complete job
        job_stats = {
            "hosts_synced": stats["inserted"] + stats["updated"],
            "alarms_synced": stats["alarms_synced"],
            "datastores_synced": stats["datastores_synced"],
            "total_vms": 0,
            "metadata": stats
        }
        handler.complete_job(job_id, "success", job_stats)

        return {
            "success": True,
            "message": "Host sync completed from upload",
            "stats": stats,
            "job_id": str(job_id)
        }
        
    except json.JSONDecodeError as e:
        handler.complete_job(job_id, "failed", {}, error_message=f"Invalid JSON: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Host sync from upload failed: {error_msg}")
        handler.complete_job(job_id, "failed", {}, error_message=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.delete("/{host_id}")
async def delete_host(
    host_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    ลบ host (soft delete)
    
    - Admin เท่านั้น
    """
    result = db.execute(
        text("""
            UPDATE sangfor.host_master 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE host_id = :host_id
            RETURNING host_id
        """),
        {"host_id": host_id}
    )
    
    deleted = result.fetchone()
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Host not found")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Host {host_id} deleted successfully"
    }

