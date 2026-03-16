-- ============================================================
-- Host Metrics Schema Fix
-- แก้ไขชื่อคอลัมน์ใน metrics.host_metrics ให้ตรงกับโค้ด
-- host_sync.py ใช้ชื่อ: cpu_ratio, memory_ratio, vm_count, vm_running_count
-- schema เดิมใช้: cpu_usage_ratio, memory_usage_ratio, vm_total, vm_running
-- ============================================================

-- เพิ่มคอลัมน์ใหม่ที่ host_sync.py ต้องการ (ถ้ายังไม่มี)
ALTER TABLE metrics.host_metrics
    ADD COLUMN IF NOT EXISTS cpu_ratio          NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS memory_ratio       NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS vm_count           INTEGER,
    ADD COLUMN IF NOT EXISTS vm_running_count   INTEGER;

-- ไม่ลบคอลัมน์เดิม cpu_usage_ratio / memory_usage_ratio / vm_total / vm_running
-- เพราะ analytics views อาจใช้อยู่ เพิ่มเป็น alias แทน

-- อัปเดต view สำหรับ host metrics analytics
CREATE OR REPLACE VIEW analytics.v_host_metrics_latest AS
SELECT DISTINCT ON (host_id)
    id,
    host_id,
    host_name,
    az_id,
    cluster_id,
    -- CPU - รองรับทั้งคอลัมน์เก่าและใหม่
    cpu_total_mhz,
    cpu_used_mhz,
    COALESCE(cpu_usage_ratio, cpu_ratio)       AS cpu_usage_ratio,
    COALESCE(cpu_ratio, cpu_usage_ratio)       AS cpu_ratio,
    cpu_cores,
    cpu_sockets,
    -- Memory
    memory_total_mb,
    memory_used_mb,
    memory_free_mb,
    COALESCE(memory_usage_ratio, memory_ratio) AS memory_usage_ratio,
    COALESCE(memory_ratio, memory_usage_ratio) AS memory_ratio,
    -- VM Count - รองรับทั้งคอลัมน์เก่าและใหม่
    COALESCE(vm_total, vm_count)               AS vm_total,
    COALESCE(vm_count, vm_total)               AS vm_count,
    COALESCE(vm_running, vm_running_count)     AS vm_running,
    COALESCE(vm_running_count, vm_running)     AS vm_running_count,
    vm_stopped,
    status,
    alarm_count,
    collected_at,
    created_at
FROM metrics.host_metrics
ORDER BY host_id, collected_at DESC;

COMMENT ON VIEW analytics.v_host_metrics_latest IS 'Latest host metrics supporting both old and new column names';

-- Grant permissions
GRANT SELECT ON analytics.v_host_metrics_latest TO apirak;

-- สร้าง index เพิ่มเติมถ้าจำเป็น
CREATE INDEX IF NOT EXISTS idx_host_metrics_host_collected
    ON metrics.host_metrics(host_id, collected_at DESC);
