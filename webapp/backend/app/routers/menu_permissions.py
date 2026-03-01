"""
Menu Permissions Router - CRUD for Menu Items and Permission Matrix
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..utils.auth import get_current_user, require_role
from ..schemas.permissions import (
    MenuItemCreate, MenuItemUpdate, MenuItemResponse,
    PermissionMatrixItem, RolePermissionMatrix, BulkPermissionUpdate,
    RoleMenuPermissionCreate, RoleMenuPermissionResponse, UserMenuPermission
)

router = APIRouter(prefix="/menu-permissions", tags=["Menu Permissions"])


# ============================================================
# Menu Items CRUD
# ============================================================

@router.get("/menu-items", response_model=List[MenuItemResponse])
async def list_menu_items(
    menu_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all menu items."""
    query = 'SELECT * FROM webapp.menu_items WHERE 1=1'
    params = {}
    
    if menu_type:
        query += ' AND menu_type = :menu_type'
        params['menu_type'] = menu_type
    
    query += ' ORDER BY "order", id'
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result.fetchall()]


@router.post("/menu-items", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    data: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Create a new menu item (Admin only)."""
    # Check name uniqueness
    existing = db.execute(
        text("SELECT id FROM webapp.menu_items WHERE name = :name"),
        {"name": data.name}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Menu item name already exists")
    
    result = db.execute(
        text("""
            INSERT INTO webapp.menu_items (name, display_name, path, icon, parent_id, menu_type, "order", is_visible, description)
            VALUES (:name, :display_name, :path, :icon, :parent_id, :menu_type, :order, :is_visible, :description)
            RETURNING *
        """),
        data.model_dump()
    )
    db.commit()
    return dict(result.fetchone()._mapping)


@router.put("/menu-items/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Update a menu item (Admin only)."""
    existing = db.execute(
        text("SELECT id FROM webapp.menu_items WHERE id = :id"),
        {"id": item_id}
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    set_clauses = ", ".join([f'"{k}" = :{k}' if k == 'order' else f"{k} = :{k}" for k in update_data.keys()])
    update_data["id"] = item_id
    
    result = db.execute(
        text(f'UPDATE webapp.menu_items SET {set_clauses}, updated_at = NOW() WHERE id = :id RETURNING *'),
        update_data
    )
    db.commit()
    return dict(result.fetchone()._mapping)


@router.delete("/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Delete a menu item (Admin only)."""
    existing = db.execute(
        text("SELECT id FROM webapp.menu_items WHERE id = :id"),
        {"id": item_id}
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.execute(text("DELETE FROM webapp.menu_items WHERE id = :id"), {"id": item_id})
    db.commit()


@router.post("/menu-items/init-defaults")
async def init_default_menu_items(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Re-initialize default menu items and permissions."""
    # Read and execute the migration SQL
    import os
    sql_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'database', 'migrate_menu_permissions.sql')
    
    if os.path.exists(sql_path):
        with open(sql_path, 'r') as f:
            sql = f.read()
        db.execute(text(sql))
        db.commit()
        return {"message": "Default menu items and permissions initialized", "status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Migration SQL file not found")


# ============================================================
# Permission Matrix
# ============================================================

@router.get("/permissions/matrix", response_model=List[RolePermissionMatrix])
async def get_permission_matrix(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get full permission matrix (all roles × all menus)."""
    # Get all active roles
    roles = db.execute(
        text("SELECT id, name, display_name FROM webapp.roles WHERE is_active = true ORDER BY level DESC")
    ).fetchall()
    
    # Get all menu items
    menus = db.execute(
        text('SELECT * FROM webapp.menu_items ORDER BY "order", id')
    ).fetchall()
    
    # Get all permissions
    perms = db.execute(
        text("SELECT * FROM webapp.role_menu_permissions")
    ).fetchall()
    
    # Build lookup
    perm_lookup = {}
    for p in perms:
        key = (p.role_id, p.menu_item_id)
        perm_lookup[key] = p
    
    # Build matrix
    matrix = []
    for role in roles:
        perm_items = []
        for menu in menus:
            key = (role.id, menu.id)
            perm = perm_lookup.get(key)
            perm_items.append(PermissionMatrixItem(
                menu_item_id=menu.id,
                menu_name=menu.name,
                menu_display_name=menu.display_name,
                menu_path=menu.path,
                menu_type=menu.menu_type,
                menu_icon=menu.icon,
                parent_id=menu.parent_id,
                can_view=perm.can_view if perm else False,
                can_edit=perm.can_edit if perm else False,
                can_delete=perm.can_delete if perm else False
            ))
        matrix.append(RolePermissionMatrix(
            role_id=role.id,
            role_name=role.name,
            role_display_name=role.display_name,
            permissions=perm_items
        ))
    
    return matrix


@router.get("/permissions/my", response_model=List[UserMenuPermission])
async def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's menu permissions."""
    result = db.execute(
        text("""
            SELECT 
                m.id as menu_item_id,
                m.name as menu_name,
                m.display_name as menu_display_name,
                m.path as menu_path,
                m.menu_type,
                m.icon as menu_icon,
                m.parent_id,
                m."order",
                COALESCE(rmp.can_view, false) as can_view,
                COALESCE(rmp.can_edit, false) as can_edit,
                COALESCE(rmp.can_delete, false) as can_delete
            FROM webapp.menu_items m
            LEFT JOIN webapp.roles r ON r.name = :role
            LEFT JOIN webapp.role_menu_permissions rmp ON rmp.menu_item_id = m.id AND rmp.role_id = r.id
            WHERE m.is_visible = true
            ORDER BY m."order", m.id
        """),
        {"role": current_user["role"]}
    )
    
    rows = result.fetchall()
    permissions = []
    for row in rows:
        # Admin always gets full access
        is_admin = current_user["role"] == "admin"
        permissions.append(UserMenuPermission(
            menu_item_id=row.menu_item_id,
            menu_name=row.menu_name,
            menu_display_name=row.menu_display_name,
            menu_path=row.menu_path,
            menu_type=row.menu_type,
            menu_icon=row.menu_icon,
            parent_id=row.parent_id,
            order=row.order,
            can_view=True if is_admin else row.can_view,
            can_edit=True if is_admin else row.can_edit,
            can_delete=True if is_admin else row.can_delete
        ))
    
    return permissions


@router.post("/permissions/bulk-update")
async def bulk_update_permissions(
    data: BulkPermissionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Bulk update permissions for a role (Admin only)."""
    # Verify role exists
    role = db.execute(
        text("SELECT id FROM webapp.roles WHERE id = :id"),
        {"id": data.role_id}
    ).fetchone()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")
    
    updated_count = 0
    for perm_item in data.permissions:
        menu_item_id = perm_item.get("menu_item_id")
        if not menu_item_id:
            continue
        
        can_view = perm_item.get("can_view", False)
        can_edit = perm_item.get("can_edit", False)
        can_delete = perm_item.get("can_delete", False)
        
        # Upsert
        existing = db.execute(
            text("""
                SELECT id FROM webapp.role_menu_permissions
                WHERE role_id = :role_id AND menu_item_id = :menu_item_id
            """),
            {"role_id": data.role_id, "menu_item_id": menu_item_id}
        ).fetchone()
        
        if existing:
            db.execute(
                text("""
                    UPDATE webapp.role_menu_permissions
                    SET can_view = :can_view, can_edit = :can_edit, can_delete = :can_delete, updated_at = NOW()
                    WHERE role_id = :role_id AND menu_item_id = :menu_item_id
                """),
                {
                    "role_id": data.role_id,
                    "menu_item_id": menu_item_id,
                    "can_view": can_view,
                    "can_edit": can_edit,
                    "can_delete": can_delete
                }
            )
        else:
            db.execute(
                text("""
                    INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
                    VALUES (:role_id, :menu_item_id, :can_view, :can_edit, :can_delete)
                """),
                {
                    "role_id": data.role_id,
                    "menu_item_id": menu_item_id,
                    "can_view": can_view,
                    "can_edit": can_edit,
                    "can_delete": can_delete
                }
            )
        updated_count += 1
    
    db.commit()
    return {"message": f"Updated {updated_count} permissions for role {data.role_id}", "status": "success"}


@router.post("/permissions/init-defaults")
async def init_default_permissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Re-initialize default permissions for all roles."""
    # Admin → full access
    db.execute(text("""
        INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
        SELECT r.id, m.id, true, true, true
        FROM webapp.roles r, webapp.menu_items m
        WHERE r.name = 'admin'
        ON CONFLICT (role_id, menu_item_id) 
        DO UPDATE SET can_view = true, can_edit = true, can_delete = true
    """))
    
    # Manager → all except admin
    db.execute(text("""
        INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
        SELECT r.id, m.id,
            CASE WHEN m.name LIKE 'admin_%' THEN false ELSE true END,
            CASE WHEN m.name LIKE 'admin_%' THEN false ELSE true END,
            false
        FROM webapp.roles r, webapp.menu_items m
        WHERE r.name = 'manager'
        ON CONFLICT (role_id, menu_item_id) 
        DO UPDATE SET 
            can_view = EXCLUDED.can_view,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete
    """))
    
    # Viewer → view only, no admin
    db.execute(text("""
        INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
        SELECT r.id, m.id,
            CASE WHEN m.name LIKE 'admin_%' THEN false ELSE true END,
            false,
            false
        FROM webapp.roles r, webapp.menu_items m
        WHERE r.name = 'viewer'
        ON CONFLICT (role_id, menu_item_id) 
        DO UPDATE SET 
            can_view = EXCLUDED.can_view,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete
    """))
    
    db.commit()
    
    count = db.execute(text("SELECT count(*) FROM webapp.role_menu_permissions")).scalar()
    return {"message": f"Default permissions initialized ({count} total)", "status": "success"}
