import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Avatar,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Chip,
    Fade,
    alpha,
} from '@mui/material';
import {
    Person as PersonIcon,
    Logout as LogoutIcon,
    Settings as SettingsIcon,
    Help as HelpIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

interface UserProfileMenuProps {
    user: any; // Use proper type from your auth store
    isMobile: boolean;
}

export default function UserProfileMenu({ user, isMobile }: UserProfileMenuProps) {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const { mode } = useThemeStore();
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const isOpen = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleProfile = () => {
        handleClose();
        navigate('/profile');
    };

    const handleLogout = () => {
        handleClose();
        logout();
        navigate('/login');
    };

    const getUserInitials = () => {
        if (user?.full_name) {
            const names = user.full_name.split(' ');
            return names.length >= 2 
                ? `${names[0][0]}${names[1][0]}`.toUpperCase()
                : names[0]?.substring(0, 2).toUpperCase() || 'U';
        }
        return user?.username?.charAt(0).toUpperCase() || 'U';
    };

    const getUserDisplayName = () => {
        return user?.full_name || user?.username || 'User';
    };

    const isAdmin = user?.role === 'admin';

    return (
        <>
            <Box
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="
                    flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-xl 
                    cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95
                    border border-transparent
                "
                sx={{
                    bgcolor: mode === 'dark' 
                        ? alpha('#ffffff', 0.03) 
                        : alpha('#000000', 0.02),
                    '&:hover': {
                        bgcolor: mode === 'dark'
                            ? alpha('#0ea5e9', 0.08)
                            : alpha('#0ea5e9', 0.04),
                        borderColor: mode === 'dark'
                            ? alpha('#0ea5e9', 0.3)
                            : alpha('#0ea5e9', 0.2),
                        boxShadow: '0 8px 25px rgba(14, 165, 233, 0.15)',
                        transform: 'translateY(-2px)',
                    },
                    minWidth: { xs: 'auto', sm: 120 },
                }}
            >
                {/* Avatar */}
                <Avatar
                    className="ring-2 ring-offset-2 ring-primary-500/20 transition-all duration-300"
                    sx={{
                        width: { xs: 32, sm: 36, lg: 40 },
                        height: { xs: 32, sm: 36, lg: 40 },
                        background: isAdmin
                            ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                            : 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                        fontSize: { xs: '0.8rem', sm: '0.9rem', lg: '1rem' },
                        fontWeight: 700,
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.2s ease',
                        boxShadow: isHovered 
                            ? '0 8px 25px rgba(14, 165, 233, 0.4)'
                            : '0 4px 15px rgba(14, 165, 233, 0.2)',
                    }}
                >
                    {getUserInitials()}
                </Avatar>

                {/* User Info - Hidden on mobile */}
                {!isMobile && (
                    <Box className="flex flex-col gap-1 min-w-0 flex-1">
                        <Typography 
                            variant="body2" 
                            className="font-semibold text-slate-800 dark:text-slate-100 truncate"
                            sx={{ fontSize: { sm: '0.85rem', lg: '0.9rem' } }}
                        >
                            {getUserDisplayName()}
                        </Typography>
                        
                        <Chip
                            label={isAdmin ? 'Admin' : 'User'}
                            size="small"
                            className="self-start"
                            sx={{
                                height: { sm: 16, lg: 18 },
                                fontSize: { sm: '0.6rem', lg: '0.65rem' },
                                fontWeight: 600,
                                bgcolor: isAdmin
                                    ? alpha('#a855f7', 0.15)
                                    : alpha('#0ea5e9', 0.15),
                                color: isAdmin 
                                    ? '#a855f7' 
                                    : '#0ea5e9',
                                border: `1px solid ${isAdmin 
                                    ? alpha('#a855f7', 0.3) 
                                    : alpha('#0ea5e9', 0.3)
                                }`,
                                '&:hover': {
                                    bgcolor: isAdmin
                                        ? alpha('#a855f7', 0.2)
                                        : alpha('#0ea5e9', 0.2),
                                },
                            }}
                        />
                    </Box>
                )}
            </Box>

            {/* User Menu */}
            <Menu
                anchorEl={anchorEl}
                open={isOpen}
                onClose={handleClose}
                TransitionComponent={Fade}
                TransitionProps={{ timeout: 400 }}
                PaperProps={{
                    className: "mt-2 shadow-xl",
                    sx: {
                        width: { xs: 240, sm: 260 },
                        borderRadius: 3,
                        background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.90) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.90) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${mode === 'dark' 
                            ? alpha('#ffffff', 0.1) 
                            : alpha('#000000', 0.1)
                        }`,
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {/* User Info Header */}
                <Box className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <Box className="flex items-center gap-3">
                        <Avatar
                            sx={{
                                width: 48,
                                height: 48,
                                background: isAdmin
                                    ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                                    : 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
                            }}
                        >
                            {getUserInitials()}
                        </Avatar>
                        
                        <Box className="flex-1 min-w-0">
                            <Typography 
                                variant="subtitle2" 
                                className="font-bold text-slate-800 dark:text-slate-100 truncate"
                            >
                                {getUserDisplayName()}
                            </Typography>
                            <Typography 
                                variant="caption" 
                                className="text-slate-500 dark:text-slate-400 truncate block"
                            >
                                {user?.email || 'ไม่มีอีเมล'}
                            </Typography>
                            <Chip
                                label={isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}
                                size="small"
                                className="mt-1"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    bgcolor: isAdmin
                                        ? alpha('#a855f7', 0.15)
                                        : alpha('#0ea5e9', 0.15),
                                    color: isAdmin 
                                        ? '#a855f7' 
                                        : '#0ea5e9',
                                    border: `1px solid ${isAdmin 
                                        ? alpha('#a855f7', 0.3) 
                                        : alpha('#0ea5e9', 0.3)
                                    }`,
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Menu Items */}
                <MenuItem
                    onClick={handleProfile}
                    className="py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200"
                >
                    <ListItemIcon>
                        <PersonIcon 
                            fontSize="small" 
                            sx={{ color: '#0ea5e9' }}
                        />
                    </ListItemIcon>
                    <ListItemText
                        primary="โปรไฟล์"
                        secondary="ดูและแก้ไขข้อมูลส่วนตัว"
                        primaryTypographyProps={{ 
                            fontWeight: 500,
                            className: 'text-slate-800 dark:text-slate-100'
                        }}
                        secondaryTypographyProps={{ 
                            fontSize: '0.7rem',
                            className: 'text-slate-500 dark:text-slate-400'
                        }}
                    />
                </MenuItem>

                <MenuItem
                    onClick={handleClose}
                    className="py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200"
                >
                    <ListItemIcon>
                        <SettingsIcon 
                            fontSize="small" 
                            sx={{ color: '#6366f1' }}
                        />
                    </ListItemIcon>
                    <ListItemText
                        primary="การตั้งค่า"
                        secondary="ปรับแต่งการใช้งาน"
                        primaryTypographyProps={{ 
                            fontWeight: 500,
                            className: 'text-slate-800 dark:text-slate-100'
                        }}
                        secondaryTypographyProps={{ 
                            fontSize: '0.7rem',
                            className: 'text-slate-500 dark:text-slate-400'
                        }}
                    />
                </MenuItem>

                <MenuItem
                    onClick={handleClose}
                    className="py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200"
                >
                    <ListItemIcon>
                        <HelpIcon 
                            fontSize="small" 
                            sx={{ color: '#22c55e' }}
                        />
                    </ListItemIcon>
                    <ListItemText
                        primary="ช่วยเหลือ"
                        secondary="คู่มือการใช้งาน"
                        primaryTypographyProps={{ 
                            fontWeight: 500,
                            className: 'text-slate-800 dark:text-slate-100'
                        }}
                        secondaryTypographyProps={{ 
                            fontSize: '0.7rem',
                            className: 'text-slate-500 dark:text-slate-400'
                        }}
                    />
                </MenuItem>

                <Divider className="my-1" />

                <MenuItem
                    onClick={handleLogout}
                    className="py-3 px-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                >
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText
                        primary="ออกจากระบบ"
                        primaryTypographyProps={{ 
                            fontWeight: 500,
                            color: 'error.main'
                        }}
                    />
                </MenuItem>
            </Menu>
        </>
    );
}