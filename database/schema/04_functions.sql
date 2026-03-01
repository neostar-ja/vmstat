-- ============================================================
-- Sangfor SCP Database Functions and Stored Procedures
-- 
-- Functions for data ingestion, querying, and analytics
-- ============================================================

-- Connect to database first
-- \c sangfor_scp

-- ============================================================
-- SECTION 1: UPSERT FUNCTIONS FOR STATIC DATA
-- ============================================================

-- ============================================================
-- 1.1 Upsert Availability Zone
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_az(
    p_az_id UUID,
    p_az_name VARCHAR(100),
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    INSERT INTO sangfor.az_master (az_id, az_name, description)
    VALUES (p_az_id, p_az_name, p_description)
    ON CONFLICT (az_id) DO UPDATE SET
        az_name = EXCLUDED.az_name,
        description = COALESCE(EXCLUDED.description, sangfor.az_master.description),
        is_active = TRUE
    WHERE sangfor.az_master.az_name != EXCLUDED.az_name
       OR sangfor.az_master.is_active = FALSE;
    
    RETURN p_az_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.2 Upsert Host Master
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_host(
    p_host_id VARCHAR(50),
    p_host_name VARCHAR(50),
    p_az_id UUID DEFAULT NULL,
    p_host_type VARCHAR(20) DEFAULT 'hci',
    p_cpu_total_mhz NUMERIC DEFAULT NULL,
    p_memory_total_mb NUMERIC DEFAULT NULL
) RETURNS VARCHAR(50) AS $$
BEGIN
    INSERT INTO sangfor.host_master (
        host_id, host_name, az_id, host_type, 
        cpu_total_mhz, memory_total_mb
    )
    VALUES (
        p_host_id, p_host_name, p_az_id, p_host_type,
        p_cpu_total_mhz, p_memory_total_mb
    )
    ON CONFLICT (host_id) DO UPDATE SET
        host_name = EXCLUDED.host_name,
        az_id = COALESCE(EXCLUDED.az_id, sangfor.host_master.az_id),
        host_type = EXCLUDED.host_type,
        cpu_total_mhz = COALESCE(EXCLUDED.cpu_total_mhz, sangfor.host_master.cpu_total_mhz),
        memory_total_mb = COALESCE(EXCLUDED.memory_total_mb, sangfor.host_master.memory_total_mb),
        is_active = TRUE;
    
    RETURN p_host_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.3 Upsert Storage Master
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_storage(
    p_storage_id VARCHAR(50),
    p_storage_name VARCHAR(100),
    p_storage_policy_id VARCHAR(50) DEFAULT NULL,
    p_storage_type VARCHAR(50) DEFAULT NULL,
    p_total_capacity_mb NUMERIC DEFAULT NULL
) RETURNS VARCHAR(50) AS $$
BEGIN
    INSERT INTO sangfor.storage_master (
        storage_id, storage_name, storage_policy_id, 
        storage_type, total_capacity_mb
    )
    VALUES (
        p_storage_id, p_storage_name, p_storage_policy_id,
        p_storage_type, p_total_capacity_mb
    )
    ON CONFLICT (storage_id) DO UPDATE SET
        storage_name = EXCLUDED.storage_name,
        storage_policy_id = COALESCE(EXCLUDED.storage_policy_id, sangfor.storage_master.storage_policy_id),
        storage_type = COALESCE(EXCLUDED.storage_type, sangfor.storage_master.storage_type),
        total_capacity_mb = COALESCE(EXCLUDED.total_capacity_mb, sangfor.storage_master.total_capacity_mb),
        is_active = TRUE;
    
    RETURN p_storage_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.4 Upsert VM Group
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_vm_group(
    p_group_id UUID,
    p_group_name VARCHAR(100),
    p_group_name_path VARCHAR(500) DEFAULT NULL,
    p_group_id_path VARCHAR(500) DEFAULT NULL,
    p_parent_group_id UUID DEFAULT NULL,
    p_az_id UUID DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    INSERT INTO sangfor.vm_group_master (
        group_id, group_name, group_name_path, 
        group_id_path, parent_group_id, az_id
    )
    VALUES (
        p_group_id, p_group_name, p_group_name_path,
        p_group_id_path, p_parent_group_id, p_az_id
    )
    ON CONFLICT (group_id) DO UPDATE SET
        group_name = EXCLUDED.group_name,
        group_name_path = COALESCE(EXCLUDED.group_name_path, sangfor.vm_group_master.group_name_path),
        group_id_path = COALESCE(EXCLUDED.group_id_path, sangfor.vm_group_master.group_id_path),
        parent_group_id = COALESCE(EXCLUDED.parent_group_id, sangfor.vm_group_master.parent_group_id),
        az_id = COALESCE(EXCLUDED.az_id, sangfor.vm_group_master.az_id),
        is_active = TRUE;
    
    RETURN p_group_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.5 Upsert Protection Policy
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_protection(
    p_protection_id UUID,
    p_protection_name VARCHAR(200),
    p_protection_type VARCHAR(50) DEFAULT NULL,
    p_protection_enabled BOOLEAN DEFAULT TRUE
) RETURNS UUID AS $$
BEGIN
    INSERT INTO sangfor.protection_master (
        protection_id, protection_name, protection_type, protection_enabled
    )
    VALUES (
        p_protection_id, p_protection_name, p_protection_type, p_protection_enabled
    )
    ON CONFLICT (protection_id) DO UPDATE SET
        protection_name = EXCLUDED.protection_name,
        protection_type = COALESCE(EXCLUDED.protection_type, sangfor.protection_master.protection_type),
        protection_enabled = EXCLUDED.protection_enabled,
        is_active = TRUE;
    
    RETURN p_protection_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.6 Upsert VM Master (Main function)
-- Updates only when configuration changes
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_vm_master(
    p_vm_uuid UUID,
    p_vm_id BIGINT,
    p_name VARCHAR(200),
    p_vmtype VARCHAR(20) DEFAULT NULL,
    p_platform_type VARCHAR(20) DEFAULT 'hci',
    p_az_id UUID DEFAULT NULL,
    p_host_id VARCHAR(50) DEFAULT NULL,
    p_group_id UUID DEFAULT NULL,
    p_storage_id VARCHAR(50) DEFAULT NULL,
    p_project_id VARCHAR(50) DEFAULT NULL,
    p_project_name VARCHAR(100) DEFAULT NULL,
    p_user_id VARCHAR(50) DEFAULT NULL,
    p_user_name VARCHAR(100) DEFAULT NULL,
    p_os_type VARCHAR(20) DEFAULT NULL,
    p_os_name VARCHAR(100) DEFAULT NULL,
    p_os_installed SMALLINT DEFAULT NULL,
    p_os_arch VARCHAR(20) DEFAULT NULL,
    p_os_kernel VARCHAR(50) DEFAULT NULL,
    p_os_distribution VARCHAR(100) DEFAULT NULL,
    p_cpu_sockets SMALLINT DEFAULT NULL,
    p_cpu_cores SMALLINT DEFAULT NULL,
    p_cpu_cores_per_socket SMALLINT DEFAULT NULL,
    p_cpu_total_mhz NUMERIC DEFAULT NULL,
    p_memory_total_mb NUMERIC DEFAULT NULL,
    p_storage_total_mb NUMERIC DEFAULT NULL,
    p_has_gpu BOOLEAN DEFAULT FALSE,
    p_gpu_conf JSONB DEFAULT NULL,
    p_vtool_installed BOOLEAN DEFAULT FALSE,
    p_encrypted BOOLEAN DEFAULT FALSE,
    p_balloon_memory BOOLEAN DEFAULT FALSE,
    p_onboot BOOLEAN DEFAULT TRUE,
    p_abnormal_recovery BOOLEAN DEFAULT TRUE,
    p_vga_type VARCHAR(20) DEFAULT NULL,
    p_protection_id UUID DEFAULT NULL,
    p_protection_enabled BOOLEAN DEFAULT FALSE,
    p_in_protection BOOLEAN DEFAULT FALSE,
    p_backup_policy_enable BOOLEAN DEFAULT FALSE,
    p_backup_file_count INTEGER DEFAULT 0,
    p_template_id VARCHAR(50) DEFAULT NULL,
    p_image_id VARCHAR(50) DEFAULT NULL,
    p_image_name VARCHAR(200) DEFAULT NULL,
    p_expire_time VARCHAR(50) DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS TABLE(
    action VARCHAR(10),
    vm_uuid UUID,
    config_changed BOOLEAN
) AS $$
DECLARE
    v_existing RECORD;
    v_config_changed BOOLEAN := FALSE;
BEGIN
    -- Check if VM exists
    SELECT * INTO v_existing 
    FROM sangfor.vm_master vm 
    WHERE vm.vm_uuid = p_vm_uuid;
    
    IF v_existing IS NULL THEN
        -- New VM - Insert
        INSERT INTO sangfor.vm_master (
            vm_uuid, vm_id, name, vmtype, platform_type,
            az_id, host_id, group_id, storage_id,
            project_id, project_name, user_id, user_name,
            os_type, os_name, os_installed, os_arch, os_kernel, os_distribution,
            cpu_sockets, cpu_cores, cpu_cores_per_socket, cpu_total_mhz,
            memory_total_mb, storage_total_mb,
            has_gpu, gpu_conf, vtool_installed, encrypted,
            balloon_memory, onboot, abnormal_recovery, vga_type,
            protection_id, protection_enabled, in_protection,
            backup_policy_enable, backup_file_count,
            template_id, image_id, image_name,
            expire_time, tags, description,
            first_seen_at, last_seen_at, config_updated_at
        )
        VALUES (
            p_vm_uuid, p_vm_id, p_name, p_vmtype, p_platform_type,
            p_az_id, p_host_id, p_group_id, p_storage_id,
            p_project_id, p_project_name, p_user_id, p_user_name,
            p_os_type, p_os_name, p_os_installed, p_os_arch, p_os_kernel, p_os_distribution,
            p_cpu_sockets, p_cpu_cores, p_cpu_cores_per_socket, p_cpu_total_mhz,
            p_memory_total_mb, p_storage_total_mb,
            p_has_gpu, p_gpu_conf, p_vtool_installed, p_encrypted,
            p_balloon_memory, p_onboot, p_abnormal_recovery, p_vga_type,
            p_protection_id, p_protection_enabled, p_in_protection,
            p_backup_policy_enable, p_backup_file_count,
            p_template_id, p_image_id, p_image_name,
            p_expire_time, p_tags, p_description,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
        
        action := 'INSERT';
        vm_uuid := p_vm_uuid;
        config_changed := TRUE;
        RETURN NEXT;
    ELSE
        -- Check if configuration changed
        v_config_changed := (
            v_existing.name != p_name OR
            v_existing.host_id IS DISTINCT FROM p_host_id OR
            v_existing.group_id IS DISTINCT FROM p_group_id OR
            v_existing.cpu_sockets IS DISTINCT FROM p_cpu_sockets OR
            v_existing.cpu_cores IS DISTINCT FROM p_cpu_cores OR
            v_existing.cpu_total_mhz IS DISTINCT FROM p_cpu_total_mhz OR
            v_existing.memory_total_mb IS DISTINCT FROM p_memory_total_mb OR
            v_existing.storage_total_mb IS DISTINCT FROM p_storage_total_mb OR
            v_existing.protection_id IS DISTINCT FROM p_protection_id OR
            v_existing.backup_file_count IS DISTINCT FROM p_backup_file_count
        );
        
        -- Always update last_seen_at, optionally update config
        UPDATE sangfor.vm_master
        SET 
            last_seen_at = CURRENT_TIMESTAMP,
            is_deleted = FALSE,
            name = p_name,
            host_id = p_host_id,
            group_id = p_group_id,
            storage_id = COALESCE(p_storage_id, sangfor.vm_master.storage_id),
            cpu_sockets = COALESCE(p_cpu_sockets, sangfor.vm_master.cpu_sockets),
            cpu_cores = COALESCE(p_cpu_cores, sangfor.vm_master.cpu_cores),
            cpu_cores_per_socket = COALESCE(p_cpu_cores_per_socket, sangfor.vm_master.cpu_cores_per_socket),
            cpu_total_mhz = COALESCE(p_cpu_total_mhz, sangfor.vm_master.cpu_total_mhz),
            memory_total_mb = COALESCE(p_memory_total_mb, sangfor.vm_master.memory_total_mb),
            storage_total_mb = COALESCE(p_storage_total_mb, sangfor.vm_master.storage_total_mb),
            protection_id = p_protection_id,
            protection_enabled = p_protection_enabled,
            in_protection = p_in_protection,
            backup_policy_enable = p_backup_policy_enable,
            backup_file_count = COALESCE(p_backup_file_count, sangfor.vm_master.backup_file_count),
            vtool_installed = COALESCE(p_vtool_installed, sangfor.vm_master.vtool_installed),
            config_updated_at = CASE WHEN v_config_changed THEN CURRENT_TIMESTAMP ELSE sangfor.vm_master.config_updated_at END
        WHERE sangfor.vm_master.vm_uuid = p_vm_uuid;
        
        action := 'UPDATE';
        vm_uuid := p_vm_uuid;
        config_changed := v_config_changed;
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.7 Upsert VM Disk Configuration
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_vm_disk(
    p_vm_uuid UUID,
    p_disk_id VARCHAR(20),
    p_storage_id VARCHAR(50),
    p_storage_name VARCHAR(100),
    p_storage_file VARCHAR(200),
    p_size_mb NUMERIC,
    p_preallocate VARCHAR(20) DEFAULT NULL,
    p_eagerly_scrub BOOLEAN DEFAULT FALSE,
    p_storage_tag_id VARCHAR(50) DEFAULT NULL,
    p_physical_disk_type VARCHAR(50) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO sangfor.vm_disk_config (
        vm_uuid, disk_id, storage_id, storage_name,
        storage_file, size_mb, preallocate, eagerly_scrub,
        storage_tag_id, physical_disk_type
    )
    VALUES (
        p_vm_uuid, p_disk_id, p_storage_id, p_storage_name,
        p_storage_file, p_size_mb, p_preallocate, p_eagerly_scrub,
        p_storage_tag_id, p_physical_disk_type
    )
    ON CONFLICT (vm_uuid, disk_id) DO UPDATE SET
        storage_id = EXCLUDED.storage_id,
        storage_name = EXCLUDED.storage_name,
        storage_file = EXCLUDED.storage_file,
        size_mb = EXCLUDED.size_mb,
        preallocate = EXCLUDED.preallocate,
        eagerly_scrub = EXCLUDED.eagerly_scrub,
        storage_tag_id = EXCLUDED.storage_tag_id,
        physical_disk_type = EXCLUDED.physical_disk_type,
        is_active = TRUE
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1.8 Upsert VM Network Interface Configuration
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.upsert_vm_nic(
    p_vm_uuid UUID,
    p_vif_id VARCHAR(20),
    p_port_id UUID,
    p_network_name VARCHAR(100),
    p_mac_address VARCHAR(20),
    p_ip_address INET,
    p_ipv6_address INET DEFAULT NULL,
    p_model VARCHAR(20) DEFAULT 'virtio',
    p_is_connected BOOLEAN DEFAULT TRUE,
    p_vpc_id VARCHAR(50) DEFAULT NULL,
    p_vpc_name VARCHAR(100) DEFAULT NULL,
    p_subnet_id VARCHAR(50) DEFAULT NULL,
    p_subnet_name VARCHAR(100) DEFAULT NULL,
    p_device_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO sangfor.vm_network_config (
        vm_uuid, vif_id, port_id, network_name,
        mac_address, ip_address, ipv6_address, model,
        is_connected, vpc_id, vpc_name, subnet_id, subnet_name, device_id
    )
    VALUES (
        p_vm_uuid, p_vif_id, p_port_id, p_network_name,
        p_mac_address, p_ip_address, p_ipv6_address, p_model,
        p_is_connected, p_vpc_id, p_vpc_name, p_subnet_id, p_subnet_name, p_device_id
    )
    ON CONFLICT (vm_uuid, vif_id) DO UPDATE SET
        port_id = EXCLUDED.port_id,
        network_name = EXCLUDED.network_name,
        mac_address = EXCLUDED.mac_address,
        ip_address = EXCLUDED.ip_address,
        ipv6_address = EXCLUDED.ipv6_address,
        model = EXCLUDED.model,
        is_connected = EXCLUDED.is_connected,
        vpc_id = EXCLUDED.vpc_id,
        vpc_name = EXCLUDED.vpc_name,
        subnet_id = EXCLUDED.subnet_id,
        subnet_name = EXCLUDED.subnet_name,
        device_id = EXCLUDED.device_id,
        is_active = TRUE
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 2: INSERT FUNCTIONS FOR METRICS DATA
-- ============================================================

-- ============================================================
-- 2.1 Insert VM Metrics (Append-only)
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.insert_vm_metrics(
    p_collected_at TIMESTAMPTZ,
    p_batch_id UUID,
    p_vm_uuid UUID,
    p_power_state VARCHAR(20),
    p_status VARCHAR(20),
    p_uptime_seconds BIGINT,
    p_is_stopped BOOLEAN,
    p_cpu_total_mhz NUMERIC,
    p_cpu_used_mhz NUMERIC,
    p_cpu_ratio NUMERIC,
    p_memory_total_mb NUMERIC,
    p_memory_used_mb NUMERIC,
    p_memory_ratio NUMERIC,
    p_storage_total_mb NUMERIC,
    p_storage_used_mb NUMERIC,
    p_storage_file_size_mb NUMERIC,
    p_storage_ratio NUMERIC,
    p_network_read_bitps NUMERIC,
    p_network_write_bitps NUMERIC,
    p_disk_read_byteps NUMERIC,
    p_disk_write_byteps NUMERIC,
    p_disk_read_iops NUMERIC,
    p_disk_write_iops NUMERIC,
    p_gpu_count SMALLINT DEFAULT 0,
    p_gpu_mem_total BIGINT DEFAULT 0,
    p_gpu_mem_used BIGINT DEFAULT 0,
    p_gpu_mem_ratio NUMERIC DEFAULT 0,
    p_gpu_ratio NUMERIC DEFAULT 0,
    p_host_id VARCHAR(50) DEFAULT NULL,
    p_host_name VARCHAR(50) DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
BEGIN
    -- Ensure partition exists
    PERFORM metrics.ensure_partition_exists(p_collected_at);
    
    INSERT INTO metrics.vm_metrics (
        collected_at, batch_id, vm_uuid,
        power_state, status, uptime_seconds, is_stopped,
        cpu_total_mhz, cpu_used_mhz, cpu_ratio,
        memory_total_mb, memory_used_mb, memory_ratio,
        storage_total_mb, storage_used_mb, storage_file_size_mb, storage_ratio,
        network_read_bitps, network_write_bitps,
        disk_read_byteps, disk_write_byteps, disk_read_iops, disk_write_iops,
        gpu_count, gpu_mem_total, gpu_mem_used, gpu_mem_ratio, gpu_ratio,
        host_id, host_name
    )
    VALUES (
        p_collected_at, p_batch_id, p_vm_uuid,
        p_power_state, p_status, p_uptime_seconds, p_is_stopped,
        p_cpu_total_mhz, p_cpu_used_mhz, p_cpu_ratio,
        p_memory_total_mb, p_memory_used_mb, p_memory_ratio,
        p_storage_total_mb, p_storage_used_mb, p_storage_file_size_mb, p_storage_ratio,
        p_network_read_bitps, p_network_write_bitps,
        p_disk_read_byteps, p_disk_write_byteps, p_disk_read_iops, p_disk_write_iops,
        p_gpu_count, p_gpu_mem_total, p_gpu_mem_used, p_gpu_mem_ratio, p_gpu_ratio,
        p_host_id, p_host_name
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2.2 Insert VM Alarm (Only if alarm/warning exists)
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.insert_vm_alarm_if_exists(
    p_collected_at TIMESTAMPTZ,
    p_batch_id UUID,
    p_vm_uuid UUID,
    p_has_alarm BOOLEAN,
    p_alarm_count INTEGER,
    p_alarm_info JSONB,
    p_has_warning BOOLEAN,
    p_warning_type VARCHAR(50),
    p_warning_info TEXT,
    p_power_state VARCHAR(20),
    p_status VARCHAR(20)
) RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
BEGIN
    -- Only insert if there's an alarm or warning
    IF p_has_alarm OR p_has_warning THEN
        -- Ensure partition exists
        PERFORM metrics.ensure_partition_exists(p_collected_at);
        
        INSERT INTO metrics.vm_alarm_snapshot (
            collected_at, batch_id, vm_uuid,
            has_alarm, alarm_count, alarm_info,
            has_warning, warning_type, warning_info,
            power_state, status
        )
        VALUES (
            p_collected_at, p_batch_id, p_vm_uuid,
            p_has_alarm, p_alarm_count, p_alarm_info,
            p_has_warning, p_warning_type, p_warning_info,
            p_power_state, p_status
        )
        RETURNING id INTO v_id;
        
        RETURN v_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2.3 Bulk Insert VM Metrics (For batch processing)
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.bulk_insert_vm_metrics(
    p_metrics JSONB
) RETURNS TABLE(
    total_inserted INTEGER,
    batch_id UUID
) AS $$
DECLARE
    v_batch_id UUID;
    v_collected_at TIMESTAMPTZ;
    v_count INTEGER := 0;
    v_record JSONB;
BEGIN
    v_batch_id := gen_random_uuid();
    v_collected_at := CURRENT_TIMESTAMP;
    
    -- Ensure partition exists
    PERFORM metrics.ensure_partition_exists(v_collected_at);
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_metrics)
    LOOP
        INSERT INTO metrics.vm_metrics (
            collected_at, batch_id, vm_uuid,
            power_state, status, uptime_seconds, is_stopped,
            cpu_total_mhz, cpu_used_mhz, cpu_ratio,
            memory_total_mb, memory_used_mb, memory_ratio,
            storage_total_mb, storage_used_mb, storage_file_size_mb, storage_ratio,
            network_read_bitps, network_write_bitps,
            disk_read_byteps, disk_write_byteps, disk_read_iops, disk_write_iops,
            host_id, host_name
        )
        VALUES (
            v_collected_at, v_batch_id, (v_record->>'vm_uuid')::UUID,
            v_record->>'power_state', v_record->>'status', 
            (v_record->>'uptime_seconds')::BIGINT, (v_record->>'is_stopped')::BOOLEAN,
            (v_record->>'cpu_total_mhz')::NUMERIC, (v_record->>'cpu_used_mhz')::NUMERIC, (v_record->>'cpu_ratio')::NUMERIC,
            (v_record->>'memory_total_mb')::NUMERIC, (v_record->>'memory_used_mb')::NUMERIC, (v_record->>'memory_ratio')::NUMERIC,
            (v_record->>'storage_total_mb')::NUMERIC, (v_record->>'storage_used_mb')::NUMERIC, 
            (v_record->>'storage_file_size_mb')::NUMERIC, (v_record->>'storage_ratio')::NUMERIC,
            (v_record->>'network_read_bitps')::NUMERIC, (v_record->>'network_write_bitps')::NUMERIC,
            (v_record->>'disk_read_byteps')::NUMERIC, (v_record->>'disk_write_byteps')::NUMERIC,
            (v_record->>'disk_read_iops')::NUMERIC, (v_record->>'disk_write_iops')::NUMERIC,
            v_record->>'host_id', v_record->>'host_name'
        );
        v_count := v_count + 1;
    END LOOP;
    
    total_inserted := v_count;
    batch_id := v_batch_id;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 3: QUERY FUNCTIONS FOR DASHBOARD/ANALYTICS
-- ============================================================

-- ============================================================
-- 3.1 Get VM Metrics for Time Range
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_vm_metrics_range(
    p_vm_uuid UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_interval INTERVAL DEFAULT '5 minutes'
) RETURNS TABLE(
    time_bucket TIMESTAMPTZ,
    avg_cpu_ratio NUMERIC,
    max_cpu_ratio NUMERIC,
    avg_memory_ratio NUMERIC,
    max_memory_ratio NUMERIC,
    avg_storage_ratio NUMERIC,
    avg_network_read_bitps NUMERIC,
    avg_network_write_bitps NUMERIC,
    avg_disk_read_iops NUMERIC,
    avg_disk_write_iops NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('minute', m.collected_at) + 
            (EXTRACT(minute FROM m.collected_at)::INT / EXTRACT(minute FROM p_interval)::INT) * p_interval AS time_bucket,
        AVG(m.cpu_ratio)::NUMERIC(5,4) AS avg_cpu_ratio,
        MAX(m.cpu_ratio)::NUMERIC(5,4) AS max_cpu_ratio,
        AVG(m.memory_ratio)::NUMERIC(5,4) AS avg_memory_ratio,
        MAX(m.memory_ratio)::NUMERIC(5,4) AS max_memory_ratio,
        AVG(m.storage_ratio)::NUMERIC(5,4) AS avg_storage_ratio,
        AVG(m.network_read_bitps)::NUMERIC(15,2) AS avg_network_read_bitps,
        AVG(m.network_write_bitps)::NUMERIC(15,2) AS avg_network_write_bitps,
        AVG(m.disk_read_iops)::NUMERIC(12,2) AS avg_disk_read_iops,
        AVG(m.disk_write_iops)::NUMERIC(12,2) AS avg_disk_write_iops,
        COUNT(*) AS sample_count
    FROM metrics.vm_metrics m
    WHERE m.vm_uuid = p_vm_uuid
      AND m.collected_at >= p_start_time
      AND m.collected_at < p_end_time
    GROUP BY 1
    ORDER BY 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3.2 Get Top VMs by Resource Usage
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_top_vm_by_resource(
    p_resource_type VARCHAR(20),  -- 'cpu', 'memory', 'storage', 'network', 'disk_io'
    p_time_range INTERVAL DEFAULT '1 hour',
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    vm_uuid UUID,
    vm_name VARCHAR(200),
    group_name VARCHAR(100),
    host_name VARCHAR(50),
    avg_usage NUMERIC,
    max_usage NUMERIC,
    current_usage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_metrics AS (
        SELECT 
            m.vm_uuid,
            CASE p_resource_type
                WHEN 'cpu' THEN m.cpu_ratio
                WHEN 'memory' THEN m.memory_ratio
                WHEN 'storage' THEN m.storage_ratio
                WHEN 'network' THEN (m.network_read_bitps + m.network_write_bitps) / 1000000  -- Mbps
                WHEN 'disk_io' THEN (m.disk_read_iops + m.disk_write_iops)
                ELSE m.cpu_ratio
            END AS usage_value,
            m.collected_at,
            ROW_NUMBER() OVER (PARTITION BY m.vm_uuid ORDER BY m.collected_at DESC) AS rn
        FROM metrics.vm_metrics m
        WHERE m.collected_at >= CURRENT_TIMESTAMP - p_time_range
    ),
    aggregated AS (
        SELECT 
            rm.vm_uuid,
            AVG(rm.usage_value) AS avg_usage,
            MAX(rm.usage_value) AS max_usage,
            MAX(CASE WHEN rm.rn = 1 THEN rm.usage_value END) AS current_usage
        FROM recent_metrics rm
        GROUP BY rm.vm_uuid
    )
    SELECT 
        a.vm_uuid,
        vm.name AS vm_name,
        g.group_name,
        h.host_name,
        a.avg_usage::NUMERIC(10,4),
        a.max_usage::NUMERIC(10,4),
        a.current_usage::NUMERIC(10,4)
    FROM aggregated a
    JOIN sangfor.vm_master vm ON a.vm_uuid = vm.vm_uuid
    LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
    LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
    ORDER BY a.avg_usage DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3.3 Get VM Current Status
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_vm_current_status(
    p_vm_uuid UUID DEFAULT NULL
) RETURNS TABLE(
    vm_uuid UUID,
    vm_name VARCHAR(200),
    group_name VARCHAR(100),
    host_name VARCHAR(50),
    power_state VARCHAR(20),
    status VARCHAR(20),
    uptime_seconds BIGINT,
    cpu_usage NUMERIC,
    memory_usage NUMERIC,
    storage_usage NUMERIC,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_metrics AS (
        SELECT DISTINCT ON (m.vm_uuid)
            m.vm_uuid,
            m.power_state,
            m.status,
            m.uptime_seconds,
            m.cpu_ratio,
            m.memory_ratio,
            m.storage_ratio,
            m.collected_at
        FROM metrics.vm_metrics m
        WHERE (p_vm_uuid IS NULL OR m.vm_uuid = p_vm_uuid)
        ORDER BY m.vm_uuid, m.collected_at DESC
    )
    SELECT 
        lm.vm_uuid,
        vm.name AS vm_name,
        g.group_name,
        h.host_name,
        lm.power_state,
        lm.status,
        lm.uptime_seconds,
        lm.cpu_ratio AS cpu_usage,
        lm.memory_ratio AS memory_usage,
        lm.storage_ratio AS storage_usage,
        lm.collected_at AS last_updated
    FROM latest_metrics lm
    JOIN sangfor.vm_master vm ON lm.vm_uuid = vm.vm_uuid
    LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
    LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
    ORDER BY vm.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3.4 Get Active Alarms
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_active_alarms(
    p_hours INTEGER DEFAULT 24
) RETURNS TABLE(
    vm_uuid UUID,
    vm_name VARCHAR(200),
    group_name VARCHAR(100),
    host_name VARCHAR(50),
    alarm_count INTEGER,
    alarm_info JSONB,
    warning_type VARCHAR(50),
    warning_info TEXT,
    collected_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (a.vm_uuid)
        a.vm_uuid,
        vm.name AS vm_name,
        g.group_name,
        h.host_name,
        a.alarm_count,
        a.alarm_info,
        a.warning_type,
        a.warning_info,
        a.collected_at
    FROM metrics.vm_alarm_snapshot a
    JOIN sangfor.vm_master vm ON a.vm_uuid = vm.vm_uuid
    LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
    LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
    WHERE a.collected_at >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
      AND (a.has_alarm = TRUE OR a.has_warning = TRUE)
    ORDER BY a.vm_uuid, a.collected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3.5 Get Host Summary
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_host_summary()
RETURNS TABLE(
    host_id VARCHAR(50),
    host_name VARCHAR(50),
    az_name VARCHAR(100),
    total_vms BIGINT,
    running_vms BIGINT,
    total_cpu_mhz NUMERIC,
    used_cpu_mhz NUMERIC,
    cpu_usage_pct NUMERIC,
    total_memory_mb NUMERIC,
    used_memory_mb NUMERIC,
    memory_usage_pct NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_metrics AS (
        SELECT DISTINCT ON (m.vm_uuid)
            m.vm_uuid,
            m.host_id,
            m.power_state,
            m.cpu_total_mhz,
            m.cpu_used_mhz,
            m.memory_total_mb,
            m.memory_used_mb
        FROM metrics.vm_metrics m
        WHERE m.collected_at >= CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        ORDER BY m.vm_uuid, m.collected_at DESC
    )
    SELECT 
        h.host_id,
        h.host_name,
        az.az_name,
        COUNT(lm.vm_uuid) AS total_vms,
        COUNT(lm.vm_uuid) FILTER (WHERE lm.power_state = 'on') AS running_vms,
        SUM(lm.cpu_total_mhz) AS total_cpu_mhz,
        SUM(lm.cpu_used_mhz) AS used_cpu_mhz,
        CASE 
            WHEN SUM(lm.cpu_total_mhz) > 0 
            THEN ROUND(SUM(lm.cpu_used_mhz) / SUM(lm.cpu_total_mhz) * 100, 2)
            ELSE 0
        END AS cpu_usage_pct,
        SUM(lm.memory_total_mb) AS total_memory_mb,
        SUM(lm.memory_used_mb) AS used_memory_mb,
        CASE 
            WHEN SUM(lm.memory_total_mb) > 0 
            THEN ROUND(SUM(lm.memory_used_mb) / SUM(lm.memory_total_mb) * 100, 2)
            ELSE 0
        END AS memory_usage_pct
    FROM sangfor.host_master h
    LEFT JOIN sangfor.az_master az ON h.az_id = az.az_id
    LEFT JOIN latest_metrics lm ON h.host_id = lm.host_id
    GROUP BY h.host_id, h.host_name, az.az_name
    ORDER BY h.host_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3.6 Get Capacity Trend (for planning)
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_capacity_trend(
    p_resource_type VARCHAR(20),  -- 'cpu', 'memory', 'storage'
    p_days INTEGER DEFAULT 30,
    p_group_id UUID DEFAULT NULL
) RETURNS TABLE(
    date_bucket DATE,
    total_capacity NUMERIC,
    avg_used NUMERIC,
    max_used NUMERIC,
    usage_pct NUMERIC,
    vm_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(m.collected_at) AS date_bucket,
        AVG(
            CASE p_resource_type
                WHEN 'cpu' THEN m.cpu_total_mhz
                WHEN 'memory' THEN m.memory_total_mb
                WHEN 'storage' THEN m.storage_total_mb
            END
        )::NUMERIC(15,2) AS total_capacity,
        AVG(
            CASE p_resource_type
                WHEN 'cpu' THEN m.cpu_used_mhz
                WHEN 'memory' THEN m.memory_used_mb
                WHEN 'storage' THEN m.storage_used_mb
            END
        )::NUMERIC(15,2) AS avg_used,
        MAX(
            CASE p_resource_type
                WHEN 'cpu' THEN m.cpu_used_mhz
                WHEN 'memory' THEN m.memory_used_mb
                WHEN 'storage' THEN m.storage_used_mb
            END
        )::NUMERIC(15,2) AS max_used,
        AVG(
            CASE p_resource_type
                WHEN 'cpu' THEN m.cpu_ratio
                WHEN 'memory' THEN m.memory_ratio
                WHEN 'storage' THEN m.storage_ratio
            END * 100
        )::NUMERIC(5,2) AS usage_pct,
        COUNT(DISTINCT m.vm_uuid) AS vm_count
    FROM metrics.vm_metrics m
    JOIN sangfor.vm_master vm ON m.vm_uuid = vm.vm_uuid
    WHERE m.collected_at >= CURRENT_DATE - p_days
      AND (p_group_id IS NULL OR vm.group_id = p_group_id)
    GROUP BY DATE(m.collected_at)
    ORDER BY DATE(m.collected_at);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3.7 Search VMs
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.search_vms(
    p_search_term VARCHAR(200) DEFAULT NULL,
    p_group_id UUID DEFAULT NULL,
    p_host_id VARCHAR(50) DEFAULT NULL,
    p_power_state VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
) RETURNS TABLE(
    vm_uuid UUID,
    vm_id BIGINT,
    vm_name VARCHAR(200),
    group_name VARCHAR(100),
    host_name VARCHAR(50),
    os_name VARCHAR(100),
    power_state VARCHAR(20),
    cpu_cores SMALLINT,
    memory_mb NUMERIC,
    storage_mb NUMERIC,
    ip_addresses TEXT[],
    last_seen_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vm.vm_uuid,
        vm.vm_id,
        vm.name AS vm_name,
        g.group_name,
        h.host_name,
        vm.os_name,
        COALESCE(lm.power_state, 'unknown') AS power_state,
        vm.cpu_cores,
        vm.memory_total_mb AS memory_mb,
        vm.storage_total_mb AS storage_mb,
        ARRAY_AGG(DISTINCT nic.ip_address::TEXT) FILTER (WHERE nic.ip_address IS NOT NULL) AS ip_addresses,
        vm.last_seen_at
    FROM sangfor.vm_master vm
    LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
    LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
    LEFT JOIN sangfor.vm_network_config nic ON vm.vm_uuid = nic.vm_uuid AND nic.is_active = TRUE
    LEFT JOIN LATERAL (
        SELECT m.power_state 
        FROM metrics.vm_metrics m 
        WHERE m.vm_uuid = vm.vm_uuid 
        ORDER BY m.collected_at DESC 
        LIMIT 1
    ) lm ON TRUE
    WHERE vm.is_deleted = FALSE
      AND (p_search_term IS NULL OR vm.name ILIKE '%' || p_search_term || '%')
      AND (p_group_id IS NULL OR vm.group_id = p_group_id)
      AND (p_host_id IS NULL OR vm.host_id = p_host_id)
      AND (p_power_state IS NULL OR lm.power_state = p_power_state)
    GROUP BY vm.vm_uuid, vm.vm_id, vm.name, g.group_name, h.host_name, 
             vm.os_name, lm.power_state, vm.cpu_cores, vm.memory_total_mb,
             vm.storage_total_mb, vm.last_seen_at
    ORDER BY vm.name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
