-- ============================================================
-- Host Management Tables
-- Schema for comprehensive host data including metrics and alarms
-- ============================================================

-- Extend host_master with additional fields
ALTER TABLE sangfor.host_master 
    ADD COLUMN IF NOT EXISTS ip VARCHAR(50),
    ADD COLUMN IF NOT EXISTS host_type_detail VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cluster_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cluster_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cpu_cores SMALLINT,
    ADD COLUMN IF NOT EXISTS cpu_sockets SMALLINT,
    ADD COLUMN IF NOT EXISTS cpu_used_mhz NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS cpu_usage_ratio NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS memory_used_mb NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS memory_free_mb NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS memory_usage_ratio NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS vm_total INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vm_running INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vm_stopped INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS alarm_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_host_cluster ON sangfor.host_master(cluster_id);
CREATE INDEX IF NOT EXISTS idx_host_status ON sangfor.host_master(status);
CREATE INDEX IF NOT EXISTS idx_host_last_synced ON sangfor.host_master(last_synced_at);

-- ============================================================
-- Host Datastore Association
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.host_datastore (
    id                  SERIAL PRIMARY KEY,
    host_id             VARCHAR(50) NOT NULL REFERENCES sangfor.host_master(host_id) ON DELETE CASCADE,
    datastore_name      VARCHAR(200) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(host_id, datastore_name)
);

CREATE INDEX IF NOT EXISTS idx_host_datastore_host ON sangfor.host_datastore(host_id);
CREATE INDEX IF NOT EXISTS idx_host_datastore_name ON sangfor.host_datastore(datastore_name);

COMMENT ON TABLE sangfor.host_datastore IS 'Association between hosts and their connected datastores';

-- ============================================================
-- Host Alarms
-- ============================================================
CREATE TABLE IF NOT EXISTS sangfor.host_alarm (
    id                  UUID PRIMARY KEY,
    host_id             VARCHAR(50) NOT NULL REFERENCES sangfor.host_master(host_id) ON DELETE CASCADE,
    alarm_type          VARCHAR(50) NOT NULL,
    level               VARCHAR(20) NOT NULL,
    status              VARCHAR(20) DEFAULT 'open',
    description         TEXT,
    alarm_advice        TEXT,
    policy_id           VARCHAR(50),
    policy_name         VARCHAR(200),
    project_id          VARCHAR(50),
    az_id               UUID REFERENCES sangfor.az_master(az_id),
    az_name             VARCHAR(100),
    user_id             VARCHAR(50),
    remark              TEXT,
    converge_count      INTEGER DEFAULT 0,
    start_time          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_host_alarm_host ON sangfor.host_alarm(host_id);
CREATE INDEX IF NOT EXISTS idx_host_alarm_type ON sangfor.host_alarm(alarm_type);
CREATE INDEX IF NOT EXISTS idx_host_alarm_level ON sangfor.host_alarm(level);
CREATE INDEX IF NOT EXISTS idx_host_alarm_status ON sangfor.host_alarm(status);
CREATE INDEX IF NOT EXISTS idx_host_alarm_active ON sangfor.host_alarm(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_host_alarm_start ON sangfor.host_alarm(start_time);

COMMENT ON TABLE sangfor.host_alarm IS 'Host alarms and alerts tracking';

-- ============================================================
-- Host Metrics (Time-series data)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics.host_metrics (
    id                  BIGSERIAL PRIMARY KEY,
    host_id             VARCHAR(50) NOT NULL,
    host_name           VARCHAR(50) NOT NULL,
    az_id               UUID,
    cluster_id          VARCHAR(50),
    
    -- CPU Metrics
    cpu_total_mhz       NUMERIC(12,2),
    cpu_used_mhz        NUMERIC(12,2),
    cpu_usage_ratio     NUMERIC(5,4),
    cpu_cores           SMALLINT,
    cpu_sockets         SMALLINT,
    
    -- Memory Metrics
    memory_total_mb     NUMERIC(12,2),
    memory_used_mb      NUMERIC(12,2),
    memory_free_mb      NUMERIC(12,2),
    memory_usage_ratio  NUMERIC(5,4),
    
    -- VM Counts
    vm_total            INTEGER,
    vm_running          INTEGER,
    vm_stopped          INTEGER,
    
    -- Status
    status              VARCHAR(20),
    alarm_count         INTEGER DEFAULT 0,
    
    collected_at        TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_host_metrics_host ON metrics.host_metrics(host_id);
CREATE INDEX IF NOT EXISTS idx_host_metrics_collected ON metrics.host_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_host_metrics_host_time ON metrics.host_metrics(host_id, collected_at DESC);

COMMENT ON TABLE metrics.host_metrics IS 'Time-series metrics for host performance tracking';

-- ============================================================
-- Views for Host Analytics
-- ============================================================

-- Current Host Overview
CREATE OR REPLACE VIEW analytics.v_host_overview AS
SELECT 
    h.host_id,
    h.host_name,
    h.ip,
    h.host_type_detail as type,
    h.status,
    h.cluster_id,
    h.cluster_name,
    a.az_name,
    
    -- CPU
    h.cpu_cores,
    h.cpu_sockets,
    h.cpu_total_mhz,
    h.cpu_used_mhz,
    h.cpu_usage_ratio,
    ROUND((h.cpu_usage_ratio * 100)::numeric, 2) as cpu_usage_pct,
    
    -- Memory
    h.memory_total_mb,
    h.memory_used_mb,
    h.memory_free_mb,
    h.memory_usage_ratio,
    ROUND((h.memory_usage_ratio * 100)::numeric, 2) as memory_usage_pct,
    ROUND((h.memory_total_mb / 1024.0)::numeric, 2) as memory_total_gb,
    ROUND((h.memory_used_mb / 1024.0)::numeric, 2) as memory_used_gb,
    
    -- VMs
    h.vm_total,
    h.vm_running,
    h.vm_stopped,
    
    -- Alarms
    h.alarm_count,
    CASE 
        WHEN h.alarm_count > 0 THEN true 
        ELSE false 
    END as has_alarm,
    
    -- Health Status
    CASE
        WHEN h.status != 'running' THEN 'critical'
        WHEN h.alarm_count > 3 THEN 'critical'
        WHEN h.cpu_usage_ratio > 0.9 OR h.memory_usage_ratio > 0.9 THEN 'critical'
        WHEN h.alarm_count > 0 THEN 'warning'
        WHEN h.cpu_usage_ratio > 0.8 OR h.memory_usage_ratio > 0.8 THEN 'warning'
        ELSE 'healthy'
    END as health_status,
    
    h.last_synced_at,
    h.updated_at
FROM sangfor.host_master h
LEFT JOIN sangfor.az_master a ON h.az_id = a.az_id
WHERE h.is_active = TRUE
ORDER BY h.host_name;

COMMENT ON VIEW analytics.v_host_overview IS 'Comprehensive current state of all active hosts';

-- Host with Datastore Details
CREATE OR REPLACE VIEW analytics.v_host_datastores AS
SELECT 
    h.host_id,
    h.host_name,
    h.cluster_name,
    a.az_name,
    STRING_AGG(DISTINCT hd.datastore_name, ', ' ORDER BY hd.datastore_name) as datastores,
    COUNT(DISTINCT hd.datastore_name) as datastore_count
FROM sangfor.host_master h
LEFT JOIN sangfor.az_master a ON h.az_id = a.az_id
LEFT JOIN sangfor.host_datastore hd ON h.host_id = hd.host_id
WHERE h.is_active = TRUE
GROUP BY h.host_id, h.host_name, h.cluster_name, a.az_name;

COMMENT ON VIEW analytics.v_host_datastores IS 'Hosts with their connected datastores aggregated';

-- Host Alarms Summary
CREATE OR REPLACE VIEW analytics.v_host_alarms AS
SELECT 
    h.host_id,
    h.host_name,
    h.cluster_name,
    a.az_name,
    COUNT(ha.id) as total_alarms,
    COUNT(ha.id) FILTER (WHERE ha.level = 'p1') as critical_alarms,
    COUNT(ha.id) FILTER (WHERE ha.level = 'p2') as warning_alarms,
    COUNT(ha.id) FILTER (WHERE ha.status = 'open') as open_alarms,
    MAX(ha.start_time) as latest_alarm_time,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'id', ha.id,
            'type', ha.alarm_type,
            'level', ha.level,
            'status', ha.status,
            'description', ha.description,
            'start_time', ha.start_time
        ) ORDER BY ha.start_time DESC
    ) FILTER (WHERE ha.id IS NOT NULL) as alarms
FROM sangfor.host_master h
LEFT JOIN sangfor.az_master a ON h.az_id = a.az_id
LEFT JOIN sangfor.host_alarm ha ON h.host_id = ha.host_id AND ha.is_active = TRUE
WHERE h.is_active = TRUE
GROUP BY h.host_id, h.host_name, h.cluster_name, a.az_name;

COMMENT ON VIEW analytics.v_host_alarms IS 'Host alarms summarized with details';

-- Update the existing v_host_summary view to include more details
DROP VIEW IF EXISTS analytics.v_host_summary CASCADE;

CREATE OR REPLACE VIEW analytics.v_host_summary AS
SELECT 
    h.host_id,
    h.host_name,
    a.az_name,
    h.cluster_name,
    h.status,
    h.vm_total as vm_count,
    h.vm_running as running_vms,
    h.vm_stopped as stopped_vms,
    ROUND((h.cpu_usage_ratio * 100)::numeric, 2) as cpu_usage_pct,
    ROUND((h.memory_usage_ratio * 100)::numeric, 2) as memory_usage_pct,
    h.cpu_total_mhz,
    h.cpu_used_mhz,
    h.memory_total_mb,
    h.memory_used_mb,
    h.alarm_count,
    CASE
        WHEN h.status != 'running' THEN 'critical'
        WHEN h.alarm_count > 3 THEN 'critical'
        WHEN h.cpu_usage_ratio > 0.9 OR h.memory_usage_ratio > 0.9 THEN 'critical'
        WHEN h.alarm_count > 0 THEN 'warning'
        WHEN h.cpu_usage_ratio > 0.8 OR h.memory_usage_ratio > 0.8 THEN 'warning'
        ELSE 'healthy'
    END as health_status,
    h.last_synced_at
FROM sangfor.host_master h
LEFT JOIN sangfor.az_master a ON h.az_id = a.az_id
WHERE h.is_active = TRUE;

COMMENT ON VIEW analytics.v_host_summary IS 'Host summary with health status for dashboard';

-- ============================================================
-- Functions
-- ============================================================

-- Function to calculate host health score (0-100)
CREATE OR REPLACE FUNCTION sangfor.calculate_host_health_score(
    p_host_id VARCHAR(50)
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 100;
    v_cpu_ratio NUMERIC;
    v_mem_ratio NUMERIC;
    v_alarm_count INTEGER;
    v_status VARCHAR(20);
BEGIN
    SELECT 
        cpu_usage_ratio,
        memory_usage_ratio,
        alarm_count,
        status
    INTO v_cpu_ratio, v_mem_ratio, v_alarm_count, v_status
    FROM sangfor.host_master
    WHERE host_id = p_host_id;
    
    -- Status penalty
    IF v_status != 'running' THEN
        v_score := v_score - 50;
    END IF;
    
    -- CPU penalty
    IF v_cpu_ratio > 0.9 THEN
        v_score := v_score - 20;
    ELSIF v_cpu_ratio > 0.8 THEN
        v_score := v_score - 10;
    ELSIF v_cpu_ratio > 0.7 THEN
        v_score := v_score - 5;
    END IF;
    
    -- Memory penalty
    IF v_mem_ratio > 0.9 THEN
        v_score := v_score - 20;
    ELSIF v_mem_ratio > 0.8 THEN
        v_score := v_score - 10;
    ELSIF v_mem_ratio > 0.7 THEN
        v_score := v_score - 5;
    END IF;
    
    -- Alarm penalty
    v_score := v_score - (v_alarm_count * 3);
    
    -- Ensure score is between 0 and 100
    IF v_score < 0 THEN
        v_score := 0;
    END IF;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sangfor.calculate_host_health_score IS 'Calculate host health score (0-100) based on metrics and alarms';

-- Grant permissions
GRANT SELECT ON analytics.v_host_overview TO apirak;
GRANT SELECT ON analytics.v_host_datastores TO apirak;
GRANT SELECT ON analytics.v_host_alarms TO apirak;
GRANT SELECT ON analytics.v_host_summary TO apirak;
GRANT EXECUTE ON FUNCTION sangfor.calculate_host_health_score TO apirak;

