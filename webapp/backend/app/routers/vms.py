"""
VMs Router - API endpoints for VM data
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime, timedelta
import requests
import urllib3

from ..database import get_db
from ..schemas import VMListItem, VMDetail, VMMetrics, VMDisk, VMNetwork, VMListResponse
from ..utils.auth import get_current_user
from ..services.sync_v2 import get_sync_service
from ..services.sync_v2.sangfor_client import SangforClient, SangforCredentials
from ..services.sync_v2.db_handler import SyncDbHandler
from ..config import get_settings

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

router = APIRouter(prefix="/vms", tags=["VMs"])


@router.get("", response_model=VMListResponse)
async def get_vms(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),  # ลด max จาก 1000 เป็น 200 เพื่อป้องกัน DoS
    search: Optional[str] = None,
    status: Optional[str] = None,
    group_id: Optional[str] = None,
    host_id: Optional[str] = None,
    az_name: Optional[str] = None,
    storage_min: Optional[float] = None,
    show_deleted: bool = False,
    sort_by: str = "power_state",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get paginated list of VMs with filtering and sorting."""
    
    # Build query
    conditions = ["1=1"]
    params = {}
    
    if search:
        conditions.append("(v.name ILIKE :search OR CAST(v.vm_uuid AS text) ILIKE :search OR CAST(v.ip_address AS text) ILIKE :search)")
        params["search"] = f"%{search}%"
    
    if status and status.lower() == 'deleted':
        conditions.append("v.is_deleted = true")
    else:
        if status:
            conditions.append("v.power_state = :status")
            params["status"] = status
    
        if not show_deleted:
            conditions.append("v.is_deleted = false")
    

    if group_id:
        conditions.append("CAST(v.group_id AS text) = :group_id")
        params["group_id"] = group_id
    
    if host_id:
        conditions.append("v.host_id = :host_id")
        params["host_id"] = host_id

    if az_name:
        conditions.append("v.az_name = :az_name")
        params["az_name"] = az_name

    # storage_min passed in as 0..100 (percent) or 0..1 (fraction). Normalize to fraction for DB comparison
    if storage_min is not None:
        sm = storage_min if storage_min <= 1 else (storage_min / 100.0)
        conditions.append("v.storage_usage >= :storage_min")
        params["storage_min"] = sm
    
    where_clause = " AND ".join(conditions)
    
    # Allowed sort columns
    sort_columns = {
        "name": "v.name",
        "power_state": "v.power_state",
        "status": "v.power_state",
        "cpu_usage": "v.cpu_usage",
        "memory_usage": "v.memory_usage",
        "group_name": "v.group_name",
        "host_name": "v.host_name",
        "ip_address": "v.ip_address",
        "last_metrics_at": "v.last_metrics_at"
    }
    order_col = sort_columns.get(sort_by, "v.name")
    order_dir = "DESC" if sort_order.lower() == "desc" else "ASC"
    
    # Count total
    count_query = f"""
        SELECT COUNT(*) as total
        FROM analytics.mv_vm_overview v
        WHERE {where_clause}
    """
    total = db.execute(text(count_query), params).scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset
    
    data_query = f"""
        SELECT 
            CAST(v.vm_uuid AS text) as vm_uuid, v.vm_id, v.name, 
            v.group_name, v.group_name_path, v.host_name, v.az_name,
            v.power_state, v.status, v.cpu_cores, v.memory_total_mb, v.storage_total_mb,
            v.cpu_usage, v.memory_usage, v.storage_usage, v.storage_used_mb,
            v.os_type, v.os_name, v.os_display_name, v.os_kernel, v.os_arch,
            v.protection_enabled, v.in_protection, v.protection_name, v.backup_file_count,
            v.last_metrics_at,
            CAST(v.ip_address AS text) as ip_address, v.mac_address, 
            v.storage_name, v.project_name, v.is_deleted
        FROM analytics.mv_vm_overview v
        WHERE {where_clause}
        ORDER BY {order_col} {order_dir}
        LIMIT :limit OFFSET :offset
    """
    
    result = db.execute(text(data_query), params)
    items = [dict(row._mapping) for row in result.fetchall()]
    
    pages = (total + page_size - 1) // page_size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }




# ============================================================
# Recycle Bin Management (must be before /{vm_uuid} wildcards)
# ============================================================

@router.get("/deleted-vms")
async def get_deleted_vms(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: str = "deleted_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of VMs in recycle bin (marked as deleted from SCP).
    These are VMs that were previously synced but no longer exist in Sangfor SCP.
    """
    
    # Build query
    conditions = ["is_deleted = TRUE"]
    params = {}
    
    if search:
        conditions.append("(name ILIKE :search OR CAST(vm_uuid AS text) ILIKE :search)")
        params["search"] = f"%{search}%"
    
    where_clause = " AND ".join(conditions)
    
    # Allowed sort columns
    sort_columns = {
        "name": "name",
        "deleted_at": "deleted_at",
        "last_seen_at": "last_seen_at",
        "group_name": "group_name",
        "host_name": "host_name"
    }
    order_col = sort_columns.get(sort_by, "deleted_at")
    order_dir = "DESC" if sort_order.lower() == "desc" else "ASC"
    
    # Count total
    count_query = f"""
        SELECT COUNT(*) as total
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
        WHERE {where_clause}
    """
    total = db.execute(text(count_query), params).scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset
    
    data_query = f"""
        SELECT 
            CAST(vm.vm_uuid AS text) as vm_uuid,
            vm.vm_id,
            vm.name,
            g.group_name,
            g.group_name_path,
            h.host_name,
            vm.cpu_cores,
            vm.memory_total_mb,
            vm.storage_total_mb,
            vm.os_display_name,
            vm.project_name,
            vm.first_seen_at,
            vm.last_seen_at,
            vm.deleted_at,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - vm.deleted_at))::INTEGER as seconds_since_deletion
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
        WHERE {where_clause}
        ORDER BY {order_col} {order_dir}
        LIMIT :limit OFFSET :offset
    """
    
    result = db.execute(text(data_query), params)
    items = [dict(row._mapping) for row in result.fetchall()]
    
    pages = (total + page_size - 1) // page_size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }


@router.post("/{vm_uuid}/restore")
async def restore_vm_from_recycle_bin(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Restore a VM from recycle bin (unmark as deleted).
    This should only be used if the VM was mistakenly marked as deleted
    or has been manually recreated in SCP with the same UUID.
    """
    
    # Check if VM exists and is deleted
    check_query = text("""
        SELECT vm_uuid, name, is_deleted FROM sangfor.vm_master 
        WHERE vm_uuid = CAST(:uuid AS uuid)
    """)
    
    result = db.execute(check_query, {"uuid": vm_uuid})
    vm = result.fetchone()
    
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    
    if not vm.is_deleted:
        raise HTTPException(status_code=400, detail="VM is not in recycle bin")
    
    # Restore VM
    restore_query = text("""
        UPDATE sangfor.vm_master 
        SET is_deleted = FALSE, 
            deleted_at = NULL,
            last_seen_at = CURRENT_TIMESTAMP
        WHERE vm_uuid = CAST(:uuid AS uuid)
    """)
    
    db.execute(restore_query, {"uuid": vm_uuid})
    db.commit()
    
    return {
        "success": True,
        "message": f"VM '{vm.name}' has been restored from recycle bin",
        "vm_uuid": vm_uuid
    }


@router.delete("/{vm_uuid}/permanent")
async def permanently_delete_vm(
    vm_uuid: str,
    confirm: bool = Query(False, description="Must be true to confirm permanent deletion"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Permanently delete a VM from the database.
    This action cannot be undone!
    
    Requirements:
    - VM must be in recycle bin (is_deleted = TRUE)
    - confirm parameter must be true
    - User must have admin permissions
    
    This will delete:
    - VM master record
    - All VM metrics (cascaded)
    - All VM disk configs (cascaded)
    - All VM network interfaces (cascaded)
    - All VM alarms (cascaded)
    """
    
    # Check user permissions
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Only administrators can permanently delete VMs"
        )
    
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must set confirm=true to permanently delete VM"
        )
    
    # Check if VM exists and is deleted
    check_query = text("""
        SELECT vm_uuid, name, is_deleted, deleted_at FROM sangfor.vm_master 
        WHERE vm_uuid = CAST(:uuid AS uuid)
    """)
    
    result = db.execute(check_query, {"uuid": vm_uuid})
    vm = result.fetchone()
    
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    
    if not vm.is_deleted:
        raise HTTPException(
            status_code=400, 
            detail="VM must be in recycle bin before permanent deletion. Delete it from SCP first."
        )
    
    # Delete VM (cascading deletes will handle related records)
    delete_query = text("""
        DELETE FROM sangfor.vm_master 
        WHERE vm_uuid = CAST(:uuid AS uuid)
    """)
    
    db.execute(delete_query, {"uuid": vm_uuid})
    db.commit()
    
    return {
        "success": True,
        "message": f"VM '{vm.name}' has been permanently deleted from database",
        "vm_uuid": vm_uuid,
        "deleted_at": vm.deleted_at.isoformat() if vm.deleted_at else None
    }


# ============================================================
# VM Detail and Metrics (wildcard routes)
# ============================================================

@router.get("/{vm_uuid}", response_model=VMDetail)
async def get_vm_detail(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information about a specific VM."""
    query = """
        SELECT 
            CAST(v.vm_uuid AS text) as vm_uuid, v.vm_id, v.name, 
            v.group_name, v.group_name_path, v.host_name, v.az_name, 
            v.os_type, v.os_name, v.os_display_name, v.os_kernel, v.os_distribution, v.os_arch,
            v.power_state, v.status, v.uptime_seconds,
            v.cpu_cores, v.cpu_sockets, v.cpu_cores_per_socket, v.cpu_total_mhz,
            v.memory_total_mb, v.storage_total_mb, v.storage_id, v.storage_name,
            v.cpu_usage, v.cpu_used_mhz, v.memory_usage, v.memory_used_mb,
            v.storage_usage, v.storage_used_mb,
            v.network_read_bitps, v.network_write_bitps,
            v.network_read_mbps, v.network_write_mbps,
            v.disk_read_iops, v.disk_write_iops,
            v.disk_read_byteps, v.disk_write_byteps,
            CAST(v.ip_address AS text) as ip_address, v.mac_address, v.primary_network_name,
            v.project_id, v.project_name, v.user_name,
            v.protection_enabled, v.in_protection, v.protection_name, v.protection_id, v.protection_type,
            v.backup_file_count, v.backup_policy_enable,
            v.storage_file_size_mb,
            v.expire_time,
            v.description, v.tags,
            v.first_seen_at, v.last_seen_at, v.last_metrics_at, v.config_updated_at
        FROM analytics.v_vm_overview v
        WHERE v.vm_uuid = CAST(:vm_uuid AS uuid)
    """
    result = db.execute(text(query), {"vm_uuid": vm_uuid})
    vm = result.fetchone()
    
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    
    return dict(vm._mapping)


@router.get("/{vm_uuid}/metrics", response_model=List[VMMetrics])
async def get_vm_metrics(
    vm_uuid: str,
    hours: int = Query(24, ge=1, le=168),
    interval: str = Query("1h", regex="^(5m|15m|1h|6h|1d)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get historical metrics for a VM."""
    
    # Calculate time bucket based on interval
    interval_map = {
        "5m": "5 minutes",
        "15m": "15 minutes",
        "1h": "1 hour",
        "6h": "6 hours",
        "1d": "1 day"
    }
    time_bucket = interval_map.get(interval, "1 hour")
    
    query = f"""
        SELECT 
            date_trunc('{time_bucket.split()[1]}', collected_at) as collected_at,
            AVG(cpu_ratio) as cpu_ratio,
            AVG(cpu_used_mhz) as cpu_used_mhz,
            AVG(memory_ratio) as memory_ratio,
            AVG(memory_used_mb) as memory_used_mb,
            AVG(storage_ratio) as storage_ratio,
            AVG(storage_used_mb) as storage_used_mb,
            AVG(network_read_bitps) as network_read_bitps,
            AVG(network_write_bitps) as network_write_bitps,
            AVG(disk_read_iops) as disk_read_iops,
            AVG(disk_write_iops) as disk_write_iops,
            MAX(power_state) as power_state,
            MAX(status) as status
        FROM metrics.vm_metrics
        WHERE vm_uuid = CAST(:vm_uuid AS uuid)
          AND collected_at >= NOW() - INTERVAL '{hours} hours'
        GROUP BY date_trunc('{time_bucket.split()[1]}', collected_at)
        ORDER BY collected_at ASC
    """
    
    result = db.execute(text(query), {"vm_uuid": vm_uuid})
    metrics = [dict(row._mapping) for row in result.fetchall()]
    
    return metrics


@router.get("/{vm_uuid}/disks", response_model=List[VMDisk])
async def get_vm_disks(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get disk configuration for a VM."""
    query = """
        SELECT disk_id, storage_id, storage_name, storage_file, size_mb, preallocate, eagerly_scrub
        FROM sangfor.vm_disk_config
        WHERE vm_uuid = CAST(:vm_uuid AS uuid) AND is_active = TRUE
        ORDER BY disk_id
    """
    result = db.execute(text(query), {"vm_uuid": vm_uuid})
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/{vm_uuid}/networks", response_model=List[VMNetwork])
async def get_vm_networks(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get network configuration for a VM."""
    query = """
        SELECT 
            vif_id, network_name, ip_address, mac_address, model, connected as is_connected,
            ipv6_address, subnet_id, subnet_name, cidr, gateway, custom_gateway,
            vpc_id, vpc_name, device_id
        FROM sangfor.vm_network_interfaces
        WHERE vm_uuid = CAST(:vm_uuid AS uuid) AND is_active = TRUE
        ORDER BY vif_id
    """
    result = db.execute(text(query), {"vm_uuid": vm_uuid})
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/{vm_uuid}/alarms")
async def get_vm_alarms(
    vm_uuid: str,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get alarms for a VM from the synced alarm history.
    Includes both VM-specific alarms and alarms from the host where the VM resides.
    """
    # Build query
    conditions = ["(a.vm_uuid = CAST(:vm_uuid AS uuid) OR (a.source = 'host' AND a.resource_id = v.host_id))"]
    params = {"vm_uuid": vm_uuid, "limit": limit}
    
    if status:
        conditions.append("a.status = :status")
        params["status"] = status
        
    where_clause = " AND ".join(conditions)
    
    query = f"""
        SELECT 
            a.alarm_id, CAST(a.vm_uuid AS text) as vm_uuid,
            a.source, a.severity, a.title, a.description,
            a.status, a.object_type, a.resource_id, a.resource_name,
            a.begin_time, a.end_time, a.created_at, a.updated_at
        FROM sangfor.v_unified_alarms a
        JOIN sangfor.vm_master v ON v.vm_uuid = CAST(:vm_uuid AS uuid)
        WHERE {where_clause}
        ORDER BY 
            CASE WHEN a.status = 'open' THEN 1 ELSE 2 END,
            a.begin_time DESC
        LIMIT :limit
    """
    
    result = db.execute(text(query), params)
    alarms = [dict(row._mapping) for row in result.fetchall()]
    
    return alarms


# ============================================================
# Real-time Endpoints (Hybrid - จาก Sangfor API โดยตรง)
# ============================================================

@router.get("/{vm_uuid}/realtime")
async def get_vm_realtime(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    ดึงข้อมูล VM แบบ real-time จาก Sangfor API โดยตรง
    
    - ใช้สำหรับดูข้อมูลล่าสุดของ VM เฉพาะตัว
    - ช้ากว่าการดึงจาก database แต่ได้ข้อมูลที่สดที่สุด
    """
    try:
        # Get sync service v2 and settings
        sync_v2 = get_sync_service()
        settings = get_settings()
        
        # Get credentials from new sync config
        handler = SyncDbHandler(db)
        config = sync_v2.get_config()
        password = handler.get_password() or settings.SCP_PASSWORD
        
        if not config.get('scp_ip') or not config.get('scp_username') or not password:
            raise HTTPException(status_code=503, detail="ยังไม่ได้ตั้งค่าการเชื่อมต่อ Sangfor SCP ในหน้า Sync Setting")
        
        # Initialize Sangfor Client
        credentials = SangforCredentials(
            ip=config.get('scp_ip'),
            username=config.get('scp_username'),
            password=password
        )
        client = SangforClient(credentials)
        token = client.authenticate()
        
        # Get VM detail from Sangfor
        endpoints = [
            f"/janus/20190725/servers/{vm_uuid}",
            f"/janus/20180725/servers/{vm_uuid}"
        ]
        
        headers = {
            "Authorization": f"Token {token}",
            "Accept": "application/json"
        }
        
        vm_data = None
        for endpoint in endpoints:
            try:
                url = f"{credentials.base_url}{endpoint}"
                response = requests.get(url, headers=headers, verify=False, timeout=15)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("code") == 0 and "data" in result:
                        vm_data = result["data"]
                        break
            except Exception:
                continue
        
        if not vm_data:
            # Fallback to database when Sangfor API is unavailable
            db_result = await get_vm_latest_from_db(vm_uuid, db)
            return {**db_result, "source": "database_cache", "note": "Sangfor API unavailable, showing cached data"}
        
        # Parse VM data
        metrics = vm_data.get("metrics", {})
        
        return {
            "source": "sangfor_api",
            "collected_at": datetime.now().isoformat(),
            "vm_uuid": vm_uuid,
            "vm_name": vm_data.get("name"),
            "power_state": vm_data.get("powerState"),
            "status": vm_data.get("status"),
            "uptime_seconds": vm_data.get("uptime"),
            "cpu": {
                "cores": vm_data.get("cpuSpec", {}).get("cpuCores"),
                "total_mhz": metrics.get("cpuTotalMHZ"),
                "used_mhz": metrics.get("cpuUsedMHZ"),
                "percent": round((metrics.get("cpuUsedMHZ", 0) / max(metrics.get("cpuTotalMHZ", 1), 1)) * 100, 2) if metrics.get("cpuTotalMHZ") else 0
            },
            "memory": {
                "total_mb": metrics.get("memoryTotalMB"),
                "used_mb": metrics.get("memoryUsedMB"),
                "percent": round((metrics.get("memoryUsedMB", 0) / max(metrics.get("memoryTotalMB", 1), 1)) * 100, 2) if metrics.get("memoryTotalMB") else 0
            },
            "storage": {
                "total_mb": metrics.get("storageTotalMB"),
                "used_mb": metrics.get("storageUsedMB"),
                "percent": round((metrics.get("storageUsedMB", 0) / max(metrics.get("storageTotalMB", 1), 1)) * 100, 2) if metrics.get("storageTotalMB") else 0
            },
            "network": {
                "read_bps": metrics.get("networkReadBitps", 0),
                "write_bps": metrics.get("networkWriteBitps", 0)
            },
            "disk_io": {
                "read_byteps": metrics.get("diskReadByteps", 0),
                "write_byteps": metrics.get("diskWriteByteps", 0),
                "read_iops": metrics.get("diskReadIOPS", 0),
                "write_iops": metrics.get("diskWriteIOPS", 0)
            },
            "host": {
                "id": vm_data.get("hostId"),
                "name": vm_data.get("hostName")
            },
            "os": {
                "type": vm_data.get("osType"),
                "kernel": vm_data.get("osKernel"),
                "distribution": vm_data.get("osDistribution")
            },
            "alarms": vm_data.get("alarms", []),
            "warnings": vm_data.get("warnings", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to database on error
        try:
            db_result = await get_vm_latest_from_db(vm_uuid, db)
            return {**db_result, "source": "database_cache", "note": f"Sangfor API error: {str(e)[:50]}"}
        except:
            raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูล real-time: {str(e)}")


async def get_vm_latest_from_db(vm_uuid: str, db: Session):
    """ดึงข้อมูล VM ล่าสุดจาก database (fallback)"""
    query = text("""
        SELECT 
            m.collected_at,
            m.power_state,
            m.status,
            m.uptime_seconds,
            m.cpu_ratio,
            m.cpu_total_mhz,
            m.cpu_used_mhz,
            m.memory_ratio,
            m.memory_total_mb,
            m.memory_used_mb,
            m.storage_ratio,
            m.storage_total_mb,
            m.storage_used_mb,
            m.network_read_bitps,
            m.network_write_bitps,
            m.disk_read_iops,
            m.disk_write_iops,
            m.host_name,
            v.name as vm_name
        FROM metrics.vm_metrics m
        LEFT JOIN sangfor.vm_master v ON m.vm_uuid = v.vm_uuid
        WHERE m.vm_uuid = CAST(:vm_uuid AS uuid)
        ORDER BY m.collected_at DESC
        LIMIT 1
    """)
    
    result = db.execute(query, {"vm_uuid": vm_uuid})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูล VM นี้")
    
    return {
        "source": "database_cache",
        "collected_at": row.collected_at.isoformat() if row.collected_at else None,
        "vm_uuid": vm_uuid,
        "vm_name": row.vm_name,
        "power_state": row.power_state,
        "status": row.status,
        "uptime_seconds": row.uptime_seconds,
        "cpu": {
            "total_mhz": float(row.cpu_total_mhz) if row.cpu_total_mhz else 0,
            "used_mhz": float(row.cpu_used_mhz) if row.cpu_used_mhz else 0,
            "percent": round(float(row.cpu_ratio or 0) * 100, 2)
        },
        "memory": {
            "total_mb": float(row.memory_total_mb) if row.memory_total_mb else 0,
            "used_mb": float(row.memory_used_mb) if row.memory_used_mb else 0,
            "percent": round(float(row.memory_ratio or 0) * 100, 2)
        },
        "storage": {
            "total_mb": float(row.storage_total_mb) if row.storage_total_mb else 0,
            "used_mb": float(row.storage_used_mb) if row.storage_used_mb else 0,
            "percent": round(float(row.storage_ratio or 0) * 100, 2)
        },
        "network": {
            "read_bps": float(row.network_read_bitps) if row.network_read_bitps else 0,
            "write_bps": float(row.network_write_bitps) if row.network_write_bitps else 0
        },
        "disk_io": {
            "read_iops": float(row.disk_read_iops) if row.disk_read_iops else 0,
            "write_iops": float(row.disk_write_iops) if row.disk_write_iops else 0
        },
        "host": {
            "name": row.host_name
        }
    }


@router.get("/{vm_uuid}/compare")
async def compare_realtime_vs_cached(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    เปรียบเทียบข้อมูล real-time กับ cached data
    
    - แสดงความแตกต่างระหว่างข้อมูลสดกับข้อมูลที่ sync ไว้
    - ใช้สำหรับ debug และตรวจสอบความถูกต้อง
    """
    try:
        realtime = await get_vm_realtime(vm_uuid, db, current_user)
        cached = await get_vm_latest_from_db(vm_uuid, db)
        
        # Calculate time difference
        rt_time = datetime.fromisoformat(realtime["collected_at"].replace("Z", "+00:00")) if realtime.get("collected_at") else None
        cache_time = datetime.fromisoformat(cached["collected_at"].replace("Z", "+00:00")) if cached.get("collected_at") else None
        
        time_diff = None
        if rt_time and cache_time:
            time_diff = (rt_time - cache_time).total_seconds()
        
        return {
            "vm_uuid": vm_uuid,
            "realtime": realtime,
            "cached": cached,
            "comparison": {
                "time_difference_seconds": time_diff,
                "cpu_diff": realtime.get("cpu", {}).get("percent", 0) - cached.get("cpu", {}).get("percent", 0),
                "memory_diff": realtime.get("memory", {}).get("percent", 0) - cached.get("memory", {}).get("percent", 0),
                "storage_diff": realtime.get("storage", {}).get("percent", 0) - cached.get("storage", {}).get("percent", 0)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถเปรียบเทียบข้อมูล: {str(e)}")


@router.get("/{vm_uuid}/raw")
async def get_vm_raw(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    ดึงข้อมูล Raw JSON ของ VM จาก Sangfor API โดยตรง
    
    - ใช้สำหรับ Debug หรือตรวจสอบข้อมูลดิบ
    """
    try:
        # Get sync service v2 and settings
        sync_v2 = get_sync_service()
        settings = get_settings()
        
        # Get credentials from new sync config
        handler = SyncDbHandler(db)
        config = sync_v2.get_config()
        password = handler.get_password() or settings.SCP_PASSWORD
        
        if not config.get('scp_ip') or not config.get('scp_username') or not password:
            raise HTTPException(status_code=503, detail="ยังไม่ได้ตั้งค่าการเชื่อมต่อ Sangfor SCP ในหน้า Sync Setting")
        
        # Initialize Sangfor Client
        credentials = SangforCredentials(
            ip=config.get('scp_ip'),
            username=config.get('scp_username'),
            password=password
        )
        client = SangforClient(credentials)
        token = client.authenticate()
        
        # 1. Get VM detail from Sangfor API
        endpoints = [
            f"/janus/20190725/servers/{vm_uuid}",
            f"/janus/20180725/servers/{vm_uuid}"
        ]
        
        headers = {
            "Authorization": f"Token {token}",
            "Accept": "application/json"
        }
        
        api_raw = None
        used_endpoint = None
        
        for endpoint in endpoints:
            try:
                url = f"{credentials.base_url}{endpoint}"
                response = requests.get(url, headers=headers, verify=False, timeout=15)
                
                if response.status_code == 200:
                    api_raw = response.json()
                    used_endpoint = endpoint
                    break
            except Exception:
                continue
        
        # 2. Get Data from Database
        db_data = {}
        try:
            # VM Master record
            master_query = text("SELECT * FROM sangfor.vm_master WHERE vm_uuid = CAST(:uuid AS uuid)")
            master_row = db.execute(master_query, {"uuid": vm_uuid}).fetchone()
            db_data["master"] = dict(master_row._mapping) if master_row else None
            
            # Disks
            disk_query = text("SELECT * FROM sangfor.vm_disk_config WHERE vm_uuid = CAST(:uuid AS uuid)")
            db_data["disks"] = [dict(r._mapping) for r in db.execute(disk_query, {"uuid": vm_uuid}).fetchall()]
            
            # Networks
            net_query = text("SELECT * FROM sangfor.vm_network_interfaces WHERE vm_uuid = CAST(:uuid AS uuid)")
            db_data["networks"] = [dict(r._mapping) for r in db.execute(net_query, {"uuid": vm_uuid}).fetchall()]
            
            # Alarms (Recent 20)
            alarm_query = text("SELECT * FROM sangfor.vm_alarms WHERE vm_uuid = CAST(:uuid AS uuid) ORDER BY begin_time DESC LIMIT 20")
            db_data["alarms"] = [dict(r._mapping) for r in db.execute(alarm_query, {"uuid": vm_uuid}).fetchall()]
            
            # Recent Metrics (5)
            metrics_query = text("SELECT * FROM metrics.vm_metrics WHERE vm_uuid = CAST(:uuid AS uuid) ORDER BY collected_at DESC LIMIT 5")
            db_data["recent_metrics"] = [dict(r._mapping) for r in db.execute(metrics_query, {"uuid": vm_uuid}).fetchall()]
            
        except Exception as db_err:
            db_data["error"] = str(db_err)

        if not api_raw and not db_data.get("master"):
            raise HTTPException(status_code=404, detail="ไม่สามารถดึงข้อมูลจาก Sangfor API หรือ Database ได้ (VM not found)")
            
        return {
            "vm_uuid": vm_uuid,
            "api_source": {
                "endpoint": used_endpoint,
                "raw": api_raw
            },
            "db_source": db_data,
            "collected_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการดึงข้อมูลดิบ: {str(e)}")