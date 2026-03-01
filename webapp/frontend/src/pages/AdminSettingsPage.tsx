import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Skeleton,
    Grid,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Alert,
    Divider,
    Checkbox,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    CircularProgress,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    History as AuditIcon,
    Computer as VmIcon,
    Person as UserIcon,
    AdminPanelSettings as AdminIcon,
    SupervisorAccount as ManagerIcon,
    Visibility as ViewerIcon,
    Sync as SyncIcon,
    Storage as StorageIcon,
    VpnKey as KeycloakIcon,
    DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, syncApi } from '../services/api';
import type { SystemStats, AuditLogItem } from '../types';
import DataStoreExecutiveDashboard from './DataStoreExecutiveDashboard';
import KeycloakSettings from './KeycloakSettings';
import DeletedVMManager from '../components/admin/DeletedVMManager';

// Stats Card Component
function StatCard({
    title,
    value,
    icon,
    color,
    isLoading,
}: {
    title: string;
    value: number | string;
    icon: JSX.Element;
    color: string;
    isLoading: boolean;
}) {
    return (
        <Card>
            <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: `${color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        {isLoading ? (
                            <Skeleton width={60} height={32} />
                        ) : (
                            <Typography variant="h5" fontWeight={700}>
                                {value}
                            </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState(0);
    const queryClient = useQueryClient();


    const [metricsSettings, setMetricsSettings] = useState({
        collect_metrics: true,
        collection_interval_seconds: 60,
        retain_raw_days: 7,
        retain_hourly_days: 30,
        retain_daily_days: 365,
        auto_aggregate: true,
    });

    const [selectedDatastores, setSelectedDatastores] = useState<string[]>([]);

    // Fetch system stats
    const { data: statsData, isLoading: statsLoading } = useQuery<{ data: SystemStats }>({
        queryKey: ['admin-system-stats'],
        queryFn: () => adminApi.getSystemStats(),
    });

    // Fetch audit logs
    const { data: auditData, isLoading: auditLoading } = useQuery<{ data: AuditLogItem[] }>({
        queryKey: ['admin-audit-logs'],
        queryFn: () => adminApi.getAuditLogs(100),
    });

    // Fetch all datastores
    const { data: datastoresData, isLoading: datastoresLoading } = useQuery({
        queryKey: ['admin-datastores'],
        queryFn: async () => {
            const res = await syncApi.getDatastores();
            return res.data;
        },
    });

    // Fetch datastore dashboard settings
    const { data: dashboardSettingsData, isLoading: dashboardSettingsLoading } = useQuery({
        queryKey: ['datastore-dashboard-settings'],
        queryFn: async () => {
            const res = await syncApi.getDatastoreDashboardSettings();
            return res.data;
        },
    });

    // Update selected datastores when data loads
    useEffect(() => {
        if (dashboardSettingsData?.data?.selected_datastore_ids) {
            setSelectedDatastores(dashboardSettingsData.data.selected_datastore_ids);
        }
    }, [dashboardSettingsData]);


    // Fetch metrics settings
    useQuery({
        queryKey: ['metrics-settings'],
        queryFn: async () => {
            const res = await syncApi.getMetricsSettings();
            const data = res.data?.data;
            if (data) {
                setMetricsSettings({
                    collect_metrics: data.collect_metrics ?? true,
                    collection_interval_seconds: data.collection_interval_seconds || 60,
                    retain_raw_days: data.retain_raw_days || 7,
                    retain_hourly_days: data.retain_hourly_days || 30,
                    retain_daily_days: data.retain_daily_days || 365,
                    auto_aggregate: data.auto_aggregate ?? true,
                });
            }
            return res;
        },
    });





    // Mutations

    const updateMetricsSettingsMutation = useMutation({
        mutationFn: (data: typeof metricsSettings) => syncApi.updateMetricsSettings(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metrics-settings'] });
        },
    });

    const updateDashboardSettingsMutation = useMutation({
        mutationFn: (data: { selected_datastore_ids: string[] }) =>
            syncApi.updateDatastoreDashboardSettings(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datastore-dashboard-settings'] });
        },
    });

    const handleDatastoreToggle = (datastoreId: string) => {
        setSelectedDatastores(prev =>
            prev.includes(datastoreId)
                ? prev.filter(id => id !== datastoreId)
                : [...prev, datastoreId]
        );
    };

    const handleSaveDashboardSettings = () => {
        updateDashboardSettingsMutation.mutate({ selected_datastore_ids: selectedDatastores });
    };

    const stats = statsData?.data;
    const auditLogs = auditData?.data || [];

    const getActionChip = (action: string) => {
        const actionColors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
            create_user: 'success',
            update_user: 'info',
            delete_user: 'error',
            reset_password: 'warning',
            login: 'success',
            logout: 'info',
        };
        return (
            <Chip
                label={action.replace(/_/g, ' ')}
                size="small"
                color={actionColors[action] || 'default'}
                variant="outlined"
            />
        );
    };

    return (
        <Box className="animate-fade-in">
            {/* Page Header */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                    gutterBottom
                >
                    ⚙️ ตั้งค่าระบบ
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    จัดการการตั้งค่าและดูภาพรวมระบบ
                </Typography>
            </Box>

            {/* Tabs */}
            <Card sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_: React.SyntheticEvent, v: number) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab icon={<SettingsIcon />} iconPosition="start" label="ภาพรวม" />
                    <Tab icon={<SyncIcon />} iconPosition="start" label="จัดการฐานข้อมูล" />
                    <Tab icon={<AuditIcon />} iconPosition="start" label="บันทึกการใช้งาน" />
                    <Tab icon={<StorageIcon />} iconPosition="start" label="เลือก Data Store" />
                    <Tab icon={<StorageIcon />} iconPosition="start" label="Data Store Dashboard" />
                    <Tab icon={<KeycloakIcon />} iconPosition="start" label="Keycloak SSO" />
                    <Tab icon={<DeleteSweepIcon />} iconPosition="start" label="Recycle Bin" />
                </Tabs>
            </Card>

            {/* Overview Tab */}
            {activeTab === 0 && (
                <Box>
                    {/* System Stats */}
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        System Statistics
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Users"
                                value={stats?.total_users || 0}
                                icon={<UserIcon />}
                                color="#9333ea"
                                isLoading={statsLoading}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Active Users"
                                value={stats?.active_users || 0}
                                icon={<UserIcon />}
                                color="#22c55e"
                                isLoading={statsLoading}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total VMs"
                                value={stats?.total_vms || 0}
                                icon={<VmIcon />}
                                color="#f97316"
                                isLoading={statsLoading}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Running VMs"
                                value={stats?.running_vms || 0}
                                icon={<VmIcon />}
                                color="#06b6d4"
                                isLoading={statsLoading}
                            />
                        </Grid>
                    </Grid>

                    {/* User Role Distribution */}
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        User Role Distribution
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <AdminIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                                    <Typography variant="h4" fontWeight={700}>
                                        {statsLoading ? <Skeleton width={40} sx={{ mx: 'auto' }} /> : stats?.admin_count || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Administrators
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <ManagerIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                                    <Typography variant="h4" fontWeight={700}>
                                        {statsLoading ? <Skeleton width={40} sx={{ mx: 'auto' }} /> : stats?.manager_count || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Managers
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <ViewerIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                                    <Typography variant="h4" fontWeight={700}>
                                        {statsLoading ? <Skeleton width={40} sx={{ mx: 'auto' }} /> : stats?.viewer_count || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Viewers
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Sync Settings Tab */}
            {activeTab === 1 && (
                <Box>
                    <Grid container spacing={3}>
                        {/* Metrics Retention Settings */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight={600} mb={3}>
                                        การเก็บข้อมูล Metrics
                                    </Typography>

                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={metricsSettings.collect_metrics}
                                                        onChange={(e) => setMetricsSettings({ ...metricsSettings, collect_metrics: e.target.checked })}
                                                    />
                                                }
                                                label="เปิดเก็บ Metrics"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={metricsSettings.auto_aggregate}
                                                        onChange={(e) => setMetricsSettings({ ...metricsSettings, auto_aggregate: e.target.checked })}
                                                    />
                                                }
                                                label="รวมข้อมูลอัตโนมัติ"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <TextField
                                                label="ระยะเวลาเก็บ (วินาที)"
                                                type="number"
                                                value={metricsSettings.collection_interval_seconds}
                                                onChange={(e) => setMetricsSettings({ ...metricsSettings, collection_interval_seconds: parseInt(e.target.value) || 60 })}
                                                fullWidth
                                                size="small"
                                                inputProps={{ min: 10, max: 300 }}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ my: 3 }} />

                                    <Typography variant="subtitle2" fontWeight={600} mb={2}>
                                        ระยะเวลาการเก็บรักษาข้อมูล
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="ข้อมูลดิบ (วัน)"
                                                type="number"
                                                value={metricsSettings.retain_raw_days}
                                                onChange={(e) => setMetricsSettings({ ...metricsSettings, retain_raw_days: parseInt(e.target.value) || 7 })}
                                                fullWidth
                                                size="small"
                                                helperText="ข้อมูลความละเอียดสูง"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="รายชั่วโมง (วัน)"
                                                type="number"
                                                value={metricsSettings.retain_hourly_days}
                                                onChange={(e) => setMetricsSettings({ ...metricsSettings, retain_hourly_days: parseInt(e.target.value) || 30 })}
                                                fullWidth
                                                size="small"
                                                helperText="ข้อมูลรวมรายชั่วโมง"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="รายวัน (วัน)"
                                                type="number"
                                                value={metricsSettings.retain_daily_days}
                                                onChange={(e) => setMetricsSettings({ ...metricsSettings, retain_daily_days: parseInt(e.target.value) || 365 })}
                                                fullWidth
                                                size="small"
                                                helperText="ข้อมูลรวมรายวัน"
                                            />
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ mt: 3 }}>
                                        <Button
                                            variant="contained"
                                            onClick={() => updateMetricsSettingsMutation.mutate(metricsSettings)}
                                            disabled={updateMetricsSettingsMutation.isPending}
                                            size="small"
                                        >
                                            {updateMetricsSettingsMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Metrics'}
                                        </Button>
                                    </Box>

                                    {updateMetricsSettingsMutation.isSuccess && (
                                        <Alert severity="success" sx={{ mt: 2 }}>
                                            บันทึกการตั้งค่าสำเร็จ!
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 2 && (
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Recent Activity
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Latest system actions and changes
                            </Typography>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {auditLoading ? (
                                        [...Array(10)].map((_, i) => (
                                            <TableRow key={i}>
                                                {[...Array(4)].map((_, j) => (
                                                    <TableCell key={j}><Skeleton /></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : auditLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                                <AuditIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                                <Typography color="text.secondary">
                                                    No audit logs found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        auditLogs.map((log: AuditLogItem) => (
                                            <TableRow key={log.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {new Date(log.created_at).toLocaleString('th-TH')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {log.username}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {getActionChip(log.action)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {log.details || '-'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Data Store Dashboard Settings Tab */}
            {activeTab === 3 && (
                <Box>
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <StorageIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    เลือก Data Store ที่ต้องการแสดงใน Dashboard
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                เลือก Data Store ที่คุณต้องการให้แสดงในแท็บ Dashboard ด้านข้าง
                            </Typography>

                            {datastoresLoading || dashboardSettingsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <>
                                    <List sx={{
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        maxHeight: 400,
                                        overflow: 'auto',
                                        mb: 3
                                    }}>
                                        {datastoresData?.data?.map((ds: any) => (
                                            <ListItem
                                                key={ds.datastore_id}
                                                button
                                                onClick={() => handleDatastoreToggle(ds.datastore_id)}
                                                sx={{
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={selectedDatastores.includes(ds.datastore_id)}
                                                        tabIndex={-1}
                                                        disableRipple
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                {ds.name}
                                                            </Typography>
                                                            <Chip
                                                                label={ds.az_name || 'Unknown'}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                            <Chip
                                                                label={ds.type || 'Unknown'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" color="text.secondary">
                                                            ID: {ds.datastore_id} • ความจุ: {(ds.total_mb / 1024 / 1024).toFixed(2)} TB
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            เลือกแล้ว: {selectedDatastores.length} / {datastoresData?.data?.length || 0}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            onClick={handleSaveDashboardSettings}
                                            disabled={updateDashboardSettingsMutation.isPending}
                                            startIcon={<SettingsIcon />}
                                        >
                                            {updateDashboardSettingsMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                                        </Button>
                                    </Box>

                                    {updateDashboardSettingsMutation.isSuccess && (
                                        <Alert severity="success" sx={{ mt: 2 }}>
                                            บันทึกการตั้งค่า Dashboard สำเร็จ!
                                        </Alert>
                                    )}

                                    {updateDashboardSettingsMutation.isError && (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง
                                        </Alert>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* Data Store Dashboard Visualization Tab */}
            {activeTab === 4 && (
                <Box>
                    <DataStoreExecutiveDashboard />
                </Box>
            )}

            {/* Keycloak SSO Settings Tab */}
            {activeTab === 5 && (
                <Box>
                    <KeycloakSettings />
                </Box>
            )}

            {/* Recycle Bin Tab */}
            {activeTab === 6 && (
                <Box>
                    <DeletedVMManager />
                </Box>
            )}
        </Box>
    );
}
