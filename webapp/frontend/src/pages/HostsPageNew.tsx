import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Skeleton,
    LinearProgress,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    alpha,
    IconButton,
    Tooltip,
    Button,
    Alert,
    Divider,
    Avatar,
    Paper,
    Fade,
    Slide,
    Zoom,
    ToggleButton,
    ToggleButtonGroup,
    Switch,
    FormControlLabel,
    Menu,
    MenuItem,
    Badge,
} from '@mui/material';
import {
    Search as SearchIcon,
    Dns as HostIcon,
    Computer as VmIcon,
    PlayArrow as RunningIcon,
    Memory as MemoryIcon,
    Speed as CpuIcon,
    Warning as WarningIcon,
    CheckCircle as HealthyIcon,
    Error as CriticalIcon,
    Info as InfoIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    ViewModule as CardViewIcon,
    ViewList as ListViewIcon,
    Timeline as TrendIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface HostOverview {
    host_id: string;
    host_name: string;
    ip?: string;
    type?: string;
    status: string;
    cluster_id?: string;
    cluster_name?: string;
    az_name?: string;
    cpu_cores?: number;
    cpu_sockets?: number;
    cpu_total_mhz?: number;
    cpu_used_mhz?: number;
    cpu_usage_ratio?: number;
    cpu_usage_pct?: number;
    memory_total_mb?: number;
    memory_used_mb?: number;
    memory_free_mb?: number;
    memory_usage_ratio?: number;
    memory_usage_pct?: number;
    memory_total_gb?: number;
    memory_used_gb?: number;
    vm_total?: number;
    vm_running?: number;
    vm_stopped?: number;
    alarm_count?: number;
    has_alarm?: boolean;
    health_status?: string;
    last_synced_at?: string;
}

interface HostStats {
    total_hosts: number;
    running_hosts: number;
    critical_hosts: number;
    warning_hosts: number;
    healthy_hosts: number;
    total_vms: number;
    total_cpu_mhz: number;
    total_memory_gb: number;
    avg_cpu_usage: number;
    avg_memory_usage: number;
    hosts_with_alarms: number;
}

// Animated Counter Component
const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    React.useEffect(() => {
        let start = 0;
        const end = value;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{displayValue.toLocaleString()}</span>;
};

// Enhanced Host Card Component (Previously defined...)
const HostCard: React.FC<{ host: HostOverview; onClick: () => void }> = ({ host, onClick }) => {
    const theme = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    const getHealthColor = (health?: string) => {
        switch (health) {
            case 'critical': return { color: '#ef4444', bg: '#fef2f2', icon: CriticalIcon };
            case 'warning': return { color: '#f59e0b', bg: '#fffbeb', icon: WarningIcon };
            case 'healthy': return { color: '#10b981', bg: '#f0fdf4', icon: HealthyIcon };
            default: return { color: '#6b7280', bg: '#f9fafb', icon: InfoIcon };
        }
    };

    const getUsageColor = (usage: number) => {
        if (usage >= 90) return '#ef4444';
        if (usage >= 80) return '#f59e0b';
        if (usage >= 60) return '#3b82f6';
        return '#10b981';
    };

    const healthInfo = getHealthColor(host.health_status);
    const cpuUsage = (host.cpu_usage_ratio || 0) * 100;
    const memoryUsage = (host.memory_usage_ratio || 0) * 100;

    return (
        <Zoom in timeout={300} style={{ transitionDelay: '50ms' }}>
            <Card
                sx={{
                    position: 'relative',
                    height: '100%',
                    borderRadius: 4,
                    overflow: 'visible',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: `1px solid ${alpha(healthInfo.color, 0.2)}`,
                    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                    boxShadow: isHovered
                        ? `0 25px 50px -12px ${alpha(healthInfo.color, 0.25)}, 0 0 0 1px ${alpha(healthInfo.color, 0.1)}`
                        : `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${healthInfo.color} 0%, ${alpha(healthInfo.color, 0.6)} 100%)`,
                        borderRadius: '16px 16px 0 0',
                    }
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onClick}
            >
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{
                                width: 48,
                                height: 48,
                                background: `linear-gradient(135deg, ${healthInfo.color} 0%, ${alpha(healthInfo.color, 0.7)} 100%)`,
                                boxShadow: `0 8px 20px ${alpha(healthInfo.color, 0.3)}`
                            }}>
                                <HostIcon sx={{ color: 'white', fontSize: 24 }} />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight={700} sx={{
                                    lineHeight: 1.2,
                                    background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    {host.host_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    {host.az_name || 'Unknown AZ'} • {host.cluster_name || 'No Cluster'}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={`Health: ${host.health_status}`}>
                                <Box sx={{
                                    p: 0.5,
                                    borderRadius: '50%',
                                    bgcolor: healthInfo.bg,
                                    color: healthInfo.color,
                                    animation: host.health_status === 'critical' ? 'pulse 2s infinite' : 'none'
                                }}>
                                    <healthInfo.icon fontSize="small" />
                                </Box>
                            </Tooltip>
                            {host.has_alarm && (
                                <Badge badgeContent={host.alarm_count} color="error" sx={{ ml: 0.5 }}>
                                    <WarningIcon fontSize="small" color="warning" />
                                </Badge>
                            )}
                        </Box>
                    </Box>

                    {/* Status Info */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Chip
                                size="small"
                                label={host.status}
                                color={host.status === 'running' ? 'success' : 'default'}
                                icon={host.status === 'running' ? <RunningIcon /> : undefined}
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    '& .MuiChip-icon': { fontSize: 16 }
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {host.ip}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Resource Usage */}
                    <Box sx={{ flex: 1 }}>
                        {/* CPU Usage */}
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CpuIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                        CPU
                                    </Typography>
                                </Box>
                                <Typography variant="caption" fontWeight={700} sx={{ color: getUsageColor(cpuUsage) }}>
                                    {cpuUsage.toFixed(0)}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={cpuUsage}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: alpha(theme.palette.grey[300], 0.3),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        background: `linear-gradient(90deg, ${getUsageColor(cpuUsage)} 0%, ${alpha(getUsageColor(cpuUsage), 0.7)} 100%)`
                                    }
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                {((host.cpu_used_mhz || 0) / 1000).toFixed(1)}GHz / {((host.cpu_total_mhz || 0) / 1000).toFixed(1)}GHz • {(host.cpu_cores != null && host.cpu_cores !== undefined) ? host.cpu_cores : 'N/A'} cores
                            </Typography>
                        </Box>

                        {/* Memory Usage */}
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MemoryIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                        Memory
                                    </Typography>
                                </Box>
                                <Typography variant="caption" fontWeight={700} sx={{ color: getUsageColor(memoryUsage) }}>
                                    {memoryUsage.toFixed(0)}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={memoryUsage}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: alpha(theme.palette.grey[300], 0.3),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        background: `linear-gradient(90deg, ${getUsageColor(memoryUsage)} 0%, ${alpha(getUsageColor(memoryUsage), 0.7)} 100%)`
                                    }
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                {((host.memory_used_mb || 0) / 1024).toFixed(1)}GB / {((host.memory_total_mb || 0) / 1024).toFixed(1)}GB used
                            </Typography>
                        </Box>

                        {/* VMs */}
                        <Box sx={{
                            mt: 'auto',
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VmIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                                    <Typography variant="body2" fontWeight={600} color="primary.main">
                                        VMs
                                    </Typography>
                                </Box>
                                <Typography variant="h6" fontWeight={800} color="primary.main">
                                    {host.vm_total || 0}
                                </Typography>
                            </Box>
                            {(host.vm_running || 0) > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {host.vm_running} running, {(host.vm_total || 0) - (host.vm_running || 0)} stopped
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </CardContent>

                {/* Hover Effect Overlay */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${alpha(healthInfo.color, 0.05)} 0%, ${alpha(healthInfo.color, 0.02)} 100%)`,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none'
                }} />
            </Card>
        </Zoom>
    );
};

// Enhanced Stats Card Component
const StatsCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactElement;
    color: string;
    subtitle?: string;
    trend?: { value: number; positive: boolean };
    isLoading?: boolean;
}> = ({ title, value, icon, color, subtitle, trend, isLoading }) => {
    const theme = useTheme();

    return (
        <Fade in timeout={600}>
            <Card sx={{
                position: 'relative',
                overflow: 'visible',
                borderRadius: 4,
                background: theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`
                    : `linear-gradient(135deg, ${alpha(color, 0.05)} 0%, #ffffff 100%)`,
                border: `1px solid ${alpha(color, 0.1)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 20px 40px ${alpha(color, 0.15)}`
                }
            }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{
                            p: 1.5,
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
                            boxShadow: `0 8px 20px ${alpha(color, 0.3)}`
                        }}>
                            {React.cloneElement(icon, { sx: { fontSize: 28, color: 'white' } })}
                        </Box>
                        {trend && (
                            <Chip
                                size="small"
                                icon={<TrendIcon sx={{ fontSize: '12px !important' }} />}
                                label={`${trend.positive ? '+' : '-'}${trend.value}%`}
                                color={trend.positive ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                        )}
                    </Box>

                    <Box>
                        {isLoading ? (
                            <Skeleton variant="text" width={80} height={48} />
                        ) : (
                            <Typography
                                variant="h3"
                                fontWeight={800}
                                sx={{
                                    color: color,
                                    mb: 0.5,
                                    textShadow: `0 2px 4px ${alpha(color, 0.2)}`
                                }}
                            >
                                <AnimatedCounter value={value} />
                            </Typography>
                        )}
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary" gutterBottom>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </CardContent>

                {/* Background Effect */}
                <Box sx={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(color, 0.2)} 0%, transparent 70%)`,
                    filter: 'blur(20px)',
                    zIndex: -1
                }} />
            </Card>
        </Fade>
    );
};

export default function HostsPageNew() {
    const navigate = useNavigate();
    const theme = useTheme();
    const queryClient = useQueryClient();

    // State Management
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterHealth, setFilterHealth] = useState<string>('all');
    const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Queries
    const { data: hostsData, isLoading: hostsLoading, error: hostsError } = useQuery<HostOverview[]>({
        queryKey: ['hosts'],
        queryFn: () => api.get('/hosts/').then(res => res.data),
        refetchInterval: autoRefresh ? 30000 : false,
        refetchOnWindowFocus: false,
    });

    const { data: statsData, isLoading: statsLoading } = useQuery<HostStats>({
        queryKey: ['host-stats'],
        queryFn: () => api.get('/hosts/stats').then(res => res.data),
        refetchInterval: autoRefresh ? 30000 : false,
    });

    // Data Processing
    const hosts = hostsData || [];
    const stats = statsData || {
        total_hosts: 0, running_hosts: 0, critical_hosts: 0, warning_hosts: 0,
        healthy_hosts: 0, total_vms: 0, total_cpu_mhz: 0, total_memory_gb: 0,
        avg_cpu_usage: 0, avg_memory_usage: 0, hosts_with_alarms: 0,
    };

    const filteredHosts = useMemo(() => {
        return hosts.filter((host) => {
            const matchesSearch = host.host_name.toLowerCase().includes(search.toLowerCase()) ||
                host.az_name?.toLowerCase().includes(search.toLowerCase()) ||
                host.cluster_name?.toLowerCase().includes(search.toLowerCase()) ||
                host.ip?.includes(search);

            const matchesStatus = filterStatus === 'all' || host.status === filterStatus;
            const matchesHealth = filterHealth === 'all' || host.health_status === filterHealth;

            return matchesSearch && matchesStatus && matchesHealth;
        });
    }, [hosts, search, filterStatus, filterHealth]);

    // นำทางไปหน้ารายละเอียด Host
    const handleHostClick = (hostId: string) => {
        navigate(`/hosts/${hostId}`);
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 20%, #312e81 100%)'
                : 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 25%, #fdf4ff 100%)',
            py: 4
        }}>
            <Box sx={{ maxWidth: '1400px', mx: 'auto', px: 3 }}>

                {/* หัวหน้าหน้า */}
                <Slide in direction="down" timeout={600}>
                    <Box sx={{ mb: 6 }}>
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', md: 'center' },
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: 3
                        }}>
                            <Box>
                                <Typography
                                    variant="h2"
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: { xs: '2rem', md: '3rem' },
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        mb: 1,
                                        letterSpacing: '-0.02em'
                                    }}
                                >
                                    🖥️ จัดการโฮสต์
                                </Typography>
                                <Typography variant="h6" color="text.secondary" fontWeight={500}>
                                    ตรวจสอบและจัดการโฮสต์ทางกายภาพในโครงสร้างพื้นฐาน
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: { xs: 1, md: 0 } }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autoRefresh}
                                            onChange={(e) => setAutoRefresh(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="รีเฟรชอัตโนมัติ"
                                    sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.9rem', fontWeight: 600 } }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Slide>

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="โฮสต์ทั้งหมด"
                            value={stats.total_hosts}
                            icon={<HostIcon />}
                            color="#6366f1"
                            subtitle="โครงสร้างพื้นฐาน"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="กำลังทำงาน"
                            value={stats.running_hosts}
                            icon={<RunningIcon />}
                            color="#10b981"
                            subtitle="โฮสต์ที่ออนไลน์"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="วิกฤต"
                            value={stats.critical_hosts}
                            icon={<CriticalIcon />}
                            color="#ef4444"
                            subtitle="ต้องตรวจสอบด่วน"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="VM ทั้งหมด"
                            value={stats.total_vms}
                            icon={<VmIcon />}
                            color="#3b82f6"
                            subtitle="เครื่องเสมือน"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="CPU (GHz)"
                            value={Math.round(stats.total_cpu_mhz / 1000)}
                            icon={<CpuIcon />}
                            color="#f59e0b"
                            subtitle={`เฉลี่ย ${stats.avg_cpu_usage.toFixed(1)}%`}
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="RAM (GB)"
                            value={Math.round(stats.total_memory_gb)}
                            icon={<MemoryIcon />}
                            color="#8b5cf6"
                            subtitle={`เฉลี่ย ${stats.avg_memory_usage.toFixed(1)}%`}
                            isLoading={statsLoading}
                        />
                    </Grid>
                </Grid>

                {/* แถบเครื่องมือ */}
                <Slide in direction="up" timeout={800}>
                    <Paper sx={{
                        p: 3,
                        mb: 4,
                        borderRadius: 4,
                        background: theme.palette.mode === 'dark'
                            ? alpha(theme.palette.background.paper, 0.8)
                            : alpha(theme.palette.common.white, 0.9),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
                    }}>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            gap: 2,
                            justifyContent: 'space-between'
                        }}>
                            {/* ค้นหา */}
                            <TextField
                                placeholder="ค้นหาโฮสต์, AZ, คลัสเตอร์, IP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="primary" />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 3 }
                                }}
                                sx={{ flex: 1, maxWidth: { md: 400 } }}
                            />

                            {/* ส่วนควบคุม */}
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                {/* สลับโหมดการแสดงผล */}
                                <ToggleButtonGroup
                                    value={viewMode}
                                    exclusive
                                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                                    size="small"
                                    sx={{
                                        display: { xs: 'none', sm: 'flex' },
                                        '& .MuiToggleButton-root': {
                                            borderRadius: 2,
                                            px: 2,
                                            fontSize: '0.8rem',
                                            fontWeight: 600
                                        }
                                    }}
                                >
                                    <ToggleButton value="cards">
                                        <CardViewIcon sx={{ mr: 0.5, fontSize: 16 }} />
                                        การ์ด
                                    </ToggleButton>
                                    <ToggleButton value="table">
                                        <ListViewIcon sx={{ mr: 0.5, fontSize: 16 }} />
                                        ตาราง
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                {/* ตัวกรอง */}
                                <Button
                                    variant="outlined"
                                    startIcon={<FilterIcon />}
                                    onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        minWidth: { xs: '100px', sm: 'auto' }
                                    }}
                                >
                                    ตัวกรอง
                                    <Badge
                                        badgeContent={
                                            (filterStatus !== 'all' ? 1 : 0) + (filterHealth !== 'all' ? 1 : 0)
                                        }
                                        color="primary"
                                        sx={{ ml: 1 }}
                                    />
                                </Button>

                                {/* รีเฟรช */}
                                <Tooltip title="รีเฟรชข้อมูล">
                                    <IconButton
                                        onClick={() => {
                                            queryClient.invalidateQueries({ queryKey: ['hosts'] });
                                            queryClient.invalidateQueries({ queryKey: ['host-stats'] });
                                        }}
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                        }}
                                    >
                                        <RefreshIcon color="primary" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        {/* ตัวกรองที่เลือก */}
                        {(filterStatus !== 'all' || filterHealth !== 'all') && (
                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    ตัวกรองที่ใช้:
                                </Typography>
                                {filterStatus !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`สถานะ: ${filterStatus === 'running' ? 'กำลังทำงาน' : filterStatus}`}
                                        onDelete={() => setFilterStatus('all')}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                                {filterHealth !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`สุขภาพ: ${filterHealth === 'healthy' ? 'ปกติ' : filterHealth === 'warning' ? 'ระวัง' : 'วิกฤต'}`}
                                        onDelete={() => setFilterHealth('all')}
                                        color="secondary"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        )}
                    </Paper>
                </Slide>

                {/* เนื้อหาหลัก: การ์ด / ตาราง */}
                {hostsLoading ? (
                    <Grid container spacing={3}>
                        {Array.from({ length: 8 }).map((_, idx) => (
                            <Grid item xs={12} sm={6} lg={4} xl={3} key={idx}>
                                <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 4 }} />
                            </Grid>
                        ))}
                    </Grid>
                ) : hostsError ? (
                    <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
                        Failed to load hosts: {String(hostsError)}
                    </Alert>
                                ) : filteredHosts.length === 0 ? (
                    <Fade in timeout={600}>
                        <Paper sx={{
                            p: 8,
                            textAlign: 'center',
                            borderRadius: 4,
                            bgcolor: alpha(theme.palette.background.paper, 0.6)
                        }}>
                            <HostIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h5" fontWeight={700} color="text.secondary" gutterBottom>
                                ไม่พบโฮสต์
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                {search ? `ไม่มีโฮสต์ที่ตรงกับ "${search}"` : 'ไม่มีโฮสต์ในระบบ'}
                            </Typography>
                            <Button variant="outlined" onClick={() => setSearch('')} sx={{ borderRadius: 2 }}>
                                ล้างตัวกรอง
                            </Button>
                        </Paper>
                    </Fade>
                ) : viewMode === 'cards' ? (
                    <Grid container spacing={3}>
                        {filteredHosts.map((host) => (
                            <Grid item xs={12} sm={6} lg={4} xl={3} key={host.host_id}>
                                <HostCard
                                    host={host}
                                    onClick={() => handleHostClick(host.host_id)}
                                />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Fade in timeout={600}>
                        <Paper sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: alpha(theme.palette.background.paper, 0.8),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}>
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>โฮสต์</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>สเปค</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>การใช้งาน</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>เครื่องเสมือน</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>สุขภาพระบบ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredHosts.map((host) => (
                                            <TableRow
                                                key={host.host_id}
                                                hover
                                                onClick={() => handleHostClick(host.host_id)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                                            <HostIcon sx={{ fontSize: 18 }} />
                                                        </Avatar>
                                                        <Box>
                                                            <Typography fontWeight={600}>{host.host_name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {host.az_name} • {host.ip}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={host.status === 'running' ? 'กำลังทำงาน' : (host.status || 'ไม่ทราบ')}
                                                        color={host.status === 'running' ? 'success' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {(host.cpu_cores != null && host.cpu_cores !== undefined) ? host.cpu_cores : 'N/A'} คอร์ • {((host.memory_total_mb || 0) / 1024).toFixed(1)} GB RAM
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            CPU: {((host.cpu_used_mhz || 0) / 1000).toFixed(1)}/{((host.cpu_total_mhz || 0) / 1000).toFixed(1)} GHz ({((host.cpu_usage_ratio || 0) * 100).toFixed(0)}%)
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={(host.cpu_usage_ratio || 0) * 100}
                                                            sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            RAM: {((host.memory_used_mb || 0) / 1024).toFixed(1)}/{((host.memory_total_mb || 0) / 1024).toFixed(1)} GB ({((host.memory_usage_ratio || 0) * 100).toFixed(0)}%)
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={(host.memory_usage_ratio || 0) * 100}
                                                            sx={{ height: 4, borderRadius: 2 }}
                                                        />
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {host.vm_total || 0} เครื่อง
                                                    </Typography>
                                                    <Typography variant="caption" color="success.main">
                                                        {host.vm_running || 0} ทำงานอยู่
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip
                                                            size="small"
                                                            label={host.health_status === 'healthy' ? 'ปกติ' : host.health_status === 'warning' ? 'ระวัง' : host.health_status === 'critical' ? 'วิกฤต' : (host.health_status || 'ไม่ทราบ')}
                                                            color={
                                                                host.health_status === 'critical' ? 'error' :
                                                                    host.health_status === 'warning' ? 'warning' : 'success'
                                                            }
                                                        />
                                                        {host.has_alarm && (
                                                            <Badge badgeContent={host.alarm_count} color="error">
                                                                <WarningIcon color="warning" sx={{ fontSize: 16 }} />
                                                            </Badge>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Fade>
                )}

                {/* เมนูตัวกรอง */}
                <Menu
                    anchorEl={filterMenuAnchor}
                    open={Boolean(filterMenuAnchor)}
                    onClose={() => setFilterMenuAnchor(null)}
                    PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}
                >
                    <MenuItem disabled>
                        <Typography variant="subtitle2" fontWeight={700}>กรองตามสถานะ</Typography>
                    </MenuItem>
                    {[{v:'all',l:'ทุกสถานะ'},{v:'running',l:'กำลังทำงาน'},{v:'stopped',l:'หยุดทำงาน'}].map(({v,l}) => (
                        <MenuItem
                            key={v}
                            onClick={() => {
                                setFilterStatus(v);
                                setFilterMenuAnchor(null);
                            }}
                            selected={filterStatus === v}
                        >
                            {l}
                        </MenuItem>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <MenuItem disabled>
                        <Typography variant="subtitle2" fontWeight={700}>กรองตามสุขภาพ</Typography>
                    </MenuItem>
                    {[{v:'all',l:'ทุกสถานะ'},{v:'healthy',l:'ปกติ'},{v:'warning',l:'ระวัง'},{v:'critical',l:'วิกฤต'}].map(({v,l}) => (
                        <MenuItem
                            key={v}
                            onClick={() => {
                                setFilterHealth(v);
                                setFilterMenuAnchor(null);
                            }}
                            selected={filterHealth === v}
                        >
                            {l}
                        </MenuItem>
                    ))}
                </Menu>

            </Box>
        </Box>
    );
}
