-- ============================================================
-- Sync Schema for VMStat Application
-- Synchronization settings, history, and data tables
-- ============================================================

-- Create schemas if not exist
CREATE SCHEMA IF NOT EXISTS sangfor;
CREATE SCHEMA IF NOT EXISTS metrics;

-- ============================================================
-- Sync Settings Table
-- ============================================================

CREATE TABLE IF NOT EXISTS sangfor.sync_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    scp_ip VARCHAR(255),
    scp_username VARCHAR(100),
    scp_password VARCHAR(255),
    sync_interval_minutes INTEGER DEFAULT 5,
    scheduler_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row (only if not exists)
INSERT INTO sangfor.sync_settings (id, sync_interval_minutes, scheduler_active)
VALUES (1, 5, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Collection Log Table (Sync History)
-- ============================================================

CREATE TABLE IF NOT EXISTS sangfor.collection_log (
    batch_id SERIAL PRIMARY KEY,
    collected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(255),
    total_vms INTEGER DEFAULT 0,
    processed_vms INTEGER DEFAULT 0,
    failed_vms INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    status VARCHAR(50), -- 'success', 'failed', 'partial'
    error_message TEXT,
    metadata JSONB,
    
    -- Additional details
    azs_upserted INTEGER DEFAULT 0,
    hosts_upserted INTEGER DEFAULT 0,
    groups_upserted INTEGER DEFAULT 0,
    vms_inserted INTEGER DEFAULT 0,
    vms_updated INTEGER DEFAULT 0,
    metrics_inserted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_collection_log_collected_at ON sangfor.collection_log(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_log_status ON sangfor.collection_log(status);

-- ============================================================
-- System Settings Table (Generic Key-Value)
-- ============================================================

CREATE TABLE IF NOT EXISTS sangfor.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value VARCHAR(500),
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- ============================================================
-- Master Data Tables
-- ============================================================

-- AZ (Availability Zone) Master
CREATE TABLE IF NOT EXISTS sangfor.az_master (
    az_id UUID PRIMARY KEY,
    az_name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_az_master_name ON sangfor.az_master(az_name);

-- Host Master
CREATE TABLE IF NOT EXISTS sangfor.host_master (
    host_id VARCHAR(100) PRIMARY KEY,
    host_name VARCHAR(255),
    az_id UUID REFERENCES sangfor.az_master(az_id) ON DELETE SET NULL,
    ip_address INET,
    status VARCHAR(50),
    cpu_cores INTEGER,
    memory_total_mb BIGINT,
    storage_total_mb BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_host_master_name ON sangfor.host_master(host_name);
CREATE INDEX IF NOT EXISTS idx_host_master_az ON sangfor.host_master(az_id);

-- VM Group Master
CREATE TABLE IF NOT EXISTS sangfor.vm_group_master (
    group_id UUID PRIMARY KEY,
    group_name VARCHAR(255),
    group_name_path TEXT,
    parent_group_id UUID REFERENCES sangfor.vm_group_master(group_id) ON DELETE SET NULL,
    az_id UUID REFERENCES sangfor.az_master(az_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vm_group_master_name ON sangfor.vm_group_master(group_name);
CREATE INDEX IF NOT EXISTS idx_vm_group_master_az ON sangfor.vm_group_master(az_id);

-- VM Master
CREATE TABLE IF NOT EXISTS sangfor.vm_master (
    vm_uuid UUID PRIMARY KEY,
    vm_id INTEGER,
    name VARCHAR(255) NOT NULL,
    vmtype VARCHAR(50) DEFAULT 'vm',
    host_id VARCHAR(100) REFERENCES sangfor.host_master(host_id) ON DELETE SET NULL,
    group_id UUID REFERENCES sangfor.vm_group_master(group_id) ON DELETE SET NULL,
    az_id UUID REFERENCES sangfor.az_master(az_id) ON DELETE SET NULL,
    storage_id VARCHAR(100),
    
    -- OS Information
    os_type VARCHAR(50),
    os_name VARCHAR(255),
    os_installed BOOLEAN,
    
    -- Hardware Configuration
    cpu_cores INTEGER DEFAULT 0,
    cpu_sockets INTEGER DEFAULT 1,
    cpu_cores_per_socket INTEGER DEFAULT 1,
    cpu_total_mhz INTEGER DEFAULT 0,
    memory_total_mb BIGINT DEFAULT 0,
    storage_total_mb BIGINT DEFAULT 0,
    
    -- Project / User
    project_id VARCHAR(100),
    project_name VARCHAR(255),
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    
    -- Protection
    protection_enabled BOOLEAN DEFAULT FALSE,
    backup_file_count INTEGER DEFAULT 0,
    
    -- Description
    description TEXT,
    
    -- Lifecycle
    first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_vm_master_name ON sangfor.vm_master(name);
CREATE INDEX IF NOT EXISTS idx_vm_master_host ON sangfor.vm_master(host_id);
CREATE INDEX IF NOT EXISTS idx_vm_master_group ON sangfor.vm_master(group_id);
CREATE INDEX IF NOT EXISTS idx_vm_master_az ON sangfor.vm_master(az_id);
CREATE INDEX IF NOT EXISTS idx_vm_master_deleted ON sangfor.vm_master(is_deleted);

-- VM Network Configuration
CREATE TABLE IF NOT EXISTS sangfor.vm_network_config (
    id SERIAL PRIMARY KEY,
    vm_uuid UUID REFERENCES sangfor.vm_master(vm_uuid) ON DELETE CASCADE,
    vif_id VARCHAR(100),
    ip_address INET,
    mac_address VARCHAR(50),
    network_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vm_uuid, vif_id)
);

CREATE INDEX IF NOT EXISTS idx_vm_network_vm ON sangfor.vm_network_config(vm_uuid);

-- ============================================================
-- Metrics Table (TimescaleDB Hypertable compatible)
-- ============================================================

CREATE TABLE IF NOT EXISTS metrics.vm_metrics (
    id BIGSERIAL,
    vm_uuid UUID NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Power State
    power_state VARCHAR(20),
    status VARCHAR(50),
    uptime_seconds BIGINT,
    
    -- CPU Metrics
    cpu_total_mhz INTEGER DEFAULT 0,
    cpu_used_mhz INTEGER DEFAULT 0,
    cpu_ratio FLOAT DEFAULT 0,
    
    -- Memory Metrics
    memory_total_mb BIGINT DEFAULT 0,
    memory_used_mb BIGINT DEFAULT 0,
    memory_ratio FLOAT DEFAULT 0,
    
    -- Storage Metrics
    storage_total_mb BIGINT DEFAULT 0,
    storage_used_mb BIGINT DEFAULT 0,
    storage_ratio FLOAT DEFAULT 0,
    
    -- Network Metrics
    network_read_bitps BIGINT DEFAULT 0,
    network_write_bitps BIGINT DEFAULT 0,
    
    -- Disk IO Metrics
    disk_read_iops INTEGER DEFAULT 0,
    disk_write_iops INTEGER DEFAULT 0,
    disk_read_byteps BIGINT DEFAULT 0,
    disk_write_byteps BIGINT DEFAULT 0,
    
    -- Host Info (for reference)
    host_id VARCHAR(100),
    host_name VARCHAR(255),
    
    PRIMARY KEY (id, collected_at)
);

CREATE INDEX IF NOT EXISTS idx_vm_metrics_uuid ON metrics.vm_metrics(vm_uuid);
CREATE INDEX IF NOT EXISTS idx_vm_metrics_collected ON metrics.vm_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_vm_metrics_uuid_collected ON metrics.vm_metrics(vm_uuid, collected_at DESC);

-- Try to convert to hypertable if TimescaleDB is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('metrics.vm_metrics', 'collected_at', 
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists => TRUE);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB hypertable creation skipped: %', SQLERRM;
END $$;

-- ============================================================
-- Analytics Views
-- ============================================================

CREATE OR REPLACE VIEW sangfor.v_vm_overview AS
SELECT 
    vm.vm_uuid,
    vm.name,
    vm.os_name,
    vm.cpu_cores,
    vm.memory_total_mb,
    vm.storage_total_mb,
    vm.is_deleted,
    h.host_name,
    g.group_name,
    az.az_name,
    m.power_state,
    m.cpu_ratio,
    m.memory_ratio,
    m.storage_ratio,
    m.collected_at AS last_metric_at
FROM sangfor.vm_master vm
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
LEFT JOIN LATERAL (
    SELECT power_state, cpu_ratio, memory_ratio, storage_ratio, collected_at
    FROM metrics.vm_metrics
    WHERE vm_uuid = vm.vm_uuid
    ORDER BY collected_at DESC
    LIMIT 1
) m ON TRUE
WHERE vm.is_deleted = FALSE;

-- ============================================================
-- Grant Permissions
-- ============================================================

GRANT ALL PRIVILEGES ON SCHEMA sangfor TO apirak;
GRANT ALL PRIVILEGES ON SCHEMA metrics TO apirak;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sangfor TO apirak;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA metrics TO apirak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sangfor TO apirak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA metrics TO apirak;

COMMENT ON SCHEMA sangfor IS 'Sangfor SCP synchronized data';
COMMENT ON SCHEMA metrics IS 'VM performance metrics time-series data';
COMMENT ON TABLE sangfor.sync_settings IS 'Sync configuration settings (single row)';
COMMENT ON TABLE sangfor.collection_log IS 'History of sync operations';
