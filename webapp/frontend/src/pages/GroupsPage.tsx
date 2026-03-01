import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    useTheme,
} from '@mui/material';
import {
    Search as SearchIcon,
    Folder as GroupIcon,
    Computer as VmIcon,
    PlayArrow as RunningIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import type { GroupSummary } from '../types';

export default function GroupsPage() {
    const navigate = useNavigate();
    const theme = useTheme();
    const [search, setSearch] = useState('');

    // Fetch groups
    const { data: groupsData, isLoading } = useQuery<{ data: GroupSummary[] }>({
        queryKey: ['groups'],
        queryFn: () => dashboardApi.getGroups(),
    });

    const groups = groupsData?.data || [];

    // Filter groups by search
    const filteredGroups = groups.filter((g: GroupSummary) =>
        g.group_name.toLowerCase().includes(search.toLowerCase()) ||
        (g.group_name_path?.toLowerCase().includes(search.toLowerCase()))
    );

    const formatStorage = (mb: number) => {
        if (mb >= 1024 * 1024) return `${(mb / 1024 / 1024).toFixed(1)} TB`;
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb.toFixed(0)} MB`;
    };

    const formatMemory = (mb: number) => {
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb.toFixed(0)} MB`;
    };

    return (
        <Box className="animate-fade-in">
            {/* Page Header */}
            <Box sx={{ mb: 4 }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #0ea5e9 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                    gutterBottom
                >
                    📁 VM Groups
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    เรียกดูและจัดการกลุ่มเครื่องเสมือน
                </Typography>
            </Box>

            {/* Search */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                    <TextField
                        placeholder="Search groups..."
                        size="small"
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
                        sx={{ maxWidth: 400 }}
                    />
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700}>
                                {isLoading ? <Skeleton width={60} sx={{ mx: 'auto' }} /> : groups.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Groups
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <VmIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700}>
                                {isLoading ? (
                                    <Skeleton width={60} sx={{ mx: 'auto' }} />
                                ) : (
                                    groups.reduce((sum: number, g: GroupSummary) => sum + g.total_vms, 0)
                                )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total VMs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <RunningIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700}>
                                {isLoading ? (
                                    <Skeleton width={60} sx={{ mx: 'auto' }} />
                                ) : (
                                    groups.reduce((sum: number, g: GroupSummary) => sum + g.running_vms, 0)
                                )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Running VMs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card className="card-hover">
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <MemoryIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700}>
                                {isLoading ? (
                                    <Skeleton width={80} sx={{ mx: 'auto' }} />
                                ) : (
                                    formatMemory(groups.reduce((sum: number, g: GroupSummary) => sum + g.total_memory_mb, 0))
                                )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Memory
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Groups Grid */}
            {isLoading ? (
                <Grid container spacing={3}>
                    {[...Array(6)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                            <Skeleton variant="rounded" height={200} />
                        </Grid>
                    ))}
                </Grid>
            ) : filteredGroups.length === 0 ? (
                <Card>
                    <CardContent sx={{ p: 6, textAlign: 'center' }}>
                        <GroupIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No groups found
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {filteredGroups.map((group: GroupSummary) => {
                        const runningPercent = group.total_vms > 0 
                            ? (group.running_vms / group.total_vms) * 100 
                            : 0;
                        
                        return (
                            <Grid item xs={12} sm={6} md={4} key={group.group_id}>
                                <Card 
                                    className="card-hover"
                                    sx={{ 
                                        cursor: 'pointer',
                                        '&:hover': { transform: 'translateY(-4px)' },
                                        transition: 'transform 0.2s',
                                    }}
                                    onClick={() => navigate(`/vms?group=${group.group_id}`)}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        {/* Header */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 2,
                                                    background: 'linear-gradient(135deg, #9333ea 0%, #f97316 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                }}
                                            >
                                                <GroupIcon />
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle1" fontWeight={600} noWrap>
                                                    {group.group_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {group.group_name_path || 'Root Group'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* VM Stats */}
                                        <Box sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Running VMs
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {group.running_vms} / {group.total_vms}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={runningPercent}
                                                sx={{
                                                    height: 6,
                                                    borderRadius: 3,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 3,
                                                        bgcolor: 'success.main',
                                                    },
                                                }}
                                            />
                                        </Box>

                                        {/* Resources */}
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip
                                                size="small"
                                                icon={<VmIcon sx={{ fontSize: 14 }} />}
                                                label={`${group.total_cpu_cores} vCPUs`}
                                                variant="outlined"
                                            />
                                            <Chip
                                                size="small"
                                                icon={<MemoryIcon sx={{ fontSize: 14 }} />}
                                                label={formatMemory(group.total_memory_mb)}
                                                variant="outlined"
                                            />
                                            <Chip
                                                size="small"
                                                icon={<StorageIcon sx={{ fontSize: 14 }} />}
                                                label={formatStorage(group.total_storage_mb)}
                                                variant="outlined"
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
}
