"""
Pydantic schemas for Menu Permissions system
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ====================
# Menu Item Schemas
# ====================

class MenuItemCreate(BaseModel):
    name: str
    display_name: str
    path: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    menu_type: str = "menu"
    order: int = 0
    is_visible: bool = True
    description: Optional[str] = None


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    menu_type: Optional[str] = None
    order: Optional[int] = None
    is_visible: Optional[bool] = None
    description: Optional[str] = None


class MenuItemResponse(BaseModel):
    id: int
    name: str
    display_name: str
    path: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    menu_type: str = "menu"
    order: int = 0
    is_visible: bool = True
    description: Optional[str] = None

    class Config:
        from_attributes = True


# ====================
# Permission Schemas
# ====================

class PermissionMatrixItem(BaseModel):
    menu_item_id: int
    menu_name: str
    menu_display_name: str
    menu_path: str
    menu_type: str = "menu"
    menu_icon: Optional[str] = None
    parent_id: Optional[int] = None
    can_view: bool = False
    can_edit: bool = False
    can_delete: bool = False


class RolePermissionMatrix(BaseModel):
    role_id: int
    role_name: str
    role_display_name: str
    permissions: List[PermissionMatrixItem]


class BulkPermissionUpdate(BaseModel):
    role_id: int
    permissions: List[Dict[str, Any]]  # [{menu_item_id, can_view, can_edit, can_delete}]


class RoleMenuPermissionCreate(BaseModel):
    role_id: int
    menu_item_id: int
    can_view: bool = True
    can_edit: bool = False
    can_delete: bool = False


class RoleMenuPermissionResponse(BaseModel):
    id: int
    role_id: int
    menu_item_id: int
    can_view: bool
    can_edit: bool
    can_delete: bool

    class Config:
        from_attributes = True


class UserMenuPermission(BaseModel):
    """What the current user is allowed to access"""
    menu_item_id: int
    menu_name: str
    menu_display_name: str
    menu_path: str
    menu_type: str
    menu_icon: Optional[str] = None
    parent_id: Optional[int] = None
    order: int = 0
    can_view: bool
    can_edit: bool
    can_delete: bool
