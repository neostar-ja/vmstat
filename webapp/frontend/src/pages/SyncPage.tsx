import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Switch,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    LinearProgress,
    Alert,
    Tooltip,
    Pagination,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    Paper,
    Skeleton,
    useTheme,
    alpha,
    Tabs,
    Tab
} from '@mui/material';
import {
    Sync as SyncIcon,
    PlayArrow as PlayIcon,
    Settings as SettingsIcon,
    Refresh as RefreshIcon,
    Schedule as ScheduleIcon,
    History as HistoryIcon,
    Visibility as ViewIcon,
    Speed as SpeedIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    CloudSync as CloudSyncIcon,
    Link as LinkIcon,
    Storage as StorageIcon,
    Computer as ComputerIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../services/api';

// Helper function to format duration
const formatDuration = (ms: number | null | undefined): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

// Helper function to format date
const formatDate = (dateStr: string | null | undefined, forceUtc = false): string => {
    if (!dateStr) return '-';
    // If forceUtc is true, append Z to treat as UTC if no timezone is present
    const processedDateStr = forceUtc && !dateStr.endsWith('Z') && !dateStr.includes('+')
        ? dateStr + 'Z'
        : dateStr;
    const date = new Date(processedDateStr);
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Status chip component
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'info' | 'default', label: string, icon: React.ReactNode }> = {
        success: { color: 'success', label: 'สำเร็จ', icon: <CheckCircleIcon fontSize="small" /> },
        failed: { color: 'error', label: 'ล้มเหลว', icon: <ErrorIcon fontSize="small" /> },
        running: { color: 'info', label: 'กำลังทำงาน', icon: <CircularProgress size={12} color="inherit" /> },
        pending: { color: 'warning', label: 'รอดำเนินการ', icon: <ScheduleIcon fontSize="small" /> },
        cancelled: { color: 'default', label: 'ยกเลิก', icon: <ErrorIcon fontSize="small" /> }
    };
    const config = statusConfig[status] || { color: 'default', label: status, icon: null };

    return (
        <Chip
            size="small"
            color={config.color}
            label={config.label}
            icon={config.icon as React.ReactElement}
            sx={{ fontWeight: 600, px: 0.5 }}
        />
    );
};

const SyncPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [jobDetailOpen, setJobDetailOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [configForm, setConfigForm] = useState({
        scp_ip: '',
        scp_username: '',
        scp_password: '',
        scheduler_interval: 5
    });
    const [activeTab, setActiveTab] = useState(0);

    // Queries
    const { data: statusData, refetch: refetchStatus } = useQuery({
        queryKey: ['sync-status'],
        queryFn: () => syncApi.getStatus(),
        refetchInterval: 3000 // Auto-refresh every 3 seconds
    });

    const { data: statsData, refetch: refetchStats } = useQuery({
        queryKey: ['sync-stats'],
        queryFn: () => syncApi.getStats()
    });

    const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
        queryKey: ['sync-jobs', page],
        queryFn: () => syncApi.getJobs({ limit: 10, offset: (page - 1) * 10 })
    });

    const { data: configData } = useQuery({
        queryKey: ['sync-config'],
        queryFn: () => syncApi.getConfig()
    });

    const { data: jobDetailData, isLoading: jobDetailLoading } = useQuery({
        queryKey: ['sync-job', selectedJobId],
        queryFn: () => selectedJobId ? syncApi.getJob(selectedJobId) : null,
        enabled: !!selectedJobId
    });

    // Mutations
    const runSyncMutation = useMutation({
        mutationFn: () => syncApi.run(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sync-status'] });
            queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
        }
    });

    const schedulerMutation = useMutation({
        mutationFn: (params: { action: 'start' | 'stop', interval_minutes?: number }) =>
            syncApi.controlScheduler(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sync-status'] });
        }
    });

    const updateConfigMutation = useMutation({
        mutationFn: (config: any) => syncApi.updateConfig(config),
        onSuccess: () => {
            setSettingsOpen(false);
            queryClient.invalidateQueries({ queryKey: ['sync-config'] });
        }
    });

    const testConnectionMutation = useMutation({
        mutationFn: () => syncApi.testConnection(),
        onSuccess: (data) => {
            alert('การเชื่อมต่อสำเร็จ: ' + data.message);
        },
        onError: (error: any) => {
            alert('การเชื่อมต่อล้มเหลว: ' + (error.response?.data?.detail || error.message));
        }
    });

    // Extract data
    const status = statusData?.data || {};
    const stats = statsData?.data || {};
    const jobs = jobsData?.data?.jobs || [];
    const totalJobs = jobsData?.data?.total || 0;
    const config = configData?.data || {};
    const jobDetail = jobDetailData?.data || null;

    const isSyncing = status.is_syncing || false;
    const schedulerRunning = status.scheduler?.is_running || false;

    // Update config form when config loads
    useEffect(() => {
        if (config.scp_ip) {
            setConfigForm({
                scp_ip: config.scp_ip || '',
                scp_username: config.scp_username || '',
                scp_password: '',
                scheduler_interval: config.scheduler_interval_minutes || 5
            });
        }
    }, [config]);

    const handleRunSync = () => {
        runSyncMutation.mutate();
    };

    const handleToggleScheduler = () => {
        if (schedulerRunning) {
            schedulerMutation.mutate({ action: 'stop' });
        } else {
            schedulerMutation.mutate({
                action: 'start',
                interval_minutes: config.scheduler_interval_minutes || 5
            });
        }
    };

    const handleSaveConfig = () => {
        const updateData: any = {};
        if (configForm.scp_ip) updateData.scp_ip = configForm.scp_ip;
        if (configForm.scp_username) updateData.scp_username = configForm.scp_username;
        if (configForm.scp_password) updateData.scp_password = configForm.scp_password;
        updateConfigMutation.mutate(updateData);
    };

    const handleTestConnection = () => {
        testConnectionMutation.mutate();
    };

    const handleViewJob = (jobId: string) => {
        setSelectedJobId(jobId);
        setJobDetailOpen(true);
    };

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            minHeight: '100vh',
            background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                : 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
        }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 4,
                    background: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.6)
                        : alpha(theme.palette.common.white, 0.8),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        fontWeight={800}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 0.5
                        }}
                    >
                        <CloudSyncIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />
                        🔄 ตั้งค่าการซิงค์ข้อมูล
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={500}>
                        จัดการการเชื่อมต่อและซิงค์ข้อมูลจาก Sangfor SCP
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Tooltip title="ตั้งค่าการเชื่อมต่อ">
                        <Button
                            variant="outlined"
                            startIcon={<SettingsIcon />}
                            onClick={() => setSettingsOpen(true)}
                            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
                        >
                            Connection
                        </Button>
                    </Tooltip>
                    <Tooltip title="รีเฟรชข้อมูล">
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => {
                                refetchStatus();
                                refetchStats();
                                refetchJobs();
                            }}
                            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
                        >
                            Refresh
                        </Button>
                    </Tooltip>
                </Box>
            </Paper>

            {/* Tabs Navigation */}
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    borderRadius: 3,
                    background: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.6)
                        : alpha(theme.palette.common.white, 0.8),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                            py: 2,
                            px: 4,
                        },
                        '& .Mui-selected': {
                            color: '#6366f1 !important',
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#6366f1',
                            height: 3,
                            borderRadius: 2,
                        }
                    }}
                >
                    <Tab
                        icon={<ComputerIcon />}
                        iconPosition="start"
                        label="🖥️ VM Sync"
                    />
                    <Tab
                        icon={<StorageIcon />}
                        iconPosition="start"
                        label="📦 DataStore Sync"
                    />
                </Tabs>
            </Paper>

            {/* Tab Panel: VM Sync */}
            {activeTab === 0 && (
                <Grid container spacing={4}>
                    {/* Left Column - Controls */}
                    <Grid item xs={12} lg={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                            {/* Sync Status Card */}
                            <Card sx={{
                                borderRadius: 4,
                                overflow: 'visible',
                                background: theme.palette.mode === 'dark'
                                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                            }}>
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    <Box sx={{
                                        position: 'relative',
                                        mx: 'auto',
                                        width: 120,
                                        height: 120,
                                        mb: 3
                                    }}>
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            background: isSyncing
                                                ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                                                : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                            opacity: 0.2,
                                            filter: 'blur(20px)',
                                            animation: isSyncing ? 'pulse 2s infinite' : 'none'
                                        }} />
                                        <Box sx={{
                                            position: 'relative',
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '50%',
                                            background: isSyncing
                                                ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                                                : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isSyncing
                                                ? '0 10px 30px rgba(99, 102, 241, 0.4)'
                                                : '0 10px 30px rgba(16, 185, 129, 0.4)'
                                        }}>
                                            {isSyncing ? (
                                                <CircularProgress size={60} sx={{ color: 'white' }} />
                                            ) : (
                                                <SyncIcon sx={{ fontSize: 60, color: 'white' }} />
                                            )}
                                        </Box>
                                    </Box>

                                    <Typography variant="h5" fontWeight={700} gutterBottom>
                                        {isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ระบบพร้อมทำงาน'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        {isSyncing
                                            ? 'กำลังดึงข้อมูลล่าสุดจาก Sangfor SCP'
                                            : `ซิงค์ล่าสุดเมื่อ: ${stats.last_successful_sync ? formatDate(stats.last_successful_sync) : '-'}`
                                        }
                                    </Typography>

                                    {isSyncing && (
                                        <Box sx={{ mb: 3, mx: 2 }}>
                                            <LinearProgress
                                                sx={{
                                                    borderRadius: 4,
                                                    height: 10,
                                                    background: alpha(theme.palette.primary.main, 0.1),
                                                    '& .MuiLinearProgress-bar': {
                                                        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)'
                                                    }
                                                }}
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Running Job: {status.current_job_id?.slice(0, 8)}...
                                            </Typography>
                                        </Box>
                                    )}

                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<PlayIcon />}
                                        onClick={handleRunSync}
                                        disabled={isSyncing || runSyncMutation.isPending}
                                        fullWidth
                                        sx={{
                                            py: 1.5,
                                            borderRadius: 3,
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            textTransform: 'none',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)'
                                            }
                                        }}
                                    >
                                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Scheduler & Stats Grid */}
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Card sx={{
                                        borderRadius: 4,
                                        background: theme.palette.mode === 'dark'
                                            ? alpha(theme.palette.background.paper, 0.6)
                                            : alpha(theme.palette.common.white, 0.8),
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                    }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{
                                                        p: 1,
                                                        borderRadius: 2,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        color: theme.palette.primary.main
                                                    }}>
                                                        <ScheduleIcon />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight={700}>
                                                            Auto Scheduler
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            ตั้งเวลาทำงานอัตโนมัติ
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Switch
                                                    checked={schedulerRunning}
                                                    onChange={handleToggleScheduler}
                                                    disabled={schedulerMutation.isPending}
                                                    color="primary"
                                                />
                                            </Box>

                                            <Divider sx={{ my: 2 }} />

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">ความถี่:</Typography>
                                                <Chip
                                                    label={`ทุก ${status.scheduler?.interval_minutes || config.scheduler_interval_minutes || 5} นาที`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                                <Typography variant="body2" color="text.secondary">ครั้งถัดไป:</Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {schedulerRunning && status.scheduler?.next_run_at
                                                        ? formatDate(status.scheduler.next_run_at, true)
                                                        : '-'}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12}>
                                    <Card sx={{
                                        borderRadius: 4,
                                        background: theme.palette.mode === 'dark'
                                            ? alpha(theme.palette.background.paper, 0.6)
                                            : alpha(theme.palette.common.white, 0.8),
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                    }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                                <Box sx={{
                                                    p: 1,
                                                    borderRadius: 2,
                                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                                    color: theme.palette.success.main
                                                }}>
                                                    <SpeedIcon />
                                                </Box>
                                                <Typography variant="subtitle1" fontWeight={700}>
                                                    Overview Stats
                                                </Typography>
                                            </Box>

                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Box sx={{
                                                        p: 2,
                                                        borderRadius: 3,
                                                        bgcolor: alpha(theme.palette.success.main, 0.05),
                                                        textAlign: 'center'
                                                    }}>
                                                        <Typography variant="h5" fontWeight={800} color="success.main">
                                                            {stats.successful_jobs || 0}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            SUCCESS
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box sx={{
                                                        p: 2,
                                                        borderRadius: 3,
                                                        bgcolor: alpha(theme.palette.error.main, 0.05),
                                                        textAlign: 'center'
                                                    }}>
                                                        <Typography variant="h5" fontWeight={800} color="error.main">
                                                            {stats.failed_jobs || 0}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            FAILED
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>

                                            <Box sx={{ mt: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Avg. Duration</Typography>
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {formatDuration(stats.avg_duration_ms)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                    {/* Right Column - History Table */}
                    <Grid item xs={12} lg={8}>
                        <Card sx={{
                            borderRadius: 4,
                            height: '100%',
                            background: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.6)
                                : alpha(theme.palette.common.white, 0.8),
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            minHeight: 500
                        }}>
                            <CardContent sx={{ p: 0 }}>
                                <Box sx={{
                                    p: 3,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <HistoryIcon color="primary" />
                                        <Typography variant="h6" fontWeight={700}>
                                            Sync History
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`Total: ${totalJobs}`}
                                        size="small"
                                        sx={{ fontWeight: 600, borderRadius: 2 }}
                                    />
                                </Box>

                                {jobsLoading ? (
                                    <Box sx={{ p: 3 }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Skeleton key={i} variant="rectangular" height={70} sx={{ mb: 1, borderRadius: 2 }} />
                                        ))}
                                    </Box>
                                ) : jobs.length === 0 ? (
                                    <Box sx={{ p: 8, textAlign: 'center', opacity: 0.6 }}>
                                        <HistoryIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary">
                                            ยังไม่มีประวัติการทำงาน
                                        </Typography>
                                    </Box>
                                ) : (
                                    <>
                                        <TableContainer sx={{ overflowX: 'auto' }}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.02) }}>
                                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Time / Source</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="right">Processed</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="right">Duration</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {jobs.map((job: any) => (
                                                        <TableRow
                                                            key={job.job_id}
                                                            hover
                                                            sx={{
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                '&:hover': {
                                                                    background: alpha(theme.palette.primary.main, 0.02),
                                                                    transform: 'scale(1.002)'
                                                                }
                                                            }}
                                                            onClick={() => handleViewJob(job.job_id)}
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {formatDate(job.started_at)}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    via {job.source === 'manual' ? 'Manual' : job.source === 'scheduler' ? 'Auto-Scheduler' : job.source}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <StatusChip status={job.status} />
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                    {job.source?.includes('host') ? (
                                                                        <>
                                                                            <Typography variant="body2" fontWeight={700}>
                                                                                {job.hosts_synced?.toLocaleString() || 0} Hosts
                                                                            </Typography>
                                                                            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                                                                Synced
                                                                            </Typography>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Typography variant="body2" fontWeight={700}>
                                                                                {job.total_vms_fetched?.toLocaleString() || 0} VMs
                                                                            </Typography>
                                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                                                                    +{job.vms_inserted || 0}
                                                                                </Typography>
                                                                                <Typography variant="caption" color="text.secondary">/</Typography>
                                                                                <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 600 }}>
                                                                                    ↻{job.vms_updated || 0}
                                                                                </Typography>
                                                                            </Box>
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                                    {formatDuration(job.duration_ms)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleViewJob(job.job_id);
                                                                    }}
                                                                    sx={{
                                                                        color: theme.palette.primary.main,
                                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                                                    }}
                                                                >
                                                                    <ViewIcon fontSize="small" />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        {totalJobs > 10 && (
                                            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                                                <Pagination
                                                    count={Math.ceil(totalJobs / 10)}
                                                    page={page}
                                                    onChange={(_, newPage) => setPage(newPage)}
                                                    color="primary"
                                                    shape="rounded"
                                                />
                                            </Box>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tab Panel: DataStore Sync */}
            {activeTab === 1 && (
                <Grid container spacing={4}>
                    {/* DataStore Sync Status */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{
                            borderRadius: 4,
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <Box sx={{
                                    mx: 'auto',
                                    width: 100,
                                    height: 100,
                                    mb: 3,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)'
                                }}>
                                    <StorageIcon sx={{ fontSize: 50, color: 'white' }} />
                                </Box>
                                <Typography variant="h5" fontWeight={700} gutterBottom>
                                    📦 DataStore Sync
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    ซิงค์ข้อมูล Storage จาก Sangfor SCP
                                </Typography>
                                <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
                                    DataStore sync ทำงานพร้อมกับ VM sync โดยอัตโนมัติ เมื่อกด Sync Now ที่แท็บ VM Sync ระบบจะดึงข้อมูล DataStore มาด้วย
                                </Alert>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<PlayIcon />}
                                    onClick={handleRunSync}
                                    disabled={isSyncing || runSyncMutation.isPending}
                                    fullWidth
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)'
                                        }
                                    }}
                                >
                                    {isSyncing ? 'กำลัง Sync...' : 'Sync DataStores'}
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* DataStore Statistics */}
                    <Grid item xs={12} md={8}>
                        <Card sx={{
                            borderRadius: 4,
                            height: '100%',
                            background: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.6)
                                : alpha(theme.palette.common.white, 0.8),
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}>
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SpeedIcon /> สถิติ DataStore
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Grid container spacing={3}>
                                    <Grid item xs={6} md={3}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#6366f1', 0.1) }}>
                                            <Typography variant="h4" fontWeight={800} color="#6366f1">
                                                {stats.total_datastores || 15}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total DataStores
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#10b981', 0.1) }}>
                                            <Typography variant="h4" fontWeight={800} color="#10b981">
                                                {stats.datastores_synced || 15}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Last Synced
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.1) }}>
                                            <Typography variant="h4" fontWeight={800} color="#f59e0b">
                                                {stats.datastores_inserted || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Inserted
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#06b6d4', 0.1) }}>
                                            <Typography variant="h4" fontWeight={800} color="#06b6d4">
                                                {stats.datastores_updated || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Updated
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                                <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                                    <Typography variant="body2" color="text.secondary">
                                        💡 <strong>Tips:</strong> ไปที่หน้า <strong>DataStores</strong> เพื่อดูรายละเอียดทั้งหมด หรือคลิกที่แต่ละ DataStore เพื่อดูกราฟและข้อมูลย้อนหลัง
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Settings Dialog */}
            <Dialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Box sx={{ p: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                        <SettingsIcon />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>Settings</Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ border: 'none' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.primary" fontWeight={600} gutterBottom>
                                การเชื่อมต่อ Sangfor SCP
                            </Typography>
                            <Typography variant="caption" color="text.secondary" paragraph>
                                กำหนดค่าการเชื่อมต่อเพื่อดึงข้อมูล
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        label="SCP IP Address"
                                        value={configForm.scp_ip}
                                        onChange={(e) => setConfigForm({ ...configForm, scp_ip: e.target.value })}
                                        fullWidth
                                        placeholder="เช่น 192.168.1.100"
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Username"
                                        value={configForm.scp_username}
                                        onChange={(e) => setConfigForm({ ...configForm, scp_username: e.target.value })}
                                        fullWidth
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Password"
                                        type="password"
                                        value={configForm.scp_password}
                                        onChange={(e) => setConfigForm({ ...configForm, scp_password: e.target.value })}
                                        fullWidth
                                        placeholder={config.scp_password_set ? '••••••••' : 'กรอกรหัสผ่าน'}
                                        helperText={config.scp_password_set ? 'รหัสผ่านถูกบันทึกแล้ว (ทับถมเมื่อกรอกใหม่)' : ''}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                            </Grid>
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={testConnectionMutation.isPending ? <CircularProgress size={20} /> : <LinkIcon />}
                                    onClick={handleTestConnection}
                                    disabled={testConnectionMutation.isPending}
                                    color={testConnectionMutation.isError ? "error" : "primary"}
                                    fullWidth
                                >
                                    {testConnectionMutation.isPending ? 'กำลังทดสอบ...' : 'Test Connection'}
                                </Button>
                            </Box>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" color="text.primary" fontWeight={600} gutterBottom>
                                ตารางเวลาอัตโนมัติ (Scheduler)
                            </Typography>
                            <FormControl fullWidth sx={{ mt: 1 }}>
                                <InputLabel>ความถี่ในการ Sync</InputLabel>
                                <Select
                                    value={configForm.scheduler_interval}
                                    onChange={(e) => setConfigForm({ ...configForm, scheduler_interval: Number(e.target.value) })}
                                    label="ความถี่ในการ Sync"
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value={1}>ทุก 1 นาที</MenuItem>
                                    <MenuItem value={5}>ทุก 5 นาที</MenuItem>
                                    <MenuItem value={10}>ทุก 10 นาที</MenuItem>
                                    <MenuItem value={15}>ทุก 15 นาที</MenuItem>
                                    <MenuItem value={30}>ทุก 30 นาที</MenuItem>
                                    <MenuItem value={60}>ทุก 1 ชั่วโมง</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setSettingsOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveConfig}
                        disabled={updateConfigMutation.isPending}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            px: 3,
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                        }}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Job Detail Dialog */}
            <Dialog
                open={jobDetailOpen}
                onClose={() => setJobDetailOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Box sx={{ p: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                        <HistoryIcon />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>Job Details</Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ border: 'none' }}>
                    {jobDetailLoading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : jobDetail ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Job Info Grid */}
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Job ID</Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                            {jobDetail.job_id.split('-')[0]}...
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Status</Typography>
                                        <Box><StatusChip status={jobDetail.status} /></Box>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Started At</Typography>
                                        <Typography variant="body2" fontWeight={500}>{formatDate(jobDetail.started_at)}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Duration</Typography>
                                        <Typography variant="body2" fontWeight={500}>{formatDuration(jobDetail.duration_ms)}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Execution Stats</Typography>
                                <Grid container spacing={2}>
                                    {/* Check if it's a host sync job */}
                                    {jobDetail.source?.includes('host') || jobDetail.hosts_synced ? (
                                        <>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="primary.main">{jobDetail.total_hosts_fetched || jobDetail.hosts_synced || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>HOSTS PROCESSED</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="success.main">{jobDetail.hosts_inserted || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>NEW HOSTS</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="info.main">{jobDetail.hosts_updated || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>UPDATED</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="warning.main">{jobDetail.hosts_errors || jobDetail.vms_errors || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ERRORS</Typography>
                                                </Paper>
                                            </Grid>
                                            {/* Additional host-specific stats */}
                                            {(jobDetail.alarms_synced || jobDetail.datastores_synced) && (
                                                <>
                                                    <Grid item xs={6} md={3}>
                                                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha('#f59e0b', 0.05) }}>
                                                            <Typography variant="h5" fontWeight={700} sx={{ color: '#f59e0b' }}>{jobDetail.alarms_synced || 0}</Typography>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>ALARMS SYNCED</Typography>
                                                        </Paper>
                                                    </Grid>
                                                    <Grid item xs={6} md={3}>
                                                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha('#10b981', 0.05) }}>
                                                            <Typography variant="h5" fontWeight={700} sx={{ color: '#10b981' }}>{jobDetail.datastores_synced || 0}</Typography>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>DATASTORES</Typography>
                                                        </Paper>
                                                    </Grid>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        /* VM sync stats */
                                        <>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="primary.main">{jobDetail.total_vms_fetched || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL FETCHED</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="success.main">{jobDetail.vms_inserted || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>NEW</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="info.main">{jobDetail.vms_updated || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>UPDATED</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                                                    <Typography variant="h5" fontWeight={700} color="warning.main">{jobDetail.vms_errors || 0}</Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ERRORS</Typography>
                                                </Paper>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </Box>

                            {jobDetail.error_message && (
                                <Alert severity="error" sx={{ borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>System Error</Typography>
                                    <Typography variant="body2">{jobDetail.error_message}</Typography>
                                </Alert>
                            )}

                            {jobDetail.details && jobDetail.details.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Process Logs</Typography>
                                    <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', borderRadius: 2 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ minWidth: 140 }}>Time</TableCell>
                                                    <TableCell sx={{ width: 80 }}>Level</TableCell>
                                                    <TableCell>Message</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {jobDetail.details.map((log: any, idx: number) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                            {formatDate(log.timestamp)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={log.level}
                                                                color={log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'default'}
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.85rem' }}>{log.message}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No details found</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setJobDetailOpen(false)} sx={{ borderRadius: 2 }}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default SyncPage;
