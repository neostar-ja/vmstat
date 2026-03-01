-- ============================================================
-- Update Analytics Views to include storage_id and expire_time
-- ============================================================

-- ============================================================
-- 1. VM Overview View - Updated with storage_id, expire_time
-- ============================================================
DROP VIEW IF EXISTS analytics.v_vm_detail CASCADE;
DROP VIEW IF EXISTS analytics.v_vm_overview CASCADE;

CREATE VIEW analytics.v_vm_overview AS
WITH latest_metrics AS (
    SELECT DISTINCT ON (vm_uuid)
        vm_uuid,
        collected_at,
        power_state,
        status,
        uptime_seconds,
        cpu_ratio,
        cpu_used_mhz,
        cpu_total_mhz AS metric_cpu_total_mhz,
        memory_ratio,
        memory_used_mb,
        memory_total_mb AS metric_memory_total_mb,
        storage_ratio,
        storage_used_mb,
        network_read_bitps,
        network_write_bitps,
        disk_read_iops,
        disk_write_iops,
        disk_read_byteps,
        disk_write_byteps
    FROM metrics.vm_metrics
    ORDER BY vm_uuid, collected_at DESC
),
primary_network AS (
    SELECT DISTINCT ON (vm_uuid)
        vm_uuid,
        ip_address,
        mac_address,
        network_name
    FROM sangfor.vm_network_config
    WHERE is_active = TRUE
    ORDER BY vm_uuid, vif_id
)
SELECT 
    vm.vm_uuid,
    vm.vm_id,
    vm.name,
    -- Group
    g.group_name,
    g.group_name_path,
    -- Host
    h.host_name,
    -- Availability Zone
    az.az_name,
    -- OS Info
    vm.os_type,
    vm.os_name,
    vm.os_kernel,
    vm.os_distribution,
    -- Power/Status
    COALESCE(lm.power_state, 'unknown') AS power_state,
    COALESCE(lm.status, 'unknown') AS status,
    lm.uptime_seconds,
    -- CPU Configuration
    vm.cpu_cores,
    vm.cpu_sockets,
    vm.cpu_cores_per_socket,
    COALESCE(vm.cpu_total_mhz, lm.metric_cpu_total_mhz) AS cpu_total_mhz,
    -- Memory Configuration
    vm.memory_total_mb,
    -- Storage Configuration
    vm.storage_total_mb,
    vm.storage_id,
    s.storage_name,
    -- Current CPU Usage
    COALESCE(lm.cpu_ratio * 100, 0) AS cpu_usage,
    lm.cpu_used_mhz,
    -- Current Memory Usage  
    COALESCE(lm.memory_ratio * 100, 0) AS memory_usage,
    lm.memory_used_mb,
    -- Current Storage Usage
    COALESCE(lm.storage_ratio * 100, 0) AS storage_usage,
    lm.storage_used_mb,
    -- Network I/O
    lm.network_read_bitps,
    lm.network_write_bitps,
    COALESCE(lm.network_read_bitps / 1000000.0, 0) AS network_read_mbps,
    COALESCE(lm.network_write_bitps / 1000000.0, 0) AS network_write_mbps,
    -- Disk I/O
    lm.disk_read_iops,
    lm.disk_write_iops,
    lm.disk_read_byteps,
    lm.disk_write_byteps,
    -- Network Info (IP, MAC)
    pn.ip_address,
    pn.mac_address,
    pn.network_name AS primary_network_name,
    -- Project Info
    vm.project_id,
    vm.project_name,
    vm.user_name,
    -- Protection
    vm.protection_enabled,
    vm.in_protection,
    CAST(vm.protection_id AS text) as protection_id,
    -- Use protection_master name if available, otherwise use the field from vm_master if it exists
    p.protection_name,
    p.protection_type,
    vm.backup_file_count,
    vm.backup_policy_enable,
    -- Storage file size (from latest metrics or vm_master)
    COALESCE(lm.storage_used_mb, 0) AS storage_file_size_mb,
    -- Expiry
    vm.expire_time,
    -- Tags & Description
    vm.tags,
    vm.description,
    -- Metadata
    lm.collected_at AS last_metrics_at,
    vm.last_seen_at,
    vm.first_seen_at,
    vm.config_updated_at
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
LEFT JOIN sangfor.storage_master s ON vm.storage_id = s.storage_id
LEFT JOIN sangfor.protection_master p ON vm.protection_id = p.protection_id
LEFT JOIN latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
LEFT JOIN primary_network pn ON vm.vm_uuid = pn.vm_uuid
WHERE vm.is_deleted = FALSE;

COMMENT ON VIEW analytics.v_vm_overview IS 'Comprehensive VM overview with latest metrics, IP/MAC, Storage, and Project info';

-- ============================================================
-- 2. VM Detail View for API
-- ============================================================
CREATE VIEW analytics.v_vm_detail AS
SELECT 
    vo.*,
    -- Count of network interfaces
    (SELECT COUNT(*) FROM sangfor.vm_network_config nc WHERE nc.vm_uuid = vo.vm_uuid AND nc.is_active = TRUE) AS network_count,
    -- Count of disks
    (SELECT COUNT(*) FROM sangfor.vm_disk_config dc WHERE dc.vm_uuid = vo.vm_uuid AND dc.is_active = TRUE) AS disk_count,
    -- All IPs as array
    (SELECT array_agg(CAST(ip_address AS text)) FROM sangfor.vm_network_config nc WHERE nc.vm_uuid = vo.vm_uuid AND nc.is_active = TRUE AND nc.ip_address IS NOT NULL) AS all_ip_addresses
FROM analytics.v_vm_overview vo;

COMMENT ON VIEW analytics.v_vm_detail IS 'VM detail with additional counts and aggregated network info';
