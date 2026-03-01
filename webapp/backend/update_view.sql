DROP VIEW IF EXISTS analytics.v_vm_overview;
CREATE OR REPLACE VIEW analytics.v_vm_overview AS
 WITH latest_metrics AS (
         SELECT DISTINCT ON (vm_metrics.vm_uuid) vm_metrics.vm_uuid,
            vm_metrics.collected_at,
            vm_metrics.power_state,
            vm_metrics.status,
            vm_metrics.uptime_seconds,
            vm_metrics.cpu_ratio,
            vm_metrics.cpu_used_mhz,
            vm_metrics.memory_ratio,
            vm_metrics.memory_used_mb,
            vm_metrics.storage_ratio,
            vm_metrics.storage_used_mb,
            vm_metrics.storage_file_size_mb,
            vm_metrics.network_read_bitps,
            vm_metrics.network_write_bitps,
            vm_metrics.disk_read_iops,
            vm_metrics.disk_write_iops,
            vm_metrics.disk_read_byteps,
            vm_metrics.disk_write_byteps
           FROM metrics.vm_metrics
          ORDER BY vm_metrics.vm_uuid, vm_metrics.collected_at DESC
        ), aggregated_networks AS (
         SELECT vm_network_interfaces.vm_uuid,
            string_agg(vm_network_interfaces.ip_address::text, ', '::text) FILTER (WHERE vm_network_interfaces.ip_address IS NOT NULL AND vm_network_interfaces.ip_address::text <> ''::text) AS ip_address,
            string_agg(vm_network_interfaces.mac_address::text, ', '::text) FILTER (WHERE vm_network_interfaces.mac_address IS NOT NULL AND vm_network_interfaces.mac_address::text <> ''::text) AS mac_address,
            max(vm_network_interfaces.network_name::text) AS primary_network_name
           FROM sangfor.vm_network_interfaces
          WHERE vm_network_interfaces.is_active = true
          GROUP BY vm_network_interfaces.vm_uuid
        )
 SELECT vm.vm_uuid,
    vm.vm_id,
    vm.name,
    vm.group_id,
    g.group_name,
    g.group_name_path,
    h.host_name,
    az.az_name,
    vm.os_type,
    vm.os_name,
    vm.os_display_name,
    vm.os_kernel,
    vm.os_distribution,
    vm.os_arch,
    COALESCE(lm.power_state, 'unknown'::character varying) AS power_state,
    COALESCE(lm.status, 'unknown'::character varying) AS status,
    lm.uptime_seconds,
    vm.cpu_cores,
    vm.cpu_sockets,
    vm.cpu_cores_per_socket,
    vm.cpu_total_mhz,
    vm.memory_total_mb,
    vm.storage_total_mb,
    lm.cpu_ratio AS cpu_usage,
    lm.cpu_used_mhz,
    lm.memory_ratio AS memory_usage,
    lm.memory_used_mb,
    lm.storage_ratio AS storage_usage,
    lm.storage_used_mb,
    lm.storage_file_size_mb,
    lm.network_read_bitps,
    lm.network_write_bitps,
    lm.network_read_bitps::double precision / 1000000.0::double precision AS network_read_mbps,
    lm.network_write_bitps::double precision / 1000000.0::double precision AS network_write_mbps,
    lm.disk_read_iops,
    lm.disk_write_iops,
    lm.disk_read_byteps,
    lm.disk_write_byteps,
    an.ip_address,
    an.mac_address,
    an.primary_network_name,
    vm.protection_enabled,
    vm.in_protection,
    p.protection_name,
    p.protection_type,
    p.protection_id::text AS protection_id,
    vm.backup_file_count,
    vm.backup_policy_enable,
    vm.storage_id,
    sm.storage_name,
    lm.collected_at AS last_metrics_at,
    vm.last_seen_at,
    vm.first_seen_at,
    vm.config_updated_at,
    vm.description,
    vm.tags,
    vm.project_id,
    vm.project_name,
    vm.user_name,
    vm.expire_time,
    vm.is_deleted
   FROM sangfor.vm_master vm
     LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
     LEFT JOIN sangfor.host_master h ON vm.host_id::text = h.host_id::text
     LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
     LEFT JOIN sangfor.protection_master p ON vm.protection_id = p.protection_id
     LEFT JOIN sangfor.storage_master sm ON vm.storage_id::text = sm.storage_id::text
     LEFT JOIN latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
     LEFT JOIN aggregated_networks an ON vm.vm_uuid = an.vm_uuid;
