import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Box,
    Typography,
    Divider,
    Tooltip,
    Fade,
    alpha,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { useThemeStore } from '../../stores/themeStore';

interface Notification {
    id: string;
    icon: string;
    title: string;
    time: string;
    type: 'warning' | 'error' | 'success' | 'info';
    unread: boolean;
}

// Mock notifications data - in real app, this would come from API/store
const mockNotifications: Notification[] = [
    { 
        id: '1', 
        icon: '⚠️', 
        title: 'VM-001 CPU สูงกว่า 90%', 
        time: '5 นาทีที่แล้ว', 
        type: 'warning',
        unread: true 
    },
    { 
        id: '2', 
        icon: '🔴', 
        title: 'VM-005 หยุดทำงาน', 
        time: '15 นาทีที่แล้ว', 
        type: 'error',
        unread: true 
    },
    { 
        id: '3', 
        icon: '✅', 
        title: 'Backup สำเร็จ 25 VMs', 
        time: '1 ชม.ที่แล้ว', 
        type: 'success',
        unread: false 
    },
    { 
        id: '4', 
        icon: '🔄', 
        title: 'กำลังซิงค์ข้อมูล', 
        time: '2 ชม.ที่แล้ว', 
        type: 'info',
        unread: false 
    },
];

const getTypeColor = (type: string, mode: string) => {
    const colors = {
        warning: mode === 'dark' ? '#fbbf24' : '#f59e0b',
        error: mode === 'dark' ? '#f87171' : '#ef4444',
        success: mode === 'dark' ? '#34d399' : '#22c55e',
        info: mode === 'dark' ? '#60a5fa' : '#3b82f6',
    };
    return colors[type as keyof typeof colors] || colors.info;
};

export default function NotificationsMenu() {
    const navigate = useNavigate();
    const { mode } = useThemeStore();
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [isHovered, setIsHovered] = useState(false);

    const unreadCount = notifications.filter(n => n.unread).length;
    const isOpen = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        setNotifications(prev => 
            prev.map(n => 
                n.id === notification.id ? { ...n, unread: false } : n
            )
        );
    };

    const handleViewAll = () => {
        handleClose();
        navigate('/alarms');
    };

    return (
        <>
            <Tooltip title="การแจ้งเตือน" placement="bottom">
                <IconButton
                    onClick={handleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="
                        transition-all duration-300 
                        hover:scale-110 
                        active:scale-95
                    "
                    sx={{
                        bgcolor: mode === 'dark' 
                            ? alpha('#ffffff', 0.05) 
                            : alpha('#000000', 0.03),
                        '&:hover': {
                            bgcolor: mode === 'dark'
                                ? alpha('#ef4444', 0.15)
                                : alpha('#ef4444', 0.08),
                            boxShadow: unreadCount > 0 
                                ? '0 6px 25px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)'
                                : '0 6px 25px rgba(14, 165, 233, 0.3), 0 0 30px rgba(14, 165, 233, 0.1)',
                            transform: 'scale(1.08)',
                        },
                        width: { xs: 36, sm: 40, lg: 44 },
                        height: { xs: 36, sm: 40, lg: 44 },
                        position: 'relative',
                    }}
                >
                    <Badge 
                        badgeContent={unreadCount} 
                        color="error"
                        className="animate-pulse"
                        sx={{
                            '& .MuiBadge-badge': {
                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                minWidth: { xs: 16, sm: 20 },
                                height: { xs: 16, sm: 20 },
                                transform: unreadCount > 0 && isHovered 
                                    ? 'scale(1.2)' : 'scale(1)',
                                transition: 'transform 0.2s ease',
                            }
                        }}
                    >
                        {unreadCount > 0 && (isHovered || isOpen) ? (
                            <NotificationsActiveIcon 
                                className="animate-bounce"
                                sx={{ 
                                    color: '#ef4444',
                                    fontSize: { xs: 18, sm: 20, lg: 22 }
                                }} 
                            />
                        ) : (
                            <NotificationsIcon 
                                sx={{ 
                                    color: 'text.secondary',
                                    fontSize: { xs: 18, sm: 20, lg: 22 }
                                }} 
                            />
                        )}
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={isOpen}
                onClose={handleClose}
                TransitionComponent={Fade}
                TransitionProps={{ timeout: 400 }}
                PaperProps={{
                    className: "mt-2 shadow-xl",
                    sx: {
                        width: { xs: 300, sm: 360, lg: 400 },
                        maxHeight: 480,
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
                {/* Header */}
                <Box className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <Box className="flex items-center justify-between">
                        <Typography 
                            variant="h6" 
                            className="font-bold text-slate-800 dark:text-slate-100"
                        >
                            การแจ้งเตือน
                        </Typography>
                        {unreadCount > 0 && (
                            <Box className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/50">
                                <Typography 
                                    variant="caption" 
                                    className="text-red-600 dark:text-red-400 font-semibold"
                                >
                                    {unreadCount} ใหม่
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Notifications List */}
                <Box className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <Box className="flex flex-col items-center justify-center py-8">
                            <Typography variant="body2" color="text.secondary">
                                ไม่มีการแจ้งเตือน
                            </Typography>
                        </Box>
                    ) : (
                        notifications.map((notification) => (
                            <MenuItem
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`
                                    py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50
                                    ${notification.unread ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}
                                    transition-all duration-200
                                `}
                                sx={{
                                    borderLeft: notification.unread 
                                        ? `4px solid ${getTypeColor(notification.type, mode)}`
                                        : '4px solid transparent',
                                }}
                            >
                                <Box className="flex gap-3 items-start w-full">
                                    <Box 
                                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                                        sx={{
                                            backgroundColor: alpha(getTypeColor(notification.type, mode), 0.1),
                                        }}
                                    >
                                        <Typography fontSize="1.1rem">
                                            {notification.icon}
                                        </Typography>
                                    </Box>
                                    
                                    <Box className="flex-1 min-w-0">
                                        <Box className="flex items-start justify-between">
                                            <Typography 
                                                variant="body2" 
                                                className={`
                                                    font-medium text-slate-800 dark:text-slate-200
                                                    ${notification.unread ? 'font-semibold' : ''}
                                                    truncate flex-1 pr-2
                                                `}
                                            >
                                                {notification.title}
                                            </Typography>
                                            {notification.unread && (
                                                <Box 
                                                    className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"
                                                />
                                            )}
                                        </Box>
                                        <Typography 
                                            variant="caption" 
                                            className="text-slate-500 dark:text-slate-400 mt-1"
                                        >
                                            {notification.time}
                                        </Typography>
                                    </Box>
                                </Box>
                            </MenuItem>
                        ))
                    )}
                </Box>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <Divider />
                        <MenuItem
                            onClick={handleViewAll}
                            className="justify-center py-3 font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                            <Typography variant="body2" className="font-semibold">
                                ดูทั้งหมด
                            </Typography>
                        </MenuItem>
                    </>
                )}
            </Menu>
        </>
    );
}