import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
    mode: ThemeMode;
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'dark',
            toggleTheme: () =>
                set((state) => {
                    const newMode = state.mode === 'light' ? 'dark' : 'light';
                    document.documentElement.classList.toggle('dark', newMode === 'dark');
                    return { mode: newMode };
                }),
            setTheme: (mode) => {
                document.documentElement.classList.toggle('dark', mode === 'dark');
                set({ mode });
            },
        }),
        {
            name: 'vmstat-theme',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    document.documentElement.classList.toggle('dark', state.mode === 'dark');
                }
            },
        }
    )
);
