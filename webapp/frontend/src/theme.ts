import { createTheme, alpha } from '@mui/material/styles';

// Medical Blue & Green Healthcare Color Palette + Premium Vibrant Colors
const skyBlue = {
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
};

const emerald = {
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
};

const violet = {
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
};

// Premium Vibrant Colors
const amber = {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
};

const rose = {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
};

const slate = {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
};

const commonSettings = {
    typography: {
        fontFamily: '"IBM Plex Sans", "IBM Plex Sans Thai", system-ui, -apple-system, sans-serif',
        h1: {
            fontWeight: 800,
            fontSize: '2.75rem',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontWeight: 700,
            fontSize: '2.25rem',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontWeight: 700,
            fontSize: '1.75rem',
            lineHeight: 1.3,
        },
        h4: {
            fontWeight: 600,
            fontSize: '1.375rem',
            lineHeight: 1.35,
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.125rem',
            lineHeight: 1.4,
        },
        h6: {
            fontWeight: 600,
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        subtitle1: {
            fontWeight: 500,
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        subtitle2: {
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
        },
        button: {
            textTransform: 'none' as const,
            fontWeight: 600,
            letterSpacing: 0.3,
        },
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.5,
        },
        overline: {
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase' as const,
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0 1px 2px rgba(0, 0, 0, 0.05)',
        '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ] as any,
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarWidth: 'thin',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 24px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease-in-out',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                        transform: 'translateY(-1px)',
                    },
                },
                outlined: {
                    borderWidth: 2,
                    '&:hover': {
                        borderWidth: 2,
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    transition: 'all 0.2s ease-in-out',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundImage: 'none',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        },
                        '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.15)',
                        },
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600,
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    padding: '8px 12px',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: 0.5,
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 20,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRadius: 0,
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 12,
                    marginTop: 8,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '2px 8px',
                    padding: '10px 12px',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    transition: 'all 0.2s ease',
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    height: 8,
                },
                bar: {
                    borderRadius: 10,
                },
            },
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    fontWeight: 700,
                },
            },
        },
        MuiBadge: {
            styleOverrides: {
                badge: {
                    fontWeight: 700,
                },
            },
        },
    },
};

// Light Theme - Premium Vibrant Look
export const lightTheme = createTheme({
    ...commonSettings,
    palette: {
        mode: 'light',
        primary: {
            main: skyBlue[600], // More vibrant blue
            light: skyBlue[400],
            dark: skyBlue[800],
            contrastText: '#ffffff',
        },
        secondary: {
            main: violet[600], // Changed to violet for more vibrancy
            light: violet[400],
            dark: violet[800],
            contrastText: '#ffffff',
        },
        info: {
            main: skyBlue[500],
            light: skyBlue[300],
            dark: skyBlue[700],
        },
        background: {
            default: '#f8fafc', // Clean base
            paper: '#ffffff',
        },
        text: {
            primary: slate[900],
            secondary: slate[600],
        },
        success: {
            main: emerald[500], // Vibrant green
            light: emerald[300],
            dark: emerald[700],
        },
        warning: {
            main: amber[500], // Vibrant amber
            light: amber[300],
            dark: amber[700],
        },
        error: {
            main: rose[500], // Vibrant rose instead of plain red
            light: rose[300],
            dark: rose[700],
        },
        divider: alpha(slate[900], 0.08),
        action: {
            hover: alpha(skyBlue[500], 0.08),
            selected: alpha(skyBlue[500], 0.1),
        },
    },
    components: {
        ...commonSettings.components,
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
                    border: `1px solid ${alpha(slate[900], 0.06)}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                },
            },
        },
    },
});

// Dark Theme - Modern Healthcare Dashboard
export const darkTheme = createTheme({
    ...commonSettings,
    palette: {
        mode: 'dark',
        primary: {
            main: skyBlue[400],
            light: skyBlue[300],
            dark: skyBlue[600],
            contrastText: '#ffffff',
        },
        secondary: {
            main: violet[400], // Changed to vibrant violet
            light: violet[300],
            dark: violet[600],
            contrastText: '#ffffff',
        },
        info: {
            main: skyBlue[400],
            light: skyBlue[300],
            dark: skyBlue[600],
        },
        background: {
            default: '#0a0f1a', // Deep dark base
            paper: '#111827',
        },
        text: {
            primary: '#f8fafc',
            secondary: slate[300], // Brighter secondary text
        },
        success: {
            main: emerald[400], // Vibrant emerald
            light: emerald[300],
            dark: emerald[600],
        },
        warning: {
            main: amber[400], // Vibrant amber
            light: amber[300],
            dark: amber[600],
        },
        error: {
            main: rose[400], // Vibrant rose
            light: rose[300],
            dark: rose[600],
        },
        divider: alpha('#ffffff', 0.08),
        action: {
            hover: alpha('#ffffff', 0.08),
            selected: alpha(skyBlue[400], 0.15),
        },
    },
    components: {
        ...commonSettings.components,
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                    border: `1px solid ${alpha('#ffffff', 0.06)}`,
                    backgroundImage: `linear-gradient(135deg, ${alpha(skyBlue[500], 0.03)} 0%, ${alpha(emerald[500], 0.03)} 100%)`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
                        borderColor: alpha(skyBlue[400], 0.2),
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundImage: 'none',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 24px',
                    fontWeight: 600,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4)',
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    backgroundImage: 'none',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        '&:hover': {
                            boxShadow: `0 0 0 1px ${alpha(skyBlue[400], 0.3)}`,
                        },
                        '&.Mui-focused': {
                            boxShadow: `0 0 0 3px ${alpha(skyBlue[400], 0.2)}`,
                        },
                    },
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 12,
                    border: `1px solid ${alpha('#ffffff', 0.1)}`,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                    backgroundImage: `linear-gradient(180deg, ${alpha('#1e293b', 0.95)} 0%, ${alpha('#0f172a', 0.95)} 100%)`,
                    backdropFilter: 'blur(10px)',
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: slate[800],
                    border: `1px solid ${alpha('#ffffff', 0.1)}`,
                },
            },
        },
    },
});
