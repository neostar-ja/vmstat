"""
Admin Router - Comprehensive User Management and System Administration
Includes: User Management, Role Management, Database Management, System Settings
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import os

from ..database import get_db
from ..config import get_settings
from ..schemas import (
    UserResponse, UserCreate, UserUpdate, UserListResponse,
    SystemStats, AuditLogItem
)
from ..schemas.admin import (
    RoleResponse, RoleCreate, RoleUpdate, RoleListResponse,
    PermissionResponse, PermissionListResponse, RolePermissionAssign,
    SettingResponse, SettingUpdate, SettingsListResponse,
    DatabaseStats, SystemHealthResponse,
    UserPermissionsResponse
)
from ..utils.auth import (
    get_password_hash,
    get_current_user,
    require_role,
    require_permission,
    get_user_permissions,
    get_current_user_with_permissions
)

router = APIRouter(prefix="/admin", tags=["Admin"])
settings = get_settings()


# ============================================================
# User Management
# ============================================================

@router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get paginated list of users (Admin only)."""
    conditions = ["1=1"]
    params = {}
    
    if search:
        conditions.append("(username ILIKE :search OR email ILIKE :search OR full_name ILIKE :search)")
        params["search"] = f"%{search}%"
    
    if role:
        conditions.append("role = :role")
        params["role"] = role
    
    if is_active is not None:
        conditions.append("is_active = :is_active")
        params["is_active"] = is_active
    
    where_clause = " AND ".join(conditions)
    
    # Count total
    count_query = f"SELECT COUNT(*) FROM webapp.users WHERE {where_clause}"
    total = db.execute(text(count_query), params).scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset
    
    data_query = f"""
        SELECT id, username, email, full_name, role, is_active, created_at, updated_at
        FROM webapp.users
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """
    
    result = db.execute(text(data_query), params)
    items = [dict(row._mapping) for row in result.fetchall()]
    
    pages = (total + page_size - 1) // page_size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get a specific user by ID (Admin only)."""
    result = db.execute(
        text("""
            SELECT id, username, email, full_name, role, is_active, created_at, updated_at
            FROM webapp.users
            WHERE id = :user_id
        """),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return dict(user._mapping)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Create a new user (Admin only)."""
    try:
        # Check if username or email exists
        result = db.execute(
            text("SELECT id FROM webapp.users WHERE username = :username OR email = :email"),
            {"username": user_data.username, "email": user_data.email}
        )
        if result.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
        
        # Validate role
        valid_roles = ["admin", "manager", "viewer"]
        if user_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        
        # Create user
        password_hash = get_password_hash(user_data.password)
        db.execute(
            text("""
                INSERT INTO webapp.users (username, email, password_hash, full_name, role, is_active)
                VALUES (:username, :email, :password_hash, :full_name, :role, TRUE)
            """),
            {
                "username": user_data.username,
                "email": user_data.email,
                "password_hash": password_hash,
                "full_name": user_data.full_name,
                "role": user_data.role
            }
        )
        db.commit()
        
        # Return created user
        result = db.execute(
            text("""
                SELECT id, username, email, full_name, role, is_active, created_at, updated_at
                FROM webapp.users WHERE username = :username
            """),
            {"username": user_data.username}
        )
        user_row = result.fetchone()
        if not user_row:
            raise HTTPException(status_code=500, detail="User created but could not be retrieved")
        
        # Log the action (after successful creation)
        try:
            _log_audit(db, current_user["id"], "create_user", f"Created user: {user_data.username}")
            db.commit()
        except Exception:
            pass  # Continue anyway - user was created successfully
        
        return dict(user_row._mapping)
    except HTTPException as e:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Update a user (Admin only)."""
    try:
        # Check if user exists
        result = db.execute(
            text("SELECT id, username FROM webapp.users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        existing_user = result.fetchone()
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent self-deactivation for admins
        if user_id == current_user["id"] and user_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )
        
        # Build update query
        updates = []
        params = {"user_id": user_id}
        
        if user_data.email is not None:
            # Check email uniqueness
            result = db.execute(
                text("SELECT id FROM webapp.users WHERE email = :email AND id != :user_id"),
                {"email": user_data.email, "user_id": user_id}
            )
            if result.fetchone():
                raise HTTPException(status_code=400, detail="Email already in use")
            updates.append("email = :email")
            params["email"] = user_data.email
        
        if user_data.full_name is not None:
            updates.append("full_name = :full_name")
            params["full_name"] = user_data.full_name
        
        if user_data.role is not None:
            valid_roles = ["admin", "manager", "viewer"]
            if user_data.role not in valid_roles:
                raise HTTPException(status_code=400, detail=f"Invalid role")
            updates.append("role = :role")
            params["role"] = user_data.role
        
        if user_data.is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = user_data.is_active
        
        if user_data.password is not None:
            updates.append("password_hash = :password_hash")
            params["password_hash"] = get_password_hash(user_data.password)
        
        if updates:
            update_query = f"UPDATE webapp.users SET {', '.join(updates)}, updated_at = NOW() WHERE id = :user_id"
            db.execute(text(update_query), params)
            db.commit()
        
        # Return updated user
        result = db.execute(
            text("""
                SELECT id, username, email, full_name, role, is_active, created_at, updated_at
                FROM webapp.users WHERE id = :user_id
            """),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found after update")
        
        # Log the action (after fetch)
        if updates:
            try:
                _log_audit(db, current_user["id"], "update_user", f"Updated user ID: {user_id}")
                db.commit()
            except Exception:
                pass  # Continue anyway
        
        return dict(user_row._mapping)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Delete a user (Admin only). Actually deactivates the user."""
    try:
        # Prevent self-deletion
        if user_id == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        # Check if user exists
        result = db.execute(
            text("SELECT id, username FROM webapp.users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        existing_user = result.fetchone()
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete (deactivate)
        db.execute(
            text("UPDATE webapp.users SET is_active = FALSE, updated_at = NOW() WHERE id = :user_id"),
            {"user_id": user_id}
        )
        db.commit()
        
        _log_audit(db, current_user["id"], "delete_user", f"Deleted user ID: {user_id}")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


@router.post("/users/{user_id}/reset-password", response_model=dict)
async def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Reset a user's password to a random value (Admin only)."""
    import secrets
    import string
    
    try:
        # Check if user exists
        result = db.execute(
            text("SELECT id, username, email FROM webapp.users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        user = result.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate random password
        alphabet = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        
        # Update password
        password_hash = get_password_hash(new_password)
        db.execute(
            text("UPDATE webapp.users SET password_hash = :password_hash, updated_at = NOW() WHERE id = :user_id"),
            {"password_hash": password_hash, "user_id": user_id}
        )
        db.commit()
        
        _log_audit(db, current_user["id"], "reset_password", f"Reset password for user: {user.username}")
        
        return {
            "message": "Password reset successfully",
            "temporary_password": new_password,
            "username": user.username
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")


# ============================================================
# System Statistics
# ============================================================

@router.get("/system/stats", response_model=SystemStats)
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get system statistics (Admin only)."""
    # User stats
    user_stats = db.execute(text("""
        SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
            COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
            COUNT(*) FILTER (WHERE role = 'manager') as manager_count,
            COUNT(*) FILTER (WHERE role = 'viewer') as viewer_count
        FROM webapp.users
    """)).fetchone()
    
    # VM stats
    vm_stats = db.execute(text("""
        SELECT 
            COUNT(*) as total_vms,
            COUNT(*) FILTER (WHERE power_state = 'on') as running_vms
        FROM analytics.v_vm_overview
    """)).fetchone()
    
    # Recent logins (last 24h) - placeholder, need audit log
    recent_logins = 0
    
    return {
        "total_users": user_stats.total_users or 0,
        "active_users": user_stats.active_users or 0,
        "admin_count": user_stats.admin_count or 0,
        "manager_count": user_stats.manager_count or 0,
        "viewer_count": user_stats.viewer_count or 0,
        "total_vms": vm_stats.total_vms or 0,
        "running_vms": vm_stats.running_vms or 0,
        "recent_logins": recent_logins
    }


@router.get("/audit-logs", response_model=List[AuditLogItem])
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get audit logs with filtering (Admin only)."""
    conditions = ["1=1"]
    params = {"limit": limit}
    
    if action:
        conditions.append("action = :action")
        params["action"] = action
    
    if user_id:
        conditions.append("user_id = :user_id")
        params["user_id"] = user_id
    
    if start_date:
        conditions.append("created_at >= :start_date")
        params["start_date"] = start_date
    
    if end_date:
        conditions.append("created_at <= :end_date")
        params["end_date"] = end_date
    
    where_clause = " AND ".join(conditions)
    
    result = db.execute(
        text(f"""
            SELECT id, user_id, username, action, details, ip_address::text, created_at
            FROM webapp.audit_logs
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit
        """),
        params
    )
    return [dict(row._mapping) for row in result.fetchall()]


# ============================================================
# Role Management
# ============================================================

@router.get("/roles", response_model=RoleListResponse)
async def get_roles(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get all roles with permission and user counts."""
    result = db.execute(text("""
        SELECT r.id, r.name, r.display_name, r.description, r.level, r.is_active,
               r.created_at, r.updated_at,
               (SELECT COUNT(*) FROM webapp.role_permissions WHERE role_id = r.id) as permission_count,
               (SELECT COUNT(*) FROM webapp.users WHERE role = r.name OR role_id = r.id) as user_count
        FROM webapp.roles r
        ORDER BY r.level DESC
    """))
    
    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": len(items)}


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get a specific role by ID."""
    result = db.execute(
        text("""
            SELECT r.id, r.name, r.display_name, r.description, r.level, r.is_active,
                   r.created_at, r.updated_at,
                   (SELECT COUNT(*) FROM webapp.role_permissions WHERE role_id = r.id) as permission_count,
                   (SELECT COUNT(*) FROM webapp.users WHERE role = r.name OR role_id = r.id) as user_count
            FROM webapp.roles r
            WHERE r.id = :role_id
        """),
        {"role_id": role_id}
    )
    role = result.fetchone()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return dict(role._mapping)


@router.get("/roles/{role_id}/permissions", response_model=PermissionListResponse)
async def get_role_permissions(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get permissions assigned to a role."""
    result = db.execute(
        text("""
            SELECT p.id, p.name, p.description, p.category, p.created_at
            FROM webapp.permissions p
            JOIN webapp.role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = :role_id
            ORDER BY p.category, p.name
        """),
        {"role_id": role_id}
    )
    
    items = [dict(row._mapping) for row in result.fetchall()]
    categories = list(set(item["category"] for item in items if item["category"]))
    
    return {"items": items, "total": len(items), "categories": categories}


@router.put("/roles/{role_id}/permissions")
async def update_role_permissions(
    role_id: int,
    data: RolePermissionAssign,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Update permissions for a role (Admin only)."""
    # Verify role exists
    result = db.execute(
        text("SELECT id, name FROM webapp.roles WHERE id = :role_id"),
        {"role_id": role_id}
    )
    role = result.fetchone()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Prevent modifying admin role permissions
    if role.name == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify admin role permissions"
        )
    
    # Clear existing permissions
    db.execute(
        text("DELETE FROM webapp.role_permissions WHERE role_id = :role_id"),
        {"role_id": role_id}
    )
    
    # Add new permissions
    for perm_id in data.permission_ids:
        db.execute(
            text("""
                INSERT INTO webapp.role_permissions (role_id, permission_id)
                SELECT :role_id, :perm_id
                WHERE EXISTS (SELECT 1 FROM webapp.permissions WHERE id = :perm_id)
            """),
            {"role_id": role_id, "perm_id": perm_id}
        )
    
    db.commit()
    _log_audit(db, current_user["id"], "update_role_permissions", f"Updated permissions for role: {role.name}")
    
    return {"message": "Permissions updated successfully", "permission_count": len(data.permission_ids)}


# ============================================================
# Permission Management
# ============================================================

@router.get("/permissions", response_model=PermissionListResponse)
async def get_permissions(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get all available permissions."""
    params = {}
    conditions = ["1=1"]
    
    if category:
        conditions.append("category = :category")
        params["category"] = category
    
    where_clause = " AND ".join(conditions)
    
    result = db.execute(
        text(f"""
            SELECT id, name, description, category, created_at
            FROM webapp.permissions
            WHERE {where_clause}
            ORDER BY category, name
        """),
        params
    )
    
    items = [dict(row._mapping) for row in result.fetchall()]
    
    # Get unique categories
    cat_result = db.execute(text("SELECT DISTINCT category FROM webapp.permissions WHERE category IS NOT NULL ORDER BY category"))
    categories = [row[0] for row in cat_result.fetchall()]
    
    return {"items": items, "total": len(items), "categories": categories}


@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get all permissions for a specific user."""
    # Get user info
    result = db.execute(
        text("""
            SELECT u.id, u.username, u.role, r.display_name as role_display_name, r.level as role_level
            FROM webapp.users u
            LEFT JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
            WHERE u.id = :user_id
        """),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get permissions
    permissions = get_user_permissions(db, user_id)
    
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "role_display_name": user.role_display_name or user.role.title(),
        "role_level": user.role_level or 0,
        "permissions": list(permissions)
    }


# ============================================================
# System Settings Management
# ============================================================

@router.get("/settings", response_model=SettingsListResponse)
async def get_settings_list(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get all system settings."""
    result = db.execute(text("""
        SELECT key, value, description, updated_at, updated_by
        FROM webapp.settings
        ORDER BY key
    """))
    
    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": len(items)}


@router.get("/settings/{key}", response_model=SettingResponse)
async def get_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get a specific setting value."""
    result = db.execute(
        text("SELECT key, value, description, updated_at, updated_by FROM webapp.settings WHERE key = :key"),
        {"key": key}
    )
    setting = result.fetchone()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return dict(setting._mapping)


@router.put("/settings/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    data: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Update a system setting."""
    # Check if setting exists
    result = db.execute(
        text("SELECT key FROM webapp.settings WHERE key = :key"),
        {"key": key}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Setting not found")
    
    # Update setting
    db.execute(
        text("""
            UPDATE webapp.settings
            SET value = :value, updated_at = NOW(), updated_by = :user_id
            WHERE key = :key
        """),
        {"key": key, "value": data.value, "user_id": current_user["id"]}
    )
    db.commit()
    
    _log_audit(db, current_user["id"], "update_setting", f"Updated setting: {key} = {data.value}")
    
    # Return updated setting
    result = db.execute(
        text("SELECT key, value, description, updated_at, updated_by FROM webapp.settings WHERE key = :key"),
        {"key": key}
    )
    return dict(result.fetchone()._mapping)


@router.post("/settings", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
async def create_setting(
    key: str,
    value: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Create a new system setting."""
    # Check if setting exists
    result = db.execute(
        text("SELECT key FROM webapp.settings WHERE key = :key"),
        {"key": key}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Setting already exists")
    
    # Create setting
    db.execute(
        text("""
            INSERT INTO webapp.settings (key, value, description, updated_by)
            VALUES (:key, :value, :description, :user_id)
        """),
        {"key": key, "value": value, "description": description, "user_id": current_user["id"]}
    )
    db.commit()
    
    _log_audit(db, current_user["id"], "create_setting", f"Created setting: {key}")
    
    result = db.execute(
        text("SELECT key, value, description, updated_at, updated_by FROM webapp.settings WHERE key = :key"),
        {"key": key}
    )
    return dict(result.fetchone()._mapping)


# ============================================================
# Database Management
# ============================================================

@router.get("/database/stats", response_model=DatabaseStats)
async def get_database_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get database statistics."""
    # Database size
    result = db.execute(text("""
        SELECT pg_database.datname,
               pg_size_pretty(pg_database_size(pg_database.datname)) as size
        FROM pg_database
        WHERE datname = current_database()
    """))
    db_info = result.fetchone()
    
    # Table stats
    result = db.execute(text("""
        SELECT 
            schemaname as schema_name,
            relname as table_name,
            n_live_tup as row_count,
            pg_total_relation_size(schemaname || '.' || relname) as size_bytes,
            pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as size_pretty
        FROM pg_stat_user_tables
        WHERE schemaname IN ('webapp', 'sangfor', 'analytics')
        ORDER BY pg_total_relation_size(schemaname || '.' || relname) DESC
    """))
    tables = [dict(row._mapping) for row in result.fetchall()]
    
    # Connection count
    result = db.execute(text("""
        SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()
    """))
    conn_count = result.scalar()
    
    total_rows = sum(t["row_count"] for t in tables)
    
    return {
        "database_name": db_info.datname if db_info else "unknown",
        "database_size": db_info.size if db_info else "unknown",
        "total_tables": len(tables),
        "total_rows": total_rows,
        "connection_count": conn_count,
        "tables": tables
    }


@router.post("/database/vacuum")
async def vacuum_database(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Run VACUUM ANALYZE on database tables."""
    _log_audit(db, current_user["id"], "database_vacuum", "Started database vacuum")
    
    # Run vacuum in background
    def run_vacuum():
        try:
            from ..database import engine
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                conn.execute(text("VACUUM ANALYZE"))
        except Exception as e:
            print(f"Vacuum error: {e}")
    
    background_tasks.add_task(run_vacuum)
    
    return {"message": "Vacuum started in background"}


@router.get("/database/active-connections")
async def get_active_connections(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get active database connections."""
    result = db.execute(text("""
        SELECT pid, usename, application_name, client_addr::text, 
               state, query_start, state_change,
               CASE WHEN state = 'active' THEN query ELSE '' END as current_query
        FROM pg_stat_activity
        WHERE datname = current_database()
        ORDER BY query_start DESC NULLS LAST
    """))
    
    connections = [dict(row._mapping) for row in result.fetchall()]
    return {"connections": connections, "total": len(connections)}


# ============================================================
# System Health
# ============================================================

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get overall system health status."""
    from ..services.sync_service import sync_service
    
    services = []
    overall_status = "healthy"
    
    # Check database
    try:
        db.execute(text("SELECT 1"))
        db_status = "running"
    except Exception:
        db_status = "error"
        overall_status = "critical"
    
    services.append({
        "name": "PostgreSQL Database",
        "status": db_status,
        "last_check": datetime.now(),
        "details": None
    })
    
    # Check sync service
    sync_status = "running" if sync_service._scheduler_running else "stopped"
    last_sync = sync_service._last_sync_at
    
    services.append({
        "name": "Data Sync Service",
        "status": sync_status,
        "last_check": datetime.now(),
        "details": f"Interval: {sync_service._sync_interval_minutes} minutes" if sync_service._scheduler_running else None
    })
    
    # Calculate uptime (placeholder)
    uptime = "Unknown"
    
    return {
        "status": overall_status,
        "services": services,
        "database_status": db_status,
        "sync_status": sync_status,
        "last_sync": last_sync,
        "api_version": settings.APP_VERSION,
        "uptime": uptime
    }


@router.get("/system/info")
async def get_system_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get system information."""
    import platform
    import sys
    
    # PostgreSQL version
    result = db.execute(text("SELECT version()"))
    pg_version = result.scalar()
    
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "python_version": sys.version,
        "platform": platform.platform(),
        "postgresql_version": pg_version,
        "debug_mode": settings.DEBUG
    }


# ============================================================
# Current User Permissions
# ============================================================

@router.get("/my-permissions")
async def get_my_permissions(
    current_user: dict = Depends(get_current_user_with_permissions)
):
    """Get current user's permissions."""
    return {
        "user_id": current_user["id"],
        "username": current_user["username"],
        "role": current_user["role"],
        "role_display_name": current_user.get("role_display_name", current_user["role"].title()),
        "role_level": current_user.get("role_level", 0),
        "permissions": current_user.get("permissions", [])
    }


# ============================================================
# Helper Functions
# ============================================================

def _log_audit(db: Session, user_id: int, action: str, details: str, ip_address: str = None):
    """Log an audit event. Note: Does NOT commit - caller must commit."""
    try:
        # Get username
        result = db.execute(
            text("SELECT username FROM webapp.users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        user = result.fetchone()
        username = user.username if user else "unknown"
        
        db.execute(
            text("""
                INSERT INTO webapp.audit_logs (user_id, username, action, details, ip_address)
                VALUES (:user_id, :username, :action, :details, :ip_address::inet)
            """),
            {
                "user_id": user_id,
                "username": username,
                "action": action,
                "details": details,
                "ip_address": ip_address
            }
        )
        # Note: NOT committing here - let the caller commit the full transaction
    except Exception:
        # Don't fail the main operation if audit logging fails
        pass
