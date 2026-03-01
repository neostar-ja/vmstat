-- ============================================================
-- Sangfor SCP Static/Master Tables
-- 
-- These tables store relatively static data that changes infrequently
-- Separated from time-series metrics for efficient querying
-- ============================================================

-- Connect to database first
-- \c sangfor_scp

-- ============================================================
-- 1. Availability Zone Master
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.az_master (
    az_id           UUID PRIMARY KEY,
    az_name         VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_az_name ON sangfor.az_master(az_name);

COMMENT ON TABLE sangfor.az_master IS 'Availability Zone master data (e.g., HCI-DC)';

-- ============================================================
-- 2. Host Master
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.host_master (
    host_id         VARCHAR(50) PRIMARY KEY,  -- e.g., host-34800d327960
    host_name       VARCHAR(50) NOT NULL,      -- IP or hostname, e.g., 10.251.204.11
    az_id           UUID REFERENCES sangfor.az_master(az_id),
    host_type       VARCHAR(20) DEFAULT 'hci',
    cpu_total_mhz   NUMERIC(12,2),
    memory_total_mb NUMERIC(12,2),
    status          VARCHAR(20) DEFAULT 'active',
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_host_name ON sangfor.host_master(host_name);
CREATE INDEX idx_host_az ON sangfor.host_master(az_id);

COMMENT ON TABLE sangfor.host_master IS 'Physical host/node master data';

-- ============================================================
-- 3. Storage Master
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.storage_master (
    storage_id          VARCHAR(50) PRIMARY KEY,  -- e.g., 915111ee_vs_vol_rep3
    storage_name        VARCHAR(100) NOT NULL,     -- e.g., VirtualDatastore1
    storage_policy_id   VARCHAR(50),
    storage_type        VARCHAR(50),
    total_capacity_mb   NUMERIC(15,2),
    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_storage_name ON sangfor.storage_master(storage_name);

COMMENT ON TABLE sangfor.storage_master IS 'Storage/Datastore master data';

-- ============================================================
-- 4. Network Master
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.network_master (
    network_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    port_id         UUID,
    network_name    VARCHAR(100) NOT NULL,  -- e.g., EDGE-DC
    network_type    VARCHAR(50),            -- e.g., classic
    vpc_id          VARCHAR(50),
    vpc_name        VARCHAR(100),
    subnet_id       VARCHAR(50),
    subnet_name     VARCHAR(100),
    cidr            VARCHAR(50),
    gateway_ip      VARCHAR(50),
    device_id       UUID,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_network_name ON sangfor.network_master(network_name);
CREATE INDEX idx_network_port ON sangfor.network_master(port_id);

COMMENT ON TABLE sangfor.network_master IS 'Network/VLAN master data';

-- ============================================================
-- 5. VM Group Master (Folder/Group hierarchy)
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.vm_group_master (
    group_id        UUID PRIMARY KEY,
    group_name      VARCHAR(100) NOT NULL,
    group_name_path VARCHAR(500),          -- e.g., HCI-DC/WUH-Dev
    group_id_path   VARCHAR(500),          -- Full path of group IDs
    parent_group_id UUID REFERENCES sangfor.vm_group_master(group_id),
    az_id           UUID REFERENCES sangfor.az_master(az_id),
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_group_name ON sangfor.vm_group_master(group_name);
CREATE INDEX idx_group_parent ON sangfor.vm_group_master(parent_group_id);

COMMENT ON TABLE sangfor.vm_group_master IS 'VM Group/Folder hierarchy';

-- ============================================================
-- 6. Protection Policy Master
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.protection_master (
    protection_id       UUID PRIMARY KEY,
    protection_name     VARCHAR(200) NOT NULL,
    protection_type     VARCHAR(50),           -- e.g., backup_disaster, az_backup
    protection_enabled  BOOLEAN DEFAULT TRUE,
    description         TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_protection_name ON sangfor.protection_master(protection_name);
CREATE INDEX idx_protection_type ON sangfor.protection_master(protection_type);

COMMENT ON TABLE sangfor.protection_master IS 'Backup/DR protection policies';

-- ============================================================
-- 7. VM Master (Main VM Static Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.vm_master (
    vm_uuid             UUID PRIMARY KEY,        -- Main identifier (id field from API)
    vm_id               BIGINT UNIQUE,           -- Numeric VM ID (vm_id from API)
    name                VARCHAR(200) NOT NULL,
    
    -- Classification
    vmtype              VARCHAR(20),             -- vm, template, etc.
    platform_type       VARCHAR(20) DEFAULT 'hci',
    
    -- Location
    az_id               UUID REFERENCES sangfor.az_master(az_id),
    host_id             VARCHAR(50) REFERENCES sangfor.host_master(host_id),
    group_id            UUID REFERENCES sangfor.vm_group_master(group_id),
    storage_id          VARCHAR(50) REFERENCES sangfor.storage_master(storage_id),
    
    -- Project/User
    project_id          VARCHAR(50),
    project_name        VARCHAR(100),
    user_id             VARCHAR(50),
    user_name           VARCHAR(100),
    
    -- OS Information
    os_type             VARCHAR(20),             -- e.g., l2664, ws1264
    os_name             VARCHAR(100),            -- e.g., linux-ubuntu
    os_installed        SMALLINT,                -- 2 = installed
    os_arch             VARCHAR(20),             -- amd64, arm64
    os_kernel           VARCHAR(50),             -- linux, windows
    os_distribution     VARCHAR(100),            -- ubuntu, server-2019
    
    -- Resource Configuration (Static allocation)
    cpu_sockets         SMALLINT,
    cpu_cores           SMALLINT,
    cpu_cores_per_socket SMALLINT,
    cpu_total_mhz       NUMERIC(12,2),
    memory_total_mb     NUMERIC(12,2),
    storage_total_mb    NUMERIC(15,2),
    
    -- GPU Configuration
    has_gpu             BOOLEAN DEFAULT FALSE,
    gpu_conf            JSONB,                   -- Store GPU config as JSON if complex
    
    -- Advanced Settings
    vtool_installed     BOOLEAN DEFAULT FALSE,
    encrypted           BOOLEAN DEFAULT FALSE,
    balloon_memory      BOOLEAN DEFAULT FALSE,
    onboot              BOOLEAN DEFAULT TRUE,
    abnormal_recovery   BOOLEAN DEFAULT TRUE,
    vga_type            VARCHAR(20),
    
    -- Protection/Backup
    protection_id       UUID REFERENCES sangfor.protection_master(protection_id),
    protection_enabled  BOOLEAN DEFAULT FALSE,
    in_protection       BOOLEAN DEFAULT FALSE,
    backup_policy_enable BOOLEAN DEFAULT FALSE,
    backup_file_count   INTEGER DEFAULT 0,
    
    -- Template
    template_id         VARCHAR(50),
    image_id            VARCHAR(50),
    image_name          VARCHAR(200),
    
    -- Expiry
    expire_time         VARCHAR(50),             -- 'unlimited' or datetime
    
    -- Tags (stored as array for flexibility)
    tags                TEXT[],
    
    -- Description
    description         TEXT,
    
    -- Lifecycle
    first_seen_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    config_updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ
);

-- Primary indexes for VM Master
CREATE INDEX idx_vm_name ON sangfor.vm_master(name);
CREATE INDEX idx_vm_vmid ON sangfor.vm_master(vm_id);
CREATE INDEX idx_vm_host ON sangfor.vm_master(host_id);
CREATE INDEX idx_vm_group ON sangfor.vm_master(group_id);
CREATE INDEX idx_vm_az ON sangfor.vm_master(az_id);
CREATE INDEX idx_vm_storage ON sangfor.vm_master(storage_id);
CREATE INDEX idx_vm_protection ON sangfor.vm_master(protection_id);
CREATE INDEX idx_vm_project ON sangfor.vm_master(project_id);
CREATE INDEX idx_vm_os ON sangfor.vm_master(os_type, os_kernel);
CREATE INDEX idx_vm_deleted ON sangfor.vm_master(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_vm_last_seen ON sangfor.vm_master(last_seen_at);

COMMENT ON TABLE sangfor.vm_master IS 'Virtual Machine master/static data - updated only when config changes';

-- ============================================================
-- 8. VM Disk Configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.vm_disk_config (
    id                  SERIAL PRIMARY KEY,
    vm_uuid             UUID NOT NULL REFERENCES sangfor.vm_master(vm_uuid) ON DELETE CASCADE,
    disk_id             VARCHAR(20) NOT NULL,    -- ide0, ide1, scsi0, etc.
    storage_id          VARCHAR(50) REFERENCES sangfor.storage_master(storage_id),
    storage_name        VARCHAR(100),
    storage_file        VARCHAR(200),            -- e.g., vm-disk-1.qcow2
    size_mb             NUMERIC(15,2),
    preallocate         VARCHAR(20),             -- metadata, off, full
    eagerly_scrub       BOOLEAN DEFAULT FALSE,
    storage_tag_id      VARCHAR(50),
    physical_disk_type  VARCHAR(50),
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE,
    
    UNIQUE(vm_uuid, disk_id)
);

CREATE INDEX idx_disk_vm ON sangfor.vm_disk_config(vm_uuid);
CREATE INDEX idx_disk_storage ON sangfor.vm_disk_config(storage_id);

COMMENT ON TABLE sangfor.vm_disk_config IS 'VM disk configuration - tracks attached disks';

-- ============================================================
-- 9. VM Network Interface Configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.vm_network_config (
    id                  SERIAL PRIMARY KEY,
    vm_uuid             UUID NOT NULL REFERENCES sangfor.vm_master(vm_uuid) ON DELETE CASCADE,
    vif_id              VARCHAR(20) NOT NULL,    -- net0, net1, etc.
    port_id             UUID,
    network_name        VARCHAR(100),
    mac_address         VARCHAR(20),
    ip_address          INET,
    ipv6_address        INET,
    model               VARCHAR(20),             -- virtio, e1000, etc.
    is_connected        BOOLEAN DEFAULT TRUE,
    vpc_id              VARCHAR(50),
    vpc_name            VARCHAR(100),
    subnet_id           VARCHAR(50),
    subnet_name         VARCHAR(100),
    device_id           UUID,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE,
    
    UNIQUE(vm_uuid, vif_id)
);

CREATE INDEX idx_nic_vm ON sangfor.vm_network_config(vm_uuid);
CREATE INDEX idx_nic_ip ON sangfor.vm_network_config(ip_address);
CREATE INDEX idx_nic_mac ON sangfor.vm_network_config(mac_address);

COMMENT ON TABLE sangfor.vm_network_config IS 'VM network interface configuration';

-- ============================================================
-- 10. Collection Batch Log
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.collection_log (
    batch_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collected_at        TIMESTAMPTZ NOT NULL,
    source              VARCHAR(100),            -- API endpoint or source
    total_vms           INTEGER,
    processed_vms       INTEGER,
    failed_vms          INTEGER DEFAULT 0,
    duration_ms         INTEGER,
    status              VARCHAR(20) DEFAULT 'success',
    error_message       TEXT,
    metadata            JSONB                    -- Additional metadata
);

CREATE INDEX idx_collection_time ON sangfor.collection_log(collected_at DESC);
CREATE INDEX idx_collection_status ON sangfor.collection_log(status);

COMMENT ON TABLE sangfor.collection_log IS 'Tracks each data collection batch';

-- ============================================================
-- Create trigger function for updating timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all static tables
CREATE TRIGGER trg_az_timestamp BEFORE UPDATE ON sangfor.az_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_host_timestamp BEFORE UPDATE ON sangfor.host_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_storage_timestamp BEFORE UPDATE ON sangfor.storage_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_network_timestamp BEFORE UPDATE ON sangfor.network_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_group_timestamp BEFORE UPDATE ON sangfor.vm_group_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_protection_timestamp BEFORE UPDATE ON sangfor.protection_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_vm_timestamp BEFORE UPDATE ON sangfor.vm_master 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_disk_timestamp BEFORE UPDATE ON sangfor.vm_disk_config 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();

CREATE TRIGGER trg_nic_timestamp BEFORE UPDATE ON sangfor.vm_network_config 
    FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();
