"""
Sync Router V2 - API endpoints for sync operations
Complete redesign with jobs, history, and configuration
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from ..database import get_db
from ..utils.auth import get_current_user, require_admin
from ..services.sync_v2 import get_sync_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["Sync"])


# ============================================================
# Pydantic Models
# ============================================================

class SyncConfigUpdate(BaseModel):
    """Configuration update request"""
    scp_ip: Optional[str] = None
    scp_port: Optional[int] = None
    scp_username: Optional[str] = None
    scp_password: Optional[str] = None
    sync_timeout_seconds: Optional[int] = None
    max_retries: Optional[int] = None
    batch_size: Optional[int] = None


class MetricsSettings(BaseModel):
    """Metrics collection settings"""
    collect_metrics: Optional[bool] = None
    collection_interval_seconds: Optional[int] = None
    retain_raw_days: Optional[int] = None
    retain_hourly_days: Optional[int] = None
    retain_daily_days: Optional[int] = None
    auto_aggregate: Optional[bool] = None


class MetricsSettings(BaseModel):
    """Metrics collection settings"""
    collect_metrics: Optional[bool] = None
    collection_interval_seconds: Optional[int] = None
    retain_raw_days: Optional[int] = None
    retain_hourly_days: Optional[int] = None
    retain_daily_days: Optional[int] = None
    auto_aggregate: Optional[bool] = None


class SchedulerControl(BaseModel):
    """Scheduler control request"""
    action: str = Field(..., description="start or stop")
    interval_minutes: Optional[int] = Field(5, ge=1, le=1440)


# ============================================================
# Status & Info
# ============================================================

@router.get("/status")
async def get_sync_status(current_user: dict = Depends(get_current_user)):
    """
    รับสถานะปัจจุบันของระบบ Sync
    
    Returns:
        - is_syncing: กำลัง sync อยู่หรือไม่
        - scheduler: สถานะ scheduler
        - config: การตั้งค่าปัจจุบัน
    """
    return {"data": get_sync_service().status}


@router.get("/stats")
async def get_sync_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    รับสถิติการ Sync
    """
    try:
        from sqlalchemy import text
        
        result = db.execute(text("""
            SELECT * FROM sync.v_stats
        """))
        row = result.fetchone()
        
        if row:
            return {
                "data": {
                    "total_jobs": row.total_jobs,
                    "successful_jobs": row.successful_jobs,
                    "failed_jobs": row.failed_jobs,
                    "avg_duration_ms": row.avg_duration_ms,
                    "last_successful_sync": row.last_successful_sync.isoformat() if row.last_successful_sync else None,
                    "total_vms_inserted": row.total_vms_inserted,
                    "total_vms_updated": row.total_vms_updated,
                    "scheduler_enabled": row.scheduler_enabled,
                    "scheduler_interval": row.scheduler_interval
                }
            }
        
        return {"data": {}}
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {"data": {}, "error": str(e)}


# ============================================================
# Sync Execution
# ============================================================

@router.post("/run")
async def run_sync(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin)
):
    """
    เริ่ม Sync ทันที (Background)
    
    ใช้สำหรับ Admin เท่านั้น
    """
    if get_sync_service()._is_syncing:
        raise HTTPException(
            status_code=409, 
            detail="Sync กำลังทำงานอยู่"
        )
    
    # Run in background
    background_tasks.add_task(
        get_sync_service().run_sync,
        source="manual",
        triggered_by=current_user.get("username", "admin")
    )
    
    return {
        "message": "เริ่ม Sync แล้ว",
        "status": "running"
    }


@router.post("/run-foreground")
async def run_sync_foreground(current_user: dict = Depends(require_admin)):
    """
    เริ่ม Sync และรอจนเสร็จ
    
    ใช้สำหรับ Admin เท่านั้น
    """
    if get_sync_service()._is_syncing:
        raise HTTPException(
            status_code=409, 
            detail="Sync กำลังทำงานอยู่"
        )
    
    result = get_sync_service().run_sync(
        source="manual",
        triggered_by=current_user.get("username", "admin")
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Sync failed"))
    
    return {"data": result}


# ============================================================
# Scheduler Control
# ============================================================

@router.post("/scheduler")
async def control_scheduler(
    control: SchedulerControl,
    current_user: dict = Depends(require_admin)
):
    """
    ควบคุม Scheduler
    
    - action: "start" หรือ "stop"
    - interval_minutes: รอบการ sync (นาที)
    """
    if control.action == "start":
        result = get_sync_service().start_scheduler(control.interval_minutes or 5)
    elif control.action == "stop":
        result = get_sync_service().stop_scheduler()
    else:
        raise HTTPException(status_code=400, detail="action ต้องเป็น 'start' หรือ 'stop'")
    
    return {
        "data": result,
        "status": get_sync_service()._scheduler.status
    }


@router.get("/scheduler/status")
async def get_scheduler_status(current_user: dict = Depends(get_current_user)):
    """รับสถานะ Scheduler"""
    return {"data": get_sync_service()._scheduler.status}


# ============================================================
# Configuration
# ============================================================

@router.get("/config")
async def get_config(current_user: dict = Depends(require_admin)):
    """
    รับการตั้งค่า Sync
    
    Admin เท่านั้น
    """
    return {"data": get_sync_service().get_config()}


@router.put("/config")
async def update_config(
    config: SyncConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    """
    อัพเดทการตั้งค่า Sync
    
    Admin เท่านั้น
    """
    update_data = config.dict(exclude_none=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="ไม่มีข้อมูลที่จะอัพเดท")
    
    result = get_sync_service().update_config(**update_data)
    
    return {
        "message": "บันทึกการตั้งค่าเรียบร้อย",
        "data": result
    }


@router.get("/metrics-settings")
async def get_metrics_settings(current_user: dict = Depends(require_admin)):
    """
    รับการตั้งค่า Metrics Collection
    
    Admin เท่านั้น
    """
    config = get_sync_service().get_config()
    
    # Filter only metrics settings
    metrics_config = {
        "collect_metrics": config.get("collect_metrics", True),
        "collection_interval_seconds": config.get("collection_interval_seconds", 60),
        "retain_raw_days": config.get("retain_raw_days", 7),
        "retain_hourly_days": config.get("retain_hourly_days", 30),
        "retain_daily_days": config.get("retain_daily_days", 365),
        "auto_aggregate": config.get("auto_aggregate", True)
    }
    
    return {"data": metrics_config}


@router.put("/metrics-settings")
async def update_metrics_settings(
    settings: MetricsSettings,
    current_user: dict = Depends(require_admin)
):
    """
    อัพเดทการตั้งค่า Metrics Collection
    
    Admin เท่านั้น
    """
    update_data = settings.dict(exclude_none=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="ไม่มีข้อมูลที่จะอัพเดท")
    
    result = get_sync_service().update_config(**update_data)
    
    return {
        "message": "บันทึกการตั้งค่าเรียบร้อย",
        "data": result
    }


@router.post("/test-connection")
async def test_connection(current_user: dict = Depends(require_admin)):
    """
    ทดสอบการเชื่อมต่อกับ SCP
    """
    result = get_sync_service().test_connection()
    
    if result.get("success"):
        return {"data": result}
    else:
        raise HTTPException(status_code=400, detail=result.get("message", "Connection failed"))


# ============================================================
# Jobs History
# ============================================================

@router.get("/jobs")
async def get_jobs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by status: success, failed, running"),
    current_user: dict = Depends(get_current_user)
):
    """
    รับประวัติการ Sync (Jobs)
    
    รองรับ pagination และ filter ตาม status
    """
    result = get_sync_service().get_jobs(limit=limit, offset=offset, status=status)
    return {"data": result}


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    รับรายละเอียด Job
    
    รวม error logs และ statistics
    """
    job = get_sync_service().get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="ไม่พบ Job นี้")
    
    return {"data": job}


@router.get("/metrics-settings")
async def get_metrics_settings(current_user: dict = Depends(require_admin)):
    """
    รับการตั้งค่า Metrics Collection
    
    Admin เท่านั้น
    """
    config = get_sync_service().get_config()
    
    # Filter only metrics settings
    metrics_config = {
        "collect_metrics": config.get("collect_metrics", True),
        "collection_interval_seconds": config.get("collection_interval_seconds", 60),
        "retain_raw_days": config.get("retain_raw_days", 7),
        "retain_hourly_days": config.get("retain_hourly_days", 30),
        "retain_daily_days": config.get("retain_daily_days", 365),
        "auto_aggregate": config.get("auto_aggregate", True)
    }
    
    return {"data": metrics_config}


@router.put("/metrics-settings")
async def update_metrics_settings(
    settings: MetricsSettings,
    current_user: dict = Depends(require_admin)
):
    """
    อัพเดทการตั้งค่า Metrics Collection
    
    Admin เท่านั้น
    """
    update_data = settings.dict(exclude_none=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="ไม่มีข้อมูลที่จะอัพเดท")
    
    result = get_sync_service().update_config(**update_data)
    
    return {
        "message": "บันทึกการตั้งค่าเรียบร้อย",
        "data": result
    }


# ============================================================
# Legacy Compatibility (for existing frontend)
# ============================================================

@router.get("/history")
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Legacy endpoint สำหรับ frontend เดิม
    Maps to new jobs endpoint
    """
    result = get_sync_service().get_jobs(limit=limit)
    
    # Transform to old format for compatibility
    history = []
    for job in result.get("jobs", []):
        history.append({
            "batch_id": job.get("id"),
            "collected_at": job.get("started_at"),
            "source": job.get("source"),
            "total_vms": job.get("total_vms_fetched"),
            "processed_vms": job.get("vms_inserted", 0) + job.get("vms_updated", 0),
            "failed_vms": job.get("vms_errors"),
            "duration_seconds": (job.get("duration_ms") or 0) / 1000,
            "status": job.get("status"),
            "error_message": job.get("error_message"),
            "vms_inserted": job.get("vms_inserted"),
            "vms_updated": job.get("vms_updated"),
            "metrics_inserted": job.get("metrics_inserted")
        })
    
    return {"data": history}


@router.get("/settings")
async def get_settings_legacy(current_user: dict = Depends(require_admin)):
    """Legacy endpoint for settings"""
    config = get_sync_service().get_config()
    status = get_sync_service()._scheduler.status
    
    return {
        "data": {
            "scp_ip": config.get("scp_ip"),
            "scp_username": config.get("scp_username"),
            "scp_password_set": config.get("scp_password_set"),
            "sync_interval_minutes": config.get("scheduler_interval_minutes"),
            "scheduler_active": status.get("is_running")
        }
    }


# ============================================================
# DataStore Endpoints
# ============================================================

@router.get("/datastores")
async def get_datastores(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all datastores"""
    from sqlalchemy import text
    
    result = db.execute(text("""
        SELECT 
            d.datastore_id, d.name, d.description, d.az_id,
            d.type, d.status, d.total_mb, d.used_mb, d.ratio,
            d.backup_enable, d.backup_total_mb, d.backup_used_mb, d.backup_ratio,
            d.archive_usable, d.shared, d.connected_hosts, d.storage_tag_id, d.target,
            d.read_byteps, d.write_byteps, d.max_read_byteps, d.max_write_byteps,
            d.is_active, d.first_seen_at, d.last_seen_at, d.updated_at,
            a.az_name,
            COALESCE(udp.display_order, 999999) as display_order
        FROM sangfor.datastore_master d
        LEFT JOIN sangfor.az_master a ON d.az_id = a.az_id
        LEFT JOIN webapp.user_datastore_prefs udp ON d.datastore_id = udp.datastore_id AND udp.user_id = :user_id
        WHERE d.is_active = TRUE
        ORDER BY display_order ASC, d.name ASC
    """), {"user_id": current_user['id']})
    
    datastores = []
    for row in result.fetchall():
        total_mb = row.total_mb or 0
        used_mb = row.used_mb or 0
        free_mb = total_mb - used_mb
        
        datastores.append({
            "datastore_id": row.datastore_id,
            "name": row.name,
            "description": row.description,
            "az_id": str(row.az_id) if row.az_id else None,
            "az_name": row.az_name,
            "type": row.type,
            "status": "normal" if row.status == "ok" else row.status,
            "total_mb": total_mb,
            "used_mb": used_mb,
            "free_mb": free_mb,
            "ratio": float(row.ratio) if row.ratio else 0,
            "backup_enable": row.backup_enable,
            "backup_total_mb": row.backup_total_mb or 0,
            "backup_used_mb": row.backup_used_mb or 0,
            "backup_ratio": float(row.backup_ratio) if row.backup_ratio else 0,
            "archive_usable": row.archive_usable,
            "shared": row.shared,
            "connected_hosts": row.connected_hosts,
            "storage_tag_id": row.storage_tag_id,
            "target": row.target,
            "read_byteps": float(row.read_byteps) if row.read_byteps else 0,
            "write_byteps": float(row.write_byteps) if row.write_byteps else 0,
            "max_read_byteps": float(row.max_read_byteps) if row.max_read_byteps else 0,
            "max_write_byteps": float(row.max_write_byteps) if row.max_write_byteps else 0,
            "is_active": row.is_active,
            "first_seen_at": row.first_seen_at.isoformat() if row.first_seen_at else None,
            "last_seen_at": row.last_seen_at.isoformat() if row.last_seen_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None
        })
    
    return {"data": datastores, "total": len(datastores)}


@router.post("/datastores/order")
async def save_datastore_order(
    order: List[str] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Save datastore display order for the current user"""
    if not order:
        return {"message": "No order provided"}
        
    try:
        from sqlalchemy import text
        
        # We'll use a transaction to update all preferences
        # Check if we should use upsert or delete-insert
        # Postgres ON CONFLICT is cleanest
        
        user_id = current_user['id']
        
        # Prepare values for bulk insert
        values = []
        for index, ds_id in enumerate(order):
            values.append({"user_id": user_id, "ds_id": ds_id, "order": index})
            
        # Execute raw SQL for upsert
        # text() with bind params is safer
        # But executemany might be tricky with raw SQL in some drivers, loop is safer for small lists
        
        for item in values:
            db.execute(text("""
                INSERT INTO webapp.user_datastore_prefs (user_id, datastore_id, display_order, updated_at)
                VALUES (:user_id, :ds_id, :order, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, datastore_id) 
                DO UPDATE SET display_order = :order, updated_at = CURRENT_TIMESTAMP
            """), item)
            
        db.commit()
        
        return {"message": "Order saved successfully", "count": len(order)}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving datastore order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/datastores/stats")
async def get_datastore_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get aggregated datastore statistics"""
    from sqlalchemy import text
    
    result = db.execute(text("""
        SELECT 
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE status IN ('normal', 'ok')) as online_count,
            COUNT(*) FILTER (WHERE status = 'offline') as offline_count,
            SUM(total_mb) as total_storage_mb,
            SUM(used_mb) as total_used_mb,
            COUNT(DISTINCT type) as type_count
        FROM sangfor.datastore_master
        WHERE is_active = TRUE
    """))
    
    row = result.fetchone()
    
    # Get breakdown by type
    type_result = db.execute(text("""
        SELECT 
            type,
            COUNT(*) as count,
            SUM(total_mb) as total_mb,
            SUM(used_mb) as used_mb
        FROM sangfor.datastore_master
        WHERE is_active = TRUE
        GROUP BY type
        ORDER BY SUM(total_mb) DESC
    """))
    
    by_type = []
    for tr in type_result.fetchall():
        by_type.append({
            "type": tr.type,
            "count": tr.count,
            "total_mb": tr.total_mb or 0,
            "used_mb": tr.used_mb or 0,
            "free_mb": (tr.total_mb or 0) - (tr.used_mb or 0)
        })
    
    total_mb = row.total_storage_mb or 0
    used_mb = row.total_used_mb or 0
    
    return {
        "data": {
            "total_count": row.total_count or 0,
            "online_count": row.online_count or 0,
            "offline_count": row.offline_count or 0,
            "total_storage_mb": total_mb,
            "total_used_mb": used_mb,
            "total_free_mb": total_mb - used_mb,
            "usage_ratio": round(used_mb / total_mb, 4) if total_mb > 0 else 0,
            "by_type": by_type
        }
    }


@router.get("/datastores/{datastore_id}")
async def get_datastore_detail(
    datastore_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get single datastore details"""
    from sqlalchemy import text
    
    result = db.execute(text("""
        SELECT 
            d.*, a.az_name
        FROM sangfor.datastore_master d
        LEFT JOIN sangfor.az_master a ON d.az_id = a.az_id
        WHERE d.datastore_id = :id
    """), {"id": datastore_id})
    
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Datastore not found")
    
    total_mb = row.total_mb or 0
    used_mb = row.used_mb or 0
    
    return {
        "data": {
            "datastore_id": row.datastore_id,
            "name": row.name,
            "description": row.description,
            "az_id": str(row.az_id) if row.az_id else None,
            "az_name": row.az_name,
            "type": row.type,
            "status": "normal" if row.status == "ok" else row.status,
            "total_mb": total_mb,
            "used_mb": used_mb,
            "free_mb": total_mb - used_mb,
            "ratio": float(row.ratio) if row.ratio else 0,
            "backup_enable": row.backup_enable,
            "backup_total_mb": row.backup_total_mb or 0,
            "backup_used_mb": row.backup_used_mb or 0,
            "backup_ratio": float(row.backup_ratio) if row.backup_ratio else 0,
            "archive_usable": row.archive_usable,
            "shared": row.shared,
            "connected_hosts": row.connected_hosts,
            "storage_tag_id": row.storage_tag_id,
            "target": row.target,
            "read_byteps": float(row.read_byteps) if row.read_byteps else 0,
            "write_byteps": float(row.write_byteps) if row.write_byteps else 0,
            "max_read_byteps": float(row.max_read_byteps) if row.max_read_byteps else 0,
            "max_write_byteps": float(row.max_write_byteps) if row.max_write_byteps else 0,
            "is_active": row.is_active,
            "first_seen_at": row.first_seen_at.isoformat() if row.first_seen_at else None,
            "last_seen_at": row.last_seen_at.isoformat() if row.last_seen_at else None
        }
    }


@router.get("/datastores/{datastore_id}/metrics")
async def get_datastore_metrics(
    datastore_id: str,
    time_range: str = "1d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get historical metrics for a datastore
    
    Time range options: 1h, 6h, 12h, 1d, 7d, 30d, custom
    """
    from sqlalchemy import text
    from datetime import datetime, timedelta
    
    end_time = datetime.utcnow()
    
    # Parse time range
    if time_range == "custom" and start_date and end_date:
        try:
            # Parse ISO format strings (handling various formats if needed)
            # Remove Z if present and treat as UTC
            s_date = start_date.replace("Z", "+00:00")
            e_date = end_date.replace("Z", "+00:00")
            start_time = datetime.fromisoformat(s_date)
            end_time = datetime.fromisoformat(e_date)
        except ValueError:
            # Fallback for JS ISO strings sometimes
            try:
                start_time = datetime.strptime(start_date.split('.')[0], "%Y-%m-%dT%H:%M:%S")
                end_time = datetime.strptime(end_date.split('.')[0], "%Y-%m-%dT%H:%M:%S")
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid date format")
            
        # Determine interval based on duration
        duration = end_time - start_time
        if duration < timedelta(hours=6):
            interval = "5 minutes"
        elif duration < timedelta(days=1):
            interval = "30 minutes"
        elif duration < timedelta(days=7):
            interval = "4 hours"
        else:
            interval = "1 day"
    else:
        range_map = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "12h": timedelta(hours=12),
            "1d": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
        }
        
        delta = range_map.get(time_range, timedelta(days=1))
        start_time = datetime.utcnow() - delta
        
        # Determine aggregation interval based on time range
        if time_range in ["1h", "6h"]:
            interval = "5 minutes"
        elif time_range in ["12h", "1d"]:
            interval = "30 minutes"
        elif time_range == "7d":
            interval = "4 hours"
        else:
            interval = "1 day"
    
    # Use formatted string for interval to avoid parameter binding issues with logic
    query = text(f"""
        SELECT 
            time_bucket('{interval}'::interval, collected_at) AS bucket,
            AVG(total_mb) as avg_total_mb,
            AVG(used_mb) as avg_used_mb,
            AVG(ratio) as avg_ratio,
            AVG(read_byteps) as avg_read_byteps,
            AVG(write_byteps) as avg_write_byteps,
            MAX(connected_hosts) as max_connected_hosts,
            COUNT(*) as sample_count
        FROM metrics.datastore_metrics
        WHERE datastore_id = :id
          AND collected_at >= :start_time
          AND collected_at <= :end_time
        GROUP BY bucket
        ORDER BY bucket ASC
    """)
    
    try:
        result = db.execute(query, {
            "id": datastore_id,
            "start_time": start_time,
            "end_time": end_time
        })
        
        metrics = []
        for row in result:
            total_mb = float(row.avg_total_mb) if row.avg_total_mb else 0
            used_mb = float(row.avg_used_mb) if row.avg_used_mb else 0
            metrics.append({
                "timestamp": row.bucket.isoformat() if row.bucket else None,
                "total_mb": round(total_mb, 2),
                "used_mb": round(used_mb, 2),
                "free_mb": round(total_mb - used_mb, 2),
                "ratio": round(float(row.avg_ratio), 4) if row.avg_ratio else 0,
                "read_byteps": round(float(row.avg_read_byteps), 2) if row.avg_read_byteps else 0,
                "write_byteps": round(float(row.avg_write_byteps), 2) if row.avg_write_byteps else 0,
                "connected_hosts": row.max_connected_hosts or 0,
                "sample_count": row.sample_count
            })
        
        return {
            "data": {
                "datastore_id": datastore_id,
                "time_range": time_range,
                "interval": interval,
                "metrics": metrics,
                "total_samples": len(metrics)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching datastore metrics: {e}")
        return {
            "data": {
                "datastore_id": datastore_id,
                "time_range": time_range,
                "interval": interval,
                "metrics": [],
                "error": str(e)
            }
        }

@router.get("/datastores/{datastore_id}/analytics")
async def get_datastore_analytics(
    datastore_id: str,
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed analytics for a datastore:
    - Growth Trend (Linear Regression)
    - Predictive Exhaustion (Days until full)
    - Volatility (Standard Deviation)
    """
    from sqlalchemy import text
    from datetime import datetime, timedelta
    import math

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    # 1. Fetch daily usage data
    query = text("""
        SELECT 
            time_bucket('1 day', collected_at) AS bucket,
            AVG(total_mb) as avg_total_mb,
            AVG(used_mb) as avg_used_mb
        FROM metrics.datastore_metrics
        WHERE datastore_id = :id
          AND collected_at >= :start_time
          AND collected_at <= :end_time
        GROUP BY bucket
        ORDER BY bucket ASC
    """)

    result = db.execute(query, {
        "id": datastore_id,
        "start_time": start_time,
        "end_time": end_time
    }).fetchall()

    if not result or len(result) < 2:
        return {
            "data": {
                "datastore_id": datastore_id,
                "period_days": days,
                "current_usage": {
                    "total_mb": 0,
                    "used_mb": 0,
                    "free_mb": 0,
                    "percent": 0
                },
                "growth_trend": {
                    "rate_mb_per_day": 0,
                    "direction": "stable",
                    "r_squared": 0
                },
                "prediction": {
                    "days_until_full": None,
                    "estimated_full_date": None
                },
                "volatility": {
                    "score": 0,
                    "anomalies": []
                },
                "points": [],
                "insufficient_data": True,
                "message": "Need at least 2 days of data for analytics"
            }
        }

    # Prepare data for calculations
    data_points = []
    total_capacity_mb = 0
    current_used_mb = 0
    
    # Calculate daily changes
    daily_changes = []
    previous_used = None

    for i, row in enumerate(result):
        used = float(row.avg_used_mb) if row.avg_used_mb else 0
        total = float(row.avg_total_mb) if row.avg_total_mb else 0
        
        # Keep latest capacity
        if i == len(result) - 1:
            total_capacity_mb = total
            current_used_mb = used

        # For regression: x = day index, y = used_mb
        data_points.append((i, used))
        
        # Daily change
        if previous_used is not None:
            change = used - previous_used
            daily_changes.append(change)
        previous_used = used

    # 2. Linear Regression (Least Squares)
    # y = mx + c
    n = len(data_points)
    sum_x = sum(p[0] for p in data_points)
    sum_y = sum(p[1] for p in data_points)
    sum_xy = sum(p[0] * p[1] for p in data_points)
    sum_xx = sum(p[0] * p[0] for p in data_points)

    if (n * sum_xx - sum_x * sum_x) != 0:
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
    else:
        slope = 0
        intercept = sum_y / n

    growth_rate_mb_per_day = slope

    # 3. Predictive Exhaustion
    days_until_full = None
    predicted_full_date = None
    
    if growth_rate_mb_per_day > 0:
        remaining_mb = total_capacity_mb - current_used_mb
        days_until_full = remaining_mb / growth_rate_mb_per_day
        if days_until_full < 3650:  # Cap at 10 years
            predicted_full_date = (end_time + timedelta(days=days_until_full)).isoformat()

    # 4. Volatility (Standard Deviation of Daily Changes)
    volatility_score = 0
    anomaly_days = []
    
    if daily_changes:
        mean_change = sum(daily_changes) / len(daily_changes)
        variance = sum((x - mean_change) ** 2 for x in daily_changes) / len(daily_changes)
        std_dev = math.sqrt(variance)
        volatility_score = std_dev

        # Find anomalies (change > 2 * std_dev)
        # We match changes back to dates (daily_changes index i corresponds to result index i+1)
        limit = 2 * std_dev if std_dev > 0 else 0
        if limit > 0:
            for i, change in enumerate(daily_changes):
                if abs(change - mean_change) > limit:
                    date_idx = i + 1
                    if date_idx < len(result):
                         anomaly_days.append({
                             "date": result[date_idx].bucket.isoformat(),
                             "change_mb": change,
                             "deviation": round(abs(change - mean_change) / std_dev, 1)
                         })

    return {
        "data": {
            "datastore_id": datastore_id,
            "period_days": days,
            "current_usage": {
                "total_mb": total_capacity_mb,
                "used_mb": current_used_mb,
                "free_mb": total_capacity_mb - current_used_mb,
                "percent": round((current_used_mb / total_capacity_mb * 100), 2) if total_capacity_mb > 0 else 0
            },
            "growth_trend": {
                "rate_mb_per_day": round(growth_rate_mb_per_day, 2),
                "direction": "increasing" if slope > 1 else ("decreasing" if slope < -1 else "stable"),
                "r_squared": 0 # Not calculating R^2 for simplicity
            },
            "prediction": {
                "days_until_full": round(days_until_full, 1) if days_until_full else None,
                "estimated_full_date": predicted_full_date
            },
            "volatility": {
                "score": round(volatility_score, 2), # StdDev of daily changes
                "anomalies": anomaly_days
            },
            "points": [
                {
                    "date": result[i].bucket.isoformat(),
                    "actual_used_mb": round(p[1], 2),
                    "trend_used_mb": round(slope * p[0] + intercept, 2)
                }
                for i, p in enumerate(data_points)
            ]
        }
    }

@router.get("/datastores/{datastore_id}/ai-prediction")
async def get_datastore_ai_prediction(
    datastore_id: str,
    historical_days: int = Query(90, ge=7, le=180, description="Days of historical data"),
    forecast_days: int = Query(90, ge=30, le=180, description="Days to forecast"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get AI-powered capacity prediction for a datastore using Prophet model.
    
    Returns:
    - Forecast with confidence intervals
    - Predicted full date (when capacity will be exhausted)
    - Risk analysis
    - Weekly seasonality patterns
    - Anomaly detection
    """
    from ..services.ai_prediction_service import get_ai_prediction
    
    result = get_ai_prediction(db, datastore_id, historical_days, forecast_days)
    return {"data": result}


# ============================================================
# Data Store Dashboard Settings & Data
# ============================================================

@router.get("/dashboard/datastore-settings")
async def get_datastore_dashboard_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get Data Store Dashboard settings (selected datastores)"""
    from sqlalchemy import text
    
    result = db.execute(text("""
        SELECT value 
        FROM sangfor.system_settings 
        WHERE key = 'datastore_dashboard_ids'
    """))
    
    row = result.fetchone()
    if row and row.value:
        # Parse JSON array of IDs
        import json
        try:
            selected_ids = json.loads(row.value)
        except:
            selected_ids = []
    else:
        selected_ids = []
    
    return {"data": {"selected_datastore_ids": selected_ids}}


@router.put("/dashboard/datastore-settings")
async def update_datastore_dashboard_settings(
    settings: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update Data Store Dashboard settings"""
    import json
    from sqlalchemy import text
    
    selected_ids = settings.get("selected_datastore_ids", [])
    
    # Upsert settings
    db.execute(text("""
        INSERT INTO sangfor.system_settings (key, value, updated_at, updated_by)
        VALUES ('datastore_dashboard_ids', :value, CURRENT_TIMESTAMP, :user)
        ON CONFLICT (key) 
        DO UPDATE SET value = :value, updated_at = CURRENT_TIMESTAMP, updated_by = :user
    """), {"value": json.dumps(selected_ids), "user": current_user.get("username", "admin")})
    
    db.commit()
    
    return {
        "message": "บันทึกการตั้งค่าเรียบร้อย",
        "data": {"selected_datastore_ids": selected_ids}
    }


@router.get("/dashboard/datastore-data")
async def get_datastore_dashboard_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get Data Store Dashboard data with comparison metrics
    - Current usage
    - Change from yesterday
    - Change from 7 days ago
    """
    from sqlalchemy import text
    
    # Get selected datastore IDs
    result = db.execute(text("""
        SELECT value 
        FROM sangfor.system_settings 
        WHERE key = 'datastore_dashboard_ids'
    """))
    
    row = result.fetchone()
    if row and row.value:
        import json
        try:
            selected_ids = json.loads(row.value)
        except:
            selected_ids = []
    else:
        # If no settings, return all datastores
        ds_result = db.execute(text("""
            SELECT datastore_id FROM sangfor.datastore_master 
            WHERE is_active = TRUE
            ORDER BY name
        """))
        selected_ids = [r[0] for r in ds_result.fetchall()]
    
    if not selected_ids:
        return {"data": []}
    
    # Build query with placeholders
    placeholders = ','.join([f":id{i}" for i in range(len(selected_ids))])
    params = {f"id{i}": ds_id for i, ds_id in enumerate(selected_ids)}
    
    # Get current data
    current_query = f"""
        SELECT 
            d.datastore_id,
            d.name,
            d.az_id,
            a.az_name,
            d.type,
            d.status,
            d.total_mb,
            d.used_mb,
            d.ratio,
            d.updated_at
        FROM sangfor.datastore_master d
        LEFT JOIN sangfor.az_master a ON d.az_id = a.az_id
        LEFT JOIN webapp.user_datastore_prefs udp ON d.datastore_id = udp.datastore_id AND udp.user_id = :user_id
        WHERE d.datastore_id IN ({placeholders})
        AND d.is_active = TRUE
        ORDER BY COALESCE(udp.display_order, 999999) ASC, d.name ASC
    """
    
    # Add user_id to params
    params["user_id"] = current_user['id']
    
    current_result = db.execute(text(current_query), params)
    
    dashboard_data = []
    
    for row in current_result.fetchall():
        datastore_id = row.datastore_id
        total_mb = float(row.total_mb or 0)
        current_used_mb = float(row.used_mb or 0)
        current_free_mb = total_mb - current_used_mb
        current_ratio = float(row.ratio or 0)
        
        # Get yesterday's data
        yesterday_query = text("""
            SELECT AVG(used_mb) as used_mb
            FROM metrics.datastore_metrics
            WHERE datastore_id = :ds_id
            AND collected_at >= NOW() - INTERVAL '2 days'
            AND collected_at < NOW() - INTERVAL '1 day'
        """)
        
        yesterday_result = db.execute(yesterday_query, {"ds_id": datastore_id})
        yesterday_row = yesterday_result.fetchone()
        yesterday_used_mb = float(yesterday_row.used_mb) if yesterday_row and yesterday_row.used_mb else None
        
        # Get 7 days ago data
        week_ago_query = text("""
            SELECT AVG(used_mb) as used_mb
            FROM metrics.datastore_metrics
            WHERE datastore_id = :ds_id
            AND collected_at >= NOW() - INTERVAL '8 days'
            AND collected_at < NOW() - INTERVAL '7 days'
        """)
        
        week_ago_result = db.execute(week_ago_query, {"ds_id": datastore_id})
        week_ago_row = week_ago_result.fetchone()
        week_ago_used_mb = float(week_ago_row.used_mb) if week_ago_row and week_ago_row.used_mb else None
        
        # Calculate changes
        change_yesterday_mb = None
        change_yesterday_percent = None
        if yesterday_used_mb is not None:
            change_yesterday_mb = current_used_mb - yesterday_used_mb
            if yesterday_used_mb > 0:
                change_yesterday_percent = (change_yesterday_mb / yesterday_used_mb) * 100
        
        change_week_mb = None
        change_week_percent = None
        if week_ago_used_mb is not None:
            change_week_mb = current_used_mb - week_ago_used_mb
            if week_ago_used_mb > 0:
                change_week_percent = (change_week_mb / week_ago_used_mb) * 100
        
        dashboard_data.append({
            "datastore_id": datastore_id,
            "name": row.name,
            "az_id": str(row.az_id) if row.az_id else None,
            "az_name": row.az_name,
            "type": row.type,
            "status": row.status,
            "total_mb": total_mb,
            "used_mb": current_used_mb,
            "free_mb": current_free_mb,
            "usage_percent": round(current_ratio * 100, 2),
            "change_yesterday_mb": round(change_yesterday_mb, 2) if change_yesterday_mb is not None else None,
            "change_yesterday_percent": round(change_yesterday_percent, 2) if change_yesterday_percent is not None else None,
            "change_week_mb": round(change_week_mb, 2) if change_week_mb is not None else None,
            "change_week_percent": round(change_week_percent, 2) if change_week_percent is not None else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None
        })
    
    return {"data": dashboard_data}
