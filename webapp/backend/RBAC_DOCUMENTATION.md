# VMStat RBAC System Documentation

## Overview

VMStat Web Application ใช้ระบบ JWT Authentication ร่วมกับ Role-Based Access Control (RBAC) สำหรับการจัดการสิทธิ์การเข้าถึง

## User Credentials

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin_user | Admin@2026! | admin | Full system access |
| manager_user | Manager@2026! | manager | VM management access |
| viewer_user | Viewer@2026! | viewer | Read-only access |

## Role Hierarchy

```
admin (level 100)
  └── All permissions (26 permissions)
      ├── User Management (create, update, delete, reset password)
      ├── VM Management (power, snapshot, migrate, configure)
      ├── Host Management
      ├── System Administration (settings, database, audit, backup)
      ├── Reports
      └── Alarms

manager (level 50)
  └── Limited permissions (11 permissions)
      ├── View users
      ├── VM operations (view, metrics, power, snapshot)
      ├── Host operations (view, metrics)
      ├── Reports (view, export)
      └── Alarms (view, acknowledge)

viewer (level 10)
  └── Read-only permissions (6 permissions)
      ├── VMs (view, metrics)
      ├── Hosts (view, metrics)
      ├── Reports (view)
      └── Alarms (view)
```

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login and get JWT token | Public |
| GET | `/auth/me` | Get current user profile | Authenticated |
| POST | `/auth/change-password` | Change password | Authenticated |
| POST | `/auth/register` | Register new user | Admin only |

### Admin - User Management (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/users` | List all users | Admin |
| GET | `/admin/users/{id}` | Get user by ID | Admin |
| POST | `/admin/users` | Create new user | Admin |
| PUT | `/admin/users/{id}` | Update user | Admin |
| DELETE | `/admin/users/{id}` | Deactivate user | Admin |
| POST | `/admin/users/{id}/reset-password` | Reset user password | Admin |
| GET | `/admin/users/{id}/permissions` | Get user permissions | Admin |

### Admin - Role Management (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/roles` | List all roles | Admin |
| GET | `/admin/roles/{id}` | Get role details | Admin |
| GET | `/admin/roles/{id}/permissions` | Get role permissions | Admin |
| PUT | `/admin/roles/{id}/permissions` | Update role permissions | Admin |

### Admin - Permission Management (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/permissions` | List all permissions | Admin |
| GET | `/admin/my-permissions` | Get current user permissions | Authenticated |

### Admin - System Settings (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/settings` | List all settings | Admin |
| GET | `/admin/settings/{key}` | Get setting value | Admin |
| PUT | `/admin/settings/{key}` | Update setting | Admin |
| POST | `/admin/settings` | Create new setting | Admin |

### Admin - Database Management (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/database/stats` | Get database statistics | Admin |
| POST | `/admin/database/vacuum` | Run database vacuum | Admin |
| GET | `/admin/database/active-connections` | List active connections | Admin |

### Admin - System Health (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/system/health` | Get system health status | Admin |
| GET | `/admin/system/info` | Get system information | Admin |
| GET | `/admin/system/stats` | Get system statistics | Admin |
| GET | `/admin/audit-logs` | Get audit logs | Admin |

### VMs (`/vms`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/vms` | List VMs | All authenticated |
| GET | `/vms/{uuid}` | Get VM details | All authenticated |
| GET | `/vms/{uuid}/metrics` | Get VM metrics | All authenticated |

### Dashboard (`/dashboard`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/dashboard/summary` | Get dashboard summary | All authenticated |
| GET | `/dashboard/groups` | Get groups summary | All authenticated |
| GET | `/dashboard/hosts` | Get hosts summary | All authenticated |
| GET | `/dashboard/alarms` | Get active alarms | All authenticated |

## Database Schema

### Tables

- `webapp.users` - User accounts
- `webapp.roles` - Role definitions
- `webapp.permissions` - Permission definitions
- `webapp.role_permissions` - Role-permission mappings
- `webapp.settings` - System settings
- `webapp.audit_logs` - Audit trail
- `webapp.user_sessions` - Active sessions

### Views

- `webapp.v_user_permissions` - User permissions view

### Functions

- `webapp.has_permission(user_id, permission_name)` - Check if user has permission

## Testing

Run the test script to verify RBAC functionality:

```bash
bash /opt/code/sangfor_scp/webapp/backend/app/scripts/test_rbac.sh
```

## Configuration

Configuration is stored in environment variables and `.env` file:

```env
# JWT Settings
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
pgSQL_HOST=10.251.150.222
pgSQL_HOST_PORT=5210
pgSQL_DBNAME=sangfor_scp
pgSQL_USERNAME=apirak
pgSQL_PASSWORD=your-password
```

## Files Added/Modified

### New Files
- [app/models/role.py](webapp/backend/app/models/role.py) - Role and Permission models
- [app/scripts/init_rbac.py](webapp/backend/app/scripts/init_rbac.py) - Python RBAC initializer
- [app/scripts/init_rbac.sh](webapp/backend/app/scripts/init_rbac.sh) - Shell RBAC initializer
- [app/scripts/test_rbac.py](webapp/backend/app/scripts/test_rbac.py) - Python RBAC tests
- [app/scripts/test_rbac.sh](webapp/backend/app/scripts/test_rbac.sh) - Shell RBAC tests
- [app/sql/01_rbac_schema.sql](webapp/backend/app/sql/01_rbac_schema.sql) - SQL schema

### Modified Files
- [app/utils/auth.py](webapp/backend/app/utils/auth.py) - Enhanced with permission checks
- [app/routers/auth.py](webapp/backend/app/routers/auth.py) - Returns permissions with login
- [app/routers/admin.py](webapp/backend/app/routers/admin.py) - Complete admin functionality
- [app/schemas/admin.py](webapp/backend/app/schemas/admin.py) - New admin schemas
- [app/schemas/__init__.py](webapp/backend/app/schemas/__init__.py) - Export new schemas

## Security Features

1. **JWT Tokens** - Secure token-based authentication
2. **Password Hashing** - bcrypt for secure password storage
3. **Role-based Access** - Hierarchical role system (admin > manager > viewer)
4. **Permission-based Access** - Fine-grained permission control
5. **Audit Logging** - Track all admin actions
6. **Session Management** - Track active user sessions
7. **No Hardcoding** - All secrets from environment variables
