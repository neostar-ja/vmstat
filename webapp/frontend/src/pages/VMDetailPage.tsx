import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
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
    alpha,
    InputLabel,
    Select,
    CircularProgress,
    MenuItem,
    FormControl,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    ListItemIcon,
    ListItemText,
    Menu,
    Snackbar,
    Alert,
    LinearProgress,
    useTheme,
    Breadcrumbs,
    Link as MuiLink,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    PlayArrow as RunningIcon,
    Stop as StoppedIcon,
    Computer as VmIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    DataObject as RawDataIcon,
    Dashboard as DashboardIcon,
    ShowChart as PerformanceIcon,
    Backup as BackupIcon,
    NotificationsActive as AlarmIcon,
    Speed as CpuIcon,
    NetworkCheck as NetworkIcon,
    AccessTime as UptimeIcon,
    Warning as WarningIcon,
    CalendarToday as CalendarIcon,
    Home as HomeIcon,
    NavigateNext as NavigateNextIcon,
    Refresh as RefreshIcon,
    RestartAlt as RebootIcon,
    PowerSettingsNew as ShutdownIcon,
    MoreVert as MoreVertIcon,
    Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
// import {
//     LineChart,
//     Line,
//     XAxis,
//     YAxis,
//     CartesianGrid,
//     Tooltip,
//     ResponsiveContainer,
//     Area,
//     AreaChart,
// } from 'recharts';
import { vmsApi, metricsApi, alarmsApi, vmControlApi } from '../services/api';
import type { VMDetail, VMDisk, VMNetwork, VMAlarm } from '../types';
// import { SiUbuntu, SiCentos, SiRedhat, SiDebian, SiLinux } from 'react-icons/si';
// import WindowIcon from '@mui/icons-material/Window';
import {
    Tab0General,
    Tab1Performance,
    Tab2CpuMemory,
    Tab3Storage,
    Tab4Network,
    Tab5BackupDR,
    Tab6Alarm,
    Tab7Report,
    Tab8RawData,
} from './vmdetail/tabs';
import { formatUptime, formatBytes, normalizePercent } from './vmdetail/helpers';

// ช่วงเวลา
const TIME_RANGES = [
    { label: '1 ชั่วโมง', value: '1h' },
    { label: '6 ชั่วโมง', value: '6h' },
    { label: '12 ชั่วโมง', value: '12h' },
    { label: '1 วัน', value: '1d' },
    { label: '7 วัน', value: '7d' },
    { label: '30 วัน', value: '30d' },
    { label: 'กำหนดเอง', value: 'custom' },
];

// Helpers moved to ./vmdetail/helpers.tsx


export default function VMDetailPage() {
    const theme = useTheme();
    const { vmUuid } = useParams<{ vmUuid: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState(0);
    const [timeRange, setTimeRange] = useState('7d'); // Default เป็น 7 วัน
    const [customDateOpen, setCustomDateOpen] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [actualTimeRange, setActualTimeRange] = useState('7d'); // ช่วงเวลาจริงที่ส่งไป API - Default 7 วัน
    const [pendingState, setPendingState] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [confirm, setConfirm] = useState<{ open: boolean; action: string, vmUuid: string, vmName: string, label: string }>({ open: false, action: '', vmUuid: '', vmName: '', label: '' });
    const [busy, setBusy] = useState(false);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; ok: boolean }>({ open: false, msg: '', ok: true });

    type VMAction = 'start' | 'stop' | 'shutdown' | 'reboot';

    const ACTION_LABELS: Record<string, string> = {
        start: 'Start VM',
        stop: 'Force Stop',
        shutdown: 'Shutdown',
        reboot: 'Restart',
    };

    const ACTION_CONFIG: Record<string, {
        thaiTitle: string;
        thaiDesc: (n: string) => string;
        thaiWarning?: string;
        color: string;
        gradient: string;
    }> = {
        start: {
            thaiTitle: 'เริ่มต้นเครื่องเสมือน (Start)',
            thaiDesc: (n) => `ต้องการเริ่มต้นเครื่องเสมือน "${n}" ใช่หรือไม่?`,
            color: '#22c55e',
            gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
        },
        shutdown: {
            thaiTitle: 'ปิดเครื่องเสมือน (Shutdown)',
            thaiDesc: (n) => `ต้องการปิดเครื่องเสมือน "${n}" อย่างปกติใช่หรือไม่?`,
            thaiWarning: 'ระบบจะส่งสัญญาณปิดเครื่องให้ OS ปิดอย่างถูกต้อง (graceful shutdown)',
            color: '#f97316',
            gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
        },
        stop: {
            thaiTitle: 'บังคับปิดเครื่องเสมือน (Force Stop)',
            thaiDesc: (n) => `ต้องการบังคับปิดเครื่องเสมือน "${n}" ใช่หรือไม่?`,
            thaiWarning: 'การบังคับปิดจะหยุดเครื่องทันที อาจทำให้ข้อมูลที่ยังไม่ได้บันทึกสูญหาย',
            color: '#ef4444',
            gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        },
        reboot: {
            thaiTitle: 'รีสตาร์ทเครื่องเสมือน (Restart)',
            thaiDesc: (n) => `ต้องการรีสตาร์ทเครื่องเสมือน "${n}" ใช่หรือไม่?`,
            thaiWarning: 'ระบบจะปิดและเปิดเครื่องใหม่อย่างถูกต้อง (graceful restart)',
            color: '#3b82f6',
            gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
        },
    };

    // ดึงข้อมูล VM Detail with caching
    const { data: vmData, isLoading: vmLoading } = useQuery<{ data: VMDetail }>({
        queryKey: ['vm-detail', vmUuid],
        queryFn: () => vmsApi.getDetail(vmUuid!),
        enabled: !!vmUuid,
        staleTime: 2 * 60 * 1000, // 2 minutes - VM details don't change frequently
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    });

    // ดึงข้อมูล Metrics ย้อนหลัง - แยกโหลดตามแท็บเพื่อประสิทธิภาพ
    const { data: metricsData, isLoading: metricsLoading } = useQuery({
        queryKey: ['vm-metrics-history', vmUuid, actualTimeRange, customStartDate, customEndDate, activeTab],
        queryFn: () => {
            const params: any = {};
            if (actualTimeRange.startsWith('custom_')) {
                params.start_time = customStartDate;
                params.end_time = customEndDate;
            } else {
                params.time_range = actualTimeRange;
            }
            return metricsApi.getVMHistory(vmUuid!, params);
        },
        // โหลดเมื่ออยู่ใน Tab 1 (ประสิทธิภาพ), Tab 3 (ที่เก็บข้อมูล), หรือ Tab 7 (รายงาน) เพื่อแสดงข้อมูล storage history
        enabled: !!vmUuid && (activeTab === 1 || activeTab === 3 || activeTab === 7) && (actualTimeRange !== 'custom' || (!!customStartDate && !!customEndDate)),
        staleTime: 1 * 60 * 1000, // 1 minute for metrics
        gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
    });

    // ดึงข้อมูล Realtime จาก Sangfor API - โหลดเฉพาะเมื่ออยู่ Tab 0, Tab 1 หรือ Tab 7 เพื่อความเร็ว
    const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
        queryKey: ['vm-realtime', vmUuid],
        queryFn: () => metricsApi.getVMRealtime(vmUuid!),
        enabled: !!vmUuid && (activeTab === 0 || activeTab === 1 || activeTab === 7),
        refetchInterval: (activeTab === 0 || activeTab === 1 || activeTab === 7) ? 30000 : false,
    });

    // ดึงข้อมูล Disks
    const { data: disksData, isLoading: disksLoading } = useQuery<{ data: VMDisk[] }>({
        queryKey: ['vm-disks', vmUuid],
        queryFn: () => vmsApi.getDisks(vmUuid!),
        enabled: !!vmUuid && (activeTab === 3 || activeTab === 7),
    });

    // ดึงข้อมูล Networks
    const { data: networksData, isLoading: networksLoading } = useQuery<{ data: VMNetwork[] }>({
        queryKey: ['vm-networks', vmUuid],
        queryFn: () => vmsApi.getNetworks(vmUuid!),
        enabled: !!vmUuid && (activeTab === 4 || activeTab === 7),
    });

    // ดึงข้อมูล Alarms & Platform Alerts
    const { data: alarmsData, isLoading: alarmsLoading } = useQuery<{
        data: { vm_uuid: string; alarms: VMAlarm[]; alerts: VMAlarm[]; total_alarms: number; total_alerts: number }
    }>({
        queryKey: ['vm-alarms', vmUuid],
        queryFn: () => alarmsApi.getVmAlarms(vmUuid!),
        enabled: !!vmUuid && (activeTab === 6 || activeTab === 7),
    });

    // ดึงข้อมูล Raw Data
    const { data: rawData, isLoading: rawLoading, error: rawError } = useQuery({
        queryKey: ['vm-raw', vmUuid],
        queryFn: () => vmsApi.getRaw(vmUuid!),
        enabled: !!vmUuid && activeTab === 8, // Load only when tab is active
    });

    const vm = vmData?.data;
    const metricsResponse = metricsData?.data;
    const realtime = realtimeData?.data;
    const disks = disksData?.data || [];
    const networks = networksData?.data || [];
    const alarms = alarmsData?.data?.alarms || [];
    const platformAlerts = alarmsData?.data?.alerts || [];

    // เตรียมข้อมูลกราฟ - คำนวณเมื่ออยู่ Tab 1 (ประสิทธิภาพ), Tab 3 (ที่เก็บข้อมูล) หรือ Tab 7 (รายงาน)
    const chartData = React.useMemo(() => {
        if ((activeTab !== 1 && activeTab !== 3 && activeTab !== 7) || !metricsResponse?.series) return [];

        const cpuData = metricsResponse.series.cpu?.data || [];
        const memoryData = metricsResponse.series.memory?.data || [];
        const networkReadData = metricsResponse.series.network_read?.data || [];
        const networkWriteData = metricsResponse.series.network_write?.data || [];
        const diskReadData = metricsResponse.series.disk_read_iops?.data || [];
        const diskWriteData = metricsResponse.series.disk_write_iops?.data || [];
        // storage is percent from API, but we also get storage_used_mb from VM detail
        const storagePercentData = metricsResponse.series.storage?.data || [];

        const timestampMap = new Map();

        const isLongRange = actualTimeRange !== '1h' && actualTimeRange !== '6h' && actualTimeRange !== '24h';

        cpuData.forEach((item: any) => {
            const dateObj = new Date(item.timestamp);
            const timeStr = isLongRange
                ? `${dateObj.getDate()}/${dateObj.getMonth() + 1} ${dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                : dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            if (!timestampMap.has(item.timestamp)) {
                timestampMap.set(item.timestamp, {
                    time: timeStr,
                    timestamp: item.timestamp,
                    cpu: 0,
                    memory: 0,
                    networkIn: 0,
                    networkOut: 0,
                    diskRead: 0,
                    diskWrite: 0,
                    storagePercent: 0,
                    storageUsedMB: 0,
                    storageUsedGB: 0,
                });
            }
            timestampMap.get(item.timestamp).cpu = item.value;
        });

        memoryData.forEach((item: any) => {
            if (timestampMap.has(item.timestamp)) {
                timestampMap.get(item.timestamp).memory = item.value;
            }
        });

        networkReadData.forEach((item: any) => {
            if (timestampMap.has(item.timestamp)) {
                timestampMap.get(item.timestamp).networkIn = item.value / 1000000;
            }
        });

        networkWriteData.forEach((item: any) => {
            if (timestampMap.has(item.timestamp)) {
                timestampMap.get(item.timestamp).networkOut = item.value / 1000000;
            }
        });

        diskReadData.forEach((item: any) => {
            if (timestampMap.has(item.timestamp)) {
                timestampMap.get(item.timestamp).diskRead = item.value;
            }
        });

        diskWriteData.forEach((item: any) => {
            if (timestampMap.has(item.timestamp)) {
                timestampMap.get(item.timestamp).diskWrite = item.value;
            }
        });

        storagePercentData.forEach((item: any) => {
            if (timestampMap.has(item.timestamp)) {
                let storagePercent = item.value;
                // normalize: some sources report 0..1 fraction, convert to 0..100
                if (storagePercent <= 1) storagePercent = storagePercent * 100;
                // Calculate MB from percentage using vm.storage_total_mb
                const storageTotalMB = vm?.storage_total_mb || 0;
                const usedMB = (storagePercent / 100) * storageTotalMB;
                timestampMap.get(item.timestamp).storagePercent = storagePercent;
                timestampMap.get(item.timestamp).storageUsedMB = usedMB;
                timestampMap.get(item.timestamp).storageUsedGB = usedMB / 1024;
            }
        });


        return Array.from(timestampMap.values());
    }, [metricsResponse, activeTab, vm?.storage_total_mb]);

    // คำนวณ % โดยใช้ค่าจริงจากฐานข้อมูล
    // คำนวณ % โดยใช้ค่าจริงจากฐานข้อมูล
    const currentCpu = normalizePercent(
        realtime?.cpu?.percent ||
        vm?.cpu_usage ||
        vm?.cpu_ratio ||
        (vm?.cpu_used_mhz && vm?.cpu_total_mhz ? (vm.cpu_used_mhz / vm.cpu_total_mhz) * 100 : 0)
    );

    const currentMemory = normalizePercent(
        realtime?.memory?.percent ||
        vm?.memory_usage ||
        vm?.memory_ratio ||
        (vm?.memory_used_mb && vm?.memory_total_mb ? (vm.memory_used_mb / vm.memory_total_mb) * 100 : 0)
    );

    // normalize storage (could be fraction 0..1 or percent 0..100)
    const currentStorage = normalizePercent(
        realtime?.storage?.percent ||
        vm?.storage_usage ||
        (vm?.storage_used_mb && vm?.storage_total_mb ? (vm.storage_used_mb / vm.storage_total_mb) * 100 : 0)
    );

    // คำนวณการเติบโตของ Storage - คำนวณเมื่ออยู่ Tab 1, Tab 3 หรือ Tab 7
    const storageGrowth = React.useMemo(() => {
        if ((activeTab !== 1 && activeTab !== 3 && activeTab !== 7) || chartData.length < 2) return { rate: 0, trend: 'stable', perDay: 0 };

        const first = chartData[0].storageUsedMB || 0;
        const last = chartData[chartData.length - 1].storageUsedMB || 0;
        const growth = last - first;

        // คำนวณเป็น MB ต่อวัน
        const firstTime = new Date(chartData[0].timestamp).getTime();
        const lastTime = new Date(chartData[chartData.length - 1].timestamp).getTime();
        const daysElapsed = (lastTime - firstTime) / (1000 * 60 * 60 * 24);
        const perDay = daysElapsed > 0 ? growth / daysElapsed : 0;

        const trend = growth > 100 ? 'increasing' : growth < -100 ? 'decreasing' : 'stable';

        return { rate: growth, trend, perDay };
    }, [chartData, activeTab]);

    const executeAction = async (action: VMAction) => {
        setBusy(true);
        try {
            const resp = await vmControlApi.controlAction(vm!.vm_uuid, action as any, false);
            const expected = resp.data.expected_power_state ?? (action === 'stop' ? 'off' : 'on');
            setPendingState(expected);
            setSnack({ open: true, msg: `ดำเนินการ ${ACTION_LABELS[action] || action} บน "${vm!.name}" สำเร็จ`, ok: true });
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['vm-detail', vmUuid] });
                queryClient.invalidateQueries({ queryKey: ['vm-realtime', vmUuid] });
            }, 6000);
            setTimeout(() => { setPendingState(null); }, 30000);
        } catch (err: unknown) {
            const msg = (err as any)?.response?.data?.detail || `การดำเนินการ ${ACTION_LABELS[action] || action} ล้มเหลว`;
            setSnack({ open: true, msg, ok: false });
        } finally {
            setBusy(false);
            setMenuAnchor(null);
        }
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['vm-detail', vmUuid] });
        queryClient.invalidateQueries({ queryKey: ['vm-metrics-history', vmUuid] });
        queryClient.invalidateQueries({ queryKey: ['vm-realtime', vmUuid] });
    };

    const effectivePS = pendingState ?? vm?.power_state;
    const isOn = effectivePS === 'on';

    if (vmLoading) {
        return (
            <Box sx={{ p: { xs: 2, md: 0 } }}>
                {/* Header skeleton */}
                <Box sx={{ mb: { xs: 2, sm: 3, md: 4 }, p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: { xs: 2.5, sm: 3, md: 4 }, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Skeleton variant="rounded" width={64} height={64} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton height={40} width="40%" sx={{ mb: 1 }} />
                            <Skeleton height={20} width="60%" />
                        </Box>
                    </Box>
                </Box>
                {/* KPI Cards skeleton */}
                <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 4 }}>
                    {[...Array(4)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Skeleton height={140} variant="rounded" />
                        </Grid>
                    ))}
                </Grid>
                {/* Tabs skeleton */}
                <Skeleton height={56} variant="rounded" sx={{ mb: 3 }} />
                {/* Content skeleton */}
                <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                    <Grid item xs={12} md={4}>
                        <Skeleton height={300} variant="rounded" />
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Skeleton height={300} variant="rounded" />
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (!vm) {
        return (
            <Box textAlign="center" py={6}>
                <Typography variant="h6" color="text.secondary">
                    ไม่พบข้อมูล VM
                </Typography>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/vms')} sx={{ mt: 2 }}>
                    กลับไปรายการ VM
                </Button>
            </Box>
        );
    }

    return (
        <Box
            className="animate-fade-in"
            sx={{
                overflowX: 'hidden',
                maxWidth: '100vw',
                // เพิ่ม CSS animations สำหรับหน้า VM Detail
                '@keyframes shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' }
                },
                '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.8 }
                },
                '@keyframes rotate': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                },
                '@keyframes fadeInUp': {
                    '0%': {
                        opacity: 0,
                        transform: 'translateY(30px)'
                    },
                    '100%': {
                        opacity: 1,
                        transform: 'translateY(0)'
                    }
                },
                animated: {
                    animation: 'fadeInUp 0.6s ease-out'
                }
            }}
        >
            {/* Standardized Header */}
            <Card
                sx={{
                    mb: { xs: 1.5, sm: 2, md: 4 },
                    borderRadius: { xs: 3, sm: 3, md: 4 },
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(34, 197, 94, 0.08) 50%, rgba(139, 92, 246, 0.08) 100%)',
                    border: '2px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: { xs: '3px', md: '4px' },
                        background: 'linear-gradient(90deg, #0ea5e9, #22c55e, #8b5cf6, #0ea5e9)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 3s linear infinite',
                    },
                }}
            >
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
                    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2, md: 3 } }}>
                        {/* Icon Box */}
                        <Box
                            sx={{
                                width: { xs: 40, sm: 48, md: 64 },
                                height: { xs: 40, sm: 48, md: 64 },
                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 8px 16px rgba(14, 165, 233, 0.3)',
                                animation: 'float 6s ease-in-out infinite',
                            }}
                        >
                            <VmIcon sx={{ fontSize: { xs: 24, sm: 28, md: 36 }, color: '#fff' }} />
                        </Box>

                        {/* Text Content */}
                        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5, md: 2 }, mb: { xs: 0.5, md: 1 }, flexWrap: 'wrap' }}>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 900,
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2.5rem' },
                                        letterSpacing: '-0.02em',
                                        wordBreak: 'break-word',
                                        maxWidth: '100%',
                                        lineHeight: { xs: 1.2, md: 1.3 },
                                    }}
                                >
                                    {vm.name}
                                </Typography>
                                <Chip
                                    icon={isOn ? <RunningIcon sx={{ fontSize: { xs: 14, md: 18 } }} /> : <StoppedIcon sx={{ fontSize: { xs: 14, md: 18 } }} />}
                                    label={isOn ? 'Running' : 'Stopped'}
                                    color={isOn ? 'success' : 'error'}
                                    variant="filled"
                                    size="small"
                                    sx={{ fontWeight: 700, borderRadius: { xs: 1.5, md: 2 }, flexShrink: 0, height: { xs: 22, sm: 24, md: 28 }, fontSize: { xs: '0.7rem', md: '0.8125rem' } }}
                                />
                                {pendingState && (
                                    <Typography variant="caption" sx={{ ml: 1, opacity: 0.8, fontWeight: 700, color: 'text.secondary' }}>
                                        (updating...)
                                    </Typography>
                                )}
                            </Box>

                            {/* Breadcrumbs / Subtitle */}
                            <Breadcrumbs
                                separator={<NavigateNextIcon fontSize="small" sx={{ fontSize: { xs: '0.9rem', md: 'inherit' } }} />}
                                aria-label="breadcrumb"
                                sx={{
                                    '& .MuiBreadcrumbs-separator': { color: 'text.secondary', mx: { xs: 0.25, sm: 0.5, md: 1 } },
                                    '& .MuiBreadcrumbs-ol': { flexWrap: { xs: 'wrap', md: 'nowrap' } },
                                    overflow: 'hidden',
                                    '& .MuiBreadcrumbs-li': { minWidth: 0 },
                                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                                }}
                            >
                                <MuiLink
                                    underline="hover"
                                    color="inherit"
                                    onClick={() => navigate('/')}
                                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    <HomeIcon sx={{ mr: { xs: 0.25, md: 0.5 }, fontSize: { xs: '0.9rem', md: 'inherit' } }} />
                                    Home
                                </MuiLink>
                                <MuiLink
                                    underline="hover"
                                    color="inherit"
                                    onClick={() => navigate('/vms')}
                                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    Virtual Machines
                                </MuiLink>
                                <Typography color="text.primary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                    <VmIcon sx={{ mr: { xs: 0.25, md: 0.5 }, fontSize: { xs: 14, sm: 16, md: 18 }, flexShrink: 0 }} />
                                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{vm.name}</Box>
                                </Typography>
                            </Breadcrumbs>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, justifyContent: { xs: 'flex-start', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' } }}>
                            <Button
                                startIcon={<RefreshIcon sx={{ fontSize: { xs: 16, md: 20 } }} />}
                                onClick={handleRefresh}
                                variant="outlined"
                                size="small"
                                sx={{
                                    borderRadius: { xs: 2, md: 2.5 },
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderWidth: 2,
                                    fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                    px: { xs: 1.5, sm: 1.75, md: 2 },
                                    py: { xs: 0.5, md: 0.75 },
                                    minWidth: { xs: 'auto', sm: 'auto' },
                                    bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.02),
                                    '&:hover': { borderWidth: 2, bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.1) : alpha('#000', 0.05) }
                                }}
                            >
                                รีเฟรช
                            </Button>

                            <Button
                                startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <MoreVertIcon sx={{ fontSize: { xs: 16, md: 20 } }} />}
                                onClick={(e) => setMenuAnchor(e.currentTarget)}
                                variant="contained"
                                size="small"
                                disabled={busy}
                                sx={{
                                    borderRadius: { xs: 2, md: 2.5 },
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                    px: { xs: 1.5, sm: 1.75, md: 2 },
                                    py: { xs: 0.5, md: 0.75 },
                                    minWidth: { xs: 'auto', sm: 'auto' },
                                    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                                }}
                            >
                                จัดการ VM
                            </Button>

                            <Button
                                startIcon={<BackIcon sx={{ fontSize: { xs: 16, md: 20 } }} />}
                                onClick={() => navigate('/vms')}
                                variant="outlined"
                                size="small"
                                sx={{
                                    borderRadius: { xs: 2, md: 2.5 },
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                    px: { xs: 1.5, sm: 1.75, md: 2 },
                                    py: { xs: 0.5, md: 0.75 },
                                    minWidth: { xs: 'auto', sm: 'auto' },
                                    borderWidth: 2,
                                    '&:hover': { borderWidth: 2 }
                                }}
                            >
                                กลับ
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Action Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                PaperProps={{
                    elevation: 12,
                    sx: {
                        minWidth: 180, borderRadius: { xs: 2, sm: 2.5, md: 3 },
                        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                        mt: 1,
                        '& .MuiMenuItem-root': { borderRadius: 2, mx: 0.5, my: 0.25, px: 2, py: 1.5 }
                    }
                }}
            >
                {!isOn && (
                    <MenuItem onClick={() => { setMenuAnchor(null); setConfirm({ open: true, action: 'start', vmUuid: vm.vm_uuid, vmName: vm.name, label: ACTION_LABELS['start'] }); }}>
                        <ListItemIcon><RunningIcon fontSize="small" sx={{ color: '#22c55e' }} /></ListItemIcon>
                        <ListItemText primary="Start" primaryTypographyProps={{ color: '#22c55e', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {isOn && (
                    <MenuItem onClick={() => { setMenuAnchor(null); setConfirm({ open: true, action: 'shutdown', vmUuid: vm.vm_uuid, vmName: vm.name, label: ACTION_LABELS['shutdown'] }); }}>
                        <ListItemIcon><ShutdownIcon fontSize="small" sx={{ color: '#f97316' }} /></ListItemIcon>
                        <ListItemText primary="Shutdown" primaryTypographyProps={{ color: '#f97316', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {isOn && (
                    <MenuItem onClick={() => { setMenuAnchor(null); setConfirm({ open: true, action: 'stop', vmUuid: vm.vm_uuid, vmName: vm.name, label: ACTION_LABELS['stop'] }); }}>
                        <ListItemIcon><StoppedIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                        <ListItemText primary="Force Stop" primaryTypographyProps={{ color: '#ef4444', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {isOn && (
                    <MenuItem onClick={() => { setMenuAnchor(null); setConfirm({ open: true, action: 'reboot', vmUuid: vm.vm_uuid, vmName: vm.name, label: ACTION_LABELS['reboot'] }); }}>
                        <ListItemIcon><RebootIcon fontSize="small" sx={{ color: '#3b82f6' }} /></ListItemIcon>
                        <ListItemText primary="Reboot" primaryTypographyProps={{ color: '#3b82f6', fontWeight: 700 }} />
                    </MenuItem>
                )}
            </Menu>

            {/* Confirm Dialog */}
            {confirm.open && confirm.action && (() => {
                const cfg = ACTION_CONFIG[confirm.action as VMAction];
                return (
                    <Dialog
                        open
                        onClose={() => setConfirm({ open: false, action: '', vmUuid: '', vmName: '', label: '' })}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        PaperProps={{ sx: { borderRadius: 4, minWidth: { xs: '88vw', sm: 400 }, maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' } }}
                    >
                        <Box sx={{ background: cfg.gradient, pt: { xs: 3, sm: 4 }, pb: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                                borderRadius: '50%', width: { xs: 52, sm: 68 }, height: { xs: 52, sm: 68 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid rgba(255,255,255,0.5)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                            }}>
                                {confirm.action === 'start' && <RunningIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                                {confirm.action === 'shutdown' && <ShutdownIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                                {confirm.action === 'stop' && <StoppedIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                                {confirm.action === 'reboot' && <RebootIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                            </Box>
                            <Typography sx={{ color: 'white', fontWeight: 800, textAlign: 'center', fontSize: { xs: '0.95rem', sm: '1.1rem' }, textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
                                {cfg.thaiTitle}
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
                            <Box sx={{ bgcolor: alpha(cfg.color, 0.06), border: `1px solid ${alpha(cfg.color, 0.2)}`, borderRadius: 2, p: 2, mb: 2.5, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>เครื่องเสมือน (VM)</Typography>
                                <Typography sx={{ fontWeight: 700, color: cfg.color, fontSize: '1rem' }}>{vm.name}</Typography>
                            </Box>
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: cfg.thaiWarning ? 2 : 0.5 }}>
                                {cfg.thaiDesc(vm.name)}
                            </Typography>
                            {cfg.thaiWarning && (
                                <Box sx={{ bgcolor: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.3)}`, borderRadius: 2, p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <WarningIcon sx={{ color: '#f59e0b', fontSize: 18, mt: 0.15, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>{cfg.thaiWarning}</Typography>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
                            <Button variant="outlined" fullWidth onClick={() => setConfirm({ open: false, action: '', vmUuid: '', vmName: '', label: '' })} sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 600, fontSize: '1rem' }}>
                                ยกเลิก
                            </Button>
                            <Button
                                variant="contained" fullWidth onClick={() => { executeAction(confirm.action as VMAction); setConfirm({ open: false, action: '', vmUuid: '', vmName: '', label: '' }); }}
                                sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700, fontSize: '1rem', bgcolor: cfg.color, boxShadow: `0 4px 14px ${alpha(cfg.color, 0.4)}`, '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.88)' } }}
                            >
                                ยืนยัน
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnack(s => ({ ...s, open: false }))}
                    severity={snack.ok ? 'success' : 'error'}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>

            {/* Professional Summary Cards */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 1.5, sm: 2, md: 4 } }}>
                {/* CPU Card */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        className="card-hover"
                        sx={{
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#9333ea', 0.15)} 0%, ${alpha('#9333ea', 0.05)} 100%)`
                                : `linear-gradient(135deg, ${alpha('#9333ea', 0.08)} 0%, ${alpha('#9333ea', 0.02)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha('#9333ea', 0.2),
                            borderRadius: { xs: 3, md: 4 },
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: { xs: 'translateY(-4px)', md: 'translateY(-8px)' },
                                borderColor: alpha('#9333ea', 0.5),
                                boxShadow: `0 16px 40px -12px ${alpha('#9333ea', 0.5)}`,
                                '& .stat-icon-container': {
                                    transform: 'rotate(-5deg) scale(1.15)',
                                    boxShadow: `0 0 24px ${alpha('#9333ea', 0.6)}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: { xs: 3, md: 5 },
                            height: '100%',
                            background: `linear-gradient(180deg, #9333ea 0%, ${alpha('#9333ea', 0.5)} 100%)`,
                        }} />
                        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                <Box
                                    className="stat-icon-container"
                                    sx={{
                                        width: { xs: 40, sm: 48, md: 64 },
                                        height: { xs: 40, sm: 48, md: 64 },
                                        borderRadius: { xs: 2, md: 3 },
                                        background: `linear-gradient(135deg, ${alpha('#9333ea', 0.2)} 0%, ${alpha('#9333ea', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#9333ea', 0.3)}`,
                                        transition: 'all 0.4s ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    <CpuIcon sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, color: '#9333ea' }} />
                                </Box>
                                <Box sx={{ textAlign: 'right', flex: 1, minWidth: 0, ml: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, letterSpacing: '0.8px', mb: { xs: 0.25, md: 0.5 } }}>
                                        CPU Usage
                                    </Typography>
                                    <Typography variant="h3" fontWeight={900} sx={{ color: '#9333ea', lineHeight: 1, fontSize: { xs: '1.3rem', sm: '1.5rem', md: '2.5rem' } }}>
                                        {currentCpu.toFixed(0)}%
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                        {vm.cpu_cores} Cores
                                    </Typography>
                                    <Chip
                                        label={currentCpu > 80 ? 'โหลดสูง' : currentCpu > 50 ? 'ปานกลาง' : 'ปกติ'}
                                        size="small"
                                        sx={{
                                            height: { xs: 20, md: 24 },
                                            fontSize: { xs: '0.6rem', md: '0.7rem' },
                                            fontWeight: 700,
                                            bgcolor: currentCpu > 80 ? alpha('#ef4444', 0.15) : currentCpu > 50 ? alpha('#f59e0b', 0.15) : alpha('#22c55e', 0.15),
                                            color: currentCpu > 80 ? '#ef4444' : currentCpu > 50 ? '#f59e0b' : '#22c55e',
                                            border: `1px solid ${currentCpu > 80 ? alpha('#ef4444', 0.3) : currentCpu > 50 ? alpha('#f59e0b', 0.3) : alpha('#22c55e', 0.3)}`,
                                        }}
                                    />
                                </Box>
                                <Box sx={{ position: 'relative' }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={currentCpu > 100 ? 100 : currentCpu}
                                        sx={{
                                            height: { xs: 6, md: 8 },
                                            borderRadius: 10,
                                            bgcolor: theme.palette.mode === 'dark' ? alpha('#9333ea', 0.15) : alpha('#9333ea', 0.1),
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 10,
                                                background: currentCpu > 80
                                                    ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                                                    : currentCpu > 50
                                                        ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                                                        : 'linear-gradient(90deg, #9333ea 0%, #7c3aed 100%)',
                                                boxShadow: currentCpu > 80
                                                    ? `0 0 10px ${alpha('#ef4444', 0.5)}`
                                                    : currentCpu > 50
                                                        ? `0 0 10px ${alpha('#f59e0b', 0.5)}`
                                                        : `0 0 10px ${alpha('#9333ea', 0.5)}`,
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                <Box component="span" sx={{
                                    width: { xs: 5, md: 6 },
                                    height: { xs: 5, md: 6 },
                                    borderRadius: '50%',
                                    bgcolor: currentCpu > 80 ? '#ef4444' : currentCpu > 50 ? '#f59e0b' : '#22c55e',
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                        '0%, 100%': { opacity: 1 },
                                        '50%': { opacity: 0.5 }
                                    }
                                }} />
                                ประสิทธิภาพ: {currentCpu > 80 ? 'วิกฤต' : currentCpu > 50 ? 'ปานกลาง' : 'ดีเยี่ยม'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Memory Card */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        className="card-hover"
                        sx={{
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#f97316', 0.15)} 0%, ${alpha('#f97316', 0.05)} 100%)`
                                : `linear-gradient(135deg, ${alpha('#f97316', 0.08)} 0%, ${alpha('#f97316', 0.02)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha('#f97316', 0.2),
                            borderRadius: { xs: 3, md: 4 },
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: { xs: 'translateY(-4px)', md: 'translateY(-8px)' },
                                borderColor: alpha('#f97316', 0.5),
                                boxShadow: `0 16px 40px -12px ${alpha('#f97316', 0.5)}`,
                                '& .stat-icon-container': {
                                    transform: 'rotate(-5deg) scale(1.15)',
                                    boxShadow: `0 0 24px ${alpha('#f97316', 0.6)}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: { xs: 3, md: 5 },
                            height: '100%',
                            background: `linear-gradient(180deg, #f97316 0%, ${alpha('#f97316', 0.5)} 100%)`,
                        }} />
                        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                <Box
                                    className="stat-icon-container"
                                    sx={{
                                        width: { xs: 40, sm: 48, md: 64 },
                                        height: { xs: 40, sm: 48, md: 64 },
                                        borderRadius: { xs: 2, md: 3 },
                                        background: `linear-gradient(135deg, ${alpha('#f97316', 0.2)} 0%, ${alpha('#f97316', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#f97316', 0.3)}`,
                                        transition: 'all 0.4s ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    <MemoryIcon sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, color: '#f97316' }} />
                                </Box>
                                <Box sx={{ textAlign: 'right', flex: 1, minWidth: 0, ml: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, letterSpacing: '0.8px', mb: { xs: 0.25, md: 0.5 } }}>
                                        Memory Usage
                                    </Typography>
                                    <Typography variant="h3" fontWeight={900} sx={{ color: '#f97316', lineHeight: 1, fontSize: { xs: '1.3rem', sm: '1.5rem', md: '2.5rem' } }}>
                                        {currentMemory.toFixed(0)}%
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                        {formatBytes(vm.memory_used_mb || 0)} / {formatBytes(vm.memory_total_mb || 0)}
                                    </Typography>
                                    <Chip
                                        label={currentMemory > 80 ? 'ใช้งานสูง' : currentMemory > 50 ? 'ปานกลาง' : 'เพียงพอ'}
                                        size="small"
                                        sx={{
                                            height: { xs: 20, md: 24 },
                                            fontSize: { xs: '0.6rem', md: '0.7rem' },
                                            fontWeight: 700,
                                            bgcolor: currentMemory > 80 ? alpha('#ef4444', 0.15) : currentMemory > 50 ? alpha('#f59e0b', 0.15) : alpha('#22c55e', 0.15),
                                            color: currentMemory > 80 ? '#ef4444' : currentMemory > 50 ? '#f59e0b' : '#22c55e',
                                            border: `1px solid ${currentMemory > 80 ? alpha('#ef4444', 0.3) : currentMemory > 50 ? alpha('#f59e0b', 0.3) : alpha('#22c55e', 0.3)}`,
                                        }}
                                    />
                                </Box>
                                <Box sx={{ position: 'relative' }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={currentMemory > 100 ? 100 : currentMemory}
                                        sx={{
                                            height: { xs: 6, md: 8 },
                                            borderRadius: 10,
                                            bgcolor: theme.palette.mode === 'dark' ? alpha('#f97316', 0.15) : alpha('#f97316', 0.1),
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 10,
                                                background: currentMemory > 80
                                                    ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                                                    : currentMemory > 50
                                                        ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                                                        : 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                                                boxShadow: currentMemory > 80
                                                    ? `0 0 10px ${alpha('#ef4444', 0.5)}`
                                                    : currentMemory > 50
                                                        ? `0 0 10px ${alpha('#f59e0b', 0.5)}`
                                                        : `0 0 10px ${alpha('#f97316', 0.5)}`,
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                <Box component="span" sx={{
                                    width: { xs: 5, md: 6 },
                                    height: { xs: 5, md: 6 },
                                    borderRadius: '50%',
                                    bgcolor: currentMemory > 80 ? '#ef4444' : currentMemory > 50 ? '#f59e0b' : '#22c55e',
                                    animation: 'pulse 2s infinite',
                                }} />
                                สถานะ: {currentMemory > 80 ? 'ใช้งานสูง' : currentMemory > 50 ? 'ปานกลาง' : 'สุขภาพดี'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Storage Card */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        className="card-hover"
                        sx={{
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#06b6d4', 0.15)} 0%, ${alpha('#06b6d4', 0.05)} 100%)`
                                : `linear-gradient(135deg, ${alpha('#06b6d4', 0.08)} 0%, ${alpha('#06b6d4', 0.02)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha('#06b6d4', 0.2),
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                borderColor: alpha('#06b6d4', 0.5),
                                boxShadow: `0 16px 40px -12px ${alpha('#06b6d4', 0.5)}`,
                                '& .stat-icon-container': {
                                    transform: 'rotate(-5deg) scale(1.15)',
                                    boxShadow: `0 0 24px ${alpha('#06b6d4', 0.6)}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: { xs: 3, md: 5 },
                            height: '100%',
                            background: `linear-gradient(180deg, #06b6d4 0%, ${alpha('#06b6d4', 0.5)} 100%)`,
                        }} />
                        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                <Box
                                    className="stat-icon-container"
                                    sx={{
                                        width: { xs: 40, sm: 48, md: 64 },
                                        height: { xs: 40, sm: 48, md: 64 },
                                        borderRadius: { xs: 2, md: 3 },
                                        background: `linear-gradient(135deg, ${alpha('#06b6d4', 0.2)} 0%, ${alpha('#06b6d4', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#06b6d4', 0.3)}`,
                                        transition: 'all 0.4s ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    <StorageIcon sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, color: '#06b6d4' }} />
                                </Box>
                                <Box sx={{ textAlign: 'right', flex: 1, minWidth: 0, ml: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, letterSpacing: '0.8px', mb: { xs: 0.25, md: 0.5 } }}>
                                        Storage Usage
                                    </Typography>
                                    <Typography variant="h3" fontWeight={900} sx={{ color: '#06b6d4', lineHeight: 1, fontSize: { xs: '1.3rem', sm: '1.5rem', md: '2.5rem' } }}>
                                        {currentStorage.toFixed(0)}%
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                        {formatBytes(vm.storage_used_mb || 0)} / {formatBytes(vm.storage_total_mb || 0)}
                                    </Typography>
                                    <Chip
                                        label={currentStorage > 80 ? 'เหลือน้อย' : currentStorage > 50 ? 'ปานกลาง' : 'เพียงพอ'}
                                        size="small"
                                        sx={{
                                            height: { xs: 20, md: 24 },
                                            fontSize: { xs: '0.6rem', md: '0.7rem' },
                                            fontWeight: 700,
                                            bgcolor: currentStorage > 80 ? alpha('#ef4444', 0.15) : currentStorage > 50 ? alpha('#f59e0b', 0.15) : alpha('#22c55e', 0.15),
                                            color: currentStorage > 80 ? '#ef4444' : currentStorage > 50 ? '#f59e0b' : '#22c55e',
                                            border: `1px solid ${currentStorage > 80 ? alpha('#ef4444', 0.3) : currentStorage > 50 ? alpha('#f59e0b', 0.3) : alpha('#22c55e', 0.3)}`,
                                        }}
                                    />
                                </Box>
                                <Box sx={{ position: 'relative' }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={currentStorage > 100 ? 100 : currentStorage}
                                        sx={{
                                            height: { xs: 6, md: 8 },
                                            borderRadius: 10,
                                            bgcolor: theme.palette.mode === 'dark' ? alpha('#06b6d4', 0.15) : alpha('#06b6d4', 0.1),
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 10,
                                                background: currentStorage > 80
                                                    ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                                                    : currentStorage > 50
                                                        ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                                                        : 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
                                                boxShadow: currentStorage > 80
                                                    ? `0 0 10px ${alpha('#ef4444', 0.5)}`
                                                    : currentStorage > 50
                                                        ? `0 0 10px ${alpha('#f59e0b', 0.5)}`
                                                        : `0 0 10px ${alpha('#06b6d4', 0.5)}`,
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                <Box component="span" sx={{
                                    width: { xs: 5, md: 6 },
                                    height: { xs: 5, md: 6 },
                                    borderRadius: '50%',
                                    bgcolor: currentStorage > 80 ? '#ef4444' : currentStorage > 50 ? '#f59e0b' : '#22c55e',
                                    animation: 'pulse 2s infinite',
                                }} />
                                ความจุ: {currentStorage > 80 ? 'เหลือน้อย' : currentStorage > 50 ? 'ปานกลาง' : 'เพียงพอ'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Uptime Card */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        className="card-hover"
                        sx={{
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#22c55e', 0.15)} 0%, ${alpha('#22c55e', 0.05)} 100%)`
                                : `linear-gradient(135deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha('#22c55e', 0.2),
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                borderColor: alpha('#22c55e', 0.5),
                                boxShadow: `0 16px 40px -12px ${alpha('#22c55e', 0.5)}`,
                                '& .stat-icon-container': {
                                    transform: 'rotate(-5deg) scale(1.15)',
                                    boxShadow: `0 0 24px ${alpha('#22c55e', 0.6)}`,
                                }
                            }
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: { xs: 3, md: 5 },
                            height: '100%',
                            background: `linear-gradient(180deg, #22c55e 0%, ${alpha('#22c55e', 0.5)} 100%)`,
                        }} />
                        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                <Box
                                    className="stat-icon-container"
                                    sx={{
                                        width: { xs: 40, sm: 48, md: 64 },
                                        height: { xs: 40, sm: 48, md: 64 },
                                        borderRadius: { xs: 2, md: 3 },
                                        background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#22c55e', 0.3)}`,
                                        transition: 'all 0.4s ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    <UptimeIcon sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, color: '#22c55e' }} /> </Box>
                                <Box sx={{ textAlign: 'right', flex: 1, minWidth: 0, ml: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, letterSpacing: '0.8px', mb: { xs: 0.25, md: 0.5 } }}>
                                        System Uptime
                                    </Typography>
                                    <Typography variant="h3" fontWeight={900} sx={{ color: '#22c55e', lineHeight: 1.2, fontSize: { xs: '1.2rem', md: '1.75rem' } }}>
                                        {formatUptime(vm.uptime_seconds, vm.power_state)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.75, md: 1 } }}>
                                    <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                        Power State
                                    </Typography>
                                    <Chip
                                        label={vm.power_state === 'on' ? 'กำลังทำงาน' : 'หยุดทำงาน'}
                                        size="small"
                                        icon={vm.power_state === 'on' ? <RunningIcon sx={{ fontSize: 16 }} /> : <StoppedIcon sx={{ fontSize: 16 }} />}
                                        sx={{
                                            height: { xs: 20, md: 24 },
                                            fontSize: { xs: '0.6rem', md: '0.7rem' },
                                            fontWeight: 700,
                                            bgcolor: vm.power_state === 'on' ? alpha('#22c55e', 0.15) : alpha('#6b7280', 0.15),
                                            color: vm.power_state === 'on' ? '#22c55e' : '#6b7280',
                                            border: `1px solid ${vm.power_state === 'on' ? alpha('#22c55e', 0.3) : alpha('#6b7280', 0.3)}`,
                                            '& .MuiChip-icon': {
                                                color: vm.power_state === 'on' ? '#22c55e' : '#6b7280',
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                <Box component="span" sx={{
                                    width: { xs: 5, md: 6 },
                                    height: { xs: 5, md: 6 },
                                    borderRadius: '50%',
                                    bgcolor: vm.power_state === 'on' ? '#22c55e' : '#6b7280',
                                    animation: vm.power_state === 'on' ? 'pulse 2s infinite' : 'none',
                                }} />
                                สถานะ: {vm.power_state === 'on' ? 'ทำงานปกติ' : 'ออฟไลน์'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Sticky Tabs Card with Time Range Selector */}
            <Card
                sx={{
                    position: 'sticky',
                    top: { xs: 56, sm: 64 },
                    zIndex: 100,
                    borderRadius: { xs: 3, md: 4 },
                    mb: { xs: 1.5, sm: 2, md: 3 },
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.5)'
                        : '0 8px 32px rgba(14, 165, 233, 0.15)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: theme.palette.mode === 'dark'
                            ? '0 12px 40px rgba(0, 0, 0, 0.6)'
                            : '0 12px 40px rgba(14, 165, 233, 0.2)'
                    }
                }}
            >
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column-reverse', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    p: { xs: 0.5, sm: 0.75, md: 1 }
                }}>
                    {/* Tabs Navigation */}
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                            flex: 1,
                            minHeight: { xs: 40, sm: 48, md: 64 },
                            '& .MuiTabs-flexContainer': {
                                gap: { xs: 0.25, sm: 0.5, md: 1 },
                            },
                            '& .MuiTabs-indicator': {
                                height: { xs: 3, md: 4 },
                                borderRadius: '4px 4px 0 0',
                                background: theme.palette.mode === 'dark'
                                    ? 'linear-gradient(90deg, #0ea5e9 0%, #22c55e 100%)'
                                    : 'linear-gradient(90deg, #0284c7 0%, #16a34a 100%)',
                                boxShadow: '0 -2px 8px rgba(14, 165, 233, 0.4)'
                            },
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: { xs: '0.7rem', sm: '0.8125rem', md: '0.9375rem' },
                                minHeight: { xs: 40, sm: 48, md: 64 },
                                px: { xs: 1, sm: 1.5, md: 3 },
                                py: { xs: 0.75, sm: 1, md: 1.5 },
                                minWidth: { xs: 'auto', sm: 'auto' },
                                color: theme.palette.text.secondary,
                                borderRadius: { xs: 1.5, md: 2 },
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    color: theme.palette.primary.main,
                                    background: theme.palette.mode === 'dark'
                                        ? 'rgba(14, 165, 233, 0.08)'
                                        : 'rgba(14, 165, 233, 0.05)',
                                    '& .MuiSvgIcon-root': {
                                        transform: 'scale(1.1)',
                                        color: theme.palette.primary.main
                                    }
                                },
                                '&.Mui-selected': {
                                    color: theme.palette.mode === 'dark' ? '#0ea5e9' : '#0284c7',
                                    fontWeight: 800,
                                    background: theme.palette.mode === 'dark'
                                        ? 'rgba(14, 165, 233, 0.12)'
                                        : 'rgba(14, 165, 233, 0.08)',
                                    '& .MuiSvgIcon-root': {
                                        color: theme.palette.mode === 'dark' ? '#0ea5e9' : '#0284c7',
                                        transform: 'scale(1.15)'
                                    }
                                },
                                '& .MuiSvgIcon-root': {
                                    fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.375rem' },
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
                        <Tab
                            icon={<DashboardIcon />}
                            iconPosition="start"
                            label="ข้อมูลทั่วไป"
                        />
                        <Tab
                            icon={<PerformanceIcon />}
                            iconPosition="start"
                            label="ประสิทธิภาพ"
                        />
                        <Tab
                            icon={<CpuIcon />}
                            iconPosition="start"
                            label="CPU & Memory"
                        />
                        <Tab
                            icon={<StorageIcon />}
                            iconPosition="start"
                            label="ที่เก็บข้อมูล"
                        />
                        <Tab
                            icon={<NetworkIcon />}
                            iconPosition="start"
                            label="เครือข่าย"
                        />
                        <Tab
                            icon={<BackupIcon />}
                            iconPosition="start"
                            label="Backup / DR"
                        />
                        <Tab
                            icon={<AlarmIcon />}
                            iconPosition="start"
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <span>Alarm</span>
                                    {alarms.length > 0 && (
                                        <Chip
                                            label={alarms.length}
                                            size="small"
                                            sx={{
                                                height: 24,
                                                minWidth: 24,
                                                fontSize: '0.75rem',
                                                fontWeight: 900,
                                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                color: '#fff',
                                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
                                                border: '2px solid rgba(239, 68, 68, 0.3)',
                                                animation: alarms.length > 0 ? 'alarmPulse 2s infinite' : 'none',
                                                '@keyframes alarmPulse': {
                                                    '0%, 100%': {
                                                        opacity: 1,
                                                        transform: 'scale(1)',
                                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)'
                                                    },
                                                    '50%': {
                                                        opacity: 0.85,
                                                        transform: 'scale(1.1)',
                                                        boxShadow: '0 6px 16px rgba(239, 68, 68, 0.7)'
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                </Box>
                            }
                        />
                        <Tab
                            icon={<AssessmentIcon />}
                            iconPosition="start"
                            label="รายงาน"
                        />
                        <Tab
                            icon={<RawDataIcon />}
                            iconPosition="start"
                            label="Raw Data"
                        />
                    </Tabs>

                    {/* Time Range Selector */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            px: { xs: 2, md: 3 },
                            py: { xs: 1.5, md: 0 },
                            borderBottom: { xs: '1px solid', md: 'none' },
                            borderColor: 'divider'
                        }}
                    >
                        <FormControl
                            size="small"
                            sx={{
                                minWidth: { xs: '100%', sm: 180, md: 200 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                    height: { xs: 32, sm: 36, md: 40 },
                                    background: theme.palette.mode === 'dark'
                                        ? 'rgba(14, 23, 38, 0.85)'
                                        : 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid',
                                    borderColor: theme.palette.mode === 'dark'
                                        ? 'rgba(14, 165, 233, 0.3)'
                                        : 'rgba(14, 165, 233, 0.2)',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                        borderColor: theme.palette.mode === 'dark'
                                            ? 'rgba(14, 165, 233, 0.5)'
                                            : 'rgba(14, 165, 233, 0.4)'
                                    },
                                    '&.Mui-focused': {
                                        borderColor: 'primary.main',
                                        boxShadow: '0 0 0 4px rgba(14, 165, 233, 0.1)'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    transform: 'translate(14px, 10px) scale(1)',
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -9px) scale(0.75)',
                                        color: 'primary.main',
                                        fontWeight: 800
                                    }
                                }
                            }}
                        >
                            <InputLabel id="time-range-label">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <CalendarIcon sx={{ fontSize: { xs: 14, sm: 16, md: 18 } }} />
                                    <Typography variant="body2" fontWeight={700}>
                                        ช่วงเวลา
                                    </Typography>
                                </Box>
                            </InputLabel>
                            <Select
                                labelId="time-range-label"
                                value={timeRange}
                                label="ช่วงเวลา"
                                onChange={(e: any) => {
                                    const value = e.target.value;
                                    if (value === 'custom') {
                                        setCustomDateOpen(true);
                                    } else {
                                        setTimeRange(value);
                                        setActualTimeRange(value);
                                    }
                                }}
                                startAdornment={metricsLoading && (
                                    <CircularProgress
                                        size={16}
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
                                        py: 1
                                    },
                                    '& .MuiSelect-icon': {
                                        color: 'primary.main'
                                    }
                                }}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                            mt: 1,
                                            background: theme.palette.mode === 'dark'
                                                ? 'rgba(14, 23, 38, 0.95)'
                                                : 'rgba(255, 255, 255, 0.98)',
                                            border: '1px solid',
                                            borderColor: theme.palette.mode === 'dark'
                                                ? 'rgba(14, 165, 233, 0.2)'
                                                : 'rgba(14, 165, 233, 0.15)',
                                            boxShadow: theme.palette.mode === 'dark'
                                                ? '0 12px 48px rgba(0, 0, 0, 0.5)'
                                                : '0 12px 48px rgba(14, 165, 233, 0.2)',
                                            '& .MuiMenuItem-root': {
                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                mx: 1,
                                                my: 0.5,
                                                px: 2,
                                                py: 1.5,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    background: theme.palette.mode === 'dark'
                                                        ? 'rgba(14, 165, 233, 0.15)'
                                                        : 'rgba(14, 165, 233, 0.08)',
                                                    transform: 'translateX(6px)'
                                                },
                                                '&.Mui-selected': {
                                                    background: theme.palette.mode === 'dark'
                                                        ? 'rgba(14, 165, 233, 0.25)'
                                                        : 'rgba(14, 165, 233, 0.15)',
                                                    fontWeight: 800,
                                                    borderLeft: '3px solid',
                                                    borderColor: 'primary.main',
                                                    '&:hover': {
                                                        background: theme.palette.mode === 'dark'
                                                            ? 'rgba(14, 165, 233, 0.3)'
                                                            : 'rgba(14, 165, 233, 0.2)'
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
                                                    {opt.value === 'custom' && customStartDate
                                                        ? `${customStartDate.split('T')[0]} ถึง ${customEndDate.split('T')[0]}`
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
                </Box>

                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                    {/* Tab 0: ข้อมูลทั่วไป */}
                    {activeTab === 0 && (
                        <Tab0General vm={vm} vmUuid={vmUuid!} theme={theme} realtimeLoading={realtimeLoading} realtime={realtime} currentCpu={currentCpu} currentMemory={currentMemory} currentStorage={currentStorage} />
                    )}

                    {/* Tab 1: ประสิทธิภาพ */}
                    {activeTab === 1 && (
                        <Tab1Performance vm={vm} vmUuid={vmUuid!} theme={theme} metricsLoading={metricsLoading} chartData={chartData} currentCpu={currentCpu} currentMemory={currentMemory} currentStorage={currentStorage} realtime={realtime} storageGrowth={storageGrowth} />
                    )}

                    {/* Tab 2: CPU & Memory */}
                    {activeTab === 2 && (
                        <Tab2CpuMemory vm={vm} vmUuid={vmUuid!} theme={theme} vmLoading={vmLoading} currentCpu={currentCpu} currentMemory={currentMemory} realtime={realtime} />
                    )}

                    {/* Tab 3: ที่เก็บข้อมูล */}
                    {activeTab === 3 && (
                        <Tab3Storage vm={vm} vmUuid={vmUuid!} theme={theme} disksLoading={disksLoading} metricsLoading={metricsLoading} disks={disks} chartData={chartData} currentStorage={currentStorage} storageGrowth={storageGrowth} />
                    )}

                    {/* Tab 4: เครือข่าย */}
                    {activeTab === 4 && (
                        <Tab4Network vm={vm} vmUuid={vmUuid!} theme={theme} networksLoading={networksLoading} networks={networks} realtime={realtime} />
                    )}

                    {/* Tab 5: Backup / DR */}
                    {activeTab === 5 && (
                        <Tab5BackupDR vm={vm} vmUuid={vmUuid!} theme={theme} />
                    )}

                    {/* Tab 6: Alarm */}
                    {activeTab === 6 && (
                        <Tab6Alarm vm={vm} vmUuid={vmUuid!} theme={theme} alarmsLoading={alarmsLoading} alarms={alarms} platformAlerts={platformAlerts} />
                    )}
                </CardContent>
            </Card>

            {/* Tab 7: Report (รายงานแบบ Executive) - renders outside Card */}
            {activeTab === 7 && (
                <Tab7Report vm={vm} vmUuid={vmUuid!} theme={theme} metricsLoading={metricsLoading} realtimeLoading={realtimeLoading} disksLoading={disksLoading} networksLoading={networksLoading} alarmsLoading={alarmsLoading} chartData={chartData} realtime={realtime} disks={disks} networks={networks} alarms={alarms} platformAlerts={platformAlerts} currentCpu={currentCpu} currentMemory={currentMemory} currentStorage={currentStorage} storageGrowth={storageGrowth} timeRange={timeRange} actualTimeRange={actualTimeRange} user={user} customStartDate={customStartDate} customEndDate={customEndDate} />
            )}

            {/* Tab 8: Raw Data - renders outside Card */}
            {activeTab === 8 && (
                <Tab8RawData vm={vm} vmUuid={vmUuid!} theme={theme} rawLoading={rawLoading} rawData={rawData} rawError={rawError} />
            )}

            {/* Custom Date Range Dialog */}
            <Dialog open={customDateOpen} onClose={() => setCustomDateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>เลือกช่วงเวลาที่ต้องการ</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="วันเริ่มต้น"
                            type="datetime-local"
                            value={customStartDate}
                            onChange={(e: any) => setCustomStartDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="วันสิ้นสุด"
                            type="datetime-local"
                            value={customEndDate}
                            onChange={(e: any) => setCustomEndDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCustomDateOpen(false)}>ยกเลิก</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (customStartDate && customEndDate) {
                                setTimeRange('custom');
                                setActualTimeRange(`custom_${customStartDate}_${customEndDate}`);
                                setCustomDateOpen(false);
                            }
                        }}
                        disabled={!customStartDate || !customEndDate}
                    >
                        ตกลง
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
