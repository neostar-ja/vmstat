-- ============================================================
-- Sangfor SCP Analytics Views and Materialized Views
-- 
-- Pre-computed views for dashboard and reporting
-- ============================================================

-- Connect to database first
-- \c sangfor_scp

-- ============================================================
-- 1. VM Overview View (Current Status)
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_vm_overview AS
WITH latest_metrics AS (
    SELECT DISTINCT ON (vm_uuid)
        vm_uuid,
        collected_at,
        power_state,
        status,
        uptime_seconds,
        cpu_ratio,
        cpu_used_mhz,
        memory_ratio,
        memory_used_mb,
        storage_ratio,
        storage_used_mb,
        network_read_bitps,
        network_write_bitps,
        disk_read_iops,
        disk_write_iops
    FROM metrics.vm_metrics
    ORDER BY vm_uuid, collected_at DESC
)
SELECT 
    vm.vm_uuid,
    vm.vm_id,
    vm.name,
    g.group_name,
    g.group_name_path,
    h.host_name,
    az.az_name,
    vm.os_type,
    vm.os_kernel,
    vm.os_distribution,
    COALESCE(lm.power_state, 'unknown') AS power_state,
    COALESCE(lm.status, 'unknown') AS status,
    lm.uptime_seconds,
    -- Configuration
    vm.cpu_cores,
    vm.cpu_total_mhz,
    vm.memory_total_mb,
    vm.storage_total_mb,
    -- Current Usage
    lm.cpu_ratio AS cpu_usage,
    lm.cpu_used_mhz,
    lm.memory_ratio AS memory_usage,
    lm.memory_used_mb,
    lm.storage_ratio AS storage_usage,
    lm.storage_used_mb,
    lm.network_read_bitps,
    lm.network_write_bitps,
    lm.disk_read_iops,
    lm.disk_write_iops,
    -- Protection
    vm.protection_enabled,
    vm.in_protection,
    p.protection_name,
    p.protection_type,
    vm.backup_file_count,
    -- Metadata
    lm.collected_at AS last_metrics_at,
    vm.last_seen_at,
    vm.first_seen_at
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
LEFT JOIN sangfor.protection_master p ON vm.protection_id = p.protection_id
LEFT JOIN latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
WHERE vm.is_deleted = FALSE;

COMMENT ON VIEW analytics.v_vm_overview IS 'Comprehensive VM overview with latest metrics';

-- ============================================================
-- 2. Group Summary View
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_group_summary AS
SELECT 
    g.group_id,
    g.group_name,
    g.group_name_path,
    COUNT(vm.vm_uuid) AS total_vms,
    COUNT(vm.vm_uuid) FILTER (WHERE EXISTS (
        SELECT 1 FROM metrics.vm_metrics m 
        WHERE m.vm_uuid = vm.vm_uuid 
          AND m.power_state = 'on' 
          AND m.collected_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    )) AS running_vms,
    SUM(vm.cpu_cores) AS total_cpu_cores,
    SUM(vm.memory_total_mb) AS total_memory_mb,
    SUM(vm.storage_total_mb) AS total_storage_mb,
    COUNT(vm.vm_uuid) FILTER (WHERE vm.protection_enabled = TRUE) AS protected_vms,
    COUNT(vm.vm_uuid) FILTER (WHERE vm.has_gpu = TRUE) AS gpu_vms
FROM sangfor.vm_group_master g
LEFT JOIN sangfor.vm_master vm ON g.group_id = vm.group_id AND vm.is_deleted = FALSE
GROUP BY g.group_id, g.group_name, g.group_name_path;

COMMENT ON VIEW analytics.v_group_summary IS 'VM group summary with resource totals';

-- ============================================================
-- 3. Host Summary View
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_host_summary AS
WITH latest_host_metrics AS (
    SELECT 
        m.host_id,
        COUNT(DISTINCT m.vm_uuid) AS vm_count,
        COUNT(DISTINCT m.vm_uuid) FILTER (WHERE m.power_state = 'on') AS running_vms,
        SUM(m.cpu_total_mhz) AS cpu_allocated_mhz,
        SUM(m.cpu_used_mhz) AS cpu_used_mhz,
        SUM(m.memory_total_mb) AS memory_allocated_mb,
        SUM(m.memory_used_mb) AS memory_used_mb
    FROM metrics.vm_metrics m
    WHERE m.collected_at = (
        SELECT MAX(m2.collected_at) 
        FROM metrics.vm_metrics m2 
        WHERE m2.host_id = m.host_id
    )
    GROUP BY m.host_id
)
SELECT 
    h.host_id,
    h.host_name,
    az.az_name,
    h.status,
    COALESCE(lhm.vm_count, 0) AS vm_count,
    COALESCE(lhm.running_vms, 0) AS running_vms,
    COALESCE(lhm.cpu_allocated_mhz, 0) AS cpu_allocated_mhz,
    COALESCE(lhm.cpu_used_mhz, 0) AS cpu_used_mhz,
    CASE WHEN COALESCE(lhm.cpu_allocated_mhz, 0) > 0 
         THEN ROUND(lhm.cpu_used_mhz / lhm.cpu_allocated_mhz * 100, 2)
         ELSE 0 
    END AS cpu_usage_pct,
    COALESCE(lhm.memory_allocated_mb, 0) AS memory_allocated_mb,
    COALESCE(lhm.memory_used_mb, 0) AS memory_used_mb,
    CASE WHEN COALESCE(lhm.memory_allocated_mb, 0) > 0 
         THEN ROUND(lhm.memory_used_mb / lhm.memory_allocated_mb * 100, 2)
         ELSE 0 
    END AS memory_usage_pct
FROM sangfor.host_master h
LEFT JOIN sangfor.az_master az ON h.az_id = az.az_id
LEFT JOIN latest_host_metrics lhm ON h.host_id = lhm.host_id
WHERE h.is_active = TRUE;

COMMENT ON VIEW analytics.v_host_summary IS 'Host summary with current resource usage';

-- ============================================================
-- 4. Storage Summary View
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_storage_summary AS
SELECT 
    s.storage_id,
    s.storage_name,
    COUNT(DISTINCT d.vm_uuid) AS vm_count,
    COUNT(d.disk_id) AS disk_count,
    SUM(d.size_mb) AS total_allocated_mb,
    s.total_capacity_mb
FROM sangfor.storage_master s
LEFT JOIN sangfor.vm_disk_config d ON s.storage_id = d.storage_id AND d.is_active = TRUE
WHERE s.is_active = TRUE
GROUP BY s.storage_id, s.storage_name, s.total_capacity_mb;

COMMENT ON VIEW analytics.v_storage_summary IS 'Storage summary with allocation';

-- ============================================================
-- 5. Daily Stats Materialized View (Refreshed periodically)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_daily_stats AS
SELECT 
    DATE(m.collected_at) AS stat_date,
    COUNT(DISTINCT m.vm_uuid) AS unique_vms,
    COUNT(*) AS total_samples,
    -- CPU Stats
    AVG(m.cpu_ratio) AS avg_cpu_usage,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.cpu_ratio) AS p95_cpu_usage,
    MAX(m.cpu_ratio) AS max_cpu_usage,
    -- Memory Stats
    AVG(m.memory_ratio) AS avg_memory_usage,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.memory_ratio) AS p95_memory_usage,
    MAX(m.memory_ratio) AS max_memory_usage,
    -- Storage Stats
    AVG(m.storage_ratio) AS avg_storage_usage,
    MAX(m.storage_ratio) AS max_storage_usage,
    -- Network Stats (bits to Mbps)
    AVG(m.network_read_bitps) / 1000000 AS avg_network_read_mbps,
    AVG(m.network_write_bitps) / 1000000 AS avg_network_write_mbps,
    MAX(m.network_read_bitps) / 1000000 AS max_network_read_mbps,
    MAX(m.network_write_bitps) / 1000000 AS max_network_write_mbps,
    -- Disk I/O Stats
    AVG(m.disk_read_iops) AS avg_read_iops,
    AVG(m.disk_write_iops) AS avg_write_iops,
    MAX(m.disk_read_iops) AS max_read_iops,
    MAX(m.disk_write_iops) AS max_write_iops
FROM metrics.vm_metrics m
WHERE m.collected_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(m.collected_at)
WITH DATA;

CREATE UNIQUE INDEX idx_mv_daily_stats_date ON analytics.mv_daily_stats(stat_date);

COMMENT ON MATERIALIZED VIEW analytics.mv_daily_stats IS 'Daily aggregated statistics - refresh periodically';

-- ============================================================
-- 6. VM Daily Stats Materialized View
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_vm_daily_stats AS
SELECT 
    DATE(m.collected_at) AS stat_date,
    m.vm_uuid,
    vm.name AS vm_name,
    g.group_name,
    -- CPU Stats
    AVG(m.cpu_ratio) AS avg_cpu_usage,
    MAX(m.cpu_ratio) AS max_cpu_usage,
    MIN(m.cpu_ratio) AS min_cpu_usage,
    -- Memory Stats
    AVG(m.memory_ratio) AS avg_memory_usage,
    MAX(m.memory_ratio) AS max_memory_usage,
    -- Storage Stats
    AVG(m.storage_ratio) AS avg_storage_usage,
    MAX(m.storage_used_mb) AS max_storage_used_mb,
    -- Uptime (max of the day)
    MAX(m.uptime_seconds) AS max_uptime,
    -- Sample count
    COUNT(*) AS sample_count
FROM metrics.vm_metrics m
JOIN sangfor.vm_master vm ON m.vm_uuid = vm.vm_uuid
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
WHERE m.collected_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(m.collected_at), m.vm_uuid, vm.name, g.group_name
WITH DATA;

CREATE UNIQUE INDEX idx_mv_vm_daily_stats ON analytics.mv_vm_daily_stats(stat_date, vm_uuid);
CREATE INDEX idx_mv_vm_daily_stats_vm ON analytics.mv_vm_daily_stats(vm_uuid, stat_date);

COMMENT ON MATERIALIZED VIEW analytics.mv_vm_daily_stats IS 'Per-VM daily statistics - refresh daily';

-- ============================================================
-- 7. Refresh Function for Materialized Views
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.refresh_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time INTERVAL) AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_duration INTERVAL;
BEGIN
    -- Refresh daily stats
    v_start := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_daily_stats;
    v_duration := clock_timestamp() - v_start;
    view_name := 'mv_daily_stats';
    refresh_time := v_duration;
    RETURN NEXT;
    
    -- Refresh VM daily stats
    v_start := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_vm_daily_stats;
    v_duration := clock_timestamp() - v_start;
    view_name := 'mv_vm_daily_stats';
    refresh_time := v_duration;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. VMs with Alarms View
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_vms_with_alarms AS
SELECT DISTINCT ON (a.vm_uuid)
    a.vm_uuid,
    vm.name AS vm_name,
    g.group_name,
    h.host_name,
    a.has_alarm,
    a.alarm_count,
    a.alarm_info,
    a.has_warning,
    a.warning_type,
    a.warning_info,
    a.collected_at
FROM metrics.vm_alarm_snapshot a
JOIN sangfor.vm_master vm ON a.vm_uuid = vm.vm_uuid
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
WHERE a.collected_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  AND (a.has_alarm = TRUE OR a.has_warning = TRUE)
ORDER BY a.vm_uuid, a.collected_at DESC;

COMMENT ON VIEW analytics.v_vms_with_alarms IS 'VMs with active alarms or warnings in last 24 hours';

-- ============================================================
-- 9. Unprotected VMs View (for compliance)
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_unprotected_vms AS
SELECT 
    vm.vm_uuid,
    vm.vm_id,
    vm.name,
    g.group_name,
    h.host_name,
    vm.cpu_cores,
    vm.memory_total_mb,
    vm.storage_total_mb,
    vm.first_seen_at,
    vm.last_seen_at
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
WHERE vm.is_deleted = FALSE
  AND (vm.protection_enabled = FALSE OR vm.in_protection = FALSE)
ORDER BY vm.storage_total_mb DESC;

COMMENT ON VIEW analytics.v_unprotected_vms IS 'VMs without backup/protection enabled';

-- ============================================================
-- 10. Resource Over-provisioned VMs View
-- ============================================================
CREATE OR REPLACE VIEW analytics.v_oversized_vms AS
WITH vm_avg_usage AS (
    SELECT 
        m.vm_uuid,
        AVG(m.cpu_ratio) AS avg_cpu,
        MAX(m.cpu_ratio) AS max_cpu,
        AVG(m.memory_ratio) AS avg_memory,
        MAX(m.memory_ratio) AS max_memory
    FROM metrics.vm_metrics m
    WHERE m.collected_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    GROUP BY m.vm_uuid
)
SELECT 
    vm.vm_uuid,
    vm.name,
    g.group_name,
    h.host_name,
    vm.cpu_cores,
    vm.memory_total_mb,
    ROUND(u.avg_cpu * 100, 2) AS avg_cpu_pct,
    ROUND(u.max_cpu * 100, 2) AS max_cpu_pct,
    ROUND(u.avg_memory * 100, 2) AS avg_memory_pct,
    ROUND(u.max_memory * 100, 2) AS max_memory_pct,
    CASE 
        WHEN u.avg_cpu < 0.1 AND u.max_cpu < 0.3 THEN 'CPU Over-provisioned'
        ELSE NULL
    END AS cpu_status,
    CASE 
        WHEN u.avg_memory < 0.2 AND u.max_memory < 0.4 THEN 'Memory Over-provisioned'
        ELSE NULL
    END AS memory_status
FROM vm_avg_usage u
JOIN sangfor.vm_master vm ON u.vm_uuid = vm.vm_uuid
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
WHERE vm.is_deleted = FALSE
  AND ((u.avg_cpu < 0.1 AND u.max_cpu < 0.3) OR (u.avg_memory < 0.2 AND u.max_memory < 0.4))
ORDER BY vm.memory_total_mb DESC;

COMMENT ON VIEW analytics.v_oversized_vms IS 'VMs with low resource utilization (potential right-sizing candidates)';
