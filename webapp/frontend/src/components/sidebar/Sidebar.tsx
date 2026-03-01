import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Divider,
    Tooltip,
    alpha,
    Collapse,
    Fade,
    Slide,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Computer as VmIcon,
    Group as GroupIcon,
    Storage as StorageIcon,
    AdminPanelSettings as AdminIcon,
    Warning as WarningIcon,
    Settings as SettingsIcon,
    Sync as SyncIcon,
    ExpandLess,
    ExpandMore,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Dns as HostIcon,
    Speed as SpeedIcon,
    Security as SecurityIcon,
    Person as PersonIcon,
    Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useThemeStore } from '../../stores/themeStore';
import { usePermissions } from '../../contexts/PermissionContext';

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

// Icon map for dynamic rendering
const iconMap: Record<string, React.ReactElement> = {
    Dashboard: <DashboardIcon />,
    Computer: <VmIcon />,
    Group: <GroupIcon />,
    Storage: <StorageIcon />,
    AdminPanelSettings: <AdminIcon />,
    Warning: <WarningIcon />,
    Settings: <SettingsIcon />,
    Sync: <SyncIcon />,
    Dns: <HostIcon />,
    Speed: <SpeedIcon />,
    Security: <SecurityIcon />,
    Person: <PersonIcon />,
    Assessment: <AssessmentIcon />,
};

// Color map for menu items
const colorMap: Record<string, { color: string; gradientFrom: string; gradientTo: string }> = {
    dashboard: { color: '#0ea5e9', gradientFrom: '#0ea5e9', gradientTo: '#0284c7' },
    vms: { color: '#22c55e', gradientFrom: '#22c55e', gradientTo: '#059669' },
    groups: { color: '#8b5cf6', gradientFrom: '#8b5cf6', gradientTo: '#7c3aed' },
    hosts: { color: '#f59e0b', gradientFrom: '#f59e0b', gradientTo: '#d97706' },
    datastores: { color: '#ef4444', gradientFrom: '#ef4444', gradientTo: '#dc2626' },
    alarms: { color: '#f97316', gradientFrom: '#f97316', gradientTo: '#ea580c' },
    admin_users: { color: '#a855f7', gradientFrom: '#a855f7', gradientTo: '#9333ea' },
    admin_settings: { color: '#6366f1', gradientFrom: '#6366f1', gradientTo: '#4f46e5' },
    admin_sync: { color: '#ec4899', gradientFrom: '#ec4899', gradientTo: '#db2777' },
    profile: { color: '#14b8a6', gradientFrom: '#14b8a6', gradientTo: '#0d9488' },
    reports: { color: '#06b6d4', gradientFrom: '#06b6d4', gradientTo: '#0891b2' },
};

const defaultColors = { color: '#64748b', gradientFrom: '#64748b', gradientTo: '#475569' };

interface SidebarProps {
    isMobile: boolean;
    mobileOpen: boolean;
    collapsed: boolean;
    onMobileToggle: () => void;
    onCollapseToggle: () => void;
}

export default function Sidebar({
    isMobile,
    mobileOpen,
    collapsed,
    onMobileToggle,
    onCollapseToggle
}: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const { mode } = useThemeStore();
    const { getVisibleMenus, getVisibleAdminMenus } = usePermissions();

    const [adminOpen, setAdminOpen] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;

    // Get menu items from permission context
    const mainMenus = getVisibleMenus();
    const adminMenus = getVisibleAdminMenus();
    const hasAdminMenus = adminMenus.length > 0;

    const drawer = (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: mode === 'dark'
                    ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.95) 60%, rgba(51, 65, 85, 0.92) 100%)'
                    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 60%, rgba(241, 245, 249, 0.92) 100%)',
                backdropFilter: 'blur(12px) saturate(120%)',
                borderRight: `1px solid ${mode === 'dark' ? alpha('#ffffff', 0.06) : alpha('#000000', 0.04)}`,
                position: 'relative',
            }}
        >
            {/* Logo Header */}
            <Slide direction="right" in={mounted} timeout={800}>
                <Box
                    sx={{
                        p: collapsed ? 1.5 : { xs: 2, md: 2.5 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 2,
                        borderBottom: `1px solid ${mode === 'dark' ? alpha('#ffffff', 0.06) : alpha('#000000', 0.04)}`,
                        minHeight: { xs: 64, md: 72 },
                        position: 'relative',
                        background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 27, 75, 0.4) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 250, 252, 0.4) 100%)',
                    }}
                >
                    <Box sx={{ position: 'relative' }}>
                        <Box
                            component="img"
                            src="/vmstat/wuh_logo.png"
                            alt="WUH Logo"
                            sx={{
                                width: collapsed ? 40 : 48,
                                height: collapsed ? 40 : 48,
                                objectFit: 'contain',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                borderRadius: '12px',
                                border: `1px solid ${mode === 'dark' ? alpha('#ffffff', 0.08) : alpha('#000000', 0.06)}`,
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                },
                            }}
                        />
                    </Box>
                    {!collapsed && (
                        <Fade in={!collapsed} timeout={600}>
                            <Box sx={{ overflow: 'hidden', zIndex: 1, position: 'relative' }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 800,
                                        lineHeight: 1.2,
                                        color: mode === 'dark' ? '#f8fafc' : '#1e293b',
                                        letterSpacing: '0.025em',
                                    }}
                                >
                                    VM Stat
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: mode === 'dark' ? 'rgba(148, 163, 184, 0.8)' : 'rgba(71, 85, 105, 0.8)',
                                        fontWeight: 500,
                                        letterSpacing: 0.5,
                                    }}
                                    noWrap
                                >
                                    WU Hospital
                                </Typography>
                            </Box>
                        </Fade>
                    )}
                </Box>
            </Slide>

            {/* Navigation */}
            <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
                <List sx={{ px: collapsed ? 1 : 2 }}>
                    {mainMenus.map((item, index) => {
                        const isActive = location.pathname === item.menu_path;
                        const colors = colorMap[item.menu_name] || defaultColors;
                        const icon = iconMap[item.menu_icon || ''] || <DashboardIcon />;
                        return (
                            <Slide
                                key={item.menu_name}
                                direction="right"
                                in={mounted}
                                timeout={800 + (index * 100)}
                            >
                                <Box>
                                    <Tooltip
                                        title={collapsed ? item.menu_display_name : ''}
                                        placement="right"
                                        arrow
                                        componentsProps={{
                                            tooltip: {
                                                sx: {
                                                    bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(51, 65, 85, 0.95)',
                                                    color: '#f8fafc',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    backdropFilter: 'blur(12px)',
                                                    border: `1px solid ${alpha(colors.color, 0.3)}`,
                                                    boxShadow: `0 8px 24px ${alpha(colors.color, 0.4)}`,
                                                }
                                            }
                                        }}
                                    >
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton
                                                onClick={() => {
                                                    navigate(item.menu_path);
                                                    if (isMobile) onMobileToggle();
                                                }}
                                                sx={{
                                                    borderRadius: '16px',
                                                    minHeight: 48,
                                                    px: collapsed ? 1.5 : 2,
                                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: isActive
                                                        ? mode === 'dark'
                                                            ? `linear-gradient(135deg, ${alpha(colors.color, 0.15)} 0%, ${alpha(colors.gradientTo, 0.1)} 100%)`
                                                            : `linear-gradient(135deg, ${alpha(colors.color, 0.1)} 0%, ${alpha(colors.gradientTo, 0.08)} 100%)`
                                                        : 'transparent',
                                                    border: isActive
                                                        ? `1px solid ${alpha(colors.color, 0.3)}`
                                                        : '1px solid transparent',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&:hover': {
                                                        background: isActive
                                                            ? mode === 'dark'
                                                                ? `linear-gradient(135deg, ${alpha(colors.color, 0.25)} 0%, ${alpha(colors.gradientTo, 0.15)} 100%)`
                                                                : `linear-gradient(135deg, ${alpha(colors.color, 0.15)} 0%, ${alpha(colors.gradientTo, 0.12)} 100%)`
                                                            : mode === 'dark'
                                                                ? alpha('#ffffff', 0.05)
                                                                : alpha(colors.color, 0.05),
                                                        boxShadow: `0 8px 32px ${alpha(colors.color, 0.3)}, 0 0 48px ${alpha(colors.color, 0.2)}`,
                                                        transform: 'translateY(-2px) scale(1.02)',
                                                        borderColor: alpha(colors.color, 0.4),
                                                    },
                                                    '&:active': {
                                                        transform: 'scale(0.98)',
                                                    },
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: '-100%',
                                                        width: '100%',
                                                        height: '100%',
                                                        background: `linear-gradient(90deg, transparent, ${alpha(colors.color, 0.2)}, transparent)`,
                                                        transition: 'left 0.6s ease',
                                                        borderRadius: '16px',
                                                    },
                                                    '&:hover::before': {
                                                        left: '100%',
                                                    },
                                                }}
                                            >
                                                <ListItemIcon
                                                    sx={{
                                                        minWidth: collapsed ? 0 : 40,
                                                        justifyContent: 'center',
                                                        color: isActive
                                                            ? colors.color
                                                            : mode === 'dark' ? 'rgba(148, 163, 184, 0.7)' : 'rgba(71, 85, 105, 0.7)',
                                                        transition: 'all 0.3s ease',
                                                        filter: isActive
                                                            ? `drop-shadow(0 0 12px ${alpha(colors.color, 0.8)})`
                                                            : 'none',
                                                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                                    }}
                                                >
                                                    {icon}
                                                </ListItemIcon>
                                                {!collapsed && (
                                                    <ListItemText
                                                        primary={item.menu_display_name}
                                                        primaryTypographyProps={{
                                                            fontWeight: isActive ? 700 : 600,
                                                            fontSize: '0.95rem',
                                                            color: isActive
                                                                ? mode === 'dark' ? '#f8fafc' : '#0f172a'
                                                                : mode === 'dark' ? 'rgba(241, 245, 249, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                                                            letterSpacing: '0.025em',
                                                            lineHeight: 1.2,
                                                        }}
                                                    />
                                                )}
                                            </ListItemButton>
                                        </ListItem>
                                    </Tooltip>
                                </Box>
                            </Slide>
                        );
                    })}

                    {hasAdminMenus && (
                        <>
                            <Fade in={mounted} timeout={1200}>
                                <Box>
                                    <Divider
                                        sx={{
                                            my: 2,
                                            mx: collapsed ? 0 : 1,
                                            borderColor: mode === 'dark' ? alpha('#ffffff', 0.06) : alpha('#000000', 0.04),
                                        }}
                                    />
                                    {!collapsed && (
                                        <ListItemButton
                                            onClick={() => setAdminOpen(!adminOpen)}
                                            sx={{
                                                borderRadius: '12px',
                                                mb: 0.5,
                                                py: 0.75,
                                                background: mode === 'dark'
                                                    ? alpha('#a855f7', 0.08)
                                                    : alpha('#8b5cf6', 0.05),
                                                border: `1px solid ${mode === 'dark' ? alpha('#a855f7', 0.2) : alpha('#8b5cf6', 0.15)}`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    background: mode === 'dark'
                                                        ? alpha('#a855f7', 0.15)
                                                        : alpha('#8b5cf6', 0.1),
                                                    borderColor: mode === 'dark' ? alpha('#a855f7', 0.4) : alpha('#8b5cf6', 0.3),
                                                    boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)',
                                                },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 40 }}>
                                                <SecurityIcon
                                                    sx={{
                                                        fontSize: 18,
                                                        color: '#a855f7',
                                                        filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))',
                                                    }}
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Administration"
                                                primaryTypographyProps={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: mode === 'dark' ? '#c4b5fd' : '#7c3aed',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 1,
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    color: '#a855f7',
                                                    transition: 'all 0.3s ease',
                                                    transform: adminOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                }}
                                            >
                                                {adminOpen ? <ExpandLess /> : <ExpandMore />}
                                            </Box>
                                        </ListItemButton>
                                    )}
                                </Box>
                            </Fade>

                            <Collapse in={collapsed || adminOpen} timeout="auto" unmountOnExit>
                                {adminMenus.map((item, index) => {
                                    const isActive = location.pathname === item.menu_path;
                                    const colors = colorMap[item.menu_name] || defaultColors;
                                    const icon = iconMap[item.menu_icon || ''] || <SettingsIcon />;
                                    return (
                                        <Slide
                                            key={item.menu_name}
                                            direction="right"
                                            in={collapsed || adminOpen}
                                            timeout={600 + (index * 150)}
                                        >
                                            <Box>
                                                <Tooltip
                                                    title={collapsed ? item.menu_display_name : ''}
                                                    placement="right"
                                                    arrow
                                                    componentsProps={{
                                                        tooltip: {
                                                            sx: {
                                                                bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(51, 65, 85, 0.95)',
                                                                color: '#f8fafc',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                backdropFilter: 'blur(12px)',
                                                                border: `1px solid ${alpha(colors.color, 0.3)}`,
                                                                boxShadow: `0 8px 24px ${alpha(colors.color, 0.4)}`,
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                                                        <ListItemButton
                                                            onClick={() => {
                                                                navigate(item.menu_path);
                                                                if (isMobile) onMobileToggle();
                                                            }}
                                                            sx={{
                                                                borderRadius: '14px',
                                                                minHeight: 44,
                                                                px: collapsed ? 1.5 : 2,
                                                                pl: collapsed ? 1.5 : 4,
                                                                justifyContent: collapsed ? 'center' : 'flex-start',
                                                                position: 'relative',
                                                                overflow: 'hidden',
                                                                background: isActive
                                                                    ? `linear-gradient(135deg, ${alpha(colors.color, 0.15)} 0%, ${alpha(colors.gradientTo, 0.1)} 100%)`
                                                                    : 'transparent',
                                                                border: isActive
                                                                    ? `1px solid ${alpha(colors.color, 0.3)}`
                                                                    : '1px solid transparent',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                '&:hover': {
                                                                    background: isActive
                                                                        ? `linear-gradient(135deg, ${alpha(colors.color, 0.25)} 0%, ${alpha(colors.gradientTo, 0.15)} 100%)`
                                                                        : alpha(colors.color, 0.08),
                                                                    boxShadow: `0 6px 24px ${alpha(colors.color, 0.4)}`,
                                                                    transform: 'translateY(-1px) scale(1.01)',
                                                                    borderColor: alpha(colors.color, 0.4),
                                                                },
                                                                '&::before': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: '-100%',
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    background: `linear-gradient(90deg, transparent, ${alpha(colors.color, 0.15)}, transparent)`,
                                                                    transition: 'left 0.5s ease',
                                                                    borderRadius: '14px',
                                                                },
                                                                '&:hover::before': {
                                                                    left: '100%',
                                                                },
                                                            }}
                                                        >
                                                            <ListItemIcon
                                                                sx={{
                                                                    minWidth: collapsed ? 0 : 36,
                                                                    color: isActive
                                                                        ? colors.color
                                                                        : mode === 'dark' ? 'rgba(168, 85, 247, 0.7)' : 'rgba(139, 92, 246, 0.7)',
                                                                    transition: 'all 0.3s ease',
                                                                    filter: isActive
                                                                        ? `drop-shadow(0 0 10px ${alpha(colors.color, 0.8)})`
                                                                        : 'none',
                                                                }}
                                                            >
                                                                {icon}
                                                            </ListItemIcon>
                                                            {!collapsed && (
                                                                <ListItemText
                                                                    primary={item.menu_display_name}
                                                                    primaryTypographyProps={{
                                                                        fontWeight: isActive ? 700 : 600,
                                                                        fontSize: '0.9rem',
                                                                        color: isActive
                                                                            ? mode === 'dark' ? '#f8fafc' : '#0f172a'
                                                                            : mode === 'dark' ? 'rgba(199, 210, 254, 0.9)' : 'rgba(88, 80, 236, 0.9)',
                                                                        letterSpacing: '0.025em',
                                                                        lineHeight: 1.2,
                                                                    }}
                                                                />
                                                            )}
                                                        </ListItemButton>
                                                    </ListItem>
                                                </Tooltip>
                                            </Box>
                                        </Slide>
                                    );
                                })}
                            </Collapse>
                        </>
                    )}
                </List>
            </Box>

            {/* Collapse Button (Desktop only) */}
            {!isMobile && (
                <Fade in={mounted} timeout={1500}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderTop: `1px solid ${mode === 'dark' ? alpha('#ffffff', 0.08) : alpha('#000000', 0.06)}`,
                            display: 'flex',
                            justifyContent: 'center',
                            background: mode === 'dark'
                                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.6) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.6) 100%)',
                        }}
                    >
                        <IconButton
                            onClick={onCollapseToggle}
                            size="small"
                            sx={{
                                bgcolor: mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.04)',
                                width: 36,
                                height: 36,
                                borderRadius: '12px',
                                border: `1px solid ${mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.08)'
                                    }`,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    bgcolor: mode === 'dark'
                                        ? 'rgba(96, 165, 250, 0.15)'
                                        : 'rgba(14, 165, 233, 0.08)',
                                    boxShadow: '0 8px 32px rgba(96, 165, 250, 0.4), 0 0 48px rgba(96, 165, 250, 0.3)',
                                    transform: 'scale(1.1)',
                                    borderColor: 'rgba(96, 165, 250, 0.3)',
                                },
                                '&:active': {
                                    transform: 'scale(0.95)',
                                },
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.2), transparent)',
                                    transition: 'left 0.5s ease',
                                    borderRadius: '12px',
                                },
                                '&:hover::before': {
                                    left: '100%',
                                },
                            }}
                        >
                            {collapsed ? (
                                <ChevronRightIcon
                                    sx={{
                                        fontSize: 18,
                                        color: mode === 'dark' ? '#60a5fa' : '#0ea5e9',
                                        filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.6))',
                                    }}
                                />
                            ) : (
                                <ChevronLeftIcon
                                    sx={{
                                        fontSize: 18,
                                        color: mode === 'dark' ? '#60a5fa' : '#0ea5e9',
                                        filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.6))',
                                    }}
                                />
                            )}
                        </IconButton>
                    </Box>
                </Fade>
            )}

            {/* Status Info */}
            {!collapsed && (
                <Fade in={!collapsed && mounted} timeout={1200}>
                    <Box
                        sx={{
                            p: 2,
                            borderTop: `1px solid ${mode === 'dark' ? alpha('#ffffff', 0.08) : alpha('#000000', 0.06)}`,
                            background: mode === 'dark'
                                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.6) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.6) 100%)',
                        }}
                    >
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: '16px',
                                background: mode === 'dark'
                                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)'
                                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.03) 100%)',
                                border: `1px solid ${mode === 'dark' ? alpha('#22c55e', 0.2) : alpha('#22c55e', 0.15)}`,
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%)',
                                    animation: 'statusPulse 3s ease-in-out infinite',
                                    '@keyframes statusPulse': {
                                        '0%, 100%': { opacity: 0.4 },
                                        '50%': { opacity: 1 },
                                    },
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <SpeedIcon
                                        sx={{
                                            fontSize: 18,
                                            color: '#22c55e',
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -2,
                                            right: -2,
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: '#22c55e',
                                        }}
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#22c55e',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    ระบบทำงานปกติ
                                </Typography>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: mode === 'dark' ? 'rgba(148, 163, 184, 0.8)' : 'rgba(71, 85, 105, 0.8)',
                                    fontWeight: 500,
                                    letterSpacing: 0.3,
                                }}
                            >
                                VM Stat v1.0.0
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{
                width: { md: currentDrawerWidth },
                flexShrink: { md: 0 },
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={onMobileToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block' },
                    '& .MuiDrawer-paper': {
                        width: isMobile ? drawerWidth : currentDrawerWidth,
                        boxSizing: 'border-box',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRight: 'none',
                        boxShadow: mode === 'dark'
                            ? '8px 0 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                            : '8px 0 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                    },
                }}
            >
                {drawer}
            </Drawer>
        </Box>
    );
}