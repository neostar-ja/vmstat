import api from './api';

export interface MenuPermission {
    menu_item_id: number;
    menu_name: string;
    menu_display_name: string;
    menu_path: string;
    menu_type: string;
    menu_icon: string | null;
    parent_id: number | null;
    order: number;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

export interface MenuItem {
    id: number;
    name: string;
    display_name: string;
    path: string;
    icon: string | null;
    parent_id: number | null;
    menu_type: string;
    order: number;
    is_visible: boolean;
    description: string | null;
}

export interface PermissionMatrixItem {
    menu_item_id: number;
    menu_name: string;
    menu_display_name: string;
    menu_path: string;
    menu_type: string;
    menu_icon: string | null;
    parent_id: number | null;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

export interface RolePermissionMatrix {
    role_id: number;
    role_name: string;
    role_display_name: string;
    permissions: PermissionMatrixItem[];
}

export interface BulkPermissionUpdate {
    role_id: number;
    permissions: Array<{
        menu_item_id: number;
        can_view: boolean;
        can_edit: boolean;
        can_delete: boolean;
    }>;
}

export const permissionsApi = {
    // Menu Items
    getMenuItems: (menuType?: string) =>
        api.get<MenuItem[]>('/menu-permissions/menu-items', { params: menuType ? { menu_type: menuType } : undefined }).then(r => r.data),

    createMenuItem: (data: Partial<MenuItem>) =>
        api.post<MenuItem>('/menu-permissions/menu-items', data).then(r => r.data),

    updateMenuItem: (id: number, data: Partial<MenuItem>) =>
        api.put<MenuItem>(`/menu-permissions/menu-items/${id}`, data).then(r => r.data),

    deleteMenuItem: (id: number) =>
        api.delete(`/menu-permissions/menu-items/${id}`),

    initDefaults: () =>
        api.post('/menu-permissions/menu-items/init-defaults').then(r => r.data),

    // Permissions
    getMatrix: () =>
        api.get<RolePermissionMatrix[]>('/menu-permissions/permissions/matrix').then(r => r.data),

    getMyPermissions: () =>
        api.get<MenuPermission[]>('/menu-permissions/permissions/my').then(r => r.data),

    bulkUpdate: (data: BulkPermissionUpdate) =>
        api.post('/menu-permissions/permissions/bulk-update', data).then(r => r.data),

    initDefaultPermissions: () =>
        api.post('/menu-permissions/permissions/init-defaults').then(r => r.data),
};

export default permissionsApi;
