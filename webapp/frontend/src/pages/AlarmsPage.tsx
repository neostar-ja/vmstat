import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    Grid,
    Alert,
    CircularProgress,
    alpha,
    useTheme,
    useMediaQuery,
    Stack,
    ButtonGroup,
    Button,
    Fade,
    Pagination,
    IconButton,
    Tooltip,
    Badge,
    Divider,
    Collapse,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Search as SearchIcon,
    ViewModule as CardViewIcon,
    ViewList as ListViewIcon,
    FilterList as FilterIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Notifications as AlertIcon,
    TrendingUp as TrendingUpIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    AccessTime as TimeIcon,
    Computer as ComputerIcon,
    Storage as StorageIcon,
    Cloud as CloudIcon,
    Repeat as RepeatIcon,
    Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { alarmsApi } from '../services/api';
import type { AlarmListResponse } from '../types';
import AlarmCard from '../components/AlarmCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getSeverityMeta = (severity: string | null) => {
    const s = (severity || '').toLowerCase();
    if (s === 'p1' || s === 'critical') return { 
        label: 'Critical', 
        color: '#e11d48', 
        lightBg: '#fff1f2', 
        darkBg: '#4c0519',
        lightColor: '#9f1239',
        icon: '🔴',
        gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    };
    if (s === 'p2' || s === 'warning')  return { 
        label: 'Warning', 
        color: '#ea580c', 
        lightBg: '#fff7ed', 
        darkBg: '#431407',
        lightColor: '#c2410c',
        icon: '🟠',
        gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    };
    if (s === 'p3' || s === 'info')     return { 
        label: 'Info', 
        color: '#0284c7', 
        lightBg: '#f0f9ff', 
        darkBg: '#082f49',
        lightColor: '#0369a1',
        icon: '🔵',
        gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    };
    return { 
        label: 'Alert', 
        color: '#7c3aed', 
        lightBg: '#faf5ff', 
        darkBg: '#3b0764',
        lightColor: '#6d28d9',
        icon: '💜',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    };
};

const formatTime = (time: string | null) => {
    if (!time) return '—';
    // Format as UTC time to match database storage
    const date = new Date(time);
    const year = date.getUTCFullYear();
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    const monthNamesTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthTH = monthNamesTH[date.getUTCMonth()];
    
    const currentYear = new Date().getUTCFullYear();
    if (year !== currentYear) {
        return `${day} ${monthTH} ${year} ${hours}:${minutes}`;
    }
    return `${day} ${monthTH} ${hours}:${minutes}`;
};

const getSourceIcon = (source: string) => {
    switch (source?.toLowerCase()) {
        case 'vm': return <ComputerIcon sx={{ fontSize: 16 }} />;
        case 'host': return <StorageIcon sx={{ fontSize: 16 }} />;
        case 'system': return <CloudIcon sx={{ fontSize: 16 }} />;
        default: return <CloudIcon sx={{ fontSize: 16 }} />;
    }
};

// ─── Animated Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    gradient: string;
    delay?: number;
}

function AnimatedStatCard({ label, value, icon, gradient, delay = 0 }: StatCardProps) {
    return (
        <Fade in timeout={800} style={{ transitionDelay: `${delay}ms` }}>
            <Card
                sx={{
                    background: gradient,
                    color: '#fff',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: `0 8px 32px ${alpha('#000', 0.2)}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        transform: 'translateY(-8px) scale(1.02)',
                        boxShadow: `0 16px 48px ${alpha('#000', 0.3)}`,
                    },
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 60%)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <CardContent sx={{ p: 3, position: 'relative' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    fontSize: { xs: '2.5rem', sm: '3rem' },
                                    textShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                }}
                            >
                                {value.toLocaleString()}
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    mt: 1,
                                    fontWeight: 700,
                                    opacity: 0.95,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    fontSize: '0.875rem',
                                }}
                            >
                                {label}
                            </Typography>
                        </Box>
                        <Box sx={{ fontSize: 48, opacity: 0.9, textShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                            {icon}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Fade>
    );
}

// ─── Filter Chip Component ──────────────────────────────────────────────────

interface FilterChipProps {
    label: string;
    active: boolean;
    onClick: () => void;
    color?: string;
    icon?: React.ReactNode;
    count?: number;
}

function FilterChip({ label, active, onClick, color = '#3b82f6', icon, count }: FilterChipProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Chip
            icon={icon as any}
            label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span>{label}</span>
                    {count !== undefined && (
                        <Box
                            component="span"
                            sx={{
                                ml: 0.5,
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: active 
                                    ? alpha('#fff', isDark ? 0.2 : 0.3)
                                    : alpha(color, isDark ? 0.2 : 0.15),
                                fontSize: '0.7rem',
                                fontWeight: 800,
                            }}
                        >
                            {count}
                        </Box>
                    )}
                </Box>
            }
            onClick={onClick}
            sx={{
                height: 36,
                px: 1.5,
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(active ? {
                    bgcolor: color,
                    color: '#fff',
                    border: `2px solid ${color}`,
                    boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
                    '&:hover': {
                        bgcolor: color,
                        boxShadow: `0 6px 20px ${alpha(color, 0.4)}`,
                        transform: 'translateY(-2px)',
                    },
                } : {
                    bgcolor: alpha(color, isDark ? 0.15 : 0.08),
                    color: color,
                    border: `2px solid ${alpha(color, isDark ? 0.25 : 0.15)}`,
                    '&:hover': {
                        bgcolor: alpha(color, isDark ? 0.25 : 0.12),
                        borderColor: alpha(color, isDark ? 0.4 : 0.25),
                        transform: 'translateY(-2px)',
                    },
                }),
            }}
        />
    );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function AlarmsPage() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // View state
    const [viewMode, setViewMode] = useState<'card' | 'list'>(isMobile ? 'card' : 'card');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    
    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('open');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [alarmType, setAlarmType] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch data
    const { data, isLoading, error, refetch } = useQuery<AlarmListResponse>({
        queryKey: ['alarms', page, pageSize, statusFilter, severityFilter, sourceFilter, alarmType, search],
        queryFn: () => alarmsApi.getList({
            page,
            page_size: pageSize,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            severity: severityFilter !== 'all' ? severityFilter : undefined,
            source: sourceFilter !== 'all' ? sourceFilter : undefined,
            alarm_type: alarmType !== 'all' ? alarmType : undefined,
            search: search || undefined,
        }).then(res => res.data),
        refetchInterval: 30000,
    });

    const { data: summary } = useQuery({
        queryKey: ['alarms-summary'],
        queryFn: () => alarmsApi.getSummary().then(res => res.data),
        refetchInterval: 60000,
    });

    // Reset page when filters change
    const handleFilterChange = (setter: Function) => (value: any) => {
        setter(value);
        setPage(1);
    };

    // Active filter count
    const activeFilters = [
        statusFilter !== 'open' ? 1 : 0,
        severityFilter !== 'all' ? 1 : 0,
        sourceFilter !== 'all' ? 1 : 0,
        alarmType !== 'all' ? 1 : 0,
        search ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const clearAllFilters = () => {
        setStatusFilter('open');
        setSeverityFilter('all');
        setSourceFilter('all');
        setAlarmType('all');
        setSearch('');
        setPage(1);
    };

    return (
        <Box sx={{ pb: 4 }}>
            {/* Hero Header */}
            <Box
                sx={{
                    mb: 4,
                    p: { xs: 3, sm: 4 },
                    borderRadius: 5,
                    background: isDark
                        ? `linear-gradient(135deg, ${alpha('#1e293b', 0.95)} 0%, ${alpha('#0f172a', 0.98)} 100%)`
                        : `linear-gradient(135deg, ${alpha('#ffffff', 1)} 0%, ${alpha('#f8fafc', 1)} 100%)`,
                    border: `1px solid ${alpha(isDark ? '#334155' : '#e2e8f0', 0.5)}`,
                    boxShadow: isDark
                        ? `0 8px 32px ${alpha('#000', 0.3)}`
                        : `0 8px 32px ${alpha('#000', 0.06)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: isDark
                            ? 'radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.12) 0%, transparent 50%)'
                            : 'radial-gradient(circle at 80% 20%, rgba(225, 29, 72, 0.08) 0%, transparent 50%)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box
                            sx={{
                                width: { xs: 56, sm: 64 },
                                height: { xs: 56, sm: 64 },
                                borderRadius: 3,
                                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: { xs: 28, sm: 32 },
                                boxShadow: `0 8px 24px ${alpha('#e11d48', 0.25)}`,
                            }}
                        >
                            ⚡
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 900,
                                    background: isDark
                                        ? 'linear-gradient(135deg, #fca5a5 0%, #f87171 100%)'
                                        : 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontSize: { xs: '1.75rem', sm: '2.5rem' },
                                    lineHeight: 1.2,
                                }}
                            >
                                Alarms & Alerts
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{ 
                                    mt: 0.5, 
                                    fontSize: { xs: '0.875rem', sm: '1rem' },
                                    color: isDark ? '#94a3b8' : '#64748b',
                                }}
                            >
                                ระบบเฝ้าระวังและจัดการการแจ้งเตือน — Real-time monitoring & intelligent alerting
                            </Typography>
                        </Box>
                        <Tooltip title="Refresh data">
                            <IconButton
                                onClick={() => refetch()}
                                sx={{
                                    width: 48,
                                    height: 48,
                                    bgcolor: isDark 
                                        ? alpha('#e11d48', 0.15)
                                        : alpha('#e11d48', 0.1),
                                    border: `1px solid ${alpha('#e11d48', 0.2)}`,
                                    '&:hover': {
                                        bgcolor: isDark 
                                            ? alpha('#e11d48', 0.25)
                                            : alpha('#e11d48', 0.15),
                                        transform: 'rotate(180deg)',
                                        borderColor: alpha('#e11d48', 0.3),
                                    },
                                    transition: 'all 0.3s',
                                }}
                            >
                                <RefreshIcon sx={{ color: '#e11d48' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} lg={3}>
                    <AnimatedStatCard
                        label="Total Open"
                        value={summary?.open_total ?? 0}
                        icon={<AlertIcon sx={{ fontSize: 48 }} />}
                        gradient={isDark 
                            ? "linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)"
                            : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"}
                        delay={0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <AnimatedStatCard
                        label="Critical (P1)"
                        value={summary?.open_p1 ?? 0}
                        icon={<ErrorIcon sx={{ fontSize: 48 }} />}
                        gradient={isDark
                            ? "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)"
                            : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"}
                        delay={100}
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <AnimatedStatCard
                        label="Warning (P2)"
                        value={summary?.open_p2 ?? 0}
                        icon={<WarningIcon sx={{ fontSize: 48 }} />}
                        gradient={isDark
                            ? "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)"
                            : "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"}
                        delay={200}
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <AnimatedStatCard
                        label="Platform Alerts"
                        value={summary?.open_alerts ?? 0}
                        icon={<CheckCircleIcon sx={{ fontSize: 48 }} />}
                        gradient={isDark
                            ? "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)"
                            : "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"}
                        delay={300}
                    />
                </Grid>
            </Grid>

            {/* Trending Summary Bar */}
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 4,
                    background: isDark
                        ? alpha('#1e293b', 0.6)
                        : '#ffffff',
                    border: `1px solid ${alpha(isDark ? '#334155' : '#e2e8f0', 0.5)}`,
                    boxShadow: isDark
                        ? `0 4px 16px ${alpha('#000', 0.2)}`
                        : `0 4px 16px ${alpha('#000', 0.04)}`,
                }}
            >
                <CardContent sx={{ py: 2, px: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpIcon sx={{ color: isDark ? '#60a5fa' : '#0284c7' }} />
                                <Typography variant="body2" fontWeight={700} sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.813rem' }}>
                                    SOURCE BREAKDOWN
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item>
                            <Divider orientation="vertical" flexItem sx={{ borderColor: alpha(isDark ? '#475569' : '#cbd5e1', 0.5) }} />
                        </Grid>
                        {[
                            { key: 'open_vm', label: 'VM', color: isDark ? '#60a5fa' : '#0284c7', icon: '🖥' },
                            { key: 'open_host', label: 'Host', color: isDark ? '#fb923c' : '#ea580c', icon: '🏠' },
                            { key: 'open_system', label: 'System', color: isDark ? '#a78bfa' : '#7c3aed', icon: '⚙️' },
                        ].map((s) => (
                            <Grid item key={s.key}>
                                <Chip
                                    icon={<Box component="span" sx={{ fontSize: 16 }}>{s.icon}</Box> as any}
                                    label={`${s.label}: ${summary?.[s.key] ?? 0}`}
                                    sx={{
                                        bgcolor: alpha(s.color, isDark ? 0.2 : 0.1),
                                        color: s.color,
                                        fontWeight: 700,
                                        border: `1px solid ${alpha(s.color, 0.3)}`,
                                        fontSize: '0.813rem',
                                    }}
                                />
                            </Grid>
                        ))}
                        <Grid item sx={{ ml: 'auto' }}>
                            <Chip
                                label={`Closed: ${summary?.closed_total ?? 0}`}
                                sx={{
                                    bgcolor: isDark ? alpha('#22c55e', 0.2) : alpha('#16a34a', 0.1),
                                    color: isDark ? '#4ade80' : '#16a34a',
                                    border: `1px solid ${alpha(isDark ? '#22c55e' : '#16a34a', 0.3)}`,
                                    fontWeight: 700,
                                    fontSize: '0.813rem',
                                }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Search & Controls */}
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 4,
                    background: isDark ? alpha('#1e293b', 0.6) : '#ffffff',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(isDark ? '#334155' : '#e2e8f0', 0.5)}`,
                    boxShadow: isDark
                        ? `0 4px 16px ${alpha('#000', 0.2)}`
                        : `0 4px 16px ${alpha('#000', 0.04)}`,
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* Search */}
                        <Grid item xs={12} md={6} lg={5}>
                            <TextField
                                fullWidth
                                placeholder="Search alarms by title, description, resource..."
                                value={search}
                                onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: search && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => handleFilterChange(setSearch)('')}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                    },
                                }}
                            />
                        </Grid>

                        {/* View Toggle */}
                        <Grid item xs={6} md={3} lg={2}>
                            <ButtonGroup fullWidth variant="outlined" size="large">
                                <Button
                                    onClick={() => setViewMode('card')}
                                    variant={viewMode === 'card' ? 'contained' : 'outlined'}
                                    startIcon={<CardViewIcon />}
                                >
                                    Cards
                                </Button>
                                <Button
                                    onClick={() => setViewMode('list')}
                                    variant={viewMode === 'list' ? 'contained' : 'outlined'}
                                    startIcon={<ListViewIcon />}
                                >
                                    List
                                </Button>
                            </ButtonGroup>
                        </Grid>

                        {/* Filter Toggle */}
                        <Grid item xs={6} md={3} lg={2}>
                            <Badge badgeContent={activeFilters} color="error">
                                <Button
                                    fullWidth
                                    variant={showFilters ? 'contained' : 'outlined'}
                                    startIcon={<FilterIcon />}
                                    onClick={() => setShowFilters(!showFilters)}
                                    size="large"
                                >
                                    Filters
                                </Button>
                            </Badge>
                        </Grid>

                        {activeFilters > 0 && (
                            <Grid item xs={12} md="auto" lg="auto">
                                <Button
                                    variant="text"
                                    color="error"
                                    onClick={clearAllFilters}
                                    size="small"
                                    startIcon={<CloseIcon />}
                                >
                                    Clear Filters
                                </Button>
                            </Grid>
                        )}
                    </Grid>

                    {/* Expandable Filters */}
                    <Collapse in={showFilters}>
                        <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${alpha(isDark ? '#334155' : '#e2e8f0', 0.5)}` }}>
                            {/* Status Filters */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Status
                                </Typography>
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                    <FilterChip
                                        label="Open"
                                        active={statusFilter === 'open'}
                                        onClick={() => handleFilterChange(setStatusFilter)('open')}
                                        color={isDark ? '#f87171' : '#dc2626'}
                                        icon={<WarningIcon sx={{ fontSize: 16 }} />}
                                        count={summary?.open_total}
                                    />
                                    <FilterChip
                                        label="Closed"
                                        active={statusFilter === 'closed'}
                                        onClick={() => handleFilterChange(setStatusFilter)('closed')}
                                        color={isDark ? '#4ade80' : '#16a34a'}
                                        icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                                        count={summary?.closed_total}
                                    />
                                    <FilterChip
                                        label="All Status"
                                        active={statusFilter === 'all'}
                                        onClick={() => handleFilterChange(setStatusFilter)('all')}
                                        color={isDark ? '#94a3b8' : '#64748b'}
                                    />
                                </Stack>
                            </Box>

                            {/* Severity Filters */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Severity
                                </Typography>
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                    <FilterChip
                                        label="Critical (P1)"
                                        active={severityFilter === 'p1'}
                                        onClick={() => handleFilterChange(setSeverityFilter)('p1')}
                                        color={isDark ? '#f87171' : '#e11d48'}
                                        icon={<Box component="span">🔴</Box> as any}
                                        count={summary?.open_p1}
                                    />
                                    <FilterChip
                                        label="Warning (P2)"
                                        active={severityFilter === 'p2'}
                                        onClick={() => handleFilterChange(setSeverityFilter)('p2')}
                                        color={isDark ? '#fb923c' : '#ea580c'}
                                        icon={<Box component="span">🟠</Box> as any}
                                        count={summary?.open_p2}
                                    />
                                    <FilterChip
                                        label="Info (P3)"
                                        active={severityFilter === 'p3'}
                                        onClick={() => handleFilterChange(setSeverityFilter)('p3')}
                                        color={isDark ? '#60a5fa' : '#0284c7'}
                                        icon={<Box component="span">🔵</Box> as any}
                                        count={summary?.open_p3}
                                    />
                                    <FilterChip
                                        label="All Severities"
                                        active={severityFilter === 'all'}
                                        onClick={() => handleFilterChange(setSeverityFilter)('all')}
                                        color={isDark ? '#94a3b8' : '#64748b'}
                                    />
                                </Stack>
                            </Box>

                            {/* Source Filters */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Source
                                </Typography>
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                    <FilterChip
                                        label="VM"
                                        active={sourceFilter === 'vm'}
                                        onClick={() => handleFilterChange(setSourceFilter)('vm')}
                                        color={isDark ? '#60a5fa' : '#0284c7'}
                                        icon={<Box component="span">🖥</Box> as any}
                                        count={summary?.open_vm}
                                    />
                                    <FilterChip
                                        label="Host"
                                        active={sourceFilter === 'host'}
                                        onClick={() => handleFilterChange(setSourceFilter)('host')}
                                        color={isDark ? '#fb923c' : '#ea580c'}
                                        icon={<Box component="span">🏠</Box> as any}
                                        count={summary?.open_host}
                                    />
                                    <FilterChip
                                        label="System"
                                        active={sourceFilter === 'system'}
                                        onClick={() => handleFilterChange(setSourceFilter)('system')}
                                        color={isDark ? '#a78bfa' : '#7c3aed'}
                                        icon={<Box component="span">⚙️</Box> as any}
                                        count={summary?.open_system}
                                    />
                                    <FilterChip
                                        label="All Sources"
                                        active={sourceFilter === 'all'}
                                        onClick={() => handleFilterChange(setSourceFilter)('all')}
                                        color={isDark ? '#94a3b8' : '#64748b'}
                                    />
                                </Stack>
                            </Box>

                            {/* Type Filters */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Type
                                </Typography>
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                    <FilterChip
                                        label="Alarms (With Severity)"
                                        active={alarmType === 'alarm'}
                                        onClick={() => handleFilterChange(setAlarmType)('alarm')}
                                        color={isDark ? '#f87171' : '#dc2626'}
                                        count={summary?.open_alarms}
                                    />
                                    <FilterChip
                                        label="Platform Alerts"
                                        active={alarmType === 'alert'}
                                        onClick={() => handleFilterChange(setAlarmType)('alert')}
                                        color={isDark ? '#a78bfa' : '#7c3aed'}
                                        count={summary?.open_alerts}
                                    />
                                    <FilterChip
                                        label="All Types"
                                        active={alarmType === 'all'}
                                        onClick={() => handleFilterChange(setAlarmType)('all')}
                                        color={isDark ? '#94a3b8' : '#64748b'}
                                    />
                                </Stack>
                            </Box>
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                    Failed to load alarms: {(error as Error).message}
                </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress size={60} thickness={4} />
                </Box>
            )}

            {/* Card View */}
            {!isLoading && viewMode === 'card' && (
                <>
                    {data?.items && data.items.length > 0 ? (
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            {data.items.map((alarm) => (
                                <Grid item xs={12} md={6} xl={4} key={alarm.alarm_id}>
                                    <AlarmCard
                                        alarm={alarm}
                                        onClick={() => navigate(`/alarms/${alarm.alarm_id}`)}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Card
                            sx={{
                                borderRadius: 4,
                                textAlign: 'center',
                                py: 10,
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                                    : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 96, color: 'success.light', opacity: 0.3, mb: 3 }} />
                            <Typography variant="h5" fontWeight={700} gutterBottom>
                                No Alarms Found
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                ไม่พบการแจ้งเตือนที่ตรงกับตัวกรองที่เลือก
                            </Typography>
                            {activeFilters > 0 && (
                                <Button
                                    variant="outlined"
                                    onClick={clearAllFilters}
                                    sx={{ mt: 3 }}
                                    startIcon={<CloseIcon />}
                                >
                                    Clear All Filters
                                </Button>
                            )}
                        </Card>
                    )}
                </>
            )}

            {/* List View - Full Featured Table */}
            {!isLoading && viewMode === 'list' && (
                <Card 
                    sx={{ 
                        borderRadius: 4, 
                        overflow: 'hidden',
                        background: isDark 
                            ? alpha('#1e293b', 0.6) 
                            : '#ffffff',
                        border: `1px solid ${alpha(isDark ? '#334155' : '#e2e8f0', 0.5)}`,
                    }}
                >
                    {data?.items && data.items.length > 0 ? (
                        <TableContainer>
                            <Table size={isMobile ? 'small' : 'medium'}>
                                <TableHead>
                                    <TableRow 
                                        sx={{ 
                                            bgcolor: isDark 
                                                ? alpha('#0f172a', 0.8)
                                                : alpha('#f8fafc', 1),
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Time
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Severity
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Status
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Source
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 250 }}>
                                            Title / Description
                                        </TableCell>
                                        {!isMobile && (
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                Resource
                                            </TableCell>
                                        )}
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#e2e8f0' : '#475569', py: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Count
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.items.map((alarm) => {
                                        const severityMeta = getSeverityMeta(alarm.severity);
                                        const isOpen = alarm.status === 'open';
                                        
                                        return (
                                            <TableRow
                                                key={alarm.alarm_id}
                                                onClick={() => navigate(`/alarms/${alarm.alarm_id}`)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    borderLeft: `4px solid ${isDark ? severityMeta.color : severityMeta.lightColor}`,
                                                    transition: 'all 0.2s',
                                                    bgcolor: isDark 
                                                        ? 'transparent'
                                                        : '#ffffff',
                                                    '&:hover': {
                                                        bgcolor: isDark 
                                                            ? alpha(severityMeta.color, 0.08)
                                                            : alpha(severityMeta.lightColor, 0.04),
                                                        transform: 'translateX(4px)',
                                                    },
                                                }}
                                            >
                                                {/* Time */}
                                                <TableCell sx={{ py: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.813rem' }}>
                                                            {formatTime(alarm.begin_time)}
                                                        </Typography>
                                                    </Box>
                                                    {alarm.end_time && (
                                                        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                                            ✓ {formatTime(alarm.end_time)}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                {/* Severity */}
                                                <TableCell>
                                                    <Chip
                                                        label={severityMeta.label}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: isDark 
                                                                ? alpha(severityMeta.color, 0.2)
                                                                : severityMeta.lightBg,
                                                            color: isDark 
                                                                ? severityMeta.color
                                                                : severityMeta.lightColor,
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                            border: `1px solid ${alpha(isDark ? severityMeta.color : severityMeta.lightColor, 0.3)}`,
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <Chip
                                                        label={isOpen ? 'OPEN' : 'CLOSED'}
                                                        size="small"
                                                        icon={isOpen ? <WarningIcon sx={{ fontSize: 14 }} /> : <CheckCircleIcon sx={{ fontSize: 14 }} />}
                                                        sx={{
                                                            bgcolor: isDark
                                                                ? alpha(isOpen ? '#dc2626' : '#16a34a', 0.2)
                                                                : alpha(isOpen ? '#dc2626' : '#16a34a', 0.1),
                                                            color: isOpen ? '#dc2626' : '#16a34a',
                                                            border: `1px solid ${alpha(isOpen ? '#dc2626' : '#16a34a', 0.3)}`,
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Source */}
                                                <TableCell>
                                                    <Chip
                                                        icon={getSourceIcon(alarm.source)}
                                                        label={alarm.source.toUpperCase()}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: isDark 
                                                                ? alpha('#64748b', 0.2)
                                                                : alpha('#64748b', 0.1),
                                                            color: isDark ? '#94a3b8' : '#475569',
                                                            border: `1px solid ${alpha('#64748b', 0.2)}`,
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Title / Description */}
                                                <TableCell>
                                                    <Box>
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight={700}
                                                            sx={{
                                                                color: isDark ? '#f1f5f9' : '#0f172a',
                                                                fontSize: '0.875rem',
                                                                mb: 0.5,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 1,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            {alarm.title || 'Platform Alert'}
                                                        </Typography>
                                                        {alarm.description && alarm.description !== alarm.title && (
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                                sx={{
                                                                    fontSize: '0.813rem',
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                }}
                                                            >
                                                                {alarm.description}
                                                            </Typography>
                                                        )}
                                                        {alarm.recommendation && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                                <LightbulbIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                                                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.75rem' }}>
                                                                    Recommendation available
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                {/* Resource (Hidden on mobile) */}
                                                {!isMobile && (
                                                    <TableCell>
                                                        {alarm.resource_name ? (
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.813rem', color: isDark ? '#cbd5e1' : '#334155' }}>
                                                                    {alarm.resource_name}
                                                                </Typography>
                                                                {alarm.group_name && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                        {alarm.group_name}
                                                                    </Typography>
                                                                )}
                                                                {alarm.object_type && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            display: 'inline-block',
                                                                            px: 0.75,
                                                                            py: 0.25,
                                                                            borderRadius: 1,
                                                                            bgcolor: isDark ? alpha('#475569', 0.3) : alpha('#94a3b8', 0.15),
                                                                            color: isDark ? '#94a3b8' : '#475569',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 600,
                                                                            mt: 0.5,
                                                                        }}
                                                                    >
                                                                        {alarm.object_type}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        ) : (
                                                            <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.813rem' }}>
                                                                —
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* Count */}
                                                <TableCell align="center">
                                                    {alarm.alert_count > 1 ? (
                                                        <Chip
                                                            icon={<RepeatIcon sx={{ fontSize: 14 }} />}
                                                            label={alarm.alert_count}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: isDark 
                                                                    ? alpha('#f59e0b', 0.2)
                                                                    : alpha('#f59e0b', 0.15),
                                                                color: '#f59e0b',
                                                                border: `1px solid ${alpha('#f59e0b', 0.3)}`,
                                                                fontWeight: 800,
                                                                fontSize: '0.75rem',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.813rem' }}>
                                                            1
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 10 }}>
                            <CheckCircleIcon sx={{ fontSize: 96, color: 'success.light', opacity: 0.3, mb: 3 }} />
                            <Typography variant="h5" fontWeight={700} gutterBottom>
                                No Alarms Found
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                ไม่พบการแจ้งเตือนที่ตรงกับตัวกรองที่เลือก
                            </Typography>
                        </Box>
                    )}
                </Card>
            )}

            {/* Pagination */}
            {data && data.total > pageSize && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                        count={data.pages}
                        page={page}
                        onChange={(_, p) => setPage(p)}
                        color="primary"
                        size={isMobile ? 'medium' : 'large'}
                        showFirstButton
                        showLastButton
                        sx={{
                            '& .MuiPaginationItem-root': {
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: '1rem',
                            },
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}
