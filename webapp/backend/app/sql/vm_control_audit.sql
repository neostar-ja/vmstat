-- VM Control Audit Log Table
-- Run this migration to create the audit table for VM control actions

CREATE TABLE IF NOT EXISTS webapp.vm_control_audit (
    id            SERIAL PRIMARY KEY,
    vm_uuid       UUID NOT NULL,
    vm_name       TEXT,
    action        TEXT NOT NULL,          -- start | stop | shutdown | reboot | reset
    performed_by  TEXT NOT NULL,          -- username
    success       BOOLEAN NOT NULL DEFAULT TRUE,
    message       TEXT,
    dry_run       BOOLEAN NOT NULL DEFAULT FALSE,
    task_id       TEXT,                   -- Sangfor async task ID
    performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vm_control_audit_vm_uuid ON webapp.vm_control_audit(vm_uuid);
CREATE INDEX IF NOT EXISTS idx_vm_control_audit_performed_at ON webapp.vm_control_audit(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vm_control_audit_performed_by ON webapp.vm_control_audit(performed_by);

COMMENT ON TABLE webapp.vm_control_audit IS 'Audit log for VM control actions (start/stop/shutdown/reboot/reset)';
COMMENT ON COLUMN webapp.vm_control_audit.dry_run IS 'TRUE = simulated/test mode, no actual action taken';
COMMENT ON COLUMN webapp.vm_control_audit.task_id IS 'Sangfor SCP async task ID for tracking';
