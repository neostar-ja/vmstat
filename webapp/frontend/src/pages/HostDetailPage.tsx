/**
 * HostDetailPage.tsx
 * หน้ารายละเอียด Host แบบ 3 Tabs ภาษาไทย
 * - Tab 1: ข้อมูลทั่วไป (ข้อมูลสเปค, IP, Cluster, สถานะ)
 * - Tab 2: ประสิทธิภาพการทำงาน (กราฟ CPU/RAM ย้อนหลัง)
 * - Tab 3: เครื่องเสมือน (รายการ VM บน Host นี้)
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Skeleton,
    LinearProgress,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Avatar,
    Divider,
    IconButton,
    Tooltip,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    useTheme,
    alpha,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Dns as HostIcon,
    Speed as CpuIcon,
    Memory as MemoryIcon,
    Computer as VmIcon,
    CheckCircle as HealthyIcon,
    Warning as WarningIcon,
    Error as CriticalIcon,
    FiberManualRecord as DotIcon,
    Refresh as RefreshIcon,
    NetworkCheck as NetworkIcon,
    Storage as StorageIcon,
    Info as InfoIcon,
    PlayArrow as RunningIcon,
    Stop as StoppedIcon,
    AccessTime as ClockIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine,
} from 'recharts';
import { hostsApi } from '../services/api';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HostDetail {
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
    updated_at?: string;
    datastores?: string[];
    datastore_count?: number;
    alarms?: any[];
}

interface MetricPoint {
    collected_at: string;
    cpu_usage_pct: number;
    memory_usage_pct: number;
    cpu_used_mhz: number;
    cpu_total_mhz: number;
    memory_used_mb: number;
    memory_total_mb: number;
    vm_running: number;
    vm_total: number;
    alarm_count: number;
}

interface HostVM {
    vm_uuid: string;
    vm_id: string;
    name: string;
    power_state: string;
    status: string;
    cpu_cores: number;
    memory_total_mb: number;
    memory_usage_pct: number;
    cpu_usage_pct: number;
    os_display_name?: string;
    group_name?: string;
    ip_address?: string;
    last_metrics_at?: string;
}

// ─────────────────────────────────────────────
// Helper: สีตาม Health Status
// ─────────────────────────────────────────────
const useHealthStyles = () => {
    return (health?: string) => {
        switch (health) {
            case 'critical': return { color: '#ef4444', bg: alpha('#ef4444', 0.1), icon: CriticalIcon, label: 'วิกฤต' };
            case 'warning':  return { color: '#f59e0b', bg: alpha('#f59e0b', 0.1), icon: WarningIcon,  label: 'ระวัง' };
            case 'healthy':  return { color: '#10b981', bg: alpha('#10b981', 0.1), icon: HealthyIcon,  label: 'ปกติ' };
            default:         return { color: '#6b7280', bg: alpha('#6b7280', 0.1), icon: InfoIcon,     label: 'ไม่ทราบ' };
        }
    };
};

// ─────────────────────────────────────────────
// Helper: สีตาม Usage %
// ─────────────────────────────────────────────
const getUsageColor = (pct: number) => {
    if (pct >= 90) return '#ef4444';
    if (pct >= 80) return '#f59e0b';
    if (pct >= 60) return '#3b82f6';
    return '#10b981';
};

// ─────────────────────────────────────────────
// Helper: แปลง MB เป็น GB
// ─────────────────────────────────────────────
const mbToGb = (mb?: number) => mb ? (mb / 1024).toFixed(1) : '0.0';

// ─────────────────────────────────────────────
// Helper: แปลง MHZ เป็น GHz
// ─────────────────────────────────────────────
const mhzToGhz = (mhz?: number) => mhz ? (mhz / 1000).toFixed(1) : '0.0';

// ─────────────────────────────────────────────
// Helper: แปลง timestamp เป็นชื่อเวลาไทย
// ─────────────────────────────────────────────
const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        return format(new Date(dateStr), 'dd MMM yyyy HH:mm น.', { locale: th });
    } catch {
        return dateStr;
    }
};

// ─────────────────────────────────────────────
// Stat Row Component (สำหรับ Tab ข้อมูลทั่วไป)
// ─────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactElement }> = ({ label, value, icon }) => {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}` }}>
            {icon && (
                <Box sx={{ mr: 1.5, mt: 0.2, color: 'primary.main', flexShrink: 0 }}>
                    {React.cloneElement(icon, { sx: { fontSize: 18 } })}
                </Box>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, fontWeight: 500 }}>
                {label}
            </Typography>
            <Box sx={{ flex: 1 }}>
                {typeof value === 'string' || typeof value === 'number'
                    ? <Typography variant="body2" fontWeight={600}>{value || '-'}</Typography>
                    : value}
            </Box>
        </Box>
    );
};

// ─────────────────────────────────────────────
// Gauge Bar Component
// ─────────────────────────────────────────────
const GaugeBar: React.FC<{ label: string; pct: number; used: string; total: string; unit: string; color: string }> = (
    { label, pct, used, total, unit, color }
) => {
    const theme = useTheme();
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>{label}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color }}>
                    {pct.toFixed(1)}%
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={Math.min(pct, 100)}
                sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: alpha(theme.palette.grey[300], 0.3),
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                    }
                }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                ใช้ {used} {unit} จาก {total} {unit}
            </Typography>
        </Box>
    );
};

// ─────────────────────────────────────────────
// Custom Tooltip สำหรับ Recharts
// ─────────────────────────────────────────────
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
    const theme = useTheme();
    if (!active || !payload || !payload.length) return null;
    return (
        <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 8px 25px rgba(0,0,0,0.15)', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                {label}
            </Typography>
            {payload.map((entry: any) => (
                <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
                    <Typography variant="caption" fontWeight={600} sx={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
                    </Typography>
                </Box>
            ))}
        </Paper>
    );
};

// ─────────────────────────────────────────────
// Tab Panels
// ─────────────────────────────────────────────

/** Tab 1: ข้อมูลทั่วไป */
const GeneralInfoTab: React.FC<{ host: HostDetail }> = ({ host }) => {
    const theme = useTheme();
    const getHealth = useHealthStyles();
    const health = getHealth(host.health_status);
    const cpuPct = (host.cpu_usage_ratio || 0) * 100;
    const memPct = (host.memory_usage_ratio || 0) * 100;

    return (
        <Grid container spacing={3}>
            {/* ─── ข้อมูลหลัก ─── */}
            <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InfoIcon color="primary" />
                            ข้อมูลพื้นฐาน
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <InfoRow label="ชื่อโฮสต์" value={host.host_name} icon={<HostIcon />} />
                        <InfoRow label="IP Address" value={<Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{host.ip || '-'}</Typography>} icon={<NetworkIcon />} />
                        <InfoRow label="Availability Zone" value={<Chip label={host.az_name || 'ไม่ระบุ'} size="small" variant="outlined" color="primary" />} icon={<StorageIcon />} />
                        <InfoRow label="Cluster" value={host.cluster_name || '-'} icon={<HostIcon />} />
                        <InfoRow label="ประเภทโฮสต์" value={host.type || 'HCI'} />
                        <InfoRow
                            label="สถานะ"
                            value={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DotIcon sx={{ fontSize: 12, color: host.status === 'running' ? '#10b981' : '#ef4444' }} />
                                    <Typography variant="body2" fontWeight={600} sx={{ color: host.status === 'running' ? '#10b981' : '#ef4444' }}>
                                        {host.status === 'running' ? 'กำลังทำงาน' : host.status || '-'}
                                    </Typography>
                                </Box>
                            }
                        />
                        <InfoRow
                            label="สุขภาพระบบ"
                            value={
                                <Chip
                                    label={health.label}
                                    size="small"
                                    sx={{ bgcolor: health.bg, color: health.color, fontWeight: 700, borderRadius: 2 }}
                                />
                            }
                        />
                        <InfoRow label="ซิงค์ล่าสุด" value={formatThaiDate(host.last_synced_at)} icon={<ClockIcon />} />
                    </CardContent>
                </Card>
            </Grid>

                    {/* ข้อมูลระบบ */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CpuIcon color="primary" />
                            สเปคและการใช้งาน
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        {/* CPU */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CpuIcon sx={{ fontSize: 16 }} /> ซีพียู (CPU)
                            </Typography>
                            <GaugeBar
                                label="การใช้งาน CPU"
                                pct={cpuPct}
                                used={mhzToGhz(host.cpu_used_mhz)}
                                total={mhzToGhz(host.cpu_total_mhz)}
                                unit="GHz"
                                color={getUsageColor(cpuPct)}
                            />
                            <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">จำนวนซ็อกเก็ต</Typography>
                                    <Typography variant="body2" fontWeight={700}>{host.cpu_sockets || '-'} ซ็อกเก็ต</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">จำนวนคอร์</Typography>
                                    <Typography variant="body2" fontWeight={700}>{host.cpu_cores || '-'} คอร์</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ความถี่รวม</Typography>
                                    <Typography variant="body2" fontWeight={700}>{mhzToGhz(host.cpu_total_mhz)} GHz</Typography>
                                </Box>
                            </Box>
                        </Box>

                        {/* RAM */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <MemoryIcon sx={{ fontSize: 16 }} /> หน่วยความจำ (RAM)
                            </Typography>
                            <GaugeBar
                                label="การใช้งาน RAM"
                                pct={memPct}
                                used={mbToGb(host.memory_used_mb)}
                                total={mbToGb(host.memory_total_mb)}
                                unit="GB"
                                color={getUsageColor(memPct)}
                            />
                            <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">RAM รวม</Typography>
                                    <Typography variant="body2" fontWeight={700}>{mbToGb(host.memory_total_mb)} GB</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ใช้งาน</Typography>
                                    <Typography variant="body2" fontWeight={700}>{mbToGb(host.memory_used_mb)} GB</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ว่าง</Typography>
                                    <Typography variant="body2" fontWeight={700}>{mbToGb(host.memory_free_mb)} GB</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            {/* ─── VM สรุป ─── */}
            <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: 3, background: `linear-gradient(135deg, ${alpha('#6366f1', 0.05)} 0%, #fff 100%)`, border: `1px solid ${alpha('#6366f1', 0.12)}` }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
                        <VmIcon sx={{ fontSize: 40, color: '#6366f1', mb: 1 }} />
                        <Typography variant="h3" fontWeight={800} sx={{ color: '#6366f1' }}>{host.vm_total || 0}</Typography>
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">เครื่องเสมือนทั้งหมด</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: 3, background: `linear-gradient(135deg, ${alpha('#10b981', 0.05)} 0%, #fff 100%)`, border: `1px solid ${alpha('#10b981', 0.12)}` }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
                        <RunningIcon sx={{ fontSize: 40, color: '#10b981', mb: 1 }} />
                        <Typography variant="h3" fontWeight={800} sx={{ color: '#10b981' }}>{host.vm_running || 0}</Typography>
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">กำลังทำงาน</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: 3, background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.05)} 0%, #fff 100%)`, border: `1px solid ${alpha('#f59e0b', 0.12)}` }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
                        <WarningIcon sx={{ fontSize: 40, color: '#f59e0b', mb: 1 }} />
                        <Typography variant="h3" fontWeight={800} sx={{ color: '#f59e0b' }}>{host.alarm_count || 0}</Typography>
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">การแจ้งเตือน</Typography>
                    </CardContent>
                </Card>
            </Grid>

            {/* ─── Datastores ─── */}
            {host.datastores && host.datastores.length > 0 && (
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StorageIcon color="primary" />
                                พื้นที่จัดเก็บ (Datastores)
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {host.datastores.map((ds) => (
                                    <Chip key={ds} label={ds} variant="outlined" size="small" icon={<StorageIcon />} sx={{ borderRadius: 1 }} />
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            )}
        </Grid>
    );
};

/** Tab 2: ประสิทธิภาพการทำงาน (กราฟ) */
const PerformanceTab: React.FC<{ hostId: string }> = ({ hostId }) => {
    const theme = useTheme();
    const [timeRange, setTimeRange] = useState<string>('24h');

    const { data: metricsData, isLoading, error } = useQuery<MetricPoint[]>({
        queryKey: ['host-metrics', hostId, timeRange],
        queryFn: () => hostsApi.getMetrics(hostId, { time_range: timeRange }).then(r => r.data),
        refetchInterval: 60000, // รีเฟรชทุก 1 นาที
    });

    const metrics = metricsData || [];

    // แปลง timestamp ให้อ่านง่ายสำหรับกราฟ
    const chartData = metrics.map((m) => ({
        ...m,
        time: (() => {
            try {
                const d = new Date(m.collected_at);
                if (timeRange === '24h' || timeRange === '6h' || timeRange === '1h') {
                    return format(d, 'HH:mm');
                }
                return format(d, 'dd/MM HH:mm');
            } catch { return m.collected_at; }
        })(),
    }));

    const timeRangeOptions = [
        { value: '1h',  label: '1 ชั่วโมง' },
        { value: '6h',  label: '6 ชั่วโมง' },
        { value: '24h', label: '24 ชั่วโมง' },
        { value: '7d',  label: '7 วัน' },
        { value: '30d', label: '30 วัน' },
    ];

    return (
        <Box>
            {/* Time Range Selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📈 กราฟแนวโน้มการใช้งาน
                </Typography>
                <ToggleButtonGroup
                    value={timeRange}
                    exclusive
                    onChange={(_, v) => v && setTimeRange(v)}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: '0.78rem', fontWeight: 600 } }}
                >
                    {timeRangeOptions.map((opt) => (
                        <ToggleButton key={opt.value} value={opt.value}>
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {isLoading ? (
                <Box>
                    <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3, mb: 3 }} />
                    <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3 }} />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>ไม่สามารถโหลดข้อมูลกราฟได้</Alert>
            ) : metrics.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    ยังไม่มีข้อมูลประวัติสำหรับช่วงเวลาที่เลือก เนื่องจากระบบ Sync Metrics อาจยังไม่ได้รับข้อมูล Host
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {/* กราฟ CPU */}
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CpuIcon sx={{ color: '#3b82f6' }} />
                                    การใช้งาน CPU (%)
                                </Typography>
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke={theme.palette.text.disabled} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke={theme.palette.text.disabled} unit="%" />
                                        <RechartsTooltip content={<ChartTooltip />} />
                                        <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'เส้นเตือน 80%', fill: '#f59e0b', fontSize: 11 }} />
                                        <Area type="monotone" dataKey="cpu_usage_pct" name="CPU" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* กราฟ RAM */}
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MemoryIcon sx={{ color: '#8b5cf6' }} />
                                    การใช้งาน RAM (%)
                                </Typography>
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                                        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke={theme.palette.text.disabled} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke={theme.palette.text.disabled} unit="%" />
                                        <RechartsTooltip content={<ChartTooltip />} />
                                        <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'เส้นเตือน 80%', fill: '#f59e0b', fontSize: 11 }} />
                                        <Area type="monotone" dataKey="memory_usage_pct" name="RAM" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* กราฟ VM Count */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VmIcon sx={{ color: '#10b981' }} />
                                    จำนวนเครื่องเสมือน
                                </Typography>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} />
                                        <YAxis tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} />
                                        <RechartsTooltip />
                                        <Legend formatter={(v) => v === 'vm_total' ? 'ทั้งหมด' : 'กำลังทำงาน'} />
                                        <Line type="monotone" dataKey="vm_total" name="ทั้งหมด" stroke="#6366f1" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="vm_running" name="กำลังทำงาน" stroke="#10b981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* กราฟ Alarm Count */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <WarningIcon sx={{ color: '#f59e0b' }} />
                                    จำนวนการแจ้งเตือน
                                </Typography>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="alarmGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} />
                                        <YAxis tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} />
                                        <RechartsTooltip />
                                        <Area type="monotone" dataKey="alarm_count" name="การแจ้งเตือน" stroke="#ef4444" fill="url(#alarmGrad)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

/** Tab 3: เครื่องเสมือน (VM list on this host) */
const VMsTab: React.FC<{ hostId: string }> = ({ hostId }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const { data: vmsData, isLoading, error } = useQuery<HostVM[]>({
        queryKey: ['host-vms', hostId],
        queryFn: () => hostsApi.getVMs(hostId).then(r => r.data),
    });

    const vms = vmsData || [];

    if (isLoading) {
        return (
            <Box>
                {[...Array(5)].map((_, i) => <Skeleton key={i} height={56} sx={{ mb: 1, borderRadius: 2 }} />)}
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ borderRadius: 2 }}>ไม่สามารถโหลดรายการเครื่องเสมือนได้</Alert>;
    }

    if (vms.length === 0) {
        return (
            <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ py: 8, textAlign: 'center' }}>
                    <VmIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">ไม่พบเครื่องเสมือนบนโฮสต์นี้</Typography>
                    <Typography variant="body2" color="text.disabled">อาจยังไม่ได้ซิงค์ข้อมูลหรือไม่มี VM บน Host นี้</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        เครื่องเสมือนทั้งหมด {vms.length} เครื่อง บน {hostId}
                    </Typography>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>ชื่อเครื่องเสมือน</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>ระบบปฏิบัติการ</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">CPU (คอร์)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>การใช้ CPU</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>การใช้ RAM</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vms.map((vm) => {
                                const isOn = vm.power_state === 'on' || vm.power_state === 'running';
                                return (
                                    <TableRow
                                        key={vm.vm_uuid}
                                        hover
                                        onClick={() => navigate(`/vms/${vm.vm_uuid}`)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isOn ? '#10b981' : '#6b7280', flexShrink: 0 }} />
                                                <Typography variant="body2" fontWeight={600}>{vm.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={isOn ? 'กำลังทำงาน' : 'หยุดทำงาน'}
                                                size="small"
                                                color={isOn ? 'success' : 'default'}
                                                variant="outlined"
                                                icon={isOn ? <RunningIcon /> : <StoppedIcon />}
                                                sx={{ '& .MuiChip-icon': { fontSize: 14 }, fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {vm.ip_address || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {vm.os_display_name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={600}>{vm.cpu_cores ?? '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ minWidth: 100 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                                    <Typography variant="caption" sx={{ color: getUsageColor(vm.cpu_usage_pct || 0), fontWeight: 600 }}>
                                                        {(vm.cpu_usage_pct || 0).toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(vm.cpu_usage_pct || 0, 100)}
                                                    sx={{
                                                        height: 5, borderRadius: 3,
                                                        bgcolor: alpha(theme.palette.grey[300], 0.4),
                                                        '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: getUsageColor(vm.cpu_usage_pct || 0) }
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ minWidth: 100 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                                    <Typography variant="caption" sx={{ color: getUsageColor(vm.memory_usage_pct || 0), fontWeight: 600 }}>
                                                        {(vm.memory_usage_pct || 0).toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(vm.memory_usage_pct || 0, 100)}
                                                    sx={{
                                                        height: 5, borderRadius: 3,
                                                        bgcolor: alpha(theme.palette.grey[300], 0.4),
                                                        '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: getUsageColor(vm.memory_usage_pct || 0) }
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function HostDetailPage() {
    const { hostId } = useParams<{ hostId: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const queryClient = useQueryClient();
    const getHealth = useHealthStyles();
    const [activeTab, setActiveTab] = useState(0);

    const { data: host, isLoading, error } = useQuery<HostDetail>({
        queryKey: ['host-detail', hostId],
        queryFn: () => hostsApi.getDetail(hostId!).then(r => r.data),
        enabled: !!hostId,
        refetchInterval: 60000,
    });

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton width={200} height={40} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 3 }} />
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
            </Box>
        );
    }

    if (error || !host) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    ไม่พบข้อมูลโฮสต์ที่ต้องการ หรือเกิดข้อผิดพลาดในการโหลดข้อมูล
                </Alert>
            </Box>
        );
    }

    const health = getHealth(host.health_status);
    const cpuPct = (host.cpu_usage_ratio || 0) * 100;
    const memPct = (host.memory_usage_ratio || 0) * 100;

    const tabs = [
        { label: '📋 ข้อมูลทั่วไป',            icon: <InfoIcon /> },
        { label: '📈 ประสิทธิภาพการทำงาน',    icon: <CpuIcon /> },
        { label: `🖥️ เครื่องเสมือน (${host.vm_total ?? 0})`, icon: <VmIcon /> },
    ];

    return (
        <Box sx={{ minHeight: '100vh', py: 3 }}>
            {/* ─── Header ─── */}
            <Box sx={{ px: { xs: 2, md: 3 }, mb: 3 }}>
                {/* Breadcrumb */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton size="small" onClick={() => navigate('/hosts')} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                        <BackIcon fontSize="small" color="primary" />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                        Host Detail /
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{host.host_name}</Typography>
                </Box>

                {/* Host Title Card */}
                <Card sx={{
                    borderRadius: 4,
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(health.color, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`
                        : `linear-gradient(135deg, ${alpha(health.color, 0.06)} 0%, #ffffff 100%)`,
                    border: `1px solid ${alpha(health.color, 0.2)}`,
                    overflow: 'visible',
                    position: 'relative',
                }}>
                    {/* Color bar top */}
                    <Box sx={{ height: 5, background: `linear-gradient(90deg, ${health.color} 0%, ${alpha(health.color, 0.5)} 100%)`, borderRadius: '16px 16px 0 0' }} />

                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        <Grid container spacing={2} alignItems="center">
                            {/* Avatar & Name */}
                            <Grid item xs={12} md={5}>
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                                    <Avatar sx={{
                                        width: { xs: 56, sm: 64 }, height: { xs: 56, sm: 64 },
                                        background: `linear-gradient(135deg, ${health.color} 0%, ${alpha(health.color, 0.7)} 100%)`,
                                        boxShadow: `0 8px 20px ${alpha(health.color, 0.35)}`,
                                    }}>
                                        <HostIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'white' }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                            {host.host_name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                            <Chip label={host.az_name || 'ไม่ระบุ AZ'} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                                            {host.cluster_name && <Chip label={host.cluster_name} size="small" variant="outlined" sx={{ borderRadius: 1 }} />}
                                            <Chip
                                                icon={<health.icon fontSize="small" />}
                                                label={health.label}
                                                size="small"
                                                sx={{ bgcolor: health.bg, color: health.color, fontWeight: 700, borderRadius: 1 }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Quick Stats */}
                            <Grid item xs={12} md={7}>
                                <Grid container spacing={2}>
                                    {[
                                        { label: 'CPU', pct: cpuPct, color: getUsageColor(cpuPct), detail: `${mhzToGhz(host.cpu_used_mhz)}/${mhzToGhz(host.cpu_total_mhz)} GHz` },
                                        { label: 'RAM', pct: memPct, color: getUsageColor(memPct), detail: `${mbToGb(host.memory_used_mb)}/${mbToGb(host.memory_total_mb)} GB` },
                                    ].map(({ label, pct, color, detail }) => (
                                        <Grid item xs={6} key={label}>
                                            <Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
                                                    <Typography variant="caption" fontWeight={800} sx={{ color }}>{pct.toFixed(1)}%</Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(pct, 100)}
                                                    sx={{
                                                        height: 8, borderRadius: 4,
                                                        bgcolor: alpha(theme.palette.grey[300], 0.3),
                                                        '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: color }
                                                    }}
                                                />
                                                <Typography variant="caption" color="text.secondary">{detail}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, bgcolor: alpha('#6366f1', 0.05), border: `1px solid ${alpha('#6366f1', 0.1)}` }}>
                                            <VmIcon sx={{ color: '#6366f1', fontSize: 24 }} />
                                            <Box>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: '#6366f1', lineHeight: 1 }}>{host.vm_total ?? 0}</Typography>
                                                <Typography variant="caption" color="text.secondary">VM ทั้งหมด ({host.vm_running ?? 0} เปิดอยู่)</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1, height: '100%' }}>
                                            <Tooltip title="รีเฟรชข้อมูล">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => queryClient.invalidateQueries({ queryKey: ['host-detail', hostId] })}
                                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                                                >
                                                    <RefreshIcon fontSize="small" color="primary" />
                                                </IconButton>
                                            </Tooltip>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ClockIcon sx={{ fontSize: 14 }} /> อัปเดตล่าสุด
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                                    {formatThaiDate(host.last_synced_at || host.updated_at)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Box>

            {/* ─── Tabs ─── */}
            <Box sx={{ px: { xs: 2, md: 3 } }}>
                <Paper sx={{ borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem', minHeight: 52 },
                            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                        }}
                    >
                        {tabs.map((tab, i) => (
                            <Tab key={i} label={tab.label} />
                        ))}
                    </Tabs>
                </Paper>

                <Box sx={{ pt: 3 }}>
                    {activeTab === 0 && <GeneralInfoTab host={host} />}
                    {activeTab === 1 && <PerformanceTab hostId={hostId!} />}
                    {activeTab === 2 && <VMsTab hostId={hostId!} />}
                </Box>
            </Box>
        </Box>
    );
}
