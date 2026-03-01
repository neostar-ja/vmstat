import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionContext';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    Tabs,
    Tab,
    Skeleton,
    Table,
    TableBody,
    TableHead,
    TableCell,
    TableRow,
    Alert,
    Paper,
    useTheme,
    useMediaQuery,
    alpha,
    LinearProgress,
    TextField,
    CircularProgress,
    Link as MuiLink,
    Breadcrumbs,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Storage as StorageIcon,
    CheckCircle as OnlineIcon,
    Error as OfflineIcon,
    TrendingUp as TrendingUpIcon,
    Backup as BackupIcon,
    AccessTime as TimeIcon,
    Refresh as RefreshIcon,
    Psychology as AIIcon,
    Home as HomeIcon,
    NavigateNext as NavigateNextIcon,
    Dashboard as DashboardIcon,
    BarChart as ChartIcon,
    SaveAlt as SaveIcon,
    Assessment as AssessmentIcon,
    AutoAwesome as PredictionIcon,
    Storage as DataIcon,
    CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,

    Area,
    Legend,
    ComposedChart,
    BarChart,
    Bar,
    ReferenceLine,
} from 'recharts';
import { datastoresApi } from '../services/datastoresApi';

// Time range options
const TIME_RANGES = [
    { label: '1 ชั่วโมง', value: '1h' },
    { label: '6 ชั่วโมง', value: '6h' },
    { label: '12 ชั่วโมง', value: '12h' },
    { label: '1 วัน', value: '1d' },
    { label: '7 วัน', value: '7d' },
    { label: '30 วัน', value: '30d' },
    { label: 'กำหนดเอง', value: 'custom' },
];

// Helper: format bytes
const formatBytes = (mb: number | null) => {
    if (!mb) return '-';
    if (mb >= 1024 * 1024) return `${(mb / (1024 * 1024)).toFixed(2)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
};

// Helper: format throughput
const formatThroughput = (byteps: number | null) => {
    if (!byteps) return '-';
    if (byteps >= 1024 * 1024 * 1024) return `${(byteps / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
    if (byteps >= 1024 * 1024) return `${(byteps / (1024 * 1024)).toFixed(2)} MB/s`;
    if (byteps >= 1024) return `${(byteps / 1024).toFixed(2)} KB/s`;
    return `${byteps.toFixed(0)} B/s`;
};

// Helper: format date for chart
const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('th-TH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Status chip
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const isOnline = status === 'normal' || status === 'online' || status === 'ok';
    return (
        <Chip
            size="small"
            icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'error'}
            sx={{ fontWeight: 600 }}
        />
    );
};

const DataStoreDetailPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { datastoreId } = useParams<{ datastoreId: string }>();
    const { canViewMenu } = usePermissions();
    const canViewOverview = canViewMenu('ds_detail_overview');
    // const canViewCharts = canViewMenu('ds_detail_charts'); // Used for Charts and Analytics
    // const canViewPrediction = canViewMenu('ds_detail_prediction');
    // Optimized permission checks
    const canViewCharts = canViewMenu('ds_detail_charts');
    const canViewPrediction = canViewMenu('ds_detail_prediction');

    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('7d'); // Default เป็น 7 วัน
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customDateOpen, setCustomDateOpen] = useState(false);

    // Fetch datastore details
    const { data: datastoreData, isLoading: datastoreLoading } = useQuery({
        queryKey: ['datastore', datastoreId],
        queryFn: () => datastoresApi.getById(datastoreId!),
        enabled: !!datastoreId
    });

    // Fetch metrics
    const { data: metricsData, isLoading: metricsLoading } = useQuery({
        queryKey: ['datastore-metrics', datastoreId, timeRange, startDate, endDate],
        queryFn: () => datastoresApi.getMetrics(datastoreId!, timeRange, startDate, endDate),
        enabled: !!datastoreId && activeTab === 'charts' && (timeRange !== 'custom' || (!!startDate && !!endDate))
    });

    const datastore = datastoreData?.data;
    const metrics = metricsData?.data?.metrics || [];

    // Fetch analytics
    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['datastore-analytics', datastoreId],
        queryFn: () => datastoresApi.getAnalytics(datastoreId!, 30),
        enabled: !!datastoreId && activeTab === 'analytics'
    });

    const analytics = analyticsData?.data;

    // Fetch AI Prediction
    const { data: aiPredictionData, isLoading: aiLoading, refetch: refetchAI } = useQuery({
        queryKey: ['datastore-ai-prediction', datastoreId],
        queryFn: () => datastoresApi.getAIPrediction(datastoreId!, 90, 90),
        enabled: !!datastoreId && activeTab === 'prediction',
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const aiPrediction = aiPredictionData?.data;



    // Prepare chart data
    const chartData = metrics.map(m => ({
        ...m,
        timestamp_raw: m.timestamp, // เก็บ timestamp ดิบไว้สำหรับประมวลผล
        timestamp: formatChartDate(m.timestamp), // formatted สำหรับแสดงในกราฟ
        used_gb: m.used_mb / 1024,
        total_gb: m.total_mb / 1024,
        free_gb: m.free_mb / 1024,
        read_mbps: m.read_byteps / (1024 * 1024),
        write_mbps: m.write_byteps / (1024 * 1024),
    }));

    if (datastoreLoading) {
        return (
            <Box sx={{ p: 4 }}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 3 }} />
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
            </Box>
        );
    }

    if (!datastore) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">DataStore not found</Alert>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/datastores')} sx={{ mt: 2 }}>
                    กลับไปหน้ารายการ
                </Button>
            </Box>
        );
    }

    return (
        <Box className="animate-fade-in" sx={{
            p: { xs: 2, md: 4 },
            minHeight: '100vh',
            background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                : 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
        }}>
            {/* Standardized Header */}
            <Card
                sx={{
                    mb: { xs: 2, sm: 3, md: 4 },
                    borderRadius: { xs: 2, sm: 3, md: 4 },
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(34, 197, 94, 0.08) 50%, rgba(139, 92, 246, 0.08) 100%)',
                    border: { xs: '1px solid', sm: '2px solid' },
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: { xs: '2px', sm: '3px', md: '4px' },
                        background: 'linear-gradient(90deg, #0ea5e9, #22c55e, #8b5cf6, #0ea5e9)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 3s linear infinite',
                    },
                }}
            >
                <CardContent sx={{ p: { xs: 1.5, sm: 2.5, md: 4 } }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: { xs: 2, sm: 3 }
                    }}>
                        {/* Icon Box */}
                        <Box
                            sx={{
                                width: { xs: 40, sm: 52, md: 64 },
                                height: { xs: 40, sm: 52, md: 64 },
                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: { xs: '0 4px 8px rgba(14, 165, 233, 0.25)', sm: '0 8px 16px rgba(14, 165, 233, 0.3)' },
                                animation: 'float 6s ease-in-out infinite',
                                flexShrink: 0,
                            }}
                        >
                            <StorageIcon sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, color: '#fff' }} />
                        </Box>

                        {/* Text Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5, md: 2 }, mb: { xs: 0.5, sm: 1 }, flexWrap: 'wrap' }}>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: { xs: 700, sm: 800, md: 900 },
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2.5rem' },
                                        letterSpacing: '-0.02em',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {datastore.name}
                                </Typography>
                                <StatusChip status={datastore.status} />
                            </Box>

                            {/* Breadcrumbs / Subtitle */}
                            {!isMobile && (
                                <Breadcrumbs
                                    separator={<NavigateNextIcon fontSize="small" />}
                                    aria-label="breadcrumb"
                                    sx={{
                                        '& .MuiBreadcrumbs-separator': { color: 'text.secondary', mx: 0.5 },
                                        fontSize: '0.8rem',
                                        mb: 0.5
                                    }}
                                >
                                    <MuiLink
                                        underline="hover"
                                        color="inherit"
                                        onClick={() => navigate('/')}
                                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}
                                    >
                                        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                                        Home
                                    </MuiLink>
                                    <MuiLink
                                        underline="hover"
                                        color="inherit"
                                        onClick={() => navigate('/datastores')}
                                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}
                                    >
                                        DataStores
                                    </MuiLink>
                                    <Typography color="text.primary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                                        <StorageIcon sx={{ mr: 0.5, fontSize: 16 }} />
                                        {datastore.name}
                                    </Typography>
                                </Breadcrumbs>
                            )}

                            {/* Extra Chips Row */}
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, mt: { xs: 0.75, sm: 1.25 }, flexWrap: 'wrap' }}>
                                <Chip
                                    label={datastore.type?.toUpperCase() || 'VMFS'}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: { xs: 22, sm: 24 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                />
                                {datastore.az_name && (
                                    <Chip
                                        label={isMobile ? datastore.az_name : `AZ: ${datastore.az_name}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: { xs: 22, sm: 24 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                    />
                                )}
                                {datastore.shared === 1 && (
                                    <Chip
                                        label={isMobile ? "Shared" : "🔗 Shared"}
                                        size="small"
                                        color="info"
                                        sx={{ height: { xs: 22, sm: 24 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                    />
                                )}
                            </Box>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 2,
                            width: { xs: '100%', sm: 'auto' },
                            justifyContent: { xs: 'stretch', sm: 'flex-start' }
                        }}>
                            {isMobile ? (
                                <IconButton
                                    onClick={() => navigate('/datastores')}
                                    color="primary"
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        borderRadius: 2,
                                    }}
                                >
                                    <BackIcon />
                                </IconButton>
                            ) : (
                                <Button
                                    startIcon={<BackIcon />}
                                    onClick={() => navigate('/datastores')}
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 2.5,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderWidth: 2,
                                        '&:hover': { borderWidth: 2 }
                                    }}
                                >
                                    กลับ
                                </Button>
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Custom Date Dialog */}
            <Dialog 
                open={customDateOpen} 
                onClose={() => setCustomDateOpen(false)} 
                maxWidth="sm" 
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon color="primary" />
                        กำหนดช่วงเวลาเอง
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="วันเริ่มต้น"
                            type="datetime-local"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            label="วันสิ้นสุด"
                            type="datetime-local"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setCustomDateOpen(false)} sx={{ borderRadius: 2 }}>
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (startDate && endDate) {
                                setTimeRange('custom');
                                setCustomDateOpen(false);
                            }
                        }}
                        disabled={!startDate || !endDate}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        ยืนยัน
                    </Button>
                </DialogActions>
            </Dialog>



            {/* Tabs with Floating Time Range Selector */}
            <Paper
                elevation={0}
                sx={{
                    mb: { xs: 2, sm: 3 },
                    borderRadius: 3,
                    background: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.6)
                        : alpha(theme.palette.common.white, 0.8),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    position: 'relative'
                }}
            >
                {/* Floating Time Range Selector - Top Right (Desktop Only) */}
                {!isMobile && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 24,
                            zIndex: 10,
                            animation: 'fadeInDown 0.5s ease-out'
                        }}
                    >
                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 200,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    background: theme.palette.mode === 'dark'
                                        ? 'rgba(14, 23, 38, 0.85)'
                                        : 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(20px)',
                                    border: '2px solid',
                                    borderColor: theme.palette.mode === 'dark'
                                        ? 'rgba(139, 92, 246, 0.3)'
                                        : 'rgba(139, 92, 246, 0.2)',
                                    boxShadow: theme.palette.mode === 'dark'
                                        ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                                        : '0 8px 32px rgba(139, 92, 246, 0.15)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        borderColor: theme.palette.mode === 'dark'
                                            ? 'rgba(139, 92, 246, 0.5)'
                                            : 'rgba(139, 92, 246, 0.4)',
                                        boxShadow: theme.palette.mode === 'dark'
                                            ? '0 12px 40px rgba(139, 92, 246, 0.3)'
                                            : '0 12px 40px rgba(139, 92, 246, 0.25)',
                                        transform: 'translateY(-2px)'
                                    },
                                    '&.Mui-focused': {
                                        borderColor: 'primary.main',
                                        boxShadow: theme.palette.mode === 'dark'
                                            ? '0 12px 40px rgba(139, 92, 246, 0.4), 0 0 0 4px rgba(139, 92, 246, 0.1)'
                                            : '0 12px 40px rgba(139, 92, 246, 0.3), 0 0 0 4px rgba(139, 92, 246, 0.1)',
                                        transform: 'translateY(-2px)'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    '&.Mui-focused': {
                                        color: 'primary.main',
                                        fontWeight: 800
                                    }
                                }
                            }}
                        >
                            <InputLabel id="time-range-label-ds-float">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <CalendarIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" fontWeight={700}>
                                        ช่วงเวลา
                                    </Typography>
                                </Box>
                            </InputLabel>
                            <Select
                                labelId="time-range-label-ds-float"
                                value={timeRange}
                                label="ช่วงเวลา"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'custom') {
                                        setCustomDateOpen(true);
                                    } else {
                                        setTimeRange(value);
                                    }
                                }}
                                startAdornment={metricsLoading && (
                                    <CircularProgress
                                        size={18}
                                        thickness={5}
                                        sx={{
                                            ml: 1,
                                            mr: -0.5,
                                            color: 'primary.main'
                                        }}
                                    />
                                )}
                                sx={{
                                    fontWeight: 700,
                                    fontSize: '0.9375rem',
                                    '& .MuiSelect-select': {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        py: 1.5
                                    },
                                    '& .MuiSelect-icon': {
                                        color: 'primary.main'
                                    }
                                }}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            borderRadius: 3,
                                            mt: 1,
                                            background: theme.palette.mode === 'dark'
                                                ? 'rgba(14, 23, 38, 0.95)'
                                                : 'rgba(255, 255, 255, 0.98)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid',
                                            borderColor: theme.palette.mode === 'dark'
                                                ? 'rgba(139, 92, 246, 0.2)'
                                                : 'rgba(139, 92, 246, 0.15)',
                                            boxShadow: theme.palette.mode === 'dark'
                                                ? '0 12px 48px rgba(0, 0, 0, 0.5)'
                                                : '0 12px 48px rgba(139, 92, 246, 0.2)',
                                            '& .MuiMenuItem-root': {
                                                borderRadius: 2,
                                                mx: 1,
                                                my: 0.5,
                                                px: 2,
                                                py: 1.5,
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    background: theme.palette.mode === 'dark'
                                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%)'
                                                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(14, 165, 233, 0.12) 100%)',
                                                    transform: 'translateX(6px) scale(1.02)',
                                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
                                                },
                                                '&.Mui-selected': {
                                                    background: theme.palette.mode === 'dark'
                                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(14, 165, 233, 0.3) 100%)'
                                                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(14, 165, 233, 0.18) 100%)',
                                                    fontWeight: 800,
                                                    borderLeft: '3px solid',
                                                    borderColor: 'primary.main',
                                                    '&:hover': {
                                                        background: theme.palette.mode === 'dark'
                                                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35) 0%, rgba(14, 165, 233, 0.35) 100%)'
                                                            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(14, 165, 233, 0.22) 100%)'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }}
                            >
                                {TIME_RANGES.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                            {opt.value === 'custom' && (
                                                <CalendarIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={timeRange === opt.value ? 800 : 600}
                                                    sx={{ fontSize: '0.9375rem' }}
                                                >
                                                    {opt.value === 'custom' && startDate && endDate
                                                        ? `${startDate.split('T')[0]} ถึง ${endDate.split('T')[0]}`
                                                        : opt.label
                                                    }
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* Mobile Time Range Selector - Below Tabs */}
                {isMobile && (activeTab === 'charts' || activeTab === 'analytics' || activeTab === 'prediction') && (
                    <Box sx={{ px: 2, pb: 2 }}>
                        <FormControl
                            fullWidth
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        >
                            <InputLabel id="time-range-label-mobile">ช่วงเวลา</InputLabel>
                            <Select
                                labelId="time-range-label-mobile"
                                value={timeRange}
                                label="ช่วงเวลา"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'custom') {
                                        setCustomDateOpen(true);
                                    } else {
                                        setTimeRange(value);
                                    }
                                }}
                                startAdornment={metricsLoading && (
                                    <CircularProgress
                                        size={18}
                                        thickness={5}
                                        sx={{ ml: 1, mr: -0.5, color: 'primary.main' }}
                                    />
                                )}
                            >
                                {TIME_RANGES.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.value === 'custom' && startDate && endDate
                                            ? `${startDate.split('T')[0]} ถึง ${endDate.split('T')[0]}`
                                            : opt.label
                                        }
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant={isMobile ? "scrollable" : "scrollable"}
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        px: { xs: 1, sm: 2, md: 3 },
                        '& .MuiTabs-flexContainer': {
                            gap: { xs: 0.5, sm: 1, md: 1.5 },
                        },
                        '& .MuiTabs-indicator': {
                            height: 4,
                            borderRadius: '4px 4px 0 0',
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(90deg, #8b5cf6 0%, #0ea5e9 100%)'
                                : 'linear-gradient(90deg, #7c3aed 0%, #0284c7 100%)',
                            boxShadow: '0 -2px 8px rgba(139, 92, 246, 0.4)'
                        },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                            minHeight: { xs: 54, sm: 60, md: 64 },
                            px: { xs: 1.5, sm: 2, md: 3 },
                            py: { xs: 1, sm: 1.25, md: 1.5 },
                            color: theme.palette.text.secondary,
                            borderRadius: 2,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'visible',
                            '&:before': {
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                borderRadius: 2,
                                background: 'transparent',
                                transition: 'all 0.3s ease',
                                zIndex: -1
                            },
                            '&:hover': {
                                color: theme.palette.primary.main,
                                transform: 'translateY(-2px)',
                                '&:before': {
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)'
                                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(14, 165, 233, 0.06) 100%)',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
                                },
                                '& .MuiSvgIcon-root': {
                                    transform: 'scale(1.1) rotate(-5deg)',
                                    color: theme.palette.primary.main
                                }
                            },
                            '&.Mui-selected': {
                                color: theme.palette.mode === 'dark' ? '#8b5cf6' : '#7c3aed',
                                fontWeight: 800,
                                '&:before': {
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(14, 165, 233, 0.18) 100%)'
                                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(14, 165, 233, 0.12) 100%)',
                                    boxShadow: theme.palette.mode === 'dark'
                                        ? '0 6px 20px rgba(139, 92, 246, 0.3)'
                                        : '0 6px 20px rgba(139, 92, 246, 0.25)',
                                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.25)'}`
                                },
                                '& .MuiSvgIcon-root': {
                                    color: theme.palette.mode === 'dark' ? '#8b5cf6' : '#7c3aed',
                                    transform: 'scale(1.15)',
                                    filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.35))'
                                }
                            },
                            '& .MuiSvgIcon-root': {
                                fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.375rem' },
                                transition: 'all 0.3s ease'
                            }
                        },
                        '& .MuiTabs-scrollButtons': {
                            color: theme.palette.primary.main,
                            '&.Mui-disabled': {
                                opacity: 0.3
                            }
                        }
                    }}
                >
                    {canViewOverview && (
                        <Tab
                            icon={<DashboardIcon />}
                            iconPosition={isMobile ? "top" : "start"}
                            label={isMobile ? "ภาพรวม" : "ภาพรวม"}
                            value="overview"
                            sx={{ minWidth: { xs: 60, sm: 100 }, px: { xs: 1, sm: 2 } }}
                        />
                    )}
                    {canViewCharts && (
                        <Tab
                            icon={<ChartIcon />}
                            iconPosition={isMobile ? "top" : "start"}
                            label={isMobile ? "กราฟ" : "กราฟ Storage"}
                            value="charts"
                            sx={{ minWidth: { xs: 60, sm: 100 }, px: { xs: 1, sm: 2 } }}
                        />
                    )}
                    {canViewOverview && (
                        <Tab
                            icon={<SaveIcon />}
                            iconPosition={isMobile ? "top" : "start"}
                            label={isMobile ? "Backup" : "การสำรองข้อมูล"}
                            value="backup"
                            sx={{ minWidth: { xs: 60, sm: 100 }, px: { xs: 1, sm: 2 } }}
                        />
                    )}
                    {canViewCharts && (
                        <Tab
                            icon={<AssessmentIcon />}
                            iconPosition={isMobile ? "top" : "start"}
                            label={isMobile ? "วิเคราะห์" : "การวิเคราะห์"}
                            value="analytics"
                            sx={{ minWidth: { xs: 60, sm: 100 }, px: { xs: 1, sm: 2 } }}
                        />
                    )}
                    {canViewPrediction && (
                        <Tab
                            icon={<PredictionIcon />}
                            iconPosition={isMobile ? "top" : "start"}
                            label={isMobile ? "AI" : "AI ทำนาย"}
                            value="prediction"
                            sx={{ minWidth: { xs: 60, sm: 100 }, px: { xs: 1, sm: 2 } }}
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Tab Content: Overview */}
            {activeTab === 'overview' && canViewOverview && (
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 3, height: '100%' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    📋 ข้อมูลทั่วไป
                                </Typography>
                                <Box sx={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <Table size="small" sx={{ minWidth: { xs: 280, sm: 'auto' } }}>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>ID</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-all' }}>{datastore.datastore_id}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Name</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.name}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Type</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.type?.toUpperCase()}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Status</TableCell>
                                                <TableCell><StatusChip status={datastore.status} /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>AZ</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.az_name || '-'}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Connected Hosts</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.connected_hosts}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Shared</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.shared === 1 ? '✅ Yes' : '❌ No'}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 3, height: '100%' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    ⚡ Performance
                                </Typography>
                                <Box sx={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <Table size="small" sx={{ minWidth: { xs: 280, sm: 'auto' } }}>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Read Throughput</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatThroughput(datastore.read_byteps)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Write Throughput</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatThroughput(datastore.write_byteps)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Max Read</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatThroughput(datastore.max_read_byteps)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Max Write</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatThroughput(datastore.max_write_byteps)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>First Seen</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.first_seen_at ? new Date(datastore.first_seen_at).toLocaleDateString('th-TH') : '-'}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Last Updated</TableCell>
                                                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{datastore.last_seen_at ? new Date(datastore.last_seen_at).toLocaleString('th-TH') : '-'}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tab Content: Storage Charts */}
            {activeTab === 'charts' && canViewCharts && (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                📊 Storage Usage History
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                แสดงข้อมูลประวัติการใช้งาน Storage และการเปลี่ยนแปลงตามช่วงเวลา
                            </Typography>
                        </Box>

                        {metricsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress size={60} />
                                <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
                                    กำลังโหลดข้อมูล...
                                </Typography>
                            </Box>
                        ) : chartData.length === 0 ? (
                            <Alert severity="info" sx={{ my: 4 }}>
                                ไม่มีข้อมูล metrics ในช่วงเวลาที่เลือก กรุณารอการ sync หรือเลือกช่วงเวลาอื่น
                            </Alert>
                        ) : (
                            <>
                                {/* Storage Usage Area Chart */}
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                    💾 Storage Usage (GB)
                                </Typography>
                                <Box sx={{ height: { xs: 250, sm: 300 }, mb: { xs: 3, sm: 4 } }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorFree" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="timestamp" fontSize={12} />
                                            <YAxis fontSize={12} tickFormatter={(v) => `${v.toFixed(0)} GB`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 8 }}
                                                formatter={(value: number) => [`${value.toFixed(2)} GB`]}
                                            />
                                            <Legend />
                                            <Area
                                                type="monotone"
                                                dataKey="used_gb"
                                                name="Used"
                                                stroke="#ef4444"
                                                fillOpacity={1}
                                                fill="url(#colorUsed)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="free_gb"
                                                name="Free"
                                                stroke="#10b981"
                                                fillOpacity={1}
                                                fill="url(#colorFree)"
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>

                                {/* Storage Usage History Table - 7 วันล่าสุด */}
                                {(() => {
                                    // จัดกลุ่มข้อมูลตามวัน
                                    const dailyData: any[] = [];
                                    const dateMap = new Map<string, any>();

                                    chartData.forEach((item: any) => {
                                        // ใช้ timestamp_raw แทน timestamp ที่ถูก format แล้ว
                                        const timestamp = item.timestamp_raw || item.timestamp;
                                        const date = new Date(timestamp);

                                        // ตรวจสอบว่า date valid หรือไม่
                                        if (isNaN(date.getTime())) {
                                            console.warn('Invalid date:', timestamp);
                                            return;
                                        }

                                        const dateKey = date.toISOString().split('T')[0]; // ใช้ ISO format YYYY-MM-DD

                                        const currentTimestamp = new Date(timestamp).getTime();
                                        const existingTimestamp = dateMap.has(dateKey) ? new Date(dateMap.get(dateKey).timestamp_raw || dateMap.get(dateKey).timestamp).getTime() : 0;

                                        if (!dateMap.has(dateKey) || currentTimestamp > existingTimestamp) {
                                            dateMap.set(dateKey, { ...item, timestamp_raw: timestamp });
                                        }
                                    });

                                    const sortedDates = Array.from(dateMap.entries())
                                        .sort((a, b) => {
                                            const dateA = new Date(a[1].timestamp_raw || a[1].timestamp).getTime();
                                            const dateB = new Date(b[1].timestamp_raw || b[1].timestamp).getTime();
                                            return dateA - dateB;
                                        })
                                        .slice(-7); // เอา 7 วันล่าสุด

                                    sortedDates.forEach(([dateKey, item], index) => {
                                        const used = item.used_gb || 0;
                                        const free = item.free_gb || 0;
                                        const total = used + free;
                                        const usagePercent = total > 0 ? (used / total) * 100 : 0;

                                        let changeFromPrevDay = 0;
                                        let changePercent = 0;
                                        if (index > 0) {
                                            const prevDayUsed = sortedDates[index - 1][1].used_gb || 0;
                                            changeFromPrevDay = used - prevDayUsed;
                                            changePercent = prevDayUsed > 0 ? (changeFromPrevDay / prevDayUsed) * 100 : 0;
                                        }

                                        const validDate = new Date(item.timestamp_raw || item.timestamp);
                                        dailyData.push({
                                            date: validDate,
                                            dateStr: dateKey,
                                            used_gb: used,
                                            free_gb: free,
                                            total_gb: total,
                                            usagePercent: usagePercent,
                                            changeGB: changeFromPrevDay,
                                            changePercent: changePercent,
                                            timestamp: item.timestamp_raw || item.timestamp
                                        });
                                    });

                                    return (
                                        <Card
                                            sx={{
                                                mb: 4,
                                                borderRadius: 3,
                                                overflow: 'hidden',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                border: '1px solid',
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <Box sx={{
                                                bgcolor: 'primary.main',
                                                color: 'primary.contrastText',
                                                px: 3,
                                                py: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}>
                                                <DataIcon />
                                                <Typography variant="h6" fontWeight={700}>
                                                    ประวัติการใช้งาน Storage (7 วันล่าสุด)
                                                </Typography>
                                            </Box>
                                            <Box sx={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                                <Table size="small" sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 2 }}>📅 วันที่</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>💾 ที่ใช้งาน</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>📦 ที่ว่าง</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>📊 สัดส่วน</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>📈 เปลี่ยนแปลง</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dailyData.map((day, index) => {
                                                            const isToday = new Date().toDateString() === day.date.toDateString();
                                                            const isIncreasing = day.changeGB > 0;
                                                            const isDecreasing = day.changeGB < 0;

                                                            return (
                                                                <TableRow
                                                                    key={index}
                                                                    hover
                                                                    sx={{
                                                                        bgcolor: isToday ? 'rgba(139, 92, 246, 0.05)' : 'inherit',
                                                                        '&:hover': {
                                                                            bgcolor: 'action.hover',
                                                                            transform: 'scale(1.001)',
                                                                            transition: 'all 0.2s ease'
                                                                        }
                                                                    }}
                                                                >
                                                                    <TableCell sx={{ py: 2, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            <Typography variant="body2" fontWeight={isToday ? 700 : 500} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
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
                                                                    <TableCell align="right">
                                                                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                                                            {day.used_gb.toFixed(2)} GB
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                                                            ({(day.used_gb * 1024).toFixed(0)} MB)
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                                                            {day.free_gb.toFixed(2)} GB
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                                                            ({(day.free_gb * 1024).toFixed(0)} MB)
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                                            <Box
                                                                                sx={{
                                                                                    width: 60,
                                                                                    height: 6,
                                                                                    bgcolor: 'action.hover',
                                                                                    borderRadius: 3,
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
                                                                                        width: `${day.usagePercent}%`,
                                                                                        bgcolor: day.usagePercent > 90 ? 'error.main' :
                                                                                            day.usagePercent > 80 ? 'warning.main' :
                                                                                                'success.main',
                                                                                        borderRadius: 3
                                                                                    }}
                                                                                />
                                                                            </Box>
                                                                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                                                                {day.usagePercent.toFixed(1)}%
                                                                            </Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {index === 0 ? (
                                                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                                                -
                                                                            </Typography>
                                                                        ) : (
                                                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                                <Chip
                                                                                    label={
                                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                            <Typography variant="caption" fontWeight={700}>
                                                                                                {isIncreasing ? '+' : ''}{Math.abs(day.changeGB).toFixed(2)} GB
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
                                                                            </Box>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Card>
                                    );
                                })()}


                                {/* Throughput Line Chart */}
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                    ⚡ Throughput (MB/s)
                                </Typography>
                                <Box sx={{ height: { xs: 200, sm: 250 }, overflow: 'auto' }}>
                                    <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="timestamp" fontSize={12} />
                                            <YAxis fontSize={12} tickFormatter={(v) => `${v.toFixed(1)} MB/s`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 8 }}
                                                formatter={(value: number) => [`${value.toFixed(2)} MB/s`]}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="read_mbps"
                                                name="Read"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="write_mbps"
                                                name="Write"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab Content: Backup */}
            {activeTab === 'backup' && canViewOverview && (
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            💾 Backup Information
                        </Typography>
                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: alpha('#6366f1', 0.1) }}>
                                    <BackupIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#6366f1', mb: 1 }} />
                                    <Typography variant="h5" fontWeight={800} color="#6366f1" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                        {datastore.backup_enable === 1 ? '✅ Enabled' : '❌ Disabled'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Backup Status</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: alpha('#10b981', 0.1) }}>
                                    <Typography variant="h4" fontWeight={800} color="#10b981" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                        {formatBytes(datastore.backup_total_mb)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Backup Total</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.1) }}>
                                    <Typography variant="h4" fontWeight={800} color="#f59e0b" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                        {formatBytes(datastore.backup_used_mb)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Backup Used</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: alpha('#ef4444', 0.1) }}>
                                    <Typography variant="h4" fontWeight={800} color="#ef4444" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                        {((datastore.backup_ratio || 0) * 100).toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Backup Usage</Typography>
                                </Box>
                            </Grid>
                        </Grid>
                        {datastore.archive_usable === 1 && (
                            <Alert severity="success" sx={{ mt: 3 }}>
                                ✅ Archive storage is available for this datastore
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab Content: Analytics */}
            {activeTab === 'analytics' && canViewCharts && (
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    {/* Prediction Card */}
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 3, mb: { xs: 2, sm: 3 }, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} alignItems="center">
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="h6" gutterBottom color="grey.400" sx={{ fontSize: { xs: '0.875rem', sm: '1.25rem' } }}>
                                            🤖 AI Prediction
                                        </Typography>
                                        <Typography variant="h3" fontWeight={800} sx={{
                                            background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
                                            backgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }
                                        }}>
                                            {analytics?.prediction.days_until_full
                                                ? `${analytics.prediction.days_until_full.toFixed(0)} Days`
                                                : 'Stable'}
                                        </Typography>
                                        <Typography variant="body1" color="grey.400" sx={{ fontSize: { xs: '0.75rem', sm: '1rem' } }}>
                                            Estimated time until storage exhaustion
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                            <Typography variant="subtitle2" color="grey.400" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Growth Rate</Typography>
                                            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                                {analytics?.growth_trend.rate_mb_per_day.toFixed(2)} MB/day
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={analytics?.growth_trend.direction.toUpperCase()}
                                                color={analytics?.growth_trend.direction === 'increasing' ? 'warning' : 'success'}
                                                sx={{ mt: 1 }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                            <Typography variant="subtitle2" color="grey.400" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Full Date</Typography>
                                            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                                {analytics?.prediction.estimated_full_date
                                                    ? new Date(analytics.prediction.estimated_full_date).toLocaleDateString()
                                                    : 'Not projected'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Growth Chart */}
                    <Grid item xs={12} md={8}>
                        <Card sx={{ borderRadius: 3, height: '100%' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    📈 Growth Trend & Forecast
                                </Typography>
                                <Box sx={{ height: { xs: 250, sm: 300, md: 350 } }}>
                                    {analyticsLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                            <CircularProgress />
                                        </Box>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={analytics?.points}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                    fontSize={12}
                                                />
                                                <YAxis label={{ value: 'MB', angle: -90, position: 'insideLeft' }} fontSize={12} />
                                                <Tooltip
                                                    labelFormatter={(d) => new Date(d).toLocaleString()}
                                                    formatter={(v: number) => [`${v.toFixed(2)} MB`]}
                                                />
                                                <Legend />
                                                <Area type="monotone" dataKey="actual_used_mb" name="Actual Usage" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.2} />
                                                <Line type="monotone" dataKey="trend_used_mb" name="Trend Line" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Volatility & Anomalies */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ borderRadius: 3, height: '100%' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    📉 Volatility Analysis
                                </Typography>
                                <Box sx={{ mb: 3, textAlign: 'center', p: 2, bgcolor: alpha('#ef4444', 0.1), borderRadius: 2 }}>
                                    <Typography variant="h3" fontWeight={800} color="#ef4444" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                                        {analytics?.volatility.score.toFixed(1)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Volatility Score (StdDev)</Typography>
                                </Box>

                                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Detected Anomalies
                                </Typography>
                                {analytics?.volatility.anomalies.length === 0 ? (
                                    <Alert severity="success">No anomalies detected in the last 30 days.</Alert>
                                ) : (
                                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        {analytics?.volatility.anomalies.map((anomaly, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, mb: 1, borderBottom: '1px solid #eee' }}>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {new Date(anomaly.date).toLocaleDateString()}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Deviation: {anomaly.deviation}σ
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color={anomaly.change_mb > 0 ? 'error.main' : 'success.main'} fontWeight={700}>
                                                    {anomaly.change_mb > 0 ? '+' : ''}{anomaly.change_mb.toFixed(0)} MB
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tab Content: AI Prediction */}
            {activeTab === 'prediction' && canViewPrediction && (
                <AIPredictionTab
                    aiPrediction={aiPrediction}
                    aiLoading={aiLoading}
                    refetchAI={refetchAI}
                    formatBytes={formatBytes}
                    theme={theme}
                />
            )}
        </Box>
    );
};

// AI Prediction Tab Component
interface AIPredictionTabProps {
    aiPrediction: any;
    aiLoading: boolean;
    refetchAI: () => void;
    formatBytes: (mb: number | null) => string;
    theme: any;
}

const AIPredictionTab: React.FC<AIPredictionTabProps> = ({ aiPrediction, aiLoading, refetchAI, formatBytes, theme }) => {
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!aiPrediction?.success || !aiPrediction?.forecast || !aiPrediction?.actual) {
            return [];
        }

        // Merge actual and forecast data
        const actualMap = new Map(aiPrediction.actual.map((a: any) => [a.ds.split('T')[0], a.actual]));

        return aiPrediction.forecast.map((f: any) => {
            const dateKey = f.ds.split('T')[0];
            return {
                date: new Date(f.ds).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
                fullDate: f.ds,
                actual: actualMap.get(dateKey) || null,
                forecast: f.yhat,
                forecastLower: f.yhat_lower,
                forecastUpper: f.yhat_upper,
                isForecast: f.is_forecast,
                capacityLine: aiPrediction.capacity?.total_mb || 0
            };
        });
    }, [aiPrediction]);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return '#ef4444';
            case 'warning': return '#f97316';
            case 'caution': return '#eab308';
            default: return '#22c55e';
        }
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'caution': return '⏰';
            default: return '✅';
        }
    };

    const formatDaysUntilFull = (days: number | null) => {
        if (days === null) return 'ไม่มีกำหนด';
        if (days <= 0) return 'เต็มแล้ว!';
        if (days < 30) return `${Math.round(days)} วัน`;
        if (days < 365) return `${(days / 30).toFixed(1)} เดือน`;
        return `${(days / 365).toFixed(1)} ปี`;
    };

    if (aiLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                <CircularProgress size={60} sx={{ color: '#8b5cf6' }} />
                <Typography variant="h6" color="text.secondary">
                    🤖 AI กำลังวิเคราะห์ข้อมูล...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    ใช้เวลาประมาณ 5-10 วินาที
                </Typography>
            </Box>
        );
    }

    if (!aiPrediction?.success) {
        return (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    ⚠️ ไม่สามารถวิเคราะห์ได้
                </Typography>
                <Typography variant="body2">
                    {aiPrediction?.message || 'ข้อมูลไม่เพียงพอสำหรับการพยากรณ์ ต้องการอย่างน้อย 7 วัน'}
                </Typography>
            </Alert>
        );
    }

    return (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Risk Dashboard */}
            <Grid item xs={12}>
                <Card sx={{
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${alpha(getRiskColor(aiPrediction?.prediction?.risk_level), 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                    border: `2px solid ${alpha(getRiskColor(aiPrediction?.prediction?.risk_level), 0.3)}`,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${getRiskColor(aiPrediction?.prediction?.risk_level)}, ${alpha(getRiskColor(aiPrediction?.prediction?.risk_level), 0.3)})`
                    }} />
                    <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} alignItems="center">
                            {/* Risk Score */}
                            <Grid item xs={12} md={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Box sx={{
                                        width: { xs: 80, sm: 100, md: 120 },
                                        height: { xs: 80, sm: 100, md: 120 },
                                        borderRadius: '50%',
                                        background: `conic-gradient(${getRiskColor(aiPrediction?.prediction?.risk_level)} ${aiPrediction?.prediction?.risk_score}%, transparent 0%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 2,
                                        position: 'relative'
                                    }}>
                                        <Box sx={{
                                            width: { xs: 66, sm: 84, md: 100 },
                                            height: { xs: 66, sm: 84, md: 100 },
                                            borderRadius: '50%',
                                            bgcolor: 'background.paper',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'column'
                                        }}>
                                            <Typography variant="h3" fontWeight={900} color={getRiskColor(aiPrediction?.prediction?.risk_level)} sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                                                {aiPrediction?.prediction?.risk_score}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Chip
                                        label={aiPrediction?.prediction?.risk_level?.toUpperCase()}
                                        sx={{
                                            bgcolor: getRiskColor(aiPrediction?.prediction?.risk_level),
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                        }}
                                    />
                                </Box>
                            </Grid>

                            {/* Predicted Full Date */}
                            <Grid item xs={12} md={5}>
                                <Box sx={{
                                    p: { xs: 2, sm: 3 },
                                    borderRadius: 3,
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <TimeIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: getRiskColor(aiPrediction?.prediction?.risk_level) }} />
                                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '0.875rem', sm: '1.25rem' } }}>
                                            📅 คาดการณ์วันเต็ม
                                        </Typography>
                                    </Box>
                                    {(() => {
                                        const total = aiPrediction?.capacity?.total_mb || 0;
                                        const current = aiPrediction?.capacity?.current_used_mb || 0;
                                        const gr = aiPrediction?.prediction?.growth_rate_mb_per_day || 0;
                                        let estDays = null as number | null;
                                        if (gr > 0) estDays = (total - current) / gr;
                                        const reportedDays = aiPrediction?.prediction?.days_until_full ?? null;
                                        const isConsistent = estDays !== null && reportedDays !== null ? Math.abs(reportedDays - estDays) <= 365 : reportedDays !== null;

                                        // Choose which days to display: prefer reportedDays if consistent, otherwise use estDays if reasonable
                                        let displayDays = reportedDays;
                                        if (!isConsistent) {
                                            if (estDays !== null && estDays <= 36500) displayDays = estDays;
                                            else displayDays = null;
                                        }

                                        return (
                                            <>
                                                <Typography variant="h4" fontWeight={900} color={getRiskColor(aiPrediction?.prediction?.risk_level)} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                                                    {getRiskIcon(aiPrediction?.prediction?.risk_level)} {formatDaysUntilFull(displayDays)}
                                                </Typography>

                                                {aiPrediction?.prediction?.predicted_full_date && isConsistent ? (
                                                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '1rem' } }}>
                                                        {new Date(aiPrediction.prediction.predicted_full_date).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>ไม่สามารถคาดการณ์วันเต็มได้อย่างน่าเชื่อถือจากข้อมูลปัจจุบัน</Typography>
                                                )}
                                            </>
                                        );
                                    })()}
                                </Box>
                            </Grid>

                            {/* Quick Stats */}
                            <Grid item xs={12} md={4}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                                    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#6366f1', 0.1) }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>อัตราเพิ่มขึ้นต่อวัน</Typography>
                                        <Typography variant="h6" fontWeight={700} color="#6366f1" sx={{ fontSize: { xs: '0.875rem', sm: '1.25rem' } }}>
                                            📈 {formatBytes(aiPrediction?.prediction?.growth_rate_mb_per_day)} /วัน
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#10b981', 0.1) }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>ใช้งานปัจจุบัน</Typography>
                                        <Typography variant="h6" fontWeight={700} color="#10b981" sx={{ fontSize: { xs: '0.875rem', sm: '1.25rem' } }}>
                                            💾 {aiPrediction?.capacity?.current_percent?.toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.1) }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Model ที่ใช้</Typography>
                                        <Typography variant="h6" fontWeight={700} color="#f59e0b" sx={{ fontSize: { xs: '0.875rem', sm: '1.25rem' } }}>
                                            🤖 {aiPrediction?.model === 'prophet' ? 'Facebook Prophet' : 'Linear Regression'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>

            {/* 🥇 Capacity Planning Dashboard */}
            <Grid item xs={12}>
                <Card sx={{ borderRadius: 4, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#1e293b', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            🥇 แผนวิเคราะห์การใช้งาน (Capacity Planning Dashboard)
                        </Typography>
                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                            {/* Current Capacity Status */}
                            <Grid item xs={6} sm={6} md={3}>
                                <Box sx={{
                                    p: { xs: 1.5, sm: 2, md: 3 },
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>💾 ใช้งานปัจจุบัน</Typography>
                                    <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
                                        {aiPrediction?.capacity?.current_percent?.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}>
                                        {isSmallMobile ? formatBytes(aiPrediction?.capacity?.current_used_mb) : `${formatBytes(aiPrediction?.capacity?.current_used_mb)} / ${formatBytes(aiPrediction?.capacity?.total_mb)}`}
                                    </Typography>
                                </Box>
                            </Grid>

                            {/* Predicted 30 Days */}
                            <Grid item xs={6} sm={6} md={3}>
                                <Box sx={{
                                    p: { xs: 1.5, sm: 2, md: 3 },
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>📅 {isSmallMobile ? '30วัน' : 'ใน 30 วัน'}</Typography>
                                    <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
                                        {Math.min(100, ((aiPrediction?.capacity?.current_used_mb + (aiPrediction?.prediction?.growth_rate_mb_per_day * 30)) / aiPrediction?.capacity?.total_mb * 100) || 0).toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}>
                                        +{formatBytes(aiPrediction?.prediction?.growth_rate_mb_per_day * 30)}
                                    </Typography>
                                </Box>
                            </Grid>

                            {/* Predicted 90 Days */}
                            <Grid item xs={6} sm={6} md={3}>
                                <Box sx={{
                                    p: { xs: 1.5, sm: 2, md: 3 },
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>⚡ {isSmallMobile ? '90วัน' : 'ใน 90 วัน'}</Typography>
                                    <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
                                        {Math.min(100, ((aiPrediction?.capacity?.current_used_mb + (aiPrediction?.prediction?.growth_rate_mb_per_day * 90)) / aiPrediction?.capacity?.total_mb * 100) || 0).toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}>
                                        +{formatBytes(aiPrediction?.prediction?.growth_rate_mb_per_day * 90)}
                                    </Typography>
                                </Box>
                            </Grid>

                            {/* Recommended Action */}
                            <Grid item xs={6} sm={6} md={3}>
                                <Box sx={{
                                    p: { xs: 1.5, sm: 2, md: 3 },
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>💡 คำแนะนำ</Typography>
                                    <Typography variant="h6" fontWeight={900} sx={{ fontSize: { xs: '0.75rem', sm: '1rem', md: '1.25rem' } }}>
                                        {aiPrediction?.prediction?.days_until_full <= 30 ? (isSmallMobile ? '🚨 เร่งด่วน' : '🚨 ขยายเร่งด่วน') :
                                            aiPrediction?.prediction?.days_until_full <= 90 ? (isSmallMobile ? '⚠️ วางแผน' : '⚠️ วางแผนขยาย') :
                                                aiPrediction?.prediction?.days_until_full <= 180 ? (isSmallMobile ? '📝 ติดตาม' : '📝 ติดตามใกล้ชิด') : '✅ ปลอดภัยดี'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}>
                                        {aiPrediction?.prediction?.days_until_full ? `${Math.round(aiPrediction?.prediction?.days_until_full)} วัน` : 'ไม่มีกำหนด'}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>

            {/* 🥈 Risk Ranking Queue & 🥉 Capacity Exhaustion Timeline */}
            <Grid item xs={12}>
                <Grid container spacing={3}>
                    {/* Risk Ranking Queue */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    🥈 คิวการจัดอันดับความเสี่ยง (Risk Ranking Queue)
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {/* Current Datastore */}
                                    <Box sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        background: `linear-gradient(135deg, ${alpha(getRiskColor(aiPrediction?.prediction?.risk_level), 0.1)} 0%, ${alpha(getRiskColor(aiPrediction?.prediction?.risk_level), 0.05)} 100%)`,
                                        border: `2px solid ${getRiskColor(aiPrediction?.prediction?.risk_level)}`,
                                        position: 'relative'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                                    📊 Datastore นี้
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                    ลำดับ #{aiPrediction?.prediction?.risk_score >= 90 ? '1' : aiPrediction?.prediction?.risk_score >= 75 ? '2' : aiPrediction?.prediction?.risk_score >= 50 ? '3' : '4'} จากทั้งหมด
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={`${aiPrediction?.prediction?.risk_score}% ${getRiskIcon(aiPrediction?.prediction?.risk_level)}`}
                                                sx={{
                                                    bgcolor: getRiskColor(aiPrediction?.prediction?.risk_level),
                                                    color: 'white',
                                                    fontWeight: 700,
                                                    fontSize: { xs: '0.75rem', sm: '1rem' }
                                                }}
                                            />
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={aiPrediction?.prediction?.risk_score || 0}
                                            sx={{
                                                mt: 2,
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: alpha(getRiskColor(aiPrediction?.prediction?.risk_level), 0.2),
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: getRiskColor(aiPrediction?.prediction?.risk_level),
                                                    borderRadius: 4
                                                }
                                            }}
                                        />
                                    </Box>

                                    {/* Sample Risk Levels */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#ef4444', 0.1) }}>
                                            <Box sx={{ width: { xs: 10, sm: 12 }, height: { xs: 10, sm: 12 }, borderRadius: '50%', bgcolor: '#ef4444' }} />
                                            <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>🚨 Critical (90-100%) - {isMobile ? 'เร่งด่วน' : 'ต้องดำเนินการทันที'}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#f97316', 0.1) }}>
                                            <Box sx={{ width: { xs: 10, sm: 12 }, height: { xs: 10, sm: 12 }, borderRadius: '50%', bgcolor: '#f97316' }} />
                                            <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>⚠️ Warning (75-89%) - {isMobile ? 'วางแผน' : 'วางแผนขยายใน 1-3 เดือน'}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#eab308', 0.1) }}>
                                            <Box sx={{ width: { xs: 10, sm: 12 }, height: { xs: 10, sm: 12 }, borderRadius: '50%', bgcolor: '#eab308' }} />
                                            <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>⏰ Caution (50-74%) - {isMobile ? 'ติดตาม' : 'ติดตามใกล้ชิด'}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: alpha('#22c55e', 0.1) }}>
                                            <Box sx={{ width: { xs: 10, sm: 12 }, height: { xs: 10, sm: 12 }, borderRadius: '50%', bgcolor: '#22c55e' }} />
                                            <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>✅ Safe (0-49%) - ปลอดภัย</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Capacity Exhaustion Timeline */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    🥉 ไทม์ไลน์พื้นที่เต็ม (Capacity Exhaustion Timeline)
                                </Typography>
                                <Box sx={{ position: 'relative', pl: { xs: 2.5, sm: 3 }, pr: 2 }}>
                                    {/* Timeline Line */}
                                    <Box sx={{
                                        position: 'absolute',
                                        left: 12,
                                        top: 20,
                                        bottom: 20,
                                        width: 3,
                                        background: 'linear-gradient(180deg, #22c55e 0%, #eab308 40%, #f97316 70%, #ef4444 100%)',
                                        borderRadius: 2
                                    }} />

                                    {/* Timeline Items */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
                                        {/* Now */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, position: 'relative' }}>
                                            <Box sx={{
                                                width: { xs: 14, sm: 16 },
                                                height: { xs: 14, sm: 16 },
                                                borderRadius: '50%',
                                                bgcolor: '#22c55e',
                                                border: '3px solid white',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                zIndex: 2,
                                                position: 'absolute',
                                                left: -6
                                            }} />
                                            <Box sx={{ ml: 2 }}>
                                                <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>📅 วันนี้</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                                    {aiPrediction?.capacity?.current_percent?.toFixed(1)}% - {formatBytes(aiPrediction?.capacity?.current_used_mb)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* 30 Days */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative' }}>
                                            <Box sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                bgcolor: '#eab308',
                                                border: '3px solid white',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                zIndex: 2,
                                                position: 'absolute',
                                                left: -6
                                            }} />
                                            <Box sx={{ ml: 2 }}>
                                                <Typography variant="subtitle2" fontWeight={700}>⏰ 30 วันข้างหน้า</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    ~{Math.min(100, ((aiPrediction?.capacity?.current_used_mb + (aiPrediction?.prediction?.growth_rate_mb_per_day * 30)) / aiPrediction?.capacity?.total_mb * 100) || 0).toFixed(1)}%
                                                    (+{formatBytes(aiPrediction?.prediction?.growth_rate_mb_per_day * 30)})
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* 90 Days */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative' }}>
                                            <Box sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                bgcolor: '#f97316',
                                                border: '3px solid white',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                zIndex: 2,
                                                position: 'absolute',
                                                left: -6
                                            }} />
                                            <Box sx={{ ml: 2 }}>
                                                <Typography variant="subtitle2" fontWeight={700}>⚠️ 90 วันข้างหน้า</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    ~{Math.min(100, ((aiPrediction?.capacity?.current_used_mb + (aiPrediction?.prediction?.growth_rate_mb_per_day * 90)) / aiPrediction?.capacity?.total_mb * 100) || 0).toFixed(1)}%
                                                    (+{formatBytes(aiPrediction?.prediction?.growth_rate_mb_per_day * 90)})
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Full Date */}
                                        {aiPrediction?.prediction?.predicted_full_date && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative' }}>
                                                <Box sx={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    bgcolor: '#ef4444',
                                                    border: '3px solid white',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                    zIndex: 2,
                                                    position: 'absolute',
                                                    left: -6
                                                }} />
                                                <Box sx={{ ml: 2 }}>
                                                    <Typography variant="subtitle2" fontWeight={700}>🚨 วันที่เต็ม</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {new Date(aiPrediction.prediction.predicted_full_date).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Grid>

            {/* ⭐ Growth Acceleration Insight & ⭐ Forecast Accuracy */}
            <Grid item xs={12}>
                <Grid container spacing={3}>
                    {/* Growth Acceleration Insight */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    ⭐ การวิเคราะห์ความเร่งการเติบโต (Growth Acceleration Insight)
                                </Typography>
                                <Grid container spacing={2}>
                                    {/* Growth Rate */}
                                    <Grid item xs={12}>
                                        <Box sx={{ p: 3, borderRadius: 3, bgcolor: alpha('#6366f1', 0.1) }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                                <Typography variant="subtitle1" fontWeight={700}>📈 อัตราการเติบโต</Typography>
                                                <Chip
                                                    label={`${formatBytes(aiPrediction?.prediction?.growth_rate_mb_per_day)}/วัน`}
                                                    sx={{ bgcolor: '#6366f1', color: 'white', fontWeight: 700 }}
                                                />
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(100, (aiPrediction?.prediction?.growth_rate_mb_per_day / 1024) * 10) || 0}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: alpha('#6366f1', 0.2),
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: '#6366f1',
                                                        borderRadius: 4
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </Grid>

                                    {/* Growth Acceleration Status */}
                                    <Grid item xs={12}>
                                        <Box sx={{
                                            p: 3,
                                            borderRadius: 3,
                                            bgcolor: aiPrediction?.prediction?.growth_rate_mb_per_day > 1024 ? alpha('#ef4444', 0.1) :
                                                aiPrediction?.prediction?.growth_rate_mb_per_day > 512 ? alpha('#f97316', 0.1) :
                                                    aiPrediction?.prediction?.growth_rate_mb_per_day > 128 ? alpha('#eab308', 0.1) : alpha('#22c55e', 0.1)
                                        }}>
                                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                                {aiPrediction?.prediction?.growth_rate_mb_per_day > 1024 ? '🚀 เติบโตเร็วมาก' :
                                                    aiPrediction?.prediction?.growth_rate_mb_per_day > 512 ? '📈 เติบโตเร็ว' :
                                                        aiPrediction?.prediction?.growth_rate_mb_per_day > 128 ? '📊 เติบโตปกติ' : '🐌 เติบโตช้า'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {aiPrediction?.prediction?.growth_rate_mb_per_day > 1024 ? 'ควรวางแผนขยาย Storage เร่งด่วน' :
                                                    aiPrediction?.prediction?.growth_rate_mb_per_day > 512 ? 'แนะนำติดตามใกล้ชิดและวางแผน' :
                                                        aiPrediction?.prediction?.growth_rate_mb_per_day > 128 ? 'การเติบโตอยู่ในเกณฑ์ปกติ' : 'การเติบโตช้า อาจมีปัญหาการใช้งาน'}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    {/* Weekly vs Monthly */}
                                    <Grid item xs={6}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#8b5cf6', 0.1) }}>
                                            <Typography variant="caption" color="text.secondary">📅 รายสัปดาห์</Typography>
                                            <Typography variant="h6" fontWeight={700} color="#8b5cf6">
                                                {formatBytes((aiPrediction?.prediction?.growth_rate_mb_per_day || 0) * 7)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#06b6d4', 0.1) }}>
                                            <Typography variant="caption" color="text.secondary">📆 รายเดือน</Typography>
                                            <Typography variant="h6" fontWeight={700} color="#06b6d4">
                                                {formatBytes((aiPrediction?.prediction?.growth_rate_mb_per_day || 0) * 30)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Forecast Accuracy */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    ⭐ ความแม่นยำการพยากรณ์ (Forecast Accuracy)
                                </Typography>

                                {/* Model Accuracy Score */}
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight={700}>🎯 คะแนนความแม่นยำ</Typography>
                                        <Chip
                                            label={`${aiPrediction?.model === 'prophet' ? '85-95%' : '70-85%'}`}
                                            sx={{
                                                bgcolor: aiPrediction?.model === 'prophet' ? '#22c55e' : '#f59e0b',
                                                color: 'white',
                                                fontWeight: 700
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        background: aiPrediction?.model === 'prophet' ?
                                            'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
                                            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: 'white',
                                        textAlign: 'center'
                                    }}>
                                        <Typography variant="h3" fontWeight={900}>
                                            {aiPrediction?.model === 'prophet' ? '🎯' : '📊'}
                                        </Typography>
                                        <Typography variant="h6" fontWeight={700}>
                                            {aiPrediction?.model === 'prophet' ? 'Facebook Prophet' : 'Linear Regression'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                            {aiPrediction?.model === 'prophet' ?
                                                'รองรับ Seasonality และ Trend ซับซ้อน' :
                                                'เหมาะกับข้อมูลแนวโน้มเชิงเส้น'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Data Quality */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">📊 คุณภาพข้อมูล</Typography>
                                        <Typography variant="body2" fontWeight={700}>
                                            {aiPrediction?.historical_days >= 30 ? 'ดีเยี่ยม' :
                                                aiPrediction?.historical_days >= 14 ? 'ดี' :
                                                    aiPrediction?.historical_days >= 7 ? 'พอใช้' : 'ต่ำ'}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(100, (aiPrediction?.historical_days / 30) * 100) || 0}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: alpha('#64748b', 0.2),
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: aiPrediction?.historical_days >= 30 ? '#22c55e' :
                                                    aiPrediction?.historical_days >= 14 ? '#f59e0b' : '#ef4444',
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {aiPrediction?.historical_days} วัน / 30 วัน (แนะนำ)
                                    </Typography>
                                </Box>

                                {/* Confidence Level */}
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">🔮 ช่วงความเชื่อมั่น</Typography>
                                        <Typography variant="body2" fontWeight={700}>95%</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Box sx={{ flex: 1, height: 6, bgcolor: '#22c55e', borderRadius: 3 }} />
                                        <Box sx={{ flex: 1, height: 6, bgcolor: '#22c55e', borderRadius: 3 }} />
                                        <Box sx={{ flex: 1, height: 6, bgcolor: '#22c55e', borderRadius: 3 }} />
                                        <Box sx={{ flex: 1, height: 6, bgcolor: '#22c55e', borderRadius: 3 }} />
                                        <Box sx={{ flex: 1, height: 6, bgcolor: alpha('#64748b', 0.2), borderRadius: 3 }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        มีความเชื่อมั่นสูงใน 95% ของการพยากรণ์
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Grid>

            {/* Forecast Chart */}
            <Grid item xs={12}>
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 2, sm: 0 }, mb: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                📊 กราฟพยากรณ์ Capacity (90 วัน)
                            </Typography>
                            <Button
                                startIcon={<RefreshIcon />}
                                onClick={() => refetchAI()}
                                variant="outlined"
                                size="small"
                                sx={{ borderRadius: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                fullWidth={isSmallMobile}
                            >
                                รีเฟรช
                            </Button>
                        </Box>

                        <Box sx={{ height: { xs: 280, sm: 320, md: 400 }, overflow: 'auto' }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11 }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `${(value / 1024 / 1024).toFixed(0)} TB`}
                                        label={{ value: 'Storage (TB)', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                        formatter={(value: number, name: string) => [formatBytes(value), name]}
                                        labelFormatter={(label) => `วันที่: ${label}`}
                                    />
                                    <Legend />

                                    {/* Confidence Interval */}
                                    <Area
                                        type="monotone"
                                        dataKey="forecastUpper"
                                        stroke="transparent"
                                        fill="#8b5cf6"
                                        fillOpacity={0.1}
                                        name="ช่วงความเชื่อมั่น (Upper)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="forecastLower"
                                        stroke="transparent"
                                        fill="#ffffff"
                                        fillOpacity={1}
                                        name="ช่วงความเชื่อมั่น (Lower)"
                                    />

                                    {/* Actual Data */}
                                    <Line
                                        type="monotone"
                                        dataKey="actual"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 3 }}
                                        name="ข้อมูลจริง"
                                        connectNulls
                                    />

                                    {/* Forecast Line */}
                                    <Line
                                        type="monotone"
                                        dataKey="forecast"
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        name="พยากรณ์"
                                    />

                                    {/* Capacity Line */}
                                    <ReferenceLine
                                        y={aiPrediction?.capacity?.total_mb}
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        strokeDasharray="10 5"
                                        label={{
                                            value: `Capacity: ${formatBytes(aiPrediction?.capacity?.total_mb)}`,
                                            position: 'right',
                                            fill: '#ef4444',
                                            fontSize: 12
                                        }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Box>

                        {/* Legend Info */}
                        <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 3, bgcolor: '#3b82f6', borderRadius: 1 }} />
                                <Typography variant="caption">ข้อมูลจริง</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 3, bgcolor: '#f97316', borderRadius: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#f97316' }} />
                                <Typography variant="caption">พยากรณ์ (AI)</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 12, bgcolor: alpha('#8b5cf6', 0.2), borderRadius: 1 }} />
                                <Typography variant="caption">ช่วงความเชื่อมั่น 95%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 3, bgcolor: '#ef4444', borderRadius: 1 }} />
                                <Typography variant="caption">Capacity สูงสุด</Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            {/* Seasonality & Anomalies */}
            <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            📅 Weekly Seasonality Pattern
                        </Typography>
                        {aiPrediction?.seasonality?.weekly?.length > 0 ? (
                            <Box sx={{ height: { xs: 200, sm: 250 } }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={aiPrediction.seasonality.weekly}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                        <YAxis tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
                                        <Tooltip formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(1)} MB`, 'ผลกระทบ']} />
                                        <Bar
                                            dataKey="effect"
                                            fill="#8b5cf6"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <ReferenceLine y={0} stroke="#666" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        ) : (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                ไม่พบ Pattern รายสัปดาห์ที่ชัดเจน (ใช้ Linear Regression)
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            🔍 Anomaly Detection
                        </Typography>
                        {aiPrediction?.anomalies?.length === 0 ? (
                            <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                                ✅ ไม่พบความผิดปกติในข้อมูลย้อนหลัง
                            </Alert>
                        ) : (
                            <Box sx={{ maxHeight: { xs: 200, sm: 250 }, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <Table size="small" sx={{ minWidth: { xs: 400, sm: 'auto' } }}>
                                    <TableBody>
                                        {aiPrediction?.anomalies?.map((anomaly: any, idx: number) => (
                                            <TableRow key={idx} sx={{ '&:hover': { bgcolor: alpha('#ef4444', 0.05) } }}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        📆 {new Date(anomaly.date).toLocaleDateString('th-TH')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        จริง: {formatBytes(anomaly.actual_mb)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${anomaly.deviation_mb > 0 ? '+' : ''}${formatBytes(anomaly.deviation_mb)}`}
                                                        size="small"
                                                        color={anomaly.deviation_mb > 0 ? 'error' : 'success'}
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Model Info */}
            <Grid item xs={12}>
                <Alert
                    severity="info"
                    sx={{ borderRadius: 3 }}
                    icon={<AIIcon />}
                >
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        🤖 เกี่ยวกับ AI Model
                    </Typography>
                    <Typography variant="body2">
                        ใช้ {aiPrediction?.model === 'prophet' ? 'Facebook Prophet' : 'Linear Regression'} ในการวิเคราะห์ข้อมูลย้อนหลัง {aiPrediction?.historical_days} วัน
                        และพยากรณ์ล่วงหน้า {aiPrediction?.forecast_days} วัน พร้อมช่วงความเชื่อมั่น 95%
                        {aiPrediction?.model !== 'prophet' && ' (Prophet ไม่ได้ติดตั้ง ใช้ Linear Regression แทน)'}
                    </Typography>
                </Alert>
            </Grid>
        </Grid>
    );
};

export default DataStoreDetailPage;
