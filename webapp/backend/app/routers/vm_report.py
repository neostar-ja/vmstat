from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from enum import Enum
from ..database import get_db
from ..utils.auth import get_current_user
from ..services.vm_report_service import VMReportService

router = APIRouter(prefix="/reports", tags=["Enterprise VM Report"])

class IntervalEnum(str, Enum):
    hour = "hour"
    day = "day"

@router.get("/vm-full-report/{vm_uuid}")
async def get_vm_full_report(
    vm_uuid: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    interval: IntervalEnum = Query(IntervalEnum.hour, description="Interval: hour or day"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get the full enterprise intelligence report for a single VM.
    Aggregates snapshot, performance, capacity, optimization, health, and operations data.
    """
    try:
        data = VMReportService.get_full_report(db, vm_uuid, start_date, end_date, interval.value)
        if not data:
            raise HTTPException(status_code=404, detail="VM not found")
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
