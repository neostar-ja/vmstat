import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    LinearProgress,
    Tooltip,
    IconButton,
    TextField,
    InputAdornment,
    TableSortLabel,
    Tabs,
    Tab,
    useTheme,
    useMediaQuery,
    Stack,
    alpha,
} from '@mui/material';
import {
    Storage as StorageIcon,
    CloudDone as OnlineIcon,
    CloudOff as OfflineIcon,
    Speed as SpeedIcon,
    Backup as BackupIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    ViewList as ViewListIcon,
    Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { datastoresApi, Datastore, DatastoreStats } from '../services/datastoresApi';
import DataStoreExecutiveDashboard from './DataStoreExecutiveDashboard';

// Color palette
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS: Record<string, string> = {
    normal: '#22c55e',
    ok: '#22c55e',
    offline: '#ef4444',
    warning: '#f59e0b',
};
const TYPE_ICONS: Record<string, string> = {
    vmfs: '💾',
    nfs: '🌐',
    vs: '☁️',
};

// Format bytes to human readable
const formatBytes = (mb: number): string => {
    if (mb === 0) return '0 MB';
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(2)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(0)} MB`;
};

// Format throughput
const formatThroughput = (byteps: number): string => {
    if (byteps === 0) return '0 B/s';
    if (byteps >= 1073741824) return `${(byteps / 1073741824).toFixed(2)} GB/s`;
    if (byteps >= 1048576) return `${(byteps / 1048576).toFixed(2)} MB/s`;
    if (byteps >= 1024) return `${(byteps / 1024).toFixed(2)} KB/s`;
    return `${byteps.toFixed(0)} B/s`;
};

// Stat Card Component
const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    gradient?: string;
}> = ({ title, value, subtitle, icon, color, gradient }) => {
    const theme = useTheme();
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    return (
        <Card
            sx={{
                background: gradient || `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
                border: `1px solid ${color}30`,
                borderRadius: { xs: 2, md: 3 },
                height: '100%',
            }}
        >
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                            variant={isSmallMobile ? 'caption' : 'body2'} 
                            color="text.secondary" 
                            sx={{ mb: 0.5, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                        >
                            {title}
                        </Typography>
                        <Typography 
                            variant={isSmallMobile ? 'h6' : 'h4'} 
                            fontWeight="bold" 
                            sx={{ 
                                color,
                                fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' },
                                lineHeight: 1.2,
                                wordBreak: 'break-word'
                            }}
                        >
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        sx={{
                            p: { xs: 1, sm: 1.25, md: 1.5 },
                            borderRadius: { xs: 1.5, md: 2 },
                            backgroundColor: `${color}20`,
                            color: color,
                            flexShrink: 0,
                            ml: 1,
                        }}
                    >
                        {React.cloneElement(icon as React.ReactElement, {
                            fontSize: isSmallMobile ? 'medium' : 'large'
                        })}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

const DataStorePage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    
    const [datastores, setDatastores] = useState<Datastore[]>([]);
    const [stats, setStats] = useState<DatastoreStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<keyof Datastore>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [activeTab, setActiveTab] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [dsResponse, statsResponse] = await Promise.all([
                datastoresApi.getAll(),
                datastoresApi.getStats(),
            ]);
            setDatastores(dsResponse.data);
            setStats(statsResponse.data);
        } catch (err) {
            setError('Failed to load datastore data. Please try again.');
            console.error('Error fetching datastores:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSort = (column: keyof Datastore) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedData = datastores
        .filter(
            (ds) =>
                ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ds.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (ds.az_name && ds.az_name.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

    // Prepare chart data
    const pieData = stats?.by_type.map((t, i) => ({
        name: t.type.toUpperCase(),
        value: t.total_mb,
        color: COLORS[i % COLORS.length],
    })) || [];

    const barData = [...datastores]
        .sort((a, b) => b.used_mb - a.used_mb)
        .slice(0, 10)
        .map((ds) => ({
            name: ds.name.length > 15 ? ds.name.substring(0, 15) + '...' : ds.name,
            used: Math.round(ds.used_mb / 1024),
            free: Math.round(ds.free_mb / 1024),
        }));

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box className="animate-fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', md: 'center' },
                flexDirection: { xs: 'row', md: 'row' },
                mb: { xs: 2, md: 3 },
                gap: { xs: 1, md: 2 }
            }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant={isSmallMobile ? 'h5' : 'h4'}
                        sx={{
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: { xs: 0.5, md: 1 },
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                        }}
                    >
                        📦 {!isSmallMobile && 'DataStore Management'}
                        {isSmallMobile && 'DataStore'}
                    </Typography>
                    <Typography variant={isSmallMobile ? 'caption' : 'body2'} color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        ตรวจสอบและจัดการพื้นที่จัดเก็บข้อมูลทั้งหมด
                    </Typography>
                </Box>
                <Tooltip title="รีเฟรชข้อมูล">
                    <IconButton
                        onClick={fetchData}
                        size={isSmallMobile ? 'small' : 'medium'}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            flexShrink: 0,
                            '&:hover': { bgcolor: 'primary.dark', transform: 'rotate(180deg)' },
                            transition: 'all 0.3s ease',
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 3 }, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant={isMobile ? 'fullWidth' : 'standard'}
                    sx={{
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                            minHeight: { xs: 48, md: 64 },
                            px: { xs: 1, sm: 2, md: 3 },
                        },
                    }}
                >
                    <Tab 
                        icon={<ViewListIcon sx={{ fontSize: { xs: 18, md: 24 } }} />} 
                        iconPosition="start" 
                        label={isMobile ? "รายการ" : "รายการ Data Store"}
                    />
                    <Tab 
                        icon={<DashboardIcon sx={{ fontSize: { xs: 18, md: 24 } }} />} 
                        iconPosition="start" 
                        label={isMobile ? "Dashboard" : "ภาพรวมผู้บริหาร"}
                    />
                </Tabs>
            </Paper>

            {/* Tab Content */}
            {activeTab === 1 ? (
                <DataStoreExecutiveDashboard />
            ) : (
                <Box>

                    {/* Stats Cards */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
                        <Grid item xs={6} sm={6} md={3}>
                            <StatCard
                                title="Total DataStores"
                                value={stats?.total_count || 0}
                                subtitle={`${stats?.online_count || 0} online`}
                                icon={<StorageIcon fontSize="large" />}
                                color="#6366f1"
                            />
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                            <StatCard
                                title="Total Storage"
                                value={formatBytes(stats?.total_storage_mb || 0)}
                                subtitle={`${Math.round((stats?.usage_ratio || 0) * 100)}% used`}
                                icon={<SpeedIcon fontSize="large" />}
                                color="#22c55e"
                            />
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                            <StatCard
                                title="Used Storage"
                                value={formatBytes(stats?.total_used_mb || 0)}
                                icon={<BackupIcon fontSize="large" />}
                                color="#f59e0b"
                            />
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                            <StatCard
                                title="Free Storage"
                                value={formatBytes(stats?.total_free_mb || 0)}
                                subtitle={stats?.offline_count ? `⚠️ ${stats.offline_count} offline` : undefined}
                                icon={<OnlineIcon fontSize="large" />}
                                color="#06b6d4"
                            />
                        </Grid>
                    </Grid>

                    {/* Charts */}
                    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
                        {/* Pie Chart - Storage by Type */}
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 3, height: 350, borderRadius: 3 }}>
                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                    📊 Storage by Type
                                </Typography>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => formatBytes(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* Bar Chart - Top 10 by Usage */}
                        <Grid item xs={12} md={8}>
                            <Paper sx={{ p: 3, height: 350, borderRadius: 3 }}>
                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                    📈 Top 10 DataStores by Usage (GB)
                                </Typography>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 20 }}>
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                                        <RechartsTooltip formatter={(value: number) => `${value} GB`} />
                                        <Legend />
                                        <Bar dataKey="used" name="Used" stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="free" name="Free" stackId="a" fill="#22c55e" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* DataStore Table/Cards */}
                    {isMobile ? (
                        // Mobile Card View
                        <Box>
                            <Paper sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                                <Box sx={{ p: 1.5 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                                        📋 DataStore ({filteredAndSortedData.length})
                                    </Typography>
                                    <TextField
                                        size="small"
                                        placeholder="Search..."
                                        fullWidth
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Box>
                            </Paper>
                            
                            <Stack spacing={2}>
                                {filteredAndSortedData.map((ds) => (
                                    <Card 
                                        key={ds.datastore_id}
                                        onClick={() => navigate(`/datastores/${ds.datastore_id}`)}
                                        sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': { boxShadow: 3 }
                                        }}
                                    >
                                        <CardContent sx={{ p: 2 }}>
                                            {/* Header */}
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 24 }}>
                                                        {TYPE_ICONS[ds.type] || '💽'}
                                                    </Typography>
                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                        <Typography 
                                                            variant="subtitle2" 
                                                            fontWeight={600} 
                                                            noWrap
                                                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                        >
                                                            {ds.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                            <Chip label={ds.type.toUpperCase()} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                                            {ds.az_name && (
                                                                <Chip label={ds.az_name} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    label={ds.status}
                                                    size="small"
                                                    icon={ds.status === 'offline' ? <OfflineIcon sx={{ fontSize: 14 }} /> : <OnlineIcon sx={{ fontSize: 14 }} />}
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '0.7rem',
                                                        ml: 1,
                                                        flexShrink: 0,
                                                        bgcolor: `${STATUS_COLORS[ds.status] || '#888'}20`,
                                                        color: STATUS_COLORS[ds.status] || '#888',
                                                        borderColor: STATUS_COLORS[ds.status] || '#888',
                                                    }}
                                                />
                                            </Box>

                                            {/* Storage Info */}
                                            <Box sx={{ mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                                        Used: {formatBytes(ds.used_mb)}
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight={700} fontSize="0.7rem">
                                                        {Math.round(ds.ratio * 100)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(ds.ratio * 100, 100)}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: alpha('#e0e0e0', 0.3),
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: ds.ratio > 0.9 ? '#ef4444' : ds.ratio > 0.7 ? '#f59e0b' : '#22c55e',
                                                            borderRadius: 3,
                                                        },
                                                    }}
                                                />
                                                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                                                    Total: {formatBytes(ds.total_mb)}
                                                </Typography>
                                            </Box>

                                            {/* Performance */}
                                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                                                        📥 Read
                                                    </Typography>
                                                    <Typography variant="body2" fontSize="0.75rem">
                                                        {formatThroughput(ds.read_byteps)}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                                                        📤 Write
                                                    </Typography>
                                                    <Typography variant="body2" fontSize="0.75rem">
                                                        {formatThroughput(ds.write_byteps)}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                                                        💾 Backup
                                                    </Typography>
                                                    {ds.backup_enable ? (
                                                        <Chip label="On" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', mt: 0.3 }} />
                                                    ) : (
                                                        <Chip label="Off" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', mt: 0.3 }} />
                                                    )}
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </Box>
                    ) : (
                        // Desktop Table View
                    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                📋 DataStore List ({filteredAndSortedData.length})
                            </Typography>
                            <TextField
                                size="small"
                                placeholder="Search by name, type, or AZ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ minWidth: 300 }}
                            />
                        </Box>
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <TableSortLabel active={sortBy === 'name'} direction={sortOrder} onClick={() => handleSort('name')}>
                                                Name
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>AZ</TableCell>
                                        <TableCell align="right">
                                            <TableSortLabel active={sortBy === 'total_mb'} direction={sortOrder} onClick={() => handleSort('total_mb')}>
                                                Total
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="right">
                                            <TableSortLabel active={sortBy === 'used_mb'} direction={sortOrder} onClick={() => handleSort('used_mb')}>
                                                Used
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell sx={{ width: 150 }}>Usage</TableCell>
                                        <TableCell align="right">Read</TableCell>
                                        <TableCell align="right">Write</TableCell>
                                        <TableCell>Backup</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredAndSortedData.map((ds) => (
                                        <TableRow
                                            key={ds.datastore_id}
                                            hover
                                            onClick={() => navigate(`/datastores/${ds.datastore_id}`)}
                                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <span>{TYPE_ICONS[ds.type] || '💽'}</span>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {ds.name}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={ds.type.toUpperCase()} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={ds.status}
                                                    size="small"
                                                    icon={ds.status === 'offline' ? <OfflineIcon /> : <OnlineIcon />}
                                                    sx={{
                                                        bgcolor: `${STATUS_COLORS[ds.status] || '#888'}20`,
                                                        color: STATUS_COLORS[ds.status] || '#888',
                                                        borderColor: STATUS_COLORS[ds.status] || '#888',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {ds.az_name || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">{formatBytes(ds.total_mb)}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">{formatBytes(ds.used_mb)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(ds.ratio * 100, 100)}
                                                        sx={{
                                                            flexGrow: 1,
                                                            height: 8,
                                                            borderRadius: 4,
                                                            bgcolor: '#e0e0e0',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: ds.ratio > 0.9 ? '#ef4444' : ds.ratio > 0.7 ? '#f59e0b' : '#22c55e',
                                                                borderRadius: 4,
                                                            },
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ minWidth: 40 }}>
                                                        {Math.round(ds.ratio * 100)}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatThroughput(ds.read_byteps)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatThroughput(ds.write_byteps)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {ds.backup_enable ? (
                                                    <Chip label="Enabled" size="small" color="success" variant="outlined" />
                                                ) : (
                                                    <Chip label="Disabled" size="small" variant="outlined" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default DataStorePage;
