# Sangfor SCP Database Design

## Overview

ฐานข้อมูลนี้ออกแบบมาสำหรับเก็บข้อมูล Virtual Machine (VM) จาก Sangfor SCP API โดยแยก:
- **Static Data** (ข้อมูลที่ไม่ค่อยเปลี่ยนแปลง)
- **Time-series Metrics** (ข้อมูลที่เปลี่ยนแปลงตามเวลา)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sangfor SCP API                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│  Live Query      │                    │  Scheduler       │
│  (No Storage)    │                    │  (Every 5-10min) │
└──────────────────┘                    └────────┬─────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────┐
                              │      PostgreSQL Database        │
                              │                                 │
                              │  ┌───────────┐  ┌────────────┐ │
                              │  │ sangfor   │  │  metrics   │ │
                              │  │ (static)  │  │(time-series│ │
                              │  └───────────┘  └────────────┘ │
                              │                                 │
                              │  ┌────────────────────────────┐│
                              │  │       analytics            ││
                              │  │  (views & aggregations)    ││
                              │  └────────────────────────────┘│
                              └─────────────────────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
           ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
           │   Grafana    │            │  BI Tools    │            │   Web App    │
           │  Dashboard   │            │              │            │              │
           └──────────────┘            └──────────────┘            └──────────────┘
```

## Schema Design

### Schema: `sangfor` (Static/Master Data)

| Table | Description |
|-------|-------------|
| `az_master` | Availability Zone master data |
| `host_master` | Physical host/node information |
| `storage_master` | Storage/Datastore configuration |
| `network_master` | Network/VLAN configuration |
| `vm_group_master` | VM folder/group hierarchy |
| `protection_master` | Backup/DR protection policies |
| `vm_master` | Main VM static configuration |
| `vm_disk_config` | VM disk configuration |
| `vm_network_config` | VM network interface configuration |
| `collection_log` | Data collection batch log |

### Schema: `metrics` (Time-series Data)

| Table | Description | Partitioned |
|-------|-------------|-------------|
| `vm_metrics` | Main VM metrics (CPU, RAM, Storage, I/O) | ✅ Monthly |
| `vm_storage_metrics` | Per-disk storage metrics | ✅ Monthly |
| `vm_network_metrics` | Per-interface network metrics | ✅ Monthly |
| `vm_alarm_snapshot` | Alarm/warning snapshots | ✅ Monthly |
| `host_metrics` | Aggregated host-level metrics | ✅ Monthly |

### Schema: `analytics` (Views & Aggregations)

| View/Table | Type | Description |
|------------|------|-------------|
| `v_vm_overview` | View | Comprehensive VM overview with latest metrics |
| `v_group_summary` | View | VM group summary with resource totals |
| `v_host_summary` | View | Host summary with current resource usage |
| `v_storage_summary` | View | Storage summary with allocation |
| `v_vms_with_alarms` | View | VMs with active alarms |
| `v_unprotected_vms` | View | VMs without backup/protection |
| `v_oversized_vms` | View | VMs with low resource utilization |
| `mv_daily_stats` | Materialized View | Daily aggregated statistics |
| `mv_vm_daily_stats` | Materialized View | Per-VM daily statistics |

## Partitioning Strategy

ตาราง metrics ทั้งหมดใช้ **Native PostgreSQL Range Partitioning** ตาม `collected_at`:

```
vm_metrics (parent)
├── vm_metrics_2025_01
├── vm_metrics_2025_02
├── vm_metrics_2025_03
└── ... (auto-created)
```

### Benefits:
- Query Performance: เฉพาะ partition ที่ต้องการ
- Data Retention: ลบ partition เก่าได้ง่าย
- Maintenance: VACUUM/ANALYZE ทำแยก partition
- TimescaleDB Ready: แปลงเป็น hypertable ได้ในอนาคต

## Functions

### Data Ingestion

| Function | Description |
|----------|-------------|
| `sangfor.upsert_vm_master(...)` | Insert/Update VM static data |
| `sangfor.upsert_host(...)` | Insert/Update host data |
| `sangfor.upsert_storage(...)` | Insert/Update storage data |
| `sangfor.upsert_vm_group(...)` | Insert/Update VM group |
| `sangfor.upsert_vm_disk(...)` | Insert/Update disk config |
| `sangfor.upsert_vm_nic(...)` | Insert/Update network config |
| `metrics.insert_vm_metrics(...)` | Insert VM metrics (append-only) |
| `metrics.insert_vm_alarm_if_exists(...)` | Insert alarm if exists |

### Analytics

| Function | Description |
|----------|-------------|
| `analytics.get_vm_metrics_range(vm_id, start, end)` | Get VM metrics for time range |
| `analytics.get_top_vm_by_resource(type, range, limit)` | Get top VMs by resource |
| `analytics.get_vm_current_status(vm_id)` | Get current VM status |
| `analytics.get_active_alarms(hours)` | Get active alarms |
| `analytics.get_host_summary()` | Get host summary |
| `analytics.get_capacity_trend(type, days, group)` | Get capacity trend |
| `analytics.search_vms(term, group, host, state)` | Search VMs |

### Maintenance

| Function | Description |
|----------|-------------|
| `metrics.create_monthly_partition(table, year, month)` | Create single partition |
| `metrics.create_partitions_for_range(start, end)` | Create partitions for date range |
| `metrics.ensure_partition_exists(timestamp)` | Auto-create partition if needed |
| `metrics.drop_old_partitions(retention_months)` | Drop old partitions |
| `metrics.daily_maintenance()` | Run daily maintenance tasks |
| `metrics.monthly_maintenance(retention)` | Run monthly maintenance |
| `analytics.refresh_materialized_views()` | Refresh all materialized views |

## Installation

### 1. Create Database

```bash
psql -h 10.251.150.222 -p 5210 -U postgres -f database/schema/01_create_database.sql
```

### 2. Install Schema (connect to sangfor_scp database)

```bash
cd /opt/code/sangfor_scp/database
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f install.sql
```

### 3. Or install individual files

```bash
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f schema/02_static_tables.sql
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f schema/03_metrics_tables.sql
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f schema/04_functions.sql
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f schema/05_views.sql
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f schema/06_maintenance.sql
psql -h 10.251.150.222 -p 5210 -U apirak -d sangfor_scp -f schema/07_grafana_views.sql
```

## Usage

### Ingest Data from JSON File

```python
from database.ingest import SangforDataIngester

ingester = SangforDataIngester()
stats = ingester.ingest_from_file('sangfor_servers_20251120_144303.json')
print(stats)
```

### Schedule Periodic Collection

```bash
# Run every 5 minutes (continuous)
python scheduler.py --interval 300

# Run once
python scheduler.py --once

# Run once with JSON output
python scheduler.py --once --json
```

### Live Query (No Database)

```python
from database.live_query import SangforLiveQuery

live = SangforLiveQuery()

# Get summary
summary = live.get_vms_summary()

# Get top VMs by CPU
top_cpu = live.get_top_vms_by_resource('cpu', limit=10)

# Search VMs
results = live.search_vms('WUH-HIS')

# Get VMs with alarms
alarms = live.get_vms_with_alarms()
```

### Query Database

```sql
-- Get VM overview
SELECT * FROM analytics.v_vm_overview WHERE power_state = 'on';

-- Get top 10 VMs by CPU usage
SELECT * FROM analytics.get_top_vm_by_resource('cpu', '1 hour', 10);

-- Get VM metrics for last 24 hours
SELECT * FROM analytics.get_vm_metrics_range(
    '34210ced-2257-4e08-9be0-5c9154928d04',
    NOW() - INTERVAL '24 hours',
    NOW()
);

-- Get host summary
SELECT * FROM analytics.get_host_summary();

-- Get capacity trend for last 30 days
SELECT * FROM analytics.get_capacity_trend('memory', 30);
```

## Grafana Integration

ใช้ PostgreSQL datasource ใน Grafana แล้ว query จาก views:

```sql
-- CPU time series
SELECT time, cpu_usage_pct FROM analytics.grafana_vm_cpu
WHERE vm_uuid = '$vm_uuid' AND time >= $__timeFrom() AND time < $__timeTo()

-- Memory time series  
SELECT time, memory_usage_pct FROM analytics.grafana_vm_memory
WHERE vm_uuid = '$vm_uuid' AND $__timeFilter(time)

-- Current status table
SELECT * FROM analytics.grafana_vm_current

-- Cluster overview stats
SELECT * FROM analytics.grafana_cluster_overview

-- Top VMs by CPU
SELECT * FROM analytics.grafana_top_vms('cpu', 10)
```

## Maintenance

### Daily (cron at 2:00 AM)

```sql
SELECT * FROM metrics.daily_maintenance();
```

### Monthly (cron on 1st of month)

```sql
SELECT * FROM metrics.monthly_maintenance(12);  -- Keep 12 months
```

### Manual Cleanup

```sql
-- Drop partitions older than 12 months
SELECT * FROM metrics.drop_old_partitions(12);

-- Vacuum analyze all tables
SELECT * FROM metrics.maintenance_vacuum_analyze();

-- Reindex tables
SELECT * FROM metrics.reindex_tables();

-- Get database stats
SELECT * FROM analytics.get_database_stats();
```

## Capacity Planning

### Estimated Storage (per day @ 5-min intervals)

- 379 VMs × 288 samples/day = ~109,000 records/day
- ~3.3 million records/month
- With indexes: ~500 MB - 1 GB per month

### Recommended Retention

| Data Type | Retention |
|-----------|-----------|
| Raw metrics (5-min) | 3-6 months |
| Daily aggregations | 1-2 years |
| Monthly summaries | 3-5 years |

## TimescaleDB Migration (Future)

เมื่อต้องการ scale ขึ้น:

```sql
-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert to hypertable
SELECT create_hypertable('metrics.vm_metrics', 'collected_at', 
    migrate_data => true,
    chunk_time_interval => INTERVAL '1 day'
);

-- Enable compression
ALTER TABLE metrics.vm_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'vm_uuid'
);

-- Add compression policy
SELECT add_compression_policy('metrics.vm_metrics', INTERVAL '7 days');

-- Add retention policy
SELECT add_retention_policy('metrics.vm_metrics', INTERVAL '6 months');
```

## Files Structure

```
/opt/code/sangfor_scp/
├── .env                              # Database credentials
├── database/
│   ├── __init__.py                   # Package init
│   ├── ingest.py                     # Data ingestion module
│   ├── live_query.py                 # Live API query module
│   ├── install.sql                   # Full installation script
│   └── schema/
│       ├── 01_create_database.sql    # Database creation
│       ├── 02_static_tables.sql      # Static/master tables
│       ├── 03_metrics_tables.sql     # Time-series tables
│       ├── 04_functions.sql          # Stored procedures
│       ├── 05_views.sql              # Views & materialized views
│       ├── 06_maintenance.sql        # Maintenance procedures
│       └── 07_grafana_views.sql      # Grafana-optimized views
├── scheduler.py                      # Data collection scheduler
└── sangfor_servers_*.json            # Sample data files
```
