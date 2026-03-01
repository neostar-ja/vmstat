import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    Grid,
    Divider,
    Alert,
    CircularProgress,
    Button,
    Stack,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Alarm as AlarmIcon,
    Schedule as ScheduleIcon,
    Category as CategoryIcon,
    Description as DescriptionIcon,
    Lightbulb as RecommendationIcon,
    Source as SourceIcon,
    DateRange as DateIcon,
    Update as UpdateIcon,
    Repeat as RepeatIcon,
} from '@mui/icons-material';
import { alarmsApi } from '../services/api';

const getSeverityMeta = (severity: string | null) => {
    const s = (severity || '').toLowerCase();
    if (s === 'p1' || s === 'critical') return { label: 'Critical P1', color: '#ef4444', bg: '#fef2f2', icon: ErrorIcon };
    if (s === 'p2' || s === 'warning')  return { label: 'Warning P2',  color: '#f97316', bg: '#fff7ed', icon: WarningIcon };
    if (s === 'p3' || s === 'info')     return { label: 'Info P3',     color: '#3b82f6', bg: '#eff6ff', icon: InfoIcon };
    return { label: 'Platform Alert', color: '#8b5cf6', bg: '#f5f3ff', icon: AlarmIcon };
};

const formatDateTime = (dt: string | null | undefined) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const InfoRow = ({ icon: Icon, label, value, color }: any) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
        <Icon sx={{ color: color || 'primary.main', mt: 0.3, fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.3 }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

export default function AlarmDetailPage() {
    const { alarmId } = useParams<{ alarmId: string }>();
    const navigate = useNavigate();

    const { data: alarmResponse, isLoading, error } = useQuery({
        queryKey: ['alarm', alarmId],
        queryFn: () => alarmsApi.getDetail(parseInt(alarmId!)),
        enabled: !!alarmId,
    });

    const alarm = alarmResponse?.data;

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Failed to load alarm details: {(error as Error).message}
                </Alert>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/alarms')} sx={{ mt: 2 }}>
                    Back to Alarms
                </Button>
            </Box>
        );
    }

    if (!alarm) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">Alarm not found</Alert>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/alarms')} sx={{ mt: 2 }}>
                    Back to Alarms
                </Button>
            </Box>
        );
    }

    const meta = getSeverityMeta(alarm.severity);
    const SeverityIcon = meta.icon;
    const isAlert = !alarm.severity;

    return (
        <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/alarms')} sx={{ bgcolor: 'background.paper' }}>
                    <BackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AlarmIcon sx={{ color: meta.color, fontSize: 32 }} />
                        Alarm Detail
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Alarm ID: {alarm.alarm_id}
                    </Typography>
                </Box>
                <Chip
                    label={alarm.status === 'open' ? 'OPEN' : 'CLOSED'}
                    color={alarm.status === 'open' ? 'error' : 'success'}
                    icon={alarm.status === 'open' ? <WarningIcon /> : <CheckCircleIcon />}
                    sx={{ fontWeight: 700, fontSize: '0.9rem', px: 1 }}
                />
            </Box>

            <Grid container spacing={3}>
                {/* Left Column - Primary Info */}
                <Grid item xs={12} md={8}>
                    {/* Severity & Title Card */}
                    <Card sx={{ mb: 3, borderLeft: `6px solid ${meta.color}` }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                <Box sx={{
                                    bgcolor: meta.bg,
                                    color: meta.color,
                                    p: 1.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <SeverityIcon sx={{ fontSize: 32 }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Chip
                                        label={meta.label}
                                        sx={{
                                            bgcolor: meta.bg,
                                            color: meta.color,
                                            fontWeight: 700,
                                            border: `1.5px solid ${meta.color}`,
                                            mb: 1,
                                        }}
                                    />
                                    <Typography variant="h5" fontWeight={700} sx={{ color: isAlert ? '#7c3aed' : 'text.primary' }}>
                                        {isAlert && '💜 '}
                                        {alarm.title || 'Platform Alert'}
                                    </Typography>
                                    {alarm.alert_count > 1 && (
                                        <Chip
                                            icon={<RepeatIcon />}
                                            label={`Occurred ${alarm.alert_count} times`}
                                            size="small"
                                            color="warning"
                                            sx={{ mt: 1, fontWeight: 600 }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <InfoRow
                                icon={DescriptionIcon}
                                label="Description"
                                value={alarm.description || '—'}
                                color="#3b82f6"
                            />
                        </CardContent>
                    </Card>

                    {/* Recommendation Card */}
                    {alarm.recommendation && (
                        <Card sx={{ mb: 3, bgcolor: '#fffbeb', borderLeft: '6px solid #f59e0b' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    <RecommendationIcon sx={{ color: '#f59e0b', fontSize: 28, mt: 0.2 }} />
                                    <Box>
                                        <Typography variant="h6" fontWeight={700} color="#b45309" gutterBottom>
                                            Recommendation
                                        </Typography>
                                        <Typography variant="body1" color="text.primary">
                                            {alarm.recommendation}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    )}

                    {/* Resource Info Card */}
                    {alarm.resource_name && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CategoryIcon sx={{ color: 'primary.main' }} />
                                    Resource Information
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            icon={CategoryIcon}
                                            label="Object Type"
                                            value={
                                                <Chip
                                                    label={alarm.object_type.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alarm.object_type === 'vm' ? '#3b82f6' :
                                                                 alarm.object_type === 'host' ? '#f97316' :
                                                                 alarm.object_type === 'cluster' ? '#8b5cf6' : '#64748b',
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            icon={DescriptionIcon}
                                            label="Resource Name"
                                            value={alarm.resource_name}
                                        />
                                    </Grid>
                                    {alarm.group_name && (
                                        <Grid item xs={12} sm={6}>
                                            <InfoRow
                                                icon={CategoryIcon}
                                                label="Group"
                                                value={alarm.group_name}
                                            />
                                        </Grid>
                                    )}
                                    {alarm.resource_id && (
                                        <Grid item xs={12} sm={6}>
                                            <InfoRow
                                                icon={InfoIcon}
                                                label="Resource ID"
                                                value={alarm.resource_id}
                                            />
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}
                </Grid>

                {/* Right Column - Metadata */}
                <Grid item xs={12} md={4}>
                    {/* Timeline Card */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ScheduleIcon sx={{ color: 'primary.main' }} />
                                Timeline
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={2}>
                                <InfoRow
                                    icon={DateIcon}
                                    label="Started"
                                    value={formatDateTime(alarm.begin_time)}
                                    color="#10b981"
                                />
                                {alarm.end_time && (
                                    <InfoRow
                                        icon={CheckCircleIcon}
                                        label="Ended"
                                        value={formatDateTime(alarm.end_time)}
                                        color="#059669"
                                    />
                                )}
                                <InfoRow
                                    icon={DateIcon}
                                    label="Created"
                                    value={formatDateTime(alarm.created_at)}
                                    color="#6366f1"
                                />
                                {alarm.updated_at && (
                                    <InfoRow
                                        icon={UpdateIcon}
                                        label="Last Updated"
                                        value={formatDateTime(alarm.updated_at)}
                                        color="#8b5cf6"
                                    />
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Source & Classification Card */}
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SourceIcon sx={{ color: 'primary.main' }} />
                                Classification
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={2}>
                                <InfoRow
                                    icon={SourceIcon}
                                    label="Source"
                                    value={
                                        <Chip
                                            label={alarm.source.toUpperCase()}
                                            size="small"
                                            sx={{
                                                bgcolor: alarm.source === 'system' ? '#8b5cf6' :
                                                         alarm.source === 'host' ? '#f97316' : '#3b82f6',
                                                color: '#fff',
                                                fontWeight: 700,
                                            }}
                                        />
                                    }
                                />
                                {alarm.vm_uuid && (
                                    <InfoRow
                                        icon={InfoIcon}
                                        label="VM UUID"
                                        value={
                                            <Tooltip title="Click to view VM details">
                                                <Button
                                                    size="small"
                                                    onClick={() => navigate(`/vms/${alarm.vm_uuid}`)}
                                                    sx={{ p: 0, fontSize: '0.75rem', textTransform: 'none' }}
                                                >
                                                    {alarm.vm_uuid?.substring(0, 18)}...
                                                </Button>
                                            </Tooltip>
                                        }
                                    />
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Actions Card */}
                    <Card sx={{ mt: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<BackIcon />}
                                    onClick={() => navigate('/alarms')}
                                >
                                    Back to Alarms List
                                </Button>
                                {alarm.vm_uuid && (
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => navigate(`/vms/${alarm.vm_uuid}`)}
                                    >
                                        View VM Details
                                    </Button>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
