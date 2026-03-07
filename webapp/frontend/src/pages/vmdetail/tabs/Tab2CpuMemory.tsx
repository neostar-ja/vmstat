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
    Memory as MemoryIcon,
    Speed as CpuIcon,
} from '@mui/icons-material';
import { formatBytes, formatBytesWithMB, formatMhz, formatPercent } from '../helpers';
import type { Tab2Props } from '../types';

export default function Tab2CpuMemory(props: Tab2Props) {
    const { vm, theme, vmLoading, currentCpu, currentMemory } = props;

    return (
        <Box>
            {vmLoading && (
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
                                background: 'conic-gradient(from 0deg, transparent, rgba(147, 51, 234, 0.4), rgba(249, 115, 22, 0.4), transparent)',
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
                                background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)',
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
                                    color: '#9333ea',
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
                                    background: 'linear-gradient(135deg, #9333ea 0%, #f97316 50%, #22c55e 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    mb: 1
                                }}
                            >
                                ⚙️ กำลังโหลดข้อมูล CPU & Memory...
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                กำลังประมวลผลข้อมูลทรัพยากร
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}

            {!vmLoading && (
                <>
                    {/* Hero Resource Overview Cards */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                        {/* CPU Overview Hero Card */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#9333ea', 0.12)} 0%, ${alpha('#9333ea', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#9333ea', 0.08)} 0%, ${alpha('#9333ea', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#9333ea', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #9333ea 0%, #c026d3 50%, #9333ea 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                        '@keyframes shimmer': {
                                            '0%': { backgroundPosition: '-200% 0' },
                                            '100%': { backgroundPosition: '200% 0' }
                                        }
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#9333ea', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#9333ea', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box
                                                sx={{
                                                    width: { xs: 48, sm: 52, md: 56 },
                                                    height: { xs: 48, sm: 52, md: 56 },
                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    background: `linear-gradient(135deg, ${alpha('#9333ea', 0.2)} 0%, ${alpha('#9333ea', 0.1)} 100%)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `2px solid ${alpha('#9333ea', 0.3)}`
                                                }}
                                            >
                                                <CpuIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#9333ea' }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                                                    ⚡ CPU Resources
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                    Processor Performance
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip
                                            label={`${currentCpu.toFixed(1)}%`}
                                            sx={{
                                                height: { xs: 32, sm: 36, md: 40 },
                                                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                                                fontWeight: 900,
                                                background: currentCpu > 80
                                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                                    : currentCpu > 60
                                                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                                                        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                color: '#fff',
                                                px: 2,
                                                boxShadow: currentCpu > 80
                                                    ? '0 4px 16px rgba(239, 68, 68, 0.4)'
                                                    : currentCpu > 60
                                                        ? '0 4px 16px rgba(249, 115, 22, 0.4)'
                                                        : '0 4px 16px rgba(34, 197, 94, 0.4)'
                                            }}
                                        />
                                    </Box>

                                    {/* Visual Gauge */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 2, md: 4 } }}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                width: { xs: 140, sm: 160, md: 180 },
                                                height: { xs: 140, sm: 160, md: 180 },
                                                borderRadius: '50%',
                                                background: `conic-gradient(
                                                                    #9333ea 0deg,
                                                                    #c026d3 ${currentCpu * 3.6}deg,
                                                                    ${alpha('#9333ea', 0.1)} ${currentCpu * 3.6}deg
                                                                )`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: `0 8px 32px ${alpha('#9333ea', 0.3)}`,
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    width: '92%',
                                                    height: '92%',
                                                    borderRadius: '50%',
                                                    background: theme.palette.background.paper,
                                                }
                                            }}
                                        >
                                            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                                                <Typography variant="h2" fontWeight={900} color="#9333ea" sx={{ lineHeight: 1 }}>
                                                    {currentCpu.toFixed(1)}
                                                </Typography>
                                                <Typography variant="h6" color="text.secondary" fontWeight={700}>
                                                    % Usage
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* Specifications Grid */}
                                    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                                        <Grid item xs={6}>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    bgcolor: alpha('#9333ea', 0.08),
                                                    border: `1px solid ${alpha('#9333ea', 0.2)}`,
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                                    🔢 Cores
                                                </Typography>
                                                <Typography variant="h4" fontWeight={900} color="#9333ea">
                                                    {vm.cpu_cores || '-'}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    bgcolor: alpha('#9333ea', 0.08),
                                                    border: `1px solid ${alpha('#9333ea', 0.2)}`,
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                                    🎛️ Sockets
                                                </Typography>
                                                <Typography variant="h4" fontWeight={900} color="#9333ea">
                                                    {vm.cpu_sockets || 1}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box
                                                sx={{
                                                    p: 2.5,
                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    bgcolor: alpha('#9333ea', 0.08),
                                                    border: `1px solid ${alpha('#9333ea', 0.2)}`
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                        ⚡ Speed
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} color="#9333ea">
                                                        {formatMhz(vm.cpu_total_mhz)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                        📊 Used
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight={700} color="#9333ea">
                                                        {vm.cpu_used_mhz?.toLocaleString('th-TH') || 0} MHz
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Memory Overview Hero Card */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(145deg, ${alpha('#f97316', 0.12)} 0%, ${alpha('#f97316', 0.04)} 100%)`
                                        : `linear-gradient(145deg, ${alpha('#f97316', 0.08)} 0%, ${alpha('#f97316', 0.02)} 100%)`,
                                    border: '1px solid',
                                    borderColor: alpha('#f97316', 0.2),
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, #f97316 0%, #ea580c 50%, #f97316 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s linear infinite',
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: alpha('#f97316', 0.5),
                                        boxShadow: `0 20px 48px -12px ${alpha('#f97316', 0.5)}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box
                                                sx={{
                                                    width: { xs: 48, sm: 52, md: 56 },
                                                    height: { xs: 48, sm: 52, md: 56 },
                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    background: `linear-gradient(135deg, ${alpha('#f97316', 0.2)} 0%, ${alpha('#f97316', 0.1)} 100%)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `2px solid ${alpha('#f97316', 0.3)}`
                                                }}
                                            >
                                                <MemoryIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#f97316' }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                                                    🧠 Memory Resources
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                    RAM Allocation
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip
                                            label={`${currentMemory.toFixed(1)}%`}
                                            sx={{
                                                height: { xs: 32, sm: 36, md: 40 },
                                                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                                                fontWeight: 900,
                                                background: currentMemory > 80
                                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                                    : currentMemory > 60
                                                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                                                        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                color: '#fff',
                                                px: 2,
                                                boxShadow: currentMemory > 80
                                                    ? '0 4px 16px rgba(239, 68, 68, 0.4)'
                                                    : currentMemory > 60
                                                        ? '0 4px 16px rgba(249, 115, 22, 0.4)'
                                                        : '0 4px 16px rgba(34, 197, 94, 0.4)'
                                            }}
                                        />
                                    </Box>

                                    {/* Visual Gauge */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 2, md: 4 } }}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                width: { xs: 140, sm: 160, md: 180 },
                                                height: { xs: 140, sm: 160, md: 180 },
                                                borderRadius: '50%',
                                                background: `conic-gradient(
                                                                    #f97316 0deg,
                                                                    #ea580c ${currentMemory * 3.6}deg,
                                                                    ${alpha('#f97316', 0.1)} ${currentMemory * 3.6}deg
                                                                )`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: `0 8px 32px ${alpha('#f97316', 0.3)}`,
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    width: '92%',
                                                    height: '92%',
                                                    borderRadius: '50%',
                                                    background: theme.palette.background.paper,
                                                }
                                            }}
                                        >
                                            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                                                <Typography variant="h2" fontWeight={900} color="#f97316" sx={{ lineHeight: 1 }}>
                                                    {currentMemory.toFixed(1)}
                                                </Typography>
                                                <Typography variant="h6" color="text.secondary" fontWeight={700}>
                                                    % Usage
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* Specifications */}
                                    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                                        <Grid item xs={12}>
                                            <Box
                                                sx={{
                                                    p: 2.5,
                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                    bgcolor: alpha('#f97316', 0.08),
                                                    border: `1px solid ${alpha('#f97316', 0.2)}`
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                        💾 Total Memory
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} color="#f97316">
                                                        {formatBytesWithMB(vm.memory_total_mb)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                        📊 Used
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight={700} color="#f97316">
                                                        {formatBytesWithMB(vm.memory_used_mb)}
                                                    </Typography>
                                                </Box>

                                                {/* Progress Bar */}
                                                <Box sx={{ position: 'relative', height: 12, borderRadius: 3, bgcolor: alpha('#f97316', 0.15), overflow: 'hidden' }}>
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            height: '100%',
                                                            width: `${currentMemory}%`,
                                                            background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                                                            transition: 'width 1s ease',
                                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        Free: {formatBytes((vm.memory_total_mb || 0) - (vm.memory_used_mb || 0))}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        {currentMemory.toFixed(1)}% Used
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Detailed Specifications */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                        {/* CPU Details Card */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, rgba(147, 51, 234, 0.06) 0%, rgba(147, 51, 234, 0.01) 100%)'
                                        : 'linear-gradient(145deg, rgba(147, 51, 234, 0.04) 0%, rgba(147, 51, 234, 0.01) 100%)',
                                    border: '1px solid',
                                    borderColor: alpha('#9333ea', 0.15),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#9333ea', 0.3),
                                        boxShadow: '0 12px 24px rgba(147, 51, 234, 0.15)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
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
                                        <CpuIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                        🔧 CPU Specifications
                                    </Typography>
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {[
                                            { label: '🔢 Total Cores', value: vm.cpu_cores || '-', icon: '🔢' },
                                            { label: '🎛️ Number of Sockets', value: vm.cpu_sockets || 1, icon: '🎛️' },
                                            { label: '⚙️ Cores per Socket', value: vm.cpu_cores_per_socket || '-', icon: '⚙️' },
                                            { label: '⚡ Total Speed', value: formatMhz(vm.cpu_total_mhz), icon: '⚡' },
                                            { label: '📊 Used Speed', value: `${vm.cpu_used_mhz?.toLocaleString('th-TH') || 0} MHz`, icon: '📊' },
                                            { label: '📈 Usage Ratio', value: formatPercent(vm.cpu_usage), icon: '📈' },
                                        ].map((item, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 2,
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    bgcolor: alpha('#9333ea', 0.05),
                                                    border: `1px solid ${alpha('#9333ea', 0.1)}`,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: alpha('#9333ea', 0.1),
                                                        borderColor: alpha('#9333ea', 0.2),
                                                        transform: 'translateX(4px)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="body1" fontWeight={800} color="#9333ea">
                                                    {item.value}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Memory Details Card */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, rgba(249, 115, 22, 0.06) 0%, rgba(249, 115, 22, 0.01) 100%)'
                                        : 'linear-gradient(145deg, rgba(249, 115, 22, 0.04) 0%, rgba(249, 115, 22, 0.01) 100%)',
                                    border: '1px solid',
                                    borderColor: alpha('#f97316', 0.15),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#f97316', 0.3),
                                        boxShadow: '0 12px 24px rgba(249, 115, 22, 0.15)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
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
                                        <MemoryIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                        🧩 Memory Specifications
                                    </Typography>
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {[
                                            { label: '💾 Total Memory', value: formatBytesWithMB(vm.memory_total_mb), icon: '💾' },
                                            { label: '📊 Used Memory', value: formatBytesWithMB(vm.memory_used_mb), icon: '📊' },
                                            { label: '🆓 Free Memory', value: formatBytes((vm.memory_total_mb || 0) - (vm.memory_used_mb || 0)), icon: '🆓' },
                                            { label: '📈 Usage Percentage', value: formatPercent(vm.memory_usage), icon: '📈' },
                                            { label: '⚖️ Memory Ratio', value: formatPercent(vm.memory_ratio), icon: '⚖️' },
                                        ].map((item, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 2,
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    bgcolor: alpha('#f97316', 0.05),
                                                    border: `1px solid ${alpha('#f97316', 0.1)}`,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: alpha('#f97316', 0.1),
                                                        borderColor: alpha('#f97316', 0.2),
                                                        transform: 'translateX(4px)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="body1" fontWeight={800} color="#f97316">
                                                    {item.value}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}
        </Box>
    );
}
