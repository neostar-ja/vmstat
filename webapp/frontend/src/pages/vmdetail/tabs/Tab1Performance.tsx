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
    Storage as StorageIcon,
    Speed as CpuIcon,
    NetworkCheck as NetworkIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { formatNetworkSpeed, CustomTooltip } from '../helpers';
import type { Tab1Props } from '../types';

export default function Tab1Performance(props: Tab1Props) {
    const { vm, theme, metricsLoading, chartData, currentCpu, currentMemory, realtime, storageGrowth } = props;

    return (
        <Box>
            {metricsLoading && (
                <Fade in={true}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: { xs: 5, sm: 7, md: 10 },
                            gap: { xs: 1.5, sm: 2, md: 3 },
                            position: 'relative',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                width: 240,
                                height: 240,
                                borderRadius: '50%',
                                background: 'conic-gradient(from 0deg, transparent, rgba(147, 51, 234, 0.4), transparent)',
                                animation: 'rotate 2.5s linear infinite',
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
                                    mb: { xs: 0.5, sm: 0.75, md: 1 },
                                    fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' }
                                }}
                            >
                                📊 กำลังโหลดข้อมูลประสิทธิภาพ...
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                กำลังประมวลผล Metrics และสร้างกราฟ
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}

            {!metricsLoading && (
                <>
                    {/* Performance Summary Cards Removed */}

                    {/* Performance Charts Section */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                        {/* CPU Performance Chart */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 3, md: 4 },
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
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>
                                        ⚡ CPU Performance
                                    </Typography>
                                    <Chip
                                        label={`${currentCpu.toFixed(1)}%`}
                                        size="small"
                                        sx={{
                                            height: { xs: 20, sm: 22, md: 24 },
                                            fontSize: { xs: '0.7rem', md: '0.8125rem' },
                                            background: 'rgba(255, 255, 255, 0.25)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    />
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ height: { xs: 200, sm: 240, md: 280 } }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="cpuGradNew" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4} />
                                                        <stop offset="50%" stopColor="#9333ea" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    opacity={0.15}
                                                    stroke={theme.palette.mode === 'dark' ? '#666' : '#ccc'}
                                                />
                                                <XAxis
                                                    dataKey="time"
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                    label={{ value: '%', angle: -90, position: 'insideLeft', style: { fill: theme.palette.text.secondary } }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="cpu"
                                                    stroke="#9333ea"
                                                    strokeWidth={3}
                                                    fill="url(#cpuGradNew)"
                                                    name="CPU"
                                                    unit="%"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Memory Performance Chart */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 3, md: 4 },
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
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>
                                        🧠 Memory Performance
                                    </Typography>
                                    <Chip
                                        label={`${currentMemory.toFixed(1)}%`}
                                        size="small"
                                        sx={{
                                            height: { xs: 20, sm: 22, md: 24 },
                                            fontSize: { xs: '0.7rem', md: '0.8125rem' },
                                            background: 'rgba(255, 255, 255, 0.25)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    />
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ height: { xs: 200, sm: 240, md: 280 } }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="memGradNew" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                                                        <stop offset="50%" stopColor="#f97316" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    opacity={0.15}
                                                    stroke={theme.palette.mode === 'dark' ? '#666' : '#ccc'}
                                                />
                                                <XAxis
                                                    dataKey="time"
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                    label={{ value: '%', angle: -90, position: 'insideLeft', style: { fill: theme.palette.text.secondary } }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="memory"
                                                    stroke="#f97316"
                                                    strokeWidth={3}
                                                    fill="url(#memGradNew)"
                                                    name="Memory"
                                                    unit="%"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Network Performance Chart */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 3, md: 4 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.01) 100%)'
                                        : 'linear-gradient(145deg, rgba(34, 197, 94, 0.04) 0%, rgba(34, 197, 94, 0.01) 100%)',
                                    border: '1px solid',
                                    borderColor: alpha('#22c55e', 0.15),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#22c55e', 0.3),
                                        boxShadow: '0 12px 24px rgba(34, 197, 94, 0.15)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                        px: { xs: 1.5, sm: 2, md: 3 },
                                        py: { xs: 1, sm: 1.5, md: 2 },
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: { xs: 1.5, md: 2 }
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
                                        <NetworkIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>
                                        🌐 Network Traffic
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, flexWrap: 'wrap' }}>
                                        <Chip
                                            icon={<span style={{ marginRight: 4 }}>↓</span>}
                                            label={`${formatNetworkSpeed(realtime?.network?.read_bitps || 0)}`}
                                            size="small"
                                            sx={{
                                                height: { xs: 20, sm: 24, md: 28 },
                                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(21, 128, 61, 0.9) 100%)',
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                                backdropFilter: 'blur(4px)',
                                                '& .MuiChip-label': { px: 1.5 },
                                                '& .MuiChip-icon': { color: '#fff' }
                                            }}
                                        />
                                        <Chip
                                            icon={<span style={{ marginRight: 4 }}>↑</span>}
                                            label={`${formatNetworkSpeed(realtime?.network?.write_bitps || 0)}`}
                                            size="small"
                                            sx={{
                                                height: { xs: 20, sm: 24, md: 28 },
                                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(29, 78, 216, 0.9) 100%)',
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                                backdropFilter: 'blur(4px)',
                                                '& .MuiChip-label': { px: 1.5 },
                                                '& .MuiChip-icon': { color: '#fff' }
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ height: { xs: 200, sm: 240, md: 280 } }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="netInGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="netOutGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    opacity={0.15}
                                                    stroke={theme.palette.mode === 'dark' ? '#666' : '#ccc'}
                                                />
                                                <XAxis
                                                    dataKey="time"
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                    label={{ value: 'Mbps', angle: -90, position: 'insideLeft', style: { fill: theme.palette.text.secondary } }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="networkIn"
                                                    name="↓ รับข้อมูล"
                                                    stroke="#22c55e"
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    unit=" Mbps"
                                                    fill="url(#netInGrad)"
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="networkOut"
                                                    name="↑ ส่งข้อมูล"
                                                    stroke="#ef4444"
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    unit=" Mbps"
                                                    fill="url(#netOutGrad)"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Disk IOPS Chart */}
                        <Grid item xs={12} lg={6}>
                            <Card
                                sx={{
                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.01) 100%)'
                                        : 'linear-gradient(145deg, rgba(139, 92, 246, 0.04) 0%, rgba(139, 92, 246, 0.01) 100%)',
                                    border: '1px solid',
                                    borderColor: alpha('#8b5cf6', 0.15),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#8b5cf6', 0.3),
                                        boxShadow: '0 12px 24px rgba(139, 92, 246, 0.15)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
                                        💿 Disk I/O Performance
                                    </Typography>
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Box sx={{ height: { xs: 200, sm: 240, md: 280 } }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    opacity={0.15}
                                                    stroke={theme.palette.mode === 'dark' ? '#666' : '#ccc'}
                                                />
                                                <XAxis
                                                    dataKey="time"
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                    stroke={theme.palette.text.secondary}
                                                    label={{ value: 'IOPS', angle: -90, position: 'insideLeft', style: { fill: theme.palette.text.secondary } }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="diskRead"
                                                    name="📖 อ่าน"
                                                    stroke="#06b6d4"
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    unit=" IOPS"
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="diskWrite"
                                                    name="✍️ เขียน"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    unit=" IOPS"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Storage Usage Chart */}
                        <Grid item xs={12}>
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
                                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
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
                                        📊 Storage Growth Trend
                                    </Typography>
                                    {storageGrowth.trend !== 'stable' && (
                                        <Chip
                                            icon={<TrendingUpIcon style={{ fontSize: 16, color: '#fff' }} />}
                                            label={`${storageGrowth.trend === 'increasing' ? '+' : ''}${(storageGrowth.perDay / 1024).toFixed(2)} GB/วัน`}
                                            size="small"
                                            sx={{
                                                height: 28,
                                                background: storageGrowth.trend === 'increasing'
                                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)'
                                                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(21, 128, 61, 0.9) 100%)',
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: '0.8rem',
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                boxShadow: storageGrowth.trend === 'increasing'
                                                    ? '0 2px 12px rgba(239, 68, 68, 0.4)'
                                                    : '0 2px 12px rgba(34, 197, 94, 0.4)',
                                                backdropFilter: 'blur(4px)',
                                                paddingLeft: 0.5,
                                                '& .MuiChip-label': { px: 1.5 }
                                            }}
                                        />
                                    )}
                                </Box>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ height: { xs: 200, sm: 240, md: 280 } }}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={700}>
                                                    การใช้พื้นที่เริ่ม (GB)
                                                </Typography>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData}>
                                                        <defs>
                                                            <linearGradient id="storageGradNew" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            opacity={0.15}
                                                            stroke={theme.palette.mode === 'dark' ? '#666' : '#ccc'}
                                                        />
                                                        <XAxis
                                                            dataKey="time"
                                                            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                            stroke={theme.palette.text.secondary}
                                                        />
                                                        <YAxis
                                                            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                            stroke={theme.palette.text.secondary}
                                                            label={{ value: 'GB', angle: -90, position: 'insideLeft', style: { fill: theme.palette.text.secondary } }}
                                                        />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="storageUsedGB"
                                                            stroke="#06b6d4"
                                                            strokeWidth={3}
                                                            fill="url(#storageGradNew)"
                                                            name="ใช้แล้ว"
                                                            unit=" GB"
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ height: { xs: 200, sm: 240, md: 280 } }}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={700}>
                                                    สัดส่วนการใช้งาน (%)
                                                </Typography>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData.map(d => ({
                                                        ...d,
                                                        storagePercent: vm?.storage_total_mb ? (d.storageUsedMB / vm.storage_total_mb) * 100 : 0
                                                    }))}>
                                                        <defs>
                                                            <linearGradient id="storagePercentGradNew" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4} />
                                                                <stop offset="50%" stopColor="#0891b2" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            opacity={0.15}
                                                            stroke={theme.palette.mode === 'dark' ? '#666' : '#ccc'}
                                                        />
                                                        <XAxis
                                                            dataKey="time"
                                                            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                            stroke={theme.palette.text.secondary}
                                                        />
                                                        <YAxis
                                                            domain={[0, 100]}
                                                            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                                            stroke={theme.palette.text.secondary}
                                                            label={{ value: '%', angle: -90, position: 'insideLeft', style: { fill: theme.palette.text.secondary } }}
                                                        />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="storagePercent"
                                                            stroke="#0891b2"
                                                            strokeWidth={3}
                                                            fill="url(#storagePercentGradNew)"
                                                            name="ใช้แล้ว"
                                                            unit="%"
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}
        </Box>
    );
}
