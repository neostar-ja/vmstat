import { Box, Typography, Grid, Card, CardContent, Chip, useTheme, alpha } from '@mui/material';
import { Memory, Storage, MonitorHeart, CloudQueue, DeveloperBoard } from '@mui/icons-material';

export default function VMSnapshotTab({ data, filterConfig }: { data: any, filterConfig: any }) {
    const theme = useTheme();
    if (!filterConfig || !data) return <EmptyState />;

    const snapshot = data.snapshot || {};
    const health = data.health || {};

    const powerColor = snapshot.power_state === 'RUNNING' ? 'success' : 'error';
    const score = health.score || 0;
    const scoreColor = score >= 80 ? 'success.main' : score >= 50 ? 'warning.main' : 'error.main';

    return (
        <Box className="space-y-6">
            {/* Header Section */}
            <Card
                sx={{
                    borderRadius: 3,
                    boxShadow: theme.shadows[2],
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                }}
            >
                <CardContent className="p-6">
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4" fontWeight={800} gutterBottom>
                                {snapshot.vm_name || 'Unknown VM'}
                            </Typography>
                            <Box className="flex items-center gap-2 mb-4">
                                <Chip
                                    label={snapshot.power_state || 'UNKNOWN'}
                                    color={powerColor}
                                    size="small"
                                    sx={{ fontWeight: 700 }}
                                />
                                <Chip
                                    label={snapshot.os_name || 'Unknown OS'}
                                    variant="outlined"
                                    size="small"
                                />
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={4}>
                                    <DetailItem label="vCPU" value={`${snapshot.vcpu || 0} Cores`} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                    <DetailItem label="vRAM" value={`${((snapshot.vram_mb || 0) / 1024).toFixed(1)} GB`} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                    <DetailItem label="Disk" value={`${snapshot.disk_total_gb || 0} GB`} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                    <DetailItem label="Host" value={snapshot.host_name || '-'} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                    <DetailItem label="Group" value={snapshot.group_name || '-'} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                    <DetailItem label="AZ" value={filterConfig.az === 'all' ? 'All AZ' : filterConfig.az} />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 4, mb: 2 }}>
                Current Metrics
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="CPU Usage"
                        value={`${snapshot.cpu_usage_pct || 0}%`}
                        icon={<DeveloperBoard />}
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="RAM Usage"
                        value={`${snapshot.memory_usage_pct || 0}%`}
                        icon={<Memory />}
                        color={theme.palette.secondary.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Disk Usage"
                        value={`${snapshot.disk_usage_pct || 0}%`}
                        icon={<Storage />}
                        color={theme.palette.warning.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={2.4}>
                    <KpiCard
                        title="Alarms"
                        value={health.issues ? health.issues.length : 0}
                        icon={<MonitorHeart />}
                        color={health.issues && health.issues.length > 0 ? theme.palette.error.main : theme.palette.success.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={2.4}>
                    <KpiCard
                        title="Health Score"
                        value={`${score}/100`}
                        icon={<CloudQueue />}
                        color={scoreColor}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}

function DetailItem({ label, value }: { label: string, value: string | number }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} noWrap>
                {value}
            </Typography>
        </Box>
    );
}

function KpiCard({ title, value, icon, color }: { title: string, value: string | number, icon: any, color: string }) {
    const theme = useTheme();
    return (
        <Card
            sx={{
                borderRadius: 3,
                boxShadow: theme.shadows[1],
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    backgroundColor: color
                }}
            />
            <CardContent sx={{ p: '24px !important' }}>
                <Box className="flex justify-between items-start mb-2">
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        {title}
                    </Typography>
                    <Box sx={{ color: color, opacity: 0.8 }}>
                        {icon}
                    </Box>
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
}

function EmptyState() {
    return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">กรุณาเลือก VM และกดสร้างรายงาน</Typography>
        </Box>
    );
}
