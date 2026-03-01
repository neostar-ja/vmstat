/**
 * VMDetailPage2.tsx - Modern Mobile-First VM Detail
 * Clean, responsive design using MUI + TailwindCSS
 * Supports dark/light mode with excellent mobile UX
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    useTheme,
    alpha,
    Skeleton,
    Tab,
    Tabs,
    CircularProgress,
    LinearProgress,
    Button,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    Dns as CpuIcon,
    Cloud as CloudIcon,
    VerifiedUser as ShieldIcon,
    NetworkCheck as NetworkIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Speed as SpeedIcon,
    Computer as ComputerIcon,
    TrendingUp as TrendingUpIcon,
    Backup as BackupIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    ContentCopy as CopyIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';
import { vmsApi, metricsApi } from '../services/api';
import type { VMDetail, VMDisk, VMNetwork } from '../types';
import { useThemeStore } from '../stores/themeStore';
import { SiUbuntu, SiCentos, SiRedhat, SiLinux, SiDebian } from 'react-icons/si';
import { BsWindows } from 'react-icons/bs';

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════
const getOSInfo = (osType: string | null | undefined, osName: string | null | undefined) => {
    const type = (osType || '').toLowerCase();
    const name = (osName || '').toLowerCase();

    if (type.includes('windows') || name.includes('windows') || /^ws\d/.test(type)) {
        return { icon: <BsWindows />, color: '#0078D7', label: 'Windows' };
    }
    if (name.includes('ubuntu')) {
        return { icon: <SiUbuntu />, color: '#E95420', label: 'Ubuntu' };
    }
    if (name.includes('centos')) {
        return { icon: <SiCentos />, color: '#932279', label: 'CentOS' };
    }
    if (name.includes('red hat') || name.includes('rhel')) {
        return { icon: <SiRedhat />, color: '#EE0000', label: 'Red Hat' };
    }
    if (name.includes('debian')) {
        return { icon: <SiDebian />, color: '#A81D33', label: 'Debian' };
    }
    if (type.includes('linux') || name.includes('linux') || /^l\d/.test(type)) {
        return { icon: <SiLinux />, color: '#FCC624', label: 'Linux' };
    }
    return { icon: <ComputerIcon />, color: '#6b7280', label: 'Unknown' };
};

const getUsageColor = (pct: number) => {
    if (pct >= 90) return { main: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'Critical' };
    if (pct >= 75) return { main: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', label: 'Warning' };
    if (pct >= 50) return { main: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', label: 'Moderate' };
    return { main: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Good' };
};

const formatBytes = (mb: number | null) => {
    if (!mb) return '-';
    if (mb >= 1024 * 1024) return `${(mb / 1024 / 1024).toFixed(1)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
};

const formatUptime = (seconds: number | null | undefined, powerState?: string | null) => {
    if (powerState === 'off' || powerState === 'stopped') return 'ไม่ทำงาน';
    if (seconds === null || seconds === undefined || seconds === 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
};

const normalizePercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 0;
    return value <= 1 ? value * 100 : value;
};

const formatNetworkSpeed = (bitps: number | null) => {
    if (!bitps) return '0';
    if (bitps >= 1e9) return `${(bitps / 1e9).toFixed(1)} Gbps`;
    if (bitps >= 1e6) return `${(bitps / 1e6).toFixed(1)} Mbps`;
    if (bitps >= 1e3) return `${(bitps / 1e3).toFixed(1)} Kbps`;
    return `${bitps.toFixed(0)} bps`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Metric Card Component
// ═══════════════════════════════════════════════════════════════════════════════
interface MetricCardProps {
    title: string;
    value: number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const usageColor = getUsageColor(value);

    return (
        <Box sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
            border: '1px solid',
            borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ color, fontSize: 18, display: 'flex' }}>{icon}</Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                    {title}
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: usageColor.main, lineHeight: 1 }}>
                    {value.toFixed(0)}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: usageColor.main }}>%</Typography>
            </Box>

            <LinearProgress
                variant="determinate"
                value={Math.min(value, 100)}
                sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: usageColor.bg,
                    '& .MuiLinearProgress-bar': {
                        bgcolor: usageColor.main,
                        borderRadius: 3,
                    },
                }}
            />

            {subtitle && (
                <Typography sx={{ mt: 1, fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Info Row Component
// ═══════════════════════════════════════════════════════════════════════════════
interface InfoRowProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    copyable?: boolean;
}

function InfoRow({ label, value, icon, copyable }: InfoRowProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof value === 'string') {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon && <Box sx={{ color: 'text.secondary', fontSize: 18, display: 'flex' }}>{icon}</Box>}
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontWeight: 500 }}>
                    {label}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary', textAlign: 'right' }}>
                    {value || '-'}
                </Typography>
                {copyable && typeof value === 'string' && value && (
                    <IconButton size="small" onClick={handleCopy} sx={{ ml: 0.5 }}>
                        {copied ? <CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                )}
            </Box>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section Component
// ═══════════════════════════════════════════════════════════════════════════════
interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Box sx={{
            borderRadius: 3,
            bgcolor: isDark ? alpha('#fff', 0.02) : '#fff',
            border: '1px solid',
            borderColor: isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06),
            overflow: 'hidden',
            mb: 2,
        }}>
            <Box
                onClick={() => setOpen(!open)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    cursor: 'pointer',
                    bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                    '&:hover': { bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.04) },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: '#3b82f6', fontSize: 20, display: 'flex' }}>{icon}</Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
                </Box>
                {open ? <CollapseIcon /> : <ExpandIcon />}
            </Box>
            {open && <Box sx={{ p: 2 }}>{children}</Box>}
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Performance Chart Component
// ═══════════════════════════════════════════════════════════════════════════════
interface ChartData {
    time: string;
    cpu: number;
    memory: number;
    timestamp: string;
}

interface PerformanceChartProps {
    data: ChartData[];
    isLoading: boolean;
}

function PerformanceChart({ data, isLoading }: PerformanceChartProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    if (isLoading) {
        return <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />;
    }

    if (!data.length) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">ไม่มีข้อมูลประสิทธิภาพ</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1)} />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                        axisLine={{ stroke: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1) }}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                        axisLine={{ stroke: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1) }}
                    />
                    <RechartsTooltip
                        contentStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            border: '1px solid',
                            borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
                            borderRadius: 8,
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="cpu"
                        name="CPU"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        strokeWidth={2}
                    />
                    <Area
                        type="monotone"
                        dataKey="memory"
                        name="RAM"
                        stroke="#ec4899"
                        fill="#ec4899"
                        fillOpacity={0.2}
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function VMDetailPage2() {
    const { vmUuid } = useParams<{ vmUuid: string }>();
    const navigate = useNavigate();
    const { mode } = useThemeStore();
    const isDark = mode === 'dark';

    const [activeTab, setActiveTab] = useState(0);

    // Fetch VM Detail
    const { data: vmData, isLoading: vmLoading, refetch } = useQuery<{ data: VMDetail }>({
        queryKey: ['vm-detail', vmUuid],
        queryFn: () => vmsApi.getDetail(vmUuid!),
        enabled: !!vmUuid,
        staleTime: 2 * 60 * 1000,
    });

    // Fetch Metrics
    const { data: metricsData, isLoading: metricsLoading } = useQuery({
        queryKey: ['vm-metrics-history', vmUuid, '7d'],
        queryFn: () => metricsApi.getVMHistory(vmUuid!, { time_range: '7d' }),
        enabled: !!vmUuid && activeTab === 1,
        staleTime: 60 * 1000,
    });

    // Fetch Disks
    const { data: disksData, isLoading: disksLoading } = useQuery<{ data: VMDisk[] }>({
        queryKey: ['vm-disks', vmUuid],
        queryFn: () => vmsApi.getDisks(vmUuid!),
        enabled: !!vmUuid && activeTab === 2,
    });

    // Fetch Networks
    const { data: networksData, isLoading: networksLoading } = useQuery<{ data: VMNetwork[] }>({
        queryKey: ['vm-networks', vmUuid],
        queryFn: () => vmsApi.getNetworks(vmUuid!),
        enabled: !!vmUuid && activeTab === 3,
    });

    const vm = vmData?.data;
    const disks = disksData?.data || [];
    const networks = networksData?.data || [];

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!metricsData?.data?.series) return [];
        const cpuData = metricsData.data.series.cpu?.data || [];
        const memoryData = metricsData.data.series.memory?.data || [];

        const map = new Map<string, ChartData>();
        cpuData.forEach((item: any) => {
            const time = new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            map.set(item.timestamp, { time, timestamp: item.timestamp, cpu: item.value || 0, memory: 0 });
        });
        memoryData.forEach((item: any) => {
            const existing = map.get(item.timestamp);
            if (existing) {
                existing.memory = item.value || 0;
            }
        });

        return Array.from(map.values()).slice(-48);
    }, [metricsData]);

    const os = getOSInfo(vm?.os_type, vm?.os_name);
    const isOn = vm?.power_state === 'on';
    const cpuPct = normalizePercent(vm?.cpu_usage);
    const memPct = normalizePercent(vm?.memory_usage);
    const storPct = normalizePercent(vm?.storage_usage);

    // Loading state
    if (vmLoading) {
        return (
            <Box sx={{ p: 2 }}>
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 2 }} />
                <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3, mb: 2 }} />
                <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
            </Box>
        );
    }

    // Not found
    if (!vm) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', pt: 8 }}>
                <WarningIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    ไม่พบ VM
                </Typography>
                <Button variant="contained" onClick={() => navigate('/vms2')} sx={{ mt: 2 }}>
                    กลับหน้ารายการ
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 10 }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: isDark
                    ? `linear-gradient(180deg, ${os.color} 0%, ${alpha(os.color, 0.3)} 100%)`
                    : `linear-gradient(180deg, ${os.color} 0%, ${alpha(os.color, 0.5)} 100%)`,
                pt: 2,
                pb: 3,
                px: 2,
            }}>
                {/* Back Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <IconButton
                        onClick={() => navigate('/vms2')}
                        sx={{
                            bgcolor: alpha('#fff', 0.2),
                            '&:hover': { bgcolor: alpha('#fff', 0.3) },
                        }}
                    >
                        <BackIcon sx={{ color: '#fff' }} />
                    </IconButton>
                    <IconButton
                        onClick={() => refetch()}
                        sx={{
                            bgcolor: alpha('#fff', 0.2),
                            '&:hover': { bgcolor: alpha('#fff', 0.3) },
                        }}
                    >
                        <RefreshIcon sx={{ color: '#fff' }} />
                    </IconButton>
                </Box>

                {/* VM Header Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.2),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        color: '#fff',
                    }}>
                        {os.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                            fontWeight: 800,
                            fontSize: '1.3rem',
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {vm.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Box sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: isOn ? '#22c55e' : '#ef4444',
                                boxShadow: `0 0 8px ${isOn ? '#22c55e' : '#ef4444'}`,
                            }} />
                            <Typography sx={{ color: alpha('#fff', 0.9), fontSize: '0.85rem', fontWeight: 500 }}>
                                {isOn ? 'กำลังทำงาน' : 'หยุดทำงาน'} · {formatUptime(vm.uptime_seconds, vm.power_state)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ px: 2, mt: -1.5 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 44,
                        bgcolor: isDark ? alpha('#fff', 0.05) : '#fff',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08),
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTab-root': {
                            minHeight: 44,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            borderRadius: 2.5,
                            mx: 0.5,
                            '&.Mui-selected': {
                                bgcolor: '#3b82f6',
                                color: '#fff',
                            },
                        },
                    }}
                >
                    <Tab label="ภาพรวม" />
                    <Tab label="ประสิทธิภาพ" />
                    <Tab label="ที่เก็บข้อมูล" />
                    <Tab label="เครือข่าย" />
                </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2 }}>
                {/* Tab 0: Overview */}
                {activeTab === 0 && (
                    <>
                        {/* Performance Metrics */}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 1.5,
                            mb: 2,
                        }}>
                            <MetricCard
                                title="CPU"
                                value={cpuPct}
                                subtitle={vm.cpu_cores ? `${vm.cpu_cores} vCPU` : undefined}
                                icon={<CpuIcon />}
                                color="#3b82f6"
                            />
                            <MetricCard
                                title="RAM"
                                value={memPct}
                                subtitle={formatBytes(vm.memory_total_mb)}
                                icon={<MemoryIcon />}
                                color="#ec4899"
                            />
                            <MetricCard
                                title="DISK"
                                value={storPct}
                                subtitle={formatBytes(vm.storage_total_mb)}
                                icon={<StorageIcon />}
                                color="#14b8a6"
                            />
                        </Box>

                        {/* Basic Info */}
                        <Section title="ข้อมูลทั่วไป" icon={<InfoIcon />}>
                            <InfoRow label="UUID" value={vm.vm_uuid} icon={<ComputerIcon />} copyable />
                            <InfoRow label="ระบบปฏิบัติการ" value={vm.os_display_name || vm.os_name || '-'} />
                            <InfoRow label="โซน" value={vm.az_name} icon={<CloudIcon />} />
                            <InfoRow label="Host" value={vm.host_name} />
                            <InfoRow label="กลุ่ม" value={vm.group_name_path || vm.group_name} />
                            <InfoRow label="IP Address" value={vm.ip_address} icon={<NetworkIcon />} copyable />
                            <InfoRow label="MAC Address" value={vm.mac_address} copyable />
                        </Section>

                        {/* Protection */}
                        <Section title="การป้องกัน" icon={<ShieldIcon />}>
                            <InfoRow
                                label="สถานะ"
                                value={
                                    <Chip
                                        size="small"
                                        label={vm.in_protection ? 'Protected' : 'ไม่ Protection'}
                                        sx={{
                                            fontWeight: 600,
                                            bgcolor: vm.in_protection ? alpha('#22c55e', 0.15) : alpha('#ef4444', 0.15),
                                            color: vm.in_protection ? '#22c55e' : '#ef4444',
                                        }}
                                    />
                                }
                            />
                            {vm.protection_name && <InfoRow label="Protection Name" value={vm.protection_name} />}
                            <InfoRow label="Backup Count" value={vm.backup_file_count ?? 0} icon={<BackupIcon />} />
                        </Section>
                    </>
                )}

                {/* Tab 1: Performance */}
                {activeTab === 1 && (
                    <>
                        <Section title="กราฟประสิทธิภาพ (7 วัน)" icon={<TrendingUpIcon />}>
                            <PerformanceChart data={chartData} isLoading={metricsLoading} />
                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#3b82f6' }} />
                                    <Typography variant="caption" fontWeight={600}>CPU</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#ec4899' }} />
                                    <Typography variant="caption" fontWeight={600}>RAM</Typography>
                                </Box>
                            </Box>
                        </Section>

                        <Section title="Realtime Metrics" icon={<SpeedIcon />}>
                            <InfoRow label="CPU Usage" value={`${cpuPct.toFixed(1)}%`} />
                            <InfoRow label="Memory Usage" value={`${memPct.toFixed(1)}%`} />
                            <InfoRow label="Storage Usage" value={`${storPct.toFixed(1)}%`} />
                            <InfoRow label="Network Read" value={formatNetworkSpeed(vm.network_read_bitps)} />
                            <InfoRow label="Network Write" value={formatNetworkSpeed(vm.network_write_bitps)} />
                            <InfoRow label="Disk Read IOPS" value={vm.disk_read_iops ?? '-'} />
                            <InfoRow label="Disk Write IOPS" value={vm.disk_write_iops ?? '-'} />
                        </Section>
                    </>
                )}

                {/* Tab 2: Storage */}
                {activeTab === 2 && (
                    <Section title="ที่เก็บข้อมูล" icon={<StorageIcon />}>
                        {disksLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : disks.length === 0 ? (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                ไม่พบข้อมูล Disk
                            </Typography>
                        ) : (
                            disks.map((disk, idx) => (
                                <Box key={idx} sx={{
                                    p: 2,
                                    mb: 1.5,
                                    borderRadius: 2,
                                    bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                                    border: '1px solid',
                                    borderColor: isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06),
                                }}>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                                        {disk.storage_name || disk.storage_file || `Disk ${idx + 1}`}
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">ขนาด</Typography>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                {formatBytes(disk.size_mb)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Preallocate</Typography>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                {disk.preallocate || '-'}
                                            </Typography>
                                        </Box>
                                        {disk.storage_id && (
                                            <Box sx={{ gridColumn: '1 / -1' }}>
                                                <Typography variant="caption" color="text.secondary">Storage ID</Typography>
                                                <Typography fontWeight={500} sx={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                                    {disk.storage_id}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Section>
                )}

                {/* Tab 3: Network */}
                {activeTab === 3 && (
                    <Section title="เครือข่าย" icon={<NetworkIcon />}>
                        {networksLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : networks.length === 0 ? (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                ไม่พบข้อมูล Network
                            </Typography>
                        ) : (
                            networks.map((net, idx) => (
                                <Box key={idx} sx={{
                                    p: 2,
                                    mb: 1.5,
                                    borderRadius: 2,
                                    bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                                    border: '1px solid',
                                    borderColor: isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06),
                                }}>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                                        {net.network_name || `Network ${idx + 1}`}
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">IP Address</Typography>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                {net.ip_address || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">MAC Address</Typography>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                {net.mac_address || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Model</Typography>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                {net.model || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Subnet</Typography>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                {net.subnet_name || net.cidr || '-'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Section>
                )}
            </Box>
        </Box>
    );
}
