import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    Alert,
    CircularProgress,
    Fade,
    alpha,
} from '@mui/material';
import {
    NotificationsActive as AlarmIcon,
    NotificationsActive as NotificationsActiveIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { } from '../helpers';
import type { Tab6Props } from '../types';

export default function Tab6Alarm(props: Tab6Props) {
    const { vm, theme, alarmsLoading, alarms, platformAlerts } = props;
    const navigate = useNavigate();

    return (
        <Box>
            {alarmsLoading && (
                <Fade in={true}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 8,
                        gap: 3
                    }}>
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: `conic-gradient(from 0deg, #ef4444 0%, #f59e0b 25%, #3b82f6 50%, #8b5cf6 75%, #ef4444 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'spin 2s linear infinite',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' }
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CircularProgress size={32} thickness={2.5} sx={{ color: '#ef4444' }} />
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={900} sx={{
                                background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #3b82f6 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 1
                            }}>
                                กำลังตรวจสอบ Alarms
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                โปรดรอสักครู่...
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}
            {!alarmsLoading && (
                <>
                    {/* Hero Overview Cards */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                        {/* Total Alarms Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: `linear-gradient(135deg, ${alpha('#ef4444', 0.08)} 0%, ${alpha('#ef4444', 0.02)} 100%)`,
                                    border: '2px solid',
                                    borderColor: alpha('#ef4444', 0.2),
                                    transition: 'all 0.3s ease',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#ef4444', 0.4),
                                        boxShadow: `0 12px 28px ${alpha('#ef4444', 0.25)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 2.5,
                                                background: `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid',
                                                borderColor: alpha('#ef4444', 0.3),
                                            }}
                                        >
                                            <AlarmIcon sx={{ fontSize: 32, color: '#ef4444' }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        🚨 Total Alarms
                                    </Typography>
                                    <Typography variant="h4" fontWeight={900} color="#ef4444" sx={{ mb: 0.5 }}>
                                        {alarms.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                        การแจ้งเตือนทั้งหมด
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Critical Alarms Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: `linear-gradient(135deg, ${alpha('#dc2626', 0.08)} 0%, ${alpha('#dc2626', 0.02)} 100%)`,
                                    border: '2px solid',
                                    borderColor: alpha('#dc2626', 0.2),
                                    transition: 'all 0.3s ease',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#dc2626', 0.4),
                                        boxShadow: `0 12px 28px ${alpha('#dc2626', 0.25)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 2.5,
                                                background: `linear-gradient(135deg, ${alpha('#dc2626', 0.2)} 0%, ${alpha('#dc2626', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid',
                                                borderColor: alpha('#dc2626', 0.3),
                                            }}
                                        >
                                            <WarningIcon sx={{ fontSize: 32, color: '#dc2626' }} />
                                        </Box>
                                        {alarms.filter(a => {
                                            const sev = (a.severity || '').toLowerCase();
                                            return sev.includes('critical') || sev === 'p1';
                                        }).length > 0 && (
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        background: '#dc2626',
                                                        boxShadow: '0 0 12px rgba(220, 38, 38, 0.6)',
                                                        animation: 'pulse 2s ease-in-out infinite',
                                                        '@keyframes pulse': {
                                                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                            '50%': { opacity: 0.7, transform: 'scale(1.3)' }
                                                        }
                                                    }}
                                                />
                                            )}
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        🔴 Critical (P1)
                                    </Typography>
                                    <Typography variant="h4" fontWeight={900} color="#dc2626" sx={{ mb: 0.5 }}>
                                        {alarms.filter(a => {
                                            const sev = (a.severity || '').toLowerCase();
                                            return sev.includes('critical') || sev === 'p1';
                                        }).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                        วิกฤติ ต้องแก้ไขทันที
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Warning Alarms Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.02)} 100%)`,
                                    border: '2px solid',
                                    borderColor: alpha('#f59e0b', 0.2),
                                    transition: 'all 0.3s ease',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f59e0b 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#f59e0b', 0.4),
                                        boxShadow: `0 12px 28px ${alpha('#f59e0b', 0.25)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 2.5,
                                                background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid',
                                                borderColor: alpha('#f59e0b', 0.3),
                                            }}
                                        >
                                            <WarningIcon sx={{ fontSize: 32, color: '#f59e0b' }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        🟡 Warning (P2)
                                    </Typography>
                                    <Typography variant="h4" fontWeight={900} color="#f59e0b" sx={{ mb: 0.5 }}>
                                        {alarms.filter(a => {
                                            const sev = (a.severity || '').toLowerCase();
                                            return sev.includes('warning') || sev === 'p2';
                                        }).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                        เฝ้าระวัง ควรตรวจสอบ
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Open Alarms Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: platformAlerts.length > 0
                                        ? `linear-gradient(135deg, ${alpha('#7c3aed', 0.08)} 0%, ${alpha('#7c3aed', 0.02)} 100%)`
                                        : alarms.filter(a => a.status === 'open').length > 0
                                            ? `linear-gradient(135deg, ${alpha('#3b82f6', 0.08)} 0%, ${alpha('#3b82f6', 0.02)} 100%)`
                                            : `linear-gradient(135deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                                    border: '2px solid',
                                    borderColor: platformAlerts.length > 0 ? alpha('#7c3aed', 0.2) :
                                        alarms.filter(a => a.status === 'open').length > 0 ? alpha('#3b82f6', 0.2) : alpha('#22c55e', 0.2),
                                    transition: 'all 0.3s ease',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                        background: platformAlerts.length > 0
                                            ? 'linear-gradient(90deg, #7c3aed, #4c1d95, #7c3aed)'
                                            : alarms.filter(a => a.status === 'open').length > 0
                                                ? 'linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6)'
                                                : 'linear-gradient(90deg, #22c55e, #10b981, #22c55e)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{
                                            width: 56, height: 56, borderRadius: 2.5,
                                            background: platformAlerts.length > 0
                                                ? `linear-gradient(135deg, ${alpha('#7c3aed', 0.2)}, ${alpha('#7c3aed', 0.1)})`
                                                : alarms.filter(a => a.status === 'open').length > 0
                                                    ? `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)}, ${alpha('#3b82f6', 0.1)})`
                                                    : `linear-gradient(135deg, ${alpha('#22c55e', 0.2)}, ${alpha('#22c55e', 0.1)})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '2px solid',
                                            borderColor: platformAlerts.length > 0 ? alpha('#7c3aed', 0.3) :
                                                alarms.filter(a => a.status === 'open').length > 0 ? alpha('#3b82f6', 0.3) : alpha('#22c55e', 0.3),
                                        }}>
                                            {platformAlerts.length > 0 ? (
                                                <NotificationsActiveIcon sx={{ fontSize: 32, color: '#7c3aed' }} />
                                            ) : alarms.filter(a => a.status === 'open').length > 0 ? (
                                                <InfoIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                                            ) : (
                                                <CheckCircleIcon sx={{ fontSize: 32, color: '#22c55e' }} />
                                            )}
                                        </Box>
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        💜 Platform Alerts
                                    </Typography>
                                    <Typography variant="h4" fontWeight={900} color={
                                        platformAlerts.length > 0 ? '#7c3aed' : '#22c55e'
                                    } sx={{ mb: 0.5 }}>
                                        {platformAlerts.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                        {platformAlerts.length > 0 ? 'Platform Events' : 'ไม่มี Events'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Alarms List Section */}
                    {alarms.length === 0 ? (
                        <Card
                            sx={{
                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                background: theme.palette.mode === 'dark'
                                    ? `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
                                    : `linear-gradient(145deg, ${alpha('#22c55e', 0.05)} 0%, ${alpha('#22c55e', 0.01)} 100%)`,
                                border: '2px solid',
                                borderColor: alpha('#22c55e', 0.2),
                            }}
                        >
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <Box
                                    sx={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `3px solid ${alpha('#22c55e', 0.3)}`,
                                        margin: '0 auto 24px',
                                    }}
                                >
                                    <CheckCircleIcon sx={{ fontSize: 56, color: '#22c55e' }} />
                                </Box>
                                <Typography variant="h5" fontWeight={900} color="#22c55e" gutterBottom>
                                    ✅ ไม่พบ Alarm
                                </Typography>
                                <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ mb: 3 }}>
                                    VM นี้ไม่มีการแจ้งเตือนใดๆ ในขณะนี้ ระบบทำงานปกติ
                                </Typography>
                                <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                        ℹ️ ตัวอย่าง Alarm Levels
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip label="P1 - Critical" size="small" sx={{
                                                fontWeight: 800,
                                                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                                color: '#fff'
                                            }} />
                                            <Typography variant="caption">วิกฤติ ต้องแก้ไขทันที</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip label="P2 - Warning" size="small" sx={{
                                                fontWeight: 800,
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
                                                color: '#fff'
                                            }} />
                                            <Typography variant="caption">เฝ้าระวัง ควรตรวจสอบ</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip label="P3 - Info" size="small" sx={{
                                                fontWeight: 800,
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                color: '#fff'
                                            }} />
                                            <Typography variant="caption">ข้อมูลแจ้งให้ทราบ</Typography>
                                        </Box>
                                    </Box>
                                </Alert>
                            </CardContent>
                        </Card>
                    ) : (
                        <Box>
                            {/* Section Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            background: `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `2px solid ${alpha('#ef4444', 0.3)}`
                                        }}
                                    >
                                        <AlarmIcon sx={{ fontSize: 26, color: '#ef4444' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={900}>
                                            🚨 Alarm Details
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            รายละเอียดการแจ้งเตือนทั้งหมด
                                        </Typography>
                                    </Box>
                                </Box>
                                <Chip
                                    label={`${alarms.length} Alarm${alarms.length !== 1 ? 's' : ''}`}
                                    sx={{
                                        height: 36,
                                        fontSize: '0.95rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        color: '#fff',
                                        px: 2,
                                        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                                    }}
                                />
                            </Box>

                            {/* Alarms Grid */}
                            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                {alarms.map((alarm) => {
                                    const severity = (alarm.severity || 'p3').toLowerCase();
                                    let severityColor = '#3b82f6';
                                    let severityBg = alpha('#3b82f6', 0.08);
                                    let severityLabel = 'Info';
                                    let severityIcon = '🔵';

                                    if (severity.includes('critical') || severity === 'p1') {
                                        severityColor = '#dc2626';
                                        severityBg = alpha('#dc2626', 0.08);
                                        severityLabel = 'Critical';
                                        severityIcon = '🔴';
                                    } else if (severity.includes('warning') || severity === 'p2') {
                                        severityColor = '#f59e0b';
                                        severityBg = alpha('#f59e0b', 0.08);
                                        severityLabel = 'Warning';
                                        severityIcon = '🟡';
                                    }

                                    return (
                                        <Grid item xs={12} key={alarm.alarm_id}>
                                            <Card
                                                sx={{
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    background: theme.palette.mode === 'dark'
                                                        ? severityBg
                                                        : `linear-gradient(145deg, ${severityBg} 0%, ${alpha(severityColor, 0.02)} 100%)`,
                                                    border: '2px solid',
                                                    borderColor: alpha(severityColor, 0.2),
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 5,
                                                        background: `linear-gradient(90deg, ${severityColor} 0%, ${alpha(severityColor, 0.7)} 50%, ${severityColor} 100%)`,
                                                        backgroundSize: '200% 100%',
                                                        animation: alarm.status === 'open' ? 'shimmer 3s linear infinite' : 'none',
                                                    },
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        borderColor: alpha(severityColor, 0.4),
                                                        boxShadow: `0 12px 24px ${alpha(severityColor, 0.2)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    {/* Header */}
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                                                            {/* Severity Icon */}
                                                            <Box
                                                                sx={{
                                                                    width: 56,
                                                                    height: 56,
                                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                    background: `linear-gradient(135deg, ${alpha(severityColor, 0.2)} 0%, ${alpha(severityColor, 0.1)} 100%)`,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: `2px solid ${alpha(severityColor, 0.3)}`,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <WarningIcon sx={{ fontSize: 32, color: severityColor }} />
                                                            </Box>

                                                            {/* Title & Time */}
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                                                    <Chip
                                                                        label={`${severityIcon} ${severityLabel} - ${(alarm.severity || 'Unknown').toUpperCase()}`}
                                                                        sx={{
                                                                            height: 28,
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: 800,
                                                                            background: `linear-gradient(135deg, ${severityColor} 0%, ${alpha(severityColor, 0.8)} 100%)`,
                                                                            color: '#fff',
                                                                            boxShadow: `0 4px 12px ${alpha(severityColor, 0.3)}`
                                                                        }}
                                                                    />
                                                                    <Chip
                                                                        label={alarm.status === 'open' ? '🔓 Open' : '✅ Closed'}
                                                                        size="small"
                                                                        sx={{
                                                                            height: 28,
                                                                            fontWeight: 700,
                                                                            background: alarm.status === 'open'
                                                                                ? alpha('#ef4444', 0.15)
                                                                                : alpha('#22c55e', 0.15),
                                                                            color: alarm.status === 'open' ? '#ef4444' : '#22c55e',
                                                                            border: `1px solid ${alarm.status === 'open' ? alpha('#ef4444', 0.3) : alpha('#22c55e', 0.3)}`
                                                                        }}
                                                                    />
                                                                    {alarm.source === 'host' && (
                                                                        <Chip
                                                                            label={`🖥️ Host: ${alarm.resource_name || 'System'}`}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 28,
                                                                                fontWeight: 700,
                                                                                background: alpha('#8b5cf6', 0.15),
                                                                                color: '#8b5cf6',
                                                                                border: `1px solid ${alpha('#8b5cf6', 0.3)}`
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                                <Typography variant="h6" fontWeight={900} color={severityColor} sx={{ mb: 0.5, wordBreak: 'break-word' }}>
                                                                    {alarm.title}
                                                                </Typography>
                                                                {alarm.description && (
                                                                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1, wordBreak: 'break-word' }}>
                                                                        {alarm.description}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>

                                                    {/* Metadata Grid */}
                                                    <Grid container spacing={2} sx={{ mt: 2 }}>
                                                        {/* Begin Time */}
                                                        <Grid item xs={12} sm={6} md={3}>
                                                            <Box
                                                                sx={{
                                                                    p: 2,
                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                    background: alpha(severityColor, 0.05),
                                                                    border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                }}
                                                            >
                                                                <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                    ⏰ เริ่มต้น
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight={800} color={severityColor}>
                                                                    {alarm.begin_time ? new Date(alarm.begin_time).toLocaleString('th-TH', {
                                                                        year: '2-digit',
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    }) : '-'}
                                                                </Typography>
                                                            </Box>
                                                        </Grid>

                                                        {/* Source */}
                                                        {alarm.source && (
                                                            <Grid item xs={12} sm={6} md={3}>
                                                                <Box
                                                                    sx={{
                                                                        p: 2,
                                                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                        background: alpha(severityColor, 0.05),
                                                                        border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                    }}
                                                                >
                                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                        📡 Source
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                                                                        {alarm.source}
                                                                    </Typography>
                                                                </Box>
                                                            </Grid>
                                                        )}

                                                        {/* Object Type */}
                                                        {alarm.object_type && (
                                                            <Grid item xs={12} sm={6} md={3}>
                                                                <Box
                                                                    sx={{
                                                                        p: 2,
                                                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                        background: alpha(severityColor, 0.05),
                                                                        border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                    }}
                                                                >
                                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                        🔧 Object Type
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={700}>
                                                                        {alarm.object_type}
                                                                    </Typography>
                                                                </Box>
                                                            </Grid>
                                                        )}

                                                        {/* Alarm ID */}
                                                        <Grid item xs={12} sm={6} md={3}>
                                                            <Box
                                                                sx={{
                                                                    p: 2,
                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                    background: alpha(severityColor, 0.05),
                                                                    border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                }}
                                                            >
                                                                <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                    🔑 Alarm ID
                                                                </Typography>
                                                                <Typography variant="body2" fontFamily="monospace" fontWeight={600} fontSize="0.75rem">
                                                                    #{alarm.alarm_id}
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>

                            {/* Platform Alerts Section (null-severity system events) */}
                            {platformAlerts.length > 0 && (
                                <Box sx={{ mt: 4 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box sx={{
                                            width: 44, height: 44, borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            background: `linear-gradient(135deg, ${alpha('#7c3aed', 0.2)}, ${alpha('#7c3aed', 0.1)})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `2px solid ${alpha('#7c3aed', 0.3)}`,
                                        }}>
                                            <NotificationsActiveIcon sx={{ fontSize: 26, color: '#7c3aed' }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" fontWeight={900}>💜 Platform Events</Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                System events without policy severity classification
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={`${platformAlerts.length} Event${platformAlerts.length !== 1 ? 's' : ''}`}
                                            sx={{ ml: 'auto', fontWeight: 800, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', color: '#fff' }}
                                        />
                                    </Box>
                                    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                                        {platformAlerts.map((alert) => (
                                            <Grid item xs={12} key={alert.alarm_id}>
                                                <Card sx={{
                                                    borderRadius: 3, borderLeft: '4px solid #7c3aed',
                                                    background: `linear-gradient(135deg, ${alpha('#7c3aed', 0.05)}, ${alpha('#4c1d95', 0.02)})`,
                                                    border: `1px solid ${alpha('#7c3aed', 0.2)}`,
                                                }}>
                                                    <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                            <NotificationsActiveIcon sx={{ fontSize: 22, color: '#7c3aed', mt: 0.3, flexShrink: 0 }} />
                                                            <Box sx={{ flex: 1 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                                                    <Chip label="Platform Event" size="small" sx={{
                                                                        fontWeight: 700, fontSize: '0.7rem',
                                                                        background: alpha('#7c3aed', 0.15), color: '#7c3aed',
                                                                        border: `1px solid ${alpha('#7c3aed', 0.3)}`,
                                                                    }} />
                                                                    <Chip label={alert.object_type || 'system'} size="small" variant="outlined"
                                                                        sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }} />
                                                                    {alert.alert_count > 1 && (
                                                                        <Chip label={`×${alert.alert_count}`} size="small" color="warning"
                                                                            sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                                                    )}
                                                                </Box>
                                                                <Typography variant="body2" fontWeight={700} color="#7c3aed" sx={{ mb: 0.5 }}>
                                                                    {alert.title || (alert.description ? alert.description.substring(0, 80) : 'Platform Event')}
                                                                </Typography>
                                                                {alert.description && alert.description !== alert.title && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {alert.description}
                                                                    </Typography>
                                                                )}
                                                                {alert.recommendation && (
                                                                    <Box sx={{ mt: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', gap: 1 }}>
                                                                        <Typography variant="caption" color="#b45309" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>💡 TIP:</Typography>
                                                                        <Typography variant="caption" color="text.primary">{alert.recommendation}</Typography>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                                                                {alert.created_at ? new Date(alert.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                            </Typography>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}

                            {/* View All Button */}
                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => navigate(`/alarms?search=${vm.name}`)}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                            boxShadow: '0 12px 28px rgba(239, 68, 68, 0.4)',
                                            transform: 'translateY(-2px)',
                                        }
                                    }}
                                    startIcon={<AlarmIcon />}
                                >
                                    📜 ดู Alarm History ทั้งหมด
                                </Button>
                            </Box>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
}
