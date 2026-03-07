import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TableHead,
    Alert,
    CircularProgress,
    Fade,
    alpha,
} from '@mui/material';
import {
    Storage as StorageIcon,
    AccessTime as UptimeIcon,
    CalendarToday as CalendarIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { formatBytes, formatPercent, normalizePercent } from '../helpers';
import type { Tab3Props } from '../types';

export default function Tab3Storage(props: Tab3Props) {
    const { vm, theme, disksLoading, metricsLoading, disks, chartData, storageGrowth } = props;

    return (
        <Box>
            {disksLoading && (
                <Fade in={true}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            py: 10,
                            gap: 3,
                            position: 'relative',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                width: 240,
                                height: 240,
                                borderRadius: '50%',
                                background: 'conic-gradient(from 0deg, transparent, rgba(6, 182, 212, 0.4), rgba(14, 165, 233, 0.4), transparent)',
                                animation: 'rotate 3s linear infinite',
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
                                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
                                borderRadius: '50%',
                                p: 5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CircularProgress
                                size={90}
                                thickness={2.5}
                                sx={{
                                    color: '#06b6d4',
                                    '& .MuiCircularProgress-circle': {
                                        strokeLinecap: 'round',
                                    },
                                }}
                            />
                        </Box>
                        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                            <Typography
                                variant="h5"
                                fontWeight={900}
                                sx={{
                                    background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #14b8a6 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 1
                                }}
                            >
                                💾 กำลังโหลดข้อมูล Storage...
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                กำลังดึงข้อมูลที่เก็บข้อมูลและดิสก์
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}
            {!disksLoading && (
                <>
                    {/* Hero Overview Cards */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                        {/* Storage Usage Gauge Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#06b6d4', 0.12)} 0%, ${alpha('#06b6d4', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#06b6d4', 0.08)} 0%, ${alpha('#06b6d4', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#06b6d4', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #06b6d4 0%, #0ea5e9 50%, #06b6d4 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#06b6d4', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#06b6d4', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, textAlign: 'center' }}>
                                    <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                        <Box
                                            sx={{
                                                width: { xs: 40, sm: 44, md: 48 },
                                                height: { xs: 40, sm: 44, md: 48 },
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: `linear-gradient(135deg, ${alpha('#06b6d4', 0.2)} 0%, ${alpha('#06b6d4', 0.1)} 100%)`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#06b6d4', 0.3)}`,
                                                mb: { xs: 1.5, md: 2 }
                                            }}
                                        >
                                            <StorageIcon sx={{ fontSize: { xs: 22, sm: 25, md: 28 }, color: '#06b6d4' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                            💾 การใช้พื้นที่
                                        </Typography>
                                    </Box>

                                    {/* Circular Gauge */}
                                    <Box sx={{ display: 'flex', justifyContent: 'center', my: { xs: 2, sm: 2.5, md: 3 } }}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                width: { xs: 110, sm: 125, md: 140 },
                                                height: { xs: 110, sm: 125, md: 140 },
                                                borderRadius: '50%',
                                                background: `conic-gradient(
                                                                    ${normalizePercent(vm.storage_usage || 0) > 90 ? '#ef4444' : normalizePercent(vm.storage_usage || 0) > 80 ? '#f97316' : '#06b6d4'} 0deg,
                                                                    ${normalizePercent(vm.storage_usage || 0) > 90 ? '#dc2626' : normalizePercent(vm.storage_usage || 0) > 80 ? '#ea580c' : '#0ea5e9'} ${normalizePercent(vm.storage_usage || 0) * 3.6}deg,
                                                                    ${alpha('#06b6d4', 0.1)} ${normalizePercent(vm.storage_usage || 0) * 3.6}deg
                                                                )`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: `0 8px 32px ${alpha('#06b6d4', 0.3)}`,
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    width: '88%',
                                                    height: '88%',
                                                    borderRadius: '50%',
                                                    background: theme.palette.background.paper,
                                                }
                                            }}
                                        >
                                            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                                                <Typography variant="h3" fontWeight={900} color="#06b6d4" sx={{ lineHeight: 1, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}>
                                                    {normalizePercent(vm.storage_usage || 0).toFixed(1)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                    % ใช้งาน
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Box sx={{ mt: { xs: 1.5, md: 2 } }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                            {formatBytes(vm.storage_used_mb)} / {formatBytes(vm.storage_total_mb)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Growth Rate Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: storageGrowth.trend === 'increasing'
                                        ? theme.palette.mode === 'dark'
                                            ? `linear-gradient(145deg, ${alpha('#f97316', 0.12)} 0%, ${alpha('#f97316', 0.04)} 100%)`
                                            : `linear-gradient(145deg, ${alpha('#f97316', 0.08)} 0%, ${alpha('#f97316', 0.02)} 100%)`
                                        : theme.palette.mode === 'dark'
                                            ? `linear-gradient(145deg, ${alpha('#22c55e', 0.12)} 0%, ${alpha('#22c55e', 0.04)} 100%)`
                                            : `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: storageGrowth.trend === 'increasing' ? alpha('#f97316', 0.2) : alpha('#22c55e', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: storageGrowth.trend === 'increasing'
                                            ? 'linear-gradient(90deg, #f97316 0%, #ea580c 50%, #f97316 100%)'
                                            : 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: storageGrowth.trend === 'increasing' ? alpha('#f97316', 0.5) : alpha('#22c55e', 0.5),
                                        boxShadow: storageGrowth.trend === 'increasing'
                                            ? `0 20px 48px -12px ${alpha('#f97316', 0.5)}`
                                            : `0 20px 48px -12px ${alpha('#22c55e', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                    <Box sx={{ mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: storageGrowth.trend === 'increasing'
                                                    ? `linear-gradient(135deg, ${alpha('#f97316', 0.2)} 0%, ${alpha('#f97316', 0.1)} 100%)`
                                                    : `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${storageGrowth.trend === 'increasing' ? alpha('#f97316', 0.3) : alpha('#22c55e', 0.3)}`,
                                                mb: { xs: 1, sm: 1.5, md: 2 }
                                            }}
                                        >
                                            <TrendingUpIcon sx={{ fontSize: 28, color: storageGrowth.trend === 'increasing' ? '#f97316' : '#22c55e' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                            📈 อัตราการเติบโต
                                        </Typography>
                                    </Box>

                                    <Typography
                                        variant="h3"
                                        fontWeight={900}
                                        color={storageGrowth.trend === 'increasing' ? '#f97316' : '#22c55e'}
                                        sx={{ my: 3, lineHeight: 1 }}
                                    >
                                        {storageGrowth.perDay > 0 ? '+' : ''}{(storageGrowth.perDay / 1024).toFixed(2)}
                                    </Typography>
                                    <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
                                        GB / วัน
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                                        รวม: {storageGrowth.rate > 0 ? '+' : ''}{formatBytes(storageGrowth.rate)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        ในช่วงเวลาที่เลือก
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Runway Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#8b5cf6', 0.12)} 0%, ${alpha('#8b5cf6', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#8b5cf6', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #8b5cf6 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#8b5cf6', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#8b5cf6', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                    <Box sx={{ mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#8b5cf6', 0.3)}`,
                                                mb: { xs: 1, sm: 1.5, md: 2 }
                                            }}
                                        >
                                            <UptimeIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                            ⏰ Runway
                                        </Typography>
                                    </Box>

                                    {(() => {
                                        const freeMB = (vm.storage_total_mb || 0) - (vm.storage_used_mb || 0);
                                        const daysToFull = storageGrowth.perDay > 0 ? freeMB / storageGrowth.perDay : null;
                                        const fullDate = daysToFull && daysToFull > 0 ? new Date(Date.now() + daysToFull * 86400000) : null;

                                        if (!daysToFull || daysToFull <= 0 || storageGrowth.perDay <= 0) {
                                            return (
                                                <>
                                                    <Typography variant="h2" fontWeight={900} color="#22c55e" sx={{ my: 3, lineHeight: 1 }}>
                                                        ♾️
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                                        ไม่จำกัด
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        พื้นที่เพียงพอ
                                                    </Typography>
                                                </>
                                            );
                                        }

                                        const daysInt = Math.floor(daysToFull);
                                        const urgencyColor = daysInt < 30 ? '#ef4444' : daysInt < 90 ? '#f97316' : '#22c55e';

                                        return (
                                            <>
                                                <Typography variant="h3" fontWeight={900} color={urgencyColor} sx={{ my: 3, lineHeight: 1 }}>
                                                    ~{daysInt}
                                                </Typography>
                                                <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                                    วัน
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                                                    คาดว่าเต็ม:
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                    {fullDate?.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Typography>
                                            </>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Datastore Info Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#14b8a6', 0.12)} 0%, ${alpha('#14b8a6', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#14b8a6', 0.08)} 0%, ${alpha('#14b8a6', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#14b8a6', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #14b8a6 0%, #0d9488 50%, #14b8a6 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#14b8a6', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#14b8a6', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: `linear-gradient(135deg, ${alpha('#14b8a6', 0.2)} 0%, ${alpha('#14b8a6', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#14b8a6', 0.3)}`
                                            }}
                                        >
                                            <StorageIcon sx={{ fontSize: 28, color: '#14b8a6' }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                                🗄️ Datastore
                                            </Typography>
                                            <Typography variant="h6" fontWeight={900} color="#14b8a6" sx={{ lineHeight: 1.2 }}>
                                                {vm.storage_name || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            bgcolor: alpha('#14b8a6', 0.08),
                                            border: `1px solid ${alpha('#14b8a6', 0.2)}`,
                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                            🆓 พื้นที่ว่าง
                                        </Typography>
                                        <Typography variant="h5" fontWeight={800} color="#14b8a6">
                                            {formatBytes((vm.storage_total_mb || 0) - (vm.storage_used_mb || 0))}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            ({(100 - normalizePercent(vm.storage_usage || 0)).toFixed(1)}% Available)
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            bgcolor: alpha('#14b8a6', 0.05),
                                            border: `1px solid ${alpha('#14b8a6', 0.15)}`
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}>
                                            ID: {vm.storage_id || '-'}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Detailed Storage Statistics */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                        {/* Storage Overview Details */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.06) 0%, rgba(6, 182, 212, 0.01) 100%)'
                                        : 'linear-gradient(145deg, rgba(6, 182, 212, 0.04) 0%, rgba(6, 182, 212, 0.01) 100%)',
                                    border: '1px solid',
                                    borderColor: alpha('#06b6d4', 0.15),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#06b6d4', 0.3),
                                        boxShadow: '0 12px 24px rgba(6, 182, 212, 0.15)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
                                        px: 3,
                                        py: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: { xs: 1, sm: 1.5, md: 2 }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: { xs: 32, sm: 36, md: 40 },
                                            height: { xs: 32, sm: 36, md: 40 },
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    >
                                        <StorageIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                        💾 ภาพรวม Storage
                                    </Typography>
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {[
                                            { label: '📦 พื้นที่รวม', value: formatBytes(vm.storage_total_mb), icon: '📦' },
                                            { label: '💿 ใช้งานแล้ว', value: formatBytes(vm.storage_used_mb), icon: '💿' },
                                            { label: '🆓 พื้นที่ว่าง', value: formatBytes((vm.storage_total_mb || 0) - (vm.storage_used_mb || 0)), icon: '🆓' },
                                            { label: '📊 สัดส่วนการใช้', value: formatPercent(vm.storage_usage), icon: '📊' },
                                        ].map((item, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 2,
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    bgcolor: alpha('#06b6d4', 0.05),
                                                    border: `1px solid ${alpha('#06b6d4', 0.1)}`,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: alpha('#06b6d4', 0.1),
                                                        borderColor: alpha('#06b6d4', 0.2),
                                                        transform: 'translateX(4px)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="body1" fontWeight={800} color="#06b6d4">
                                                    {item.value}
                                                </Typography>
                                            </Box>
                                        ))}

                                        {/* Progress Bar */}
                                        <Box sx={{ mt: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                    การใช้พื้นที่
                                                </Typography>
                                                <Typography variant="caption" color="#06b6d4" fontWeight={800}>
                                                    {normalizePercent(vm.storage_usage || 0).toFixed(1)}%
                                                </Typography>
                                            </Box>
                                            <Box sx={{ position: 'relative', height: 16, borderRadius: 3, bgcolor: alpha('#06b6d4', 0.15), overflow: 'hidden' }}>
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        height: '100%',
                                                        width: `${normalizePercent(vm.storage_usage || 0)}%`,
                                                        background: 'linear-gradient(90deg, #06b6d4 0%, #0ea5e9 100%)',
                                                        transition: 'width 1s ease',
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Disk Configuration Summary */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.01) 100%)'
                                        : 'linear-gradient(145deg, rgba(14, 165, 233, 0.04) 0%, rgba(14, 165, 233, 0.01) 100%)',
                                    border: '1px solid',
                                    borderColor: alpha('#0ea5e9', 0.15),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#0ea5e9', 0.3),
                                        boxShadow: '0 12px 24px rgba(14, 165, 233, 0.15)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                                        px: 3,
                                        py: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: { xs: 1, sm: 1.5, md: 2 }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: { xs: 32, sm: 36, md: 40 },
                                            height: { xs: 32, sm: 36, md: 40 },
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    >
                                        <StorageIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                        🔧 Disk Configuration
                                    </Typography>
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {[
                                            { label: '💿 จำนวน Disks', value: `${disks.length} Disk${disks.length !== 1 ? 's' : ''}`, icon: '💿' },
                                            { label: '📦 ขนาดรวม', value: formatBytes(disks.reduce((sum, d) => sum + (d.size_mb || 0), 0)), icon: '📦' },
                                            { label: '🗄️ Datastore', value: vm.storage_name || 'N/A', icon: '🗄️' },
                                            { label: '🆔 Storage ID', value: vm.storage_id ? `${vm.storage_id.substring(0, 16)}...` : 'N/A', icon: '🆔' },
                                        ].map((item, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 2,
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    bgcolor: alpha('#0ea5e9', 0.05),
                                                    border: `1px solid ${alpha('#0ea5e9', 0.1)}`,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: alpha('#0ea5e9', 0.1),
                                                        borderColor: alpha('#0ea5e9', 0.2),
                                                        transform: 'translateX(4px)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                    {item.label}
                                                </Typography>
                                                <Typography
                                                    variant="body1"
                                                    fontWeight={800}
                                                    color="#0ea5e9"
                                                    sx={{
                                                        maxWidth: '60%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {item.value}
                                                </Typography>
                                            </Box>
                                        ))}

                                        {disks.length > 0 && (
                                            <Box
                                                sx={{
                                                    mt: 1,
                                                    p: 2,
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
                                                    border: `1px solid ${alpha('#0ea5e9', 0.3)}`,
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                                    💾 Average Disk Size
                                                </Typography>
                                                <Typography variant="h6" fontWeight={800} color="#0ea5e9">
                                                    {formatBytes(disks.reduce((sum, d) => sum + (d.size_mb || 0), 0) / disks.length)}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Storage Usage History  - Enhanced Modern Chart */}
                    <Card
                        sx={{
                            mb: 4,
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            overflow: 'hidden',
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.06) 0%, rgba(6, 182, 212, 0.01) 100%)'
                                : 'linear-gradient(145deg, rgba(6, 182, 212, 0.04) 0%, rgba(6, 182, 212, 0.01) 100%)',
                            border: '1px solid',
                            borderColor: alpha('#06b6d4', 0.15),
                        }}
                    >
                        <Box
                            sx={{
                                background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
                                px: 3,
                                py: 2.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: { xs: 1, sm: 1.5, md: 2 }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <CalendarIcon sx={{ color: '#fff', fontSize: 26 }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                                    📊 ประวัติการใช้งาน Storage
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                                    7 วันล่าสุด - รายละเอียดและการเปลี่ยนแปลง
                                </Typography>
                            </Box>
                        </Box>
                        {metricsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                                <CircularProgress size={60} thickness={3} sx={{ color: '#06b6d4' }} />
                            </Box>
                        ) : chartData.length === 0 ? (
                            <Box sx={{ p: 4 }}>
                                <Alert
                                    severity="info"
                                    sx={{
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        '& .MuiAlert-icon': { fontSize: 28 }
                                    }}
                                >
                                    <Typography fontWeight={700}>ไม่มีข้อมูลประวัติการใช้งาน</Typography>
                                    <Typography variant="body2">กรุณารอให้ระบบเก็บข้อมูลเพิ่มเติม</Typography>
                                </Alert>
                            </Box>
                        ) : (() => {
                            // จัดกลุ่มข้อมูลตามวัน (เอาวันสุดท้ายของแต่ละวัน)
                            const dailyData: any[] = [];
                            const dateMap = new Map<string, any>();

                            chartData.forEach((item: any) => {
                                const date = new Date(item.timestamp);
                                const dateKey = date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });

                                // เก็บข้อมูลล่าสุดของแต่ละวัน
                                if (!dateMap.has(dateKey) || new Date(item.timestamp) > new Date(dateMap.get(dateKey).timestamp)) {
                                    dateMap.set(dateKey, item);
                                }
                            });

                            // เรียงตามวันที่จากเก่าไปใหม่
                            const sortedDates = Array.from(dateMap.entries())
                                .sort((a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime())
                                .slice(-7); // เอาแค่ 7 วันล่าสุด

                            sortedDates.forEach(([dateKey, item], index) => {
                                const storageTotalMB = vm?.storage_total_mb || 0;
                                const storageUsedMB = item.storageUsedMB || 0;
                                const storageFreeMB = storageTotalMB - storageUsedMB;

                                // คำนวณการเปลี่ยนแปลงจากวันก่อนหน้า (ใช้หน่วย MB)
                                let changeFromPrevDay = 0;
                                let changePercent = 0;
                                if (index > 0) {
                                    const prevDayUsed = sortedDates[index - 1][1].storageUsedMB || 0;
                                    changeFromPrevDay = storageUsedMB - prevDayUsed;
                                    changePercent = prevDayUsed > 0 ? (changeFromPrevDay / prevDayUsed) * 100 : 0;
                                }

                                dailyData.push({
                                    date: new Date(item.timestamp),
                                    dateStr: dateKey,
                                    totalMB: storageTotalMB,
                                    usedMB: storageUsedMB,
                                    freeMB: storageFreeMB,
                                    usedPercent: storageTotalMB > 0 ? (storageUsedMB / storageTotalMB) * 100 : 0,
                                    changeMB: changeFromPrevDay,
                                    changePercent: changePercent
                                });
                            });

                            return (
                                <>
                                    <Box sx={{ overflow: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow
                                                    sx={{
                                                        background: theme.palette.mode === 'dark'
                                                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)'
                                                            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)'
                                                    }}
                                                >
                                                    <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, py: { xs: 1, sm: 1.5, md: 2 }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📅 วันที่</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>💾 ใช้งานแล้ว</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📦 พื้นที่ว่าง</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📊 สัดส่วน</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📈 เปลี่ยนแปลง</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dailyData.map((day, index) => {
                                                    const isToday = new Date().toDateString() === day.date.toDateString();
                                                    const isIncreasing = day.changeMB > 0;
                                                    const isDecreasing = day.changeMB < 0;

                                                    return (
                                                        <TableRow
                                                            key={index}
                                                            hover
                                                            sx={{
                                                                bgcolor: isToday ? 'rgba(14, 165, 233, 0.05)' : 'inherit',
                                                                '&:hover': {
                                                                    bgcolor: 'action.hover',
                                                                    transform: 'scale(1.001)',
                                                                    transition: 'all 0.2s ease'
                                                                }
                                                            }}
                                                        >
                                                            <TableCell sx={{ py: { xs: 1, sm: 1.5, md: 2 }, px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Typography variant="body2" fontWeight={isToday ? 700 : 500} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                                                                        {day.date.toLocaleDateString('th-TH', {
                                                                            weekday: 'short',
                                                                            day: 'numeric',
                                                                            month: 'short'
                                                                        })}
                                                                    </Typography>
                                                                    {isToday && (
                                                                        <Chip
                                                                            label="วันนี้"
                                                                            size="small"
                                                                            color="primary"
                                                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                                                                    {formatBytes(day.usedMB)}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                                                                    ({day.usedMB.toLocaleString('th-TH', { maximumFractionDigits: 0 })} MB)
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                                                                    {formatBytes(day.freeMB)}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                                                                    ({day.freeMB.toLocaleString('th-TH', { maximumFractionDigits: 0 })} MB)
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                                    <Box
                                                                        sx={{
                                                                            width: { xs: 40, sm: 50, md: 60 },
                                                                            height: 6,
                                                                            bgcolor: 'action.hover',
                                                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                            overflow: 'hidden',
                                                                            position: 'relative'
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                position: 'absolute',
                                                                                left: 0,
                                                                                top: 0,
                                                                                bottom: 0,
                                                                                width: `${day.usedPercent}%`,
                                                                                bgcolor: day.usedPercent > 90 ? 'error.main' :
                                                                                    day.usedPercent > 80 ? 'warning.main' :
                                                                                        'success.main',
                                                                                borderRadius: 3
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                    <Typography variant="body2" fontWeight={600}>
                                                                        {day.usedPercent.toFixed(1)}%
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                {index === 0 ? (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                                        -
                                                                    </Typography>
                                                                ) : (
                                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                        {(() => {
                                                                            const absChange = Math.abs(day.changeMB);
                                                                            const isGB = absChange >= 1024;
                                                                            const changeText = isGB
                                                                                ? `${(absChange / 1024).toFixed(2)} GB`
                                                                                : `${absChange.toLocaleString('th-TH', { maximumFractionDigits: 0 })} MB`;

                                                                            return (
                                                                                <>
                                                                                    <Chip
                                                                                        label={
                                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                                <Typography variant="caption" fontWeight={700}>
                                                                                                    {isIncreasing ? '+' : ''}{changeText}
                                                                                                </Typography>
                                                                                            </Box>
                                                                                        }
                                                                                        size="small"
                                                                                        color={isIncreasing ? 'error' : isDecreasing ? 'success' : 'default'}
                                                                                        icon={isIncreasing ? <TrendingUpIcon fontSize="small" /> :
                                                                                            isDecreasing ? <TrendingUpIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} /> :
                                                                                                undefined}
                                                                                        sx={{
                                                                                            height: 24,
                                                                                            fontWeight: 700,
                                                                                            '& .MuiChip-icon': { fontSize: '1rem' }
                                                                                        }}
                                                                                    />
                                                                                    {Math.abs(day.changePercent) > 0.01 && (
                                                                                        <Typography
                                                                                            variant="caption"
                                                                                            color={isIncreasing ? 'error.main' : isDecreasing ? 'success.main' : 'text.secondary'}
                                                                                            sx={{ mt: 0.5, fontWeight: 600 }}
                                                                                        >
                                                                                            ({isIncreasing ? '+' : ''}{day.changePercent.toFixed(2)}%)
                                                                                        </Typography>
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box >
                                    {
                                        dailyData.length > 0 && (
                                            <Box sx={{
                                                bgcolor: 'action.hover',
                                                px: 3,
                                                py: 2,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: { xs: 1, sm: 1.5, md: 2 }
                                            }}>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        อัตราการเติบโตเฉลี่ย
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="warning.main">
                                                        {storageGrowth.perDay > 0 ? '+' : ''}{(storageGrowth.perDay / 1024).toFixed(2)} GB/วัน
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        การเปลี่ยนแปลงรวม (7 วัน)
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color={storageGrowth.rate > 0 ? 'error.main' : 'success.main'}>
                                                        {storageGrowth.rate > 0 ? '+' : ''}{(storageGrowth.rate / 1024).toFixed(2)} GB
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        ข้อมูลล่าสุด
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {dailyData[dailyData.length - 1].date.toLocaleDateString('th-TH', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )
                                    }
                                </>
                            );
                        })()}
                    </Card>

                    {/* Individual Disks - Modern Professional Table */}
                    <Card
                        sx={{
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            overflow: 'hidden',
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.01) 100%)'
                                : 'linear-gradient(145deg, rgba(14, 165, 233, 0.04) 0%, rgba(14, 165, 233, 0.01) 100%)',
                            border: '1px solid',
                            borderColor: alpha('#0ea5e9', 0.15),
                        }}
                    >
                        <Box
                            sx={{
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                                px: 3,
                                py: 2.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    <StorageIcon sx={{ color: '#fff', fontSize: 26 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                                        💿 Virtual Disks
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                                        รายละเอียดการกำหนดค่าดิสก์แต่ละตัว
                                    </Typography>
                                </Box>
                            </Box>
                            <Chip
                                label={`${disks.length} Disk${disks.length !== 1 ? 's' : ''}`}
                                sx={{
                                    height: 36,
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    background: 'rgba(255, 255, 255, 0.25)',
                                    color: '#fff',
                                    backdropFilter: 'blur(10px)',
                                    px: 2
                                }}
                            />
                        </Box>

                        {disks.length === 0 ? (
                            <Box sx={{ p: 4 }}>
                                <Alert
                                    severity="info"
                                    sx={{
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        '& .MuiAlert-icon': { fontSize: 28 }
                                    }}
                                >
                                    <Typography fontWeight={700}>ไม่พบข้อมูลการกำหนดค่าดิสก์</Typography>
                                    <Typography variant="body2">กรุณาเปิดใช้งาน Sync เพื่อดึงข้อมูล</Typography>
                                </Alert>
                            </Box>
                        ) : (
                            <Box sx={{ overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow
                                            sx={{
                                                background: theme.palette.mode === 'dark'
                                                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)'
                                                    : 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)'
                                            }}
                                        >
                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, py: { xs: 1, sm: 1.5, md: 2 }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>🏷️ Disk ID</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>📁 ไฟล์ดิสก์</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>📊 ขนาด</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>📦 Preallocate</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>🧹 Eagerly Scrub</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {disks.map((disk) => (
                                            <TableRow
                                                key={disk.disk_id}
                                                hover
                                                sx={{
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: alpha('#0ea5e9', 0.08),
                                                        transform: 'scale(1.001)',
                                                    }
                                                }}
                                            >
                                                <TableCell sx={{ py: 2 }}>
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            px: 1.5,
                                                            py: 0.5,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            background: alpha('#0ea5e9', 0.1),
                                                            border: `1px solid ${alpha('#0ea5e9', 0.2)}`
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                fontWeight: 700,
                                                                fontSize: '0.8rem',
                                                                color: '#0ea5e9'
                                                            }}
                                                        >
                                                            {disk.disk_id}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box
                                                        sx={{
                                                            maxWidth: { xs: 120, sm: 200, md: 300 },
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            p: 1,
                                                            borderRadius: 1,
                                                            bgcolor: alpha('#0ea5e9', 0.05)
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight={600}
                                                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                                        >
                                                            {disk.storage_file || '-'}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={formatBytes(disk.size_mb)}
                                                        sx={{
                                                            height: 28,
                                                            fontWeight: 800,
                                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                                                            color: '#fff',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={disk.preallocate || 'metadata'}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            background: disk.preallocate === 'metadata'
                                                                ? alpha('#06b6d4', 0.15)
                                                                : alpha('#0ea5e9', 0.15),
                                                            color: disk.preallocate === 'metadata' ? '#06b6d4' : '#0ea5e9',
                                                            border: `1px solid ${disk.preallocate === 'metadata' ? alpha('#06b6d4', 0.3) : alpha('#0ea5e9', 0.3)}`
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={disk.eagerly_scrub ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            background: disk.eagerly_scrub
                                                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                : alpha('#94a3b8', 0.15),
                                                            color: disk.eagerly_scrub ? '#fff' : '#64748b',
                                                            border: disk.eagerly_scrub ? 'none' : `1px solid ${alpha('#94a3b8', 0.3)}`
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Card>
                </>
            )}
        </Box>
    );
}
