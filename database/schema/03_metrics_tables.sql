-- ============================================================
-- Sangfor SCP Time-Series Metrics Tables
-- 
-- These tables store time-series data collected periodically
-- Designed for partitioning by month for efficient data management
-- TimescaleDB compatible - can be converted to hypertables
-- ============================================================

-- Connect to database first
-- \c sangfor_scp

-- ============================================================
-- 1. VM Metrics (Main metrics table - Partitioned)
-- ============================================================
-- Create the parent partitioned table
CREATE TABLE IF NOT EXISTS metrics.vm_metrics (
    id                      BIGSERIAL,
    collected_at            TIMESTAMPTZ NOT NULL,
    batch_id                UUID,
    vm_uuid                 UUID NOT NULL,
    
    -- Power/Status
    power_state             VARCHAR(20),         -- on, off, suspended
    status                  VARCHAR(20),         -- running, stopped, error
    uptime_seconds          BIGINT,
    is_stopped              BOOLEAN DEFAULT FALSE,
    
    -- CPU Metrics
    cpu_total_mhz           NUMERIC(12,2),
    cpu_used_mhz            NUMERIC(12,2),
    cpu_ratio               NUMERIC(5,4),        -- 0.0000 to 1.0000
    
    -- Memory Metrics
    memory_total_mb         NUMERIC(12,2),
    memory_used_mb          NUMERIC(12,2),
    memory_ratio            NUMERIC(5,4),
    
    -- Storage Metrics (Aggregated)
    storage_total_mb        NUMERIC(15,2),
    storage_used_mb         NUMERIC(15,2),
    storage_file_size_mb    NUMERIC(15,2),
    storage_ratio           NUMERIC(5,4),
    
    -- Network I/O Metrics
    network_read_bitps      NUMERIC(15,2),
    network_write_bitps     NUMERIC(15,2),
    
    -- Disk I/O Metrics
    disk_read_byteps        NUMERIC(15,2),
    disk_write_byteps       NUMERIC(15,2),
    disk_read_iops          NUMERIC(12,2),
    disk_write_iops         NUMERIC(12,2),
    
    -- GPU Metrics (if applicable)
    gpu_count               SMALLINT DEFAULT 0,
    gpu_mem_total           BIGINT DEFAULT 0,
    gpu_mem_used            BIGINT DEFAULT 0,
    gpu_mem_ratio           NUMERIC(5,4) DEFAULT 0,
    gpu_ratio               NUMERIC(5,4) DEFAULT 0,
    
    -- Host info at collection time (for migration tracking)
    host_id                 VARCHAR(50),
    host_name               VARCHAR(50),
    
    -- Composite primary key for partitioning
    PRIMARY KEY (collected_at, id)
) PARTITION BY RANGE (collected_at);

-- Create indexes on the parent table (inherited by partitions)
CREATE INDEX idx_vm_metrics_vm ON metrics.vm_metrics(vm_uuid, collected_at DESC);
CREATE INDEX idx_vm_metrics_batch ON metrics.vm_metrics(batch_id);
CREATE INDEX idx_vm_metrics_host ON metrics.vm_metrics(host_id, collected_at DESC);
CREATE INDEX idx_vm_metrics_status ON metrics.vm_metrics(power_state, collected_at DESC);

-- Index for resource usage queries
CREATE INDEX idx_vm_metrics_cpu ON metrics.vm_metrics(cpu_ratio DESC, collected_at DESC);
CREATE INDEX idx_vm_metrics_memory ON metrics.vm_metrics(memory_ratio DESC, collected_at DESC);
CREATE INDEX idx_vm_metrics_storage ON metrics.vm_metrics(storage_ratio DESC, collected_at DESC);

COMMENT ON TABLE metrics.vm_metrics IS 'Time-series VM metrics - partitioned by month. Primary metrics table.';

-- ============================================================
-- 2. VM Storage Metrics (Per-disk metrics - Partitioned)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics.vm_storage_metrics (
    id                      BIGSERIAL,
    collected_at            TIMESTAMPTZ NOT NULL,
    batch_id                UUID,
    vm_uuid                 UUID NOT NULL,
    disk_id                 VARCHAR(20) NOT NULL,    -- ide0, scsi0, etc.
    
    -- Storage metrics per disk
    storage_id              VARCHAR(50),
    storage_name            VARCHAR(100),
    size_mb                 NUMERIC(15,2),
    used_mb                 NUMERIC(15,2),
    file_size_mb            NUMERIC(15,2),
    
    -- I/O metrics per disk (if available)
    read_byteps             NUMERIC(15,2),
    write_byteps            NUMERIC(15,2),
    read_iops               NUMERIC(12,2),
    write_iops              NUMERIC(12,2),
    
    PRIMARY KEY (collected_at, id)
) PARTITION BY RANGE (collected_at);

CREATE INDEX idx_storage_metrics_vm ON metrics.vm_storage_metrics(vm_uuid, collected_at DESC);
CREATE INDEX idx_storage_metrics_disk ON metrics.vm_storage_metrics(vm_uuid, disk_id, collected_at DESC);
CREATE INDEX idx_storage_metrics_storage ON metrics.vm_storage_metrics(storage_id, collected_at DESC);

COMMENT ON TABLE metrics.vm_storage_metrics IS 'Per-disk storage metrics for detailed storage analysis';

-- ============================================================
-- 3. VM Network Metrics (Per-interface metrics - Partitioned)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics.vm_network_metrics (
    id                      BIGSERIAL,
    collected_at            TIMESTAMPTZ NOT NULL,
    batch_id                UUID,
    vm_uuid                 UUID NOT NULL,
    vif_id                  VARCHAR(20) NOT NULL,    -- net0, net1, etc.
    
    -- Network configuration at time of collection
    network_name            VARCHAR(100),
    ip_address              INET,
    mac_address             VARCHAR(20),
    
    -- Network I/O metrics
    rx_bitps                NUMERIC(15,2),           -- Receive bits per second
    tx_bitps                NUMERIC(15,2),           -- Transmit bits per second
    rx_packets              BIGINT,
    tx_packets              BIGINT,
    rx_errors               BIGINT,
    tx_errors               BIGINT,
    
    PRIMARY KEY (collected_at, id)
) PARTITION BY RANGE (collected_at);

CREATE INDEX idx_network_metrics_vm ON metrics.vm_network_metrics(vm_uuid, collected_at DESC);
CREATE INDEX idx_network_metrics_vif ON metrics.vm_network_metrics(vm_uuid, vif_id, collected_at DESC);
CREATE INDEX idx_network_metrics_ip ON metrics.vm_network_metrics(ip_address, collected_at DESC);

COMMENT ON TABLE metrics.vm_network_metrics IS 'Per-interface network metrics for detailed network analysis';

-- ============================================================
-- 4. VM Alarm/Warning Snapshot (Partitioned)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics.vm_alarm_snapshot (
    id                      BIGSERIAL,
    collected_at            TIMESTAMPTZ NOT NULL,
    batch_id                UUID,
    vm_uuid                 UUID NOT NULL,
    
    -- Alarm information
    has_alarm               BOOLEAN DEFAULT FALSE,
    alarm_count             INTEGER DEFAULT 0,
    alarm_info              JSONB,                   -- Store alarm details as JSON
    
    -- Warning information
    has_warning             BOOLEAN DEFAULT FALSE,
    warning_type            VARCHAR(50),
    warning_info            TEXT,
    
    -- Status at time of alarm
    power_state             VARCHAR(20),
    status                  VARCHAR(20),
    
    PRIMARY KEY (collected_at, id)
) PARTITION BY RANGE (collected_at);

CREATE INDEX idx_alarm_vm ON metrics.vm_alarm_snapshot(vm_uuid, collected_at DESC);
CREATE INDEX idx_alarm_has ON metrics.vm_alarm_snapshot(has_alarm, collected_at DESC) WHERE has_alarm = TRUE;
CREATE INDEX idx_warning_has ON metrics.vm_alarm_snapshot(has_warning, collected_at DESC) WHERE has_warning = TRUE;

COMMENT ON TABLE metrics.vm_alarm_snapshot IS 'Alarm and warning snapshots - only stores records with alarms/warnings';

-- ============================================================
-- 5. Host Metrics (Aggregate host metrics - Partitioned)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics.host_metrics (
    id                      BIGSERIAL,
    collected_at            TIMESTAMPTZ NOT NULL,
    batch_id                UUID,
    host_id                 VARCHAR(50) NOT NULL,
    
    -- Aggregate metrics from VMs on this host
    vm_count                INTEGER DEFAULT 0,
    vm_running_count        INTEGER DEFAULT 0,
    
    -- Aggregate CPU
    cpu_total_mhz           NUMERIC(15,2),
    cpu_used_mhz            NUMERIC(15,2),
    cpu_ratio               NUMERIC(5,4),
    
    -- Aggregate Memory
    memory_total_mb         NUMERIC(15,2),
    memory_used_mb          NUMERIC(15,2),
    memory_ratio            NUMERIC(5,4),
    
    -- Aggregate Storage
    storage_total_mb        NUMERIC(18,2),
    storage_used_mb         NUMERIC(18,2),
    storage_ratio           NUMERIC(5,4),
    
    PRIMARY KEY (collected_at, id)
) PARTITION BY RANGE (collected_at);

CREATE INDEX idx_host_metrics_host ON metrics.host_metrics(host_id, collected_at DESC);

COMMENT ON TABLE metrics.host_metrics IS 'Aggregated host-level metrics for capacity planning';

-- ============================================================
-- Function to create monthly partitions
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.create_monthly_partition(
    p_table_name TEXT,
    p_year INTEGER,
    p_month INTEGER
) RETURNS TEXT AS $$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_sql TEXT;
BEGIN
    -- Generate partition name
    v_partition_name := format('%s_%s_%s', 
        p_table_name, 
        p_year, 
        LPAD(p_month::TEXT, 2, '0')
    );
    
    -- Calculate date range
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := v_start_date + INTERVAL '1 month';
    
    -- Create the partition
    v_sql := format(
        'CREATE TABLE IF NOT EXISTS metrics.%I PARTITION OF metrics.%I 
         FOR VALUES FROM (%L) TO (%L)',
        v_partition_name,
        p_table_name,
        v_start_date,
        v_end_date
    );
    
    EXECUTE v_sql;
    
    RETURN v_partition_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Function to create all partitions for a given date range
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.create_partitions_for_range(
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE(table_name TEXT, partition_name TEXT) AS $$
DECLARE
    v_current_date DATE;
    v_tables TEXT[] := ARRAY['vm_metrics', 'vm_storage_metrics', 'vm_network_metrics', 'vm_alarm_snapshot', 'host_metrics'];
    v_table TEXT;
    v_year INTEGER;
    v_month INTEGER;
    v_partition TEXT;
BEGIN
    v_current_date := date_trunc('month', p_start_date);
    
    WHILE v_current_date < p_end_date LOOP
        v_year := EXTRACT(YEAR FROM v_current_date);
        v_month := EXTRACT(MONTH FROM v_current_date);
        
        FOREACH v_table IN ARRAY v_tables LOOP
            v_partition := metrics.create_monthly_partition(v_table, v_year, v_month);
            table_name := v_table;
            partition_name := v_partition;
            RETURN NEXT;
        END LOOP;
        
        v_current_date := v_current_date + INTERVAL '1 month';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Create initial partitions (2025-01 to 2026-12)
-- ============================================================
SELECT * FROM metrics.create_partitions_for_range('2025-01-01', '2027-01-01');

-- ============================================================
-- Function to auto-create future partitions
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.ensure_partition_exists(
    p_timestamp TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
    v_year INTEGER;
    v_month INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM p_timestamp);
    v_month := EXTRACT(MONTH FROM p_timestamp);
    
    -- Create partitions for all metric tables
    PERFORM metrics.create_monthly_partition('vm_metrics', v_year, v_month);
    PERFORM metrics.create_monthly_partition('vm_storage_metrics', v_year, v_month);
    PERFORM metrics.create_monthly_partition('vm_network_metrics', v_year, v_month);
    PERFORM metrics.create_monthly_partition('vm_alarm_snapshot', v_year, v_month);
    PERFORM metrics.create_monthly_partition('host_metrics', v_year, v_month);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION metrics.ensure_partition_exists IS 'Ensures partitions exist for the given timestamp. Call before inserting data.';
