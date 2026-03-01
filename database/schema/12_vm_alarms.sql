-- Create VM Alarms table to store history and status
CREATE TABLE IF NOT EXISTS sangfor.vm_alarms (
    alarm_id SERIAL PRIMARY KEY,
    vm_uuid UUID NOT NULL REFERENCES sangfor.vm_master(vm_uuid) ON DELETE CASCADE,
    external_alarm_id TEXT, -- Use or generate a unique ID from title+time if external ID missing
    source TEXT NOT NULL, -- 'vm' or 'system'
    severity TEXT, -- 'p1', 'p2', etc.
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed'
    object_type TEXT,
    begin_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE, -- When the alarm was cleared
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_vm_alarms_vm_uuid ON sangfor.vm_alarms(vm_uuid);
CREATE INDEX IF NOT EXISTS idx_vm_alarms_status ON sangfor.vm_alarms(status);
CREATE INDEX IF NOT EXISTS idx_vm_alarms_begin_time ON sangfor.vm_alarms(begin_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vm_alarms_dedup ON sangfor.vm_alarms(vm_uuid, title, begin_time);

COMMENT ON TABLE sangfor.vm_alarms IS 'Stores history of VM alarms and warnings from Sangfor SCP';
