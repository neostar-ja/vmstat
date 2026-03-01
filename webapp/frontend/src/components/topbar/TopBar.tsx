import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Tooltip,
    Breadcrumbs,
    Link,
    useTheme,
    useMediaQuery,
    alpha,
    Fade,
    Slide,
} from '@mui/material';
import {
    Menu as MenuIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Home as HomeIcon,
    NavigateNext as NavigateNextIcon,
    AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import NotificationsMenu from './NotificationsMenu';
import UserProfileMenu from './UserProfileMenu';

// Page title definitions with path patterns
const routeConfig = [
    { path: '/', title: 'Dashboard', subtitle: 'ภาพรวมระบบ Virtual Machine' },
    { path: '/vms', title: 'Virtual Machines', subtitle: 'รายการ Virtual Machine ทั้งหมด' },
    { path: '/vms/:vmUuid', title: 'VM Detail', subtitle: 'รายละเอียด Virtual Machine' },
    { path: '/groups', title: 'Groups', subtitle: 'จัดการกลุ่ม VM' },
    { path: '/hosts', title: 'Hosts', subtitle: 'รายการ Host Server' },
    { path: '/datastores', title: 'DataStores', subtitle: 'พื้นที่จัดเก็บข้อมูล' },
    { path: '/datastores/:dsId', title: 'DataStore Detail', subtitle: 'รายละเอียด DataStore' },
    { path: '/alarms', title: 'Alarms', subtitle: 'รายการแจ้งเตือน' },
    { path: '/profile', title: 'Profile', subtitle: 'ข้อมูลผู้ใช้งาน' },
    { path: '/admin/users', title: 'User Management', subtitle: 'จัดการผู้ใช้งานระบบ' },
    { path: '/admin/settings', title: 'System Settings', subtitle: 'ตั้งค่าระบบ' },
    { path: '/admin/sync', title: 'Sync Settings', subtitle: 'ตั้งค่าการซิงค์ข้อมูล' },
];

interface TopBarProps {
    onMobileMenuToggle: () => void;
}

export default function TopBar({ onMobileMenuToggle }: TopBarProps) {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const { mode, toggleTheme } = useThemeStore();

    // Responsive breakpoints
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const currentRoute = routeConfig.find(route =>
        matchPath({ path: route.path, end: true }, location.pathname)
    );
    const currentPage = currentRoute || { title: 'Page', subtitle: '' };

    return (
        <Slide direction="down" in={true} timeout={800}>
            <AppBar
                position="sticky"
                elevation={0}
                className="backdrop-blur-lg border-b transition-all duration-300"
                sx={{
                    background: mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(51, 65, 85, 0.95) 30%, rgba(71, 85, 105, 0.92) 60%, rgba(30, 27, 75, 0.90) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 30%, rgba(241, 245, 249, 0.92) 60%, rgba(226, 232, 240, 0.90) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    borderBottom: `1px solid ${mode === 'dark'
                        ? alpha('#ffffff', 0.08)
                        : alpha('#000000', 0.06)
                        }`,
                    boxShadow: mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.2)'
                        : '0 8px 32px rgba(0, 0, 0, 0.04)',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: mode === 'dark'
                            ? 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.3), transparent)'
                            : 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.2), transparent)',
                    }
                }}
            >
                <Toolbar
                    className="px-4 lg:px-6 xl:px-8"
                    sx={{
                        minHeight: { xs: 64, sm: 68, lg: 72, xl: 76 },
                        gap: { xs: 1, sm: 2, lg: 3 },
                        position: 'relative',
                        paddingX: { xs: 1.5, sm: 2.5, lg: 3.5, xl: 5 },
                        // Prevent content overlap with sidebar
                        '@media (max-width: 1199px)': {
                            paddingX: '12px',
                        },
                        // Mobile-first responsive padding
                        '@media (max-width: 767px)': {
                            paddingX: '8px',
                            minHeight: '60px',
                        },
                    }}
                >
                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <Fade in={true} timeout={600}>
                            <Tooltip
                                title="เปิด/ปิดเมนู"
                                placement="bottom"
                                arrow
                                componentsProps={{
                                    tooltip: {
                                        sx: {
                                            bgcolor: mode === 'dark' ? 'rgba(51, 65, 85, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                                            color: mode === 'dark' ? '#f1f5f9' : '#f8fafc',
                                            fontSize: '0.75rem',
                                            backdropFilter: 'blur(8px)',
                                            border: `1px solid ${mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.2)'}`,
                                        }
                                    }
                                }}
                            >
                                <IconButton
                                    edge="start"
                                    onClick={onMobileMenuToggle}
                                    sx={{
                                        color: 'text.primary',
                                        bgcolor: mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(0, 0, 0, 0.04)',
                                        width: { xs: 40, sm: 44 },
                                        height: { xs: 40, sm: 44 },
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
                                                ? 'rgba(14, 165, 233, 0.15)'
                                                : 'rgba(14, 165, 233, 0.08)',
                                            boxShadow: '0 8px 32px rgba(14, 165, 233, 0.4), 0 0 48px rgba(14, 165, 233, 0.3)',
                                            transform: 'scale(1.08) rotate(90deg)',
                                            borderColor: 'rgba(14, 165, 233, 0.3)',
                                        },
                                        '&:active': {
                                            transform: 'scale(0.95) rotate(90deg)',
                                        },
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: '-100%',
                                            width: '100%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.2), transparent)',
                                            transition: 'left 0.5s ease',
                                            borderRadius: '12px',
                                        },
                                        '&:hover::before': {
                                            left: '100%',
                                        },
                                    }}
                                >
                                    <MenuIcon
                                        sx={{
                                            fontSize: { xs: 20, sm: 24 },
                                            filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.6))',
                                            transition: 'all 0.3s ease',
                                        }}
                                    />
                                </IconButton>
                            </Tooltip>
                        </Fade>
                    )}

                    {/* Title & Breadcrumbs Section */}
                    <Box className="flex-1 min-w-0 flex items-start gap-2">
                        {/* Sparkle Icon */}
                        <Fade in={true} timeout={1200}>
                            <Box
                                sx={{
                                    mt: 0.5,
                                    animation: 'sparkle 3s ease-in-out infinite',
                                    '@keyframes sparkle': {
                                        '0%, 100%': {
                                            opacity: 0.6,
                                            transform: 'scale(1) rotate(0deg)',
                                        },
                                        '50%': {
                                            opacity: 1,
                                            transform: 'scale(1.1) rotate(180deg)',
                                        },
                                    },
                                }}
                            >
                                <SparkleIcon
                                    sx={{
                                        fontSize: { xs: 16, sm: 18, lg: 20 },
                                        color: mode === 'dark' ? '#60a5fa' : '#0ea5e9',
                                        filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))',
                                    }}
                                />
                            </Box>
                        </Fade>

                        <Box className="flex-1 min-w-0">
                            {/* Page Title */}
                            <Fade in={true} timeout={800}>
                                <Typography
                                    variant={isMobile ? "h6" : isTablet ? "h5" : "h4"}
                                    sx={{
                                        fontSize: {
                                            xs: '1.2rem',
                                            sm: '1.4rem',
                                            lg: '1.6rem',
                                            xl: '1.9rem'
                                        },
                                        fontWeight: 700,
                                        letterSpacing: '-0.03em',
                                        lineHeight: 1.1,
                                        background: mode === 'dark'
                                            ? 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)'
                                            : 'linear-gradient(135deg, #0284c7 0%, #16a34a 50%, #7c3aed 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                        filter: mode === 'dark' ? 'brightness(1.2) saturate(1.1)' : 'brightness(1) saturate(1.2)',
                                        animation: 'titleShine 4s ease-in-out infinite',
                                        '@keyframes titleShine': {
                                            '0%, 100%': {
                                                backgroundPosition: '0% 50%',
                                            },
                                            '50%': {
                                                backgroundPosition: '100% 50%',
                                            },
                                        },
                                        backgroundSize: '200% 200%',
                                    }}
                                >
                                    {currentPage.title}
                                </Typography>
                            </Fade>

                            {/* Breadcrumbs - Hidden on small mobile */}
                            {!isSmallMobile && currentPage.subtitle && (
                                <Slide direction="right" in={true} timeout={1000}>
                                    <Box className="mt-1">
                                        <Breadcrumbs
                                            separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
                                            className="flex items-center"
                                            sx={{
                                                '& .MuiBreadcrumbs-ol': {
                                                    flexWrap: 'nowrap',
                                                    alignItems: 'center',
                                                }
                                            }}
                                        >
                                            <Link
                                                underline="none"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigate('/');
                                                }}
                                                className="
                                                    flex items-center gap-1
                                                    text-slate-500 dark:text-slate-400
                                                    hover:text-primary-600 dark:hover:text-primary-400
                                                    transition-all duration-200
                                                    cursor-pointer
                                                    text-xs sm:text-sm
                                                "
                                                sx={{
                                                    '&:hover': {
                                                        transform: 'translateY(-1px)',
                                                        color: mode === 'dark' ? '#60a5fa' : '#0ea5e9',
                                                    }
                                                }}
                                            >
                                                <HomeIcon sx={{ fontSize: { xs: 13, sm: 15 } }} />
                                                {!isMobile && <span>Home</span>}
                                            </Link>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: mode === 'dark' ? 'rgba(148, 163, 184, 0.9)' : 'rgba(71, 85, 105, 0.9)',
                                                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                                    fontWeight: 500,
                                                    maxWidth: { xs: '150px', sm: '250px', lg: '400px' },
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {currentPage.subtitle}
                                            </Typography>
                                        </Breadcrumbs>
                                    </Box>
                                </Slide>
                            )}
                        </Box>
                    </Box>

                    {/* Action Buttons Section */}
                    <Box className="flex items-center gap-1 sm:gap-2">
                        {/* Theme Toggle */}
                        <Fade in={true} timeout={1000}>
                            <Tooltip
                                title={mode === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
                                placement="bottom"
                                arrow
                                componentsProps={{
                                    tooltip: {
                                        sx: {
                                            bgcolor: mode === 'dark' ? 'rgba(51, 65, 85, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                                            color: mode === 'dark' ? '#f1f5f9' : '#f8fafc',
                                            fontSize: '0.75rem',
                                            backdropFilter: 'blur(8px)',
                                            border: `1px solid ${mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.2)'}`,
                                        }
                                    }
                                }}
                            >
                                <IconButton
                                    onClick={toggleTheme}
                                    sx={{
                                        bgcolor: mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(0, 0, 0, 0.04)',
                                        width: { xs: 36, sm: 40, lg: 44 },
                                        height: { xs: 36, sm: 40, lg: 44 },
                                        borderRadius: '12px',
                                        border: `1px solid ${mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(0, 0, 0, 0.08)'
                                            }`,
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            bgcolor: mode === 'dark'
                                                ? 'rgba(251, 191, 36, 0.12)'
                                                : 'rgba(99, 102, 241, 0.08)',
                                            boxShadow: mode === 'dark'
                                                ? '0 8px 32px rgba(251, 191, 36, 0.4), 0 0 64px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                                                : '0 8px 32px rgba(99, 102, 241, 0.4), 0 0 64px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                            transform: 'scale(1.1) rotate(180deg)',
                                            borderColor: mode === 'dark' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(99, 102, 241, 0.3)',
                                        },
                                        '&:active': {
                                            transform: 'scale(0.95) rotate(180deg)',
                                        },
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: '-100%',
                                            width: '100%',
                                            height: '100%',
                                            background: mode === 'dark'
                                                ? 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.2), transparent)'
                                                : 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent)',
                                            transition: 'left 0.6s ease',
                                            borderRadius: '12px',
                                        },
                                        '&:hover::before': {
                                            left: '100%',
                                        },
                                    }}
                                >
                                    {mode === 'dark' ? (
                                        <LightModeIcon
                                            sx={{
                                                color: '#fbbf24',
                                                fontSize: { xs: 18, sm: 20, lg: 22 },
                                                filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.5))',
                                                transition: 'all 0.3s ease',
                                            }}
                                        />
                                    ) : (
                                        <DarkModeIcon
                                            sx={{
                                                color: '#6366f1',
                                                fontSize: { xs: 18, sm: 20, lg: 22 },
                                                filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.9)) drop-shadow(0 0 24px rgba(99, 102, 241, 0.5))',
                                                transition: 'all 0.3s ease',
                                            }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Fade>

                        {/* Notifications */}
                        <NotificationsMenu />

                        {/* Divider - Hidden on small screens */}
                        {!isSmallMobile && (
                            <Box
                                sx={{
                                    width: '1px',
                                    height: '36px',
                                    mx: { xs: 1, sm: 2 },
                                    alignSelf: 'center',
                                    background: mode === 'dark'
                                        ? 'linear-gradient(180deg, transparent 0%, rgba(96, 165, 250, 0.3) 50%, transparent 100%)'
                                        : 'linear-gradient(180deg, transparent 0%, rgba(14, 165, 233, 0.2) 50%, transparent 100%)',
                                    borderRadius: '0.5px',
                                    position: 'relative',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '3px',
                                        height: '3px',
                                        borderRadius: '50%',
                                        background: mode === 'dark' ? '#60a5fa' : '#0ea5e9',
                                        boxShadow: mode === 'dark'
                                            ? '0 0 6px rgba(96, 165, 250, 0.8)'
                                            : '0 0 4px rgba(14, 165, 233, 0.6)',
                                    }
                                }}
                            />
                        )}

                        {/* User Profile */}
                        <UserProfileMenu user={user} isMobile={isMobile} />
                    </Box>
                </Toolbar>

                {/* Animated bottom border - simplified temporarily to isolate syntax errors */}
                {/* Animated bottom border accent */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '1px',
                        background: mode === 'dark'
                            ? 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.5), transparent)'
                            : 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.3), transparent)',
                        opacity: 0.7,
                    }}
                />
            </AppBar>
        </Slide>
    );
}