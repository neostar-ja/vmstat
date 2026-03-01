-- ============================================================
-- Sync V2 Schema - Complete Redesign
-- Robust sync system with jobs, history, and configuration
-- ============================================================

-- Create sync schema
CREATE SCHEMA IF NOT EXISTS sync;

-- ============================================================
-- Sync Configuration Table
-- Single-row table for sync settings
-- ============================================================

CREATE TABLE IF NOT EXISTS sync.config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    
    -- SCP Connection
    scp_ip VARCHAR(255) NOT NULL DEFAULT '',
    scp_port INTEGER DEFAULT 443,
    scp_username VARCHAR(100) NOT NULL DEFAULT '',
    scp_password_encrypted VARCHAR(500),
    
    -- Scheduler Settings
    scheduler_enabled BOOLEAN DEFAULT FALSE,
    scheduler_interval_minutes INTEGER DEFAULT 5,
    scheduler_last_run_at TIMESTAMPTZ,
    scheduler_next_run_at TIMESTAMPTZ,
    
    -- General Settings
    sync_timeout_seconds INTEGER DEFAULT 300,
    max_retries INTEGER DEFAULT 3,
    batch_size INTEGER DEFAULT 100,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure single row
    CONSTRAINT sync_config_single_row CHECK (id = 1)
);

-- Insert default config
INSERT INTO sync.config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Sync Jobs Table
-- Records each sync execution
-- ============================================================

CREATE TABLE IF NOT EXISTS sync.jobs (
    id SERIAL PRIMARY KEY,
    job_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    
    -- Job Info
    source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'scheduler', 'api'
    triggered_by VARCHAR(100), -- username or 'scheduler'
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed', 'cancelled'
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Progress
    progress_percent INTEGER DEFAULT 0,
    current_step VARCHAR(100),
    
    -- Statistics
    total_vms_fetched INTEGER DEFAULT 0,
    vms_inserted INTEGER DEFAULT 0,
    vms_updated INTEGER DEFAULT 0,
    vms_unchanged INTEGER DEFAULT 0,
    vms_errors INTEGER DEFAULT 0,
    metrics_inserted INTEGER DEFAULT 0,
    azs_synced INTEGER DEFAULT 0,
    hosts_synced INTEGER DEFAULT 0,
    groups_synced INTEGER DEFAULT 0,
    
    -- Error Info
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON sync.jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync.jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_job_id ON sync.jobs(job_id);

-- ============================================================
-- Sync Job Details Table
-- Detailed logs for each job step
-- ============================================================

CREATE TABLE IF NOT EXISTS sync.job_details (
    id SERIAL PRIMARY KEY,
    job_id UUID REFERENCES sync.jobs(job_id) ON DELETE CASCADE,
    
    -- Log Entry
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL DEFAULT 'info', -- 'debug', 'info', 'warning', 'error'
    step VARCHAR(100),
    message TEXT NOT NULL,
    
    -- Optional Details
    vm_uuid UUID,
    vm_name VARCHAR(255),
    error_details JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_job_details_job_id ON sync.job_details(job_id);
CREATE INDEX IF NOT EXISTS idx_sync_job_details_level ON sync.job_details(level);
CREATE INDEX IF NOT EXISTS idx_sync_job_details_timestamp ON sync.job_details(timestamp DESC);

-- ============================================================
-- Scheduler State Table
-- Track scheduler runs and state
-- ============================================================

CREATE TABLE IF NOT EXISTS sync.scheduler_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_running BOOLEAN DEFAULT FALSE,
    current_job_id UUID,
    last_heartbeat_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    CONSTRAINT scheduler_state_single_row CHECK (id = 1)
);

INSERT INTO sync.scheduler_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function to update config timestamp
CREATE OR REPLACE FUNCTION sync.update_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_config_updated ON sync.config;
CREATE TRIGGER trigger_sync_config_updated
    BEFORE UPDATE ON sync.config
    FOR EACH ROW
    EXECUTE FUNCTION sync.update_config_timestamp();

-- Function to calculate job duration on finish
CREATE OR REPLACE FUNCTION sync.calculate_job_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
        NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_job_duration ON sync.jobs;
CREATE TRIGGER trigger_sync_job_duration
    BEFORE UPDATE ON sync.jobs
    FOR EACH ROW
    EXECUTE FUNCTION sync.calculate_job_duration();

-- ============================================================
-- Views
-- ============================================================

-- Recent jobs summary view
CREATE OR REPLACE VIEW sync.v_recent_jobs AS
SELECT 
    j.id,
    j.job_id,
    j.source,
    j.triggered_by,
    j.status,
    j.started_at,
    j.finished_at,
    j.duration_ms,
    j.total_vms_fetched,
    j.vms_inserted,
    j.vms_updated,
    j.vms_errors,
    j.error_message,
    (SELECT COUNT(*) FROM sync.job_details d WHERE d.job_id = j.job_id AND d.level = 'error') as error_count,
    (SELECT COUNT(*) FROM sync.job_details d WHERE d.job_id = j.job_id AND d.level = 'warning') as warning_count
FROM sync.jobs j
ORDER BY j.started_at DESC;

-- Sync statistics view
CREATE OR REPLACE VIEW sync.v_stats AS
SELECT 
    (SELECT COUNT(*) FROM sync.jobs) as total_jobs,
    (SELECT COUNT(*) FROM sync.jobs WHERE status = 'success') as successful_jobs,
    (SELECT COUNT(*) FROM sync.jobs WHERE status = 'failed') as failed_jobs,
    (SELECT AVG(duration_ms) FROM sync.jobs WHERE status = 'success') as avg_duration_ms,
    (SELECT MAX(finished_at) FROM sync.jobs WHERE status = 'success') as last_successful_sync,
    (SELECT SUM(vms_inserted) FROM sync.jobs) as total_vms_inserted,
    (SELECT SUM(vms_updated) FROM sync.jobs) as total_vms_updated,
    (SELECT scheduler_enabled FROM sync.config WHERE id = 1) as scheduler_enabled,
    (SELECT scheduler_interval_minutes FROM sync.config WHERE id = 1) as scheduler_interval;

-- ============================================================
-- Permissions
-- ============================================================

GRANT ALL PRIVILEGES ON SCHEMA sync TO apirak;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sync TO apirak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sync TO apirak;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sync TO apirak;

-- Comments
COMMENT ON SCHEMA sync IS 'Sync system v2 - jobs, history, configuration';
COMMENT ON TABLE sync.config IS 'Sync configuration (single row)';
COMMENT ON TABLE sync.jobs IS 'Sync job history';
COMMENT ON TABLE sync.job_details IS 'Detailed logs per job';
COMMENT ON TABLE sync.scheduler_state IS 'Scheduler runtime state';
