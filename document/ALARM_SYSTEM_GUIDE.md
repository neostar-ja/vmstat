# Alarm & Alert System — Complete Guide

> **Last Updated:** 2026-06  
> **Version:** 2.0 (Full Overhaul)  
> **Author:** VMStat Engineering

---

## 1. Overview

The alarm system fetches, stores, and displays two distinct types of events from the Sangfor SCP platform:

| Type | Description | Severity | Source |
|------|-------------|----------|--------|
| **Policy Alarm** | Triggered by a named policy rule (e.g. "High VM Memory Usage") | `p1 / p2 / p3` | `vm`, `host` |
| **Platform Alert** | Fired by the SCP system event bus (infrastructure events, NTP, K8s) | `null` (no severity) | `system` |

### Why the distinction matters

The SCP `/alarms` API returns **both** types in a single list. System/platform events have `severity = null`, `title = null`, and `begin_time = null` — they must be handled differently from policy alarms.

---

## 2. Data Model

### `sangfor.vm_alarms`

Stores alarms directly linked to a specific VM UUID.

| Column | Type | Notes |
|--------|------|-------|
| `alarm_id` | SERIAL PK | Auto-increment |
| `vm_uuid` | UUID FK | Links to `vm_master` |
| `source` | TEXT | `vm` or `system` |
| `severity` | TEXT | `p1`, `p2`, `p3` or NULL |
| `title` | TEXT | Policy name or auto-generated |
| `description` | TEXT | Full alarm message |
| `status` | TEXT | `open` or `closed` |
| `object_type` | TEXT | `vm`, `host`, `cluster` |
| `begin_time` | TIMESTAMPTZ | When alarm started |
| `end_time` | TIMESTAMPTZ | When alarm cleared |
| `alert_count` | INT | Number of grouped duplicates (NEW) |
| `recommendation` | TEXT | Suggested remediation (NEW) |

**Unique constraint:** `(vm_uuid, title, begin_time)`

### `sangfor.other_alarms`

Stores host alarms, cluster alarms, K8s workload events — anything NOT mappable to a specific VM UUID.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `source` | TEXT | `system`, `host` |
| `resource_id` | TEXT | ID of the alarmed resource |
| `resource_name` | TEXT | Friendly name |
| `severity` | TEXT | Can be NULL for platform events |
| `title` | TEXT | Auto-generated if null |
| `description` | TEXT | |
| `status` | TEXT | `open` or `closed` |
| `object_type` | TEXT | `cluster`, `host`, `ske_workload` |
| `begin_time` | TIMESTAMPTZ | |
| `end_time` | TIMESTAMPTZ | (NEW) |
| `alert_count` | INT | Grouped count (NEW) |
| `recommendation` | TEXT | (NEW) |
| `az_name` | TEXT | Availability zone name (NEW) |

**Unique constraint:** `(source, resource_id, title, begin_time)`

### `sangfor.v_unified_alarms` (View)

Combines both tables for unified querying. Maps `vm_alarms.alarm_id` directly, and `-other_alarms.id` as negative alarm_id for easy distinction.

**New columns in v2:** `end_time`, `alert_count`, `recommendation`, `updated_at`

---

## 3. Sync System

### Flow

```
Scheduler (every 5 min)
  ↓
SangforClient.get_servers()     → Extract VM alarms from each server's 'alarms' field
  ↓
_extract_vm_alarms()            → Normalize fields, generate title for null-title events
  ↓
db_handler.upsert_alarms()      → GROUP by title, calc alert_count, upsert to vm_alarms
  ↓
SangforClient.get_active_alarms() → Fetch system-level alarms (/alarms endpoint)
  ↓
_distribute_system_alarms()     → Match to VMs by resource_id/name lookup
  ├─ Matched → upsert to vm_alarms (source='system')
  └─ Unmatched → collect for other_alarms
  ↓
db_handler.upsert_other_alarms() → GROUP by (source, resource_id, title), upsert
  ↓
db_handler.close_missing_alarms() → Mark stale open alarms as 'closed'
```

### Key Logic: Deduplication & Count

**`upsert_alarms()`** (in `db_handler.py`):
- Groups alarms by `title` before inserting
- Calculates `alert_count` = number of occurrences with same title
- Uses `GREATEST(existing, new)` to never decrease count
- Stores `recommendation` from API (`suggestion` field)

**`upsert_other_alarms()`**:
- Groups by `(source, resource_id, title)` key
- Handles null-title events by generating title from description

### Handling Null-Title System Events

System events with `title = null` get auto-generated titles:
```python
if not title:
    title = description[:80].split('.')[0].strip() or "Platform Alert"
```

This ensures all events are queryable and displayable meaningfully.

---

## 4. API Endpoints

### `GET /alarms`

Returns paginated list of all alarms.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (1-200) |
| `status` | str | `open` or `closed` |
| `severity` | str | `p1`, `p2`, `p3` |
| `source` | str | `vm`, `host`, `system` |
| `alarm_type` | str | **NEW** `alarm` (has severity) or `alert` (no severity) |
| `search` | str | Searches title, resource_name, description |

**Response fields (new in v2):**
- `alert_count` — number of grouped occurrences
- `recommendation` — suggested action
- `end_time` — when alarm was cleared
- `updated_at` — last sync time

### `GET /alarms/summary`

**New fields in v2:**
- `open_alarms` — open items WITH severity (policy alarms)
- `open_alerts` — open items WITHOUT severity (platform events)
- `closed_total` — total closed items

### `GET /alarms/vm/{vm_uuid}` (NEW)

Returns alarms for a specific VM, split into two sections:

```json
{
  "vm_uuid": "...",
  "alarms": [...],      // policy alarms with severity
  "alerts": [...],      // platform events without severity
  "total_alarms": 3,
  "total_alerts": 5
}
```

---

## 5. Frontend

### Alarms Page (`/vmstat/alarms`)

**New features in v2:**
- **Alarm/Alert toggle** — Filter between policy alarms and platform events
- **Alert count badge** — Shows `×N` when multiple occurrences grouped
- **Expandable recommendation** — Click alarm row to see remediation advice
- **End time** — Shows when alarm was cleared
- **Source breakdown bar** — VM / Host / System counts in header
- **Purple `💜` badge** — Platform events visually distinct from red alarms

### VM Detail Page — Alarm Tab (Tab 6)

**New features in v2:**
- **4th hero card** changed to "Platform Alerts" count (purple)
- **Policy Alarms section** — red cards with severity label + count badge
- **Platform Events section** — purple cards for null-severity events
- **Recommendation tooltip** — amber box when `recommendation` is set
- **alert_count chip** — shown when same alarm appeared multiple times

---

## 6. Alarm Severity Reference

| Code | Level | Color | Action |
|------|-------|-------|--------|
| `p1` | Critical | 🔴 Red | Immediate intervention |
| `p2` | Warning | 🟠 Orange | Review within 1 hour |
| `p3` | Info | 🔵 Blue | Monitor, no urgent action |
| `null` | Platform Event | 💜 Purple | Platform-level event, informational |

---

## 7. Common Alarm Types

### VM Alarms
- `High VM Memory Usage` — Memory utilization > threshold
- `High VM CPU Usage` — CPU utilization > threshold

### Platform Alerts (null severity)
- NTP synchronization failures — `object_type: cluster`
- Kubernetes workload events — `object_type: ske_workload`
- Host datacenter connectivity — `object_type: host`
- Storage path alerts — `object_type: system`

---

## 8. DB Migration Notes

Run on fresh deployments or upgrades from v1:

```sql
-- Add new columns to vm_alarms
ALTER TABLE sangfor.vm_alarms 
  ADD COLUMN IF NOT EXISTS alert_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recommendation TEXT;

-- Add new columns to other_alarms
ALTER TABLE sangfor.other_alarms
  ADD COLUMN IF NOT EXISTS alert_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS az_name TEXT,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Recreate unified view
DROP VIEW IF EXISTS sangfor.v_unified_alarms;
CREATE VIEW sangfor.v_unified_alarms AS
  -- (see database/install.sql for full definition)
```

---

## 9. Troubleshooting

### Alarms not appearing after sync
1. Check sync job status at `/vmstat/admin` → Sync tab
2. Verify SCP connectivity: `SCP_IP`, `SCP_USERNAME`, `SCP_PASSWORD` in `.env`
3. Check backend logs: `docker logs sangfor-backend --tail=100`

### All system alarms shown as "Platform Alert"
- Expected behavior — SCP system events don't have named policy rules
- Title is auto-generated from the description field
- Filter by `alarm_type=alert` to see only these

### alert_count not incrementing
- Count only increments when same `(vm_uuid, title)` appears in the same sync batch
- Single occurrence per sync cycle = `alert_count = 1`
