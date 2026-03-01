-- Update v_vm_overview to include aggregated network info and missing fields
DROP VIEW IF EXISTS analytics.v_vm_overview CASCADE;

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
        storage_file_size_mb,
        network_read_bitps,
        network_write_bitps,
        disk_read_iops,
        disk_write_iops,
        disk_read_byteps,
        disk_write_byteps
    FROM metrics.vm_metrics
    ORDER BY vm_uuid, collected_at DESC
),
aggregated_networks AS (
    SELECT 
        vm_uuid, 
        string_agg(ip_address, ', ') FILTER (WHERE ip_address IS NOT NULL AND ip_address != '') as ip_address,
        string_agg(mac_address, ', ') FILTER (WHERE mac_address IS NOT NULL AND mac_address != '') as mac_address,
        MAX(network_name) as primary_network_name
    FROM sangfor.vm_network_interfaces
    WHERE is_active = TRUE
    GROUP BY vm_uuid
)
SELECT 
    vm.vm_uuid,
    vm.vm_id,
    vm.name,
    vm.group_id,
    g.group_name,
    g.group_name_path,
    h.host_name,
    az.az_name,
    vm.os_type,
    vm.os_name, 
    vm.os_kernel,
    vm.os_distribution,
    COALESCE(lm.power_state, 'unknown') AS power_state,
    COALESCE(lm.status, 'unknown') AS status,
    lm.uptime_seconds,
    -- Configuration
    vm.cpu_cores,
    vm.cpu_sockets,
    vm.cpu_cores_per_socket,
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
    lm.storage_file_size_mb,
    lm.network_read_bitps,
    lm.network_write_bitps,
    CAST(lm.network_read_bitps AS FLOAT) / 1000000.0 AS network_read_mbps,
    CAST(lm.network_write_bitps AS FLOAT) / 1000000.0 AS network_write_mbps,
    lm.disk_read_iops,
    lm.disk_write_iops,
    lm.disk_read_byteps,
    lm.disk_write_byteps,
    -- Network (New)
    an.ip_address,
    an.mac_address,
    an.primary_network_name,
    -- Protection
    vm.protection_enabled,
    vm.in_protection,
    p.protection_name,
    p.protection_type,
    CAST(p.protection_id AS text) as protection_id,
    vm.backup_file_count,
    vm.backup_policy_enable,
    -- Storage
    vm.storage_id,
    sm.storage_name,
    -- Metadata
    lm.collected_at AS last_metrics_at,
    vm.last_seen_at,
    vm.first_seen_at,
    vm.config_updated_at,
    vm.description,
    vm.tags,
    vm.project_id,
    vm.project_name,
    vm.user_name,
    vm.expire_time
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
LEFT JOIN sangfor.protection_master p ON vm.protection_id = p.protection_id
LEFT JOIN sangfor.storage_master sm ON vm.storage_id = sm.storage_id
LEFT JOIN latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
LEFT JOIN aggregated_networks an ON vm.vm_uuid = an.vm_uuid
WHERE vm.is_deleted = FALSE;

COMMENT ON VIEW analytics.v_vm_overview IS 'Comprehensive VM overview with latest metrics and network details';
