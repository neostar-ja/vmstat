import React, { useState, useMemo } from 'react';
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
    Dialog,
    DialogTitle,
    DialogContent,
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
    CircularProgress,
} from '@mui/material';
import {
    Search as SearchIcon,
    Dns as HostIcon,
    Computer as VmIcon,
    PlayArrow as RunningIcon,
    Memory as MemoryIcon,
    Speed as CpuIcon,
    Storage as StorageIcon,
    Warning as WarningIcon,
    CheckCircle as HealthyIcon,
    Error as CriticalIcon,
    Info as InfoIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    ViewModule as CardViewIcon,
    ViewList as ListViewIcon,
    Timeline as TrendIcon,
    Close as CloseIcon,
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

interface HostDetail extends HostOverview {
    datastores?: string[];
    datastore_count?: number;
    alarms?: any[];
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
    const theme = useTheme();
    const queryClient = useQueryClient();

    // State Management
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [selectedHost, setSelectedHost] = useState<string | null>(null);
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

    const { data: hostDetailData, isLoading: detailLoading } = useQuery<HostDetail>({
        queryKey: ['host-detail', selectedHost],
        queryFn: () => api.get(`/hosts/${selectedHost}`).then(res => res.data),
        enabled: !!selectedHost,
    });

    // Mutations
    // (Removed sync mutation)

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

    const hostDetail = hostDetailData;

    const handleHostClick = (hostId: string) => {
        setSelectedHost(hostId);
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

                {/* Enhanced Header */}
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
                                    🖥️ Physical Hosts
                                </Typography>
                                <Typography variant="h6" color="text.secondary" fontWeight={500}>
                                    Monitor and manage your infrastructure hosts
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
                                    label="Auto Refresh"
                                    sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.9rem', fontWeight: 600 } }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Slide>

                {/* Enhanced Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="Total Hosts"
                            value={stats.total_hosts}
                            icon={<HostIcon />}
                            color="#6366f1"
                            subtitle="Active Infrastructure"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="Running"
                            value={stats.running_hosts}
                            icon={<RunningIcon />}
                            color="#10b981"
                            subtitle="Operational Hosts"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="Critical"
                            value={stats.critical_hosts}
                            icon={<CriticalIcon />}
                            color="#ef4444"
                            subtitle="Need Attention"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="Total VMs"
                            value={stats.total_vms}
                            icon={<VmIcon />}
                            color="#3b82f6"
                            subtitle="Virtual Machines"
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="CPU (GHz)"
                            value={Math.round(stats.total_cpu_mhz / 1000)}
                            icon={<CpuIcon />}
                            color="#f59e0b"
                            subtitle={`${stats.avg_cpu_usage.toFixed(1)}% avg usage`}
                            isLoading={statsLoading}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2}>
                        <StatsCard
                            title="Memory (GB)"
                            value={Math.round(stats.total_memory_gb)}
                            icon={<MemoryIcon />}
                            color="#8b5cf6"
                            subtitle={`${stats.avg_memory_usage.toFixed(1)}% avg usage`}
                            isLoading={statsLoading}
                        />
                    </Grid>
                </Grid>

                {/* Enhanced Control Bar */}
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
                            {/* Search */}
                            <TextField
                                placeholder="Search hosts, AZ, cluster, IP..."
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

                            {/* Controls */}
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                {/* View Mode Toggle */}
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
                                        Cards
                                    </ToggleButton>
                                    <ToggleButton value="table">
                                        <ListViewIcon sx={{ mr: 0.5, fontSize: 16 }} />
                                        Table
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                {/* Filters */}
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
                                    Filters
                                    <Badge
                                        badgeContent={
                                            (filterStatus !== 'all' ? 1 : 0) + (filterHealth !== 'all' ? 1 : 0)
                                        }
                                        color="primary"
                                        sx={{ ml: 1 }}
                                    />
                                </Button>

                                {/* Refresh */}
                                <Tooltip title="Refresh Data">
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

                        {/* Active Filters Display */}
                        {(filterStatus !== 'all' || filterHealth !== 'all') && (
                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    Active Filters:
                                </Typography>
                                {filterStatus !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`Status: ${filterStatus}`}
                                        onDelete={() => setFilterStatus('all')}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                                {filterHealth !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`Health: ${filterHealth}`}
                                        onDelete={() => setFilterHealth('all')}
                                        color="secondary"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        )}
                    </Paper>
                </Slide>

                {/* Content: Cards/Table View */}
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
                                No hosts found
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                {search ? `No hosts match "${search}"` : 'No hosts available'}
                            </Typography>
                            <Button variant="outlined" onClick={() => setSearch('')} sx={{ borderRadius: 2 }}>
                                Clear Filters
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
                                            <TableCell sx={{ fontWeight: 700 }}>Host</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Resources</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Usage</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>VMs</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Health</TableCell>
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
                                                        label={host.status}
                                                        color={host.status === 'running' ? 'success' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {(host.cpu_cores != null && host.cpu_cores !== undefined) ? host.cpu_cores : 'N/A'} cores • {((host.memory_total_mb || 0) / 1024).toFixed(1)}GB RAM
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            CPU: {((host.cpu_used_mhz || 0) / 1000).toFixed(1)}GHz / {((host.cpu_total_mhz || 0) / 1000).toFixed(1)}GHz ({((host.cpu_usage_ratio || 0) * 100).toFixed(0)}%)
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={(host.cpu_usage_ratio || 0) * 100}
                                                            sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            RAM: {((host.memory_used_mb || 0) / 1024).toFixed(1)}GB / {((host.memory_total_mb || 0) / 1024).toFixed(1)}GB ({((host.memory_usage_ratio || 0) * 100).toFixed(0)}%)
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
                                                        {host.vm_total || 0} total
                                                    </Typography>
                                                    <Typography variant="caption" color="success.main">
                                                        {host.vm_running || 0} running
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip
                                                            size="small"
                                                            label={host.health_status}
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

                {/* Filter Menu */}
                <Menu
                    anchorEl={filterMenuAnchor}
                    open={Boolean(filterMenuAnchor)}
                    onClose={() => setFilterMenuAnchor(null)}
                    PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}
                >
                    <MenuItem disabled>
                        <Typography variant="subtitle2" fontWeight={700}>Status Filter</Typography>
                    </MenuItem>
                    {['all', 'running', 'stopped'].map((status) => (
                        <MenuItem
                            key={status}
                            onClick={() => {
                                setFilterStatus(status);
                                setFilterMenuAnchor(null);
                            }}
                            selected={filterStatus === status}
                        >
                            {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <MenuItem disabled>
                        <Typography variant="subtitle2" fontWeight={700}>Health Filter</Typography>
                    </MenuItem>
                    {['all', 'healthy', 'warning', 'critical'].map((health) => (
                        <MenuItem
                            key={health}
                            onClick={() => {
                                setFilterHealth(health);
                                setFilterMenuAnchor(null);
                            }}
                            selected={filterHealth === health}
                        >
                            {health === 'all' ? 'All Health' : health.charAt(0).toUpperCase() + health.slice(1)}
                        </MenuItem>
                    ))}
                </Menu>

                {/* Enhanced Host Detail Dialog */}
                <Dialog
                    open={!!selectedHost}
                    onClose={() => setSelectedHost(null)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            maxHeight: '90vh'
                        }
                    }}
                >
                    <DialogTitle sx={{
                        p: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        color: 'white'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.common.white, 0.2) }}>
                                <HostIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700}>
                                    {hostDetail?.host_name || 'Host Details'}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    {hostDetail?.az_name} • {hostDetail?.cluster_name}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton
                            onClick={() => setSelectedHost(null)}
                            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ p: 0 }}>
                        {detailLoading ? (
                            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <CircularProgress sx={{ display: 'block', mx: 'auto', mb: 2 }} />
                                    <Typography color="text.secondary">Loading host details...</Typography>
                                </Box>
                            </Box>
                        ) : hostDetail ? (
                            <Box>
                                {/* Header Stats Section */}
                                <Box sx={{
                                    p: 4,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                }}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Paper elevation={0} sx={{
                                                p: 2.5,
                                                textAlign: 'center',
                                                borderRadius: 3,
                                                background: `linear-gradient(135deg, ${alpha('#6366f1', 0.1)} 0%, ${alpha('#6366f1', 0.05)} 100%)`,
                                                border: `1px solid ${alpha('#6366f1', 0.1)}`,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${alpha('#6366f1', 0.2)} 0%, ${alpha('#6366f1', 0.1)} 100%)`,
                                                    opacity: 0.7
                                                }} />
                                                <Avatar sx={{
                                                    width: 48,
                                                    height: 48,
                                                    mx: 'auto',
                                                    mb: 1.5,
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                    boxShadow: `0 8px 20px ${alpha('#6366f1', 0.3)}`
                                                }}>
                                                    <CpuIcon sx={{ fontSize: 24, color: 'white' }} />
                                                </Avatar>
                                                <Typography variant="h3" fontWeight={800} sx={{
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    mb: 0.5
                                                }}>
                                                    {(hostDetail.cpu_cores != null && hostDetail.cpu_cores !== undefined) ? hostDetail.cpu_cores : 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                                                    CPU Cores
                                                </Typography>
                                                <Typography variant="caption" sx={{
                                                    color: '#6366f1',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {((hostDetail.cpu_usage_ratio || 0) * 100).toFixed(1)}% usage
                                                </Typography>
                                                <Box sx={{ mt: 1.5 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={(hostDetail.cpu_usage_ratio || 0) * 100}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            backgroundColor: alpha('#6366f1', 0.1),
                                                            '& .MuiLinearProgress-bar': {
                                                                borderRadius: 3,
                                                                background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)'
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Paper elevation={0} sx={{
                                                p: 2.5,
                                                textAlign: 'center',
                                                borderRadius: 3,
                                                background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.1)} 0%, ${alpha('#8b5cf6', 0.05)} 100%)`,
                                                border: `1px solid ${alpha('#8b5cf6', 0.1)}`,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                                    opacity: 0.7
                                                }} />
                                                <Avatar sx={{
                                                    width: 48,
                                                    height: 48,
                                                    mx: 'auto',
                                                    mb: 1.5,
                                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                    boxShadow: `0 8px 20px ${alpha('#8b5cf6', 0.3)}`
                                                }}>
                                                    <MemoryIcon sx={{ fontSize: 24, color: 'white' }} />
                                                </Avatar>
                                                <Typography variant="h3" fontWeight={800} sx={{
                                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    mb: 0.5
                                                }}>
                                                    {((hostDetail.memory_total_mb || 0) / 1024).toFixed(0)}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                                                    Memory GB
                                                </Typography>
                                                <Typography variant="caption" sx={{
                                                    color: '#8b5cf6',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {((hostDetail.memory_usage_ratio || 0) * 100).toFixed(1)}% usage
                                                </Typography>
                                                <Box sx={{ mt: 1.5 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={(hostDetail.memory_usage_ratio || 0) * 100}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            backgroundColor: alpha('#8b5cf6', 0.1),
                                                            '& .MuiLinearProgress-bar': {
                                                                borderRadius: 3,
                                                                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)'
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Paper elevation={0} sx={{
                                                p: 2.5,
                                                textAlign: 'center',
                                                borderRadius: 3,
                                                background: `linear-gradient(135deg, ${alpha('#10b981', 0.1)} 0%, ${alpha('#10b981', 0.05)} 100%)`,
                                                border: `1px solid ${alpha('#10b981', 0.1)}`,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${alpha('#10b981', 0.2)} 0%, ${alpha('#10b981', 0.1)} 100%)`,
                                                    opacity: 0.7
                                                }} />
                                                <Avatar sx={{
                                                    width: 48,
                                                    height: 48,
                                                    mx: 'auto',
                                                    mb: 1.5,
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    boxShadow: `0 8px 20px ${alpha('#10b981', 0.3)}`
                                                }}>
                                                    <VmIcon sx={{ fontSize: 24, color: 'white' }} />
                                                </Avatar>
                                                <Typography variant="h3" fontWeight={800} sx={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    mb: 0.5
                                                }}>
                                                    {hostDetail.vm_total || 0}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                                                    Virtual Machines
                                                </Typography>
                                                <Typography variant="caption" sx={{
                                                    color: '#10b981',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {hostDetail.vm_running || 0} running
                                                </Typography>
                                                <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
                                                    <Chip
                                                        size="small"
                                                        label={`${hostDetail.vm_running || 0} Running`}
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                            height: 20,
                                                            backgroundColor: alpha('#10b981', 0.1),
                                                            color: '#10b981',
                                                            border: `1px solid ${alpha('#10b981', 0.2)}`
                                                        }}
                                                    />
                                                    {((hostDetail.vm_total || 0) - (hostDetail.vm_running || 0)) > 0 && (
                                                        <Chip
                                                            size="small"
                                                            label={`${(hostDetail.vm_total || 0) - (hostDetail.vm_running || 0)} Stopped`}
                                                            sx={{
                                                                fontSize: '0.7rem',
                                                                height: 20,
                                                                backgroundColor: alpha('#6b7280', 0.1),
                                                                color: '#6b7280',
                                                                border: `1px solid ${alpha('#6b7280', 0.2)}`
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Paper elevation={0} sx={{
                                                p: 2.5,
                                                textAlign: 'center',
                                                borderRadius: 3,
                                                background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.1)} 0%, ${alpha('#f59e0b', 0.05)} 100%)`,
                                                border: `1px solid ${alpha('#f59e0b', 0.1)}`,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                                    opacity: 0.7
                                                }} />
                                                <Avatar sx={{
                                                    width: 48,
                                                    height: 48,
                                                    mx: 'auto',
                                                    mb: 1.5,
                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                    boxShadow: `0 8px 20px ${alpha('#f59e0b', 0.3)}`
                                                }}>
                                                    <StorageIcon sx={{ fontSize: 24, color: 'white' }} />
                                                </Avatar>
                                                <Typography variant="h3" fontWeight={800} sx={{
                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    mb: 0.5
                                                }}>
                                                    {hostDetail.datastore_count || 0}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                                                    Datastores
                                                </Typography>
                                                <Typography variant="caption" sx={{
                                                    color: '#f59e0b',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem'
                                                }}>
                                                    Storage attached
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Detailed Information Tabs */}
                                <Box sx={{ p: 4 }}>
                                    <Grid container spacing={4}>
                                        {/* Host Information */}
                                        <Grid item xs={12} md={6}>
                                            <Paper elevation={0} sx={{
                                                p: 3,
                                                borderRadius: 3,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                background: alpha(theme.palette.background.paper, 0.7)
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                    <Avatar sx={{
                                                        mr: 2,
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                        width: 40,
                                                        height: 40
                                                    }}>
                                                        <InfoIcon sx={{ fontSize: 20 }} />
                                                    </Avatar>
                                                    <Typography variant="h6" fontWeight={700}>
                                                        Host Information
                                                    </Typography>
                                                </Box>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>Host ID</Typography>
                                                        <Typography variant="body1" sx={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9rem',
                                                            p: 1,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                            borderRadius: 1,
                                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                                            wordBreak: 'break-all'
                                                        }}>
                                                            {hostDetail.host_id}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>IP Address</Typography>
                                                        <Typography variant="body1" sx={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9rem',
                                                            p: 1,
                                                            bgcolor: alpha(theme.palette.success.main, 0.05),
                                                            borderRadius: 1,
                                                            border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                                                            color: theme.palette.success.main,
                                                            wordBreak: 'break-all'
                                                        }}>
                                                            {hostDetail.ip}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>Type</Typography>
                                                        <Typography variant="body1" fontWeight={600}>{hostDetail.type || 'Unknown'}</Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>Status</Typography>
                                                        <Chip
                                                            size="small"
                                                            label={hostDetail.status}
                                                            color={hostDetail.status === 'running' ? 'success' : 'default'}
                                                            icon={hostDetail.status === 'running' ? <RunningIcon /> : undefined}
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>Cluster</Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}>
                                                                <Typography variant="caption" fontWeight={700}>
                                                                    C
                                                                </Typography>
                                                            </Avatar>
                                                            <Typography variant="body1" fontWeight={600}>
                                                                {hostDetail.cluster_name || 'No Cluster'}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                </Grid>
                                            </Paper>
                                        </Grid>

                                        {/* Resource Details */}
                                        <Grid item xs={12} md={6}>
                                            <Paper elevation={0} sx={{
                                                p: 3,
                                                borderRadius: 3,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                background: alpha(theme.palette.background.paper, 0.7)
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                    <Avatar sx={{
                                                        mr: 2,
                                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        width: 40,
                                                        height: 40
                                                    }}>
                                                        <CpuIcon sx={{ fontSize: 20 }} />
                                                    </Avatar>
                                                    <Typography variant="h6" fontWeight={700}>
                                                        Resource Details
                                                    </Typography>
                                                </Box>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>CPU Performance</Typography>
                                                        <Box sx={{
                                                            p: 2,
                                                            borderRadius: 2,
                                                            bgcolor: alpha('#6366f1', 0.05),
                                                            border: `1px solid ${alpha('#6366f1', 0.1)}`
                                                        }}>
                                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                                <strong>Usage:</strong> {((hostDetail.cpu_used_mhz || 0) / 1000).toFixed(1)} GHz / {((hostDetail.cpu_total_mhz || 0) / 1000).toFixed(1)} GHz
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                                <strong>Cores:</strong> {(hostDetail.cpu_cores != null && hostDetail.cpu_cores !== undefined) ? hostDetail.cpu_cores : 'N/A'} cores ({hostDetail.cpu_sockets || 0} sockets)
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={(hostDetail.cpu_usage_ratio || 0) * 100}
                                                                sx={{
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    backgroundColor: alpha('#6366f1', 0.1),
                                                                    '& .MuiLinearProgress-bar': {
                                                                        borderRadius: 4,
                                                                        background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)'
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                                {((hostDetail.cpu_usage_ratio || 0) * 100).toFixed(1)}% utilization
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>Memory Performance</Typography>
                                                        <Box sx={{
                                                            p: 2,
                                                            borderRadius: 2,
                                                            bgcolor: alpha('#8b5cf6', 0.05),
                                                            border: `1px solid ${alpha('#8b5cf6', 0.1)}`
                                                        }}>
                                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                                <strong>Usage:</strong> {((hostDetail.memory_used_mb || 0) / 1024).toFixed(1)} GB / {((hostDetail.memory_total_mb || 0) / 1024).toFixed(1)} GB
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                                <strong>Free:</strong> {((hostDetail.memory_free_mb || 0) / 1024).toFixed(1)} GB available
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={(hostDetail.memory_usage_ratio || 0) * 100}
                                                                sx={{
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    backgroundColor: alpha('#8b5cf6', 0.1),
                                                                    '& .MuiLinearProgress-bar': {
                                                                        borderRadius: 4,
                                                                        background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)'
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                                {((hostDetail.memory_usage_ratio || 0) * 100).toFixed(1)}% utilization
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                </Grid>
                                            </Paper>
                                        </Grid>

                                        {/* Alarms Section */}
                                        {hostDetail.alarms && hostDetail.alarms.length > 0 && (
                                            <Grid item xs={12}>
                                                <Paper elevation={0} sx={{
                                                    p: 3,
                                                    borderRadius: 3,
                                                    border: `1px solid ${alpha('#ef4444', 0.2)}`,
                                                    background: alpha('#fef2f2', 0.7)
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                        <Avatar sx={{
                                                            mr: 2,
                                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                            width: 40,
                                                            height: 40
                                                        }}>
                                                            <WarningIcon sx={{ fontSize: 20 }} />
                                                        </Avatar>
                                                        <Typography variant="h6" fontWeight={700} color="error.main">
                                                            Active Alarms ({hostDetail.alarms.length})
                                                        </Typography>
                                                    </Box>
                                                    <Grid container spacing={2}>
                                                        {hostDetail.alarms.map((alarm: any, idx: number) => (
                                                            <Grid item xs={12} key={idx}>
                                                                <Alert
                                                                    severity="warning"
                                                                    sx={{
                                                                        borderRadius: 2,
                                                                        '& .MuiAlert-message': { width: '100%' }
                                                                    }}
                                                                >
                                                                    <Box>
                                                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                                                                            {alarm.policy_name || 'System Alert'}
                                                                        </Typography>
                                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                                            {alarm.description}
                                                                        </Typography>
                                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                                            <Chip size="small" label={`Level: ${alarm.level}`} color="error" />
                                                                            <Chip size="small" label={`Type: ${alarm.alarm_type}`} variant="outlined" />
                                                                            {alarm.start_time && (
                                                                                <Chip
                                                                                    size="small"
                                                                                    label={`Started: ${new Date(alarm.start_time).toLocaleString()}`}
                                                                                    variant="outlined"
                                                                                />
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                </Alert>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                </Paper>
                                            </Grid>
                                        )}

                                        {/* Datastores Section */}
                                        {hostDetail.datastores && hostDetail.datastores.length > 0 && (
                                            <Grid item xs={12}>
                                                <Paper elevation={0} sx={{
                                                    p: 3,
                                                    borderRadius: 3,
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                    background: alpha(theme.palette.background.paper, 0.7)
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                        <Avatar sx={{
                                                            mr: 2,
                                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                            width: 40,
                                                            height: 40
                                                        }}>
                                                            <StorageIcon sx={{ fontSize: 20 }} />
                                                        </Avatar>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            Connected Datastores ({hostDetail.datastores.length})
                                                        </Typography>
                                                    </Box>
                                                    <Grid container spacing={2}>
                                                        {hostDetail.datastores.map((ds: string, idx: number) => (
                                                            <Grid item xs={12} sm={6} md={4} key={idx}>
                                                                <Paper sx={{
                                                                    p: 2,
                                                                    borderRadius: 2,
                                                                    bgcolor: alpha('#f59e0b', 0.05),
                                                                    border: `1px solid ${alpha('#f59e0b', 0.1)}`,
                                                                    transition: 'all 0.2s ease',
                                                                    '&:hover': {
                                                                        bgcolor: alpha('#f59e0b', 0.08),
                                                                        transform: 'translateY(-2px)',
                                                                        boxShadow: `0 4px 12px ${alpha('#f59e0b', 0.2)}`
                                                                    }
                                                                }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                        <Avatar sx={{
                                                                            width: 32,
                                                                            height: 32,
                                                                            bgcolor: '#f59e0b',
                                                                            mr: 2
                                                                        }}>
                                                                            <StorageIcon sx={{ fontSize: 18 }} />
                                                                        </Avatar>
                                                                        <Box sx={{ flexGrow: 1 }}>
                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                {ds}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Storage Volume
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </Paper>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                </Paper>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <WarningIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Host details not found
                                </Typography>
                                <Typography color="text.secondary">
                                    Unable to load detailed information for this host.
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>
            </Box>
        </Box>
    );
}