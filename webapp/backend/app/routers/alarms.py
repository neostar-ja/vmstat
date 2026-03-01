"""
Alarms Router - API endpoints for System, Host, and VM Alarms & Platform Alerts
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from ..database import get_db
from ..utils.auth import get_current_user

router = APIRouter(prefix="/alarms", tags=["Alarms"])


@router.get("")
async def get_alarms(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    source: Optional[str] = None,
    alarm_type: Optional[str] = None,   # "alarm" (has severity) or "alert" (no severity)
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get paginated list of all alarms (VM + Host + System).
    - alarm_type=alarm  → items WITH severity (p1/p2/p3)
    - alarm_type=alert  → platform events WITHOUT severity (null)
    Uses v_unified_alarms view.
    """
    conditions = ["1=1"]
    params = {}

    if status:
        conditions.append("a.status = :status")
        params["status"] = status

    if severity:
        conditions.append("a.severity = :severity")
        params["severity"] = severity

    if source:
        conditions.append("a.source = :source")
        params["source"] = source

    if alarm_type == "alarm":
        conditions.append("a.severity IS NOT NULL")
    elif alarm_type == "alert":
        conditions.append("a.severity IS NULL")

    if search:
        conditions.append(
            "(a.title ILIKE :search OR a.resource_name ILIKE :search OR a.description ILIKE :search)"
        )
        params["search"] = f"%{search}%"

    where_clause = " AND ".join(conditions)

    # Count total
    count_query = f"""
        SELECT COUNT(*)
        FROM sangfor.v_unified_alarms a
        WHERE {where_clause}
    """
    total = db.execute(text(count_query), params).scalar()

    # Paginate
    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    data_query = f"""
        SELECT
            a.alarm_id,
            CAST(a.vm_uuid AS text) AS vm_uuid,
            a.resource_id,
            a.resource_name,
            v.group_name,
            a.source,
            a.severity,
            a.title,
            a.description,
            a.status,
            a.object_type,
            a.begin_time,
            a.end_time,
            a.alert_count,
            a.recommendation,
            a.created_at,
            a.updated_at
        FROM sangfor.v_unified_alarms a
        LEFT JOIN analytics.v_vm_overview v
            ON a.vm_uuid = v.vm_uuid AND a.source IN ('vm', 'system')
        WHERE {where_clause}
        ORDER BY
            a.begin_time DESC NULLS LAST,
            CASE WHEN a.status = 'open' THEN 1 ELSE 2 END,
            CASE a.severity WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 ELSE 4 END,
            a.created_at DESC
        LIMIT :limit OFFSET :offset
    """

    result = db.execute(text(data_query), params)
    items = [dict(row._mapping) for row in result.fetchall()]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/summary")
async def get_alarm_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get summary counts of alarms by severity, source, and type.
    """
    query = """
        SELECT
            COUNT(*)                                                              AS total,
            COUNT(CASE WHEN status = 'open' THEN 1 END)                          AS open_total,
            COUNT(CASE WHEN status = 'open' AND severity = 'p1' THEN 1 END)     AS open_p1,
            COUNT(CASE WHEN status = 'open' AND severity = 'p2' THEN 1 END)     AS open_p2,
            COUNT(CASE WHEN status = 'open' AND severity = 'p3' THEN 1 END)     AS open_p3,
            COUNT(CASE WHEN status = 'open' AND severity IS NOT NULL THEN 1 END) AS open_alarms,
            COUNT(CASE WHEN status = 'open' AND severity IS NULL THEN 1 END)     AS open_alerts,
            COUNT(CASE WHEN status = 'open' AND source = 'system' THEN 1 END)   AS open_system,
            COUNT(CASE WHEN status = 'open' AND source = 'host' THEN 1 END)     AS open_host,
            COUNT(CASE WHEN status = 'open' AND source = 'vm' THEN 1 END)       AS open_vm,
            COUNT(CASE WHEN status = 'closed' THEN 1 END)                        AS closed_total
        FROM sangfor.v_unified_alarms
    """
    result = db.execute(text(query))
    row = result.fetchone()
    return dict(row._mapping) if row else {}


@router.get("/{alarm_id}")
async def get_alarm_detail(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information for a specific alarm by ID.
    """
    query = """
        SELECT
            a.alarm_id,
            CAST(a.vm_uuid AS text) AS vm_uuid,
            a.resource_id,
            a.resource_name,
            v.group_name,
            a.source,
            a.severity,
            a.title,
            a.description,
            a.status,
            a.object_type,
            a.begin_time,
            a.end_time,
            a.alert_count,
            a.recommendation,
            a.created_at,
            a.updated_at
        FROM sangfor.v_unified_alarms a
        LEFT JOIN analytics.v_vm_overview v
            ON a.vm_uuid = v.vm_uuid
        WHERE a.alarm_id = :alarm_id
    """
    result = db.execute(text(query), {"alarm_id": alarm_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    return dict(row._mapping)


@router.get("/vm/{vm_uuid}")
async def get_vm_alarms(
    vm_uuid: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all alarms for a specific VM, split into policy alarms (with severity)
    and platform alerts (no severity).
    """
    conditions = ["a.vm_uuid = CAST(:vm_uuid AS uuid)"]
    params: dict = {"vm_uuid": vm_uuid}

    if status:
        conditions.append("a.status = :status")
        params["status"] = status
    else:
        conditions.append("a.status = 'open'")

    where_clause = " AND ".join(conditions)

    query = f"""
        SELECT
            a.alarm_id,
            a.source,
            a.severity,
            a.title,
            a.description,
            a.status,
            a.object_type,
            a.begin_time,
            a.end_time,
            a.alert_count,
            a.recommendation,
            a.created_at,
            a.updated_at
        FROM sangfor.vm_alarms a
        WHERE {where_clause}
        ORDER BY
            CASE WHEN a.status = 'open' THEN 1 ELSE 2 END,
            CASE a.severity WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 ELSE 4 END,
            a.begin_time DESC NULLS LAST
    """

    result = db.execute(text(query), params)
    rows = [dict(row._mapping) for row in result.fetchall()]

    # Split: alarms = policy-based (has severity), alerts = platform events (no severity)
    alarms = [r for r in rows if r.get("severity")]
    alerts = [r for r in rows if not r.get("severity")]

    return {
        "vm_uuid": vm_uuid,
        "alarms": alarms,
        "alerts": alerts,
        "total_alarms": len(alarms),
        "total_alerts": len(alerts),
    }
