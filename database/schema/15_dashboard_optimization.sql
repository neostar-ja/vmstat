-- ============================================================================
-- Dashboard Performance Optimization - Quick Wins
-- Created: 2026-02-21
-- Purpose: Materialized Views and Indexes for fast dashboard loading
-- ============================================================================

-- ============================================================================
-- PART 1: MATERIALIZED VIEW FOR DASHBOARD SUMMARY
-- ============================================================================

-- Drop existing if needed
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_dashboard_summary CASCADE;

-- Create materialized view for dashboard summary (faster than querying v_vm_overview each time)
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

-- Create unique index for fast access
CREATE UNIQUE INDEX idx_mv_dashboard_summary_updated 
ON analytics.mv_dashboard_summary (last_updated);

COMMENT ON MATERIALIZED VIEW analytics.mv_dashboard_summary IS 
'Fast dashboard summary - refresh every 5 minutes via cron or manually';


-- ============================================================================
-- PART 2: MATERIALIZED VIEW FOR TOP CONSUMERS
-- ============================================================================

-- Drop existing if needed
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_top_consumers CASCADE;

-- Top CPU and Memory consumers
CREATE MATERIALIZED VIEW analytics.mv_top_consumers AS
-- Top 20 CPU consumers
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

-- Top 20 Memory consumers
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

-- Create indexes
CREATE INDEX idx_mv_top_consumers_metric_rank 
ON analytics.mv_top_consumers (metric_type, rank);

CREATE INDEX idx_mv_top_consumers_vm 
ON analytics.mv_top_consumers (vm_uuid);

COMMENT ON MATERIALIZED VIEW analytics.mv_top_consumers IS 
'Top 20 CPU and Memory consumers - refresh every 2-5 minutes';


-- ============================================================================
-- PART 3: CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Index for vm_metrics (most frequently queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vm_metrics_vm_collected 
ON sangfor.vm_metrics (vm_uuid, collected_at DESC);

-- Index for vm_metrics with power state filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vm_metrics_latest 
ON sangfor.vm_metrics (vm_uuid, collected_at DESC) 
INCLUDE (cpu_usage, memory_usage);

-- Index for alarms with active filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vm_alarms_active 
ON sangfor.vm_alarms (status, begin_time DESC) 
WHERE status = 'open';

-- Index for host summary queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_host_master_active 
ON sangfor.host_master (is_active, az_name) 
WHERE is_active = TRUE;

-- Index for group summary queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vm_group_master_active 
ON sangfor.vm_group_master (is_active, group_name) 
WHERE is_active = TRUE;

-- Composite index for v_vm_overview filtering (will benefit the view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vm_master_power_state 
ON sangfor.vm_master (power_state, is_active) 
WHERE is_active = TRUE;


-- ============================================================================
-- PART 4: REFRESH FUNCTION
-- ============================================================================

-- Function to refresh all dashboard materialized views
CREATE OR REPLACE FUNCTION analytics.refresh_dashboard_mvs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh summary (fast)
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_dashboard_summary;
    
    -- Refresh top consumers (fast)
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_top_consumers;
    
    RAISE NOTICE 'Dashboard materialized views refreshed successfully';
END;
$$;

COMMENT ON FUNCTION analytics.refresh_dashboard_mvs() IS 
'Refresh all dashboard materialized views - call this every 5 minutes via cron';


-- ============================================================================
-- PART 5: AUTO-REFRESH SETUP (Optional - requires pg_cron extension)
-- ============================================================================

-- If pg_cron is available, uncomment below to enable auto-refresh:
/*
-- Install extension (run as superuser if not already installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh every 5 minutes
SELECT cron.schedule(
    'refresh-dashboard-mvs',           -- job name
    '*/5 * * * *',                     -- every 5 minutes
    $$SELECT analytics.refresh_dashboard_mvs()$$
);
*/

-- Alternative: Manual refresh
-- Execute this query every 5 minutes via external scheduler:
-- SELECT analytics.refresh_dashboard_mvs();


-- ============================================================================
-- PART 6: INITIAL DATA LOAD
-- ============================================================================

-- Populate materialized views with initial data
SELECT analytics.refresh_dashboard_mvs();


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test query: Dashboard summary (should be very fast)
-- SELECT * FROM analytics.mv_dashboard_summary;

-- Test query: Top CPU consumers
-- SELECT * FROM analytics.mv_top_consumers WHERE metric_type = 'cpu' ORDER BY rank LIMIT 10;

-- Test query: Top Memory consumers  
-- SELECT * FROM analytics.mv_top_consumers WHERE metric_type = 'memory' ORDER BY rank LIMIT 10;

-- Check materialized view sizes
-- SELECT 
--     schemaname,
--     matviewname,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
-- FROM pg_matviews
-- WHERE schemaname = 'analytics'
-- ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant select permissions to application user
GRANT SELECT ON analytics.mv_dashboard_summary TO apirak;
GRANT SELECT ON analytics.mv_top_consumers TO apirak;
GRANT EXECUTE ON FUNCTION analytics.refresh_dashboard_mvs() TO apirak;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
