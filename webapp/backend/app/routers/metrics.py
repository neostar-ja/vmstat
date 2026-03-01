"""
Metrics Router - API endpoints for historical metrics and graphs

Provides:
- Historical VM metrics for graphing
- Aggregated data with configurable intervals
- Summary statistics
- Top resource consumers
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

from ..database import get_db
from ..utils.auth import get_current_user, require_role

router = APIRouter(prefix="/metrics", tags=["Metrics"])


# ============================================================
# Enums and Models
# ============================================================

class TimeInterval(str, Enum):
    """Supported time intervals for aggregation"""
    MINUTE_1 = "1m"
    MINUTE_5 = "5m"
    MINUTE_15 = "15m"
    HOUR_1 = "1h"
    HOUR_6 = "6h"
    DAY_1 = "1d"


class TimeRange(str, Enum):
    """Preset time ranges"""
    HOUR_1 = "1h"
    HOUR_6 = "6h"
    HOUR_12 = "12h"
    DAY_1 = "1d"
    DAY_7 = "7d"
    DAY_30 = "30d"
    DAY_90 = "90d"
    CUSTOM = "custom"


class ResourceType(str, Enum):
    """Resource types for top consumers"""
    CPU = "cpu"
    MEMORY = "memory"
    STORAGE = "storage"
    NETWORK = "network"


class MetricPoint(BaseModel):
    """Single metric data point"""
    timestamp: datetime
    value: float
    
    
class MetricSeries(BaseModel):
    """Time series data for a metric"""
    metric_name: str
    unit: str
    data: List[MetricPoint]


class VMMetricsHistory(BaseModel):
    """Complete VM metrics history response"""
    vm_uuid: str
    vm_name: Optional[str] = None
    time_range: str
    interval: str
    series: Dict[str, MetricSeries]


class MetricsSummary(BaseModel):
    """System-wide metrics summary"""
    total_vms: int
    running_vms: int
    avg_cpu_usage: float
    avg_memory_usage: float
    avg_storage_usage: float
    collection_count: int
    last_collection: Optional[datetime] = None


class TopConsumer(BaseModel):
    """Top resource consumer"""
    vm_uuid: str
    vm_name: str
    value: float
    percentage: float


# ============================================================
# Helper Functions
# ============================================================

def get_interval_sql(interval: TimeInterval) -> str:
    """Convert TimeInterval to PostgreSQL interval string"""
    mapping = {
        TimeInterval.MINUTE_1: "1 minute",
        TimeInterval.MINUTE_5: "5 minutes",
        TimeInterval.MINUTE_15: "15 minutes",
        TimeInterval.HOUR_1: "1 hour",
        TimeInterval.HOUR_6: "6 hours",
        TimeInterval.DAY_1: "1 day",
    }
    return mapping.get(interval, "5 minutes")


def get_time_range_delta(time_range: TimeRange) -> timedelta:
    """Convert TimeRange to timedelta"""
    mapping = {
        TimeRange.HOUR_1: timedelta(hours=1),
        TimeRange.HOUR_6: timedelta(hours=6),
        TimeRange.HOUR_12: timedelta(hours=12),
        TimeRange.DAY_1: timedelta(days=1),
        TimeRange.DAY_7: timedelta(days=7),
        TimeRange.DAY_30: timedelta(days=30),
        TimeRange.DAY_90: timedelta(days=90),
    }
    return mapping.get(time_range, timedelta(days=1))


def auto_select_interval(time_range: TimeRange) -> str:
    """Auto-select appropriate interval based on time range"""
    mapping = {
        TimeRange.HOUR_1: "1 minute",
        TimeRange.HOUR_6: "5 minutes",
        TimeRange.HOUR_12: "15 minutes",
        TimeRange.DAY_1: "15 minutes",
        TimeRange.DAY_7: "1 hour",
        TimeRange.DAY_30: "6 hours",
        TimeRange.DAY_90: "1 day",
    }
    return mapping.get(time_range, "5 minutes")


# ============================================================
# VM Metrics History Endpoints
# ============================================================

@router.get("/vm/{vm_uuid}/history")
async def get_vm_metrics_history(
    vm_uuid: str,
    time_range: TimeRange = Query(TimeRange.DAY_1, description="ช่วงเวลา"),
    interval: Optional[TimeInterval] = Query(None, description="ช่วงการรวมข้อมูล (auto ถ้าไม่ระบุ)"),
    start_date: Optional[datetime] = Query(None, description="วันเริ่มต้น (สำหรับ custom range)"),
    end_date: Optional[datetime] = Query(None, description="วันสิ้นสุด (สำหรับ custom range)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    ดึงข้อมูล metrics ย้อนหลังของ VM สำหรับสร้างกราฟ
    
    รองรับ:
    - CPU Usage (%)
    - Memory Usage (%)
    - Storage Usage (%)
    - Network I/O (bps)
    - Disk I/O (IOPS)
    """
    try:
        # Calculate time range
        if time_range == TimeRange.CUSTOM:
            if not start_date or not end_date:
                raise HTTPException(status_code=400, detail="ต้องระบุ start_date และ end_date สำหรับ custom range")
            start = start_date
            end = end_date
        else:
            end = datetime.now()
            start = end - get_time_range_delta(time_range)
        
        # Select interval
        if interval:
            interval_sql = get_interval_sql(interval)
        else:
            interval_sql = auto_select_interval(time_range)
        
        # Get VM name
        vm_result = db.execute(
            text("SELECT name FROM sangfor.vm_master WHERE vm_uuid = :uuid"),
            {"uuid": vm_uuid}
        )
        vm_row = vm_result.fetchone()
        vm_name = vm_row.name if vm_row else None
        
        # Query aggregated metrics
        query = text("""
            WITH time_buckets AS (
                SELECT 
                    date_trunc('minute', collected_at) - 
                    (EXTRACT(minute FROM collected_at)::integer % 
                        CASE 
                            WHEN :interval = '1 minute' THEN 1
                            WHEN :interval = '5 minutes' THEN 5
                            WHEN :interval = '15 minutes' THEN 15
                            WHEN :interval = '1 hour' THEN 60
                            WHEN :interval = '6 hours' THEN 360
                            WHEN :interval = '1 day' THEN 1440
                            ELSE 5
                        END
                    ) * interval '1 minute' AS bucket,
                    cpu_ratio,
                    memory_ratio,
                    storage_ratio,
                    network_read_bitps,
                    network_write_bitps,
                    disk_read_iops,
                    disk_write_iops
                FROM metrics.vm_metrics
                WHERE vm_uuid = CAST(:vm_uuid AS uuid)
                AND collected_at BETWEEN :start AND :end
            )
            SELECT 
                bucket as timestamp,
                ROUND(AVG(cpu_ratio) * 100, 2) as cpu_percent,
                ROUND(AVG(memory_ratio) * 100, 2) as memory_percent,
                ROUND(AVG(storage_ratio) * 100, 2) as storage_percent,
                ROUND(AVG(network_read_bitps), 2) as network_read_bps,
                ROUND(AVG(network_write_bitps), 2) as network_write_bps,
                ROUND(AVG(disk_read_iops), 2) as disk_read_iops,
                ROUND(AVG(disk_write_iops), 2) as disk_write_iops,
                COUNT(*) as sample_count
            FROM time_buckets
            GROUP BY bucket
            ORDER BY bucket ASC
        """)
        
        result = db.execute(query, {
            "vm_uuid": vm_uuid,
            "start": start,
            "end": end,
            "interval": interval_sql
        })
        
        # Build response
        cpu_data = []
        memory_data = []
        storage_data = []
        network_read_data = []
        network_write_data = []
        disk_read_data = []
        disk_write_data = []
        
        for row in result:
            ts = row.timestamp
            if row.cpu_percent is not None:
                cpu_data.append({"timestamp": ts, "value": float(row.cpu_percent)})
            if row.memory_percent is not None:
                memory_data.append({"timestamp": ts, "value": float(row.memory_percent)})
            if row.storage_percent is not None:
                storage_data.append({"timestamp": ts, "value": float(row.storage_percent)})
            if row.network_read_bps is not None:
                network_read_data.append({"timestamp": ts, "value": float(row.network_read_bps)})
            if row.network_write_bps is not None:
                network_write_data.append({"timestamp": ts, "value": float(row.network_write_bps)})
            if row.disk_read_iops is not None:
                disk_read_data.append({"timestamp": ts, "value": float(row.disk_read_iops)})
            if row.disk_write_iops is not None:
                disk_write_data.append({"timestamp": ts, "value": float(row.disk_write_iops)})
        
        return {
            "vm_uuid": vm_uuid,
            "vm_name": vm_name,
            "time_range": time_range.value,
            "interval": interval_sql,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "data_points": len(cpu_data),
            "series": {
                "cpu": {
                    "metric_name": "CPU Usage",
                    "unit": "%",
                    "data": cpu_data
                },
                "memory": {
                    "metric_name": "Memory Usage",
                    "unit": "%",
                    "data": memory_data
                },
                "storage": {
                    "metric_name": "Storage Usage",
                    "unit": "%",
                    "data": storage_data
                },
                "network_read": {
                    "metric_name": "Network Read",
                    "unit": "bps",
                    "data": network_read_data
                },
                "network_write": {
                    "metric_name": "Network Write",
                    "unit": "bps",
                    "data": network_write_data
                },
                "disk_read_iops": {
                    "metric_name": "Disk Read IOPS",
                    "unit": "IOPS",
                    "data": disk_read_data
                },
                "disk_write_iops": {
                    "metric_name": "Disk Write IOPS",
                    "unit": "IOPS",
                    "data": disk_write_data
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูล metrics: {str(e)}")


@router.get("/vm/{vm_uuid}/latest")
async def get_vm_latest_metrics(
    vm_uuid: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """ดึงข้อมูล metrics ล่าสุดของ VM"""
    try:
        query = text("""
            SELECT 
                m.collected_at,
                m.power_state,
                m.status,
                m.uptime_seconds,
                ROUND(m.cpu_ratio * 100, 2) as cpu_percent,
                m.cpu_total_mhz,
                m.cpu_used_mhz,
                ROUND(m.memory_ratio * 100, 2) as memory_percent,
                m.memory_total_mb,
                m.memory_used_mb,
                ROUND(m.storage_ratio * 100, 2) as storage_percent,
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
            raise HTTPException(status_code=404, detail="ไม่พบข้อมูล metrics สำหรับ VM นี้")
        
        return {
            "vm_uuid": vm_uuid,
            "vm_name": row.vm_name,
            "collected_at": row.collected_at.isoformat() if row.collected_at else None,
            "power_state": row.power_state,
            "status": row.status,
            "uptime_seconds": row.uptime_seconds,
            "cpu": {
                "percent": float(row.cpu_percent) if row.cpu_percent else 0,
                "total_mhz": float(row.cpu_total_mhz) if row.cpu_total_mhz else 0,
                "used_mhz": float(row.cpu_used_mhz) if row.cpu_used_mhz else 0
            },
            "memory": {
                "percent": float(row.memory_percent) if row.memory_percent else 0,
                "total_mb": float(row.memory_total_mb) if row.memory_total_mb else 0,
                "used_mb": float(row.memory_used_mb) if row.memory_used_mb else 0
            },
            "storage": {
                "percent": float(row.storage_percent) if row.storage_percent else 0,
                "total_mb": float(row.storage_total_mb) if row.storage_total_mb else 0,
                "used_mb": float(row.storage_used_mb) if row.storage_used_mb else 0
            },
            "network": {
                "read_bps": float(row.network_read_bitps) if row.network_read_bitps else 0,
                "write_bps": float(row.network_write_bitps) if row.network_write_bitps else 0
            },
            "disk_io": {
                "read_iops": float(row.disk_read_iops) if row.disk_read_iops else 0,
                "write_iops": float(row.disk_write_iops) if row.disk_write_iops else 0
            },
            "host_name": row.host_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูล: {str(e)}")


# ============================================================
# Summary and Statistics
# ============================================================

@router.get("/summary")
async def get_metrics_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """ดึงข้อมูลสรุป metrics ของระบบทั้งหมด"""
    try:
        # Get latest metrics per VM
        query = text("""
            WITH latest_metrics AS (
                SELECT DISTINCT ON (vm_uuid)
                    vm_uuid,
                    collected_at,
                    power_state,
                    cpu_ratio,
                    memory_ratio,
                    storage_ratio
                FROM metrics.vm_metrics
                ORDER BY vm_uuid, collected_at DESC
            )
            SELECT 
                COUNT(*) as total_vms,
                COUNT(*) FILTER (WHERE power_state = 'on') as running_vms,
                ROUND(AVG(cpu_ratio) * 100, 2) as avg_cpu,
                ROUND(AVG(memory_ratio) * 100, 2) as avg_memory,
                ROUND(AVG(storage_ratio) * 100, 2) as avg_storage,
                MAX(collected_at) as last_collection
            FROM latest_metrics
        """)
        
        result = db.execute(query)
        row = result.fetchone()
        
        # Get total collection count
        count_result = db.execute(text("SELECT COUNT(*) as cnt FROM metrics.vm_metrics"))
        count_row = count_result.fetchone()
        
        return {
            "total_vms": row.total_vms or 0,
            "running_vms": row.running_vms or 0,
            "avg_cpu_usage": float(row.avg_cpu) if row.avg_cpu else 0,
            "avg_memory_usage": float(row.avg_memory) if row.avg_memory else 0,
            "avg_storage_usage": float(row.avg_storage) if row.avg_storage else 0,
            "collection_count": count_row.cnt or 0,
            "last_collection": row.last_collection.isoformat() if row.last_collection else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูลสรุป: {str(e)}")


@router.get("/top-consumers")
async def get_top_consumers(
    resource: ResourceType = Query(ResourceType.CPU, description="ประเภททรัพยากร"),
    limit: int = Query(10, ge=1, le=50, description="จำนวน VMs"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """ดึงรายการ VMs ที่ใช้ทรัพยากรมากที่สุด"""
    try:
        # Map resource type to column
        resource_column = {
            ResourceType.CPU: "cpu_ratio",
            ResourceType.MEMORY: "memory_ratio",
            ResourceType.STORAGE: "storage_ratio",
            ResourceType.NETWORK: "(network_read_bitps + network_write_bitps)"
        }
        
        column = resource_column[resource]
        
        query = text(f"""
            WITH latest_metrics AS (
                SELECT DISTINCT ON (m.vm_uuid)
                    m.vm_uuid,
                    v.name as vm_name,
                    m.{column if resource != ResourceType.NETWORK else 'network_read_bitps + network_write_bitps'} as value,
                    m.collected_at
                FROM metrics.vm_metrics m
                LEFT JOIN sangfor.vm_master v ON m.vm_uuid = v.vm_uuid
                WHERE m.power_state = 'on'
                ORDER BY m.vm_uuid, m.collected_at DESC
            )
            SELECT 
                vm_uuid::text,
                vm_name,
                ROUND(value * 100, 2) as percentage,
                value
            FROM latest_metrics
            WHERE value IS NOT NULL
            ORDER BY value DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {"limit": limit})
        
        consumers = []
        for row in result:
            consumers.append({
                "vm_uuid": row.vm_uuid,
                "vm_name": row.vm_name or "Unknown",
                "value": float(row.value) if row.value else 0,
                "percentage": float(row.percentage) if row.percentage else 0
            })
        
        return {
            "resource": resource.value,
            "limit": limit,
            "consumers": consumers
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูล: {str(e)}")


# ============================================================
# Host Metrics
# ============================================================

@router.get("/host/{host_id}/history")
async def get_host_metrics_history(
    host_id: str,
    time_range: TimeRange = Query(TimeRange.DAY_1, description="ช่วงเวลา"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """ดึงข้อมูล metrics ย้อนหลังของ Host"""
    try:
        end = datetime.now()
        start = end - get_time_range_delta(time_range)
        interval_sql = auto_select_interval(time_range)
        
        query = text("""
            WITH time_buckets AS (
                SELECT 
                    date_trunc('hour', collected_at) AS bucket,
                    cpu_ratio,
                    memory_ratio,
                    storage_ratio,
                    vm_count,
                    vm_running_count
                FROM metrics.host_metrics
                WHERE host_id = :host_id
                AND collected_at BETWEEN :start AND :end
            )
            SELECT 
                bucket as timestamp,
                ROUND(AVG(cpu_ratio) * 100, 2) as cpu_percent,
                ROUND(AVG(memory_ratio) * 100, 2) as memory_percent,
                ROUND(AVG(storage_ratio) * 100, 2) as storage_percent,
                ROUND(AVG(vm_count), 0) as vm_count,
                ROUND(AVG(vm_running_count), 0) as vm_running
            FROM time_buckets
            GROUP BY bucket
            ORDER BY bucket ASC
        """)
        
        result = db.execute(query, {
            "host_id": host_id,
            "start": start,
            "end": end
        })
        
        data = []
        for row in result:
            data.append({
                "timestamp": row.timestamp,
                "cpu_percent": float(row.cpu_percent) if row.cpu_percent else 0,
                "memory_percent": float(row.memory_percent) if row.memory_percent else 0,
                "storage_percent": float(row.storage_percent) if row.storage_percent else 0,
                "vm_count": int(row.vm_count) if row.vm_count else 0,
                "vm_running": int(row.vm_running) if row.vm_running else 0
            })
        
        return {
            "host_id": host_id,
            "time_range": time_range.value,
            "interval": interval_sql,
            "data_points": len(data),
            "data": data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูล: {str(e)}")


# ============================================================
# Data Retention Info
# ============================================================

@router.get("/retention-info")
async def get_retention_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """ดึงข้อมูลเกี่ยวกับการเก็บข้อมูล metrics (Admin only)"""
    try:
        query = text("""
            SELECT 
                MIN(collected_at) as earliest_data,
                MAX(collected_at) as latest_data,
                COUNT(*) as total_records,
                pg_size_pretty(pg_total_relation_size('metrics.vm_metrics')) as table_size
            FROM metrics.vm_metrics
        """)
        
        result = db.execute(query)
        row = result.fetchone()
        
        # Calculate date range
        if row.earliest_data and row.latest_data:
            date_range = (row.latest_data - row.earliest_data).days
        else:
            date_range = 0
        
        # Get partition info
        partition_query = text("""
            SELECT 
                child.relname as partition_name,
                pg_size_pretty(pg_relation_size(child.oid)) as size
            FROM pg_inherits
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
            JOIN pg_class child ON pg_inherits.inhrelid = child.oid
            WHERE parent.relname = 'vm_metrics'
            ORDER BY child.relname DESC
            LIMIT 12
        """)
        
        partition_result = db.execute(partition_query)
        partitions = [{"name": r.partition_name, "size": r.size} for r in partition_result]
        
        return {
            "earliest_data": row.earliest_data.isoformat() if row.earliest_data else None,
            "latest_data": row.latest_data.isoformat() if row.latest_data else None,
            "date_range_days": date_range,
            "total_records": row.total_records or 0,
            "table_size": row.table_size,
            "partitions": partitions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ไม่สามารถดึงข้อมูล: {str(e)}")
