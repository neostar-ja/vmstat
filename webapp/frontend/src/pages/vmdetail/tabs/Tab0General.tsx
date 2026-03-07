import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    CircularProgress,
    Fade,
    alpha,
} from '@mui/material';
import {
    PlayArrow as RunningIcon,
    Stop as StoppedIcon,
    NetworkCheck as NetworkIcon,
    Shield as ShieldIcon,
    Dns as DnsIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { formatUptime, OSIcon, getOSInfo } from '../helpers';
import type { Tab0Props } from '../types';

export default function Tab0General(props: Tab0Props) {
    const { vm, theme, realtimeLoading, realtime } = props;

    return (
        <Box>
            {realtimeLoading && (
                <Fade in={true}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 8,
                            gap: 3,
                            position: 'relative',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                width: 200,
                                height: 200,
                                borderRadius: '50%',
                                background: 'conic-gradient(from 0deg, transparent, rgba(14, 165, 233, 0.3), transparent)',
                                animation: 'rotate 2s linear infinite',
                                '@keyframes rotate': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                },
                            },
                        }}
                    >
                        <Box
                            sx={{
                                position: 'relative',
                                zIndex: 1,
                                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
                                borderRadius: '50%',
                                p: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CircularProgress
                                size={80}
                                thickness={2}
                                sx={{
                                    color: '#0ea5e9',
                                    '& .MuiCircularProgress-circle': {
                                        strokeLinecap: 'round',
                                    },
                                }}
                            />
                        </Box>
                        <Typography
                            variant="h5"
                            fontWeight={800}
                            sx={{
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textAlign: 'center',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            🚀 กำลังโหลดข้อมูล Realtime...
                        </Typography>
                    </Box>
                </Fade>
            )}

            {!realtimeLoading && (
                <Grid container spacing={{ xs: 1.5, sm: 2, md: 4 }}>
                    {/* Hero Status Card - Full Width */}
                    <Grid item xs={12}>
                        <Card
                            sx={{
                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                overflow: 'hidden',
                                background: vm.power_state === 'on'
                                    ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
                                    : 'linear-gradient(145deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
                                border: '1px solid',
                                borderColor: vm.power_state === 'on'
                                    ? alpha('#22c55e', 0.2)
                                    : alpha('#ef4444', 0.2),
                                position: 'relative',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 6,
                                    background: vm.power_state === 'on'
                                        ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                                        : 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                                    animation: vm.power_state === 'on' ? 'pulse-green 2s infinite' : 'pulse-red 2s infinite',
                                    '@keyframes pulse-green': {
                                        '0%, 100%': { opacity: 1, transform: 'scaleY(1)' },
                                        '50%': { opacity: 0.7, transform: 'scaleY(0.8)' }
                                    },
                                    '@keyframes pulse-red': {
                                        '0%, 100%': { opacity: 1, transform: 'scaleY(1)' },
                                        '50%': { opacity: 0.7, transform: 'scaleY(0.8)' }
                                    }
                                },
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: vm.power_state === 'on'
                                        ? '0 20px 40px rgba(34, 197, 94, 0.15)'
                                        : '0 20px 40px rgba(239, 68, 68, 0.15)',
                                },
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 2, md: 3 } }}>
                                    {/* Status Icon & Info */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
                                        <Box
                                            sx={{
                                                width: { xs: 56, sm: 80 },
                                                height: { xs: 56, sm: 80 },
                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                background: vm.power_state === 'on'
                                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: vm.power_state === 'on'
                                                    ? '0 8px 32px rgba(34, 197, 94, 0.4)'
                                                    : '0 8px 32px rgba(239, 68, 68, 0.4)',
                                                position: 'relative',
                                                '&::after': vm.power_state === 'on' ? {
                                                    content: '""',
                                                    position: 'absolute',
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    bgcolor: '#dcfce7',
                                                    top: 8,
                                                    right: 8,
                                                    border: '3px solid #22c55e',
                                                    animation: 'pulse-dot 1.5s infinite',
                                                    '@keyframes pulse-dot': {
                                                        '0%': { transform: 'scale(1)', opacity: 1 },
                                                        '100%': { transform: 'scale(1.4)', opacity: 0 }
                                                    }
                                                } : {}
                                            }}
                                        >
                                            {vm.power_state === 'on' ? (
                                                <RunningIcon sx={{ fontSize: { xs: 28, sm: 34, md: 40 }, color: '#fff' }} />
                                            ) : (
                                                <StoppedIcon sx={{ fontSize: { xs: 28, sm: 34, md: 40 }, color: '#fff' }} />
                                            )}
                                        </Box>

                                        <Box>
                                            <Typography variant="h4" fontWeight={900} sx={{ mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' } }}>
                                                สถานะระบบ
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: 2, flexWrap: 'wrap' }}>
                                                <Chip
                                                    icon={vm.power_state === 'on' ? <RunningIcon /> : <StoppedIcon />}
                                                    label={vm.power_state === 'on' ? '🚀 กำลังทำงาน' : '⛔ หยุดการทำงาน'}
                                                    size="medium"
                                                    sx={{
                                                        height: { xs: 28, sm: 36, md: 40 },
                                                        fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                                                        fontWeight: 800,
                                                        background: vm.power_state === 'on'
                                                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        color: '#fff',
                                                        px: { xs: 1.5, sm: 2, md: 3 },
                                                        boxShadow: vm.power_state === 'on'
                                                            ? '0 4px 16px rgba(34, 197, 94, 0.3)'
                                                            : '0 4px 16px rgba(239, 68, 68, 0.3)',
                                                        '& .MuiChip-icon': { color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }
                                                    }}
                                                />
                                                <Chip
                                                    label={vm.status || 'Unknown'}
                                                    variant="outlined"
                                                    size="medium"
                                                    sx={{
                                                        fontWeight: 700,
                                                        borderWidth: 2,
                                                        textTransform: 'capitalize'
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' } }}>
                                                {vm.power_state === 'on'
                                                    ? `⏰ ทำงานมาแล้ว: ${formatUptime(realtime?.uptime || vm.uptime_seconds, vm.power_state)}`
                                                    : '💤 ระบบไม่ทำงาน'
                                                }
                                            </Typography>
                                        </Box>
                                    </Box>


                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* System Information Grid */}
                    <Grid item xs={12} lg={8}>
                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                            {/* Core System Info */}
                            <Grid item xs={12}>
                                <Card
                                    sx={{
                                        borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                        background: theme.palette.mode === 'dark'
                                            ? 'linear-gradient(145deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.02) 100%)'
                                            : 'linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.01) 100%)',
                                        border: '1px solid',
                                        borderColor: alpha('#0ea5e9', 0.2),
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: alpha('#0ea5e9', 0.4),
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 12px 24px rgba(14, 165, 233, 0.15)'
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                            px: 3,
                                            py: 2.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: { xs: 1, sm: 1.5, md: 2 }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        >
                                            <InfoIcon sx={{ color: '#fff', fontSize: { xs: 22, sm: 26, md: 32 } }} />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', flex: 1, fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' } }}>
                                            ℹ️ ข้อมูลระบบหลัก
                                        </Typography>
                                    </Box>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ mb: { xs: 2, md: 3 } }}>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="text.secondary"
                                                        sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}
                                                    >
                                                        🔑 VM IDENTIFIER
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.05)',
                                                            px: 2,
                                                            py: 1.5,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            border: '1px solid',
                                                            borderColor: alpha('#0ea5e9', 0.2),
                                                            position: 'relative',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            fontFamily="JetBrains Mono, monospace"
                                                            fontSize={{ xs: '0.65rem', sm: '0.7rem', md: '0.8rem' }}
                                                            sx={{
                                                                wordBreak: 'break-all',
                                                                fontWeight: 600,
                                                                color: '#0ea5e9'
                                                            }}
                                                        >
                                                            {vm.vm_uuid}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Box sx={{ mb: { xs: 2, md: 3 } }}>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="text.secondary"
                                                        sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}
                                                    >
                                                        🏷️ VM NUMBER
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2.125rem' }, wordBreak: 'break-all' }}>
                                                        #{vm.vm_id || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="text.secondary"
                                                        sx={{ mb: { xs: 0.75, sm: 1, md: 1.5 }, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
                                                    >
                                                        🖥️ ระบบปฏิบัติการ
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                background: getOSInfo(vm.os_type, vm.os_name).isWindows
                                                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                                    : getOSInfo(vm.os_type, vm.os_name).icon
                                                                        ? `linear-gradient(135deg, ${getOSInfo(vm.os_type, vm.os_name).color}40 0%, ${getOSInfo(vm.os_type, vm.os_name).color}20 100%)`
                                                                        : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: getOSInfo(vm.os_type, vm.os_name).isWindows ? '#fff' : getOSInfo(vm.os_type, vm.os_name).color,
                                                            }}
                                                        >
                                                            <OSIcon osType={vm.os_type} osName={vm.os_name} size={24} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body1" fontWeight={700}>
                                                                {vm.os_display_name || vm.os_name || vm.os_type || 'ไม่ระบุ'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {vm.os_distribution && `${vm.os_distribution} • `}
                                                                {vm.os_kernel || 'Unknown OS'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="text.secondary"
                                                        sx={{ mb: { xs: 0.75, sm: 1, md: 1.5 }, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
                                                    >
                                                        ⚙️ สถาปัตยกรรม
                                                    </Typography>
                                                    <Chip
                                                        label={vm.os_arch || 'Unknown'}
                                                        size="medium"
                                                        sx={{
                                                            height: 36,
                                                            fontWeight: 800,
                                                            fontSize: '0.9rem',
                                                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                                                            color: '#8b5cf6',
                                                            border: '2px solid rgba(139, 92, 246, 0.3)',
                                                            px: 2
                                                        }}
                                                    />
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Network & Security Info */}
                            <Grid item xs={12}>
                                <Card
                                    sx={{
                                        borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                        background: theme.palette.mode === 'dark'
                                            ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
                                            : 'linear-gradient(145deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.01) 100%)',
                                        border: '1px solid',
                                        borderColor: alpha('#22c55e', 0.2),
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: alpha('#22c55e', 0.4),
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 12px 24px rgba(34, 197, 94, 0.15)'
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            px: 3,
                                            py: 2.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: { xs: 1, sm: 1.5, md: 2 }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        >
                                            <NetworkIcon sx={{ color: '#fff', fontSize: 32 }} />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                            🌐 เครือข่ายและความปลอดภัย
                                        </Typography>
                                    </Box>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mx: 'auto',
                                                            mb: 2,
                                                            boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)'
                                                        }}
                                                    >
                                                        <Typography variant="h6" sx={{ color: '#fff' }}>🌐</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                        IP ADDRESS
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight={700} fontFamily="monospace">
                                                        {vm.ip_address || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mx: 'auto',
                                                            mb: 2,
                                                            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
                                                        }}
                                                    >
                                                        <Typography variant="h6" sx={{ color: '#fff' }}>🔗</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                        MAC ADDRESS
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} fontFamily="monospace" fontSize="0.75rem">
                                                        {vm.mac_address || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: '50%',
                                                            background: vm.in_protection
                                                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mx: 'auto',
                                                            mb: 2,
                                                            boxShadow: vm.in_protection
                                                                ? '0 8px 24px rgba(34, 197, 94, 0.3)'
                                                                : '0 8px 24px rgba(239, 68, 68, 0.3)'
                                                        }}
                                                    >
                                                        <ShieldIcon sx={{ color: '#fff', fontSize: 32 }} />
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                        PROTECTION
                                                    </Typography>
                                                    <Chip
                                                        label={vm.in_protection ? '🛡️ Protected' : '❌ Unprotected'}
                                                        color={vm.in_protection ? 'success' : 'error'}
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </Box>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mx: 'auto',
                                                            mb: 2,
                                                            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
                                                        }}
                                                    >
                                                        <Typography variant="h6" sx={{ color: '#fff' }}>⏰</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                        EXPIRY
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} color={vm.expire_time === 'unlimited' ? 'success.main' : 'warning.main'}>
                                                        {vm.expire_time === 'unlimited' ? '♾️ Unlimited' : vm.expire_time || 'ไม่ระบุ'}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Location & Management Sidebar */}
                    <Grid item xs={12} lg={4}>
                        <Card
                            sx={{
                                height: '100%',
                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                background: theme.palette.mode === 'dark'
                                    ? 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)'
                                    : 'linear-gradient(145deg, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.01) 100%)',
                                border: '1px solid',
                                borderColor: alpha('#8b5cf6', 0.2),
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: alpha('#8b5cf6', 0.4),
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 12px 24px rgba(139, 92, 246, 0.15)'
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    px: 3,
                                    py: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: { xs: 1, sm: 1.5, md: 2 }
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    <DnsIcon sx={{ color: '#fff', fontSize: 32 }} />
                                </Box>
                                <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                    📍 ตำแหน่งและการจัดการ
                                </Typography>
                            </Box>
                            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            🌍 AVAILABILITY ZONE
                                        </Typography>
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                                                border: '2px solid rgba(34, 197, 94, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: { xs: 1, sm: 1.5, md: 2 }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    bgcolor: '#22c55e',
                                                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                                    animation: 'pulse 2s infinite',
                                                    '@keyframes pulse': {
                                                        '0%': { opacity: 1 },
                                                        '50%': { opacity: 0.5 },
                                                        '100%': { opacity: 1 }
                                                    }
                                                }}
                                            />
                                            <Typography variant="body1" fontWeight={700} color="#22c55e">
                                                {vm.az_name || 'Non-specified'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            🖥️ HOST SERVER
                                        </Typography>
                                        <Typography variant="h6" fontWeight={800}>
                                            {vm.host_name || 'N/A'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            📁 VM GROUP
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600}>
                                            {vm.group_name_path || vm.group_name || 'No group assigned'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            🏗️ PROJECT
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600}>
                                            {vm.project_name || 'Default project'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            👤 OWNER
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box
                                                sx={{
                                                    width: { xs: 32, sm: 36, md: 40 },
                                                    height: { xs: 32, sm: 36, md: 40 },
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 700,
                                                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                                                }}
                                            >
                                                👤
                                            </Box>
                                            <Typography variant="body1" fontWeight={700}>
                                                {vm.user_name || 'Unknown User'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
