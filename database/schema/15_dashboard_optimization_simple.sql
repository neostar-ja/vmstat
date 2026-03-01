-- ============================================================================
-- Dashboard Performance Optimization - Quick Wins (Simplified)
-- Created: 2026-02-21
-- ============================================================================

-- PART 1: DROP existing if needed
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_dashboard_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_top_consumers CASCADE;

-- PART 2: Create materialized view for dashboard summary
CREATE MATERIALIZED VIEW analytics.mv_dashboard_summary AS
SELECT 
    COUNT(*) as total_vms,
    COUNT(*) FILTER (WHERE power_state = 'on') as running_vms,
    COUNT(*) FILTER (WHERE power_state != 'on' OR power_state IS NULL) as stopped_vms,
    COUNT(*) FILTER (WHERE protection_enabled = FALSE OR protection_enabled IS NULL) as unprotected_vms,
    COALESCE(SUM(cpu_cores), 0) as total_cpu_cores,
    COALESCE(SUM(memory_total_mb), 0) / 1024.0 as total_memory_gb,
    COALESCE(SUM(storage_total_mb), 0) / 1024.0 / 1024.0 as total_storage_tb,
    COALESCE(AVG(cpu_usage), 0) * 100 as avg_cpu_usage,
    COALESCE(AVG(memory_usage), 0) * 100 as avg_memory_usage,
    NOW() as last_updated
FROM analytics.v_vm_overview;

-- Index for fast access
CREATE UNIQUE INDEX idx_mv_dashboard_summary_updated 
ON analytics.mv_dashboard_summary (last_updated);

-- PART 3: Top CPU and Memory consumers
CREATE MATERIALIZED VIEW analytics.mv_top_consumers AS
SELECT 
    'cpu' as metric_type,
    CAST(vm_uuid AS text) as vm_uuid,
    name as vm_name,
    group_name,
    host_name,
    COALESCE(cpu_usage, 0) * 100 as current_usage,
    ROW_NUMBER() OVER (ORDER BY cpu_usage DESC NULLS LAST) as rank
FROM analytics.v_vm_overview
WHERE power_state = 'on'
ORDER BY cpu_usage DESC NULLS LAST
LIMIT 20

UNION ALL

SELECT 
    'memory' as metric_type,
    CAST(vm_uuid AS text) as vm_uuid,
    name as vm_name,
    group_name,
    host_name,
    COALESCE(memory_usage, 0) * 100 as current_usage,
    ROW_NUMBER() OVER (ORDER BY memory_usage DESC NULLS LAST) as rank
FROM analytics.v_vm_overview
WHERE power_state = 'on'
ORDER BY memory_usage DESC NULLS LAST
LIMIT 20;

-- Indexes for mv_top_consumers
CREATE INDEX idx_mv_top_consumers_metric_rank 
ON analytics.mv_top_consumers (metric_type, rank);

CREATE INDEX idx_mv_top_consumers_vm 
ON analytics.mv_top_consumers (vm_uuid);

-- PART 4: Performance indexes (use IF NOT EXISTS to avoid errors)
CREATE INDEX IF NOT EXISTS idx_vm_metrics_vm_collected 
ON sangfor.vm_metrics (vm_uuid, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_vm_metrics_latest 
ON sangfor.vm_metrics (vm_uuid, collected_at DESC) 
INCLUDE (cpu_usage, memory_usage);

CREATE INDEX IF NOT EXISTS idx_vm_alarms_active 
ON sangfor.vm_alarms (status, begin_time DESC) 
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_host_master_active 
ON sangfor.host_master (is_active, az_name) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vm_group_master_active 
ON sangfor.vm_group_master (is_active, group_name) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vm_master_power_state 
ON sangfor.vm_master (power_state, is_active) 
WHERE is_active = TRUE;

-- PART 5: Grant permissions
GRANT SELECT ON analytics.mv_dashboard_summary TO apirak;
GRANT SELECT ON analytics.mv_top_consumers TO apirak;

-- Done!
SELECT 'Dashboard optimization migration completed successfully!' as status;
