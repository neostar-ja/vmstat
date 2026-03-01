import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Skeleton,
    LinearProgress,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    useMediaQuery,
    Stack,
} from '@mui/material';
import {
    Search as SearchIcon,
    Dns as HostIcon,
    Computer as VmIcon,
    PlayArrow as RunningIcon,
    Memory as MemoryIcon,
    Speed as CpuIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import type { HostSummary } from '../types';

export default function HostsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [search, setSearch] = useState('');

    // Fetch hosts
    const { data: hostsData, isLoading } = useQuery<{ data: HostSummary[] }>({
        queryKey: ['hosts'],
        queryFn: () => dashboardApi.getHosts(),
    });

    const hosts = hostsData?.data || [];

    // Filter hosts by search
    const filteredHosts = hosts.filter((h: HostSummary) =>
        h.host_name.toLowerCase().includes(search.toLowerCase()) ||
        (h.az_name?.toLowerCase().includes(search.toLowerCase()))
    );

    const getUsageColor = (usage: number) => {
        if (usage >= 80) return 'error.main';
        if (usage >= 60) return 'warning.main';
        return 'success.main';
    };

    return (
        <Box className="animate-fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
            {/* Page Header */}
            <Box sx={{ mb: { xs: 2, md: 4 } }}>
                <Typography
                    variant={isSmallMobile ? 'h5' : 'h4'}
                    sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                    gutterBottom
                >
                    🖥️ Hosts
                </Typography>
                <Typography variant={isSmallMobile ? 'body2' : 'body1'} color="text.secondary">
                    ตรวจสอบเครื่อง Host และการใช้ทรัพยากร
                </Typography>
            </Box>

            {/* Search */}
            <Card sx={{ mb: { xs: 2, md: 3 } }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <TextField
                        placeholder="Search hosts..."
                        size={isSmallMobile ? 'small' : 'medium'}
                        fullWidth
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ maxWidth: { md: 400 } }}
                    />
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
                <Grid item xs={6} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                            <HostIcon sx={{ fontSize: { xs: 28, sm: 36, md: 40 }, color: 'primary.main', mb: { xs: 0.5, md: 1 } }} />
                            <Typography variant={isSmallMobile ? 'h6' : 'h4'} fontWeight={700}>
                                {isLoading ? <Skeleton width={60} sx={{ mx: 'auto' }} /> : hosts.length}
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: 'block', sm: 'none' } }} color="text.secondary">
                                Hosts
                            </Typography>
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }} color="text.secondary">
                                Total Hosts
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                            <VmIcon sx={{ fontSize: { xs: 28, sm: 36, md: 40 }, color: 'secondary.main', mb: { xs: 0.5, md: 1 } }} />
                            <Typography variant={isSmallMobile ? 'h6' : 'h4'} fontWeight={700}>
                                {isLoading ? (
                                    <Skeleton width={60} sx={{ mx: 'auto' }} />
                                ) : (
                                    hosts.reduce((sum: number, h: HostSummary) => sum + h.vm_count, 0)
                                )}
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: 'block', sm: 'none' } }} color="text.secondary">
                                VMs
                            </Typography>
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }} color="text.secondary">
                                Total VMs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                            <CpuIcon sx={{ fontSize: { xs: 28, sm: 36, md: 40 }, color: 'info.main', mb: { xs: 0.5, md: 1 } }} />
                            <Typography variant={isSmallMobile ? 'h6' : 'h4'} fontWeight={700}>
                                {isLoading ? (
                                    <Skeleton width={80} sx={{ mx: 'auto' }} />
                                ) : hosts.length > 0 ? (
                                    `${(hosts.reduce((sum: number, h: HostSummary) => sum + h.cpu_usage_pct, 0) / hosts.length).toFixed(1)}%`
                                ) : (
                                    '0%'
                                )}
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: 'block', sm: 'none' } }} color="text.secondary">
                                CPU
                            </Typography>
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }} color="text.secondary">
                                Avg CPU Usage
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, textAlign: 'center' }}>
                            <MemoryIcon sx={{ fontSize: { xs: 28, sm: 36, md: 40 }, color: 'warning.main', mb: { xs: 0.5, md: 1 } }} />
                            <Typography variant={isSmallMobile ? 'h6' : 'h4'} fontWeight={700}>
                                {isLoading ? (
                                    <Skeleton width={80} sx={{ mx: 'auto' }} />
                                ) : hosts.length > 0 ? (
                                    `${(hosts.reduce((sum: number, h: HostSummary) => sum + h.memory_usage_pct, 0) / hosts.length).toFixed(1)}%`
                                ) : (
                                    '0%'
                                )}
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: 'block', sm: 'none' } }} color="text.secondary">
                                Memory
                            </Typography>
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }} color="text.secondary">
                                Avg Memory Usage
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Hosts Table/Cards */}
            {isLoading ? (
                <Stack spacing={{ xs: 1.5, md: 2 }}>
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} variant="rectangular" height={isMobile ? 180 : 80} sx={{ borderRadius: 2 }} />
                    ))}
                </Stack>
            ) : filteredHosts.length === 0 ? (
                <Card>
                    <CardContent sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}>
                        <HostIcon sx={{ fontSize: { xs: 40, md: 48 }, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">
                            No hosts found
                        </Typography>
                    </CardContent>
                </Card>
            ) : isMobile ? (
                // Mobile Card View
                <Stack spacing={2}>
                    {filteredHosts.map((host: HostSummary) => (
                        <Card key={host.host_id} sx={{ overflow: 'hidden' }}>
                            <CardContent sx={{ p: 2 }}>
                                {/* Host Header */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                background: 'linear-gradient(135deg, #9333ea 0%, #f97316 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <HostIcon fontSize="small" />
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={600}
                                                noWrap
                                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                                            >
                                                {host.host_name}
                                            </Typography>
                                            <Chip
                                                label={host.az_name || 'N/A'}
                                                size="small"
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: '0.7rem', mt: 0.5 }}
                                            />
                                        </Box>
                                    </Box>
                                    <Chip
                                        icon={<RunningIcon sx={{ fontSize: 14 }} />}
                                        label={host.running_vms}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                        sx={{ ml: 1, flexShrink: 0 }}
                                    />
                                </Box>

                                {/* VM Count */}
                                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VmIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>{host.vm_count}</strong> VMs total
                                    </Typography>
                                </Box>

                                {/* CPU Usage */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <CpuIcon sx={{ fontSize: 16, color: 'info.main' }} />
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                CPU
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            sx={{ color: getUsageColor(host.cpu_usage_pct) }}
                                        >
                                            {host.cpu_usage_pct.toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(host.cpu_usage_pct, 100)}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 4,
                                                bgcolor: getUsageColor(host.cpu_usage_pct),
                                            },
                                        }}
                                    />
                                </Box>

                                {/* Memory Usage */}
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <MemoryIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Memory
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            sx={{ color: getUsageColor(host.memory_usage_pct) }}
                                        >
                                            {host.memory_usage_pct.toFixed(1)}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(host.memory_usage_pct, 100)}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 4,
                                                bgcolor: getUsageColor(host.memory_usage_pct),
                                            },
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : (
                // Desktop Table View
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Host Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Availability Zone</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">VMs</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Running</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>CPU Usage</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Memory Usage</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredHosts.map((host: HostSummary) => (
                                    <TableRow key={host.host_id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 2,
                                                        background: 'linear-gradient(135deg, #9333ea 0%, #f97316 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                    }}
                                                >
                                                    <HostIcon fontSize="small" />
                                                </Box>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {host.host_name}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={host.az_name || 'N/A'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={500}>
                                                {host.vm_count}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                icon={<RunningIcon sx={{ fontSize: 14 }} />}
                                                label={host.running_vms}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ minWidth: 150 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        CPU
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={600}
                                                        sx={{ color: getUsageColor(host.cpu_usage_pct) }}
                                                    >
                                                        {host.cpu_usage_pct.toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(host.cpu_usage_pct, 100)}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                        '& .MuiLinearProgress-bar': {
                                                            borderRadius: 3,
                                                            bgcolor: getUsageColor(host.cpu_usage_pct),
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ minWidth: 150 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Memory
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={600}
                                                        sx={{ color: getUsageColor(host.memory_usage_pct) }}
                                                    >
                                                        {host.memory_usage_pct.toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(host.memory_usage_pct, 100)}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                        '& .MuiLinearProgress-bar': {
                                                            borderRadius: 3,
                                                            bgcolor: getUsageColor(host.memory_usage_pct),
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}
        </Box>
    );
}
