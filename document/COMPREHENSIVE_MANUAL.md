# 📚 Sangfor SCP VM Management System - คู่มือฉบับสมบูรณ์

## 🎯 สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สถาปัตยกรรมระบบ](#2-สถาปัตยกรรมระบบ)
3. [Database Schema](#3-database-schema)
4. [Backend API](#4-backend-api)
5. [Frontend Application](#5-frontend-application)
6. [Docker & Deployment](#6-docker--deployment)
7. [ระบบ Sync Data](#7-ระบบ-sync-data)
8. [ระบบ Authentication & Authorization](#8-ระบบ-authentication--authorization)
9. [ระบบ Admin](#9-ระบบ-admin)
10. [การเชื่อมต่อและ Data Flow](#10-การเชื่อมต่อและ-data-flow)
11. [การติดตั้งและใช้งาน](#11-การติดตั้งและใช้งาน)
12. [API Reference](#12-api-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. ภาพรวมระบบ

### 1.1 วัตถุประสงค์
**Sangfor SCP VM Management System (VMStat)** เป็นระบบสำหรับบริหารจัดการและมอนิเตอร์ Virtual Machines (VMs) บน Sangfor HCI (Hyper-Converged Infrastructure) Platform โดยมีความสามารถหลัก:

- 📊 **Dashboard Overview** - แสดงภาพรวมของ VMs ทั้งหมด, CPU, Memory, Storage usage
- 🖥️ **VM Management** - ดูรายละเอียด VMs, Metrics, Disks, Networks, Alarms
- 📈 **Historical Metrics** - กราฟแสดงข้อมูลย้อนหลัง 1 ชั่วโมง - 90 วัน
- 🔔 **Alarms & Alerts** - ติดตาม Alarms ของ VMs และระบบ
- 👥 **User Management** - จัดการผู้ใช้งานและสิทธิ์ (RBAC)
- 🔄 **Auto Sync** - ดึงข้อมูลอัตโนมัติจาก Sangfor SCP API

### 1.2 Technology Stack
| Component | Technology |
|-----------|------------|
| **Database** | PostgreSQL 12+ (พร้อมรองรับ TimescaleDB) |
| **Backend** | FastAPI (Python 3.11) |
| **Frontend** | React 18 + TypeScript + Material-UI + Recharts |
| **Web Server** | Nginx (Reverse Proxy + SSL) |
| **Container** | Docker + Docker Compose |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query (React Query) |

### 1.3 โครงสร้างโปรเจค
```
sangfor_scp/
├── .env                    # Environment variables
├── database/               # Database schemas และ scripts
│   ├── schema/            # SQL migration files
│   │   ├── 01_create_database.sql
│   │   ├── 02_static_tables.sql
│   │   ├── 03_metrics_tables.sql
│   │   ├── 04_functions.sql
│   │   ├── 05_views.sql
│   │   └── ...
│   ├── ingest.py          # Data ingestion script
│   └── live_query.py      # Live query utilities
├── webapp/
│   ├── docker-compose.yml # Docker orchestration
│   ├── backend/           # FastAPI backend
│   │   ├── Dockerfile
│   │   ├── app/
│   │   │   ├── main.py    # Application entry point
│   │   │   ├── config.py  # Configuration
│   │   │   ├── database.py # DB connection
│   │   │   ├── routers/   # API endpoints
│   │   │   ├── models/    # ORM models
│   │   │   ├── schemas/   # Pydantic schemas
│   │   │   ├── services/  # Business logic
│   │   │   └── utils/     # Utilities
│   │   └── requirements.txt
│   └── frontend/          # React frontend
│       ├── Dockerfile
│       ├── nginx.conf     # Nginx configuration
│       ├── src/
│       │   ├── App.tsx
│       │   ├── pages/     # Page components
│       │   ├── components/# Reusable components
│       │   ├── services/  # API services
│       │   ├── stores/    # Zustand stores
│       │   └── types/     # TypeScript types
│       └── package.json
└── document/              # Documentation
```

---

## 2. สถาปัตยกรรมระบบ

### 2.1 Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                            │
│                         https://server:3345/vmstat                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS (Port 3345)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          vmstat-frontend (Nginx)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Static Files: /vmstat/*  →  /usr/share/nginx/html/vmstat/       │   │
│  │ API Proxy:    /vmstat/api/* → http://vmstat-backend:8000        │   │
│  │ SSL:          TLS 1.2/1.3 (Self-signed cert)                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP (Internal)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          vmstat-backend (FastAPI)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Routers: auth, vms, dashboard, admin, sync, metrics, alarms     │   │
│  │ Services: sync_v2 (SangforClient, SyncDbHandler, Scheduler)     │   │
│  │ Auth: JWT (Bearer Token) + RBAC                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ PostgreSQL Protocol
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────────┐    │
│  │ sangfor schema  │ │ metrics schema  │ │ analytics schema       │    │
│  │ - vm_master     │ │ - vm_metrics    │ │ - v_vm_overview        │    │
│  │ - host_master   │ │ - vm_storage_   │ │ - v_group_summary      │    │
│  │ - storage_master│ │   metrics       │ │ - mv_vm_daily_stats    │    │
│  │ - network_master│ │ - vm_network_   │ │                        │    │
│  │ - vm_group_     │ │   metrics       │ │                        │    │
│  │   master        │ │                 │ │                        │    │
│  └─────────────────┘ └─────────────────┘ └────────────────────────┘    │
│  ┌─────────────────┐ ┌─────────────────┐                               │
│  │ webapp schema   │ │ sync schema     │                               │
│  │ - users         │ │ - config        │                               │
│  │ - roles         │ │ - jobs          │                               │
│  │ - permissions   │ │ - job_details   │                               │
│  │ - audit_logs    │ │                 │                               │
│  └─────────────────┘ └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Sangfor SCP API                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Endpoints:                                                       │   │
│  │ - GET /janus/public-key              (RSA public key)           │   │
│  │ - POST /janus/authenticate           (Get token)                │   │
│  │ - GET /janus/20190725/servers        (List VMs)                 │   │
│  │ - GET /janus/20190725/servers/{id}   (VM detail)                │   │
│  │ - GET /janus/alarms                  (System alarms)            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Network Configuration
| Service | Container Name | Internal Port | External Port |
|---------|---------------|---------------|---------------|
| Frontend + Nginx | vmstat-frontend | 443 | 3345 |
| Backend API | vmstat-backend | 8000 | - (internal only) |
| PostgreSQL | (external) | - | 5210 |

### 2.3 Docker Network
- Network Name: `vmstat-network`
- Driver: `bridge`
- Communication: Container-to-container via service names

---

## 3. Database Schema

### 3.1 Schema Organization
Database แบ่งเป็น 5 Schemas หลัก:

| Schema | วัตถุประสงค์ |
|--------|-------------|
| `sangfor` | Master/Static data (VMs, Hosts, Storage, Networks) |
| `metrics` | Time-series metrics data (Partitioned by month) |
| `analytics` | Views และ Materialized Views สำหรับ Dashboard |
| `webapp` | User management และ Application settings |
| `sync` | Sync jobs, history และ configuration |

### 3.2 Sangfor Schema Tables

#### 3.2.1 `sangfor.az_master` - Availability Zones
```sql
CREATE TABLE sangfor.az_master (
    az_id           UUID PRIMARY KEY,
    az_name         VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE
);
```

#### 3.2.2 `sangfor.host_master` - Physical Hosts
```sql
CREATE TABLE sangfor.host_master (
    host_id         VARCHAR(50) PRIMARY KEY,
    host_name       VARCHAR(50) NOT NULL,      -- IP หรือ hostname
    az_id           UUID REFERENCES sangfor.az_master(az_id),
    host_type       VARCHAR(20) DEFAULT 'hci',
    cpu_total_mhz   NUMERIC(12,2),
    memory_total_mb NUMERIC(12,2),
    status          VARCHAR(20) DEFAULT 'active',
    is_active       BOOLEAN DEFAULT TRUE
);
```

#### 3.2.3 `sangfor.storage_master` - Datastores
```sql
CREATE TABLE sangfor.storage_master (
    storage_id          VARCHAR(50) PRIMARY KEY,
    storage_name        VARCHAR(100) NOT NULL,
    storage_policy_id   VARCHAR(50),
    storage_type        VARCHAR(50),
    total_capacity_mb   NUMERIC(15,2),
    is_active           BOOLEAN DEFAULT TRUE
);
```

#### 3.2.4 `sangfor.vm_master` - Virtual Machines (Main Table)
```sql
CREATE TABLE sangfor.vm_master (
    vm_uuid             UUID PRIMARY KEY,        -- Main identifier
    vm_id               BIGINT UNIQUE,           -- Numeric VM ID
    name                VARCHAR(200) NOT NULL,
    
    -- Classification
    vmtype              VARCHAR(20),             -- vm, template
    platform_type       VARCHAR(20) DEFAULT 'hci',
    
    -- Location
    az_id               UUID REFERENCES sangfor.az_master(az_id),
    host_id             VARCHAR(50) REFERENCES sangfor.host_master(host_id),
    group_id            UUID REFERENCES sangfor.vm_group_master(group_id),
    storage_id          VARCHAR(50) REFERENCES sangfor.storage_master(storage_id),
    
    -- Project/User
    project_id          VARCHAR(50),
    project_name        VARCHAR(100),
    user_name           VARCHAR(100),
    
    -- OS Information
    os_type             VARCHAR(20),
    os_name             VARCHAR(100),
    os_kernel           VARCHAR(50),
    os_distribution     VARCHAR(100),
    
    -- Resource Configuration
    cpu_sockets         SMALLINT,
    cpu_cores           SMALLINT,
    cpu_cores_per_socket SMALLINT,
    cpu_total_mhz       NUMERIC(12,2),
    memory_total_mb     NUMERIC(12,2),
    storage_total_mb    NUMERIC(15,2),
    
    -- Protection/Backup
    protection_id       UUID REFERENCES sangfor.protection_master(protection_id),
    protection_enabled  BOOLEAN DEFAULT FALSE,
    in_protection       BOOLEAN DEFAULT FALSE,
    backup_file_count   INTEGER DEFAULT 0,
    
    -- Lifecycle
    first_seen_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_deleted          BOOLEAN DEFAULT FALSE
);
```

#### 3.2.5 `sangfor.vm_disk_config` - VM Disk Configuration
```sql
CREATE TABLE sangfor.vm_disk_config (
    id                  SERIAL PRIMARY KEY,
    vm_uuid             UUID REFERENCES sangfor.vm_master(vm_uuid),
    disk_id             VARCHAR(20) NOT NULL,    -- ide0, scsi0
    storage_id          VARCHAR(50),
    storage_name        VARCHAR(100),
    storage_file        VARCHAR(200),            -- vm-disk-1.qcow2
    size_mb             NUMERIC(15,2),
    preallocate         VARCHAR(20),
    is_active           BOOLEAN DEFAULT TRUE,
    UNIQUE(vm_uuid, disk_id)
);
```

#### 3.2.6 `sangfor.vm_network_interfaces` - VM Network Interfaces
```sql
CREATE TABLE sangfor.vm_network_interfaces (
    id                  SERIAL PRIMARY KEY,
    vm_uuid             UUID REFERENCES sangfor.vm_master(vm_uuid),
    vif_id              VARCHAR(20) NOT NULL,    -- net0, net1
    network_name        VARCHAR(100),
    ip_address          INET,
    ipv6_address        INET,
    mac_address         VARCHAR(20),
    model               VARCHAR(20),
    connected           BOOLEAN DEFAULT TRUE,
    vpc_id              VARCHAR(50),
    vpc_name            VARCHAR(100),
    subnet_id           VARCHAR(50),
    subnet_name         VARCHAR(100),
    cidr                VARCHAR(50),
    gateway             VARCHAR(50),
    is_active           BOOLEAN DEFAULT TRUE,
    UNIQUE(vm_uuid, vif_id)
);
```

#### 3.2.7 `sangfor.vm_alarms` - VM Alarms
```sql
CREATE TABLE sangfor.vm_alarms (
    id                  SERIAL PRIMARY KEY,
    alarm_id            VARCHAR(100) UNIQUE,
    vm_uuid             UUID REFERENCES sangfor.vm_master(vm_uuid),
    source              VARCHAR(50),             -- 'vm' or 'system'
    severity            VARCHAR(20),             -- 'p1', 'p2', 'p3'
    title               VARCHAR(500),
    description         TEXT,
    status              VARCHAR(20),             -- 'open', 'closed'
    object_type         VARCHAR(100),
    begin_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Metrics Schema Tables

#### 3.3.1 `metrics.vm_metrics` - Main Metrics (Partitioned)
```sql
CREATE TABLE metrics.vm_metrics (
    id                      BIGSERIAL,
    collected_at            TIMESTAMPTZ NOT NULL,
    batch_id                UUID,
    vm_uuid                 UUID NOT NULL,
    
    -- Power/Status
    power_state             VARCHAR(20),         -- on, off, suspended
    status                  VARCHAR(20),
    uptime_seconds          BIGINT,
    
    -- CPU Metrics
    cpu_total_mhz           NUMERIC(12,2),
    cpu_used_mhz            NUMERIC(12,2),
    cpu_ratio               NUMERIC(5,4),        -- 0.0000 to 1.0000
    
    -- Memory Metrics
    memory_total_mb         NUMERIC(12,2),
    memory_used_mb          NUMERIC(12,2),
    memory_ratio            NUMERIC(5,4),
    
    -- Storage Metrics
    storage_total_mb        NUMERIC(15,2),
    storage_used_mb         NUMERIC(15,2),
    storage_ratio           NUMERIC(5,4),
    
    -- Network I/O
    network_read_bitps      NUMERIC(15,2),
    network_write_bitps     NUMERIC(15,2),
    
    -- Disk I/O
    disk_read_iops          NUMERIC(12,2),
    disk_write_iops         NUMERIC(12,2),
    
    PRIMARY KEY (collected_at, id)
) PARTITION BY RANGE (collected_at);
```

### 3.4 Analytics Schema Views

#### 3.4.1 `analytics.v_vm_overview` - VM Overview View
View หลักที่รวมข้อมูล VM + Latest Metrics เข้าด้วยกัน:
```sql
CREATE OR REPLACE VIEW analytics.v_vm_overview AS
WITH latest_metrics AS (
    SELECT DISTINCT ON (vm_uuid) *
    FROM metrics.vm_metrics
    ORDER BY vm_uuid, collected_at DESC
)
SELECT 
    vm.vm_uuid, vm.vm_id, vm.name,
    g.group_name, g.group_name_path,
    h.host_name, az.az_name,
    vm.os_type, vm.os_kernel,
    lm.power_state, lm.status,
    vm.cpu_cores, vm.memory_total_mb,
    lm.cpu_ratio AS cpu_usage,
    lm.memory_ratio AS memory_usage,
    vm.protection_enabled, vm.in_protection,
    lm.collected_at AS last_metrics_at
FROM sangfor.vm_master vm
LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
LEFT JOIN sangfor.az_master az ON vm.az_id = az.az_id
LEFT JOIN latest_metrics lm ON vm.vm_uuid = lm.vm_uuid
WHERE vm.is_deleted = FALSE;
```

### 3.5 Webapp Schema Tables

#### 3.5.1 `webapp.users` - User Accounts
```sql
CREATE TABLE webapp.users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100),
    role            VARCHAR(20) DEFAULT 'viewer',  -- admin, manager, viewer
    role_id         INTEGER REFERENCES webapp.roles(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.5.2 `webapp.roles` - Role Definitions
```sql
CREATE TABLE webapp.roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100),
    description     TEXT,
    level           INTEGER DEFAULT 10,    -- Higher = more permissions
    is_active       BOOLEAN DEFAULT TRUE
);

-- Default roles
INSERT INTO webapp.roles (name, display_name, level) VALUES
    ('admin', 'Administrator', 100),
    ('manager', 'Manager', 50),
    ('viewer', 'Viewer', 10);
```

#### 3.5.3 `webapp.permissions` - Permission Definitions
```sql
CREATE TABLE webapp.permissions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    category        VARCHAR(50)
);
```

#### 3.5.4 `webapp.audit_logs` - Audit Trail
```sql
CREATE TABLE webapp.audit_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER,
    username        VARCHAR(50),
    action          VARCHAR(50) NOT NULL,
    details         TEXT,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3.6 Sync Schema Tables

#### 3.6.1 `sync.config` - Sync Configuration
```sql
CREATE TABLE sync.config (
    key             VARCHAR(100) PRIMARY KEY,
    value           TEXT,
    description     TEXT,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.6.2 `sync.jobs` - Sync Job History
```sql
CREATE TABLE sync.jobs (
    job_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, running, completed, failed
    source          VARCHAR(50),                     -- manual, scheduler
    triggered_by    VARCHAR(100),
    progress        INTEGER DEFAULT 0,
    current_step    VARCHAR(100),
    vms_total       INTEGER DEFAULT 0,
    vms_inserted    INTEGER DEFAULT 0,
    vms_updated     INTEGER DEFAULT 0,
    vms_deleted     INTEGER DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER
);
```

---

## 4. Backend API

### 4.1 Application Structure
```
webapp/backend/app/
├── main.py           # FastAPI application entry point
├── config.py         # Configuration (Settings class)
├── database.py       # Database connection
├── routers/          # API endpoints
│   ├── auth.py       # Authentication endpoints
│   ├── vms.py        # VM endpoints
│   ├── dashboard.py  # Dashboard endpoints
│   ├── admin.py      # Admin endpoints
│   ├── sync.py       # Sync endpoints
│   ├── metrics.py    # Metrics endpoints
│   └── alarms.py     # Alarms endpoints
├── models/           # SQLAlchemy models
│   ├── user.py
│   └── role.py
├── schemas/          # Pydantic schemas
│   ├── auth.py
│   ├── vm.py
│   ├── dashboard.py
│   └── admin.py
├── services/         # Business logic
│   └── sync_v2/
│       ├── service.py
│       ├── sangfor_client.py
│       ├── db_handler.py
│       └── scheduler.py
└── utils/
    └── auth.py       # JWT, password, RBAC utilities
```

### 4.2 Configuration (`config.py`)
```python
class Settings(BaseSettings):
    # Application
    APP_NAME: str = "VMStat API"
    APP_VERSION: str = "1.0.0"
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "sangfor_scp"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    
    # Alternative env vars (priority)
    pgSQL_HOST: str = ""
    pgSQL_HOST_PORT: int = 5432
    pgSQL_DBNAME: str = ""
    pgSQL_USERNAME: str = ""
    pgSQL_PASSWORD: str = ""
    
    # JWT
    SECRET_KEY: str = "change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Sangfor SCP
    SCP_IP: str = ""
    SCP_USERNAME: str = ""
    SCP_PASSWORD: str = ""
    
    # Sync
    SYNC_INTERVAL_MINUTES: int = 5
    SYNC_AUTO_START: bool = True
```

### 4.3 Router Summary

| Router | Prefix | Description |
|--------|--------|-------------|
| `auth` | `/auth` | Login, logout, change password, get profile |
| `vms` | `/vms` | List VMs, VM details, metrics, disks, networks |
| `dashboard` | `/dashboard` | Summary stats, top VMs, alarms, groups, hosts |
| `admin` | `/admin` | User CRUD, roles, permissions, system stats |
| `sync` | `/sync` | Sync control, scheduler, configuration |
| `metrics` | `/metrics` | Historical metrics, aggregations |
| `alarms` | `/alarms` | List alarms, summary |

### 4.4 Main Entry Point (`main.py`)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    root_path="/vmstat/api",  # For nginx proxy
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(vms_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(sync_router)
app.include_router(metrics_router)
app.include_router(alarms_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
```

---

## 5. Frontend Application

### 5.1 Application Structure
```
webapp/frontend/src/
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
├── index.css            # Global styles
├── theme.ts             # MUI theme configuration
├── pages/               # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── VMListPage.tsx
│   ├── VMDetailPage.tsx
│   ├── GroupsPage.tsx
│   ├── HostsPage.tsx
│   ├── AlarmsPage.tsx
│   ├── DataStorePage.tsx
│   ├── ProfilePage.tsx
│   ├── UserManagementPage.tsx
│   ├── AdminSettingsPage.tsx
│   └── SyncPage.tsx
├── components/          # Reusable components
│   ├── Layout.tsx
│   └── common/
├── services/            # API services
│   ├── api.ts           # Axios instance + all API calls
│   └── datastoresApi.ts
├── stores/              # Zustand stores
│   ├── authStore.ts     # Authentication state
│   └── themeStore.ts    # Theme state
└── types/               # TypeScript types
```

### 5.2 Routing Structure (`App.tsx`)
```tsx
<Routes>
    {/* Public routes */}
    <Route path="/login" element={<LoginPage />} />
    
    {/* Protected routes */}
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="/vms" element={<VMListPage />} />
        <Route path="/vms/:vmUuid" element={<VMDetailPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/hosts" element={<HostsPage />} />
        <Route path="/alarms" element={<AlarmsPage />} />
        <Route path="/datastores" element={<DataStorePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Admin routes */}
        <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
        <Route path="/admin/sync" element={<AdminRoute><SyncPage /></AdminRoute>} />
    </Route>
</Routes>
```

### 5.3 API Service (`services/api.ts`)
```typescript
const API_BASE_URL = '/vmstat/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/vmstat/login';
        }
        return Promise.reject(error);
    }
);

// API modules
export const authApi = { login, getMe, changePassword };
export const dashboardApi = { getSummary, getTopCpuVMs, getTopMemoryVMs, getAlarms };
export const vmsApi = { getList, getDetail, getMetrics, getDisks, getNetworks, getRaw };
export const adminApi = { getUsers, createUser, updateUser, deleteUser };
export const syncApi = { getStatus, run, controlScheduler, getConfig };
export const metricsApi = { getVMHistory, getVMLatest };
export const alarmsApi = { getList, getSummary };
```

### 5.4 Auth Store (`stores/authStore.ts`)
```typescript
interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            login: (token, user) => set({ token, user, isAuthenticated: true }),
            logout: () => set({ token: null, user: null, isAuthenticated: false }),
        }),
        { name: 'vmstat-auth' }  // localStorage key
    )
);
```

### 5.5 Key Pages

#### Dashboard
- แสดงสถิติรวม (Total VMs, Running, Stopped, CPU%, Memory%)
- Top VMs by CPU/Memory
- Active Alarms
- Groups/Hosts overview

#### VM List
- ตารางแสดง VMs ทั้งหมด
- Search, Filter (status, group, host)
- Pagination, Sorting
- Click เพื่อดูรายละเอียด

#### VM Detail
- **Overview Tab**: ข้อมูลทั่วไป, Status, Resources
- **Metrics Tab**: กราฟ CPU, Memory, Network, Disk I/O
- **Disks Tab**: รายการ Disk configurations
- **Networks Tab**: รายการ Network interfaces
- **Alarms Tab**: Alarms ของ VM นี้
- **Raw Data Tab**: ข้อมูลดิบ JSON จาก Sangfor API โดยตรง

---

## 6. Docker & Deployment

### 6.1 Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  vmstat-backend:
    container_name: vmstat-backend
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    env_file:
      - ../.env
    environment:
      - SECRET_KEY=${SECRET_KEY:-vmstat-production-secret-key-2026}
    volumes:
      - ../.env:/app/.env:ro
    networks:
      - vmstat-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/vmstat/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  vmstat-frontend:
    container_name: vmstat-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3345:443"
    depends_on:
      - vmstat-backend
    networks:
      - vmstat-network

networks:
  vmstat-network:
    name: vmstat-network
    driver: bridge
```

### 6.2 Backend Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 6.3 Frontend Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/vmstat
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ssl /etc/nginx/ssl
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
```

### 6.4 Nginx Configuration (`nginx.conf`)
```nginx
server {
    listen 443 ssl;
    server_name 10.251.150.222;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /usr/share/nginx/html;
    index index.html;

    # React app
    location /vmstat/ {
        alias /usr/share/nginx/html/vmstat/;
        try_files $uri $uri/ /vmstat/index.html;
    }

    # API proxy
    location /vmstat/api/ {
        proxy_pass http://vmstat-backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
        return 200 'healthy';
    }
}
```

### 6.5 Environment Variables (`.env`)
```bash
# Sangfor SCP Connection
SCP_IP=10.251.204.30
SCP_USERNAME=admin
SCP_PASSWORD=your_password

# Sync Settings
SYNC_INTERVAL_MINUTES=5
SYNC_AUTO_START=True

# PostgreSQL Database
pgSQL_HOST=10.251.150.222
pgSQL_HOST_PORT=5210
pgSQL_DBNAME=sangfor_scp
pgSQL_USERNAME=apirak
pgSQL_PASSWORD=your_db_password

# Application
SECRET_KEY=your-secret-key-change-in-production
APP_NAME=VMStat API
APP_VERSION=1.0.0
DEBUG=false
```

### 6.6 Deployment Commands
```bash
# Build และ Start containers
cd /opt/code/sangfor_scp/webapp
docker-compose up -d --build

# ดู logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild เฉพาะ service
docker-compose up -d --build vmstat-backend
docker-compose up -d --build vmstat-frontend
```

---

## 7. ระบบ Sync Data

### 7.1 Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     SyncServiceV2                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │ SangforClient  │  │  SyncDbHandler │  │ SyncScheduler  │   │
│  │                │  │                │  │                │   │
│  │ - authenticate │  │ - create_job   │  │ - start/stop   │   │
│  │ - fetch_servers│  │ - upsert_vm    │  │ - interval     │   │
│  │ - fetch_alarms │  │ - update_job   │  │ - callback     │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Sync Flow
```
1. Trigger (Manual/Scheduler)
   ↓
2. Validate Configuration
   ↓
3. Authenticate with Sangfor SCP
   - GET /janus/public-key (RSA modulus)
   - Encrypt password using RSA
   - POST /janus/authenticate (get token)
   ↓
4. Fetch Servers
   - GET /janus/20190725/servers (paginated)
   - Extract server list from response
   ↓
5. Process Each VM
   - Parse VM data (config, metrics, network, disk)
   - UPSERT to sangfor.vm_master
   - INSERT to metrics.vm_metrics
   - UPSERT to sangfor.vm_network_interfaces
   - UPSERT to sangfor.vm_disk_config
   ↓
6. Fetch Alarms (optional)
   - GET /janus/alarms
   - UPSERT to sangfor.vm_alarms
   ↓
7. Update Job Status
   - Mark as completed/failed
   - Log statistics (inserted, updated, duration)
```

### 7.3 SangforClient API Calls
```python
# 1. Get Public Key
GET https://{scp_ip}/janus/public-key
Response: { "data": { "public_key": "..." } }

# 2. Authenticate
POST https://{scp_ip}/janus/authenticate
Body: {
    "auth": {
        "passwordCredentials": {
            "username": "admin",
            "password": "<encrypted_password>"
        }
    }
}
Response: { "data": { "access": { "token": { "id": "..." } } } }

# 3. List Servers
GET https://{scp_ip}/janus/20190725/servers?page_num=0&page_size=100
Headers: { "Authorization": "Token <token>" }
Response: { "data": { "items": [...] } }

# 4. Get Server Detail
GET https://{scp_ip}/janus/20190725/servers/{vm_uuid}
Headers: { "Authorization": "Token <token>" }
Response: { "data": {...} }
```

### 7.4 Scheduler Control
```python
# Start scheduler (every 5 minutes)
sync_service.start_scheduler(interval_minutes=5)

# Stop scheduler
sync_service.stop_scheduler()

# Get status
status = sync_service.status
# {
#     "is_syncing": False,
#     "scheduler": {
#         "is_running": True,
#         "interval_minutes": 5,
#         "next_run": "2026-02-02T15:30:00"
#     }
# }
```

---

## 8. ระบบ Authentication & Authorization

### 8.1 JWT Authentication Flow
```
1. User submits credentials
   POST /vmstat/api/auth/login
   ↓
2. Backend validates credentials
   - Query webapp.users
   - Verify password hash (bcrypt)
   ↓
3. Generate JWT token
   - Payload: { sub, user_id, role, role_level, exp }
   - Sign with SECRET_KEY (HS256)
   ↓
4. Return token to client
   { "access_token": "...", "token_type": "bearer", "user": {...} }
   ↓
5. Client stores token (localStorage via Zustand persist)
   ↓
6. Subsequent requests include token
   Authorization: Bearer <token>
   ↓
7. Backend validates token on each request
   - Decode JWT
   - Verify signature
   - Check expiration
   - Verify user exists and is active
```

### 8.2 Role-Based Access Control (RBAC)
```
Role Hierarchy:
┌─────────────────────────────────────────────┐
│                   admin                      │ Level: 100
│  - Full access to all features              │
│  - User management                          │
│  - System settings                          │
│  - Sync control                             │
├─────────────────────────────────────────────┤
│                  manager                     │ Level: 50
│  - View all VMs                             │
│  - View metrics/alarms                      │
│  - Limited admin features                   │
├─────────────────────────────────────────────┤
│                   viewer                     │ Level: 10
│  - Read-only access                         │
│  - View VMs, metrics, alarms                │
│  - No admin access                          │
└─────────────────────────────────────────────┘
```

### 8.3 Auth Utilities (`utils/auth.py`)
```python
# Password hashing (bcrypt)
def verify_password(plain_password: str, hashed_password: str) -> bool
def get_password_hash(password: str) -> str

# JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta]) -> str
def decode_token(token: str) -> dict

# Dependencies
async def get_current_user(credentials, db) -> dict
def require_role(required_role: str)  # Decorator
async def require_admin(current_user) -> dict
async def require_manager(current_user) -> dict

# Permissions
def get_user_permissions(db, user_id) -> Set[str]
def require_permission(permission: str)  # Decorator
```

### 8.4 Frontend Route Protection
```tsx
// Protected Route - requires authentication
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
}

// Admin Route - requires admin role
function AdminRoute({ children }) {
    const { isAuthenticated, user } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role !== 'admin') return <Navigate to="/" />;
    return <>{children}</>;
}
```

---

## 9. ระบบ Admin

### 9.1 User Management

#### List Users
```http
GET /vmstat/api/admin/users
Authorization: Bearer <token>
Query: ?page=1&page_size=20&search=&role=&is_active=

Response:
{
    "items": [
        {
            "id": 1,
            "username": "admin",
            "email": "admin@example.com",
            "full_name": "Administrator",
            "role": "admin",
            "is_active": true,
            "created_at": "2026-01-01T00:00:00Z"
        }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20,
    "pages": 1
}
```

#### Create User
```http
POST /vmstat/api/admin/users
Authorization: Bearer <token>
Content-Type: application/json

{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "full_name": "New User",
    "role": "viewer"
}
```

#### Update User
```http
PUT /vmstat/api/admin/users/{user_id}
Authorization: Bearer <token>

{
    "email": "updated@example.com",
    "full_name": "Updated Name",
    "role": "manager",
    "is_active": true,
    "password": "newpassword"  # Optional
}
```

#### Delete User
```http
DELETE /vmstat/api/admin/users/{user_id}
Authorization: Bearer <token>
```

### 9.2 System Statistics
```http
GET /vmstat/api/admin/system/stats
Authorization: Bearer <token>

Response:
{
    "total_users": 5,
    "active_users": 4,
    "admin_count": 1,
    "manager_count": 2,
    "viewer_count": 2,
    "total_vms": 150,
    "running_vms": 120,
    "recent_logins": 10
}
```

### 9.3 Audit Logs
```http
GET /vmstat/api/admin/audit-logs?limit=50
Authorization: Bearer <token>

Response:
{
    "data": [
        {
            "id": 1,
            "user_id": 1,
            "username": "admin",
            "action": "login",
            "details": "User logged in successfully",
            "created_at": "2026-02-02T10:00:00Z"
        }
    ]
}
```

### 9.4 Sync Configuration
```http
# Get current config
GET /vmstat/api/sync/config
Authorization: Bearer <token>

# Update config
PUT /vmstat/api/sync/config
{
    "scp_ip": "10.251.204.30",
    "scp_username": "admin",
    "scp_password": "newpassword",
    "sync_timeout_seconds": 60,
    "batch_size": 100
}

# Test connection
POST /vmstat/api/sync/test-connection
Authorization: Bearer <token>
```

---

## 10. การเชื่อมต่อและ Data Flow

### 10.1 Complete Data Flow
```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER (Browser)                                  │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ 1. HTTPS Request
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     NGINX (vmstat-frontend:443)                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ /vmstat/*          →  Static React App                             │ │
│  │ /vmstat/api/*      →  proxy_pass http://vmstat-backend:8000        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ 2. Internal HTTP
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     FASTAPI (vmstat-backend:8000)                        │
│  ┌──────────────────────┐  ┌──────────────────────┐                     │
│  │     Auth Check       │  │    Router Handler    │                     │
│  │ - Validate JWT       │  │ - /auth/*            │                     │
│  │ - Check permissions  │  │ - /vms/*             │                     │
│  └──────────────────────┘  │ - /dashboard/*       │                     │
│                            │ - /admin/*           │                     │
│  ┌──────────────────────┐  │ - /sync/*            │                     │
│  │    Sync Service      │  │ - /metrics/*         │                     │
│  │ - Scheduler          │  └──────────────────────┘                     │
│  │ - Sangfor Client     │                                               │
│  └──────────────────────┘                                               │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ 3. PostgreSQL Protocol
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL (External: 5210)                          │
│  sangfor.vm_master, metrics.vm_metrics, webapp.users, etc.              │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     SANGFOR SCP (External API)                           │
│  /janus/* endpoints                                                      │
│  (Connected by Sync Service only)                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Request Flow Examples

#### Example 1: User Login
```
Browser                 Nginx                   FastAPI              Database
   │                      │                        │                     │
   │── POST /vmstat/api/auth/login ──────────────►│                     │
   │                      │                        │                     │
   │                      │                        │── SELECT user ─────►│
   │                      │                        │◄── user data ───────│
   │                      │                        │                     │
   │                      │                        │ verify password     │
   │                      │                        │ create JWT          │
   │                      │                        │                     │
   │                      │                        │── INSERT audit_log ►│
   │                      │                        │◄────────────────────│
   │                      │                        │                     │
   │◄─────────────────────│◄── { token, user } ───│                     │
   │                      │                        │                     │
   │ Store token in       │                        │                     │
   │ localStorage         │                        │                     │
```

#### Example 2: Get VM List
```
Browser                 Nginx                   FastAPI              Database
   │                      │                        │                     │
   │── GET /vmstat/api/vms?page=1 ───────────────►│                     │
   │   Authorization: Bearer <token>               │                     │
   │                      │                        │                     │
   │                      │                        │ validate JWT        │
   │                      │                        │── check user ──────►│
   │                      │                        │◄───────────────────│
   │                      │                        │                     │
   │                      │                        │── SELECT FROM       │
   │                      │                        │   v_vm_overview ───►│
   │                      │                        │◄── VM list ────────│
   │                      │                        │                     │
   │◄─────────────────────│◄── { items, total } ──│                     │
```

#### Example 3: Sync Process
```
SyncService                               SangforAPI                   Database
     │                                         │                           │
     │── Create sync job ──────────────────────────────────────────────────►│
     │                                         │                           │
     │── GET /janus/public-key ───────────────►│                           │
     │◄── { public_key } ─────────────────────│                           │
     │                                         │                           │
     │── POST /janus/authenticate ────────────►│                           │
     │◄── { token } ──────────────────────────│                           │
     │                                         │                           │
     │── GET /janus/20190725/servers ─────────►│                           │
     │◄── { servers[] } ──────────────────────│                           │
     │                                         │                           │
     │ For each server:                        │                           │
     │   │── UPSERT vm_master ─────────────────────────────────────────────►│
     │   │── INSERT vm_metrics ────────────────────────────────────────────►│
     │   │── UPSERT vm_network_interfaces ─────────────────────────────────►│
     │                                         │                           │
     │── Update job status: completed ─────────────────────────────────────►│
```

---

## 11. การติดตั้งและใช้งาน

### 11.1 Prerequisites
- Docker & Docker Compose
- PostgreSQL 12+ (external or containerized)
- SSL certificates (self-signed or CA-signed)
- Network access to Sangfor SCP API

### 11.2 Initial Setup

#### Step 1: Clone/Copy Project
```bash
cd /opt/code
# Copy project files to sangfor_scp/
```

#### Step 2: Configure Environment
```bash
cd /opt/code/sangfor_scp
cp .env.example .env
nano .env
```

Edit `.env` with your settings:
```bash
# Sangfor SCP
SCP_IP=your_scp_ip
SCP_USERNAME=admin
SCP_PASSWORD=your_password

# Database
pgSQL_HOST=your_db_host
pgSQL_HOST_PORT=5432
pgSQL_DBNAME=sangfor_scp
pgSQL_USERNAME=your_user
pgSQL_PASSWORD=your_password

# Security
SECRET_KEY=generate-a-strong-secret-key
```

#### Step 3: Setup Database
```bash
# Connect to PostgreSQL and run schema files
psql -h $pgSQL_HOST -p $pgSQL_HOST_PORT -U $pgSQL_USERNAME -d postgres
CREATE DATABASE sangfor_scp;
\c sangfor_scp

# Run schema files in order
\i database/schema/01_create_database.sql
\i database/schema/02_static_tables.sql
\i database/schema/03_metrics_tables.sql
\i database/schema/04_functions.sql
\i database/schema/05_views.sql
...
```

#### Step 4: Generate SSL Certificates
```bash
cd /opt/code/sangfor_scp/webapp/frontend/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout server.key -out server.crt \
    -subj "/CN=vmstat.local"
```

#### Step 5: Build and Start
```bash
cd /opt/code/sangfor_scp/webapp
docker-compose up -d --build
```

#### Step 6: Create Admin User
```bash
# Connect to database
psql -h $pgSQL_HOST -p $pgSQL_HOST_PORT -U $pgSQL_USERNAME -d sangfor_scp

# Insert admin user (password: admin123)
INSERT INTO webapp.users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@example.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4QFJXC1p4jvG3rnq',
    'Administrator', 'admin');
```

### 11.3 Access Application
- URL: `https://your-server:3345/vmstat`
- Login: username/password ที่สร้างไว้

### 11.4 Configure Sync
1. Login as admin
2. Go to Admin Settings → Sync Configuration
3. Enter Sangfor SCP credentials
4. Test connection
5. Start scheduler or run manual sync

---

## 12. API Reference

### 12.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login และรับ JWT token |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/change-password` | เปลี่ยนรหัสผ่าน |

### 12.2 Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/summary` | สถิติรวม (VMs, CPU, Memory) |
| GET | `/dashboard/top-vms/cpu` | Top VMs by CPU usage |
| GET | `/dashboard/top-vms/memory` | Top VMs by Memory usage |
| GET | `/dashboard/alarms` | Active alarms |
| GET | `/dashboard/groups` | Group summary |
| GET | `/dashboard/hosts` | Host summary |

### 12.3 VMs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vms` | List VMs (paginated, searchable) |
| GET | `/vms/{vm_uuid}` | VM detail |
| GET | `/vms/{vm_uuid}/metrics` | VM metrics history |
| GET | `/vms/{vm_uuid}/disks` | VM disk configuration |
| GET | `/vms/{vm_uuid}/networks` | VM network interfaces |
| GET | `/vms/{vm_uuid}/alarms` | VM alarms |
| GET | `/vms/{vm_uuid}/realtime` | Real-time data from Sangfor API |

### 12.4 Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users |
| GET | `/admin/users/{id}` | Get user |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/{id}` | Update user |
| DELETE | `/admin/users/{id}` | Delete user |
| GET | `/admin/system/stats` | System statistics |
| GET | `/admin/audit-logs` | Audit logs |

### 12.5 Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sync/status` | Current sync status |
| GET | `/sync/stats` | Sync statistics |
| POST | `/sync/run` | Start sync (background) |
| POST | `/sync/run-foreground` | Start sync (wait for completion) |
| POST | `/sync/scheduler` | Control scheduler (start/stop) |
| GET | `/sync/config` | Get sync configuration |
| PUT | `/sync/config` | Update sync configuration |
| GET | `/sync/jobs` | Get sync job history |
| POST | `/sync/test-connection` | Test Sangfor connection |

### 12.6 Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics/vm/{vm_uuid}/history` | Historical metrics for graphing |
| GET | `/metrics/vm/{vm_uuid}/latest` | Latest metrics |
| GET | `/metrics/summary` | System-wide metrics summary |
| GET | `/metrics/top/{resource}` | Top consumers by resource |

### 12.7 Alarms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alarms` | List all alarms (paginated) |
| GET | `/alarms/summary` | Alarm counts by severity/status |

---

## 13. Troubleshooting

### 13.1 Common Issues

#### Container ไม่ Start
```bash
# ดู logs
docker-compose logs vmstat-backend
docker-compose logs vmstat-frontend

# ตรวจสอบ health
docker ps
docker inspect vmstat-backend --format='{{.State.Health.Status}}'
```

#### Database Connection Failed
```bash
# ตรวจสอบ connection
psql -h $pgSQL_HOST -p $pgSQL_HOST_PORT -U $pgSQL_USERNAME -d sangfor_scp

# ตรวจสอบ .env
cat .env | grep pgSQL
```

#### Sync Failed
```bash
# ดู sync logs
docker logs vmstat-backend 2>&1 | grep -i sync

# ตรวจสอบ Sangfor connection
curl -k https://SCP_IP/janus/public-key
```

#### 401 Unauthorized
- ตรวจสอบ token หมดอายุหรือไม่
- ตรวจสอบ SECRET_KEY ตรงกันทุก container
- ตรวจสอบ user is_active = true

#### 502 Bad Gateway
```bash
# Backend ไม่ทำงาน
docker restart vmstat-backend

# ตรวจสอบ network
docker network inspect vmstat-network
```

### 13.2 Useful Commands

```bash
# Rebuild specific service
docker-compose up -d --build vmstat-backend

# View real-time logs
docker-compose logs -f

# Execute command in container
docker exec -it vmstat-backend bash

# Check database from backend container
docker exec -it vmstat-backend python -c "from app.database import engine; print(engine.url)"

# Clear and rebuild
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### 13.3 Performance Tuning

#### Database
```sql
-- Create partition maintenance job
SELECT analytics.create_monthly_partitions();

-- Vacuum analyze
VACUUM ANALYZE metrics.vm_metrics;
VACUUM ANALYZE sangfor.vm_master;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW analytics.mv_vm_daily_stats;
```

#### Sync
- ปรับ `batch_size` ตามจำนวน VMs
- ปรับ `sync_timeout_seconds` หาก network ช้า
- ใช้ `collect_metrics: false` หากไม่ต้องการเก็บ metrics ย้อนหลัง

---

## 📝 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-02 | Initial release |

---

## 👥 Contributors

- **Development Team**: Sangfor SCP VM Management Project

---

## 📞 Support

สำหรับปัญหาหรือคำถาม:
1. ตรวจสอบ Troubleshooting section
2. ดู Docker logs
3. ตรวจสอบ Database connection
4. ติดต่อทีมพัฒนา

---

*คู่มือนี้จัดทำขึ้นเพื่อเป็นข้อมูลอ้างอิงสำหรับ developers และ AI agents ในการทำความเข้าใจและพัฒนาระบบต่อไป*

## 14. Version History

### v1.1.0 (2026-02-02)
- **Feature**: Fixed Disk Usage display on VM List page. Added `storage_usage` and `storage_used_mb` to API response schema.
- **UX**: Improved Mobile Responsiveness for Sidebar and Layout.
- **UX**: Enhanced Login Page error handling to show specific messages (User not found, Wrong password).
- **Fix**: Prevented default URL parameters (sort=name, size=25) from cluttering the address bar.
