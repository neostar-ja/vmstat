"""
Pydantic schemas for Admin endpoints
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User List Response
class UserListItem(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    items: List[UserListItem]
    total: int
    page: int
    page_size: int
    pages: int

# System Statistics
class SystemStats(BaseModel):
    total_users: int
    active_users: int
    admin_count: int
    manager_count: int
    viewer_count: int
    total_vms: int
    running_vms: int
    recent_logins: int

# Audit Log
class AuditLogItem(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Settings
class SettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[datetime] = None


# ============================================================
# Role Management Schemas
# ============================================================

class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    level: int = 10

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    is_active: Optional[bool] = None

class RoleResponse(RoleBase):
    id: int
    is_active: bool
    permission_count: Optional[int] = None
    user_count: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class RoleListResponse(BaseModel):
    items: List[RoleResponse]
    total: int


# ============================================================
# Permission Management Schemas
# ============================================================

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class PermissionResponse(PermissionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PermissionListResponse(BaseModel):
    items: List[PermissionResponse]
    total: int
    categories: List[str]

class RolePermissionAssign(BaseModel):
    permission_ids: List[int]

class UserPermissionsResponse(BaseModel):
    user_id: int
    username: str
    role: str
    role_display_name: str
    role_level: int
    permissions: List[str]


# ============================================================
# System Settings Schemas
# ============================================================

class SettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    
    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

class SettingsListResponse(BaseModel):
    items: List[SettingResponse]
    total: int


# ============================================================
# Database Management Schemas
# ============================================================

class TableInfo(BaseModel):
    schema_name: str
    table_name: str
    row_count: int
    size_bytes: int
    size_pretty: str

class DatabaseStats(BaseModel):
    database_name: str
    database_size: str
    total_tables: int
    total_rows: int
    connection_count: int
    uptime: Optional[str] = None
    tables: List[TableInfo]

class DatabaseQuery(BaseModel):
    query: str
    limit: int = 100

class DatabaseQueryResult(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: float


# ============================================================
# System Health Schemas
# ============================================================

class ServiceStatus(BaseModel):
    name: str
    status: str  # running, stopped, error
    uptime: Optional[str] = None
    last_check: datetime
    details: Optional[str] = None

class SystemHealthResponse(BaseModel):
    status: str  # healthy, degraded, critical
    services: List[ServiceStatus]
    database_status: str
    sync_status: str
    last_sync: Optional[datetime] = None
    api_version: str
    uptime: str


# ============================================================
# Backup Schemas
# ============================================================

class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    size_pretty: str
    created_at: datetime
    backup_type: str  # full, incremental

class BackupListResponse(BaseModel):
    items: List[BackupInfo]
    total: int

class BackupCreate(BaseModel):
    backup_type: str = "full"
    include_data: bool = True
    description: Optional[str] = None
