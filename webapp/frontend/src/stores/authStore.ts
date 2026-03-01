import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface User {
    id: number;
    username: string;
    email: string;
    full_name: string | null;
    role: string;
    role_display_name?: string;
    role_level?: number;
    permissions?: string[];
    menu_permissions?: MenuPermission[];
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    setUser: (user: User) => void;
    setMenuPermissions: (perms: MenuPermission[]) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            login: (token, user) =>
                set({
                    token,
                    user,
                    isAuthenticated: true,
                }),
            logout: () =>
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                }),
            setUser: (user) => set({ user }),
            setMenuPermissions: (perms) =>
                set((state) => ({
                    user: state.user ? { ...state.user, menu_permissions: perms } : null,
                })),
        }),
        {
            name: 'vmstat-auth',
        }
    )
);
