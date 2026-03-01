-- ============================================================
-- Sangfor SCP Data Retention and Maintenance
-- 
-- Partition management and data cleanup procedures
-- ============================================================

-- Connect to database first
-- \c sangfor_scp

-- ============================================================
-- 1. Drop Old Partitions (Retention Policy)
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.drop_old_partitions(
    p_retention_months INTEGER DEFAULT 12
) RETURNS TABLE(
    table_name TEXT,
    partition_name TEXT,
    dropped BOOLEAN
) AS $$
DECLARE
    v_partition RECORD;
    v_cutoff_date DATE;
BEGIN
    v_cutoff_date := (CURRENT_DATE - (p_retention_months || ' months')::INTERVAL)::DATE;
    
    FOR v_partition IN 
        SELECT 
            parent.relname AS parent_name,
            child.relname AS partition_name,
            pg_get_expr(child.relpartbound, child.oid) AS partition_bound
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        JOIN pg_namespace ns ON parent.relnamespace = ns.oid
        WHERE ns.nspname = 'metrics'
        ORDER BY child.relname
    LOOP
        -- Check if partition is older than retention period
        IF v_partition.partition_name ~ '_\d{4}_\d{2}$' THEN
            DECLARE
                v_year INTEGER;
                v_month INTEGER;
                v_partition_date DATE;
            BEGIN
                v_year := SUBSTRING(v_partition.partition_name FROM '_(\d{4})_\d{2}$')::INTEGER;
                v_month := SUBSTRING(v_partition.partition_name FROM '_\d{4}_(\d{2})$')::INTEGER;
                v_partition_date := make_date(v_year, v_month, 1);
                
                IF v_partition_date < v_cutoff_date THEN
                    EXECUTE format('DROP TABLE IF EXISTS metrics.%I', v_partition.partition_name);
                    table_name := v_partition.parent_name;
                    partition_name := v_partition.partition_name;
                    dropped := TRUE;
                    RETURN NEXT;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Skip if can't parse date
                CONTINUE;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION metrics.drop_old_partitions IS 'Drop partitions older than retention period (default 12 months)';

-- ============================================================
-- 2. Create Future Partitions
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.create_future_partitions(
    p_months_ahead INTEGER DEFAULT 3
) RETURNS TABLE(
    table_name TEXT,
    partition_name TEXT
) AS $$
DECLARE
    v_result RECORD;
BEGIN
    FOR v_result IN 
        SELECT * FROM metrics.create_partitions_for_range(
            CURRENT_DATE,
            CURRENT_DATE + (p_months_ahead || ' months')::INTERVAL
        )
    LOOP
        table_name := v_result.table_name;
        partition_name := v_result.partition_name;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Mark Stale VMs as Deleted
-- ============================================================
CREATE OR REPLACE FUNCTION sangfor.mark_stale_vms_deleted(
    p_stale_hours INTEGER DEFAULT 24
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE sangfor.vm_master
    SET is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP
    WHERE is_deleted = FALSE
      AND last_seen_at < CURRENT_TIMESTAMP - (p_stale_hours || ' hours')::INTERVAL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Vacuum Analyze Tables
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.maintenance_vacuum_analyze()
RETURNS TABLE(table_name TEXT, status TEXT) AS $$
DECLARE
    v_table RECORD;
BEGIN
    -- Vacuum analyze all metric tables
    FOR v_table IN 
        SELECT schemaname || '.' || tablename AS full_name
        FROM pg_tables 
        WHERE schemaname = 'metrics'
    LOOP
        BEGIN
            EXECUTE format('VACUUM ANALYZE %s', v_table.full_name);
            table_name := v_table.full_name;
            status := 'success';
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            table_name := v_table.full_name;
            status := 'error: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
    
    -- Vacuum analyze sangfor schema
    FOR v_table IN 
        SELECT schemaname || '.' || tablename AS full_name
        FROM pg_tables 
        WHERE schemaname = 'sangfor'
    LOOP
        BEGIN
            EXECUTE format('VACUUM ANALYZE %s', v_table.full_name);
            table_name := v_table.full_name;
            status := 'success';
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            table_name := v_table.full_name;
            status := 'error: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Get Database Statistics
-- ============================================================
CREATE OR REPLACE FUNCTION analytics.get_database_stats()
RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT
) AS $$
BEGIN
    -- Total VM count
    metric_name := 'Total VMs (active)';
    SELECT COUNT(*)::TEXT INTO metric_value FROM sangfor.vm_master WHERE is_deleted = FALSE;
    RETURN NEXT;
    
    -- Total metrics records
    metric_name := 'Total metric records';
    SELECT COUNT(*)::TEXT INTO metric_value FROM metrics.vm_metrics;
    RETURN NEXT;
    
    -- Metrics table size
    metric_name := 'Metrics table size';
    SELECT pg_size_pretty(pg_total_relation_size('metrics.vm_metrics')) INTO metric_value;
    RETURN NEXT;
    
    -- Oldest metrics date
    metric_name := 'Oldest metrics date';
    SELECT MIN(collected_at)::TEXT INTO metric_value FROM metrics.vm_metrics;
    RETURN NEXT;
    
    -- Latest metrics date
    metric_name := 'Latest metrics date';
    SELECT MAX(collected_at)::TEXT INTO metric_value FROM metrics.vm_metrics;
    RETURN NEXT;
    
    -- Number of partitions
    metric_name := 'Number of metric partitions';
    SELECT COUNT(*)::TEXT INTO metric_value
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    WHERE parent.relname = 'vm_metrics';
    RETURN NEXT;
    
    -- Database size
    metric_name := 'Total database size';
    SELECT pg_size_pretty(pg_database_size('sangfor_scp')) INTO metric_value;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Daily Maintenance Procedure
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.daily_maintenance()
RETURNS TABLE(
    task TEXT,
    result TEXT,
    duration INTERVAL
) AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_result TEXT;
BEGIN
    -- 1. Create future partitions
    v_start := clock_timestamp();
    PERFORM metrics.create_future_partitions(3);
    task := 'Create future partitions';
    result := 'completed';
    duration := clock_timestamp() - v_start;
    RETURN NEXT;
    
    -- 2. Mark stale VMs
    v_start := clock_timestamp();
    SELECT sangfor.mark_stale_vms_deleted(48)::TEXT INTO v_result;
    task := 'Mark stale VMs deleted';
    result := v_result || ' VMs marked';
    duration := clock_timestamp() - v_start;
    RETURN NEXT;
    
    -- 3. Refresh materialized views
    v_start := clock_timestamp();
    PERFORM analytics.refresh_materialized_views();
    task := 'Refresh materialized views';
    result := 'completed';
    duration := clock_timestamp() - v_start;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Monthly Maintenance Procedure
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.monthly_maintenance(
    p_retention_months INTEGER DEFAULT 12
) RETURNS TABLE(
    task TEXT,
    result TEXT,
    duration INTERVAL
) AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_dropped INTEGER;
    v_record RECORD;
BEGIN
    -- 1. Drop old partitions
    v_start := clock_timestamp();
    v_dropped := 0;
    FOR v_record IN SELECT * FROM metrics.drop_old_partitions(p_retention_months) LOOP
        v_dropped := v_dropped + 1;
    END LOOP;
    task := 'Drop old partitions';
    result := v_dropped || ' partitions dropped';
    duration := clock_timestamp() - v_start;
    RETURN NEXT;
    
    -- 2. Vacuum analyze
    v_start := clock_timestamp();
    PERFORM metrics.maintenance_vacuum_analyze();
    task := 'Vacuum analyze';
    result := 'completed';
    duration := clock_timestamp() - v_start;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Index Maintenance
-- ============================================================
CREATE OR REPLACE FUNCTION metrics.reindex_tables()
RETURNS TABLE(table_name TEXT, status TEXT) AS $$
DECLARE
    v_table RECORD;
BEGIN
    FOR v_table IN 
        SELECT schemaname || '.' || tablename AS full_name
        FROM pg_tables 
        WHERE schemaname IN ('metrics', 'sangfor')
    LOOP
        BEGIN
            EXECUTE format('REINDEX TABLE %s', v_table.full_name);
            table_name := v_table.full_name;
            status := 'success';
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            table_name := v_table.full_name;
            status := 'error: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
