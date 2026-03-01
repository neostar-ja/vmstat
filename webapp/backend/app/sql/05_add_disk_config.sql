-- ============================================================
-- VM Disk Configuration Table
-- Stores individual disk information for each VM
-- ============================================================

CREATE TABLE IF NOT EXISTS sangfor.vm_disk_config (
    id SERIAL PRIMARY KEY,
    vm_uuid UUID REFERENCES sangfor.vm_master(vm_uuid) ON DELETE CASCADE,
    disk_id VARCHAR(50) NOT NULL,
    storage_id VARCHAR(100),
    storage_name VARCHAR(255),
    storage_file VARCHAR(255),
    size_mb BIGINT DEFAULT 0,
    preallocate VARCHAR(50) DEFAULT 'metadata',
    eagerly_scrub INTEGER DEFAULT 0,
    physical_disk_type VARCHAR(50),
    storage_tag_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vm_uuid, disk_id)
);

CREATE INDEX IF NOT EXISTS idx_vm_disk_config_vm ON sangfor.vm_disk_config(vm_uuid);
CREATE INDEX IF NOT EXISTS idx_vm_disk_config_storage ON sangfor.vm_disk_config(storage_id);

COMMENT ON TABLE sangfor.vm_disk_config IS 'Individual disk configuration for each VM';
