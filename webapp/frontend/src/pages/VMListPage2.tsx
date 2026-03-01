/**
 * VMListPage2.tsx - Modern Mobile-First VM List
 * Clean, responsive design using MUI + TailwindCSS
 * Supports dark/light mode with excellent mobile UX
 */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    useTheme,
    alpha,
    Skeleton,
    Fade,
    CircularProgress,
    LinearProgress,
    Button,
    SwipeableDrawer,
    Badge,
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    Dns as CpuIcon,
    Cloud as CloudIcon,
    VerifiedUser as ShieldIcon,
    NetworkCheck as NetworkIcon,
    DeleteForever as DeletedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { vmsApi, dashboardApi } from '../services/api';
import type { VM } from '../types';
import { useThemeStore } from '../stores/themeStore';
import { SiUbuntu, SiCentos, SiRedhat, SiLinux, SiDebian } from 'react-icons/si';
import { BsWindows } from 'react-icons/bs';

// ═══════════════════════════════════════════════════════════════════════════════
// OS Detection Helper
// ═══════════════════════════════════════════════════════════════════════════════
const getOSInfo = (osType: string | null | undefined, osName: string | null | undefined) => {
    const type = (osType || '').toLowerCase();
    const name = (osName || '').toLowerCase();

    if (type.includes('windows') || name.includes('windows') || /^ws\d/.test(type)) {
        return { icon: <BsWindows />, color: '#0078D7', label: 'Windows', bg: 'rgba(0, 120, 215, 0.1)' };
    }
    if (name.includes('ubuntu')) {
        return { icon: <SiUbuntu />, color: '#E95420', label: 'Ubuntu', bg: 'rgba(233, 84, 32, 0.1)' };
    }
    if (name.includes('centos')) {
        return { icon: <SiCentos />, color: '#932279', label: 'CentOS', bg: 'rgba(147, 34, 121, 0.1)' };
    }
    if (name.includes('red hat') || name.includes('rhel')) {
        return { icon: <SiRedhat />, color: '#EE0000', label: 'Red Hat', bg: 'rgba(238, 0, 0, 0.1)' };
    }
    if (name.includes('debian')) {
        return { icon: <SiDebian />, color: '#A81D33', label: 'Debian', bg: 'rgba(168, 29, 51, 0.1)' };
    }
    if (type.includes('linux') || name.includes('linux') || /^l\d/.test(type)) {
        return { icon: <SiLinux />, color: '#FCC624', label: 'Linux', bg: 'rgba(252, 198, 36, 0.1)' };
    }
    return { icon: <CpuIcon />, color: '#6b7280', label: 'Unknown', bg: 'rgba(107, 114, 128, 0.1)' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Usage Color Helper
// ═══════════════════════════════════════════════════════════════════════════════
const getUsageColor = (pct: number) => {
    if (pct >= 90) return { main: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (pct >= 75) return { main: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    if (pct >= 50) return { main: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
    return { main: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Format Helpers
// ═══════════════════════════════════════════════════════════════════════════════
const normalizePercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 0;
    return value <= 1 ? value * 100 : value;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Compact VM Card Component (Mobile-first)
// ═══════════════════════════════════════════════════════════════════════════════
interface VMCardProps {
    vm: VM;
    onClick: () => void;
}

function VMCard({ vm, onClick }: VMCardProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const os = getOSInfo(vm.os_type, vm.os_name);
    const isOn = vm.power_state === 'on';

    const cpuPct = normalizePercent(vm.cpu_usage);
    const memPct = normalizePercent(vm.memory_usage);
    const storPct = normalizePercent(vm.storage_usage);

    const cpuColor = getUsageColor(cpuPct);
    const memColor = getUsageColor(memPct);
    const storColor = getUsageColor(storPct);

    return (
        <Box
            onClick={onClick}
            sx={{
                p: 2,
                borderRadius: 3,
                cursor: 'pointer',
                background: isDark
                    ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid',
                borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                        ? `0 8px 30px ${alpha('#000', 0.4)}`
                        : `0 8px 30px ${alpha('#000', 0.1)}`,
                    borderColor: isOn ? '#22c55e' : '#ef4444',
                },
                '&:active': {
                    transform: 'scale(0.98)',
                },
            }}
        >
            {/* Header: Status + Name + OS */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                {/* Status Dot */}
                <Box sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    mt: 0.7,
                    flexShrink: 0,
                    bgcolor: isOn ? '#22c55e' : '#ef4444',
                    boxShadow: `0 0 8px ${isOn ? '#22c55e' : '#ef4444'}`,
                }} />

                {/* VM Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            lineHeight: 1.3,
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {vm.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                        <Box sx={{ color: os.color, fontSize: 14, display: 'flex' }}>{os.icon}</Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {vm.os_display_name || os.label}
                        </Typography>
                    </Box>
                </Box>

                {/* Deleted Badge */}
                {vm.is_deleted && (
                    <Chip
                        icon={<DeletedIcon sx={{ fontSize: '14px !important' }} />}
                        label="ถูกลบ"
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            bgcolor: alpha('#ef4444', 0.15),
                            color: '#ef4444',
                            fontWeight: 700,
                        }}
                    />
                )}
            </Box>

            {/* Metrics Bar */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                {/* CPU */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem' }}>
                            CPU
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: cpuColor.main, fontSize: '0.65rem' }}>
                            {cpuPct.toFixed(0)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(cpuPct, 100)}
                        sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: cpuColor.bg,
                            '& .MuiLinearProgress-bar': { bgcolor: cpuColor.main, borderRadius: 2 },
                        }}
                    />
                </Box>

                {/* Memory */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem' }}>
                            RAM
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: memColor.main, fontSize: '0.65rem' }}>
                            {memPct.toFixed(0)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(memPct, 100)}
                        sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: memColor.bg,
                            '& .MuiLinearProgress-bar': { bgcolor: memColor.main, borderRadius: 2 },
                        }}
                    />
                </Box>

                {/* Storage */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem' }}>
                            DISK
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: storColor.main, fontSize: '0.65rem' }}>
                            {storPct.toFixed(0)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(storPct, 100)}
                        sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: storColor.bg,
                            '& .MuiLinearProgress-bar': { bgcolor: storColor.main, borderRadius: 2 },
                        }}
                    />
                </Box>
            </Box>

            {/* Footer: Tags */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                {vm.az_name && (
                    <Chip
                        icon={<CloudIcon sx={{ fontSize: '12px !important' }} />}
                        label={vm.az_name}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: isDark ? alpha('#3b82f6', 0.15) : alpha('#3b82f6', 0.1),
                            color: '#3b82f6',
                            '& .MuiChip-icon': { color: '#3b82f6' },
                        }}
                    />
                )}
                {vm.in_protection && (
                    <Chip
                        icon={<ShieldIcon sx={{ fontSize: '12px !important' }} />}
                        label="Protected"
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: isDark ? alpha('#22c55e', 0.15) : alpha('#22c55e', 0.1),
                            color: '#22c55e',
                            '& .MuiChip-icon': { color: '#22c55e' },
                        }}
                    />
                )}
                {vm.ip_address && (
                    <Chip
                        icon={<NetworkIcon sx={{ fontSize: '12px !important' }} />}
                        label={vm.ip_address.split(',')[0]}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: isDark ? alpha('#8b5cf6', 0.15) : alpha('#8b5cf6', 0.1),
                            color: '#8b5cf6',
                            '& .MuiChip-icon': { color: '#8b5cf6' },
                        }}
                    />
                )}
            </Box>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filter Drawer Component
// ═══════════════════════════════════════════════════════════════════════════════
interface FilterDrawerProps {
    open: boolean;
    onClose: () => void;
    onOpen: () => void;
    azNames: string[];
    selectedAz: string;
    setSelectedAz: (az: string) => void;
    status: string;
    setStatus: (s: string) => void;
    showDeleted: boolean;
    setShowDeleted: (v: boolean) => void;
    onClear: () => void;
}

function FilterDrawer({
    open,
    onClose,
    onOpen,
    azNames,
    selectedAz,
    setSelectedAz,
    status,
    setStatus,
    showDeleted,
    setShowDeleted,
    onClear,
}: FilterDrawerProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={onOpen}
            disableSwipeToOpen
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    maxHeight: '70vh',
                    bgcolor: isDark ? '#1e293b' : '#fff',
                },
            }}
        >
            <Box sx={{ p: 3, pb: 4 }}>
                {/* Handle */}
                <Box sx={{
                    width: 40,
                    height: 4,
                    bgcolor: 'divider',
                    borderRadius: 2,
                    mx: 'auto',
                    mb: 3,
                }} />

                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700}>ตัวกรอง</Typography>
                    <Button size="small" onClick={onClear} sx={{ fontWeight: 600 }}>ล้างทั้งหมด</Button>
                </Box>

                {/* Status Filter */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary' }}>
                    สถานะ
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                    {[
                        { value: '', label: 'ทั้งหมด' },
                        { value: 'on', label: 'กำลังทำงาน', color: '#22c55e' },
                        { value: 'off', label: 'หยุดทำงาน', color: '#ef4444' },
                    ].map((opt) => (
                        <Chip
                            key={opt.value}
                            label={opt.label}
                            onClick={() => { setStatus(opt.value); }}
                            sx={{
                                fontWeight: 600,
                                bgcolor: status === opt.value ? (opt.color || 'primary.main') : 'transparent',
                                color: status === opt.value ? '#fff' : 'text.primary',
                                border: '1.5px solid',
                                borderColor: status === opt.value ? (opt.color || 'primary.main') : 'divider',
                            }}
                        />
                    ))}
                </Box>

                {/* Zone Filter */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary' }}>
                    โซน (AZ)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                    <Chip
                        label="ทั้งหมด"
                        onClick={() => setSelectedAz('')}
                        sx={{
                            fontWeight: 600,
                            bgcolor: selectedAz === '' ? 'primary.main' : 'transparent',
                            color: selectedAz === '' ? '#fff' : 'text.primary',
                            border: '1.5px solid',
                            borderColor: selectedAz === '' ? 'primary.main' : 'divider',
                        }}
                    />
                    {azNames.map((az) => (
                        <Chip
                            key={az}
                            label={az}
                            onClick={() => setSelectedAz(az)}
                            sx={{
                                fontWeight: 600,
                                bgcolor: selectedAz === az ? '#8b5cf6' : 'transparent',
                                color: selectedAz === az ? '#fff' : 'text.primary',
                                border: '1.5px solid',
                                borderColor: selectedAz === az ? '#8b5cf6' : 'divider',
                            }}
                        />
                    ))}
                </Box>

                {/* Show Deleted */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary' }}>
                    อื่นๆ
                </Typography>
                <Chip
                    icon={<DeletedIcon sx={{ fontSize: '16px !important' }} />}
                    label="แสดง VM ที่ถูกลบ"
                    onClick={() => setShowDeleted(!showDeleted)}
                    sx={{
                        fontWeight: 600,
                        bgcolor: showDeleted ? alpha('#ef4444', 0.15) : 'transparent',
                        color: showDeleted ? '#ef4444' : 'text.primary',
                        border: '1.5px solid',
                        borderColor: showDeleted ? '#ef4444' : 'divider',
                    }}
                />

                {/* Apply Button */}
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        mt: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 700,
                        fontSize: '1rem',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    }}
                >
                    ใช้ตัวกรอง
                </Button>
            </Box>
        </SwipeableDrawer>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stats Summary Component
// ═══════════════════════════════════════════════════════════════════════════════
interface StatsProps {
    total: number;
    running: number;
    stopped: number;
    protectedCount: number;
}

function StatsSummary({ total, running, stopped, protectedCount }: StatsProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const stats = [
        { label: 'ทั้งหมด', value: total, color: '#3b82f6' },
        { label: 'ทำงาน', value: running, color: '#22c55e' },
        { label: 'หยุด', value: stopped, color: '#ef4444' },
        { label: 'Protected', value: protectedCount, color: '#8b5cf6' },
    ];

    return (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            mb: 2,
        }}>
            {stats.map((stat) => (
                <Box
                    key={stat.label}
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isDark ? alpha(stat.color, 0.1) : alpha(stat.color, 0.08),
                        border: '1px solid',
                        borderColor: alpha(stat.color, 0.2),
                        textAlign: 'center',
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: stat.color,
                            lineHeight: 1,
                        }}
                    >
                        {stat.value}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: 'text.secondary',
                            mt: 0.3,
                            textTransform: 'uppercase',
                        }}
                    >
                        {stat.label}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function VMListPage2() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { mode } = useThemeStore();
    const isDark = mode === 'dark';

    // State
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [searchInput, setSearchInput] = useState(search);
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [azName, setAzName] = useState(searchParams.get('az') || '');
    const [showDeleted, setShowDeleted] = useState(searchParams.get('show_deleted') === 'true');
    const [sortBy] = useState(searchParams.get('sort') || 'power_state');
    const [sortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '0', 10));
    const [filterOpen, setFilterOpen] = useState(false);

    const pageSize = 50;

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            setSearch(searchInput);
            setPage(0);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    // URL sync
    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (azName) params.set('az', azName);
        if (showDeleted) params.set('show_deleted', 'true');
        if (sortBy && sortBy !== 'power_state') params.set('sort', sortBy);
        if (sortOrder !== 'desc') params.set('order', sortOrder);
        if (page > 0) params.set('page', page.toString());
        setSearchParams(params, { replace: true });
    }, [search, status, azName, showDeleted, sortBy, sortOrder, page, setSearchParams]);

    // Fetch AZs
    const { data: azListData } = useQuery<string[]>({
        queryKey: ['azs'],
        queryFn: () => dashboardApi.getAZs(),
        staleTime: 5 * 60 * 1000,
    });

    // Fetch VMs
    const { data: vmsData, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['vms', page, pageSize, search, status, azName, showDeleted, sortBy, sortOrder],
        queryFn: () =>
            vmsApi.getList({
                page: page + 1,
                page_size: pageSize,
                search: search || undefined,
                status: status || undefined,
                az_name: azName || undefined,
                show_deleted: showDeleted,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            }),
        staleTime: 60 * 1000,
        placeholderData: (prev) => prev,
        refetchInterval: 60000,
    });

    const azNames = azListData || [];
    const vms: VM[] = vmsData?.data?.items || [];
    const total = vmsData?.data?.total || 0;

    // Stats
    const stats = useMemo(() => {
        const running = vms.filter((vm) => vm.power_state === 'on').length;
        const stopped = vms.filter((vm) => vm.power_state !== 'on').length;
        const protectedVms = vms.filter((vm) => vm.in_protection).length;
        return { total: vms.length, running, stopped, protectedCount: protectedVms };
    }, [vms]);

    const activeFiltersCount = [status, azName].filter(Boolean).length + (showDeleted ? 1 : 0);

    const handleClearFilters = () => {
        setSearch('');
        setSearchInput('');
        setStatus('');
        setAzName('');
        setShowDeleted(false);
        setPage(0);
    };

    const handleVMClick = (vmUuid: string) => {
        navigate(`/vm2/${vmUuid}`);
    };

    const handleLoadMore = () => {
        setPage((p) => p + 1);
    };

    return (
        <Box sx={{ pb: 10 }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                bgcolor: isDark ? '#0f172a' : '#f8fafc',
                borderBottom: '1px solid',
                borderColor: 'divider',
                px: 2,
                pt: 2,
                pb: 1.5,
            }}>
                {/* Title Row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h5" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Virtual Machines
                    </Typography>
                    <IconButton onClick={() => refetch()} disabled={isFetching} size="small">
                        <RefreshIcon sx={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
                    </IconButton>
                </Box>

                {/* Search + Filter */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="ค้นหา VM..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchInput && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchInput('')}>
                                        <CloseIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 2.5,
                                bgcolor: isDark ? alpha('#fff', 0.05) : '#fff',
                                '& fieldset': { borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1) },
                            },
                        }}
                    />
                    <IconButton
                        onClick={() => setFilterOpen(true)}
                        sx={{
                            bgcolor: activeFiltersCount > 0 ? alpha('#3b82f6', 0.15) : (isDark ? alpha('#fff', 0.05) : '#fff'),
                            border: '1px solid',
                            borderColor: activeFiltersCount > 0 ? '#3b82f6' : (isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1)),
                            borderRadius: 2.5,
                        }}
                    >
                        <Badge badgeContent={activeFiltersCount} color="primary">
                            <FilterIcon sx={{ color: activeFiltersCount > 0 ? '#3b82f6' : 'text.secondary' }} />
                        </Badge>
                    </IconButton>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ px: 2, pt: 2 }}>
                {/* Stats */}
                <StatsSummary {...stats} />

                {/* Result Count */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 600 }}>
                    แสดง {vms.length} จาก {total} รายการ
                </Typography>

                {/* Loading State */}
                {isLoading && !vms.length ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: 3 }} />
                        ))}
                    </Box>
                ) : (
                    <>
                        {/* VM List */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {vms.map((vm) => (
                                <Fade key={vm.vm_uuid} in timeout={300}>
                                    <Box>
                                        <VMCard vm={vm} onClick={() => handleVMClick(vm.vm_uuid)} />
                                    </Box>
                                </Fade>
                            ))}
                        </Box>

                        {/* Load More */}
                        {vms.length < total && (
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={handleLoadMore}
                                disabled={isFetching}
                                sx={{
                                    mt: 3,
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                }}
                            >
                                {isFetching ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    `โหลดเพิ่มเติม (${total - vms.length} รายการ)`
                                )}
                            </Button>
                        )}

                        {/* Empty State */}
                        {!isLoading && vms.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <CpuIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" fontWeight={700}>
                                    ไม่พบ VM
                                </Typography>
                                <Typography variant="body2" color="text.disabled">
                                    ลองปรับตัวกรองหรือคำค้นหา
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* Filter Drawer */}
            <FilterDrawer
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                onOpen={() => setFilterOpen(true)}
                azNames={azNames}
                selectedAz={azName}
                setSelectedAz={setAzName}
                status={status}
                setStatus={setStatus}
                showDeleted={showDeleted}
                setShowDeleted={setShowDeleted}
                onClear={handleClearFilters}
            />

            {/* CSS for spin animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </Box>
    );
}
