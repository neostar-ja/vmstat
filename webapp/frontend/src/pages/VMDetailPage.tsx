import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    TableCell,
    TableRow,
    TableHead,
    Alert,
    Paper,
    TextField,
    Menu,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    Link as MuiLink,
    Breadcrumbs,
    CircularProgress,
    Fade,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    alpha,
    LinearProgress,
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
    NotificationsActive as NotificationsActiveIcon,
    Security as SecurityIcon,
    Speed as CpuIcon,
    NetworkCheck as NetworkIcon,
    Shield as ShieldIcon,
    AccessTime as UptimeIcon,
    Dns as DnsIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    CalendarToday as CalendarIcon,
    TrendingUp as TrendingUpIcon,
    Home as HomeIcon,
    NavigateNext as NavigateNextIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    RestartAlt as RebootIcon,
    PowerSettingsNew as ShutdownIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { vmsApi, metricsApi, alarmsApi, vmControlApi } from '../services/api';
import type { VMDetail, VMDisk, VMNetwork, VMAlarm } from '../types';
import { SiUbuntu, SiCentos, SiRedhat, SiDebian, SiLinux } from 'react-icons/si';
import WindowIcon from '@mui/icons-material/Window';

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

// Helper: OS Icon จาก os_type และ os_name
const getOSInfo = (osType: string | null | undefined, osName: string | null | undefined) => {
    const type = (osType || '').toLowerCase();
    const name = (osName || '').toLowerCase();
    // Windows: explicit keyword OR Sangfor ws* codes (ws1664=Win2016, ws1264=Win2012, ws1964=Win2019)
    if (type.includes('windows') || name.includes('windows') || /^ws\d/.test(type)) {
        return { icon: null as null, color: '#0078D7', label: 'Windows', emoji: '🪟', isWindows: true };
    } else if (name.includes('ubuntu') || name.includes('linux-ubuntu')) {
        return { icon: 'ubuntu' as const, color: '#E95420', label: 'Ubuntu', emoji: '🐧', isWindows: false };
    } else if (name.includes('centos')) {
        return { icon: 'centos' as const, color: '#932279', label: 'CentOS', emoji: '🐧', isWindows: false };
    } else if (name.includes('red hat') || name.includes('rhel')) {
        return { icon: 'redhat' as const, color: '#EE0000', label: 'Red Hat', emoji: '🎩', isWindows: false };
    } else if (name.includes('debian') || name.includes('linux-debian')) {
        return { icon: 'debian' as const, color: '#A81D33', label: 'Debian', emoji: '🐧', isWindows: false };
    } else if (type.includes('linux') || name.includes('linux') || /^l\d/.test(type)) {
        return { icon: 'linux' as const, color: '#FCC624', label: 'Linux', emoji: '🐧', isWindows: false };
    }
    return { icon: null as null, color: '#6b7280', label: 'Unknown', emoji: '💻', isWindows: false };
};

// OS Icon Renderer component
const OSIcon = ({ osType, osName, size = 24 }: { osType?: string | null; osName?: string | null; size?: number }) => {
    const info = getOSInfo(osType, osName);
    if (info.isWindows) return <WindowIcon sx={{ fontSize: size, color: info.color }} />;
    if (info.icon === 'ubuntu') return <SiUbuntu size={size} color={info.color} />;
    if (info.icon === 'centos') return <SiCentos size={size} color={info.color} />;
    if (info.icon === 'redhat') return <SiRedhat size={size} color={info.color} />;
    if (info.icon === 'debian') return <SiDebian size={size} color={info.color} />;
    if (info.icon === 'linux') return <SiLinux size={size} color={info.color} />;
    return <VmIcon sx={{ fontSize: size, color: info.color }} />;
};

// Helper: แปลงเวลาทำงาน
const formatUptime = (seconds: number | null | undefined, powerState?: string | null) => {
    // ถ้า VM หยุดทำงาน แสดง 'ไม่ทำงาน'
    if (powerState === 'off' || powerState === 'stopped') return 'ไม่ทำงาน';
    // ถ้าไม่มีข้อมูล uptime หรือเป็น 0
    if (seconds === null || seconds === undefined || seconds === 0) return 'ไม่มีข้อมูล';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} วัน ${hours} ชม. ${mins} นาที`;
    if (hours > 0) return `${hours} ชม. ${mins} นาที`;
    return `${mins} นาที`;
};

// Helper: แปลง MB เป็น GB หรือ TB
const formatBytes = (mb: number | null) => {
    if (!mb) return '-';
    // TB (> 1024 GB = 1,048,576 MB)
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(1)} TB`;
    // GB (> 1024 MB)
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    // MB
    return `${mb.toFixed(0)} MB`;
};

// Helper: แปลง MB เป็น GB พร้อมแสดง MB
const formatBytesWithMB = (mb: number | null) => {
    if (!mb) return '-';
    const formatted = mb.toLocaleString('th-TH', { maximumFractionDigits: 2 });
    if (mb >= 1024) {
        return `${formatted} MB (${(mb / 1024).toFixed(1)} GB)`;
    }
    return `${formatted} MB`;
};

// Helper: แปลง MHz เป็น GHz
const formatMhz = (mhz: number | null) => {
    if (!mhz) return '-';
    const formatted = mhz.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    if (mhz >= 1000) return `${formatted} MHz (${(mhz / 1000).toFixed(2)} GHz)`;
    return `${formatted} MHz`;
};

// Helper: แปลง Network speed
const formatNetworkSpeed = (bitps: number | null) => {
    if (!bitps) return '0 bps';
    if (bitps >= 1000000000) return `${(bitps / 1000000000).toFixed(2)} Gbps`;
    if (bitps >= 1000000) return `${(bitps / 1000000).toFixed(2)} Mbps`;
    if (bitps >= 1000) return `${(bitps / 1000).toFixed(2)} Kbps`;
    return `${bitps.toFixed(0)} bps`;
};

// Helper: แปลงเปอร์เซ็นต์ (รองรับทั้ง 0..1 และ 0..100)
const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '0%';
    const v = value <= 1 ? value * 100 : value;
    return `${v.toFixed(2)}%`;
};

// Helper: ปรับค่าเปอร์เซ็นต์ให้เป็น 0..100 (รองรับทั้ง 0..1 และ 0..100)
const normalizePercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 0;
    return value <= 1 ? value * 100 : value;
};

// Helper: แปลงเวลาเป็นรูปแบบไทยแบบเต็ม
const formatThaiDateTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Custom Tooltip สำหรับกราฟที่แสดงวันที่และเวลาแบบเต็ม
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // ดึง timestamp จาก payload
        const timestamp = payload[0]?.payload?.timestamp;
        return (
            <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    {timestamp ? formatThaiDateTime(timestamp) : label}
                </Typography>
                {payload.map((entry: any, index: number) => (
                    <Typography key={index} variant="body2" sx={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                        {entry.unit || ''}
                    </Typography>
                ))}
            </Paper>
        );
    }
    return null;
};

export default function VMDetailPage() {
    const theme = useTheme();
    const { vmUuid } = useParams<{ vmUuid: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
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
        // โหลดเมื่ออยู่ใน Tab 1 (ประสิทธิภาพ) หรือ Tab 3 (ที่เก็บข้อมูล) เพื่อแสดงข้อมูล storage history
        enabled: !!vmUuid && (activeTab === 1 || activeTab === 3) && (actualTimeRange !== 'custom' || (!!customStartDate && !!customEndDate)),
        staleTime: 1 * 60 * 1000, // 1 minute for metrics
        gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
    });

    // ดึงข้อมูล Realtime จาก Sangfor API - โหลดเฉพาะเมื่ออยู่ Tab 0 หรือ Tab 1 เพื่อความเร็ว
    const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
        queryKey: ['vm-realtime', vmUuid],
        queryFn: () => metricsApi.getVMRealtime(vmUuid!),
        enabled: !!vmUuid && (activeTab === 0 || activeTab === 1),
        refetchInterval: activeTab === 0 || activeTab === 1 ? 30000 : false,
    });

    // ดึงข้อมูล Disks
    const { data: disksData, isLoading: disksLoading } = useQuery<{ data: VMDisk[] }>({
        queryKey: ['vm-disks', vmUuid],
        queryFn: () => vmsApi.getDisks(vmUuid!),
        enabled: !!vmUuid && activeTab === 3,
    });

    // ดึงข้อมูล Networks
    const { data: networksData, isLoading: networksLoading } = useQuery<{ data: VMNetwork[] }>({
        queryKey: ['vm-networks', vmUuid],
        queryFn: () => vmsApi.getNetworks(vmUuid!),
        enabled: !!vmUuid && activeTab === 4,
    });

    // ดึงข้อมูล Alarms & Platform Alerts
    const { data: alarmsData, isLoading: alarmsLoading } = useQuery<{
        data: { vm_uuid: string; alarms: VMAlarm[]; alerts: VMAlarm[]; total_alarms: number; total_alerts: number }
    }>({
        queryKey: ['vm-alarms', vmUuid],
        queryFn: () => alarmsApi.getVmAlarms(vmUuid!),
        enabled: !!vmUuid && activeTab === 6,
    });

    // ดึงข้อมูล Raw Data
    const { data: rawData, isLoading: rawLoading, error: rawError } = useQuery({
        queryKey: ['vm-raw', vmUuid],
        queryFn: () => vmsApi.getRaw(vmUuid!),
        enabled: !!vmUuid && activeTab === 7, // Load only when tab is active
    });

    const vm = vmData?.data;
    const metricsResponse = metricsData?.data;
    const realtime = realtimeData?.data;
    const disks = disksData?.data || [];
    const networks = networksData?.data || [];
    const alarms = alarmsData?.data?.alarms || [];
    const platformAlerts = alarmsData?.data?.alerts || [];

    // เตรียมข้อมูลกราฟ - คำนวณเมื่ออยู่ Tab 1 (ประสิทธิภาพ) หรือ Tab 3 (ที่เก็บข้อมูล)
    const chartData = React.useMemo(() => {
        if ((activeTab !== 1 && activeTab !== 3) || !metricsResponse?.series) return [];

        const cpuData = metricsResponse.series.cpu?.data || [];
        const memoryData = metricsResponse.series.memory?.data || [];
        const networkReadData = metricsResponse.series.network_read?.data || [];
        const networkWriteData = metricsResponse.series.network_write?.data || [];
        const diskReadData = metricsResponse.series.disk_read_iops?.data || [];
        const diskWriteData = metricsResponse.series.disk_write_iops?.data || [];
        // storage is percent from API, but we also get storage_used_mb from VM detail
        const storagePercentData = metricsResponse.series.storage?.data || [];

        const timestampMap = new Map();

        cpuData.forEach((item: any) => {
            const time = new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            if (!timestampMap.has(item.timestamp)) {
                timestampMap.set(item.timestamp, {
                    time,
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

    // คำนวณการเติบโตของ Storage - คำนวณเมื่ออยู่ Tab 1 หรือ Tab 3
    const storageGrowth = React.useMemo(() => {
        if ((activeTab !== 1 && activeTab !== 3) || chartData.length < 2) return { rate: 0, trend: 'stable', perDay: 0 };

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
                                onChange={(e) => {
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
                    {/* Tab 1: ประสิทธิภาพ - Ultra Modern Professional Performance Dashboard */}
                    {activeTab === 1 && (
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
                    )}

                    {/* Tab 0: ข้อมูลทั่วไป - Ultra Modern Professional UI Design */}
                    {activeTab === 0 && (
                        <Box>
                            {realtimeLoading && (
                                <Fade in={true}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            py: 8,
                                            gap: 3,
                                            position: 'relative',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                width: 200,
                                                height: 200,
                                                borderRadius: '50%',
                                                background: 'conic-gradient(from 0deg, transparent, rgba(14, 165, 233, 0.3), transparent)',
                                                animation: 'rotate 2s linear infinite',
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
                                                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
                                                borderRadius: '50%',
                                                p: 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <CircularProgress
                                                size={80}
                                                thickness={2}
                                                sx={{
                                                    color: '#0ea5e9',
                                                    '& .MuiCircularProgress-circle': {
                                                        strokeLinecap: 'round',
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Typography
                                            variant="h5"
                                            fontWeight={800}
                                            sx={{
                                                background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)',
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                textAlign: 'center',
                                                position: 'relative',
                                                zIndex: 1,
                                            }}
                                        >
                                            🚀 กำลังโหลดข้อมูล Realtime...
                                        </Typography>
                                    </Box>
                                </Fade>
                            )}

                            {!realtimeLoading && (
                                <Grid container spacing={{ xs: 1.5, sm: 2, md: 4 }}>
                                    {/* Hero Status Card - Full Width */}
                                    <Grid item xs={12}>
                                        <Card
                                            sx={{
                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                overflow: 'hidden',
                                                background: vm.power_state === 'on'
                                                    ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
                                                    : 'linear-gradient(145deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
                                                border: '1px solid',
                                                borderColor: vm.power_state === 'on'
                                                    ? alpha('#22c55e', 0.2)
                                                    : alpha('#ef4444', 0.2),
                                                position: 'relative',
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: 6,
                                                    background: vm.power_state === 'on'
                                                        ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                                                        : 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                                                    animation: vm.power_state === 'on' ? 'pulse-green 2s infinite' : 'pulse-red 2s infinite',
                                                    '@keyframes pulse-green': {
                                                        '0%, 100%': { opacity: 1, transform: 'scaleY(1)' },
                                                        '50%': { opacity: 0.7, transform: 'scaleY(0.8)' }
                                                    },
                                                    '@keyframes pulse-red': {
                                                        '0%, 100%': { opacity: 1, transform: 'scaleY(1)' },
                                                        '50%': { opacity: 0.7, transform: 'scaleY(0.8)' }
                                                    }
                                                },
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: vm.power_state === 'on'
                                                        ? '0 20px 40px rgba(34, 197, 94, 0.15)'
                                                        : '0 20px 40px rgba(239, 68, 68, 0.15)',
                                                },
                                            }}
                                        >
                                            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 2, md: 3 } }}>
                                                    {/* Status Icon & Info */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
                                                        <Box
                                                            sx={{
                                                                width: { xs: 56, sm: 80 },
                                                                height: { xs: 56, sm: 80 },
                                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                                background: vm.power_state === 'on'
                                                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: vm.power_state === 'on'
                                                                    ? '0 8px 32px rgba(34, 197, 94, 0.4)'
                                                                    : '0 8px 32px rgba(239, 68, 68, 0.4)',
                                                                position: 'relative',
                                                                '&::after': vm.power_state === 'on' ? {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    width: 12,
                                                                    height: 12,
                                                                    borderRadius: '50%',
                                                                    bgcolor: '#dcfce7',
                                                                    top: 8,
                                                                    right: 8,
                                                                    border: '3px solid #22c55e',
                                                                    animation: 'pulse-dot 1.5s infinite',
                                                                    '@keyframes pulse-dot': {
                                                                        '0%': { transform: 'scale(1)', opacity: 1 },
                                                                        '100%': { transform: 'scale(1.4)', opacity: 0 }
                                                                    }
                                                                } : {}
                                                            }}
                                                        >
                                                            {vm.power_state === 'on' ? (
                                                                <RunningIcon sx={{ fontSize: { xs: 28, sm: 34, md: 40 }, color: '#fff' }} />
                                                            ) : (
                                                                <StoppedIcon sx={{ fontSize: { xs: 28, sm: 34, md: 40 }, color: '#fff' }} />
                                                            )}
                                                        </Box>

                                                        <Box>
                                                            <Typography variant="h4" fontWeight={900} sx={{ mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' } }}>
                                                                สถานะระบบ
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: 2, flexWrap: 'wrap' }}>
                                                                <Chip
                                                                    icon={vm.power_state === 'on' ? <RunningIcon /> : <StoppedIcon />}
                                                                    label={vm.power_state === 'on' ? '🚀 กำลังทำงาน' : '⛔ หยุดการทำงาน'}
                                                                    size="medium"
                                                                    sx={{
                                                                        height: { xs: 28, sm: 36, md: 40 },
                                                                        fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                                                                        fontWeight: 800,
                                                                        background: vm.power_state === 'on'
                                                                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                        color: '#fff',
                                                                        px: { xs: 1.5, sm: 2, md: 3 },
                                                                        boxShadow: vm.power_state === 'on'
                                                                            ? '0 4px 16px rgba(34, 197, 94, 0.3)'
                                                                            : '0 4px 16px rgba(239, 68, 68, 0.3)',
                                                                        '& .MuiChip-icon': { color: '#fff', fontSize: { xs: 18, sm: 20, md: 24 } }
                                                                    }}
                                                                />
                                                                <Chip
                                                                    label={vm.status || 'Unknown'}
                                                                    variant="outlined"
                                                                    size="medium"
                                                                    sx={{
                                                                        fontWeight: 700,
                                                                        borderWidth: 2,
                                                                        textTransform: 'capitalize'
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' } }}>
                                                                {vm.power_state === 'on'
                                                                    ? `⏰ ทำงานมาแล้ว: ${formatUptime(realtime?.uptime || vm.uptime_seconds, vm.power_state)}`
                                                                    : '💤 ระบบไม่ทำงาน'
                                                                }
                                                            </Typography>
                                                        </Box>
                                                    </Box>


                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    {/* System Information Grid */}
                                    <Grid item xs={12} lg={8}>
                                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                            {/* Core System Info */}
                                            <Grid item xs={12}>
                                                <Card
                                                    sx={{
                                                        borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                        background: theme.palette.mode === 'dark'
                                                            ? 'linear-gradient(145deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.02) 100%)'
                                                            : 'linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.01) 100%)',
                                                        border: '1px solid',
                                                        borderColor: alpha('#0ea5e9', 0.2),
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            borderColor: alpha('#0ea5e9', 0.4),
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 12px 24px rgba(14, 165, 233, 0.15)'
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                                            px: 3,
                                                            py: 2.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: { xs: 1, sm: 1.5, md: 2 }
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: 'rgba(255, 255, 255, 0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backdropFilter: 'blur(10px)'
                                                            }}
                                                        >
                                                            <InfoIcon sx={{ color: '#fff', fontSize: { xs: 22, sm: 26, md: 32 } }} />
                                                        </Box>
                                                        <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', flex: 1, fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' } }}>
                                                            ℹ️ ข้อมูลระบบหลัก
                                                        </Typography>
                                                    </Box>
                                                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                                            <Grid item xs={12} sm={6}>
                                                                <Box sx={{ mb: { xs: 2, md: 3 } }}>
                                                                    <Typography
                                                                        variant="caption"
                                                                        fontWeight={700}
                                                                        color="text.secondary"
                                                                        sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}
                                                                    >
                                                                        🔑 VM IDENTIFIER
                                                                    </Typography>
                                                                    <Box
                                                                        sx={{
                                                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.05)',
                                                                            px: 2,
                                                                            py: 1.5,
                                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                            border: '1px solid',
                                                                            borderColor: alpha('#0ea5e9', 0.2),
                                                                            position: 'relative',
                                                                            overflow: 'hidden'
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            variant="body2"
                                                                            fontFamily="JetBrains Mono, monospace"
                                                                            fontSize={{ xs: '0.65rem', sm: '0.7rem', md: '0.8rem' }}
                                                                            sx={{
                                                                                wordBreak: 'break-all',
                                                                                fontWeight: 600,
                                                                                color: '#0ea5e9'
                                                                            }}
                                                                        >
                                                                            {vm.vm_uuid}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>

                                                                <Box sx={{ mb: { xs: 2, md: 3 } }}>
                                                                    <Typography
                                                                        variant="caption"
                                                                        fontWeight={700}
                                                                        color="text.secondary"
                                                                        sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}
                                                                    >
                                                                        🏷️ VM NUMBER
                                                                    </Typography>
                                                                    <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2.125rem' }, wordBreak: 'break-all' }}>
                                                                        #{vm.vm_id || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                            </Grid>

                                                            <Grid item xs={12} sm={6}>
                                                                <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 } }}>
                                                                    <Typography
                                                                        variant="caption"
                                                                        fontWeight={700}
                                                                        color="text.secondary"
                                                                        sx={{ mb: { xs: 0.75, sm: 1, md: 1.5 }, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
                                                                    >
                                                                        🖥️ ระบบปฏิบัติการ
                                                                    </Typography>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                        <Box
                                                                            sx={{
                                                                                width: 44,
                                                                                height: 44,
                                                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                                background: getOSInfo(vm.os_type, vm.os_name).isWindows
                                                                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                                                    : getOSInfo(vm.os_type, vm.os_name).icon
                                                                                        ? `linear-gradient(135deg, ${getOSInfo(vm.os_type, vm.os_name).color}40 0%, ${getOSInfo(vm.os_type, vm.os_name).color}20 100%)`
                                                                                        : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                color: getOSInfo(vm.os_type, vm.os_name).isWindows ? '#fff' : getOSInfo(vm.os_type, vm.os_name).color,
                                                                            }}
                                                                        >
                                                                            <OSIcon osType={vm.os_type} osName={vm.os_name} size={24} />
                                                                        </Box>
                                                                        <Box>
                                                                            <Typography variant="body1" fontWeight={700}>
                                                                                {vm.os_display_name || vm.os_name || vm.os_type || 'ไม่ระบุ'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {vm.os_distribution && `${vm.os_distribution} • `}
                                                                                {vm.os_kernel || 'Unknown OS'}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </Box>

                                                                <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 } }}>
                                                                    <Typography
                                                                        variant="caption"
                                                                        fontWeight={700}
                                                                        color="text.secondary"
                                                                        sx={{ mb: { xs: 0.75, sm: 1, md: 1.5 }, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
                                                                    >
                                                                        ⚙️ สถาปัตยกรรม
                                                                    </Typography>
                                                                    <Chip
                                                                        label={vm.os_arch || 'Unknown'}
                                                                        size="medium"
                                                                        sx={{
                                                                            height: 36,
                                                                            fontWeight: 800,
                                                                            fontSize: '0.9rem',
                                                                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                                                                            color: '#8b5cf6',
                                                                            border: '2px solid rgba(139, 92, 246, 0.3)',
                                                                            px: 2
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            {/* Network & Security Info */}
                                            <Grid item xs={12}>
                                                <Card
                                                    sx={{
                                                        borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                        background: theme.palette.mode === 'dark'
                                                            ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
                                                            : 'linear-gradient(145deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.01) 100%)',
                                                        border: '1px solid',
                                                        borderColor: alpha('#22c55e', 0.2),
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            borderColor: alpha('#22c55e', 0.4),
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 12px 24px rgba(34, 197, 94, 0.15)'
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                            px: 3,
                                                            py: 2.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: { xs: 1, sm: 1.5, md: 2 }
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: 'rgba(255, 255, 255, 0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backdropFilter: 'blur(10px)'
                                                            }}
                                                        >
                                                            <NetworkIcon sx={{ color: '#fff', fontSize: 32 }} />
                                                        </Box>
                                                        <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                                            🌐 เครือข่ายและความปลอดภัย
                                                        </Typography>
                                                    </Box>
                                                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                                            <Grid item xs={12} sm={6} md={3}>
                                                                <Box sx={{ textAlign: 'center' }}>
                                                                    <Box
                                                                        sx={{
                                                                            width: 64,
                                                                            height: 64,
                                                                            borderRadius: '50%',
                                                                            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            mx: 'auto',
                                                                            mb: 2,
                                                                            boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)'
                                                                        }}
                                                                    >
                                                                        <Typography variant="h6" sx={{ color: '#fff' }}>🌐</Typography>
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                                        IP ADDRESS
                                                                    </Typography>
                                                                    <Typography variant="body1" fontWeight={700} fontFamily="monospace">
                                                                        {vm.ip_address || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                            </Grid>

                                                            <Grid item xs={12} sm={6} md={3}>
                                                                <Box sx={{ textAlign: 'center' }}>
                                                                    <Box
                                                                        sx={{
                                                                            width: 64,
                                                                            height: 64,
                                                                            borderRadius: '50%',
                                                                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            mx: 'auto',
                                                                            mb: 2,
                                                                            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
                                                                        }}
                                                                    >
                                                                        <Typography variant="h6" sx={{ color: '#fff' }}>🔗</Typography>
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                                        MAC ADDRESS
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={600} fontFamily="monospace" fontSize="0.75rem">
                                                                        {vm.mac_address || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                            </Grid>

                                                            <Grid item xs={12} sm={6} md={3}>
                                                                <Box sx={{ textAlign: 'center' }}>
                                                                    <Box
                                                                        sx={{
                                                                            width: 64,
                                                                            height: 64,
                                                                            borderRadius: '50%',
                                                                            background: vm.in_protection
                                                                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            mx: 'auto',
                                                                            mb: 2,
                                                                            boxShadow: vm.in_protection
                                                                                ? '0 8px 24px rgba(34, 197, 94, 0.3)'
                                                                                : '0 8px 24px rgba(239, 68, 68, 0.3)'
                                                                        }}
                                                                    >
                                                                        <ShieldIcon sx={{ color: '#fff', fontSize: 32 }} />
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                                        PROTECTION
                                                                    </Typography>
                                                                    <Chip
                                                                        label={vm.in_protection ? '🛡️ Protected' : '❌ Unprotected'}
                                                                        color={vm.in_protection ? 'success' : 'error'}
                                                                        size="small"
                                                                        sx={{ fontWeight: 700 }}
                                                                    />
                                                                </Box>
                                                            </Grid>

                                                            <Grid item xs={12} sm={6} md={3}>
                                                                <Box sx={{ textAlign: 'center' }}>
                                                                    <Box
                                                                        sx={{
                                                                            width: 64,
                                                                            height: 64,
                                                                            borderRadius: '50%',
                                                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            mx: 'auto',
                                                                            mb: 2,
                                                                            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
                                                                        }}
                                                                    >
                                                                        <Typography variant="h6" sx={{ color: '#fff' }}>⏰</Typography>
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                                                                        EXPIRY
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={600} color={vm.expire_time === 'unlimited' ? 'success.main' : 'warning.main'}>
                                                                        {vm.expire_time === 'unlimited' ? '♾️ Unlimited' : vm.expire_time || 'ไม่ระบุ'}
                                                                    </Typography>
                                                                </Box>
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                    {/* Location & Management Sidebar */}
                                    <Grid item xs={12} lg={4}>
                                        <Card
                                            sx={{
                                                height: '100%',
                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                background: theme.palette.mode === 'dark'
                                                    ? 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)'
                                                    : 'linear-gradient(145deg, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.01) 100%)',
                                                border: '1px solid',
                                                borderColor: alpha('#8b5cf6', 0.2),
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    borderColor: alpha('#8b5cf6', 0.4),
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 12px 24px rgba(139, 92, 246, 0.15)'
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                    px: 3,
                                                    py: 2.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: { xs: 1, sm: 1.5, md: 2 }
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        background: 'rgba(255, 255, 255, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backdropFilter: 'blur(10px)'
                                                    }}
                                                >
                                                    <DnsIcon sx={{ color: '#fff', fontSize: 32 }} />
                                                </Box>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', flex: 1 }}>
                                                    📍 ตำแหน่งและการจัดการ
                                                </Typography>
                                            </Box>
                                            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            🌍 AVAILABILITY ZONE
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                p: 2,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                                                                border: '2px solid rgba(34, 197, 94, 0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: { xs: 1, sm: 1.5, md: 2 }
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 12,
                                                                    height: 12,
                                                                    borderRadius: '50%',
                                                                    bgcolor: '#22c55e',
                                                                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                                                    animation: 'pulse 2s infinite',
                                                                    '@keyframes pulse': {
                                                                        '0%': { opacity: 1 },
                                                                        '50%': { opacity: 0.5 },
                                                                        '100%': { opacity: 1 }
                                                                    }
                                                                }}
                                                            />
                                                            <Typography variant="body1" fontWeight={700} color="#22c55e">
                                                                {vm.az_name || 'Non-specified'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            🖥️ HOST SERVER
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight={800}>
                                                            {vm.host_name || 'N/A'}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            📁 VM GROUP
                                                        </Typography>
                                                        <Typography variant="body1" fontWeight={600}>
                                                            {vm.group_name_path || vm.group_name || 'No group assigned'}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            🏗️ PROJECT
                                                        </Typography>
                                                        <Typography variant="body1" fontWeight={600}>
                                                            {vm.project_name || 'Default project'}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            👤 OWNER
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Box
                                                                sx={{
                                                                    width: { xs: 32, sm: 36, md: 40 },
                                                                    height: { xs: 32, sm: 36, md: 40 },
                                                                    borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#fff',
                                                                    fontSize: '1.2rem',
                                                                    fontWeight: 700,
                                                                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                                                                }}
                                                            >
                                                                👤
                                                            </Box>
                                                            <Typography variant="body1" fontWeight={700}>
                                                                {vm.user_name || 'Unknown User'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            )}
                        </Box>
                    )}

                    {/* Tab 2: CPU & Memory - Ultra Modern Professional Design */}
                    {activeTab === 2 && (
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
                    )}

                    {/* Tab 3: ที่เก็บข้อมูล (Storage) - Ultra Modern Professional Design */}
                    {activeTab === 3 && (
                        <Box>
                            {disksLoading && (
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
                                                background: 'conic-gradient(from 0deg, transparent, rgba(6, 182, 212, 0.4), rgba(14, 165, 233, 0.4), transparent)',
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
                                                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
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
                                                    color: '#06b6d4',
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
                                                    background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #14b8a6 100%)',
                                                    backgroundClip: 'text',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    mb: 1
                                                }}
                                            >
                                                💾 กำลังโหลดข้อมูล Storage...
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                                กำลังดึงข้อมูลที่เก็บข้อมูลและดิสก์
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Fade>
                            )}
                            {!disksLoading && (
                                <>
                                    {/* Hero Overview Cards */}
                                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                                        {/* Storage Usage Gauge Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#06b6d4', 0.12)} 0%, ${alpha('#06b6d4', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#06b6d4', 0.08)} 0%, ${alpha('#06b6d4', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#06b6d4', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #06b6d4 0%, #0ea5e9 50%, #06b6d4 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#06b6d4', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#06b6d4', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, textAlign: 'center' }}>
                                                    <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                                        <Box
                                                            sx={{
                                                                width: { xs: 40, sm: 44, md: 48 },
                                                                height: { xs: 40, sm: 44, md: 48 },
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: `linear-gradient(135deg, ${alpha('#06b6d4', 0.2)} 0%, ${alpha('#06b6d4', 0.1)} 100%)`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#06b6d4', 0.3)}`,
                                                                mb: { xs: 1.5, md: 2 }
                                                            }}
                                                        >
                                                            <StorageIcon sx={{ fontSize: { xs: 22, sm: 25, md: 28 }, color: '#06b6d4' }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                            💾 การใช้พื้นที่
                                                        </Typography>
                                                    </Box>

                                                    {/* Circular Gauge */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', my: { xs: 2, sm: 2.5, md: 3 } }}>
                                                        <Box
                                                            sx={{
                                                                position: 'relative',
                                                                width: { xs: 110, sm: 125, md: 140 },
                                                                height: { xs: 110, sm: 125, md: 140 },
                                                                borderRadius: '50%',
                                                                background: `conic-gradient(
                                                                    ${normalizePercent(vm.storage_usage || 0) > 90 ? '#ef4444' : normalizePercent(vm.storage_usage || 0) > 80 ? '#f97316' : '#06b6d4'} 0deg,
                                                                    ${normalizePercent(vm.storage_usage || 0) > 90 ? '#dc2626' : normalizePercent(vm.storage_usage || 0) > 80 ? '#ea580c' : '#0ea5e9'} ${normalizePercent(vm.storage_usage || 0) * 3.6}deg,
                                                                    ${alpha('#06b6d4', 0.1)} ${normalizePercent(vm.storage_usage || 0) * 3.6}deg
                                                                )`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: `0 8px 32px ${alpha('#06b6d4', 0.3)}`,
                                                                '&::before': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    width: '88%',
                                                                    height: '88%',
                                                                    borderRadius: '50%',
                                                                    background: theme.palette.background.paper,
                                                                }
                                                            }}
                                                        >
                                                            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                                                                <Typography variant="h3" fontWeight={900} color="#06b6d4" sx={{ lineHeight: 1, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}>
                                                                    {normalizePercent(vm.storage_usage || 0).toFixed(1)}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                                    % ใช้งาน
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>

                                                    <Box sx={{ mt: { xs: 1.5, md: 2 } }}>
                                                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                            {formatBytes(vm.storage_used_mb)} / {formatBytes(vm.storage_total_mb)}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Growth Rate Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: storageGrowth.trend === 'increasing'
                                                        ? theme.palette.mode === 'dark'
                                                            ? `linear-gradient(145deg, ${alpha('#f97316', 0.12)} 0%, ${alpha('#f97316', 0.04)} 100%)`
                                                            : `linear-gradient(145deg, ${alpha('#f97316', 0.08)} 0%, ${alpha('#f97316', 0.02)} 100%)`
                                                        : theme.palette.mode === 'dark'
                                                            ? `linear-gradient(145deg, ${alpha('#22c55e', 0.12)} 0%, ${alpha('#22c55e', 0.04)} 100%)`
                                                            : `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: storageGrowth.trend === 'increasing' ? alpha('#f97316', 0.2) : alpha('#22c55e', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: storageGrowth.trend === 'increasing'
                                                            ? 'linear-gradient(90deg, #f97316 0%, #ea580c 50%, #f97316 100%)'
                                                            : 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: storageGrowth.trend === 'increasing' ? alpha('#f97316', 0.5) : alpha('#22c55e', 0.5),
                                                        boxShadow: storageGrowth.trend === 'increasing'
                                                            ? `0 20px 48px -12px ${alpha('#f97316', 0.5)}`
                                                            : `0 20px 48px -12px ${alpha('#22c55e', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: storageGrowth.trend === 'increasing'
                                                                    ? `linear-gradient(135deg, ${alpha('#f97316', 0.2)} 0%, ${alpha('#f97316', 0.1)} 100%)`
                                                                    : `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${storageGrowth.trend === 'increasing' ? alpha('#f97316', 0.3) : alpha('#22c55e', 0.3)}`,
                                                                mb: { xs: 1, sm: 1.5, md: 2 }
                                                            }}
                                                        >
                                                            <TrendingUpIcon sx={{ fontSize: 28, color: storageGrowth.trend === 'increasing' ? '#f97316' : '#22c55e' }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            📈 อัตราการเติบโต
                                                        </Typography>
                                                    </Box>

                                                    <Typography
                                                        variant="h3"
                                                        fontWeight={900}
                                                        color={storageGrowth.trend === 'increasing' ? '#f97316' : '#22c55e'}
                                                        sx={{ my: 3, lineHeight: 1 }}
                                                    >
                                                        {storageGrowth.perDay > 0 ? '+' : ''}{(storageGrowth.perDay / 1024).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
                                                        GB / วัน
                                                    </Typography>

                                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                                                        รวม: {storageGrowth.rate > 0 ? '+' : ''}{formatBytes(storageGrowth.rate)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        ในช่วงเวลาที่เลือก
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Runway Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#8b5cf6', 0.12)} 0%, ${alpha('#8b5cf6', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#8b5cf6', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #8b5cf6 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#8b5cf6', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#8b5cf6', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#8b5cf6', 0.3)}`,
                                                                mb: { xs: 1, sm: 1.5, md: 2 }
                                                            }}
                                                        >
                                                            <UptimeIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            ⏰ Runway
                                                        </Typography>
                                                    </Box>

                                                    {(() => {
                                                        const freeMB = (vm.storage_total_mb || 0) - (vm.storage_used_mb || 0);
                                                        const daysToFull = storageGrowth.perDay > 0 ? freeMB / storageGrowth.perDay : null;
                                                        const fullDate = daysToFull && daysToFull > 0 ? new Date(Date.now() + daysToFull * 86400000) : null;

                                                        if (!daysToFull || daysToFull <= 0 || storageGrowth.perDay <= 0) {
                                                            return (
                                                                <>
                                                                    <Typography variant="h2" fontWeight={900} color="#22c55e" sx={{ my: 3, lineHeight: 1 }}>
                                                                        ♾️
                                                                    </Typography>
                                                                    <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                                                        ไม่จำกัด
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                                        พื้นที่เพียงพอ
                                                                    </Typography>
                                                                </>
                                                            );
                                                        }

                                                        const daysInt = Math.floor(daysToFull);
                                                        const urgencyColor = daysInt < 30 ? '#ef4444' : daysInt < 90 ? '#f97316' : '#22c55e';

                                                        return (
                                                            <>
                                                                <Typography variant="h3" fontWeight={900} color={urgencyColor} sx={{ my: 3, lineHeight: 1 }}>
                                                                    ~{daysInt}
                                                                </Typography>
                                                                <Typography variant="body1" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                                                    วัน
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                                                                    คาดว่าเต็ม:
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                                    {fullDate?.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </Typography>
                                                            </>
                                                        );
                                                    })()}
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Datastore Info Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#14b8a6', 0.12)} 0%, ${alpha('#14b8a6', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#14b8a6', 0.08)} 0%, ${alpha('#14b8a6', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#14b8a6', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #14b8a6 0%, #0d9488 50%, #14b8a6 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#14b8a6', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#14b8a6', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                                        <Box
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: `linear-gradient(135deg, ${alpha('#14b8a6', 0.2)} 0%, ${alpha('#14b8a6', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#14b8a6', 0.3)}`
                                                            }}
                                                        >
                                                            <StorageIcon sx={{ fontSize: 28, color: '#14b8a6' }} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                                                🗄️ Datastore
                                                            </Typography>
                                                            <Typography variant="h6" fontWeight={900} color="#14b8a6" sx={{ lineHeight: 1.2 }}>
                                                                {vm.storage_name || 'N/A'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            bgcolor: alpha('#14b8a6', 0.08),
                                                            border: `1px solid ${alpha('#14b8a6', 0.2)}`,
                                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                                        }}
                                                    >
                                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                                            🆓 พื้นที่ว่าง
                                                        </Typography>
                                                        <Typography variant="h5" fontWeight={800} color="#14b8a6">
                                                            {formatBytes((vm.storage_total_mb || 0) - (vm.storage_used_mb || 0))}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            ({(100 - normalizePercent(vm.storage_usage || 0)).toFixed(1)}% Available)
                                                        </Typography>
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            bgcolor: alpha('#14b8a6', 0.05),
                                                            border: `1px solid ${alpha('#14b8a6', 0.15)}`
                                                        }}
                                                    >
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}>
                                                            ID: {vm.storage_id || '-'}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    {/* Detailed Storage Statistics */}
                                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                                        {/* Storage Overview Details */}
                                        <Grid item xs={12} lg={6}>
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
                                                        background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
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
                                                        💾 ภาพรวม Storage
                                                    </Typography>
                                                </Box>
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {[
                                                            { label: '📦 พื้นที่รวม', value: formatBytes(vm.storage_total_mb), icon: '📦' },
                                                            { label: '💿 ใช้งานแล้ว', value: formatBytes(vm.storage_used_mb), icon: '💿' },
                                                            { label: '🆓 พื้นที่ว่าง', value: formatBytes((vm.storage_total_mb || 0) - (vm.storage_used_mb || 0)), icon: '🆓' },
                                                            { label: '📊 สัดส่วนการใช้', value: formatPercent(vm.storage_usage), icon: '📊' },
                                                        ].map((item, index) => (
                                                            <Box
                                                                key={index}
                                                                sx={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    p: 2,
                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                    bgcolor: alpha('#06b6d4', 0.05),
                                                                    border: `1px solid ${alpha('#06b6d4', 0.1)}`,
                                                                    transition: 'all 0.2s',
                                                                    '&:hover': {
                                                                        bgcolor: alpha('#06b6d4', 0.1),
                                                                        borderColor: alpha('#06b6d4', 0.2),
                                                                        transform: 'translateX(4px)'
                                                                    }
                                                                }}
                                                            >
                                                                <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                                    {item.label}
                                                                </Typography>
                                                                <Typography variant="body1" fontWeight={800} color="#06b6d4">
                                                                    {item.value}
                                                                </Typography>
                                                            </Box>
                                                        ))}

                                                        {/* Progress Bar */}
                                                        <Box sx={{ mt: 1 }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                                    การใช้พื้นที่
                                                                </Typography>
                                                                <Typography variant="caption" color="#06b6d4" fontWeight={800}>
                                                                    {normalizePercent(vm.storage_usage || 0).toFixed(1)}%
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ position: 'relative', height: 16, borderRadius: 3, bgcolor: alpha('#06b6d4', 0.15), overflow: 'hidden' }}>
                                                                <Box
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0,
                                                                        height: '100%',
                                                                        width: `${normalizePercent(vm.storage_usage || 0)}%`,
                                                                        background: 'linear-gradient(90deg, #06b6d4 0%, #0ea5e9 100%)',
                                                                        transition: 'width 1s ease',
                                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Disk Configuration Summary */}
                                        <Grid item xs={12} lg={6}>
                                            <Card
                                                sx={{
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    background: theme.palette.mode === 'dark'
                                                        ? 'linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.01) 100%)'
                                                        : 'linear-gradient(145deg, rgba(14, 165, 233, 0.04) 0%, rgba(14, 165, 233, 0.01) 100%)',
                                                    border: '1px solid',
                                                    borderColor: alpha('#0ea5e9', 0.15),
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        borderColor: alpha('#0ea5e9', 0.3),
                                                        boxShadow: '0 12px 24px rgba(14, 165, 233, 0.15)'
                                                    }
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
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
                                                        🔧 Disk Configuration
                                                    </Typography>
                                                </Box>
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {[
                                                            { label: '💿 จำนวน Disks', value: `${disks.length} Disk${disks.length !== 1 ? 's' : ''}`, icon: '💿' },
                                                            { label: '📦 ขนาดรวม', value: formatBytes(disks.reduce((sum, d) => sum + (d.size_mb || 0), 0)), icon: '📦' },
                                                            { label: '🗄️ Datastore', value: vm.storage_name || 'N/A', icon: '🗄️' },
                                                            { label: '🆔 Storage ID', value: vm.storage_id ? `${vm.storage_id.substring(0, 16)}...` : 'N/A', icon: '🆔' },
                                                        ].map((item, index) => (
                                                            <Box
                                                                key={index}
                                                                sx={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    p: 2,
                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                    bgcolor: alpha('#0ea5e9', 0.05),
                                                                    border: `1px solid ${alpha('#0ea5e9', 0.1)}`,
                                                                    transition: 'all 0.2s',
                                                                    '&:hover': {
                                                                        bgcolor: alpha('#0ea5e9', 0.1),
                                                                        borderColor: alpha('#0ea5e9', 0.2),
                                                                        transform: 'translateX(4px)'
                                                                    }
                                                                }}
                                                            >
                                                                <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                                    {item.label}
                                                                </Typography>
                                                                <Typography
                                                                    variant="body1"
                                                                    fontWeight={800}
                                                                    color="#0ea5e9"
                                                                    sx={{
                                                                        maxWidth: '60%',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {item.value}
                                                                </Typography>
                                                            </Box>
                                                        ))}

                                                        {disks.length > 0 && (
                                                            <Box
                                                                sx={{
                                                                    mt: 1,
                                                                    p: 2,
                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
                                                                    border: `1px solid ${alpha('#0ea5e9', 0.3)}`,
                                                                    textAlign: 'center'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                                                    💾 Average Disk Size
                                                                </Typography>
                                                                <Typography variant="h6" fontWeight={800} color="#0ea5e9">
                                                                    {formatBytes(disks.reduce((sum, d) => sum + (d.size_mb || 0), 0) / disks.length)}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    {/* Storage Usage History  - Enhanced Modern Chart */}
                                    <Card
                                        sx={{
                                            mb: 4,
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            overflow: 'hidden',
                                            background: theme.palette.mode === 'dark'
                                                ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.06) 0%, rgba(6, 182, 212, 0.01) 100%)'
                                                : 'linear-gradient(145deg, rgba(6, 182, 212, 0.04) 0%, rgba(6, 182, 212, 0.01) 100%)',
                                            border: '1px solid',
                                            borderColor: alpha('#06b6d4', 0.15),
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
                                                px: 3,
                                                py: 2.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: { xs: 1, sm: 1.5, md: 2 }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    background: 'rgba(255, 255, 255, 0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backdropFilter: 'blur(10px)'
                                                }}
                                            >
                                                <CalendarIcon sx={{ color: '#fff', fontSize: 26 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                                                    📊 ประวัติการใช้งาน Storage
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                                                    7 วันล่าสุด - รายละเอียดและการเปลี่ยนแปลง
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {metricsLoading ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                                                <CircularProgress size={60} thickness={3} sx={{ color: '#06b6d4' }} />
                                            </Box>
                                        ) : chartData.length === 0 ? (
                                            <Box sx={{ p: 4 }}>
                                                <Alert
                                                    severity="info"
                                                    sx={{
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        '& .MuiAlert-icon': { fontSize: 28 }
                                                    }}
                                                >
                                                    <Typography fontWeight={700}>ไม่มีข้อมูลประวัติการใช้งาน</Typography>
                                                    <Typography variant="body2">กรุณารอให้ระบบเก็บข้อมูลเพิ่มเติม</Typography>
                                                </Alert>
                                            </Box>
                                        ) : (() => {
                                            // จัดกลุ่มข้อมูลตามวัน (เอาวันสุดท้ายของแต่ละวัน)
                                            const dailyData: any[] = [];
                                            const dateMap = new Map<string, any>();

                                            chartData.forEach((item: any) => {
                                                const date = new Date(item.timestamp);
                                                const dateKey = date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });

                                                // เก็บข้อมูลล่าสุดของแต่ละวัน
                                                if (!dateMap.has(dateKey) || new Date(item.timestamp) > new Date(dateMap.get(dateKey).timestamp)) {
                                                    dateMap.set(dateKey, item);
                                                }
                                            });

                                            // เรียงตามวันที่จากเก่าไปใหม่
                                            const sortedDates = Array.from(dateMap.entries())
                                                .sort((a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime())
                                                .slice(-7); // เอาแค่ 7 วันล่าสุด

                                            sortedDates.forEach(([dateKey, item], index) => {
                                                const storageTotalMB = vm?.storage_total_mb || 0;
                                                const storageUsedMB = item.storageUsedMB || 0;
                                                const storageFreeMB = storageTotalMB - storageUsedMB;

                                                // คำนวณการเปลี่ยนแปลงจากวันก่อนหน้า (ใช้หน่วย MB)
                                                let changeFromPrevDay = 0;
                                                let changePercent = 0;
                                                if (index > 0) {
                                                    const prevDayUsed = sortedDates[index - 1][1].storageUsedMB || 0;
                                                    changeFromPrevDay = storageUsedMB - prevDayUsed;
                                                    changePercent = prevDayUsed > 0 ? (changeFromPrevDay / prevDayUsed) * 100 : 0;
                                                }

                                                dailyData.push({
                                                    date: new Date(item.timestamp),
                                                    dateStr: dateKey,
                                                    totalMB: storageTotalMB,
                                                    usedMB: storageUsedMB,
                                                    freeMB: storageFreeMB,
                                                    usedPercent: storageTotalMB > 0 ? (storageUsedMB / storageTotalMB) * 100 : 0,
                                                    changeMB: changeFromPrevDay,
                                                    changePercent: changePercent
                                                });
                                            });

                                            return (
                                                <>
                                                    <Box sx={{ overflow: 'auto' }}>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow
                                                                    sx={{
                                                                        background: theme.palette.mode === 'dark'
                                                                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)'
                                                                            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)'
                                                                    }}
                                                                >
                                                                    <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, py: { xs: 1, sm: 1.5, md: 2 }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📅 วันที่</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>💾 ใช้งานแล้ว</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📦 พื้นที่ว่าง</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📊 สัดส่วน</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#06b6d4', whiteSpace: 'nowrap' }}>📈 เปลี่ยนแปลง</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {dailyData.map((day, index) => {
                                                                    const isToday = new Date().toDateString() === day.date.toDateString();
                                                                    const isIncreasing = day.changeMB > 0;
                                                                    const isDecreasing = day.changeMB < 0;

                                                                    return (
                                                                        <TableRow
                                                                            key={index}
                                                                            hover
                                                                            sx={{
                                                                                bgcolor: isToday ? 'rgba(14, 165, 233, 0.05)' : 'inherit',
                                                                                '&:hover': {
                                                                                    bgcolor: 'action.hover',
                                                                                    transform: 'scale(1.001)',
                                                                                    transition: 'all 0.2s ease'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <TableCell sx={{ py: { xs: 1, sm: 1.5, md: 2 }, px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                    <Typography variant="body2" fontWeight={isToday ? 700 : 500} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
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
                                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                                                                                    {formatBytes(day.usedMB)}
                                                                                </Typography>
                                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                                                                                    ({day.usedMB.toLocaleString('th-TH', { maximumFractionDigits: 0 })} MB)
                                                                                </Typography>
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                                                                                    {formatBytes(day.freeMB)}
                                                                                </Typography>
                                                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                                                                                    ({day.freeMB.toLocaleString('th-TH', { maximumFractionDigits: 0 })} MB)
                                                                                </Typography>
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                                                    <Box
                                                                                        sx={{
                                                                                            width: { xs: 40, sm: 50, md: 60 },
                                                                                            height: 6,
                                                                                            bgcolor: 'action.hover',
                                                                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
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
                                                                                                width: `${day.usedPercent}%`,
                                                                                                bgcolor: day.usedPercent > 90 ? 'error.main' :
                                                                                                    day.usedPercent > 80 ? 'warning.main' :
                                                                                                        'success.main',
                                                                                                borderRadius: 3
                                                                                            }}
                                                                                        />
                                                                                    </Box>
                                                                                    <Typography variant="body2" fontWeight={600}>
                                                                                        {day.usedPercent.toFixed(1)}%
                                                                                    </Typography>
                                                                                </Box>
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ px: { xs: 1, sm: 1.5, md: 2 } }}>
                                                                                {index === 0 ? (
                                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                                                        -
                                                                                    </Typography>
                                                                                ) : (
                                                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                                        {(() => {
                                                                                            const absChange = Math.abs(day.changeMB);
                                                                                            const isGB = absChange >= 1024;
                                                                                            const changeText = isGB
                                                                                                ? `${(absChange / 1024).toFixed(2)} GB`
                                                                                                : `${absChange.toLocaleString('th-TH', { maximumFractionDigits: 0 })} MB`;

                                                                                            return (
                                                                                                <>
                                                                                                    <Chip
                                                                                                        label={
                                                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                                                <Typography variant="caption" fontWeight={700}>
                                                                                                                    {isIncreasing ? '+' : ''}{changeText}
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
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                    </Box>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </Box >
                                                    {
                                                        dailyData.length > 0 && (
                                                            <Box sx={{
                                                                bgcolor: 'action.hover',
                                                                px: 3,
                                                                py: 2,
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap',
                                                                gap: { xs: 1, sm: 1.5, md: 2 }
                                                            }}>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        อัตราการเติบโตเฉลี่ย
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={700} color="warning.main">
                                                                        {storageGrowth.perDay > 0 ? '+' : ''}{(storageGrowth.perDay / 1024).toFixed(2)} GB/วัน
                                                                    </Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        การเปลี่ยนแปลงรวม (7 วัน)
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={700} color={storageGrowth.rate > 0 ? 'error.main' : 'success.main'}>
                                                                        {storageGrowth.rate > 0 ? '+' : ''}{(storageGrowth.rate / 1024).toFixed(2)} GB
                                                                    </Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        ข้อมูลล่าสุด
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight={700}>
                                                                        {dailyData[dailyData.length - 1].date.toLocaleDateString('th-TH', {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        )
                                                    }
                                                </>
                                            );
                                        })()}
                                    </Card>

                                    {/* Individual Disks - Modern Professional Table */}
                                    <Card
                                        sx={{
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            overflow: 'hidden',
                                            background: theme.palette.mode === 'dark'
                                                ? 'linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.01) 100%)'
                                                : 'linear-gradient(145deg, rgba(14, 165, 233, 0.04) 0%, rgba(14, 165, 233, 0.01) 100%)',
                                            border: '1px solid',
                                            borderColor: alpha('#0ea5e9', 0.15),
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                                                px: 3,
                                                py: 2.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                        background: 'rgba(255, 255, 255, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backdropFilter: 'blur(10px)'
                                                    }}
                                                >
                                                    <StorageIcon sx={{ color: '#fff', fontSize: 26 }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                                                        💿 Virtual Disks
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                                                        รายละเอียดการกำหนดค่าดิสก์แต่ละตัว
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip
                                                label={`${disks.length} Disk${disks.length !== 1 ? 's' : ''}`}
                                                sx={{
                                                    height: 36,
                                                    fontSize: '0.95rem',
                                                    fontWeight: 800,
                                                    background: 'rgba(255, 255, 255, 0.25)',
                                                    color: '#fff',
                                                    backdropFilter: 'blur(10px)',
                                                    px: 2
                                                }}
                                            />
                                        </Box>

                                        {disks.length === 0 ? (
                                            <Box sx={{ p: 4 }}>
                                                <Alert
                                                    severity="info"
                                                    sx={{
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        '& .MuiAlert-icon': { fontSize: 28 }
                                                    }}
                                                >
                                                    <Typography fontWeight={700}>ไม่พบข้อมูลการกำหนดค่าดิสก์</Typography>
                                                    <Typography variant="body2">กรุณาเปิดใช้งาน Sync เพื่อดึงข้อมูล</Typography>
                                                </Alert>
                                            </Box>
                                        ) : (
                                            <Box sx={{ overflow: 'auto' }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow
                                                            sx={{
                                                                background: theme.palette.mode === 'dark'
                                                                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)'
                                                                    : 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)'
                                                            }}
                                                        >
                                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, py: { xs: 1, sm: 1.5, md: 2 }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>🏷️ Disk ID</TableCell>
                                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>📁 ไฟล์ดิสก์</TableCell>
                                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>📊 ขนาด</TableCell>
                                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>📦 Preallocate</TableCell>
                                                            <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, color: '#0ea5e9', whiteSpace: 'nowrap' }}>🧹 Eagerly Scrub</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {disks.map((disk) => (
                                                            <TableRow
                                                                key={disk.disk_id}
                                                                hover
                                                                sx={{
                                                                    transition: 'all 0.2s',
                                                                    '&:hover': {
                                                                        bgcolor: alpha('#0ea5e9', 0.08),
                                                                        transform: 'scale(1.001)',
                                                                    }
                                                                }}
                                                            >
                                                                <TableCell sx={{ py: 2 }}>
                                                                    <Box
                                                                        sx={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 1,
                                                                            px: 1.5,
                                                                            py: 0.5,
                                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                            background: alpha('#0ea5e9', 0.1),
                                                                            border: `1px solid ${alpha('#0ea5e9', 0.2)}`
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            sx={{
                                                                                fontFamily: 'monospace',
                                                                                fontWeight: 700,
                                                                                fontSize: '0.8rem',
                                                                                color: '#0ea5e9'
                                                                            }}
                                                                        >
                                                                            {disk.disk_id}
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box
                                                                        sx={{
                                                                            maxWidth: { xs: 120, sm: 200, md: 300 },
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            p: 1,
                                                                            borderRadius: 1,
                                                                            bgcolor: alpha('#0ea5e9', 0.05)
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            variant="body2"
                                                                            fontWeight={600}
                                                                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                                                        >
                                                                            {disk.storage_file || '-'}
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={formatBytes(disk.size_mb)}
                                                                        sx={{
                                                                            height: 28,
                                                                            fontWeight: 800,
                                                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                                                                            color: '#fff',
                                                                            fontSize: '0.8rem'
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={disk.preallocate || 'metadata'}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            background: disk.preallocate === 'metadata'
                                                                                ? alpha('#06b6d4', 0.15)
                                                                                : alpha('#0ea5e9', 0.15),
                                                                            color: disk.preallocate === 'metadata' ? '#06b6d4' : '#0ea5e9',
                                                                            border: `1px solid ${disk.preallocate === 'metadata' ? alpha('#06b6d4', 0.3) : alpha('#0ea5e9', 0.3)}`
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={disk.eagerly_scrub ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            background: disk.eagerly_scrub
                                                                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                                : alpha('#94a3b8', 0.15),
                                                                            color: disk.eagerly_scrub ? '#fff' : '#64748b',
                                                                            border: disk.eagerly_scrub ? 'none' : `1px solid ${alpha('#94a3b8', 0.3)}`
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        )}
                                    </Card>
                                </>
                            )}
                        </Box>
                    )}

                    {/* Tab 4: เครือข่าย - Ultra Modern Professional Network Design */}
                    {activeTab === 4 && (
                        <Box>
                            {networksLoading && (
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
                                                background: 'conic-gradient(from 0deg, transparent, rgba(34, 197, 94, 0.4), rgba(16, 185, 129, 0.4), transparent)',
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
                                                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
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
                                                    color: '#22c55e',
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
                                                    background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #14b8a6 100%)',
                                                    backgroundClip: 'text',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    mb: 1
                                                }}
                                            >
                                                🌐 กำลังโหลดข้อมูลเครือข่าย...
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                                กำลังดึงข้อมูล Network Interfaces
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Fade>
                            )}
                            {!networksLoading && (
                                <>
                                    {/* Network Overview Hero Cards */}
                                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                                        {/* Primary Network Info Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#22c55e', 0.12)} 0%, ${alpha('#22c55e', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#22c55e', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#22c55e', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#22c55e', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 3 } }}>
                                                        <Box
                                                            sx={{
                                                                width: { xs: 40, sm: 44, md: 48 },
                                                                height: { xs: 40, sm: 44, md: 48 },
                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#22c55e', 0.3)}`
                                                            }}
                                                        >
                                                            <NetworkIcon sx={{ fontSize: { xs: 22, sm: 25, md: 28 }, color: '#22c55e' }} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                                🌐 IP Address
                                                            </Typography>
                                                            <Typography variant="h6" fontWeight={900} color="#22c55e" sx={{ lineHeight: 1.2, fontFamily: 'monospace', fontSize: { xs: '0.9rem', sm: '1rem', md: '1.125rem' } }}>
                                                                {vm.ip_address || 'N/A'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            p: { xs: 1.5, md: 2 },
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            bgcolor: alpha('#22c55e', 0.08),
                                                            border: `1px solid ${alpha('#22c55e', 0.2)}`
                                                        }}
                                                    >
                                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                            📱 MAC Address
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={700} color="#22c55e" sx={{ fontFamily: 'monospace', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                                                            {vm.mac_address || 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Network Name Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#10b981', 0.12)} 0%, ${alpha('#10b981', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#10b981', 0.08)} 0%, ${alpha('#10b981', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#10b981', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #10b981 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#10b981', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#10b981', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 56,
                                                            height: 56,
                                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                            background: `linear-gradient(135deg, ${alpha('#10b981', 0.2)} 0%, ${alpha('#10b981', 0.1)} 100%)`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: `2px solid ${alpha('#10b981', 0.3)}`,
                                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                                        }}
                                                    >
                                                        <DnsIcon sx={{ fontSize: 32, color: '#10b981' }} />
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                                        📡 Primary Network
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={900} color="#10b981" sx={{ mb: 2 }}>
                                                        {vm.primary_network_name || 'Default Network'}
                                                    </Typography>
                                                    <Chip
                                                        label={`${networks.length} Interface${networks.length !== 1 ? 's' : ''}`}
                                                        sx={{
                                                            fontWeight: 800,
                                                            background: alpha('#10b981', 0.15),
                                                            color: '#10b981',
                                                            border: `1px solid ${alpha('#10b981', 0.3)}`
                                                        }}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Download Speed Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#14b8a6', 0.12)} 0%, ${alpha('#14b8a6', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#14b8a6', 0.08)} 0%, ${alpha('#14b8a6', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#14b8a6', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #14b8a6 0%, #0d9488 50%, #14b8a6 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#14b8a6', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#14b8a6', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 56,
                                                            height: 56,
                                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                            background: `linear-gradient(135deg, ${alpha('#14b8a6', 0.2)} 0%, ${alpha('#14b8a6', 0.1)} 100%)`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: `2px solid ${alpha('#14b8a6', 0.3)}`,
                                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                                        }}
                                                    >
                                                        <Typography variant="h4" fontWeight={900} color="#14b8a6">
                                                            ↓
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                                        📥 Download
                                                    </Typography>
                                                    <Typography variant="h5" fontWeight={900} color="#14b8a6" sx={{ lineHeight: 1 }}>
                                                        {formatNetworkSpeed(vm.network_read_bitps)}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Upload Speed Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(145deg, ${alpha('#059669', 0.12)} 0%, ${alpha('#059669', 0.04)} 100%)`
                                                        : `linear-gradient(145deg, ${alpha('#059669', 0.08)} 0%, ${alpha('#059669', 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha('#059669', 0.2),
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 6,
                                                        background: 'linear-gradient(90deg, #059669 0%, #047857 50%, #059669 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#059669', 0.5),
                                                        boxShadow: `0 20px 48px -12px ${alpha('#059669', 0.5)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 56,
                                                            height: 56,
                                                            borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                            background: `linear-gradient(135deg, ${alpha('#059669', 0.2)} 0%, ${alpha('#059669', 0.1)} 100%)`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: `2px solid ${alpha('#059669', 0.3)}`,
                                                            mb: { xs: 1, sm: 1.5, md: 2 }
                                                        }}
                                                    >
                                                        <Typography variant="h4" fontWeight={900} color="#059669">
                                                            ↑
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                                        📤 Upload
                                                    </Typography>
                                                    <Typography variant="h5" fontWeight={900} color="#059669" sx={{ lineHeight: 1 }}>
                                                        {formatNetworkSpeed(vm.network_write_bitps)}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    {/* Network Interfaces - Modern Professional Cards */}
                                    <Box sx={{ mb: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                        background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `2px solid ${alpha('#22c55e', 0.3)}`
                                                    }}
                                                >
                                                    <NetworkIcon sx={{ fontSize: 26, color: '#22c55e' }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={900}>
                                                        🌐 Network Interfaces
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        รายละเอียดการ์ดเครือข่ายทั้งหมด
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip
                                                label={`${networks.length} Interface${networks.length !== 1 ? 's' : ''}`}
                                                sx={{
                                                    height: 36,
                                                    fontSize: '0.95rem',
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                                                    color: '#fff',
                                                    px: 2,
                                                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)'
                                                }}
                                            />
                                        </Box>

                                        {networks.length === 0 ? (
                                            <Box sx={{ p: 4 }}>
                                                <Alert
                                                    severity="info"
                                                    sx={{
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        '& .MuiAlert-icon': { fontSize: 28 }
                                                    }}
                                                >
                                                    <Typography fontWeight={700}>ไม่พบข้อมูลการ์ดเครือข่าย</Typography>
                                                    <Typography variant="body2">กรุณาเปิดใช้งาน Sync เพื่อดึงข้อมูล Network Interfaces</Typography>
                                                </Alert>
                                            </Box>
                                        ) : (
                                            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                                {networks.map((net, index) => (
                                                    <Grid item xs={12} key={net.vif_id}>
                                                        <Card
                                                            sx={{
                                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                                position: 'relative',
                                                                overflow: 'hidden',
                                                                background: net.is_connected
                                                                    ? theme.palette.mode === 'dark'
                                                                        ? `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
                                                                        : `linear-gradient(145deg, ${alpha('#22c55e', 0.05)} 0%, ${alpha('#22c55e', 0.01)} 100%)`
                                                                    : theme.palette.mode === 'dark'
                                                                        ? `linear-gradient(145deg, ${alpha('#94a3b8', 0.08)} 0%, ${alpha('#94a3b8', 0.02)} 100%)`
                                                                        : `linear-gradient(145deg, ${alpha('#94a3b8', 0.05)} 0%, ${alpha('#94a3b8', 0.01)} 100%)`,
                                                                border: '2px solid',
                                                                borderColor: net.is_connected ? alpha('#22c55e', 0.3) : alpha('#94a3b8', 0.2),
                                                                transition: 'all 0.3s ease',
                                                                '&::before': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    height: 5,
                                                                    background: net.is_connected
                                                                        ? 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)'
                                                                        : 'linear-gradient(90deg, #94a3b8 0%, #64748b 50%, #94a3b8 100%)',
                                                                    backgroundSize: '200% 100%',
                                                                    animation: net.is_connected ? 'shimmer 3s linear infinite' : 'none',
                                                                },
                                                                '&:hover': {
                                                                    transform: 'translateY(-4px)',
                                                                    borderColor: net.is_connected ? alpha('#22c55e', 0.5) : alpha('#94a3b8', 0.4),
                                                                    boxShadow: net.is_connected
                                                                        ? '0 12px 24px rgba(34, 197, 94, 0.2)'
                                                                        : '0 12px 24px rgba(0, 0, 0, 0.1)',
                                                                }
                                                            }}
                                                        >
                                                            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                                                {/* Header */}
                                                                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 3, pb: 3, gap: { xs: 1.5, sm: 0 }, borderBottom: `2px solid ${alpha(net.is_connected ? '#22c55e' : '#94a3b8', 0.1)}` }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                        <Box
                                                                            sx={{
                                                                                width: 56,
                                                                                height: 56,
                                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                                background: net.is_connected
                                                                                    ? `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`
                                                                                    : `linear-gradient(135deg, ${alpha('#94a3b8', 0.2)} 0%, ${alpha('#94a3b8', 0.1)} 100%)`,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                border: `2px solid ${alpha(net.is_connected ? '#22c55e' : '#94a3b8', 0.3)}`,
                                                                                position: 'relative',
                                                                                '&::after': net.is_connected ? {
                                                                                    content: '""',
                                                                                    position: 'absolute',
                                                                                    width: 12,
                                                                                    height: 12,
                                                                                    borderRadius: '50%',
                                                                                    background: '#22c55e',
                                                                                    top: -2,
                                                                                    right: -2,
                                                                                    border: '2px solid',
                                                                                    borderColor: theme.palette.background.paper,
                                                                                    boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
                                                                                    animation: 'pulse 2s ease-in-out infinite',
                                                                                    '@keyframes pulse': {
                                                                                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                                                        '50%': { opacity: 0.7, transform: 'scale(1.1)' }
                                                                                    }
                                                                                } : {}
                                                                            }}
                                                                        >
                                                                            <NetworkIcon sx={{ fontSize: 32, color: net.is_connected ? '#22c55e' : '#94a3b8' }} />
                                                                        </Box>
                                                                        <Box>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                                <Typography variant="h5" fontWeight={900} color={net.is_connected ? '#22c55e' : '#94a3b8'}>
                                                                                    {net.network_name || 'Unknown Network'}
                                                                                </Typography>
                                                                                {index === 0 && (
                                                                                    <Chip
                                                                                        label="Primary"
                                                                                        size="small"
                                                                                        sx={{
                                                                                            height: 22,
                                                                                            fontSize: '0.7rem',
                                                                                            fontWeight: 800,
                                                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                                            color: '#fff'
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </Box>
                                                                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                                                VIF: {net.vif_id}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                        {net.model && (
                                                                            <Chip
                                                                                label={net.model}
                                                                                sx={{
                                                                                    height: 32,
                                                                                    fontWeight: 700,
                                                                                    background: alpha('#3b82f6', 0.15),
                                                                                    color: '#3b82f6',
                                                                                    border: `1px solid ${alpha('#3b82f6', 0.3)}`
                                                                                }}
                                                                            />
                                                                        )}
                                                                        <Chip
                                                                            label={net.is_connected ? '✓ Connected' : '✗ Disconnected'}
                                                                            sx={{
                                                                                height: 32,
                                                                                fontWeight: 800,
                                                                                background: net.is_connected
                                                                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                                                    : alpha('#94a3b8', 0.15),
                                                                                color: net.is_connected ? '#fff' : '#64748b',
                                                                                border: net.is_connected ? 'none' : `1px solid ${alpha('#94a3b8', 0.3)}`,
                                                                                boxShadow: net.is_connected ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none'
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                </Box>

                                                                {/* Details Grid */}
                                                                <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                                                    {/* IP Addressing */}
                                                                    <Grid item xs={12} md={4}>
                                                                        <Card
                                                                            sx={{
                                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                                background: theme.palette.mode === 'dark'
                                                                                    ? alpha('#22c55e', 0.05)
                                                                                    : alpha('#22c55e', 0.03),
                                                                                border: `1px solid ${alpha('#22c55e', 0.15)}`,
                                                                                transition: 'all 0.2s',
                                                                                '&:hover': {
                                                                                    borderColor: alpha('#22c55e', 0.3),
                                                                                    transform: 'translateX(4px)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                                                    <DnsIcon sx={{ fontSize: 20, color: '#22c55e' }} />
                                                                                    <Typography variant="subtitle2" fontWeight={800} color="#22c55e">
                                                                                        🌐 IP Addressing
                                                                                    </Typography>
                                                                                </Box>
                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            📍 IPv4 Address
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="#22c55e">
                                                                                            {net.ip_address || '-'}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            📍 IPv6 Address
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" color="text.secondary">
                                                                                            {net.ipv6_address || 'Not configured'}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            📱 MAC Address
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                                                                            {net.mac_address || '-'}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                </Box>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </Grid>

                                                                    {/* Subnet & VPC */}
                                                                    <Grid item xs={12} md={4}>
                                                                        <Card
                                                                            sx={{
                                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                                background: theme.palette.mode === 'dark'
                                                                                    ? alpha('#10b981', 0.05)
                                                                                    : alpha('#10b981', 0.03),
                                                                                border: `1px solid ${alpha('#10b981', 0.15)}`,
                                                                                transition: 'all 0.2s',
                                                                                '&:hover': {
                                                                                    borderColor: alpha('#10b981', 0.3),
                                                                                    transform: 'translateX(4px)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                                                    <NetworkIcon sx={{ fontSize: 20, color: '#10b981' }} />
                                                                                    <Typography variant="subtitle2" fontWeight={800} color="#10b981">
                                                                                        🔌 Subnet & VPC
                                                                                    </Typography>
                                                                                </Box>
                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            🌐 Subnet Name
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontWeight={700} color="#10b981">
                                                                                            {net.subnet_name || 'Not assigned'}
                                                                                        </Typography>
                                                                                        {net.cidr && (
                                                                                            <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontWeight={600}>
                                                                                                CIDR: {net.cidr}
                                                                                            </Typography>
                                                                                        )}
                                                                                    </Box>
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            ☁️ VPC Name
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontWeight={700} color="#10b981">
                                                                                            {net.vpc_name || 'Default VPC'}
                                                                                        </Typography>
                                                                                        {net.vpc_id && (
                                                                                            <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontSize="0.7rem" sx={{ wordBreak: 'break-all' }}>
                                                                                                ID: {net.vpc_id}
                                                                                            </Typography>
                                                                                        )}
                                                                                    </Box>
                                                                                </Box>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </Grid>

                                                                    {/* Routing & Device */}
                                                                    <Grid item xs={12} md={4}>
                                                                        <Card
                                                                            sx={{
                                                                                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                                background: theme.palette.mode === 'dark'
                                                                                    ? alpha('#14b8a6', 0.05)
                                                                                    : alpha('#14b8a6', 0.03),
                                                                                border: `1px solid ${alpha('#14b8a6', 0.15)}`,
                                                                                transition: 'all 0.2s',
                                                                                '&:hover': {
                                                                                    borderColor: alpha('#14b8a6', 0.3),
                                                                                    transform: 'translateX(4px)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                                                    <InfoIcon sx={{ fontSize: 20, color: '#14b8a6' }} />
                                                                                    <Typography variant="subtitle2" fontWeight={800} color="#14b8a6">
                                                                                        🛣️ Routing & Device
                                                                                    </Typography>
                                                                                </Box>
                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            🚪 Gateway
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="#14b8a6">
                                                                                            {net.gateway || 'Not set'}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                    {net.custom_gateway && (
                                                                                        <Box>
                                                                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                                🔧 Custom Gateway
                                                                                            </Typography>
                                                                                            <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="#14b8a6">
                                                                                                {net.custom_gateway}
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    )}
                                                                                    <Box>
                                                                                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                            🔌 Device ID
                                                                                        </Typography>
                                                                                        <Typography variant="body2" fontFamily="monospace" fontSize="0.7rem" sx={{ wordBreak: 'break-all' }} color="text.secondary">
                                                                                            {net.device_id || 'No device'}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                </Box>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </Grid>
                                                                </Grid>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        )}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}

                    {/* Tab 5: Backup / DR */}

                    {/* Tab 5: Backup / DR - Modern Professional Design */}
                    {activeTab === 5 && (
                        <Box>
                            {/* Hero Overview Cards */}
                            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                                {/* Protection Status Card */}
                                <Grid item xs={12} md={6} lg={3}>
                                    <Card
                                        sx={{
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: vm.in_protection
                                                ? `linear-gradient(135deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
                                                : `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.02)} 100%)`,
                                            border: '2px solid',
                                            borderColor: vm.in_protection ? alpha('#22c55e', 0.2) : alpha('#f59e0b', 0.2),
                                            transition: 'all 0.3s ease',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: vm.in_protection
                                                    ? 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)'
                                                    : 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f59e0b 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                borderColor: vm.in_protection ? alpha('#22c55e', 0.4) : alpha('#f59e0b', 0.4),
                                                boxShadow: vm.in_protection
                                                    ? `0 12px 28px ${alpha('#22c55e', 0.25)}`
                                                    : `0 12px 28px ${alpha('#f59e0b', 0.25)}`,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                                <Box
                                                    sx={{
                                                        width: { xs: 48, sm: 52, md: 56 },
                                                        height: { xs: 48, sm: 52, md: 56 },
                                                        borderRadius: 2.5,
                                                        background: vm.in_protection
                                                            ? `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`
                                                            : `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid',
                                                        borderColor: vm.in_protection ? alpha('#22c55e', 0.3) : alpha('#f59e0b', 0.3),
                                                    }}
                                                >
                                                    <ShieldIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: vm.in_protection ? '#22c55e' : '#f59e0b' }} />
                                                </Box>
                                                {vm.in_protection && (
                                                    <Box
                                                        sx={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            background: '#22c55e',
                                                            boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
                                                            animation: 'pulse 2s ease-in-out infinite',
                                                            '@keyframes pulse': {
                                                                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                                '50%': { opacity: 0.7, transform: 'scale(1.3)' }
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                🛡️ Protection Status
                                            </Typography>
                                            <Typography variant="h4" fontWeight={900} color={vm.in_protection ? '#22c55e' : '#f59e0b'} sx={{ mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                                                {vm.in_protection ? 'Protected' : 'Unprotected'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                {vm.in_protection ? 'ระบบปกป้องเปิดใช้งาน' : 'ไม่มีการปกป้อง'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Backup Files Count Card */}
                                <Grid item xs={12} md={6} lg={3}>
                                    <Card
                                        sx={{
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.08)} 0%, ${alpha('#3b82f6', 0.02)} 100%)`,
                                            border: '2px solid',
                                            borderColor: alpha('#3b82f6', 0.2),
                                            transition: 'all 0.3s ease',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                borderColor: alpha('#3b82f6', 0.4),
                                                boxShadow: `0 12px 28px ${alpha('#3b82f6', 0.25)}`,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                                <Box
                                                    sx={{
                                                        width: { xs: 48, sm: 52, md: 56 },
                                                        height: { xs: 48, sm: 52, md: 56 },
                                                        borderRadius: 2.5,
                                                        background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)} 0%, ${alpha('#3b82f6', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid',
                                                        borderColor: alpha('#3b82f6', 0.3),
                                                    }}
                                                >
                                                    <StorageIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#3b82f6' }} />
                                                </Box>
                                            </Box>
                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                                📦 Backup Files
                                            </Typography>
                                            <Typography variant="h4" fontWeight={900} color="#3b82f6" sx={{ mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                                                {vm.backup_file_count || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                ไฟล์สำรองทั้งหมด
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Total Backup Size Card */}
                                <Grid item xs={12} md={6} lg={3}>
                                    <Card
                                        sx={{
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`,
                                            border: '2px solid',
                                            borderColor: alpha('#8b5cf6', 0.2),
                                            transition: 'all 0.3s ease',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #8b5cf6 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                borderColor: alpha('#8b5cf6', 0.4),
                                                boxShadow: `0 12px 28px ${alpha('#8b5cf6', 0.25)}`,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: 2.5,
                                                        background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid',
                                                        borderColor: alpha('#8b5cf6', 0.3),
                                                    }}
                                                >
                                                    <SaveIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                                                </Box>
                                            </Box>
                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                💾 Total Backup Size
                                            </Typography>
                                            <Typography variant="h4" fontWeight={900} color="#8b5cf6" sx={{ mb: 0.5 }}>
                                                {vm.storage_file_size_mb
                                                    ? formatBytesWithMB(vm.storage_file_size_mb)
                                                    : vm.backup_file_count && vm.backup_file_count > 0 ? 'ไม่ทราบขนาด' : '-'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                พื้นที่ใช้สำรอง
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Protection Type Card */}
                                <Grid item xs={12} md={6} lg={3}>
                                    <Card
                                        sx={{
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: vm.protection_type === 'backup_disaster'
                                                ? `linear-gradient(135deg, ${alpha('#ef4444', 0.08)} 0%, ${alpha('#ef4444', 0.02)} 100%)`
                                                : vm.protection_type === 'az_backup'
                                                    ? `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.02)} 100%)`
                                                    : `linear-gradient(135deg, ${alpha('#94a3b8', 0.08)} 0%, ${alpha('#94a3b8', 0.02)} 100%)`,
                                            border: '2px solid',
                                            borderColor: vm.protection_type === 'backup_disaster'
                                                ? alpha('#ef4444', 0.2)
                                                : vm.protection_type === 'az_backup'
                                                    ? alpha('#f59e0b', 0.2)
                                                    : alpha('#94a3b8', 0.2),
                                            transition: 'all 0.3s ease',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: vm.protection_type === 'backup_disaster'
                                                    ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)'
                                                    : vm.protection_type === 'az_backup'
                                                        ? 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f59e0b 100%)'
                                                        : 'linear-gradient(90deg, #94a3b8 0%, #64748b 50%, #94a3b8 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                borderColor: vm.protection_type === 'backup_disaster'
                                                    ? alpha('#ef4444', 0.4)
                                                    : vm.protection_type === 'az_backup'
                                                        ? alpha('#f59e0b', 0.4)
                                                        : alpha('#94a3b8', 0.4),
                                                boxShadow: vm.protection_type === 'backup_disaster'
                                                    ? `0 12px 28px ${alpha('#ef4444', 0.25)}`
                                                    : vm.protection_type === 'az_backup'
                                                        ? `0 12px 28px ${alpha('#f59e0b', 0.25)}`
                                                        : `0 12px 28px ${alpha('#000', 0.1)}`,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: 2.5,
                                                        background: vm.protection_type === 'backup_disaster'
                                                            ? `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`
                                                            : vm.protection_type === 'az_backup'
                                                                ? `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`
                                                                : `linear-gradient(135deg, ${alpha('#94a3b8', 0.2)} 0%, ${alpha('#94a3b8', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid',
                                                        borderColor: vm.protection_type === 'backup_disaster'
                                                            ? alpha('#ef4444', 0.3)
                                                            : vm.protection_type === 'az_backup'
                                                                ? alpha('#f59e0b', 0.3)
                                                                : alpha('#94a3b8', 0.3),
                                                    }}
                                                >
                                                    <SecurityIcon sx={{
                                                        fontSize: 32,
                                                        color: vm.protection_type === 'backup_disaster'
                                                            ? '#ef4444'
                                                            : vm.protection_type === 'az_backup'
                                                                ? '#f59e0b'
                                                                : '#94a3b8'
                                                    }} />
                                                </Box>
                                            </Box>
                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                🔐 Protection Type
                                            </Typography>
                                            <Typography variant="h6" fontWeight={900} color={
                                                vm.protection_type === 'backup_disaster'
                                                    ? '#ef4444'
                                                    : vm.protection_type === 'az_backup'
                                                        ? '#f59e0b'
                                                        : '#94a3b8'
                                            } sx={{ mb: 0.5 }}>
                                                {vm.protection_type === 'backup_disaster' ? 'DR System' :
                                                    vm.protection_type === 'az_backup' ? 'AZ Backup' :
                                                        'No Protection'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                {vm.protection_type === 'backup_disaster' ? 'Disaster Recovery' :
                                                    vm.protection_type === 'az_backup' ? 'Zone Backup' :
                                                        'ไม่มีการกำหนด'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Main Content - Protection Details */}
                            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                {/* Protection Policy Card */}
                                <Grid item xs={12} lg={6}>
                                    <Card
                                        sx={{
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: theme.palette.mode === 'dark'
                                                ? `linear-gradient(145deg, ${alpha('#6366f1', 0.08)} 0%, ${alpha('#6366f1', 0.02)} 100%)`
                                                : `linear-gradient(145deg, ${alpha('#6366f1', 0.05)} 0%, ${alpha('#6366f1', 0.01)} 100%)`,
                                            border: '2px solid',
                                            borderColor: alpha('#6366f1', 0.2),
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                borderColor: alpha('#6366f1', 0.4),
                                                boxShadow: `0 12px 24px ${alpha('#6366f1', 0.2)}`,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                            {/* Header */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 3, borderBottom: `2px solid ${alpha('#6366f1', 0.1)}` }}>
                                                <Box
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        background: `linear-gradient(135deg, ${alpha('#6366f1', 0.2)} 0%, ${alpha('#6366f1', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `2px solid ${alpha('#6366f1', 0.3)}`
                                                    }}
                                                >
                                                    <ShieldIcon sx={{ fontSize: 32, color: '#6366f1' }} />
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" fontWeight={900} color="#6366f1">
                                                        🛡️ Protection Policy
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        การกำหนดค่าระบบป้องกัน
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Policy Details */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                                {/* Protection Status */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        📊 สถานะ Protection
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Chip
                                                            label={vm.in_protection ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                                            icon={vm.in_protection ? <CheckCircleIcon /> : <WarningIcon />}
                                                            sx={{
                                                                height: 36,
                                                                fontSize: '0.9rem',
                                                                fontWeight: 800,
                                                                background: vm.in_protection
                                                                    ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                                                                    : alpha('#f59e0b', 0.15),
                                                                color: vm.in_protection ? '#fff' : '#f59e0b',
                                                                border: vm.in_protection ? 'none' : `2px solid ${alpha('#f59e0b', 0.3)}`,
                                                                boxShadow: vm.in_protection ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
                                                            }}
                                                        />
                                                        {vm.backup_policy_enable && (
                                                            <Chip
                                                                label="Backup Policy Active"
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    background: alpha('#3b82f6', 0.15),
                                                                    color: '#3b82f6',
                                                                    border: `1px solid ${alpha('#3b82f6', 0.3)}`
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>

                                                {/* Policy Name */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        📋 ชื่อ Policy
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            background: alpha('#6366f1', 0.05),
                                                            border: `1px solid ${alpha('#6366f1', 0.15)}`
                                                        }}
                                                    >
                                                        <Typography variant="h6" fontWeight={800} color="#6366f1">
                                                            {vm.protection_name || 'ไม่มีการกำหนด Policy'}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                {/* Protection ID */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        🔑 Protection ID
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        fontWeight={600}
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: 1.5,
                                                            background: alpha('#000', 0.03),
                                                            border: `1px solid ${alpha('#000', 0.1)}`,
                                                            wordBreak: 'break-all',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        {vm.protection_id || 'N/A'}
                                                    </Typography>
                                                </Box>

                                                {/* Protection Type Badge */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        🏷️ ประเภท Protection
                                                    </Typography>
                                                    <Box>
                                                        {vm.protection_type === 'backup_disaster' && (
                                                            <Chip
                                                                label="🔴 DR (Disaster Recovery)"
                                                                sx={{
                                                                    height: 36,
                                                                    fontWeight: 800,
                                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                    color: '#fff',
                                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                                                }}
                                                            />
                                                        )}
                                                        {vm.protection_type === 'az_backup' && (
                                                            <Chip
                                                                label="🟡 AZ Backup (Zone Backup)"
                                                                sx={{
                                                                    height: 36,
                                                                    fontWeight: 800,
                                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
                                                                    color: '#fff',
                                                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                                                }}
                                                            />
                                                        )}
                                                        {!vm.protection_type && (
                                                            <Chip
                                                                label="⚪ ไม่ระบุประเภท"
                                                                sx={{
                                                                    height: 36,
                                                                    fontWeight: 700,
                                                                    background: alpha('#94a3b8', 0.15),
                                                                    color: '#64748b',
                                                                    border: `1px solid ${alpha('#94a3b8', 0.3)}`
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Backup Storage & Configuration Card */}
                                <Grid item xs={12} lg={6}>
                                    <Card
                                        sx={{
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: theme.palette.mode === 'dark'
                                                ? `linear-gradient(145deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`
                                                : `linear-gradient(145deg, ${alpha('#8b5cf6', 0.05)} 0%, ${alpha('#8b5cf6', 0.01)} 100%)`,
                                            border: '2px solid',
                                            borderColor: alpha('#8b5cf6', 0.2),
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #8b5cf6 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                borderColor: alpha('#8b5cf6', 0.4),
                                                boxShadow: `0 12px 24px ${alpha('#8b5cf6', 0.2)}`,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                            {/* Header */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 3, borderBottom: `2px solid ${alpha('#8b5cf6', 0.1)}`, flexWrap: 'wrap' }}>
                                                <Box
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `2px solid ${alpha('#8b5cf6', 0.3)}`
                                                    }}
                                                >
                                                    <StorageIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" fontWeight={900} color="#8b5cf6">
                                                        💾 Backup Storage
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        การจัดเก็บและจัดการ Backup
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Storage Details */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                                {/* Backup Files Count */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        📦 จำนวนไฟล์ Backup
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box
                                                            sx={{
                                                                px: 3,
                                                                py: 1.5,
                                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.15)} 0%, ${alpha('#3b82f6', 0.05)} 100%)`,
                                                                border: `2px solid ${alpha('#3b82f6', 0.3)}`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 1
                                                            }}
                                                        >
                                                            <Typography variant="h5" fontWeight={900} color="#3b82f6">
                                                                {vm.backup_file_count || 0}
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                                Files
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            label={vm.backup_file_count && vm.backup_file_count > 0 ? 'มี Backup' : 'ไม่มี Backup'}
                                                            size="small"
                                                            color={vm.backup_file_count && vm.backup_file_count > 0 ? 'success' : 'default'}
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    </Box>
                                                </Box>

                                                {/* Total Backup Size */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        💿 ขนาดไฟล์ Backup รวม
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            background: alpha('#8b5cf6', 0.05),
                                                            border: `1px solid ${alpha('#8b5cf6', 0.15)}`
                                                        }}
                                                    >
                                                        <Typography variant="h6" fontWeight={800} color="#8b5cf6">
                                                            {vm.storage_file_size_mb
                                                                ? formatBytesWithMB(vm.storage_file_size_mb)
                                                                : vm.backup_file_count && vm.backup_file_count > 0
                                                                    ? `${vm.backup_file_count} ไฟล์ (ไม่ทราบขนาด)`
                                                                    : 'ไม่มี Backup'}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                {/* Datastore Information */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        🗄️ Datastore
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={700}
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: 1.5,
                                                            background: alpha('#8b5cf6', 0.05),
                                                            border: `1px solid ${alpha('#8b5cf6', 0.15)}`
                                                        }}
                                                    >
                                                        {vm.storage_name || 'ไม่ระบุ Datastore'}
                                                    </Typography>
                                                    {vm.storage_id && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            fontFamily="monospace"
                                                            sx={{
                                                                display: 'block',
                                                                mt: 1,
                                                                p: 1,
                                                                borderRadius: 1,
                                                                background: alpha('#000', 0.03),
                                                                wordBreak: 'break-all'
                                                            }}
                                                        >
                                                            ID: {vm.storage_id}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                {/* Expiry Time */}
                                                <Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        ⏰ วันหมดอายุ
                                                    </Typography>
                                                    <Chip
                                                        label={vm.expire_time || 'Unlimited'}
                                                        sx={{
                                                            height: 36,
                                                            fontWeight: 800,
                                                            background: vm.expire_time && vm.expire_time !== 'unlimited'
                                                                ? 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)'
                                                                : 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                                                            color: '#fff',
                                                            boxShadow: vm.expire_time && vm.expire_time !== 'unlimited'
                                                                ? '0 4px 12px rgba(245, 158, 11, 0.3)'
                                                                : '0 4px 12px rgba(34, 197, 94, 0.3)'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Protection Type Information & Details */}
                                <Grid item xs={12}>
                                    <Card
                                        sx={{
                                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                            background: theme.palette.mode === 'dark'
                                                ? `linear-gradient(145deg, ${alpha('#3b82f6', 0.08)} 0%, ${alpha('#3b82f6', 0.02)} 100%)`
                                                : `linear-gradient(145deg, ${alpha('#3b82f6', 0.05)} 0%, ${alpha('#3b82f6', 0.01)} 100%)`,
                                            border: '2px solid',
                                            borderColor: alpha('#3b82f6', 0.2),
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 3s linear infinite',
                                            },
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                borderColor: alpha('#3b82f6', 0.3),
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                                            {/* Header */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                                <Box
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: 2.5,
                                                        background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)} 0%, ${alpha('#3b82f6', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `2px solid ${alpha('#3b82f6', 0.3)}`
                                                    }}
                                                >
                                                    <InfoIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={900} color="#3b82f6">
                                                        ℹ️ ข้อมูลเพิ่มเติม
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        รายละเอียดและคำอธิบายแบบละเอียด
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Information Content */}
                                            {vm.protection_type === 'backup_disaster' && (
                                                <Box
                                                    sx={{
                                                        p: 3,
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        background: theme.palette.mode === 'dark'
                                                            ? alpha('#ef4444', 0.08)
                                                            : alpha('#ef4444', 0.05),
                                                        border: `2px solid ${alpha('#ef4444', 0.2)}`,
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                background: `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#ef4444', 0.3)}`
                                                            }}
                                                        >
                                                            <Typography fontSize="24px">🔴</Typography>
                                                        </Box>
                                                        <Typography variant="h6" fontWeight={900} color="#ef4444">
                                                            DR (Disaster Recovery)
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ pl: 7 }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • <strong>VM นี้อยู่ภายใต้ระบบ Disaster Recovery แบบเต็มรูปแบบ</strong>
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • มีการทำ <strong>Backup และ Replication</strong> ไปยัง Site สำรอง
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • สามารถ <strong>Failover</strong> ได้ในกรณีเกิดภัยพิบัติ
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • Protection Policy: <Chip
                                                                label={vm.protection_name}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                    color: '#fff',
                                                                    ml: 0.5
                                                                }}
                                                            />
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                                            • จำนวน Backup Files: <strong>{vm.backup_file_count || 0} ไฟล์</strong>
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}

                                            {vm.protection_type === 'az_backup' && (
                                                <Box
                                                    sx={{
                                                        p: 3,
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        background: theme.palette.mode === 'dark'
                                                            ? alpha('#f59e0b', 0.08)
                                                            : alpha('#f59e0b', 0.05),
                                                        border: `2px solid ${alpha('#f59e0b', 0.2)}`,
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#f59e0b', 0.3)}`
                                                            }}
                                                        >
                                                            <Typography fontSize="24px">🟡</Typography>
                                                        </Box>
                                                        <Typography variant="h6" fontWeight={900} color="#f59e0b">
                                                            AZ Backup (Availability Zone Backup)
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ pl: 7 }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • <strong>VM นี้มีการทำ Backup ระหว่าง Availability Zone</strong>
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • Backup จะถูกเก็บใน <strong>AZ อื่นเพื่อความปลอดภัย</strong>
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • จำนวน Backup ปัจจุบัน: <Chip
                                                                label={`${vm.backup_file_count || 0} ไฟล์`}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                    color: '#fff',
                                                                    ml: 0.5
                                                                }}
                                                            />
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • Protection Policy: <Chip
                                                                label={vm.protection_name || 'Unnamed'}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
                                                                    color: '#fff',
                                                                    ml: 0.5
                                                                }}
                                                            />
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                                            • ขนาด Backup: <strong>{vm.storage_file_size_mb ? formatBytesWithMB(vm.storage_file_size_mb) : 'N/A'}</strong>
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}

                                            {!vm.protection_type && !vm.in_protection && (
                                                <Box
                                                    sx={{
                                                        p: 3,
                                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                        background: theme.palette.mode === 'dark'
                                                            ? alpha('#94a3b8', 0.08)
                                                            : alpha('#94a3b8', 0.05),
                                                        border: `2px solid ${alpha('#94a3b8', 0.2)}`,
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                background: `linear-gradient(135deg, ${alpha('#94a3b8', 0.2)} 0%, ${alpha('#94a3b8', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: `2px solid ${alpha('#94a3b8', 0.3)}`
                                                            }}
                                                        >
                                                            <Typography fontSize="24px">⚪</Typography>
                                                        </Box>
                                                        <Typography variant="h6" fontWeight={900} color="#64748b">
                                                            ไม่มี Protection
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ pl: 7 }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • <strong>VM นี้ยังไม่ได้เปิดใช้งานระบบ Protection</strong>
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                                            • {vm.backup_file_count && vm.backup_file_count > 0
                                                                ? `มี ${vm.backup_file_count} ไฟล์ Backup แบบ Manual`
                                                                : 'ยังไม่มีไฟล์ Backup'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                                            • <strong style={{ color: '#f59e0b' }}>⚠️ แนะนำให้เปิดใช้งาน Protection Policy เพื่อความปลอดภัย</strong>
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* Tab 6: Alarm - Modern Professional Design */}
                    {activeTab === 6 && (
                        <Box>
                            {alarmsLoading && (
                                <Fade in={true}>
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 8,
                                        gap: 3
                                    }}>
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: '50%',
                                                background: `conic-gradient(from 0deg, #ef4444 0%, #f59e0b 25%, #3b82f6 50%, #8b5cf6 75%, #ef4444 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                animation: 'spin 2s linear infinite',
                                                '@keyframes spin': {
                                                    '0%': { transform: 'rotate(0deg)' },
                                                    '100%': { transform: 'rotate(360deg)' }
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 64,
                                                    height: 64,
                                                    borderRadius: '50%',
                                                    background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <CircularProgress size={32} thickness={2.5} sx={{ color: '#ef4444' }} />
                                            </Box>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h6" fontWeight={900} sx={{
                                                background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #3b82f6 100%)',
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                mb: 1
                                            }}>
                                                กำลังตรวจสอบ Alarms
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                โปรดรอสักครู่...
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Fade>
                            )}
                            {!alarmsLoading && (
                                <>
                                    {/* Hero Overview Cards */}
                                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                                        {/* Total Alarms Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    background: `linear-gradient(135deg, ${alpha('#ef4444', 0.08)} 0%, ${alpha('#ef4444', 0.02)} 100%)`,
                                                    border: '2px solid',
                                                    borderColor: alpha('#ef4444', 0.2),
                                                    transition: 'all 0.3s ease',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 4,
                                                        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#ef4444', 0.4),
                                                        boxShadow: `0 12px 28px ${alpha('#ef4444', 0.25)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 56,
                                                                height: 56,
                                                                borderRadius: 2.5,
                                                                background: `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: '2px solid',
                                                                borderColor: alpha('#ef4444', 0.3),
                                                            }}
                                                        >
                                                            <AlarmIcon sx={{ fontSize: 32, color: '#ef4444' }} />
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        🚨 Total Alarms
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={900} color="#ef4444" sx={{ mb: 0.5 }}>
                                                        {alarms.length}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                        การแจ้งเตือนทั้งหมด
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Critical Alarms Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    background: `linear-gradient(135deg, ${alpha('#dc2626', 0.08)} 0%, ${alpha('#dc2626', 0.02)} 100%)`,
                                                    border: '2px solid',
                                                    borderColor: alpha('#dc2626', 0.2),
                                                    transition: 'all 0.3s ease',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 4,
                                                        background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#dc2626', 0.4),
                                                        boxShadow: `0 12px 28px ${alpha('#dc2626', 0.25)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 56,
                                                                height: 56,
                                                                borderRadius: 2.5,
                                                                background: `linear-gradient(135deg, ${alpha('#dc2626', 0.2)} 0%, ${alpha('#dc2626', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: '2px solid',
                                                                borderColor: alpha('#dc2626', 0.3),
                                                            }}
                                                        >
                                                            <WarningIcon sx={{ fontSize: 32, color: '#dc2626' }} />
                                                        </Box>
                                                        {alarms.filter(a => {
                                                            const sev = (a.severity || '').toLowerCase();
                                                            return sev.includes('critical') || sev === 'p1';
                                                        }).length > 0 && (
                                                                <Box
                                                                    sx={{
                                                                        width: 12,
                                                                        height: 12,
                                                                        borderRadius: '50%',
                                                                        background: '#dc2626',
                                                                        boxShadow: '0 0 12px rgba(220, 38, 38, 0.6)',
                                                                        animation: 'pulse 2s ease-in-out infinite',
                                                                        '@keyframes pulse': {
                                                                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                                            '50%': { opacity: 0.7, transform: 'scale(1.3)' }
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                    </Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        🔴 Critical (P1)
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={900} color="#dc2626" sx={{ mb: 0.5 }}>
                                                        {alarms.filter(a => {
                                                            const sev = (a.severity || '').toLowerCase();
                                                            return sev.includes('critical') || sev === 'p1';
                                                        }).length}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                        วิกฤติ ต้องแก้ไขทันที
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Warning Alarms Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.02)} 100%)`,
                                                    border: '2px solid',
                                                    borderColor: alpha('#f59e0b', 0.2),
                                                    transition: 'all 0.3s ease',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 4,
                                                        background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f59e0b 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        borderColor: alpha('#f59e0b', 0.4),
                                                        boxShadow: `0 12px 28px ${alpha('#f59e0b', 0.25)}`,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box
                                                            sx={{
                                                                width: 56,
                                                                height: 56,
                                                                borderRadius: 2.5,
                                                                background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: '2px solid',
                                                                borderColor: alpha('#f59e0b', 0.3),
                                                            }}
                                                        >
                                                            <WarningIcon sx={{ fontSize: 32, color: '#f59e0b' }} />
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        🟡 Warning (P2)
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={900} color="#f59e0b" sx={{ mb: 0.5 }}>
                                                        {alarms.filter(a => {
                                                            const sev = (a.severity || '').toLowerCase();
                                                            return sev.includes('warning') || sev === 'p2';
                                                        }).length}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                        เฝ้าระวัง ควรตรวจสอบ
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        {/* Open Alarms Card */}
                                        <Grid item xs={12} md={6} lg={3}>
                                            <Card
                                                sx={{
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                    background: platformAlerts.length > 0
                                                        ? `linear-gradient(135deg, ${alpha('#7c3aed', 0.08)} 0%, ${alpha('#7c3aed', 0.02)} 100%)`
                                                        : alarms.filter(a => a.status === 'open').length > 0
                                                            ? `linear-gradient(135deg, ${alpha('#3b82f6', 0.08)} 0%, ${alpha('#3b82f6', 0.02)} 100%)`
                                                            : `linear-gradient(135deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
                                                    border: '2px solid',
                                                    borderColor: platformAlerts.length > 0 ? alpha('#7c3aed', 0.2) :
                                                        alarms.filter(a => a.status === 'open').length > 0 ? alpha('#3b82f6', 0.2) : alpha('#22c55e', 0.2),
                                                    transition: 'all 0.3s ease',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                                        background: platformAlerts.length > 0
                                                            ? 'linear-gradient(90deg, #7c3aed, #4c1d95, #7c3aed)'
                                                            : alarms.filter(a => a.status === 'open').length > 0
                                                                ? 'linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6)'
                                                                : 'linear-gradient(90deg, #22c55e, #10b981, #22c55e)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 3s linear infinite',
                                                    },
                                                }}
                                            >
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box sx={{
                                                            width: 56, height: 56, borderRadius: 2.5,
                                                            background: platformAlerts.length > 0
                                                                ? `linear-gradient(135deg, ${alpha('#7c3aed', 0.2)}, ${alpha('#7c3aed', 0.1)})`
                                                                : alarms.filter(a => a.status === 'open').length > 0
                                                                    ? `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)}, ${alpha('#3b82f6', 0.1)})`
                                                                    : `linear-gradient(135deg, ${alpha('#22c55e', 0.2)}, ${alpha('#22c55e', 0.1)})`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: '2px solid',
                                                            borderColor: platformAlerts.length > 0 ? alpha('#7c3aed', 0.3) :
                                                                alarms.filter(a => a.status === 'open').length > 0 ? alpha('#3b82f6', 0.3) : alpha('#22c55e', 0.3),
                                                        }}>
                                                            {platformAlerts.length > 0 ? (
                                                                <NotificationsActiveIcon sx={{ fontSize: 32, color: '#7c3aed' }} />
                                                            ) : alarms.filter(a => a.status === 'open').length > 0 ? (
                                                                <InfoIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                                                            ) : (
                                                                <CheckCircleIcon sx={{ fontSize: 32, color: '#22c55e' }} />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                                        💜 Platform Alerts
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={900} color={
                                                        platformAlerts.length > 0 ? '#7c3aed' : '#22c55e'
                                                    } sx={{ mb: 0.5 }}>
                                                        {platformAlerts.length}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                        {platformAlerts.length > 0 ? 'Platform Events' : 'ไม่มี Events'}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    {/* Alarms List Section */}
                                    {alarms.length === 0 ? (
                                        <Card
                                            sx={{
                                                borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                background: theme.palette.mode === 'dark'
                                                    ? `linear-gradient(145deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
                                                    : `linear-gradient(145deg, ${alpha('#22c55e', 0.05)} 0%, ${alpha('#22c55e', 0.01)} 100%)`,
                                                border: '2px solid',
                                                borderColor: alpha('#22c55e', 0.2),
                                            }}
                                        >
                                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 96,
                                                        height: 96,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `3px solid ${alpha('#22c55e', 0.3)}`,
                                                        margin: '0 auto 24px',
                                                    }}
                                                >
                                                    <CheckCircleIcon sx={{ fontSize: 56, color: '#22c55e' }} />
                                                </Box>
                                                <Typography variant="h5" fontWeight={900} color="#22c55e" gutterBottom>
                                                    ✅ ไม่พบ Alarm
                                                </Typography>
                                                <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ mb: 3 }}>
                                                    VM นี้ไม่มีการแจ้งเตือนใดๆ ในขณะนี้ ระบบทำงานปกติ
                                                </Typography>
                                                <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                                        ℹ️ ตัวอย่าง Alarm Levels
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip label="P1 - Critical" size="small" sx={{
                                                                fontWeight: 800,
                                                                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                                                color: '#fff'
                                                            }} />
                                                            <Typography variant="caption">วิกฤติ ต้องแก้ไขทันที</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip label="P2 - Warning" size="small" sx={{
                                                                fontWeight: 800,
                                                                background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
                                                                color: '#fff'
                                                            }} />
                                                            <Typography variant="caption">เฝ้าระวัง ควรตรวจสอบ</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip label="P3 - Info" size="small" sx={{
                                                                fontWeight: 800,
                                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                color: '#fff'
                                                            }} />
                                                            <Typography variant="caption">ข้อมูลแจ้งให้ทราบ</Typography>
                                                        </Box>
                                                    </Box>
                                                </Alert>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Box>
                                            {/* Section Header */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 44,
                                                            height: 44,
                                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            background: `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: `2px solid ${alpha('#ef4444', 0.3)}`
                                                        }}
                                                    >
                                                        <AlarmIcon sx={{ fontSize: 26, color: '#ef4444' }} />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={900}>
                                                            🚨 Alarm Details
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            รายละเอียดการแจ้งเตือนทั้งหมด
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    label={`${alarms.length} Alarm${alarms.length !== 1 ? 's' : ''}`}
                                                    sx={{
                                                        height: 36,
                                                        fontSize: '0.95rem',
                                                        fontWeight: 800,
                                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        color: '#fff',
                                                        px: 2,
                                                        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                                                    }}
                                                />
                                            </Box>

                                            {/* Alarms Grid */}
                                            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                                                {alarms.map((alarm) => {
                                                    const severity = (alarm.severity || 'p3').toLowerCase();
                                                    let severityColor = '#3b82f6';
                                                    let severityBg = alpha('#3b82f6', 0.08);
                                                    let severityLabel = 'Info';
                                                    let severityIcon = '🔵';

                                                    if (severity.includes('critical') || severity === 'p1') {
                                                        severityColor = '#dc2626';
                                                        severityBg = alpha('#dc2626', 0.08);
                                                        severityLabel = 'Critical';
                                                        severityIcon = '🔴';
                                                    } else if (severity.includes('warning') || severity === 'p2') {
                                                        severityColor = '#f59e0b';
                                                        severityBg = alpha('#f59e0b', 0.08);
                                                        severityLabel = 'Warning';
                                                        severityIcon = '🟡';
                                                    }

                                                    return (
                                                        <Grid item xs={12} key={alarm.alarm_id}>
                                                            <Card
                                                                sx={{
                                                                    borderRadius: { xs: 2.5, sm: 3, md: 4 },
                                                                    background: theme.palette.mode === 'dark'
                                                                        ? severityBg
                                                                        : `linear-gradient(145deg, ${severityBg} 0%, ${alpha(severityColor, 0.02)} 100%)`,
                                                                    border: '2px solid',
                                                                    borderColor: alpha(severityColor, 0.2),
                                                                    position: 'relative',
                                                                    overflow: 'hidden',
                                                                    '&::before': {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        top: 0,
                                                                        left: 0,
                                                                        right: 0,
                                                                        height: 5,
                                                                        background: `linear-gradient(90deg, ${severityColor} 0%, ${alpha(severityColor, 0.7)} 50%, ${severityColor} 100%)`,
                                                                        backgroundSize: '200% 100%',
                                                                        animation: alarm.status === 'open' ? 'shimmer 3s linear infinite' : 'none',
                                                                    },
                                                                    transition: 'all 0.3s ease',
                                                                    '&:hover': {
                                                                        transform: 'translateY(-4px)',
                                                                        borderColor: alpha(severityColor, 0.4),
                                                                        boxShadow: `0 12px 24px ${alpha(severityColor, 0.2)}`,
                                                                    }
                                                                }}
                                                            >
                                                                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                                                                    {/* Header */}
                                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                                                                            {/* Severity Icon */}
                                                                            <Box
                                                                                sx={{
                                                                                    width: 56,
                                                                                    height: 56,
                                                                                    borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                                                                    background: `linear-gradient(135deg, ${alpha(severityColor, 0.2)} 0%, ${alpha(severityColor, 0.1)} 100%)`,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    border: `2px solid ${alpha(severityColor, 0.3)}`,
                                                                                    flexShrink: 0,
                                                                                }}
                                                                            >
                                                                                <WarningIcon sx={{ fontSize: 32, color: severityColor }} />
                                                                            </Box>

                                                                            {/* Title & Time */}
                                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                                                                    <Chip
                                                                                        label={`${severityIcon} ${severityLabel} - ${(alarm.severity || 'Unknown').toUpperCase()}`}
                                                                                        sx={{
                                                                                            height: 28,
                                                                                            fontSize: '0.8rem',
                                                                                            fontWeight: 800,
                                                                                            background: `linear-gradient(135deg, ${severityColor} 0%, ${alpha(severityColor, 0.8)} 100%)`,
                                                                                            color: '#fff',
                                                                                            boxShadow: `0 4px 12px ${alpha(severityColor, 0.3)}`
                                                                                        }}
                                                                                    />
                                                                                    <Chip
                                                                                        label={alarm.status === 'open' ? '🔓 Open' : '✅ Closed'}
                                                                                        size="small"
                                                                                        sx={{
                                                                                            height: 28,
                                                                                            fontWeight: 700,
                                                                                            background: alarm.status === 'open'
                                                                                                ? alpha('#ef4444', 0.15)
                                                                                                : alpha('#22c55e', 0.15),
                                                                                            color: alarm.status === 'open' ? '#ef4444' : '#22c55e',
                                                                                            border: `1px solid ${alarm.status === 'open' ? alpha('#ef4444', 0.3) : alpha('#22c55e', 0.3)}`
                                                                                        }}
                                                                                    />
                                                                                    {alarm.source === 'host' && (
                                                                                        <Chip
                                                                                            label={`🖥️ Host: ${alarm.resource_name || 'System'}`}
                                                                                            size="small"
                                                                                            sx={{
                                                                                                height: 28,
                                                                                                fontWeight: 700,
                                                                                                background: alpha('#8b5cf6', 0.15),
                                                                                                color: '#8b5cf6',
                                                                                                border: `1px solid ${alpha('#8b5cf6', 0.3)}`
                                                                                            }}
                                                                                        />
                                                                                    )}
                                                                                </Box>
                                                                                <Typography variant="h6" fontWeight={900} color={severityColor} sx={{ mb: 0.5, wordBreak: 'break-word' }}>
                                                                                    {alarm.title}
                                                                                </Typography>
                                                                                {alarm.description && (
                                                                                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1, wordBreak: 'break-word' }}>
                                                                                        {alarm.description}
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>
                                                                        </Box>
                                                                    </Box>

                                                                    {/* Metadata Grid */}
                                                                    <Grid container spacing={2} sx={{ mt: 2 }}>
                                                                        {/* Begin Time */}
                                                                        <Grid item xs={12} sm={6} md={3}>
                                                                            <Box
                                                                                sx={{
                                                                                    p: 2,
                                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                                    background: alpha(severityColor, 0.05),
                                                                                    border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                                }}
                                                                            >
                                                                                <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                    ⏰ เริ่มต้น
                                                                                </Typography>
                                                                                <Typography variant="body2" fontWeight={800} color={severityColor}>
                                                                                    {alarm.begin_time ? new Date(alarm.begin_time).toLocaleString('th-TH', {
                                                                                        year: '2-digit',
                                                                                        month: 'short',
                                                                                        day: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    }) : '-'}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Grid>

                                                                        {/* Source */}
                                                                        {alarm.source && (
                                                                            <Grid item xs={12} sm={6} md={3}>
                                                                                <Box
                                                                                    sx={{
                                                                                        p: 2,
                                                                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                                        background: alpha(severityColor, 0.05),
                                                                                        border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                                    }}
                                                                                >
                                                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                        📡 Source
                                                                                    </Typography>
                                                                                    <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                                                                                        {alarm.source}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Grid>
                                                                        )}

                                                                        {/* Object Type */}
                                                                        {alarm.object_type && (
                                                                            <Grid item xs={12} sm={6} md={3}>
                                                                                <Box
                                                                                    sx={{
                                                                                        p: 2,
                                                                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                                        background: alpha(severityColor, 0.05),
                                                                                        border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                                    }}
                                                                                >
                                                                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                        🔧 Object Type
                                                                                    </Typography>
                                                                                    <Typography variant="body2" fontWeight={700}>
                                                                                        {alarm.object_type}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Grid>
                                                                        )}

                                                                        {/* Alarm ID */}
                                                                        <Grid item xs={12} sm={6} md={3}>
                                                                            <Box
                                                                                sx={{
                                                                                    p: 2,
                                                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                                                    background: alpha(severityColor, 0.05),
                                                                                    border: `1px solid ${alpha(severityColor, 0.15)}`
                                                                                }}
                                                                            >
                                                                                <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                                                                                    🔑 Alarm ID
                                                                                </Typography>
                                                                                <Typography variant="body2" fontFamily="monospace" fontWeight={600} fontSize="0.75rem">
                                                                                    #{alarm.alarm_id}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                    </Grid>
                                                                </CardContent>
                                                            </Card>
                                                        </Grid>
                                                    );
                                                })}
                                            </Grid>

                                            {/* Platform Alerts Section (null-severity system events) */}
                                            {platformAlerts.length > 0 && (
                                                <Box sx={{ mt: 4 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <Box sx={{
                                                            width: 44, height: 44, borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                            background: `linear-gradient(135deg, ${alpha('#7c3aed', 0.2)}, ${alpha('#7c3aed', 0.1)})`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: `2px solid ${alpha('#7c3aed', 0.3)}`,
                                                        }}>
                                                            <NotificationsActiveIcon sx={{ fontSize: 26, color: '#7c3aed' }} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="h6" fontWeight={900}>💜 Platform Events</Typography>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                                System events without policy severity classification
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            label={`${platformAlerts.length} Event${platformAlerts.length !== 1 ? 's' : ''}`}
                                                            sx={{ ml: 'auto', fontWeight: 800, background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', color: '#fff' }}
                                                        />
                                                    </Box>
                                                    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                                                        {platformAlerts.map((alert) => (
                                                            <Grid item xs={12} key={alert.alarm_id}>
                                                                <Card sx={{
                                                                    borderRadius: 3, borderLeft: '4px solid #7c3aed',
                                                                    background: `linear-gradient(135deg, ${alpha('#7c3aed', 0.05)}, ${alpha('#4c1d95', 0.02)})`,
                                                                    border: `1px solid ${alpha('#7c3aed', 0.2)}`,
                                                                }}>
                                                                    <CardContent sx={{ p: { xs: 1.25, sm: 1.75, md: 2.5 } }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                                            <NotificationsActiveIcon sx={{ fontSize: 22, color: '#7c3aed', mt: 0.3, flexShrink: 0 }} />
                                                                            <Box sx={{ flex: 1 }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                                                                    <Chip label="Platform Event" size="small" sx={{
                                                                                        fontWeight: 700, fontSize: '0.7rem',
                                                                                        background: alpha('#7c3aed', 0.15), color: '#7c3aed',
                                                                                        border: `1px solid ${alpha('#7c3aed', 0.3)}`,
                                                                                    }} />
                                                                                    <Chip label={alert.object_type || 'system'} size="small" variant="outlined"
                                                                                        sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }} />
                                                                                    {alert.alert_count > 1 && (
                                                                                        <Chip label={`×${alert.alert_count}`} size="small" color="warning"
                                                                                            sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                                                                    )}
                                                                                </Box>
                                                                                <Typography variant="body2" fontWeight={700} color="#7c3aed" sx={{ mb: 0.5 }}>
                                                                                    {alert.title || (alert.description ? alert.description.substring(0, 80) : 'Platform Event')}
                                                                                </Typography>
                                                                                {alert.description && alert.description !== alert.title && (
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {alert.description}
                                                                                    </Typography>
                                                                                )}
                                                                                {alert.recommendation && (
                                                                                    <Box sx={{ mt: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', gap: 1 }}>
                                                                                        <Typography variant="caption" color="#b45309" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>💡 TIP:</Typography>
                                                                                        <Typography variant="caption" color="text.primary">{alert.recommendation}</Typography>
                                                                                    </Box>
                                                                                )}
                                                                            </Box>
                                                                            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                                                                                {alert.created_at ? new Date(alert.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                                            </Typography>
                                                                        </Box>
                                                                    </CardContent>
                                                                </Card>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                </Box>
                                            )}

                                            {/* View All Button */}
                                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                                <Button
                                                    variant="contained"
                                                    size="large"
                                                    onClick={() => navigate(`/alarms?search=${vm.name}`)}
                                                    sx={{
                                                        px: 4,
                                                        py: 1.5,
                                                        fontSize: '1rem',
                                                        fontWeight: 800,
                                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                                            boxShadow: '0 12px 28px rgba(239, 68, 68, 0.4)',
                                                            transform: 'translateY(-2px)',
                                                        }
                                                    }}
                                                    startIcon={<AlarmIcon />}
                                                >
                                                    📜 ดู Alarm History ทั้งหมด
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}
                                </>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Tab 7: Raw Data */}
            {
                activeTab === 7 && (
                    <Card>
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box>
                                {rawLoading && (
                                    <Fade in={true}>
                                        <Box sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            py: 8,
                                            gap: { xs: 1, sm: 1.5, md: 2 }
                                        }}>
                                            <CircularProgress size={60} thickness={4} />
                                            <Typography variant="h6" color="text.secondary">
                                                กำลังดึงข้อมูลดิบจาก API...
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                อาจใช้เวลาสักครู่
                                            </Typography>
                                        </Box>
                                    </Fade>
                                )}
                                {!rawLoading && (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.5, md: 2 }, flexWrap: 'wrap', gap: 1 }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>
                                                <RawDataIcon /> Comprehensive Diagnostic Data (Raw)
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                {rawData?.data?.api_source?.endpoint && (
                                                    <Chip
                                                        label={`API: ${rawData.data.api_source.endpoint}`}
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                    />
                                                )}
                                                {rawData?.data?.collected_at && (
                                                    <Chip
                                                        label={`Fetched: ${new Date(rawData.data.collected_at).toLocaleString('th-TH')}`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 1.5, md: 2 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                            ข้อมูลชุดนี้เป็นการรวมข้อมูลดิบจากทั้ง Sangfor API และข้อมูลล่าสุดที่เก็บไว้ใน Database (Master, Disks, Networks, Alarms, Metrics) เพื่อใช้สำหรับการตรวจสอบความถูกต้อง
                                        </Typography>

                                        {rawError ? (
                                            <Alert severity="error">
                                                ไม่สามารถดึงข้อมูลดิบได้: {(rawError as any)?.response?.data?.detail || rawError.message}
                                            </Alert>
                                        ) : (
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: { xs: 1.5, md: 2 },
                                                    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#1e1e1e',
                                                    color: '#d4d4d4',
                                                    overflow: 'auto',
                                                    maxHeight: { xs: '500px', sm: '600px', md: '700px' },
                                                    borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                    border: '1px solid',
                                                    borderColor: 'divider'
                                                }}
                                            >
                                                <pre style={{ margin: 0, fontFamily: '"Fira Code", "Source Code Pro", monospace', fontSize: 'clamp(10px, 2.5vw, 13px)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                                                    {JSON.stringify(rawData?.data, null, 2)}
                                                </pre>
                                            </Paper>
                                        )}
                                    </>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                )
            }

            {/* Custom Date Range Dialog */}
            <Dialog open={customDateOpen} onClose={() => setCustomDateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>เลือกช่วงเวลาที่ต้องการ</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="วันเริ่มต้น"
                            type="datetime-local"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="วันสิ้นสุด"
                            type="datetime-local"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
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
