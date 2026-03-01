"""
VM Control Router - API endpoints for controlling VMs via Sangfor SCP API
Based on the guideline code pattern for vm start/stop/shutdown/reboot/reset
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
import requests
import urllib3
import time
import logging

from ..database import get_db, SessionLocal
from ..utils.auth import get_current_user, require_role
from ..config import get_settings
from ..services.sync_v2.sangfor_client import SangforClient, SangforCredentials

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vms", tags=["VM Control"])

# =====================
# Schemas
# =====================

VMActionType = Literal["start", "stop", "shutdown", "reboot"]

class VMControlRequest(BaseModel):
    action: VMActionType
    dry_run: bool = False  # ถ้า True จะจำลองผลเท่านั้น ไม่สั่งจริง

class VMControlResponse(BaseModel):
    success: bool
    action: str
    vm_uuid: str
    vm_name: Optional[str] = None
    task_id: Optional[str] = None
    message: str
    dry_run: bool = False
    timestamp: str
    expected_power_state: Optional[str] = None  # 'on' / 'off' — for frontend optimistic update

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    message: Optional[str] = None
    result: Optional[dict] = None

# =====================
# Sangfor API Client
# =====================

class SCPVMController:
    """Controller for Sangfor SCP VM operations"""

    def __init__(self, scp_ip: str, token: str):
        self.scp_ip = scp_ip
        self.token = token
        # Versioned endpoint that accepts UUIDs; 20190725 does NOT support control actions
        self.base_url = f"https://{scp_ip}/janus/20180725"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Token {token}",
        }

    def _post(self, endpoint: str, payload: dict = None, timeout: int = 60) -> dict:
        url = f"{self.base_url}{endpoint}"
        resp = requests.post(url, json=payload, headers=self.headers, verify=False, timeout=timeout)
        resp.raise_for_status()
        return resp.json()

    def _get(self, endpoint: str, timeout: int = 60) -> dict:
        url = f"{self.base_url}{endpoint}"
        resp = requests.get(url, headers=self.headers, verify=False, timeout=timeout)
        resp.raise_for_status()
        return resp.json()

    # All action methods take vm_uuid (UUID string), NOT the numeric vm_id
    def start_vm(self, vm_uuid: str) -> dict:
        return self._post(f"/servers/{vm_uuid}/start")

    def stop_vm(self, vm_uuid: str) -> dict:
        # Sangfor SCP treats "stop" as off. We pass force=True for "Force Stop"
        return self._post(f"/servers/{vm_uuid}/stop", payload={"force": True})

    def shutdown_vm(self, vm_uuid: str) -> dict:
        # Graceful shutdown uses stop but with force=False
        return self._post(f"/servers/{vm_uuid}/stop", payload={"force": False})

    def reboot_vm(self, vm_uuid: str) -> dict:
        return self._post(f"/servers/{vm_uuid}/reboot")

    def reset_vm(self, vm_uuid: str) -> dict:
        return self._post(f"/servers/{vm_uuid}/reset")

    def get_task_status(self, task_id: str) -> dict:
        """Get async task status from Sangfor API"""
        # Tasks endpoint uses unversioned /janus path
        url = f"https://{self.scp_ip}/janus/tasks/{task_id}"
        resp = requests.get(url, headers=self.headers, verify=False, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        return result.get("data", result)

    def wait_for_task(self, task_id: str, max_wait: int = 120) -> dict:
        """Poll task until done or timeout"""
        elapsed = 0
        while elapsed < max_wait:
            data = self.get_task_status(task_id)
            status = data.get("status", "")
            if status in ("success", "failed", "error"):
                return data
            time.sleep(3)
            elapsed += 3
        return {"status": "timeout", "message": "Task timeout"}


# =====================
# Audit Log
# =====================

def _log_action(db: Session, vm_uuid: str, vm_name: str, action: str,
                user: str, success: bool, message: str, dry_run: bool,
                task_id: Optional[str] = None):
    """Write to vm_control_audit table"""
    try:
        db.execute(text("""
            INSERT INTO webapp.vm_control_audit
                (vm_uuid, vm_name, action, performed_by, success, message, dry_run, task_id, performed_at)
            VALUES
                (:vm_uuid, :vm_name, :action, :user, :success, :message, :dry_run, :task_id, NOW())
        """), {
            "vm_uuid": vm_uuid,
            "vm_name": vm_name,
            "action": action,
            "user": user,
            "success": success,
            "message": message,
            "dry_run": dry_run,
            "task_id": task_id
        })
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to write audit log: {e}")
        db.rollback()


def _get_vm_info(db: Session, vm_uuid: str) -> dict:
    """Get basic VM info from DB.
    power_state lives in metrics.vm_metrics (not sangfor.vm_master),
    so we do a lateral join to get the latest value.
    """
    result = db.execute(text("""
        SELECT
            CAST(vm.vm_uuid AS text) AS vm_uuid,
            vm.name,
            COALESCE(m.power_state, 'unknown') AS power_state
        FROM sangfor.vm_master vm
        LEFT JOIN LATERAL (
            SELECT power_state
            FROM metrics.vm_metrics
            WHERE vm_uuid = vm.vm_uuid
            ORDER BY collected_at DESC
            LIMIT 1
        ) m ON TRUE
        WHERE vm.vm_uuid = CAST(:uuid AS uuid)
          AND vm.is_deleted = false
        LIMIT 1
    """), {"uuid": vm_uuid}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail=f"VM not found: {vm_uuid}")

    return {
        "vm_uuid": result.vm_uuid,
        "name": result.name or "Unknown",
        "power_state": result.power_state,
    }


# =====================
# API Endpoints
# =====================

@router.post("/{vm_uuid}/control", response_model=VMControlResponse)
async def control_vm(
    vm_uuid: str,
    request: VMControlRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))  # ต้องเป็น manager หรือ admin เท่านั้น
):
    """
    Control a VM: start / stop / shutdown / reboot
    Set dry_run=true to simulate without actually sending the command
    """
    settings = get_settings()
    username = current_user.get("username", "unknown")
    action = request.action
    dry_run = request.dry_run

    # Get VM info from DB
    vm_info = _get_vm_info(db, vm_uuid)
    vm_name = vm_info["name"]
    power_state = vm_info["power_state"]

    # Validate action vs current state (best-effort; DB state may be up to 5 min stale.
    # We still check to catch obvious mistakes, but rely on SCP's response for authoritative state.)
    _validate_action(action, power_state)

    timestamp = datetime.utcnow().isoformat() + "Z"

    # ===== DRY RUN MODE =====
    if dry_run:
        message = f"[DRY RUN] Action '{action}' on VM '{vm_name}' simulated successfully."
        _log_action(db, vm_uuid, vm_name, action, username, True, message, dry_run=True)
        return VMControlResponse(
            success=True,
            action=action,
            vm_uuid=vm_uuid,
            vm_name=vm_name,
            task_id=None,
            message=message,
            dry_run=True,
            timestamp=timestamp
        )

    # ===== REAL EXECUTION =====
    if not settings.SCP_IP:
        raise HTTPException(status_code=503, detail="SCP_IP not configured. Please configure SCP credentials in settings.")

    # Try explicit token first; fall back to dynamic auth with username/password
    scp_token = getattr(settings, "SCP_TOKEN", "") or ""
    if not scp_token:
        # Dynamically authenticate using sync service credentials
        try:
            creds = SangforCredentials(
                ip=settings.SCP_IP,
                username=getattr(settings, "SCP_USERNAME", ""),
                password=getattr(settings, "SCP_PASSWORD", "")
            )
            client = SangforClient(creds)
            scp_token = client.authenticate()
        except Exception as auth_err:
            raise HTTPException(
                status_code=503,
                detail=f"Cannot authenticate with SCP ({settings.SCP_IP}): {str(auth_err)[:150]}"
            )

    try:
        controller = SCPVMController(scp_ip=settings.SCP_IP, token=scp_token)

        # Execute action using VM UUID (not numeric vm_id)
        result = _execute_action(controller, action, vm_uuid)

        result = result.get("data", result) if isinstance(result, dict) else {}
        task_id = result.get("task_id")
        message = f"Action '{action}' sent to VM '{vm_name}' successfully."
        if task_id:
            message += f" Task ID: {task_id}"

        _log_action(db, vm_uuid, vm_name, action, username, True, message, dry_run=False, task_id=task_id)

        # ── Instant state update ──────────────────────────────────────────────
        # 1. Write expected power_state to vm_latest_metrics so the next GET /vms
        #    returns the correct state without waiting for the sync cycle.
        _update_vm_pending_state(db, vm_uuid, action)
        # 2. Refresh the materialized view in background (non-blocking).
        background_tasks.add_task(_refresh_mv_background)
        # ─────────────────────────────────────────────────────────────────────

        expected_ps, _ = _ACTION_STATE.get(action, (None, None))
        return VMControlResponse(
            success=True,
            action=action,
            vm_uuid=vm_uuid,
            vm_name=vm_name,
            task_id=task_id,
            message=message,
            dry_run=False,
            timestamp=timestamp,
            expected_power_state=expected_ps
        )

    except requests.exceptions.ConnectionError as e:
        msg = f"Cannot connect to SCP ({settings.SCP_IP}): {str(e)[:120]}"
        logger.error(f"[VM Control] ConnectionError for {vm_uuid}: {e}")
        _log_action(db, vm_uuid, vm_name, action, username, False, msg, dry_run=False)
        raise HTTPException(status_code=502, detail=msg)

    except requests.exceptions.HTTPError as e:
        # Extract the actual Sangfor error message from the response body
        scp_status = e.response.status_code if e.response else 500
        scp_body = {}
        scp_msg = str(e)
        try:
            scp_body = e.response.json() if e.response else {}
            scp_msg = scp_body.get("message") or scp_body.get("detail") or str(e)
        except Exception:
            scp_msg = e.response.text[:200] if e.response else str(e)

        logger.error(f"[VM Control] SCP HTTPError {scp_status} for action '{action}' on {vm_uuid}: {scp_msg} | body: {scp_body}")

        # Sangfor 4xx = client/state error (VM already in target state, operation in progress, etc.)
        # Map these to 400 so the frontend shows the real message
        if scp_status < 500:
            user_msg = f"SCP rejected '{action}': {scp_msg}"
            _log_action(db, vm_uuid, vm_name, action, username, False, user_msg, dry_run=False)
            raise HTTPException(status_code=400, detail=user_msg)

        # Sangfor 5xx = upstream server error
        msg = f"SCP server error ({scp_status}): {scp_msg}"
        _log_action(db, vm_uuid, vm_name, action, username, False, msg, dry_run=False)
        raise HTTPException(status_code=502, detail=msg)

    except Exception as e:
        msg = f"Unexpected error executing '{action}': {str(e)[:200]}"
        logger.error(f"[VM Control] Unexpected error for {vm_uuid} action '{action}': {e}", exc_info=True)
        _log_action(db, vm_uuid, vm_name, action, username, False, msg, dry_run=False)
        raise HTTPException(status_code=500, detail=msg)


@router.get("/{vm_uuid}/control/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    vm_uuid: str,
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Poll the status of an async task from Sangfor SCP"""
    settings = get_settings()
    scp_token = getattr(settings, "SCP_TOKEN", "") or ""

    if not settings.SCP_IP or not scp_token:
        raise HTTPException(status_code=503, detail="SCP not configured")

    try:
        controller = SCPVMController(scp_ip=settings.SCP_IP, token=scp_token)
        data = controller.get_task_status(task_id)
        return TaskStatusResponse(
            task_id=task_id,
            status=data.get("status", "unknown"),
            message=data.get("message"),
            result=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/control/logs")
async def get_control_logs(
    vm_uuid: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get VM control audit logs"""
    try:
        where = "WHERE 1=1"
        params: dict = {"limit": limit}
        if vm_uuid:
            where += " AND vm_uuid = :vm_uuid"
            params["vm_uuid"] = vm_uuid

        rows = db.execute(text(f"""
            SELECT id, vm_uuid, vm_name, action, performed_by,
                   success, message, dry_run, task_id, performed_at
            FROM webapp.vm_control_audit
            {where}
            ORDER BY performed_at DESC
            LIMIT :limit
        """), params).fetchall()

        return {
            "data": [
                {
                    "id": r.id,
                    "vm_uuid": str(r.vm_uuid),
                    "vm_name": r.vm_name,
                    "action": r.action,
                    "performed_by": r.performed_by,
                    "success": r.success,
                    "message": r.message,
                    "dry_run": r.dry_run,
                    "task_id": r.task_id,
                    "performed_at": r.performed_at.isoformat() if r.performed_at else None
                }
                for r in rows
            ],
            "total": len(rows)
        }
    except Exception as e:
        logger.error(f"Failed to get control logs: {e}")
        return {"data": [], "total": 0, "error": str(e)}


# =====================
# Helpers
# =====================

# Expected power_state/status after each action
_ACTION_STATE: dict = {
    "start":    ("on",  "running"),
    "stop":     ("off", "stopped"),
    "shutdown": ("off", "stopped"),
    "reboot":   ("on",  "running"),
}


def _update_vm_pending_state(db: Session, vm_uuid: str, action: str):
    """
    Immediately write the expected power state so the materialized view reflects
    the new state after the next REFRESH, without waiting for the sync cycle.

    Strategy:
      1. Upsert metrics.vm_latest_metrics (for any direct readers).
      2. INSERT a new row into metrics.vm_metrics copying the latest real metrics
         but overriding power_state/status. The view v_vm_overview uses
         DISTINCT ON (vm_uuid) ORDER BY collected_at DESC, so this newer row
         wins on the next MV refresh.
    """
    power_state, status = _ACTION_STATE.get(action, ("unknown", "unknown"))
    is_stopped = (power_state == "off")
    try:
        # ── 1. Upsert vm_latest_metrics ────────────────────────────────────────
        db.execute(text("""
            INSERT INTO metrics.vm_latest_metrics (
                vm_uuid, collected_at, power_state, status,
                uptime_seconds, cpu_ratio, cpu_used_mhz,
                memory_ratio, memory_used_mb,
                storage_ratio, storage_used_mb,
                network_read_bitps, network_write_bitps,
                disk_read_iops, disk_write_iops
            )
            VALUES (
                CAST(:uuid AS uuid), CURRENT_TIMESTAMP, :power_state, :status,
                NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            )
            ON CONFLICT (vm_uuid) DO UPDATE SET
                collected_at = CURRENT_TIMESTAMP,
                power_state  = EXCLUDED.power_state,
                status       = EXCLUDED.status
        """), {"uuid": vm_uuid, "power_state": power_state, "status": status})

        # ── 2. Insert into vm_metrics (feeds the materialized view) ────────────
        # Copies existing metrics columns so we don't drop cpu/mem values;
        # uses CURRENT_TIMESTAMP + 1s so DISTINCT ON picks this row as newest.
        # Falls back to a minimal row if no previous metrics exist.
        db.execute(text("""
            INSERT INTO metrics.vm_metrics (
                collected_at, vm_uuid, power_state, status, is_stopped,
                uptime_seconds,
                cpu_total_mhz, cpu_used_mhz, cpu_ratio,
                memory_total_mb, memory_used_mb, memory_ratio,
                storage_total_mb, storage_used_mb, storage_file_size_mb, storage_ratio,
                network_read_bitps, network_write_bitps,
                disk_read_byteps, disk_write_byteps,
                disk_read_iops, disk_write_iops,
                gpu_count, gpu_mem_total, gpu_mem_used, gpu_mem_ratio, gpu_ratio,
                host_id, host_name
            )
            SELECT
                CURRENT_TIMESTAMP + interval '1 second',
                vm_uuid,
                :power_state,
                :status,
                :is_stopped,
                uptime_seconds,
                cpu_total_mhz, cpu_used_mhz, cpu_ratio,
                memory_total_mb, memory_used_mb, memory_ratio,
                storage_total_mb, storage_used_mb, storage_file_size_mb, storage_ratio,
                network_read_bitps, network_write_bitps,
                disk_read_byteps, disk_write_byteps,
                disk_read_iops, disk_write_iops,
                gpu_count, gpu_mem_total, gpu_mem_used, gpu_mem_ratio, gpu_ratio,
                host_id, host_name
            FROM metrics.vm_metrics
            WHERE vm_uuid = CAST(:uuid AS uuid)
            ORDER BY collected_at DESC
            LIMIT 1
        """), {"uuid": vm_uuid, "power_state": power_state,
               "status": status, "is_stopped": is_stopped})

        db.commit()
        logger.info(f"[VM Control] Pending state '{power_state}' written for {vm_uuid} (vm_metrics + vm_latest_metrics)")
    except Exception as e:
        logger.warning(f"[VM Control] Failed to write pending state for {vm_uuid}: {e}")
        try:
            db.rollback()
        except Exception:
            pass


def _refresh_mv_background():
    """Refresh mv_vm_overview in a background task (uses its own DB session)."""
    db = SessionLocal()
    try:
        db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_vm_overview"))
        db.commit()
        logger.info("[VM Control] mv_vm_overview refreshed after control action")
    except Exception as e:
        logger.warning(f"[VM Control] MV refresh failed: {e}")
    finally:
        db.close()


def _validate_action(action: str, power_state: str):
    """Best-effort validation based on DB state (may be stale).
    Only block if we're confident about the state.
    Stale state means we skip and let SCP decide.
    """
    # If state is unknown or transitioning, always allow (SCP will reject if invalid)
    if power_state in ('unknown', 'transitioning', 'starting', 'stopping', 'suspended', ''):
        return

    is_on = power_state in ("on", "running", "started", "poweredon")
    is_off = power_state in ("off", "stopped", "shutdown", "poweredoff")

    if action == "start" and is_on:
        raise HTTPException(status_code=400, detail="VM is already running. Cannot start again.")
    if action in ("stop", "shutdown", "reboot") and is_off:
        raise HTTPException(
            status_code=400,
            detail=f"VM is already stopped. Cannot perform '{action}'. (Note: state may be stale — try refreshing.)"
        )


def _execute_action(controller: SCPVMController, action: str, vm_id: str) -> dict:
    """Execute the action via SCP API.
    Sangfor SCP supports: start, stop, shutdown, reboot.
    Note: 'reset' is NOT supported by Sangfor SCP API v20180725.
    """
    handlers = {
        "start":    controller.start_vm,
        "stop":     controller.stop_vm,
        "shutdown": controller.shutdown_vm,
        "reboot":   controller.reboot_vm,
    }
    handler = handlers.get(action)
    if not handler:
        raise HTTPException(status_code=400, detail=f"Unknown or unsupported action: '{action}'. Supported: start, stop, shutdown, reboot.")
    return handler(vm_id)
