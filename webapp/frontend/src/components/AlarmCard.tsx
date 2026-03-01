import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    IconButton,
    Collapse,
    alpha,
    useTheme,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    ExpandMore as ExpandMoreIcon,
    Lightbulb as RecommendationIcon,
    Computer as ComputerIcon,
    Storage as StorageIcon,
    Cloud as CloudIcon,
    AccessTime as TimeIcon,
    Repeat as RepeatIcon,
    ChevronRight as ChevronRightIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { Alarm } from '../types';

interface AlarmCardProps {
    alarm: Alarm;
    onClick: () => void;
}

const getSeverityConfig = (severity: string | null) => {
    const s = (severity || '').toLowerCase();
    if (s === 'p1' || s === 'critical') {
        return {
            label: 'Critical',
            color: '#ef4444',
            bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            darkBgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            icon: <ErrorIcon />,
            pulse: true,
        };
    }
    if (s === 'p2' || s === 'warning') {
        return {
            label: 'Warning',
            color: '#f97316',
            bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
            darkBgGradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
            icon: <WarningIcon />,
            pulse: false,
        };
    }
    if (s === 'p3' || s === 'info') {
        return {
            label: 'Info',
            color: '#3b82f6',
            bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            darkBgGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            icon: <InfoIcon />,
            pulse: false,
        };
    }
    return {
        label: 'Alert',
        color: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        darkBgGradient: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)',
        icon: <CheckCircleIcon />,
        pulse: false,
    };
};

const getSourceIcon = (source: string) => {
    switch (source?.toLowerCase()) {
        case 'vm': return <ComputerIcon />;
        case 'host': return <StorageIcon />;
        case 'system': return <CloudIcon />;
        default: return <CloudIcon />;
    }
};

const formatTime = (time: string | null) => {
    if (!time) return '—';
    // Parse as UTC and display as-is (without timezone conversion)
    const date = new Date(time);
    
    // Format as UTC time to match database storage
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    const monthNamesTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthTH = monthNamesTH[date.getUTCMonth()];
    
    return `${day} ${monthTH} ${hours}:${minutes}`;
};

const getTimeAgo = (time: string | null) => {
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 30) return `${days} วันที่แล้ว`;
    return '';
};

const AlarmCard: React.FC<AlarmCardProps> = ({ alarm, onClick }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [expanded, setExpanded] = useState(false);
    
    const severityConfig = getSeverityConfig(alarm.severity);
    const isOpen = alarm.status === 'open';
    const hasRecommendation = Boolean(alarm.recommendation);

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                // Soft neutral background - not eye-straining
                background: isDark 
                    ? alpha('#1e293b', 0.5)
                    : '#ffffff',
                backdropFilter: 'blur(10px)',
                // Left colored border for severity (not full background)
                borderLeft: `6px solid ${severityConfig.color}`,
                border: `1px solid ${alpha(isDark ? '#475569' : '#e2e8f0', 0.6)}`,
                borderLeftColor: severityConfig.color,
                borderLeftWidth: '6px',
                boxShadow: isDark
                    ? `0 4px 20px ${alpha('#000', 0.3)}, -2px 0 8px ${alpha(severityConfig.color, 0.15)}`
                    : `0 2px 12px ${alpha('#000', 0.06)}, -2px 0 8px ${alpha(severityConfig.color, 0.1)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: isDark
                        ? `0 8px 30px ${alpha('#000', 0.4)}, -3px 0 12px ${alpha(severityConfig.color, 0.3)}`
                        : `0 4px 20px ${alpha('#000', 0.1)}, -3px 0 12px ${alpha(severityConfig.color, 0.2)}`,
                    borderColor: alpha(severityConfig.color, 0.4),
                },
                // Subtle pulse for open P1 alarms
                ...(severityConfig.pulse && isOpen && {
                    animation: 'pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    '@keyframes pulse-border': {
                        '0%, 100%': { 
                            borderLeftColor: severityConfig.color,
                        },
                        '50%': { 
                            borderLeftColor: alpha(severityConfig.color, 0.5),
                        },
                    },
                }),
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                {/* Header Row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    {/* Severity Icon Circle */}
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${alpha(severityConfig.color, isDark ? 0.25 : 0.15)}, ${alpha(severityConfig.color, isDark ? 0.15 : 0.08)})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: severityConfig.color,
                            fontSize: 24,
                            border: `2px solid ${alpha(severityConfig.color, isDark ? 0.3 : 0.2)}`,
                            flexShrink: 0,
                            boxShadow: `0 2px 8px ${alpha(severityConfig.color, 0.2)}`,
                        }}
                    >
                        {severityConfig.icon}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* Badges */}
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
                            <Chip
                                label={severityConfig.label}
                                size="small"
                                sx={{
                                    bgcolor: alpha(severityConfig.color, isDark ? 0.2 : 0.12),
                                    color: isDark ? severityConfig.color : alpha(severityConfig.color, 0.9),
                                    fontWeight: 800,
                                    fontSize: '0.688rem',
                                    border: `1.5px solid ${alpha(severityConfig.color, isDark ? 0.35 : 0.25)}`,
                                    height: 22,
                                    letterSpacing: 0.3,
                                }}
                            />
                            <Chip
                                label={isOpen ? 'OPEN' : 'CLOSED'}
                                size="small"
                                icon={isOpen ? <WarningIcon sx={{ fontSize: 13 }} /> : <CheckCircleIcon sx={{ fontSize: 13 }} />}
                                sx={{
                                    bgcolor: isOpen 
                                        ? alpha(isDark ? '#f87171' : '#dc2626', isDark ? 0.2 : 0.1)
                                        : alpha(isDark ? '#4ade80' : '#16a34a', isDark ? 0.2 : 0.1),
                                    color: isOpen 
                                        ? (isDark ? '#fca5a5' : '#dc2626')
                                        : (isDark ? '#86efac' : '#16a34a'),
                                    border: `1.5px solid ${alpha(isOpen ? '#dc2626' : '#16a34a', isDark ? 0.3 : 0.2)}`,
                                    fontWeight: 700,
                                    fontSize: '0.625rem',
                                    height: 22,
                                }}
                            />
                            {alarm.alert_count > 1 && (
                                <Chip
                                    icon={<RepeatIcon sx={{ fontSize: 12 }} />}
                                    label={`×${alarm.alert_count}`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha('#f59e0b', isDark ? 0.2 : 0.12),
                                        color: isDark ? '#fbbf24' : '#d97706',
                                        border: `1.5px solid ${alpha('#f59e0b', isDark ? 0.3 : 0.25)}`,
                                        fontSize: '0.688rem',
                                        fontWeight: 700,
                                        height: 22,
                                    }}
                                />
                            )}
                        </Stack>

                        {/* Title */}
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                fontSize: '1.05rem',
                                lineHeight: 1.35,
                                color: isDark ? '#f1f5f9' : '#1e293b',
                                mb: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {alarm.title || 'Platform Alert'}
                        </Typography>

                        {/* Description */}
                        {alarm.description && alarm.description !== alarm.title && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: isDark ? '#cbd5e1' : '#64748b',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    mb: 1.5,
                                }}
                            >
                                {alarm.description}
                            </Typography>
                        )}
                    </Box>

                    {/* Arrow Icon */}
                    <ChevronRightIcon
                        sx={{
                            color: alpha(theme.palette.text.secondary, 0.4),
                            fontSize: 24,
                            transition: 'all 0.2s',
                            '.MuiCard-root:hover &': {
                                transform: 'translateX(4px)',
                                color: theme.palette.text.secondary,
                            },
                        }}
                    />
                </Box>

                {/* Resource Info - Compact */}
                {alarm.resource_name && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha(isDark ? '#334155' : '#f8fafc', 0.7),
                            border: `1px solid ${alpha(isDark ? '#475569' : '#e2e8f0', 0.5)}`,
                            mb: 1.5,
                        }}
                    >
                        {getSourceIcon(alarm.source)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                fontSize="0.688rem" 
                                fontWeight={600} 
                                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.25 }}
                            >
                                {alarm.object_type || alarm.source}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                fontWeight={700} 
                                sx={{ 
                                    fontSize: '0.875rem',
                                    color: isDark ? '#e2e8f0' : '#334155',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {alarm.resource_name}
                            </Typography>
                            {alarm.group_name && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    {alarm.group_name}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Timeline Info */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(isDark ? '#1e293b' : '#f1f5f9', 0.5),
                        border: `1px dashed ${alpha(isDark ? '#475569' : '#cbd5e1', 0.4)}`,
                        mb: hasRecommendation ? 1.5 : 0,
                    }}
                >
                    {/* Start Time */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontSize="0.688rem" fontWeight={600} sx={{ display: 'block', lineHeight: 1.2 }}>
                                Started
                            </Typography>
                            <Tooltip title={`${getTimeAgo(alarm.begin_time)}`}>
                                <Typography variant="body2" fontSize="0.813rem" fontWeight={700} sx={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                                    {formatTime(alarm.begin_time)}
                                </Typography>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* End Time */}
                    {alarm.end_time && (
                        <>
                            <Box sx={{ width: '1px', bgcolor: alpha(isDark ? '#475569' : '#cbd5e1', 0.4) }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <CheckCircleIcon sx={{ fontSize: 16, color: isDark ? '#4ade80' : '#16a34a' }} />
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontSize="0.688rem" fontWeight={600} sx={{ display: 'block', lineHeight: 1.2 }}>
                                        Ended
                                    </Typography>
                                    <Typography variant="body2" fontSize="0.813rem" fontWeight={700} sx={{ color: isDark ? '#4ade80' : '#16a34a' }}>
                                        {formatTime(alarm.end_time)}
                                    </Typography>
                                </Box>
                            </Box>
                        </>
                    )}

                    {/* Updated At */}
                    {alarm.updated_at && (
                        <>
                            <Box sx={{ width: '1px', bgcolor: alpha(isDark ? '#475569' : '#cbd5e1', 0.4) }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <RefreshIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontSize="0.688rem" fontWeight={600} sx={{ display: 'block', lineHeight: 1.2 }}>
                                        Updated
                                    </Typography>
                                    <Typography variant="body2" fontSize="0.813rem" fontWeight={700} sx={{ color: 'text.secondary' }}>
                                        {formatTime(alarm.updated_at)}
                                    </Typography>
                                </Box>
                            </Box>
                        </>
                    )}
                </Box>

                {/* Recommendation */}
                {hasRecommendation && (
                    <Box>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                cursor: 'pointer',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha('#fef3c7', isDark ? 0.15 : 0.4),
                                border: `1px solid ${alpha('#fbbf24', isDark ? 0.3 : 0.35)}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: alpha('#fef3c7', isDark ? 0.2 : 0.5),
                                },
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(!expanded);
                            }}
                        >
                            <RecommendationIcon sx={{ color: isDark ? '#fbbf24' : '#d97706', fontSize: 20 }} />
                            <Typography variant="body2" fontWeight={700} sx={{ flex: 1, color: isDark ? '#fde047' : '#b45309', fontSize: '0.875rem' }}>
                                💡 Recommendation Available
                            </Typography>
                            <IconButton
                                size="small"
                                sx={{
                                    transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                                    transition: 'transform 0.3s',
                                    color: isDark ? '#fbbf24' : '#d97706',
                                }}
                            >
                                <ExpandMoreIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Box>

                        <Collapse in={expanded}>
                            <Box
                                sx={{
                                    mt: 1,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(isDark ? '#422006' : '#fffbeb', isDark ? 0.3 : 1),
                                    border: `1px solid ${alpha('#fbbf24', isDark ? 0.25 : 0.3)}`,
                                }}
                            >
                                <Typography variant="body2" sx={{ color: isDark ? '#fef3c7' : '#78350f', lineHeight: 1.6 }}>
                                    {alarm.recommendation}
                                </Typography>
                            </Box>
                        </Collapse>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default AlarmCard;
