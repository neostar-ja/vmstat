import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { MenuPermission } from '../services/permissionsApi';

interface PermissionContextType {
    permissions: MenuPermission[];
    loading: boolean;
    canViewMenu: (path: string) => boolean;
    canEditMenu: (path: string) => boolean;
    canDeleteMenu: (path: string) => boolean;
    hasPermission: (menuName: string) => boolean;
    getVisibleMenus: () => MenuPermission[];
    getVisibleAdminMenus: () => MenuPermission[];
    refreshPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType>({
    permissions: [],
    loading: false,
    canViewMenu: () => false,
    canEditMenu: () => false,
    canDeleteMenu: () => false,
    hasPermission: () => false,
    getVisibleMenus: () => [],
    getVisibleAdminMenus: () => [],
    refreshPermissions: () => { },
});

export function usePermissions() {
    return useContext(PermissionContext);
}

interface PermissionProviderProps {
    children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
    const { user, isAuthenticated } = useAuthStore();
    const [permissions, setPermissions] = useState<MenuPermission[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshPermissions = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { permissionsApi } = await import('../services/permissionsApi');
            const perms = await permissionsApi.getMyPermissions();
            setPermissions(perms);

            // Update authStore so the cache is fresh across reloads
            useAuthStore.getState().setMenuPermissions(perms);
        } catch (err) {
            console.error('Failed to refresh permissions:', err);
        }
    }, [isAuthenticated]);

    // Load permissions from user data (included in login/me response)
    useEffect(() => {
        if (isAuthenticated && user) {
            setLoading(true);
            // Permissions are included in the user object from login/me
            const menuPerms = (user as any).menu_permissions;
            if (menuPerms && Array.isArray(menuPerms)) {
                setPermissions(menuPerms);
            }

            // Always fetch latest permissions on mount
            refreshPermissions().finally(() => setLoading(false));
        } else {
            setPermissions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // Build lookup map for fast access
    const permissionMap = useMemo(() => {
        const map: Record<string, MenuPermission> = {};
        permissions.forEach(p => {
            map[p.menu_path] = p;
            map[p.menu_name] = p;
        });
        return map;
    }, [permissions]);

    const isAdmin = user?.role === 'admin';

    const matchPath = useCallback((registeredPath: string, currentPath: string): boolean => {
        // Exact match
        if (registeredPath === currentPath) return true;
        // Pattern match (e.g., /vms/:id matches /vms/abc-123)
        const regexStr = registeredPath.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${regexStr}$`);
        return regex.test(currentPath);
    }, []);

    const canViewMenu = useCallback((path: string): boolean => {
        if (isAdmin) return true;
        // Check exact match first
        const exact = permissionMap[path];
        if (exact) return exact.can_view;
        // Check pattern matches
        for (const perm of permissions) {
            if (matchPath(perm.menu_path, path) && perm.can_view) return true;
        }
        return false;
    }, [isAdmin, permissionMap, permissions, matchPath]);

    const canEditMenu = useCallback((path: string): boolean => {
        if (isAdmin) return true;
        const exact = permissionMap[path];
        if (exact) return exact.can_edit;
        for (const perm of permissions) {
            if (matchPath(perm.menu_path, path) && perm.can_edit) return true;
        }
        return false;
    }, [isAdmin, permissionMap, permissions, matchPath]);

    const canDeleteMenu = useCallback((path: string): boolean => {
        if (isAdmin) return true;
        const exact = permissionMap[path];
        if (exact) return exact.can_delete;
        for (const perm of permissions) {
            if (matchPath(perm.menu_path, path) && perm.can_delete) return true;
        }
        return false;
    }, [isAdmin, permissionMap, permissions, matchPath]);

    const hasPermission = useCallback((menuName: string): boolean => {
        if (isAdmin) return true;
        const perm = permissionMap[menuName];
        return perm?.can_view ?? false;
    }, [isAdmin, permissionMap]);

    const getVisibleMenus = useCallback((): MenuPermission[] => {
        if (isAdmin) return permissions.filter(p => p.menu_type === 'menu' && !p.menu_name.startsWith('admin_'));
        return permissions.filter(p => p.can_view && p.menu_type === 'menu' && !p.menu_name.startsWith('admin_'));
    }, [isAdmin, permissions]);

    const getVisibleAdminMenus = useCallback((): MenuPermission[] => {
        if (isAdmin) return permissions.filter(p => p.menu_type === 'menu' && p.menu_name.startsWith('admin_'));
        return permissions.filter(p => p.can_view && p.menu_type === 'menu' && p.menu_name.startsWith('admin_'));
    }, [isAdmin, permissions]);

    const value = useMemo(() => ({
        permissions,
        loading,
        canViewMenu,
        canEditMenu,
        canDeleteMenu,
        hasPermission,
        getVisibleMenus,
        getVisibleAdminMenus,
        refreshPermissions,
    }), [permissions, loading, canViewMenu, canEditMenu, canDeleteMenu, hasPermission, getVisibleMenus, getVisibleAdminMenus, refreshPermissions]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

export default PermissionContext;
