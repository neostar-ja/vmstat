import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    Fade,
    alpha,
} from '@mui/material';
import {
    NetworkCheck as NetworkIcon,
    Dns as DnsIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { formatNetworkSpeed } from '../helpers';
import type { Tab4Props } from '../types';

export default function Tab4Network(props: Tab4Props) {
    const { vm, theme, networksLoading, networks } = props;

    return (
        <Box>
            {networksLoading && (
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
                                background: 'conic-gradient(from 0deg, transparent, rgba(34, 197, 94, 0.4), rgba(16, 185, 129, 0.4), transparent)',
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
                                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
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
                                    color: '#22c55e',
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
                                    background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #14b8a6 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 1
                                }}
                            >
                                🌐 กำลังโหลดข้อมูลเครือข่าย...
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                กำลังดึงข้อมูล Network Interfaces
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}
            {!networksLoading && (
                <>
                    {/* Network Overview Hero Cards */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                        {/* Primary Network Info Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#22c55e', 0.12)} 0%, ${alpha('#22c55e', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#22c55e', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#22c55e', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#22c55e', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 3 } }}>
                                        <Box
                                            sx={{
                                                width: { xs: 40, sm: 44, md: 48 },
                                                height: { xs: 40, sm: 44, md: 48 },
                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#22c55e', 0.3)}`
                                            }}
                                        >
                                            <NetworkIcon sx={{ fontSize: { xs: 22, sm: 25, md: 28 }, color: '#22c55e' }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                🌐 IP Address
                                            </Typography>
                                            <Typography variant="h6" fontWeight={900} color="#22c55e" sx={{ lineHeight: 1.2, fontFamily: 'monospace', fontSize: { xs: '0.9rem', sm: '1rem', md: '1.125rem' } }}>
                                                {vm.ip_address || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            p: { xs: 1.5, md: 2 },
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            bgcolor: alpha('#22c55e', 0.08),
                                            border: `1px solid ${alpha('#22c55e', 0.2)}`
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                            📱 MAC Address
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700} color="#22c55e" sx={{ fontFamily: 'monospace', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                                            {vm.mac_address || 'N/A'}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Network Name Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#10b981', 0.12)} 0%, ${alpha('#10b981', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#10b981', 0.08)} 0%, ${alpha('#10b981', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#10b981', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #10b981 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#10b981', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#10b981', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                            background: `linear-gradient(135deg, ${alpha('#10b981', 0.2)} 0%, ${alpha('#10b981', 0.1)} 100%)`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `2px solid ${alpha('#10b981', 0.3)}`,
                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                        }}
                                    >
                                        <DnsIcon sx={{ fontSize: 32, color: '#10b981' }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                        📡 Primary Network
                                    </Typography>
                                    <Typography variant="h6" fontWeight={900} color="#10b981" sx={{ mb: 2 }}>
                                        {vm.primary_network_name || 'Default Network'}
                                    </Typography>
                                    <Chip
                                        label={`${networks.length} Interface${networks.length !== 1 ? 's' : ''}`}
                                        sx={{
                                            fontWeight: 800,
                                            background: alpha('#10b981', 0.15),
                                            color: '#10b981',
                                            border: `1px solid ${alpha('#10b981', 0.3)}`
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Download Speed Card */}
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
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                            background: `linear-gradient(135deg, ${alpha('#14b8a6', 0.2)} 0%, ${alpha('#14b8a6', 0.1)} 100%)`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `2px solid ${alpha('#14b8a6', 0.3)}`,
                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                        }}
                                    >
                                        <Typography variant="h4" fontWeight={900} color="#14b8a6">
                                            ↓
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                        📥 Download
                                    </Typography>
                                    <Typography variant="h5" fontWeight={900} color="#14b8a6" sx={{ lineHeight: 1 }}>
                                        {formatNetworkSpeed(vm.network_read_bitps)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Upload Speed Card */}
                        <Grid item xs={12} md={6} lg={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#059669', 0.12)} 0%, ${alpha('#059669', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#059669', 0.08)} 0%, ${alpha('#059669', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#059669', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #059669 0%, #047857 50%, #059669 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#059669', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#059669', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                            background: `linear-gradient(135deg, ${alpha('#059669', 0.2)} 0%, ${alpha('#059669', 0.1)} 100%)`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `2px solid ${alpha('#059669', 0.3)}`,
                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                        }}
                                    >
                                        <Typography variant="h4" fontWeight={900} color="#059669">
                                            ↑
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                        📤 Upload
                                    </Typography>
                                    <Typography variant="h5" fontWeight={900} color="#059669" sx={{ lineHeight: 1 }}>
                                        {formatNetworkSpeed(vm.network_write_bitps)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Network Interfaces - Modern Professional Cards */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                        background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#22c55e', 0.3)}`
                                    }}
                                >
                                    <NetworkIcon sx={{ fontSize: 26, color: '#22c55e' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={900}>
                                        🌐 Network Interfaces
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        รายละเอียดการ์ดเครือข่ายทั้งหมด
                                    </Typography>
                                </Box>
                            </Box>
                            <Chip
                                label={`${networks.length} Interface${networks.length !== 1 ? 's' : ''}`}
                                sx={{
                                    height: 36,
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                                    color: '#fff',
                                    px: 2,
                                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)'
                                }}
                            />
                        </Box>

                        {networks.length === 0 ? (
                            <Box sx={{ p: 4 }}>
                                <Alert
                                    severity="info"
                                    sx={{
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        '& .MuiAlert-icon': { fontSize: 28 }
                                    }}
                                >
                                    <Typography fontWeight={700}>ไม่พบข้อมูลการ์ดเครือข่าย</Typography>
                                    <Typography variant="body2">กรุณาเปิดใช้งาน Sync เพื่อดึงข้อมูล Network Interfaces</Typography>
                                </Alert>
                            </Box>
                        ) : (
                            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                {networks.map((net, index) => (
                                    <Grid item xs={12} key={net.vif_id}>
                                        <Card
                                            sx={{
                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: net.is_connected
                                                    ? theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#22c55e', 0.05)} 0%, ${alpha('#22c55e', 0.01)} 100%)`
                                                    : theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#94a3b8', 0.08)} 0%, ${alpha('#94a3b8', 0.02)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#94a3b8', 0.05)} 0%, ${alpha('#94a3b8', 0.01)} 100%)`,
                                                border: '2px solid',
                                                borderColor: net.is_connected ? alpha('#22c55e', 0.3) : alpha('#94a3b8', 0.2),
                                                transition: 'all 0.3s ease',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: 5,
                                                    background: net.is_connected
                                                        ? 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)'
                                                        : 'linear-gradient(90deg, #94a3b8 0%, #64748b 50%, #94a3b8 100%)',
                                                    backgroundSize: '200% 100%',
                                                    animation: net.is_connected ? 'shimmer 3s linear infinite' : 'none',
                                                },
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    borderColor: net.is_connected ? alpha('#22c55e', 0.5) : alpha('#94a3b8', 0.4),
                                                    boxShadow: net.is_connected
                                                        ? '0 12px 24px rgba(34, 197, 94, 0.2)'
                                                        : '0 12px 24px rgba(0, 0, 0, 0.1)',
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                                {/* Header */}
                                                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 3, pb: 3, gap: { xs: 1.5, sm: 0 }, borderBottom: `2px solid ${alpha(net.is_connected ? '#22c55e' : '#94a3b8', 0.1)}` }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 56,
                                                                height: 56,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: net.is_connected
                                                                    ? `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`
                                                                    : `linear-gradient(135deg, ${alpha('#94a3b8', 0.2)} 0%, ${alpha('#94a3b8', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha(net.is_connected ? '#22c55e' : '#94a3b8', 0.3)}`,
                                                                position: 'relative',
                                                                '&::after': net.is_connected ? {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    width: 12,
                                                                    height: 12,
                                                                    borderRadius: '50%',
                                                                    background: '#22c55e',
                                                                    top: -2,
                                                                    right: -2,
                                                                    border: '2px solid',
                                                                    borderColor: theme.palette.background.paper,
                                                                    boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
                                                                    animation: 'pulse 2s ease-in-out infinite',
                                                                    '@keyframes pulse': {
                                                                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                                        '50%': { opacity: 0.7, transform: 'scale(1.1)' }
                                                                    }
                                                                } : {}
                                                            }}
                                                        >
                                                            <NetworkIcon sx={{ fontSize: 32, color: net.is_connected ? '#22c55e' : '#94a3b8' }} />
                                                        </Box>
                                                        <Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <Typography variant="h5" fontWeight={900} color={net.is_connected ? '#22c55e' : '#94a3b8'}>
                                                                    {net.network_name || 'Unknown Network'}
                                                                </Typography>
                                                                {index === 0 && (
                                                                    <Chip
                                                                        label="Primary"
                                                                        size="small"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 800,
                                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                            color: '#fff'
                                                                        }}
                                                                    />
                                                                )}
                                                            </Box>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                                VIF: {net.vif_id}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        {net.model && (
                                                            <Chip
                                                                label={net.model}
                                                                sx={{
                                                                    height: 32,
                                                                    fontWeight: 700,
                                                                    background: alpha('#3b82f6', 0.15),
                                                                    color: '#3b82f6',
                                                                    border: `1px solid ${alpha('#3b82f6', 0.3)}`
                                                                }}
                                                            />
                                                        )}
                                                        <Chip
                                                            label={net.is_connected ? '✓ Connected' : '✗ Disconnected'}
                                                            sx={{
                                                                height: 32,
                                                                fontWeight: 800,
                                                                background: net.is_connected
                                                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                    : alpha('#94a3b8', 0.15),
                                                                color: net.is_connected ? '#fff' : '#64748b',
                                                                border: net.is_connected ? 'none' : `1px solid ${alpha('#94a3b8', 0.3)}`,
                                                                boxShadow: net.is_connected ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none'
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>

                                                {/* Details Grid */}
                                                <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                                    {/* IP Addressing */}
                                                    <Grid item xs={12} md={4}>
                                                        <Card
                                                            sx={{
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: theme.palette.mode === 'dark'
                                                                    ? alpha('#22c55e', 0.05)
                                                                    : alpha('#22c55e', 0.03),
                                                                border: `1px solid ${alpha('#22c55e', 0.15)}`,
                                                                transition: 'all 0.2s',
                                                                '&:hover': {
                                                                    borderColor: alpha('#22c55e', 0.3),
                                                                    transform: 'translateX(4px)'
                                                                }
                                                            }}
                                                        >
                                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                                    <DnsIcon sx={{ fontSize: 20, color: '#22c55e' }} />
                                                                    <Typography variant="subtitle2" fontWeight={800} color="#22c55e">
                                                                        🌐 IP Addressing
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            📍 IPv4 Address
                                                                        </Typography>
                                                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="#22c55e">
                                                                            {net.ip_address || '-'}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            📍 IPv6 Address
                                                                        </Typography>
                                                                        <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" color="text.secondary">
                                                                            {net.ipv6_address || 'Not configured'}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            📱 MAC Address
                                                                        </Typography>
                                                                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                                                            {net.mac_address || '-'}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>

                                                    {/* Subnet & VPC */}
                                                    <Grid item xs={12} md={4}>
                                                        <Card
                                                            sx={{
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: theme.palette.mode === 'dark'
                                                                    ? alpha('#10b981', 0.05)
                                                                    : alpha('#10b981', 0.03),
                                                                border: `1px solid ${alpha('#10b981', 0.15)}`,
                                                                transition: 'all 0.2s',
                                                                '&:hover': {
                                                                    borderColor: alpha('#10b981', 0.3),
                                                                    transform: 'translateX(4px)'
                                                                }
                                                            }}
                                                        >
                                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                                    <NetworkIcon sx={{ fontSize: 20, color: '#10b981' }} />
                                                                    <Typography variant="subtitle2" fontWeight={800} color="#10b981">
                                                                        🔌 Subnet & VPC
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            🌐 Subnet Name
                                                                        </Typography>
                                                                        <Typography variant="body2" fontWeight={700} color="#10b981">
                                                                            {net.subnet_name || 'Not assigned'}
                                                                        </Typography>
                                                                        {net.cidr && (
                                                                            <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontWeight={600}>
                                                                                CIDR: {net.cidr}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            ☁️ VPC Name
                                                                        </Typography>
                                                                        <Typography variant="body2" fontWeight={700} color="#10b981">
                                                                            {net.vpc_name || 'Default VPC'}
                                                                        </Typography>
                                                                        {net.vpc_id && (
                                                                            <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontSize="0.7rem" sx={{ wordBreak: 'break-all' }}>
                                                                                ID: {net.vpc_id}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>

                                                    {/* Routing & Device */}
                                                    <Grid item xs={12} md={4}>
                                                        <Card
                                                            sx={{
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: theme.palette.mode === 'dark'
                                                                    ? alpha('#14b8a6', 0.05)
                                                                    : alpha('#14b8a6', 0.03),
                                                                border: `1px solid ${alpha('#14b8a6', 0.15)}`,
                                                                transition: 'all 0.2s',
                                                                '&:hover': {
                                                                    borderColor: alpha('#14b8a6', 0.3),
                                                                    transform: 'translateX(4px)'
                                                                }
                                                            }}
                                                        >
                                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                                    <InfoIcon sx={{ fontSize: 20, color: '#14b8a6' }} />
                                                                    <Typography variant="subtitle2" fontWeight={800} color="#14b8a6">
                                                                        🛣️ Routing & Device
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            🚪 Gateway
                                                                        </Typography>
                                                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="#14b8a6">
                                                                            {net.gateway || 'Not set'}
                                                                        </Typography>
                                                                    </Box>
                                                                    {net.custom_gateway && (
                                                                        <Box>
                                                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                🔧 Custom Gateway
                                                                            </Typography>
                                                                            <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="#14b8a6">
                                                                                {net.custom_gateway}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    <Box>
                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                            🔌 Device ID
                                                                        </Typography>
                                                                        <Typography variant="body2" fontFamily="monospace" fontSize="0.7rem" sx={{ wordBreak: 'break-all' }} color="text.secondary">
                                                                            {net.device_id || 'No device'}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                </>
            )}
        </Box>
    );
}
