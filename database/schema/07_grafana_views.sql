-- ============================================================
-- Sangfor SCP Grafana Integration Views
-- 
-- Views optimized for Grafana queries
-- Compatible with Grafana PostgreSQL datasource
-- ============================================================

-- Connect to database first
-- \c sangfor_scp

-- ============================================================
-- 1. Time Series for VM CPU (Grafana Graph)
-- Usage: SELECT * FROM analytics.grafana_vm_cpu WHERE vm_uuid = $vm_uuid AND time >= $__timeFrom() AND time < $__timeTo()
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_cpu AS
SELECT 
    collected_at AS time,
    vm_uuid,
    cpu_ratio * 100 AS cpu_usage_pct,
    cpu_used_mhz,
    cpu_total_mhz
FROM metrics.vm_metrics;

-- ============================================================
-- 2. Time Series for VM Memory (Grafana Graph)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_memory AS
SELECT 
    collected_at AS time,
    vm_uuid,
    memory_ratio * 100 AS memory_usage_pct,
    memory_used_mb,
    memory_total_mb
FROM metrics.vm_metrics;

-- ============================================================
-- 3. Time Series for VM Storage (Grafana Graph)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_storage AS
SELECT 
    collected_at AS time,
    vm_uuid,
    storage_ratio * 100 AS storage_usage_pct,
    storage_used_mb,
    storage_total_mb,
    storage_file_size_mb
FROM metrics.vm_metrics;

-- ============================================================
-- 4. Time Series for VM Network (Grafana Graph)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_network AS
SELECT 
    collected_at AS time,
    vm_uuid,
    network_read_bitps / 1000000 AS rx_mbps,
    network_write_bitps / 1000000 AS tx_mbps,
    network_read_bitps + network_write_bitps AS total_bitps
FROM metrics.vm_metrics;

-- ============================================================
-- 5. Time Series for VM Disk I/O (Grafana Graph)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_disk_io AS
SELECT 
    collected_at AS time,
    vm_uuid,
    disk_read_iops,
    disk_write_iops,
    disk_read_iops + disk_write_iops AS total_iops,
    disk_read_byteps / 1024 AS read_kbps,
    disk_write_byteps / 1024 AS write_kbps
FROM metrics.vm_metrics;

-- ============================================================
-- 6. Current VM Status (Grafana Table/Stat)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_current AS
SELECT 
    vm.vm_uuid,
    vm.name AS vm_name,
    g.group_name,
    h.host_name,
    COALESCE(m.power_state, 'unknown') AS power_state,
    COALESCE(m.status, 'unknown') AS status,
    COALESCE(m.cpu_ratio * 100, 0) AS cpu_pct,
    COALESCE(m.memory_ratio * 100, 0) AS memory_pct,
    COALESCE(m.storage_ratio * 100, 0) AS storage_pct,
    COALESCE(m.network_read_bitps / 1000000, 0) AS rx_mbps,
    COALESCE(m.network_write_bitps / 1000000, 0) AS tx_mbps,
    m.collected_at AS last_update
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
LEFT JOIN LATERAL (
    SELECT * FROM metrics.vm_metrics m2 
    WHERE m2.vm_uuid = vm.vm_uuid 
    ORDER BY m2.collected_at DESC LIMIT 1
) m ON TRUE
WHERE vm.is_deleted = FALSE;

-- ============================================================
-- 7. VM Dropdown (Grafana Variable)
-- Usage: SELECT vm_uuid AS __value, vm_name AS __text FROM analytics.grafana_vm_list
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_vm_list AS
SELECT 
    vm_uuid,
    name || ' (' || COALESCE(g.group_name, 'No Group') || ')' AS vm_name,
    g.group_name,
    h.host_name
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
WHERE vm.is_deleted = FALSE
ORDER BY vm.name;

-- ============================================================
-- 8. Group Dropdown (Grafana Variable)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_group_list AS
SELECT 
    group_id,
    group_name,
    group_name_path
FROM sangfor.vm_group_master
WHERE is_active = TRUE
ORDER BY group_name_path;

-- ============================================================
-- 9. Host Dropdown (Grafana Variable)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_host_list AS
SELECT 
    host_id,
    host_name,
    az.az_name
FROM sangfor.host_master h
LEFT JOIN sangfor.az_master az ON h.az_id = az.az_id
WHERE h.is_active = TRUE
ORDER BY h.host_name;

-- ============================================================
-- 10. Cluster Overview (Grafana Stat Panel)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_cluster_overview AS
SELECT
    (SELECT COUNT(*) FROM sangfor.vm_master WHERE is_deleted = FALSE) AS total_vms,
    (SELECT COUNT(*) FROM sangfor.host_master WHERE is_active = TRUE) AS total_hosts,
    (SELECT COUNT(DISTINCT vm_uuid) FROM metrics.vm_metrics 
     WHERE collected_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes' 
       AND power_state = 'on') AS running_vms,
    (SELECT AVG(cpu_ratio) * 100 FROM metrics.vm_metrics 
     WHERE collected_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes') AS avg_cpu_usage,
    (SELECT AVG(memory_ratio) * 100 FROM metrics.vm_metrics 
     WHERE collected_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes') AS avg_memory_usage,
    (SELECT COUNT(DISTINCT vm_uuid) FROM metrics.vm_alarm_snapshot 
     WHERE collected_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' 
       AND has_alarm = TRUE) AS vms_with_alarms;

-- ============================================================
-- 11. Top VMs by Resource (Grafana Bar Chart)
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.grafana_top_vms(
    p_resource VARCHAR(20) DEFAULT 'cpu',
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    vm_name VARCHAR(200),
    group_name VARCHAR(100),
    usage_pct NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH latest AS (
        SELECT DISTINCT ON (m.vm_uuid)
            m.vm_uuid,
            CASE p_resource
                WHEN 'cpu' THEN m.cpu_ratio
                WHEN 'memory' THEN m.memory_ratio
                WHEN 'storage' THEN m.storage_ratio
            END * 100 AS usage
        FROM metrics.vm_metrics m
        WHERE m.collected_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
        ORDER BY m.vm_uuid, m.collected_at DESC
    )
    SELECT 
        vm.name AS vm_name,
        g.group_name,
        l.usage AS usage_pct
    FROM latest l
    JOIN sangfor.vm_master vm ON l.vm_uuid = vm.vm_uuid
    LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
    ORDER BY l.usage DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. Host Resource Usage (Grafana Table)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_host_usage AS
WITH latest_by_host AS (
    SELECT 
        m.host_id,
        COUNT(DISTINCT m.vm_uuid) AS vm_count,
        SUM(m.cpu_used_mhz) AS cpu_used,
        SUM(m.cpu_total_mhz) AS cpu_total,
        SUM(m.memory_used_mb) AS memory_used,
        SUM(m.memory_total_mb) AS memory_total
    FROM metrics.vm_metrics m
    WHERE m.collected_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
    GROUP BY m.host_id
)
SELECT 
    h.host_id,
    h.host_name,
    l.vm_count,
    ROUND(l.cpu_used / NULLIF(l.cpu_total, 0) * 100, 2) AS cpu_usage_pct,
    ROUND(l.memory_used / NULLIF(l.memory_total, 0) * 100, 2) AS memory_usage_pct,
    l.cpu_used,
    l.cpu_total,
    l.memory_used,
    l.memory_total
FROM sangfor.host_master h
LEFT JOIN latest_by_host l ON h.host_id = l.host_id
WHERE h.is_active = TRUE;

-- ============================================================
-- 13. Alerts Summary (Grafana Alert Panel)
-- ============================================================
CREATE OR REPLACE VIEW analytics.grafana_alerts AS
SELECT 
    a.vm_uuid,
    vm.name AS vm_name,
    g.group_name,
    h.host_name,
    a.alarm_count,
    a.alarm_info::TEXT AS alarm_details,
    a.warning_type,
    a.warning_info,
    a.collected_at AS alert_time
FROM metrics.vm_alarm_snapshot a
JOIN sangfor.vm_master vm ON a.vm_uuid = vm.vm_uuid
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
WHERE (a.has_alarm = TRUE OR a.has_warning = TRUE)
  AND a.collected_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY a.collected_at DESC;

-- ============================================================
-- Grant SELECT on all analytics views to the API user
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO apirak;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO apirak;
