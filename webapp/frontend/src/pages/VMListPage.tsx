import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    useTheme,
    useMediaQuery,
    Grid,
    ToggleButtonGroup,
    ToggleButton,
    alpha,
    Button,
    Tooltip,
    TablePagination,
    CircularProgress,
    Fade,
    Skeleton,
} from '@mui/material';
import {
    Search as SearchIcon,
    Stop as StoppedIcon,
    GridView as GridViewIcon,
    TableRows as TableViewIcon,
    Refresh as RefreshIcon,
    Sort as SortIcon,
    PowerSettingsNew as PowerIcon,
    DashboardCustomize as DashboardIcon,
    QueryStats as QueryStatsIcon,
    FilterListOff as ClearFiltersIcon,
    HighlightOff as RemoveIcon,
    DeleteSweep as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vmsApi, dashboardApi } from '../services/api';
import type { VM, GroupSummary } from '../types';
import { useThemeStore } from '../stores/themeStore';

// Import new components
import VMSummaryCards from '../components/vm/VMSummaryCards';
import ModernVMTable from '../components/vm/ModernVMTable';
import ModernVMGrid from '../components/vm/ModernVMGrid';

export default function VMListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { mode } = useThemeStore();
    const queryClient = useQueryClient();

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>(
        isMobile ? 'grid' : 'table'
    );

    // Initialize state from URL params
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [groupId, setGroupId] = useState(searchParams.get('group') || '');
    const [azName, setAzName] = useState(searchParams.get('az') || '');
    const [storageMin, setStorageMin] = useState<number | null>(() => {
        const v = searchParams.get('storage_min');
        return v ? Number(v) : null;
    });
    const [showDeleted, setShowDeleted] = useState(searchParams.get('show_deleted') === 'true');
    // Default sort by power state (online first)
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'power_state');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams.get('order') as 'asc' | 'desc' || 'desc');

    const [page, setPage] = useState(parseInt(searchParams.get('page') || '0', 10));
    const [pageSize, setPageSize] = useState(parseInt(searchParams.get('size') || '25', 10));

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (groupId) params.set('group', groupId);
        if (azName) params.set('az', azName);
        if (storageMin !== null && storageMin !== undefined) params.set('storage_min', String(storageMin));
        if (showDeleted) params.set('show_deleted', 'true');
        // Avoid cluttering URL when using the default sort
        if (sortBy && sortBy !== 'power_state') params.set('sort', sortBy);
        if (sortOrder !== 'desc') params.set('order', sortOrder);
        if (page > 0) params.set('page', page.toString());
        if (pageSize !== 25) params.set('size', pageSize.toString());
        setSearchParams(params, { replace: true });
    }, [search, status, groupId, azName, storageMin, showDeleted, sortBy, sortOrder, page, pageSize, setSearchParams]);

    const [searchInput, setSearchInput] = useState(search);

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            setSearch(searchInput);
            setPage(0);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    // Update search input when 'search' state changes (e.g. from Clear All)
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    // Fetch groups for filter
    const { data: groups } = useQuery<{ data: GroupSummary[] }>({
        queryKey: ['groups'],
        queryFn: () => dashboardApi.getGroups(),
        staleTime: 10 * 60 * 1000, // 10 minutes - groups rarely change
        gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    });

    // Fetch VMs with optimized caching
    const { data: vmsData, isLoading, refetch } = useQuery({
        queryKey: ['vms', page, pageSize, search, status, groupId, azName, storageMin, showDeleted, sortBy, sortOrder],
        queryFn: () =>
            vmsApi.getList({
                page: page + 1,
                page_size: pageSize,
                search: search || undefined,
                status: status || undefined,
                group_id: groupId || undefined,
                az_name: azName || undefined,
                storage_min: storageMin != null ? storageMin : undefined,
                show_deleted: showDeleted,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            }),
        staleTime: 3 * 60 * 1000, // 3 minutes - VM data doesn't change frequently
        gcTime: 15 * 60 * 1000, // 15 minutes - keep pagination in cache (renamed from cacheTime in v5)
        placeholderData: (previousData) => previousData, // Show previous page data while loading (was keepPreviousData in v4)
        refetchInterval: 60000, // Auto-refresh every 60s (less aggressive)
    });

    // Fetch all available AZs from backend (persistent list)
    const { data: azListData } = useQuery<string[]>({
        queryKey: ['azs'],
        queryFn: () => dashboardApi.getAZs(),
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });

    const azNames = azListData || [];

    const vms: VM[] = vmsData?.data?.items || [];
    const total = vmsData?.data?.total || 0;
    const groupsData = groups?.data || []; // Default empty array for groups

    // Prefetch next page for faster navigation
    useEffect(() => {
        const totalPages = Math.ceil(total / pageSize);
        const nextPage = page + 1;

        // Only prefetch if not on last page and not loading
        if (nextPage < totalPages && !isLoading) {
            queryClient.prefetchQuery({
                queryKey: ['vms', nextPage, pageSize, search, status, groupId, azName, storageMin, showDeleted, sortBy, sortOrder],
                queryFn: () =>
                    vmsApi.getList({
                        page: nextPage + 1,
                        page_size: pageSize,
                        search: search || undefined,
                        status: status || undefined,
                        group_id: groupId || undefined,
                        az_name: azName || undefined,
                        storage_min: storageMin != null ? storageMin : undefined,
                        show_deleted: showDeleted,
                        sort_by: sortBy || undefined,
                        sort_order: sortOrder || undefined,
                    }),
                staleTime: 3 * 60 * 1000,
            });
        }
    }, [page, pageSize, search, status, groupId, azName, storageMin, showDeleted, sortBy, sortOrder, total, isLoading, queryClient]);

    // Helper to normalize percent (accepts 0..1 or 0..100, returns 0..100)
    const normalizePercent = (value: number | null | undefined) => {
        if (value === null || value === undefined) return 0;
        return value <= 1 ? value * 100 : value;
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const running = vms.filter(vm => vm.power_state === 'on').length;
        const stopped = vms.filter(vm => vm.power_state !== 'on').length;
        const protected_vms = vms.filter(vm => vm.in_protection).length;
        const avgCpu = vms.reduce((acc, vm) => acc + (vm.cpu_usage || 0), 0) / (vms.length || 1);
        const avgMemory = vms.reduce((acc, vm) => acc + (vm.memory_usage || 0), 0) / (vms.length || 1);
        const totalStorage = vms.reduce((acc, vm) => acc + (vm.storage_total_mb || 0), 0);
        const usedStorage = vms.reduce((acc, vm) => acc + (vm.storage_used_mb || 0), 0);
        const avgStorageUsage = vms.reduce((acc, vm) => acc + normalizePercent(vm.storage_usage || 0), 0) / (vms.length || 1);
        const highStorageCount = vms.filter(vm => normalizePercent(vm.storage_usage || 0) > 80).length;

        return {
            total: vms.length,
            running,
            stopped,
            protected: protected_vms,
            avgCpu: avgCpu * 100,
            avgMemory: avgMemory * 100,
            totalStorage,
            usedStorage,
            avgStorageUsage,
            highStorageCount,
        };
    }, [vms]);

    const formatUsage = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-';
        return `${normalizePercent(value).toFixed(1)}%`;
    };

    const formatStorage = (mb: number | null) => {
        if (!mb) return '-';
        if (mb >= 1024 * 1024) return `${(mb / 1024 / 1024).toFixed(1)} TB`;
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb.toFixed(0)} MB`;
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
            bg: 'rgba(239, 68, 68, 0.08)'
        }; // Critical Red
        if (percentage >= 75) return {
            main: '#f97316',
            light: '#fb923c',
            dark: '#ea580c',
            bg: 'rgba(249, 115, 22, 0.08)'
        }; // Danger Orange  
        if (percentage >= 60) return {
            main: '#eab308',
            light: '#fbbf24',
            dark: '#ca8a04',
            bg: 'rgba(234, 179, 8, 0.08)'
        }; // Warning Yellow
        if (percentage >= 40) return {
            main: '#22c55e',
            light: '#4ade80',
            dark: '#16a34a',
            bg: 'rgba(34, 197, 94, 0.08)'
        }; // Good Green
        return {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
            bg: 'rgba(16, 185, 129, 0.08)'
        }; // Excellent Green
    };

    const handleFilterClick = (type: string, value: string) => {
        if (type === 'status') {
            // Special 'high-load' value triggers storage filter > 80%
            if (value === 'high-load') {
                setStatus('');
                setStorageMin(80);
            } else {
                setStatus(value);
                setStorageMin(null);
            }
            setPage(0);
        }

        if (type === 'storage') {
            const n = Number(value);
            setStorageMin(isNaN(n) ? null : n);
            setPage(0);
        }
    };

    const handleClearAll = () => {
        setSearch('');
        setStatus('');
        setGroupId('');
        setAzName('');
        setStorageMin(null);
        setShowDeleted(false);
        setPage(0);
    };

    const activeFiltersCount = [search, status, groupId, azName].filter(Boolean).length + (storageMin ? 1 : 0) + (showDeleted ? 1 : 0);

    return (
        <Box className="animate-fade-in" sx={{ pb: { xs: 4, md: 8 } }}>
            {/* Enhanced Page Header with Gradient Background */}
            <Card
                sx={{
                    mb: { xs: 2, md: 4 },
                    borderRadius: 4,
                    background: mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(34, 197, 94, 0.08) 50%, rgba(139, 92, 246, 0.08) 100%)',
                    border: '2px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #0ea5e9, #22c55e, #8b5cf6, #0ea5e9)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 3s linear infinite',
                    },
                }}
            >
                <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 2, md: 3 } }}>
                        <Box sx={{ flex: 1, minWidth: { xs: 0, sm: 280 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                                <Box
                                    sx={{
                                        width: { xs: 44, sm: 56 },
                                        height: { xs: 44, sm: 56 },
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 8px 16px rgba(14, 165, 233, 0.3)',
                                        animation: 'float 6s ease-in-out infinite',
                                    }}
                                >
                                    <DashboardIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: '#fff' }} />
                                </Box>
                                <Box>
                                    <Typography
                                        variant="h3"
                                        sx={{
                                            fontWeight: 900,
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)',
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                                            letterSpacing: '-0.02em',
                                        }}
                                    >
                                        Virtual Machines
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            mt: 0.5,
                                        }}
                                    >
                                        <QueryStatsIcon sx={{ fontSize: 18 }} />
                                        จัดการและมอนิเตอร์ VM ทั้งหมด · แสดง {vms.length} จาก {total} เครื่อง
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Button
                                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                                onClick={() => refetch()}
                                variant="outlined"
                                size="large"
                                disabled={isLoading}
                                sx={{
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 3,
                                    py: 1.5,
                                    borderWidth: 2,
                                    borderColor: alpha(theme.palette.primary.main, 0.5),
                                    color: 'primary.main',
                                    '&:hover': {
                                        borderWidth: 2,
                                        borderColor: 'primary.main',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        transform: 'translateY(-2px)',
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {isLoading ? 'กำลังโหลด...' : 'รีเฟรช'}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <VMSummaryCards stats={stats} formatStorage={formatStorage} onFilterClick={handleFilterClick} />

            {/* Enhanced Filters & View Toggle */}
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 4,
                    background: mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.15),
                    boxShadow: mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                        : '0 8px 32px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 4s ease infinite',
                    }
                }}
                className="glass-card"
            >
                <CardContent sx={{ p: { xs: 1.5, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
                    <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2.5 }, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        {/* Enhanced Search Box */}
                        <TextField
                            placeholder="ค้นหา VM ตามชื่อ หรือ IP..."
                            size="medium"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            fullWidth={isMobile}
                            sx={{
                                minWidth: { xs: '100%', sm: 280 },
                                flex: { xs: '1 1 100%', sm: 1 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.02),
                                    fontWeight: 500,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.04),
                                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                                    },
                                    '&.Mui-focused': {
                                        bgcolor: mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.04),
                                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                    }
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Enhanced Filter Controls */}
                        <FormControl
                            size="medium"
                            fullWidth={isMobile}
                            sx={{
                                minWidth: { xs: '100%', sm: 150 },
                                flex: { xs: '1 1 100%', sm: 'none' },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.02),
                                    fontWeight: 600,
                                    '&:hover': {
                                        bgcolor: mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.04),
                                    }
                                }
                            }}
                        >
                            <InputLabel sx={{ fontWeight: 600 }}>สถานะ</InputLabel>
                            <Select
                                value={status}
                                label="สถานะ"
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="">ทั้งหมด</MenuItem>
                                <MenuItem value="on">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PowerIcon sx={{ fontSize: 18, color: '#10b981' }} />
                                        ทำงาน
                                    </Box>
                                </MenuItem>
                                <MenuItem value="off">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <StoppedIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                                        หยุด
                                    </Box>
                                </MenuItem>
                                <MenuItem value="deleted">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <DeleteIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                                        ลบแล้ว
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl
                            size="medium"
                            fullWidth={isMobile}
                            sx={{
                                minWidth: { xs: '100%', sm: 200 },
                                flex: { xs: '1 1 100%', sm: 'none' },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.02),
                                    fontWeight: 600,
                                    '&:hover': {
                                        bgcolor: mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.04),
                                    }
                                }
                            }}
                        >
                            <InputLabel sx={{ fontWeight: 600 }}>กลุ่ม</InputLabel>
                            <Select
                                value={groupId}
                                label="กลุ่ม"
                                onChange={(e) => {
                                    setGroupId(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="">ทุกกลุ่ม</MenuItem>
                                <MenuItem value="ungrouped">ไม่มีกลุ่ม</MenuItem>
                                {groupsData.map((g) => (
                                    <MenuItem key={g.group_id} value={g.group_id}>
                                        {g.group_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Show Deleted Toggle */}
                        <Button
                            variant={showDeleted ? "contained" : "outlined"}
                            color={showDeleted ? "error" : "inherit"}
                            onClick={() => { setShowDeleted(!showDeleted); setPage(0); }}
                            startIcon={<DeleteIcon />}
                            fullWidth={isMobile}
                            sx={{
                                height: { xs: 48, sm: 56 },
                                px: { xs: 2, sm: 3 },
                                flex: { xs: '1 1 100%', sm: 'none' },
                                borderRadius: 3,
                                borderColor: showDeleted ? 'error.main' : alpha(theme.palette.text.disabled, 0.3),
                                color: showDeleted ? '#fff' : 'text.secondary',
                                background: showDeleted ? theme.palette.error.main : 'transparent',
                                fontWeight: 600,
                                '&:hover': {
                                    background: showDeleted ? theme.palette.error.dark : alpha(theme.palette.text.primary, 0.05),
                                    borderColor: showDeleted ? 'error.dark' : 'text.primary',
                                }
                            }}
                        >
                            {showDeleted ? "Hide Deleted" : "Show Deleted"}
                        </Button>


                        {/* Zone & Sort in one row */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flexWrap: { xs: 'nowrap', md: 'wrap' },
                            width: '100%',
                            maxWidth: '100%',
                            minWidth: 0,
                            overflowX: { xs: 'auto', md: 'visible' },
                            pb: { xs: 1, md: 0 },
                            '&::-webkit-scrollbar': {
                                height: 6,
                                display: { xs: 'block', md: 'none' },
                            },
                            '&::-webkit-scrollbar-track': {
                                background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                borderRadius: 3,
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                borderRadius: 3,
                                '&:hover': {
                                    background: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                                },
                            },
                        }}>
                            <Typography variant="caption" sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                flexShrink: 0,
                            }}>
                                Zone
                            </Typography>
                            <Chip
                                label="ทั้งหมด"
                                size="medium"
                                clickable
                                onClick={() => { setAzName(''); setPage(0); }}
                                sx={{
                                    height: { xs: 32, md: 36 },
                                    px: { xs: 1.2, md: 1.5 },
                                    flexShrink: 0,
                                    fontWeight: 700,
                                    fontSize: { xs: '0.8rem', md: '0.875rem' },
                                    borderRadius: { xs: '16px', md: '18px' },
                                    background: azName === ''
                                        ? 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #22c55e 100%)'
                                        : 'transparent',
                                    color: azName === '' ? '#fff' : 'text.primary',
                                    border: azName === '' ? 'none' : '2px solid',
                                    borderColor: alpha(theme.palette.primary.main, 0.3),
                                    boxShadow: azName === ''
                                        ? '0 4px 14px rgba(14, 165, 233, 0.4)'
                                        : 'none',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        transform: 'translateY(-2px) scale(1.05)',
                                        boxShadow: azName === ''
                                            ? '0 6px 20px rgba(14, 165, 233, 0.5)'
                                            : `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                                        borderColor: 'primary.main',
                                    }
                                }}
                            />

                            {azNames.map((az, idx) => {
                                const isSelected = azName === String(az);
                                const gradients = [
                                    'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)',
                                    'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
                                    'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%)',
                                ];
                                const gradient = gradients[idx % gradients.length];

                                return (
                                    <Chip
                                        key={`az-chip-${idx}`}
                                        label={String(az)}
                                        size="medium"
                                        clickable
                                        onClick={() => { setAzName(String(az)); setPage(0); }}
                                        sx={{
                                            height: { xs: 32, md: 36 },
                                            px: { xs: 1.2, md: 1.5 },
                                            flexShrink: 0,
                                            fontWeight: 700,
                                            fontSize: { xs: '0.8rem', md: '0.875rem' },
                                            borderRadius: { xs: '16px', md: '18px' },
                                            background: isSelected ? gradient : 'transparent',
                                            color: isSelected ? '#fff' : 'text.primary',
                                            border: isSelected ? 'none' : '2px solid',
                                            borderColor: isSelected ? undefined : alpha(theme.palette.secondary.main, 0.3),
                                            boxShadow: isSelected
                                                ? '0 4px 14px rgba(139, 92, 246, 0.4)'
                                                : 'none',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                transform: 'translateY(-2px) scale(1.05)',
                                                boxShadow: isSelected
                                                    ? '0 6px 20px rgba(139, 92, 246, 0.5)'
                                                    : `0 4px 12px ${alpha(theme.palette.secondary.main, 0.2)}`,
                                                borderColor: 'secondary.main',
                                            }
                                        }}
                                    />
                                );
                            })}

                            <Box sx={{ width: '2px', height: 32, bgcolor: 'divider', mx: 1, flexShrink: 0 }} />

                            <Typography variant="caption" sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                flexShrink: 0,
                            }}>
                                เรียง
                            </Typography>

                            <FormControl
                                size="small"
                                sx={{
                                    minWidth: { xs: 120, sm: 140 },
                                    flexShrink: 0,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        bgcolor: mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.02),
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        '&:hover': {
                                            bgcolor: mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.04),
                                        }
                                    }
                                }}
                            >
                                <Select
                                    value={sortBy}
                                    onChange={(e) => {
                                        setSortBy(e.target.value);
                                        setPage(0);
                                    }}
                                >
                                    <MenuItem value="power_state">สถานะ</MenuItem>
                                    <MenuItem value="name">ชื่อ</MenuItem>
                                    <MenuItem value="ip_address">IP Address</MenuItem>
                                    <MenuItem value="cpu_usage">CPU Usage</MenuItem>
                                    <MenuItem value="memory_usage">Memory Usage</MenuItem>
                                </Select>
                            </FormControl>

                            <IconButton
                                size="small"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    flexShrink: 0,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    borderRadius: 2.5,
                                    border: '2px solid',
                                    borderColor: alpha(theme.palette.primary.main, 0.3),
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                                        borderColor: 'primary.main',
                                        transform: 'rotate(180deg)',
                                    },
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                <Tooltip title={sortOrder === 'asc' ? 'น้อย → มาก' : 'มาก → น้อย'}>
                                    <SortIcon
                                        sx={{
                                            transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.4s',
                                            color: 'primary.main',
                                            fontSize: 20,
                                        }}
                                    />
                                </Tooltip>
                            </IconButton>
                        </Box>

                        {/* View Toggle for Mobile is removed as mobile only supports Grid View */}

                        {!isMobile && (
                            <Box sx={{ ml: 'auto', borderLeft: '1px solid', borderColor: 'divider', pl: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                {/* Top Pagination */}
                                <TablePagination
                                    component="div"
                                    count={total}
                                    page={page}
                                    onPageChange={(_, newPage) => setPage(newPage)}
                                    rowsPerPage={pageSize}
                                    onRowsPerPageChange={(e) => {
                                        setPageSize(parseInt(e.target.value, 10));
                                        setPage(0);
                                    }}
                                    labelRowsPerPage="ต่อหน้า:"
                                    sx={{
                                        borderBottom: 'none',
                                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                            fontWeight: 600,
                                        },
                                        '& .MuiTablePagination-select': {
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            ml: 1,
                                            mr: 2,
                                        }
                                    }}
                                />

                                <ToggleButtonGroup
                                    value={viewMode}
                                    exclusive
                                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                                    size="small"
                                    sx={{ '& .MuiToggleButton-root': { borderRadius: 2 } }}
                                >
                                    <ToggleButton value="grid" aria-label="grid view">
                                        <GridViewIcon />
                                    </ToggleButton>
                                    <ToggleButton value="table" aria-label="table view">
                                        <TableViewIcon />
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>



            {/* Active Filter Pills Row */}
            {
                activeFiltersCount > 0 && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 3,
                        px: 1,
                        flexWrap: 'wrap',
                        animation: 'fade-in 0.3s ease-out'
                    }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Active Filters:
                        </Typography>

                        {search && (
                            <Chip
                                label={`Search: ${search}`}
                                size="small"
                                onDelete={() => { setSearch(''); setPage(0); }}
                                deleteIcon={<RemoveIcon />}
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.primary.main, 0.2)
                                }}
                            />
                        )}

                        {status && (
                            <Chip
                                label={`Status: ${status === 'on' ? 'Active' : 'Offline'}`}
                                size="small"
                                onDelete={() => { setStatus(''); setPage(0); }}
                                deleteIcon={<RemoveIcon />}
                                sx={{
                                    bgcolor: status === 'on' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                                    color: status === 'on' ? 'success.main' : 'error.main',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: status === 'on' ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.2)
                                }}
                            />
                        )}

                        {groupId && (
                            <Chip
                                label={`Group: ${groupsData.find(g => g.group_id === groupId)?.group_name || groupId}`}
                                size="small"
                                onDelete={() => { setGroupId(''); setPage(0); }}
                                deleteIcon={<RemoveIcon />}
                                sx={{
                                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                    color: 'secondary.main',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.secondary.main, 0.2)
                                }}
                            />
                        )}

                        {azName && (
                            <Chip
                                label={`AZ: ${azName}`}
                                size="small"
                                onDelete={() => { setAzName(''); setPage(0); }}
                                deleteIcon={<RemoveIcon />}
                                sx={{
                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                    color: 'warning.main',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.warning.main, 0.2)
                                }}
                            />
                        )}

                        {storageMin != null && (
                            <Chip
                                label={`Storage ≥ ${storageMin}%`}
                                size="small"
                                onDelete={() => { setStorageMin(null); setPage(0); }}
                                deleteIcon={<RemoveIcon />}
                                sx={{
                                    bgcolor: alpha('#ef4444', 0.08),
                                    color: '#ef4444',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: alpha('#ef4444', 0.12)
                                }}
                            />
                        )}

                        {showDeleted && (
                            <Chip
                                label="Show Deleted: Yes"
                                size="small"
                                onDelete={() => { setShowDeleted(false); setPage(0); }}
                                deleteIcon={<RemoveIcon />}
                                sx={{
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    color: 'error.main',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.error.main, 0.2)
                                }}
                            />
                        )}

                        <Button
                            size="small"
                            startIcon={<ClearFiltersIcon />}
                            onClick={handleClearAll}
                            sx={{
                                ml: 'auto',
                                color: 'text.secondary',
                                fontWeight: 800,
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }
                            }}
                        >
                            Clear All
                        </Button>
                    </Box>
                )
            }

            {/* Mobile Pagination if needed */}
            {
                isMobile && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={pageSize}
                            onRowsPerPageChange={(e) => {
                                setPageSize(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            labelRowsPerPage=""
                        />
                    </Box>
                )
            }

            {/* Content Area */}
            {
                isLoading ? (
                    <Fade in={true}>
                        <Box>
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: { xs: 6, md: 12 },
                                gap: { xs: 2, md: 3 }
                            }}>
                                <CircularProgress size={60} thickness={4} />
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                        กำลังโหลดข้อมูล VM
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        กรุณารอสักครู่...
                                    </Typography>
                                </Box>
                            </Box>
                            <Grid container spacing={2} sx={{ mt: 2 }}>
                                {[1, 2, 3, 4, 5, 6].map((item) => (
                                    <Grid item xs={12} sm={6} md={4} key={item}>
                                        <Skeleton
                                            variant="rectangular"
                                            sx={{
                                                height: 220,
                                                width: '100%',
                                                borderRadius: 3,
                                                animation: 'pulse 1.5s ease-in-out infinite'
                                            }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Fade>
                ) : isMobile || viewMode === 'grid' ? (
                    <ModernVMGrid
                        vms={vms}
                        getUsageColor={getUsageColor}
                        formatUsage={formatUsage}
                        formatStorage={formatStorage}
                    />
                ) : (
                    <ModernVMTable
                        vms={vms}
                        formatUsage={formatUsage}
                        formatStorage={formatStorage}
                        getUsageColor={getUsageColor}
                    />
                )
            }

            {/* Empty State */}
            {
                !isLoading && vms.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: { xs: 4, md: 8 }, opacity: 0.7 }}>
                        <Typography variant="h6" color="text.secondary">
                            ไม่พบข้อมูล Virtual Machine
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            ลองปรับตัวกรองค้นหาใหม่
                        </Typography>
                    </Box>
                )
            }

            {/* Bottom Pagination for convenience */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(e) => {
                        setPageSize(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage={isMobile ? '' : 'จำนวนต่อหน้า:'}
                    sx={{
                        borderRadius: { xs: 2, md: 4 },
                        bgcolor: mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                        border: '1px solid',
                        borderColor: 'divider',
                        '& .MuiTablePagination-toolbar': {
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            px: { xs: 1, sm: 2 },
                        },
                        '& .MuiTablePagination-spacer': {
                            display: { xs: 'none', sm: 'block' },
                        },
                    }}
                />
            </Box>
        </Box >
    );
}
