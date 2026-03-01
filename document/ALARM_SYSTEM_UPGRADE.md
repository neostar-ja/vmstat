# 🚨 Alarm System Upgrade Documentation

## 📅 Date: February 18, 2026

## ✅ Upgrade Summary

The Alarm System has been significantly upgraded to provide comprehensive visibility into VM, Host, and System alarms. The upgrade includes:

### 1. 🗄️ Database Schema Enhancements
- **New Table**: `sangfor.other_alarms` - Stores alarms for Hosts and System-level events.
- **New View**: `sangfor.v_unified_alarms` - A unified view combining `sangfor.vm_alarms` and `sangfor.other_alarms`, providing a single source of truth for all alarms.

### 2. 🔄 Enhanced Synchronization Logic
- **`connect_alarm_alert.py`**: Updated to support pagination and fetch all alarm types.
- **`sangfor_client.py`**: Enhanced to extract detailed alarm descriptions.
- **`service.py`**: Orchestrates the full sync process, including:
    - Distributing system alarms to relevant VMs.
    - Synchronizing Host alarms and mapping them correctly.
    - Upserting unmapped system alarms to `other_alarms`.

### 3. 🚀 Backend API Improvements
- **`routers/alarms.py`**:
    - Querying `sangfor.v_unified_alarms` for unified data access.
    - Added "Source" filter (VM, Host, System).
    - Enhanced search to include Description and Resource Name.
- **`routers/vms.py`**:
    - Updated `get_vm_alarms` to return both VM-specific alarms and alarms from the Host where the VM resides.

### 4. 💻 Frontend Redesign
- **`AlarmsPage.tsx`**:
    - **Source Filter**: New filter tab to view alarms by Source (All, VM, Host, System).
    - **Enhanced Table**: Displays Resource Name and Description.
    - **Visuals**: improved UI with clearer severity indicators and summary stats.
- **`VMDetailPage.tsx`**:
    - **Alarm Tab**: Updated to display improved alarm cards.
    - **Host Alarms**: Now displays Host-level alarms that affect the VM, with a distinct "Host" indicator.

### 5. 🛠️ Technical Details for Developers

#### Database Views
```sql
CREATE OR REPLACE VIEW sangfor.v_unified_alarms AS
SELECT ... FROM sangfor.vm_alarms
UNION ALL
SELECT ... FROM sangfor.other_alarms
```

#### API Endpoints
- `GET /alarms`: Returns unified list of alarms. Supports filtering by `source`.
- `GET /alarms/summary`: Returns counts by severity and now includes counts by source.
- `GET /vms/{id}/alarms`: Returns VM alarms AND Host alarms for that VM.

## 🧪 Verification
1. **Full Sync**: Run the manual sync job to populate `other_alarms` and `vm_alarms`.
2. **Database Check**: Verify `sangfor.other_alarms` contains Host/System alarms.
3. **Frontend Check**:
    - Go to **Alarms** page: Verify "Host" and "System" tabs show data.
    - Go to **VM Detail** page: Verify alarms section shows relevant alarms, including Host alarms if any.

## 🚀 Deployment
Run `start.sh` to apply all backend and frontend changes.
