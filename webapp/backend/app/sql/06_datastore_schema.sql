-- ============================================================
-- DataStore Schema for VMStat Application
-- Stores Sangfor SCP datastore/storage information
-- ============================================================

-- ============================================================
-- DataStore Master Table
-- ============================================================

CREATE TABLE IF NOT EXISTS sangfor.datastore_master (
    datastore_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    az_id UUID REFERENCES sangfor.az_master(az_id) ON DELETE SET NULL,
    
    -- Type and Status
    type VARCHAR(50),  -- vmfs, nfs, vs
    status VARCHAR(50), -- normal, offline, ok
    
    -- Capacity (MB)
    total_mb BIGINT DEFAULT 0,
    used_mb BIGINT DEFAULT 0,
    ratio DECIMAL(5,4) DEFAULT 0,
    
    -- Backup Configuration
    backup_enable INTEGER DEFAULT 0,
    backup_total_mb BIGINT DEFAULT 0,
    backup_used_mb BIGINT DEFAULT 0,
    backup_ratio DECIMAL(5,4) DEFAULT 0,
    archive_usable INTEGER DEFAULT 0,
    
    -- Configuration
    shared INTEGER DEFAULT 0,
    connected_hosts INTEGER DEFAULT 0,
    storage_tag_id VARCHAR(100),
    target VARCHAR(255),
    supported_allocate_types TEXT[], -- Array of strings
    
    -- Performance Metrics (real-time)
    read_byteps DECIMAL(20,2) DEFAULT 0,
    write_byteps DECIMAL(20,2) DEFAULT 0,
    max_read_byteps DECIMAL(20,2) DEFAULT 0,
    max_write_byteps DECIMAL(20,2) DEFAULT 0,
    
    -- Tracking
    is_active BOOLEAN DEFAULT TRUE,
    first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_datastore_master_name ON sangfor.datastore_master(name);
CREATE INDEX IF NOT EXISTS idx_datastore_master_az_id ON sangfor.datastore_master(az_id);
CREATE INDEX IF NOT EXISTS idx_datastore_master_type ON sangfor.datastore_master(type);
CREATE INDEX IF NOT EXISTS idx_datastore_master_status ON sangfor.datastore_master(status);
CREATE INDEX IF NOT EXISTS idx_datastore_master_is_active ON sangfor.datastore_master(is_active);

-- ============================================================
-- DataStore Metrics Hypertable (Historical Data)
-- ============================================================

CREATE TABLE IF NOT EXISTS metrics.datastore_metrics (
    id SERIAL,
    datastore_id VARCHAR(100) NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Capacity at collection time
    total_mb BIGINT DEFAULT 0,
    used_mb BIGINT DEFAULT 0,
    ratio DECIMAL(5,4) DEFAULT 0,
    
    -- Backup at collection time
    backup_total_mb BIGINT DEFAULT 0,
    backup_used_mb BIGINT DEFAULT 0,
    backup_ratio DECIMAL(5,4) DEFAULT 0,
    
    -- Performance at collection time
    read_byteps DECIMAL(20,2) DEFAULT 0,
    write_byteps DECIMAL(20,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(50),
    connected_hosts INTEGER DEFAULT 0,
    
    PRIMARY KEY (id, collected_at)
);

-- Create hypertable if TimescaleDB is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('metrics.datastore_metrics', 'collected_at', 
            if_not_exists => TRUE,
            migrate_data => TRUE);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available or hypertable already exists';
END $$;

CREATE INDEX IF NOT EXISTS idx_datastore_metrics_datastore_id ON metrics.datastore_metrics(datastore_id);
CREATE INDEX IF NOT EXISTS idx_datastore_metrics_collected_at ON metrics.datastore_metrics(collected_at DESC);

-- ============================================================
-- Sync configuration for datastores (optional, for separate sync)
-- ============================================================

-- Add datastore sync stats to sync.jobs if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'sync' AND table_name = 'jobs' AND column_name = 'datastores_synced'
    ) THEN
        ALTER TABLE sync.jobs ADD COLUMN datastores_synced INTEGER DEFAULT 0;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Column may already exist or sync.jobs table not found';
END $$;
