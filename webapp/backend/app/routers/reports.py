"""
Reports Router - API endpoints for generating various VM and infrastructure reports
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from ..database import get_db
from ..utils.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


# ============================================================
# 1. VM Resource Usage Report (per VM)
# ============================================================

@router.get("/vm-resource/{vm_uuid}")
async def get_vm_resource_report(
    vm_uuid: str,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get resource usage report for a specific VM.
    Returns CPU, RAM, Storage, Network, and Disk I/O metrics with min/max/avg/p95 statistics.
    """
    # Get VM info
    vm_query = """
        SELECT vm.vm_uuid, vm.name, vm.os_name, vm.cpu_cores, vm.memory_total_mb,
               vm.storage_total_mb, h.host_name, g.group_name, az.az_name
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
        WHERE vm.vm_uuid = CAST(:vm_uuid AS uuid)
    """
    vm_row = db.execute(text(vm_query), {"vm_uuid": vm_uuid}).fetchone()
    if not vm_row:
        raise HTTPException(status_code=404, detail="VM not found")
    vm_info = dict(vm_row._mapping)

    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    # Get aggregate statistics
    stats_query = """
        SELECT
            COUNT(*) as data_points,
            MIN(cpu_ratio) as cpu_min, MAX(cpu_ratio) as cpu_max,
            AVG(cpu_ratio) as cpu_avg,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cpu_ratio) as cpu_p95,

            MIN(memory_ratio) as mem_min, MAX(memory_ratio) as mem_max,
            AVG(memory_ratio) as mem_avg,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY memory_ratio) as mem_p95,

            MIN(storage_ratio) as storage_min, MAX(storage_ratio) as storage_max,
            AVG(storage_ratio) as storage_avg,

            AVG(network_read_bitps) as net_read_avg,
            MAX(network_read_bitps) as net_read_max,
            AVG(network_write_bitps) as net_write_avg,
            MAX(network_write_bitps) as net_write_max,

            AVG(disk_read_iops) as disk_read_iops_avg,
            MAX(disk_read_iops) as disk_read_iops_max,
            AVG(disk_write_iops) as disk_write_iops_avg,
            MAX(disk_write_iops) as disk_write_iops_max,

            AVG(disk_read_byteps) as disk_read_bps_avg,
            MAX(disk_read_byteps) as disk_read_bps_max,
            AVG(disk_write_byteps) as disk_write_bps_avg,
            MAX(disk_write_byteps) as disk_write_bps_max
        FROM metrics.vm_metrics
        WHERE vm_uuid = CAST(:vm_uuid AS uuid) AND collected_at >= :since
    """
    stats_row = db.execute(text(stats_query), {"vm_uuid": vm_uuid, "since": since}).fetchone()
    stats = dict(stats_row._mapping) if stats_row else {}

    # Get time-series data (sampled to ~200 points max)
    ts_query = """
        WITH numbered AS (
            SELECT *, ROW_NUMBER() OVER (ORDER BY collected_at) as rn,
                   COUNT(*) OVER() as total
            FROM metrics.vm_metrics
            WHERE vm_uuid = CAST(:vm_uuid AS uuid) AND collected_at >= :since
        )
        SELECT collected_at, cpu_ratio, memory_ratio, storage_ratio,
               network_read_bitps, network_write_bitps,
               disk_read_iops, disk_write_iops,
               disk_read_byteps, disk_write_byteps,
               power_state, cpu_used_mhz, memory_used_mb, storage_used_mb
        FROM numbered
        WHERE total <= 200 OR rn % GREATEST(total / 200, 1) = 0
        ORDER BY collected_at
    """
    ts_result = db.execute(text(ts_query), {"vm_uuid": vm_uuid, "since": since})
    time_series = [dict(row._mapping) for row in ts_result.fetchall()]

    # Serialize datetime
    for ts in time_series:
        if ts.get("collected_at"):
            ts["collected_at"] = ts["collected_at"].isoformat()

    # Float conversion for stats
    for k, v in stats.items():
        if v is not None and hasattr(v, '__float__'):
            stats[k] = float(v)

    return {
        "report_type": "vm_resource_usage",
        "vm": vm_info,
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "statistics": stats,
        "time_series": time_series
    }


# ============================================================
# 2. Top N VMs Report (comparison)
# ============================================================

@router.get("/top-vms")
async def get_top_vms_report(
    metric: str = Query("cpu", regex="^(cpu|memory|storage|network|disk_iops)$"),
    top_n: int = Query(10, ge=1, le=50),
    hours: int = Query(24, ge=1, le=720),
    group_id: Optional[str] = None,
    az_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get top N VMs by resource usage for comparison.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    metric_col_map = {
        "cpu": "AVG(m.cpu_ratio)",
        "memory": "AVG(m.memory_ratio)",
        "storage": "AVG(m.storage_ratio)",
        "network": "AVG(m.network_read_bitps + m.network_write_bitps)",
        "disk_iops": "AVG(m.disk_read_iops + m.disk_write_iops)"
    }
    metric_expr = metric_col_map[metric]

    conditions = ["m.collected_at >= :since", "vm.is_deleted = FALSE"]
    params: dict = {"since": since, "top_n": top_n}

    if group_id:
        conditions.append("vm.group_id = CAST(:group_id AS uuid)")
        params["group_id"] = group_id
    if az_name:
        conditions.append("az.az_name = :az_name")
        params["az_name"] = az_name

    where = " AND ".join(conditions)

    query = f"""
        SELECT vm.vm_uuid, vm.name, vm.os_name, vm.cpu_cores,
               vm.memory_total_mb, vm.storage_total_mb,
               h.host_name, g.group_name, az.az_name,
               {metric_expr} as metric_value,
               MAX(m.cpu_ratio) as cpu_peak,
               MAX(m.memory_ratio) as mem_peak,
               MAX(m.storage_ratio) as storage_peak,
               COUNT(m.*) as data_points
        FROM sangfor.vm_master vm
        INNER JOIN metrics.vm_metrics m ON vm.vm_uuid = m.vm_uuid
        LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
        WHERE {where}
        GROUP BY vm.vm_uuid, vm.name, vm.os_name, vm.cpu_cores,
                 vm.memory_total_mb, vm.storage_total_mb,
                 h.host_name, g.group_name, az.az_name
        ORDER BY metric_value DESC
        LIMIT :top_n
    """
    result = db.execute(text(query), params)
    items = []
    for row in result.fetchall():
        d = dict(row._mapping)
        for k, v in d.items():
            if v is not None and hasattr(v, '__float__') and k != 'vm_uuid':
                d[k] = float(v)
        items.append(d)

    return {
        "report_type": "top_vms",
        "metric": metric,
        "top_n": top_n,
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
        "total": len(items)
    }


# ============================================================
# 3. Infrastructure Inventory Report
# ============================================================

@router.get("/inventory")
async def get_inventory_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get infrastructure inventory summary: VM counts by status/OS/group/AZ,
    total allocated vs used resources.
    """
    # VM counts by power state
    power_query = """
        SELECT m.power_state, COUNT(DISTINCT vm.vm_uuid) as count
        FROM sangfor.vm_master vm
        LEFT JOIN LATERAL (
            SELECT power_state FROM metrics.vm_metrics
            WHERE vm_uuid = vm.vm_uuid ORDER BY collected_at DESC LIMIT 1
        ) m ON TRUE
        WHERE vm.is_deleted = FALSE
        GROUP BY m.power_state
    """
    power_result = db.execute(text(power_query))
    by_power_state = {str(r.power_state or 'unknown'): r.count for r in power_result.fetchall()}

    # VM counts by OS
    os_query = """
        SELECT COALESCE(os_name, 'Unknown') as os_name, COUNT(*) as count
        FROM sangfor.vm_master WHERE is_deleted = FALSE
        GROUP BY os_name ORDER BY count DESC
    """
    os_result = db.execute(text(os_query))
    by_os = [dict(r._mapping) for r in os_result.fetchall()]

    # VM counts by group
    group_query = """
        SELECT COALESCE(g.group_name, 'Ungrouped') as group_name, COUNT(*) as count
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        WHERE vm.is_deleted = FALSE
        GROUP BY g.group_name ORDER BY count DESC
    """
    group_result = db.execute(text(group_query))
    by_group = [dict(r._mapping) for r in group_result.fetchall()]

    # VM counts by AZ
    az_query = """
        SELECT COALESCE(az.az_name, 'Unknown') as az_name, COUNT(*) as count
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
        WHERE vm.is_deleted = FALSE
        GROUP BY az.az_name ORDER BY count DESC
    """
    az_result = db.execute(text(az_query))
    by_az = [dict(r._mapping) for r in az_result.fetchall()]

    # Total allocated resources
    resource_query = """
        SELECT
            COUNT(*) as total_vms,
            SUM(cpu_cores) as total_vcpus,
            SUM(memory_total_mb) as total_memory_mb,
            SUM(storage_total_mb) as total_storage_mb,
            COUNT(CASE WHEN protection_enabled THEN 1 END) as protected_vms,
            COUNT(CASE WHEN NOT protection_enabled THEN 1 END) as unprotected_vms
        FROM sangfor.vm_master WHERE is_deleted = FALSE
    """
    res_row = db.execute(text(resource_query)).fetchone()
    resources = dict(res_row._mapping) if res_row else {}

    # Host capacity
    host_query = """
        SELECT COUNT(*) as total_hosts,
               SUM(cpu_cores) as total_host_cpus,
               SUM(memory_total_mb) as total_host_memory_mb
        FROM sangfor.host_master WHERE is_active = TRUE
    """
    try:
        host_row = db.execute(text(host_query)).fetchone()
        host_resources = dict(host_row._mapping) if host_row else {}
    except Exception:
        host_resources = {"total_hosts": 0, "total_host_cpus": 0, "total_host_memory_mb": 0}

    return {
        "report_type": "inventory",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "vm_summary": resources,
        "host_summary": host_resources,
        "by_power_state": by_power_state,
        "by_os": by_os,
        "by_group": by_group,
        "by_az": by_az
    }


# ============================================================
# 4. Datastore Capacity Report
# ============================================================

@router.get("/datastore-capacity")
async def get_datastore_capacity_report(
    hours: int = Query(168, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get datastore capacity report with current usage and historical trends.
    """
    # Current state
    ds_query = """
        SELECT d.datastore_id, d.name, d.type, d.status,
               d.total_mb, d.used_mb, d.ratio,
               d.backup_enable, d.backup_total_mb, d.backup_used_mb, d.backup_ratio,
               d.connected_hosts, az.az_name,
               d.read_byteps, d.write_byteps
        FROM sangfor.datastore_master d
        LEFT JOIN sangfor.az_master az ON d.az_id = az.az_id
        WHERE d.is_active = TRUE
        ORDER BY d.ratio DESC
    """
    ds_result = db.execute(text(ds_query))
    datastores = []
    for row in ds_result.fetchall():
        d = dict(row._mapping)
        for k, v in d.items():
            if v is not None and hasattr(v, '__float__') and 'id' not in k and 'name' not in k:
                d[k] = float(v)
        datastores.append(d)

    # Summary
    summary_query = """
        SELECT
            COUNT(*) as total_datastores,
            SUM(total_mb) as total_capacity_mb,
            SUM(used_mb) as total_used_mb,
            SUM(backup_total_mb) as total_backup_mb,
            SUM(backup_used_mb) as total_backup_used_mb,
            COUNT(CASE WHEN ratio > 0.9 THEN 1 END) as critical_count,
            COUNT(CASE WHEN ratio > 0.8 AND ratio <= 0.9 THEN 1 END) as warning_count
        FROM sangfor.datastore_master WHERE is_active = TRUE
    """
    sum_row = db.execute(text(summary_query)).fetchone()
    summary = dict(sum_row._mapping) if sum_row else {}
    for k, v in summary.items():
        if v is not None and hasattr(v, '__float__'):
            summary[k] = float(v)

    return {
        "report_type": "datastore_capacity",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period_hours": hours,
        "summary": summary,
        "datastores": datastores
    }


# ============================================================
# 5. Host Capacity Report
# ============================================================

@router.get("/host-capacity")
async def get_host_capacity_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get host capacity report with VM density and resource allocation.
    """
    query = """
        SELECT
            h.host_id, h.host_name, h.status,
            h.cpu_cores as host_cpus, h.memory_total_mb as host_memory_mb,
            az.az_name,
            COUNT(vm.vm_uuid) as vm_count,
            COALESCE(SUM(vm.cpu_cores), 0) as allocated_vcpus,
            COALESCE(SUM(vm.memory_total_mb), 0) as allocated_memory_mb,
            COALESCE(SUM(vm.storage_total_mb), 0) as allocated_storage_mb,
            CASE WHEN h.cpu_cores > 0 THEN ROUND(COALESCE(SUM(vm.cpu_cores), 0)::numeric / h.cpu_cores, 2) END as cpu_overcommit,
            CASE WHEN h.memory_total_mb > 0 THEN ROUND(COALESCE(SUM(vm.memory_total_mb), 0)::numeric / h.memory_total_mb, 2) END as memory_overcommit
        FROM sangfor.host_master h
        LEFT JOIN sangfor.az_master az ON h.az_id = az.az_id
        LEFT JOIN sangfor.vm_master vm ON vm.host_id = h.host_id AND vm.is_deleted = FALSE
        WHERE h.is_active = TRUE
        GROUP BY h.host_id, h.host_name, h.status, h.cpu_cores, h.memory_total_mb,
                 az.az_name
        ORDER BY vm_count DESC
    """
    result = db.execute(text(query))
    hosts = []
    for row in result.fetchall():
        d = dict(row._mapping)
        for k, v in d.items():
            if v is not None and hasattr(v, '__float__') and 'id' not in k and 'name' not in k:
                d[k] = float(v)
        hosts.append(d)

    return {
        "report_type": "host_capacity",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "hosts": hosts,
        "total_hosts": len(hosts)
    }


# ============================================================
# 6. Alarm Summary Report
# ============================================================

@router.get("/alarm-summary")
async def get_alarm_summary_report(
    hours: int = Query(168, ge=1, le=2160),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get alarm summary report with counts by severity, source, and MTTR calculation.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    query = """
        SELECT
            COUNT(*) as total_alarms,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
            COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
            COUNT(CASE WHEN severity = 'p1' THEN 1 END) as p1_count,
            COUNT(CASE WHEN severity = 'p2' THEN 1 END) as p2_count,
            COUNT(CASE WHEN severity = 'p3' THEN 1 END) as p3_count,
            COUNT(CASE WHEN severity IS NULL THEN 1 END) as alert_count,
            COUNT(CASE WHEN source = 'vm' THEN 1 END) as vm_alarms,
            COUNT(CASE WHEN source = 'host' THEN 1 END) as host_alarms,
            COUNT(CASE WHEN source = 'system' THEN 1 END) as system_alarms,
            AVG(CASE WHEN status = 'closed' AND end_time IS NOT NULL AND begin_time IS NOT NULL
                THEN EXTRACT(EPOCH FROM (end_time - begin_time)) / 60 END) as avg_mttr_minutes
        FROM sangfor.v_unified_alarms
        WHERE created_at >= :since OR begin_time >= :since
    """
    row = db.execute(text(query), {"since": since}).fetchone()
    summary = dict(row._mapping) if row else {}
    for k, v in summary.items():
        if v is not None and hasattr(v, '__float__'):
            summary[k] = float(v)

    # Top VMs by alarm count
    top_vm_query = """
        SELECT a.resource_name, CAST(a.vm_uuid AS text) as vm_uuid,
               COUNT(*) as alarm_count,
               COUNT(CASE WHEN a.severity = 'p1' THEN 1 END) as p1_count
        FROM sangfor.v_unified_alarms a
        WHERE (a.created_at >= :since OR a.begin_time >= :since)
              AND a.vm_uuid IS NOT NULL
        GROUP BY a.resource_name, a.vm_uuid
        ORDER BY alarm_count DESC
        LIMIT 10
    """
    top_result = db.execute(text(top_vm_query), {"since": since})
    top_vms = [dict(r._mapping) for r in top_result.fetchall()]

    return {
        "report_type": "alarm_summary",
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "top_vms_by_alarm": top_vms
    }


# ============================================================
# 7. Protection Status Report
# ============================================================

@router.get("/protection-status")
async def get_protection_status_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get report on VM protection/backup status.
    """
    query = """
        SELECT
            COUNT(*) as total_vms,
            COUNT(CASE WHEN protection_enabled THEN 1 END) as protected_count,
            COUNT(CASE WHEN NOT protection_enabled OR protection_enabled IS NULL THEN 1 END) as unprotected_count,
            SUM(backup_file_count) as total_backup_files,
            AVG(backup_file_count) as avg_backup_files_per_vm
        FROM sangfor.vm_master WHERE is_deleted = FALSE
    """
    row = db.execute(text(query)).fetchone()
    summary = dict(row._mapping) if row else {}
    for k, v in summary.items():
        if v is not None and hasattr(v, '__float__'):
            summary[k] = float(v)

    # List unprotected VMs
    unprotected_query = """
        SELECT vm.vm_uuid, vm.name, vm.os_name, vm.cpu_cores,
               vm.memory_total_mb, vm.storage_total_mb,
               g.group_name, h.host_name
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
        WHERE vm.is_deleted = FALSE AND (vm.protection_enabled = FALSE OR vm.protection_enabled IS NULL)
        ORDER BY vm.storage_total_mb DESC
        LIMIT 50
    """
    unp_result = db.execute(text(unprotected_query))
    unprotected_vms = [dict(r._mapping) for r in unp_result.fetchall()]

    return {
        "report_type": "protection_status",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "unprotected_vms": unprotected_vms
    }


# ============================================================
# 8. VM Control Actions Report
# ============================================================

@router.get("/vm-control-actions")
async def get_vm_control_actions_report(
    hours: int = Query(168, ge=1, le=2160),
    vm_uuid: Optional[str] = None,
    performed_by: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get report on VM control actions (start/stop/reboot etc).
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    conditions = ["performed_at >= :since"]
    params: dict = {"since": since}

    if vm_uuid:
        conditions.append("vm_uuid = CAST(:vm_uuid AS uuid)")
        params["vm_uuid"] = vm_uuid
    if performed_by:
        conditions.append("performed_by = :performed_by")
        params["performed_by"] = performed_by

    where = " AND ".join(conditions)

    # Summary
    summary_query = f"""
        SELECT
            COUNT(*) as total_actions,
            COUNT(CASE WHEN action = 'start' THEN 1 END) as start_count,
            COUNT(CASE WHEN action = 'stop' THEN 1 END) as stop_count,
            COUNT(CASE WHEN action = 'shutdown' THEN 1 END) as shutdown_count,
            COUNT(CASE WHEN action = 'reboot' THEN 1 END) as reboot_count,
            COUNT(CASE WHEN action = 'reset' THEN 1 END) as reset_count,
            COUNT(CASE WHEN success THEN 1 END) as success_count,
            COUNT(CASE WHEN NOT success THEN 1 END) as failed_count
        FROM webapp.vm_control_audit
        WHERE {where}
    """
    row = db.execute(text(summary_query), params).fetchone()
    summary = dict(row._mapping) if row else {}

    # Action list
    list_query = f"""
        SELECT vm_uuid, vm_name, action, performed_by, success, message,
               dry_run, task_id, performed_at
        FROM webapp.vm_control_audit
        WHERE {where}
        ORDER BY performed_at DESC
        LIMIT 200
    """
    result = db.execute(text(list_query), params)
    actions = []
    for r in result.fetchall():
        d = dict(r._mapping)
        if d.get("performed_at"):
            d["performed_at"] = d["performed_at"].isoformat()
        if d.get("vm_uuid"):
            d["vm_uuid"] = str(d["vm_uuid"])
        actions.append(d)

    return {
        "report_type": "vm_control_actions",
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "actions": actions
    }


# ============================================================
# 9. Sync Status Report
# ============================================================

@router.get("/sync-status")
async def get_sync_status_report(
    hours: int = Query(168, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get sync job history and performance statistics.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    summary_query = """
        SELECT
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            AVG(CASE WHEN status = 'success' THEN duration_ms END) as avg_duration_ms,
            MIN(CASE WHEN status = 'success' THEN duration_ms END) as min_duration_ms,
            MAX(CASE WHEN status = 'success' THEN duration_ms END) as max_duration_ms,
            SUM(total_vms_fetched) as total_vms_fetched,
            SUM(vms_inserted) as total_vms_inserted,
            SUM(vms_updated) as total_vms_updated,
            SUM(metrics_inserted) as total_metrics_inserted,
            MAX(finished_at) as last_successful_sync
        FROM sync.jobs
        WHERE started_at >= :since
    """
    row = db.execute(text(summary_query), {"since": since}).fetchone()
    summary = dict(row._mapping) if row else {}
    for k, v in summary.items():
        if v is not None and hasattr(v, '__float__'):
            summary[k] = float(v)
        elif hasattr(v, 'isoformat'):
            summary[k] = v.isoformat()

    # Recent jobs
    jobs_query = """
        SELECT job_id, source, triggered_by, status,
               started_at, finished_at, duration_ms,
               total_vms_fetched, vms_inserted, vms_updated,
               vms_errors, metrics_inserted, error_message
        FROM sync.jobs
        WHERE started_at >= :since
        ORDER BY started_at DESC
        LIMIT 50
    """
    result = db.execute(text(jobs_query), {"since": since})
    jobs = []
    for r in result.fetchall():
        d = dict(r._mapping)
        for k in ('started_at', 'finished_at'):
            if d.get(k):
                d[k] = d[k].isoformat()
        if d.get('job_id'):
            d['job_id'] = str(d['job_id'])
        jobs.append(d)

    return {
        "report_type": "sync_status",
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "jobs": jobs
    }


# ============================================================
# 10. Executive Summary Report
# ============================================================

@router.get("/executive-summary")
async def get_executive_summary_report(
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Executive summary combining key KPIs from all areas.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    # VM Summary
    vm_query = """
        SELECT
            COUNT(*) as total_vms,
            COUNT(CASE WHEN protection_enabled THEN 1 END) as protected_vms,
            SUM(cpu_cores) as total_vcpus,
            SUM(memory_total_mb) as total_memory_mb,
            SUM(storage_total_mb) as total_storage_mb
        FROM sangfor.vm_master WHERE is_deleted = FALSE
    """
    vm_row = db.execute(text(vm_query)).fetchone()
    vm_summary = dict(vm_row._mapping) if vm_row else {}

    # Average utilization
    util_query = """
        SELECT
            AVG(cpu_ratio) as avg_cpu,
            AVG(memory_ratio) as avg_memory,
            AVG(storage_ratio) as avg_storage,
            COUNT(DISTINCT vm_uuid) as active_vms,
            COUNT(DISTINCT CASE WHEN power_state = 'on' THEN vm_uuid END) as running_vms
        FROM metrics.vm_metrics
        WHERE collected_at >= :since
    """
    util_row = db.execute(text(util_query), {"since": since}).fetchone()
    utilization = dict(util_row._mapping) if util_row else {}
    for k, v in utilization.items():
        if v is not None and hasattr(v, '__float__'):
            utilization[k] = float(v)

    # Alarm counts
    alarm_query = """
        SELECT
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_alarms,
            COUNT(CASE WHEN status = 'open' AND severity = 'p1' THEN 1 END) as open_p1,
            COUNT(CASE WHEN status = 'open' AND severity = 'p2' THEN 1 END) as open_p2,
            COUNT(CASE WHEN status = 'open' AND severity = 'p3' THEN 1 END) as open_p3
        FROM sangfor.v_unified_alarms
    """
    try:
        alarm_row = db.execute(text(alarm_query)).fetchone()
        alarm_summary = dict(alarm_row._mapping) if alarm_row else {}
    except Exception:
        alarm_summary = {"open_alarms": 0, "open_p1": 0, "open_p2": 0, "open_p3": 0}

    # Datastore summary
    ds_query = """
        SELECT
            COUNT(*) as total_datastores,
            COUNT(CASE WHEN ratio > 0.9 THEN 1 END) as critical_datastores,
            COUNT(CASE WHEN ratio > 0.8 AND ratio <= 0.9 THEN 1 END) as warning_datastores,
            AVG(ratio) as avg_usage
        FROM sangfor.datastore_master WHERE is_active = TRUE
    """
    ds_row = db.execute(text(ds_query)).fetchone()
    ds_summary = dict(ds_row._mapping) if ds_row else {}
    for k, v in ds_summary.items():
        if v is not None and hasattr(v, '__float__'):
            ds_summary[k] = float(v)

    # Host summary
    host_query = """
        SELECT COUNT(*) as total_hosts,
               COUNT(CASE WHEN status = 'connected' OR status = 'normal' THEN 1 END) as healthy_hosts
        FROM sangfor.host_master WHERE is_active = TRUE
    """
    try:
        host_row = db.execute(text(host_query)).fetchone()
        host_summary = dict(host_row._mapping) if host_row else {}
    except Exception:
        host_summary = {"total_hosts": 0, "healthy_hosts": 0}

    return {
        "report_type": "executive_summary",
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "vm_summary": vm_summary,
        "utilization": utilization,
        "alarm_summary": alarm_summary,
        "datastore_summary": ds_summary,
        "host_summary": host_summary
    }


# ============================================================
# AZ Summary Report
# ============================================================



# ============================================================
# AZ Summary Report
# ============================================================

@router.get("/az-summary")
async def get_az_summary(
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """AZ-level resource aggregation report."""
    rows = db.execute(text("""
        SELECT
            az.az_id::text,
            az.az_name,
            COUNT(DISTINCT vm.vm_uuid)          AS total_vms,
            COUNT(DISTINCT vm.vm_uuid) FILTER (WHERE lm.power_state = 'on') AS running_vms,
            COUNT(DISTINCT hm.host_id)           AS total_hosts,
            COALESCE(SUM(vm.cpu_cores), 0)       AS total_cpu_cores,
            COALESCE(SUM(vm.memory_total_mb)/1024.0, 0) AS total_memory_gb,
            COALESCE(SUM(vm.storage_total_mb)/1024.0, 0) AS total_storage_gb,
            COALESCE(AVG(lm.cpu_ratio)*100, 0)  AS avg_cpu_pct,
            COALESCE(AVG(lm.memory_ratio)*100, 0) AS avg_memory_pct,
            COALESCE(AVG(lm.storage_ratio)*100, 0) AS avg_storage_pct
        FROM sangfor.az_master az
        LEFT JOIN sangfor.host_master hm ON hm.az_id = az.az_id
        LEFT JOIN sangfor.vm_master vm ON vm.host_id = hm.host_id
        LEFT JOIN metrics.vm_latest_metrics lm ON lm.vm_uuid = vm.vm_uuid
        WHERE az.is_active = true
        GROUP BY az.az_id, az.az_name
        ORDER BY az.az_name
    """)).fetchall()

    return {
        "report_type": "az_summary",
        "hours": hours,
        "generated_at": datetime.utcnow().isoformat(),
        "data": [
            {
                "az_id": r.az_id,
                "az_name": r.az_name,
                "total_vms": r.total_vms or 0,
                "running_vms": r.running_vms or 0,
                "stopped_vms": (r.total_vms or 0) - (r.running_vms or 0),
                "total_hosts": r.total_hosts or 0,
                "total_cpu_cores": r.total_cpu_cores or 0,
                "total_memory_gb": round(float(r.total_memory_gb or 0), 1),
                "total_storage_gb": round(float(r.total_storage_gb or 0), 1),
                "avg_cpu_pct": round(float(r.avg_cpu_pct or 0), 1),
                "avg_memory_pct": round(float(r.avg_memory_pct or 0), 1),
                "avg_storage_pct": round(float(r.avg_storage_pct or 0), 1),
            }
            for r in rows
        ]
    }


# ============================================================
# Group Summary Report
# ============================================================

@router.get("/group-summary")
async def get_group_summary(
    az_name: str = Query("", description="Filter by AZ name"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """VM Group-level resource aggregation report."""
    az_filter = "AND az.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT
            gs.group_id::text,
            gs.group_name,
            gs.group_name_path,
            gs.total_vms,
            gs.running_vms,
            gs.total_cpu_cores,
            ROUND(gs.total_memory_mb / 1024.0, 1)   AS total_memory_gb,
            ROUND(gs.total_storage_mb / 1024.0, 1)  AS total_storage_gb,
            gs.protected_vms,
            gs.gpu_vms,
            COALESCE(AVG(lm.cpu_ratio)*100, 0)      AS avg_cpu_pct,
            COALESCE(AVG(lm.memory_ratio)*100, 0)   AS avg_memory_pct,
            COALESCE(AVG(lm.storage_ratio)*100, 0)  AS avg_storage_pct
        FROM analytics.v_group_summary gs
        LEFT JOIN sangfor.vm_master vm ON vm.group_id = gs.group_id
        LEFT JOIN sangfor.host_master hm ON hm.host_id = vm.host_id
        LEFT JOIN sangfor.az_master az ON az.az_id = hm.az_id
        LEFT JOIN metrics.vm_latest_metrics lm ON lm.vm_uuid = vm.vm_uuid
        WHERE 1=1 {az_filter}
        GROUP BY gs.group_id, gs.group_name, gs.group_name_path,
                 gs.total_vms, gs.running_vms, gs.total_cpu_cores,
                 gs.total_memory_mb, gs.total_storage_mb,
                 gs.protected_vms, gs.gpu_vms
        ORDER BY gs.total_vms DESC
    """), {"az_name": az_name}).fetchall()

    return {
        "report_type": "group_summary",
        "az_filter": az_name,
        "generated_at": datetime.utcnow().isoformat(),
        "data": [
            {
                "group_id": r.group_id,
                "group_name": r.group_name,
                "group_name_path": r.group_name_path,
                "total_vms": r.total_vms or 0,
                "running_vms": r.running_vms or 0,
                "stopped_vms": (r.total_vms or 0) - (r.running_vms or 0),
                "total_cpu_cores": r.total_cpu_cores or 0,
                "total_memory_gb": float(r.total_memory_gb or 0),
                "total_storage_gb": float(r.total_storage_gb or 0),
                "protected_vms": r.protected_vms or 0,
                "gpu_vms": r.gpu_vms or 0,
                "avg_cpu_pct": round(float(r.avg_cpu_pct or 0), 1),
                "avg_memory_pct": round(float(r.avg_memory_pct or 0), 1),
                "avg_storage_pct": round(float(r.avg_storage_pct or 0), 1),
            }
            for r in rows
        ]
    }


# ============================================================
# Host Detail Report
# ============================================================

@router.get("/host-detail")
async def get_host_detail(
    az_name: str = Query("", description="Filter by AZ name"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Host-level resource report with real-time utilization."""
    az_filter = "AND hs.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT
            hs.host_id,
            hs.host_name,
            hs.az_name,
            hs.cluster_name,
            hs.status,
            hs.vm_count,
            hs.running_vms,
            hs.stopped_vms,
            ROUND(hs.cpu_usage_pct, 1)      AS cpu_usage_pct,
            ROUND(hs.memory_usage_pct, 1)   AS memory_usage_pct,
            ROUND(hs.cpu_total_mhz, 0)      AS cpu_total_mhz,
            ROUND(hs.cpu_used_mhz, 0)       AS cpu_used_mhz,
            ROUND(hs.memory_total_mb / 1024.0, 1) AS memory_total_gb,
            ROUND(hs.memory_used_mb / 1024.0, 1)  AS memory_used_gb,
            hs.alarm_count,
            hs.health_status
        FROM analytics.v_host_summary hs
        WHERE 1=1 {az_filter}
        ORDER BY hs.cpu_usage_pct DESC NULLS LAST
    """), {"az_name": az_name}).fetchall()

    result = []
    for r in rows:
        cpu_overcommit = round(float(r.cpu_used_mhz or 0) / max(float(r.cpu_total_mhz or 1), 1) * 100, 1)
        mem_overcommit = round(float(r.memory_used_gb or 0) / max(float(r.memory_total_gb or 1), 1) * 100, 1)
        result.append({
            "host_id": r.host_id,
            "host_name": r.host_name,
            "az_name": r.az_name,
            "cluster_name": r.cluster_name,
            "status": r.status,
            "vm_count": r.vm_count or 0,
            "running_vms": r.running_vms or 0,
            "stopped_vms": r.stopped_vms or 0,
            "cpu_usage_pct": float(r.cpu_usage_pct or 0),
            "memory_usage_pct": float(r.memory_usage_pct or 0),
            "cpu_total_mhz": float(r.cpu_total_mhz or 0),
            "cpu_used_mhz": float(r.cpu_used_mhz or 0),
            "memory_total_gb": float(r.memory_total_gb or 0),
            "memory_used_gb": float(r.memory_used_gb or 0),
            "cpu_overcommit_pct": cpu_overcommit,
            "mem_overcommit_pct": mem_overcommit,
            "alarm_count": r.alarm_count or 0,
            "health_status": r.health_status or "unknown",
        })

    return {
        "report_type": "host_detail",
        "az_filter": az_name,
        "generated_at": datetime.utcnow().isoformat(),
        "data": result,
        "summary": {
            "total_hosts": len(result),
            "hosts_healthy": sum(1 for r in result if r["health_status"] == "healthy"),
            "hosts_warning": sum(1 for r in result if r["health_status"] == "warning"),
            "hosts_critical": sum(1 for r in result if r["health_status"] == "critical"),
            "avg_cpu_pct": round(sum(r["cpu_usage_pct"] for r in result) / max(len(result), 1), 1),
            "avg_memory_pct": round(sum(r["memory_usage_pct"] for r in result) / max(len(result), 1), 1),
        }
    }


# ============================================================
# Idle / Underutilized VMs Report
# ============================================================

@router.get("/idle-vms")
async def get_idle_vms(
    cpu_threshold: float = Query(20.0, ge=0, le=100, description="CPU threshold (%)"),
    mem_threshold: float = Query(30.0, ge=0, le=100, description="Memory threshold (%)"),
    az_name: str = Query("", description="Filter by AZ name"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Report of idle or underutilized VMs."""
    az_filter = "AND az.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT
            vm.vm_uuid::text,
            vm.name AS vm_name,
            COALESCE(g.group_name, 'Unknown Group') AS group_name,
            COALESCE(h.host_name, 'Unknown Host') AS host_name,
            az.az_name,
            vm.cpu_cores,
            ROUND(vm.memory_total_mb / 1024.0, 1) AS memory_total_gb,
            COALESCE(lm.cpu_ratio * 100, 0)       AS avg_cpu_pct,
            COALESCE(lm.memory_ratio * 100, 0)    AS avg_memory_pct,
            COALESCE(lm.storage_ratio * 100, 0)   AS avg_storage_pct,
            CASE
                WHEN COALESCE(lm.cpu_ratio*100,0) < :cpu_th AND COALESCE(lm.memory_ratio*100,0) < :mem_th THEN 'idle'
                WHEN COALESCE(lm.cpu_ratio*100,0) < :cpu_th THEN 'cpu_idle'
                ELSE 'mem_idle'
            END AS idle_type
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.vm_group_master g ON g.group_id = vm.group_id
        LEFT JOIN sangfor.host_master h ON h.host_id = vm.host_id
        LEFT JOIN sangfor.az_master az ON az.az_id = h.az_id
        LEFT JOIN metrics.vm_latest_metrics lm ON lm.vm_uuid = vm.vm_uuid
        WHERE lm.power_state = 'on'
          AND (
              COALESCE(lm.cpu_ratio*100,0) < :cpu_th
              OR COALESCE(lm.memory_ratio*100,0) < :mem_th
          )
          {az_filter}
        ORDER BY COALESCE(lm.cpu_ratio,0) ASC
        LIMIT 200
    """), {"cpu_th": cpu_threshold, "mem_th": mem_threshold, "az_name": az_name}).fetchall()

    return {
        "report_type": "idle_vms",
        "cpu_threshold": cpu_threshold,
        "mem_threshold": mem_threshold,
        "az_filter": az_name,
        "generated_at": datetime.utcnow().isoformat(),
        "total_idle": len(rows),
        "data": [
            {
                "vm_uuid": r.vm_uuid,
                "vm_name": r.vm_name,
                "group_name": r.group_name,
                "host_name": r.host_name,
                "az_name": r.az_name,
                "cpu_cores": r.cpu_cores or 0,
                "memory_total_gb": float(r.memory_total_gb or 0),
                "avg_cpu_pct": round(float(r.avg_cpu_pct or 0), 1),
                "avg_memory_pct": round(float(r.avg_memory_pct or 0), 1),
                "avg_storage_pct": round(float(r.avg_storage_pct or 0), 1),
                "idle_type": r.idle_type,
            }
            for r in rows
        ]
    }


# ============================================================
# Top Network Consumers Report
# ============================================================

@router.get("/network-top")
async def get_network_top(
    top_n: int = Query(20, ge=1, le=100),
    hours: int = Query(24, ge=1, le=720),
    az_name: str = Query("", description="Filter by AZ name"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Top VMs by network utilization."""
    az_filter = "AND az.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT
            vm.vm_uuid::text,
            vm.name AS vm_name,
            COALESCE(g.group_name, 'Unknown Group') AS group_name,
            az.az_name,
            ROUND(AVG(nm.rx_bitps) / 1024.0 / 1024.0, 2) AS avg_rx_mbps,
            ROUND(AVG(nm.tx_bitps) / 1024.0 / 1024.0, 2) AS avg_tx_mbps,
            ROUND(MAX(nm.rx_bitps) / 1024.0 / 1024.0, 2) AS max_rx_mbps,
            ROUND(MAX(nm.tx_bitps) / 1024.0 / 1024.0, 2) AS max_tx_mbps,
            ROUND((AVG(nm.rx_bitps) + AVG(nm.tx_bitps)) / 1024.0 / 1024.0, 2) AS avg_total_mbps,
            COUNT(nm.id) AS sample_count
        FROM metrics.vm_network_metrics nm
        JOIN sangfor.vm_master vm ON vm.vm_uuid = nm.vm_uuid
        LEFT JOIN sangfor.vm_group_master g ON g.group_id = vm.group_id
        LEFT JOIN sangfor.host_master h ON h.host_id = vm.host_id
        LEFT JOIN sangfor.az_master az ON az.az_id = h.az_id
        WHERE nm.collected_at >= NOW() - INTERVAL '1 hour' * :hours
          {az_filter}
        GROUP BY vm.vm_uuid, vm.name, g.group_name, az.az_name
        ORDER BY avg_total_mbps DESC
        LIMIT :top_n
    """), {"hours": hours, "top_n": top_n, "az_name": az_name}).fetchall()

    return {
        "report_type": "network_top",
        "hours": hours,
        "top_n": top_n,
        "az_filter": az_name,
        "generated_at": datetime.utcnow().isoformat(),
        "data": [
            {
                "vm_uuid": r.vm_uuid,
                "vm_name": r.vm_name,
                "group_name": r.group_name,
                "az_name": r.az_name,
                "avg_rx_mbps": float(r.avg_rx_mbps or 0),
                "avg_tx_mbps": float(r.avg_tx_mbps or 0),
                "max_rx_mbps": float(r.max_rx_mbps or 0),
                "max_tx_mbps": float(r.max_tx_mbps or 0),
                "avg_total_mbps": float(r.avg_total_mbps or 0),
                "sample_count": r.sample_count or 0,
            }
            for r in rows
        ]
    }


# ============================================================
# Oversized VMs Report
# ============================================================

@router.get("/oversized-vms")
async def get_oversized_vms(
    az_name: str = Query("", description="Filter by AZ name"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Report of VMs that are over-provisioned relative to actual usage."""
    az_filter = "AND az.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT
            ov.vm_uuid::text,
            ov.name AS vm_name,
            ov.group_name,
            ov.host_name,
            az.az_name,
            ov.cpu_cores,
            ov.memory_total_mb,
            ROUND(ov.avg_cpu_pct, 1)    AS avg_cpu_pct,
            ROUND(ov.max_cpu_pct, 1)    AS max_cpu_pct,
            ROUND(ov.avg_memory_pct, 1) AS avg_memory_pct,
            ROUND(ov.max_memory_pct, 1) AS max_memory_pct,
            ov.cpu_status,
            ov.memory_status
        FROM analytics.v_oversized_vms ov
        LEFT JOIN sangfor.vm_master vm ON vm.vm_uuid = ov.vm_uuid
        LEFT JOIN sangfor.host_master h ON h.host_id = vm.host_id
        LEFT JOIN sangfor.az_master az ON az.az_id = h.az_id
        WHERE 1=1 {az_filter}
        ORDER BY ov.avg_cpu_pct ASC
    """), {"az_name": az_name}).fetchall()

    return {
        "report_type": "oversized_vms",
        "az_filter": az_name,
        "generated_at": datetime.utcnow().isoformat(),
        "total": len(rows),
        "data": [
            {
                "vm_uuid": r.vm_uuid,
                "vm_name": r.vm_name,
                "group_name": r.group_name,
                "host_name": r.host_name,
                "az_name": r.az_name,
                "cpu_cores": r.cpu_cores or 0,
                "memory_total_gb": round(float(r.memory_total_mb or 0) / 1024, 1),
                "avg_cpu_pct": float(r.avg_cpu_pct or 0),
                "max_cpu_pct": float(r.max_cpu_pct or 0),
                "avg_memory_pct": float(r.avg_memory_pct or 0),
                "max_memory_pct": float(r.max_memory_pct or 0),
                "cpu_status": r.cpu_status or "normal",
                "memory_status": r.memory_status or "normal",
            }
            for r in rows
        ]
    }


# ============================================================
# Filter Helpers
# ============================================================

@router.get("/filter/az-list")
async def get_az_list(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of AZs for filter dropdowns."""
    rows = db.execute(text("""
        SELECT az_id::text, az_name
        FROM sangfor.az_master
        WHERE is_active = true
        ORDER BY az_name
    """)).fetchall()
    return {"data": [{"az_id": r.az_id, "az_name": r.az_name} for r in rows]}


@router.get("/filter/group-list")
async def get_group_list(
    az_name: str = Query(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of VM groups, optionally filtered by AZ."""
    az_filter = "AND az.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT DISTINCT g.group_id::text, g.group_name
        FROM sangfor.vm_group_master g
        LEFT JOIN sangfor.vm_master vm ON vm.group_id = g.group_id
        LEFT JOIN sangfor.host_master h ON h.host_id = vm.host_id
        LEFT JOIN sangfor.az_master az ON az.az_id = h.az_id
        WHERE 1=1 {az_filter}
        ORDER BY g.group_name
    """), {"az_name": az_name}).fetchall()
    return {"data": [{"group_id": r.group_id, "group_name": r.group_name} for r in rows]}


@router.get("/filter/host-list")
async def get_host_list(
    az_name: str = Query(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of hosts, optionally filtered by AZ."""
    az_filter = "AND az.az_name = :az_name" if az_name else ""
    rows = db.execute(text(f"""
        SELECT h.host_id, h.host_name, az.az_name
        FROM sangfor.host_master h
        LEFT JOIN sangfor.az_master az ON az.az_id = h.az_id
        WHERE h.is_active = true {az_filter}
        ORDER BY h.host_name
    """), {"az_name": az_name}).fetchall()
    return {"data": [{"host_id": r.host_id, "host_name": r.host_name, "az_name": r.az_name} for r in rows]}



# ============================================================
# 17. VM Historical Resource Analytics
# ============================================================

@router.get("/vm-historical-analytics/{vm_uuid}")
async def get_vm_historical_analytics(
    vm_uuid: str,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    interval: str = Query("hour", regex="^(hour|day)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get historical resource analytics for a specific VM.
    Provides detailed CPU, RAM, Disk, and Network timeseries data with aggregations.
    """
    # Date range validation (max 90 days)
    delta = end_date - start_date
    if delta.days > 90:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 90 days")
    if start_date >= end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    # Get VM Info
    vm_query = """
        SELECT vm.vm_uuid, vm.name, vm.os_name, vm.cpu_cores, vm.memory_total_mb,
               vm.power_state, h.host_name, g.group_name, az.az_name, d.name as datastore_name
        FROM sangfor.vm_master vm
        LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
        LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
        LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
        LEFT JOIN sangfor.datastore_master d ON vm.storage_id = d.datastore_id
        WHERE vm.vm_uuid = CAST(:vm_uuid AS uuid)
    """
    vm_row = db.execute(text(vm_query), {"vm_uuid": vm_uuid}).fetchone()
    if not vm_row:
        raise HTTPException(status_code=404, detail="VM not found")
        
    vm_map = dict(vm_row._mapping)
    vm_info = {
        "name": vm_map.get("name") or "",
        "uuid": str(vm_map.get("vm_uuid")),
        "os": vm_map.get("os_name") or "",
        "vcpu": vm_map.get("cpu_cores") or 0,
        "vram_gb": round(float(vm_map.get("memory_total_mb") or 0) / 1024, 2),
        "host": vm_map.get("host_name") or "",
        "datastore": vm_map.get("datastore_name") or "",
        "group": vm_map.get("group_name") or "",
        "az": vm_map.get("az_name") or "",
        "power_state": vm_map.get("power_state") or ""
    }

    # Summary
    summary_query = """
        SELECT
            AVG(m.cpu_ratio) as cpu_avg, MAX(m.cpu_ratio) as cpu_max, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.cpu_ratio) as cpu_p95,
            AVG(m.memory_ratio) as ram_avg, MAX(m.memory_ratio) as ram_max, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.memory_ratio) as ram_p95,
            AVG(m.disk_read_iops + m.disk_write_iops) as disk_iops_avg,
            AVG(m.network_read_bitps + m.network_write_bitps) as network_avg
        FROM metrics.vm_metrics m
        WHERE vm_uuid = CAST(:vm_uuid AS uuid) AND collected_at >= :start_date AND collected_at <= :end_date
    """
    s_row = db.execute(text(summary_query), {"vm_uuid": vm_uuid, "start_date": start_date, "end_date": end_date}).fetchone()
    summary = {
        "cpu_avg": 0, "cpu_max": 0, "cpu_p95": 0,
        "ram_avg": 0, "ram_max": 0, "ram_p95": 0,
        "disk_iops_avg": 0, "network_avg": 0
    }
    if s_row:
        s_map = dict(s_row._mapping)
        for k, v in s_map.items():
            summary[k] = float(v) if v is not None and hasattr(v, '__float__') else 0

    # Time series Data
    trunc_arg = 'hour' if interval == 'hour' else 'day'
    ts_query = f"""
        SELECT 
            date_trunc(:trunc_arg, collected_at) as timestamp,
            AVG(cpu_ratio) as cpu_avg, MAX(cpu_ratio) as cpu_max,
            AVG(memory_ratio) as ram_avg,
            AVG(disk_read_iops) as disk_read_iops, AVG(disk_write_iops) as disk_write_iops,
            AVG(disk_read_byteps) as disk_read_bps, AVG(disk_write_byteps) as disk_write_bps,
            AVG(network_read_bitps) as net_rx, AVG(network_write_bitps) as net_tx
        FROM metrics.vm_metrics
        WHERE vm_uuid = CAST(:vm_uuid AS uuid) AND collected_at >= :start_date AND collected_at <= :end_date
        GROUP BY date_trunc(:trunc_arg, collected_at)
        ORDER BY timestamp ASC
    """
    ts_result = db.execute(text(ts_query), {"vm_uuid": vm_uuid, "start_date": start_date, "end_date": end_date, "trunc_arg": trunc_arg})
    timeseries = []
    
    for row in ts_result.fetchall():
        d = dict(row._mapping)
        ts_dict = {
            "timestamp": d["timestamp"].isoformat() if d["timestamp"] else "",
            "cpu_avg": float(d["cpu_avg"] or 0),
            "cpu_max": float(d["cpu_max"] or 0),
            "ram_avg": float(d["ram_avg"] or 0),
            "disk_read_iops": float(d["disk_read_iops"] or 0),
            "disk_write_iops": float(d["disk_write_iops"] or 0),
            "disk_read_bps": float(d["disk_read_bps"] or 0),
            "disk_write_bps": float(d["disk_write_bps"] or 0),
            "net_rx": float(d["net_rx"] or 0),
            "net_tx": float(d["net_tx"] or 0),
        }
        timeseries.append(ts_dict)

    return {
        "report_type": "vm_historical_analytics",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "interval": interval,
        "vm_info": vm_info,
        "summary": summary,
        "timeseries": timeseries
    }


# ============================================================
# Report Types List
# ============================================================

@router.get("/types")
async def get_report_types(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of available report types."""
    return {
        "report_types": [
            {"id": "vm_resource_usage", "name": "รายงานการใช้ทรัพยากร VM", "description": "CPU, RAM, Storage, Network ราย VM", "category": "resource", "endpoint": "/reports/vm-resource/{vm_uuid}", "icon": "Assessment", "requires_vm": True},
            {"id": "top_vms", "name": "รายงาน Top VMs", "description": "VM ที่ใช้ทรัพยากรสูงสุด", "category": "resource", "endpoint": "/reports/top-vms", "icon": "TrendingUp", "requires_vm": False},
            {"id": "inventory", "name": "รายงาน Inventory", "description": "สรุปจำนวน VM, Host, ทรัพยากร", "category": "infrastructure", "endpoint": "/reports/inventory", "icon": "Inventory", "requires_vm": False},
            {"id": "datastore_capacity", "name": "รายงาน Datastore Capacity", "description": "พื้นที่จัดเก็บข้อมูล", "category": "infrastructure", "endpoint": "/reports/datastore-capacity", "icon": "Storage", "requires_vm": False},
            {"id": "host_capacity", "name": "รายงาน Host Capacity", "description": "ทรัพยากร Host และ VM Density", "category": "infrastructure", "endpoint": "/reports/host-capacity", "icon": "Dns", "requires_vm": False},
            {"id": "alarm_summary", "name": "รายงาน Alarm Summary", "description": "สรุป Alarm ตาม Severity", "category": "alarm", "endpoint": "/reports/alarm-summary", "icon": "Warning", "requires_vm": False},
            {"id": "protection_status", "name": "รายงาน Protection Status", "description": "สถานะ DR/Backup ของ VM", "category": "protection", "endpoint": "/reports/protection-status", "icon": "Security", "requires_vm": False},
            {"id": "vm_control_actions", "name": "รายงาน VM Control Actions", "description": "ประวัติการ Start/Stop/Reboot VM", "category": "operational", "endpoint": "/reports/vm-control-actions", "icon": "History", "requires_vm": False},
            {"id": "sync_status", "name": "รายงาน Sync Status", "description": "ประวัติการ Sync ข้อมูล", "category": "operational", "endpoint": "/reports/sync-status", "icon": "Sync", "requires_vm": False},
            {"id": "executive_summary", "name": "รายงานสรุปผู้บริหาร", "description": "ภาพรวม KPIs ทุกด้าน", "category": "executive", "endpoint": "/reports/executive-summary", "icon": "Dashboard", "requires_vm": False},
            {"id": "az_summary", "name": "รายงานสรุปตาม AZ", "description": "ภาพรวมทรัพยากรแยกตาม Availability Zone", "category": "infrastructure", "endpoint": "/reports/az-summary", "icon": "CloudQueue", "requires_vm": False},
            {"id": "group_summary", "name": "รายงานสรุปตามกลุ่ม VM", "description": "ทรัพยากรรวม CPU, RAM, Storage แยกตาม VM Group", "category": "resource", "endpoint": "/reports/group-summary", "icon": "Folder", "requires_vm": False},
            {"id": "host_detail", "name": "รายงาน Host Resource Detail", "description": "CPU, RAM, VM Density และ Health Status รายละเอียด Host", "category": "infrastructure", "endpoint": "/reports/host-detail", "icon": "DnsOutlined", "requires_vm": False},
            {"id": "idle_vms", "name": "รายงาน VM ที่ใช้งานน้อย", "description": "VM ที่ใช้ CPU/RAM ต่ำกว่าเป้า — โอกาส Right-Sizing", "category": "resource", "endpoint": "/reports/idle-vms", "icon": "PauseCircle", "requires_vm": False},
            {"id": "oversized_vms", "name": "รายงาน VM Over-Provisioned", "description": "VM ที่จัดสรร CPU/RAM เกินความต้องการจริง", "category": "resource", "endpoint": "/reports/oversized-vms", "icon": "SpeedOutlined", "requires_vm": False},
            {"id": "network_top", "name": "รายงาน Top Network Usage", "description": "VM ที่ใช้ network bandwidth สูงสุด", "category": "resource", "endpoint": "/reports/network-top", "icon": "NetworkCheck", "requires_vm": False},
            {"id": "vm_historical_analytics", "name": "รายงาน VM Historical Resource Analytics", "description": "วิเคราะห์การใช้ทรัพยากรย้อนหลังแบบเจาะลึก 1 VM", "category": "resource", "endpoint": "/reports/vm-historical-analytics/{vm_uuid}", "icon": "Timeline", "requires_vm": True},
        ]
    }
