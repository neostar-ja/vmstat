-- Optimizations for Dashboard

-- 1. Create latest metrics table
CREATE TABLE IF NOT EXISTS metrics.vm_latest_metrics (
    vm_uuid UUID PRIMARY KEY,
    collected_at TIMESTAMPTZ NOT NULL,
    power_state VARCHAR(20),
    status VARCHAR(20),
    uptime_seconds BIGINT,
    cpu_ratio NUMERIC(5,4),
    cpu_used_mhz NUMERIC(12,2),
    memory_ratio NUMERIC(5,4),
    memory_used_mb NUMERIC(12,2),
    storage_ratio NUMERIC(5,4),
    storage_used_mb NUMERIC(15,2),
    network_read_bitps NUMERIC(15,2),
    network_write_bitps NUMERIC(15,2),
    disk_read_iops NUMERIC(12,2),
    disk_write_iops NUMERIC(12,2)
);

CREATE INDEX IF NOT EXISTS idx_vm_latest_metrics_state ON metrics.vm_latest_metrics(power_state);

-- Populate initial data if empty
INSERT INTO metrics.vm_latest_metrics 
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
ON CONFLICT (vm_uuid) DO NOTHING;

-- 2. Modify v_vm_overview to use latest_metrics table
CREATE OR REPLACE VIEW analytics.v_vm_overview AS
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
LEFT JOIN metrics.vm_latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
WHERE vm.is_deleted = FALSE;

-- 3. Modify v_group_summary to use latest_metrics
CREATE OR REPLACE VIEW analytics.v_group_summary AS
SELECT 
    g.group_id,
    g.group_name,
    g.group_name_path,
    COUNT(vm.vm_uuid) AS total_vms,
    COUNT(vm.vm_uuid) FILTER (WHERE lm.power_state = 'on' AND lm.collected_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes') AS running_vms,
    SUM(vm.cpu_cores) AS total_cpu_cores,
    SUM(vm.memory_total_mb) AS total_memory_mb,
    SUM(vm.storage_total_mb) AS total_storage_mb,
    COUNT(vm.vm_uuid) FILTER (WHERE vm.protection_enabled = TRUE) AS protected_vms,
    COUNT(vm.vm_uuid) FILTER (WHERE vm.has_gpu = TRUE) AS gpu_vms
FROM sangfor.vm_group_master g
LEFT JOIN sangfor.vm_master vm ON g.group_id = vm.group_id AND vm.is_deleted = FALSE
LEFT JOIN metrics.vm_latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
GROUP BY g.group_id, g.group_name, g.group_name_path;

-- 4. Apply index to speed up top-vms calculations
CREATE INDEX IF NOT EXISTS idx_vm_metrics_uuid_collected_desc ON metrics.vm_metrics(vm_uuid, collected_at DESC);
