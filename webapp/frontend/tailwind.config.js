/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    important: '#root',
    corePlugins: {
        preflight: false,
    },
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"IBM Plex Sans"', '"IBM Plex Sans Thai"', 'sans-serif'],
            },
            colors: {
                // Sky Blue palette (Primary)
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                // Emerald palette (Secondary)
                secondary: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    950: '#052e16',
                },
                // Violet palette (Accent)
                accent: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                    950: '#2e1065',
                },
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                'gradient-secondary': 'linear-gradient(135deg, #8b5cf6 0%, #0ea5e9 100%)',
                'gradient-dark': 'linear-gradient(135deg, #0c4a6e 0%, #14532d 100%)',
                'gradient-card': 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(34, 197, 94, 0.05) 100%)',
                'gradient-card-dark': 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
            },
            boxShadow: {
                'glow-blue': '0 0 20px rgba(14, 165, 233, 0.3)',
                'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
                'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
                'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
                'card-hover': '0 10px 40px rgba(14, 165, 233, 0.15)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(14, 165, 233, 0.4)' },
                    '50%': { boxShadow: '0 0 25px rgba(14, 165, 233, 0.7)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
        },
    },
    plugins: [],
}
