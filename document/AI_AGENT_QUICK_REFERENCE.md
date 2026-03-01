# 🤖 AI Agent Quick Reference - Sangfor SCP VM Management

> เอกสารนี้สำหรับ AI Agent เพื่อให้เข้าใจโครงสร้างโปรเจคอย่างรวดเร็ว

## 🎯 Project Overview

**VMStat** - ระบบ Web Application สำหรับมอนิเตอร์ Virtual Machines บน Sangfor HCI

### Tech Stack
- **Backend**: FastAPI (Python 3.11) - `/webapp/backend/`
- **Frontend**: React 18 + TypeScript + MUI - `/webapp/frontend/`
- **Database**: PostgreSQL 12+
- **Container**: Docker + Docker Compose

---

## 📁 Key File Locations

### Configuration
```
/.env                                    # Main environment variables
/webapp/docker-compose.yml               # Docker orchestration
/webapp/backend/app/config.py            # Backend settings
/webapp/frontend/nginx.conf              # Nginx reverse proxy
```

### Backend Entry Points
```
/webapp/backend/app/main.py              # FastAPI app entry
/webapp/backend/app/database.py          # DB connection
/webapp/backend/app/routers/             # API endpoints
/webapp/backend/app/services/sync_v2/    # Sync service
/webapp/backend/app/utils/auth.py        # JWT/RBAC utilities
```

### Frontend Entry Points
```
/webapp/frontend/src/App.tsx             # React routing
/webapp/frontend/src/services/api.ts     # API client
/webapp/frontend/src/stores/authStore.ts # Auth state (Zustand)
/webapp/frontend/src/pages/              # Page components
```

### Database Schemas
```
/database/schema/01_create_database.sql  # Database creation
/database/schema/02_static_tables.sql    # Master tables
/database/schema/03_metrics_tables.sql   # Time-series tables
/database/schema/05_views.sql            # Analytics views
```

---

## 🔌 API Endpoints Summary

| Router | Prefix | Auth Required | Admin Only |
|--------|--------|---------------|------------|
| auth | `/auth` | No (login only) | No |
| vms | `/vms` | Yes | No |
| dashboard | `/dashboard` | Yes | No |
| metrics | `/metrics` | Yes | No |
| alarms | `/alarms` | Yes | No |
| admin | `/admin` | Yes | Yes |
| sync | `/sync` | Yes | Yes (most) |

### Full API Path
Frontend → Nginx → Backend
```
https://host:3345/vmstat/api/{endpoint}
                  ↓
nginx proxy_pass → http://vmstat-backend:8000/{endpoint}
```

---

## 🗄️ Database Schemas

| Schema | Purpose | Key Tables |
|--------|---------|------------|
| `sangfor` | Master data | vm_master, host_master, storage_master, vm_alarms |
| `metrics` | Time-series | vm_metrics (partitioned) |
| `analytics` | Views | v_vm_overview, v_group_summary |
| `webapp` | Users | users, roles, permissions, audit_logs |
| `sync` | Sync jobs | config, jobs, job_details |

### Key Views
- `analytics.v_vm_overview` - VM + latest metrics (main view)
- `analytics.v_group_summary` - Group statistics
- `analytics.v_host_summary` - Host statistics

---

## 🔐 Authentication

### JWT Token
```python
# Payload structure
{
    "sub": "username",
    "user_id": 1,
    "role": "admin",  # admin|manager|viewer
    "role_level": 100,
    "exp": 1234567890
}
```

### Role Hierarchy
```
admin (100) > manager (50) > viewer (10)
```

### Auth Decorators
```python
from app.utils.auth import get_current_user, require_role, require_admin

# Usage
@router.get("/endpoint")
async def endpoint(current_user: dict = Depends(get_current_user)):
    pass

@router.get("/admin-only")
async def admin_endpoint(current_user: dict = Depends(require_role("admin"))):
    pass
```

---

## 🔄 Sync Service

### Components
```
SyncServiceV2 (singleton)
├── SangforClient      # API calls to Sangfor SCP
├── SyncDbHandler      # Database operations
└── SyncScheduler      # Periodic sync
```

### Sangfor API Endpoints
```
GET  /janus/public-key           # RSA public key
POST /janus/authenticate         # Get token
GET  /janus/20190725/servers     # List VMs
GET  /janus/20190725/servers/{id}# VM detail
GET  /janus/alarms               # System alarms
```

### Sync Control via API
```http
POST /sync/run              # Manual sync (background)
POST /sync/scheduler        # Start/stop scheduler
     {"action": "start", "interval_minutes": 5}
GET  /sync/status           # Current status
```

---

## 🖥️ Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | DashboardPage | Main dashboard |
| `/vms` | VMListPage | VM list with filters |
| `/vms/:vmUuid` | VMDetailPage | VM detail + metrics |
| `/groups` | GroupsPage | VM groups |
| `/hosts` | HostsPage | Physical hosts |
| `/alarms` | AlarmsPage | All alarms |
| `/datastores` | DataStorePage | Storage |
| `/admin/users` | UserManagementPage | User CRUD |
| `/admin/settings` | AdminSettingsPage | System settings |
| `/admin/sync` | SyncPage | Sync configuration |

### State Management (Zustand)
```typescript
// Auth store
useAuthStore.getState().token
useAuthStore.getState().user
useAuthStore.getState().login(token, user)
useAuthStore.getState().logout()

// Theme store
useThemeStore.getState().mode  // 'light' | 'dark'
useThemeStore.getState().toggleTheme()
```

### API Calls (React Query)
```typescript
import { vmsApi, dashboardApi, adminApi, syncApi } from './services/api';

// Usage in components
const { data, isLoading } = useQuery({
    queryKey: ['vms', page],
    queryFn: () => vmsApi.getList({ page })
});
```

---

## 🐳 Docker Commands

```bash
# Build and start
cd /opt/code/sangfor_scp/webapp
docker-compose up -d --build

# View logs
docker-compose logs -f vmstat-backend
docker-compose logs -f vmstat-frontend

# Restart service
docker-compose restart vmstat-backend

# Rebuild specific service
docker-compose up -d --build vmstat-backend

# Stop all
docker-compose down
```

---

## 📝 Common Modifications

### Add New API Endpoint

1. Create router in `/webapp/backend/app/routers/new_router.py`
```python
from fastapi import APIRouter, Depends
from ..utils.auth import get_current_user

router = APIRouter(prefix="/new", tags=["New"])

@router.get("/endpoint")
async def endpoint(current_user: dict = Depends(get_current_user)):
    return {"data": "value"}
```

2. Register in `/webapp/backend/app/main.py`
```python
from .routers.new_router import router as new_router
app.include_router(new_router)
```

3. Add frontend API in `/webapp/frontend/src/services/api.ts`
```typescript
export const newApi = {
    getEndpoint: () => api.get('/new/endpoint')
};
```

### Add New Database Table

1. Create SQL in `/database/schema/XX_new_table.sql`
```sql
CREATE TABLE sangfor.new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

2. Run SQL on database
```bash
psql -h host -U user -d sangfor_scp -f database/schema/XX_new_table.sql
```

### Add New Frontend Page

1. Create page in `/webapp/frontend/src/pages/NewPage.tsx`
```tsx
export default function NewPage() {
    return <Box>New Page Content</Box>;
}
```

2. Add route in `/webapp/frontend/src/App.tsx`
```tsx
import NewPage from './pages/NewPage';
// In Routes:
<Route path="/new" element={<NewPage />} />
```

---

## ⚠️ Important Notes

1. **API Base Path**: All API calls go through `/vmstat/api/`
2. **JWT Expiry**: Default 24 hours (configurable)
3. **Sync Interval**: Default 5 minutes
4. **Metrics Retention**: Configurable (default: 7 days raw, 30 days hourly)
5. **SSL**: Required for production (self-signed ok for dev)

---

## 🔍 Quick Debugging

### Check Backend Health
```bash
curl -k https://localhost:3345/vmstat/api/health
# Should return: {"status": "healthy", "version": "1.0.0"}
```

### Check Database Connection
```bash
docker exec vmstat-backend python -c "
from app.database import engine
print(engine.url)
with engine.connect() as conn:
    result = conn.execute('SELECT 1')
    print('Connected!')
"
```

### Check Sync Status
```bash
curl -k -H "Authorization: Bearer TOKEN" \
    https://localhost:3345/vmstat/api/sync/status
```

---

*Last updated: 2026-02-02*
