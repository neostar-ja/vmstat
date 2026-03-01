import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Avatar,
    Chip,
    Skeleton,
    alpha,
    useTheme,
    LinearProgress,
} from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    isLoading?: boolean;
    onClick?: () => void;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    gradient,
    trend,
    trendValue,
    isLoading,
    onClick,
}: StatCardProps) {
    const theme = useTheme();

    return (
        <Card
            onClick={onClick}
            sx={{
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': onClick
                    ? {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
                      }
                    : {},
            }}
        >
            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                mb: 1,
                            }}
                        >
                            {title}
                        </Typography>
                        {isLoading ? (
                            <Skeleton width={100} height={48} />
                        ) : (
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 800,
                                    background: gradient,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                {value}
                            </Typography>
                        )}
                        {(subtitle || trend) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                {trend && trendValue && (
                                    <Chip
                                        size="small"
                                        icon={
                                            trend === 'up' ? (
                                                <TrendingUpIcon sx={{ fontSize: 14 }} />
                                            ) : trend === 'down' ? (
                                                <TrendingDownIcon sx={{ fontSize: 14 }} />
                                            ) : undefined
                                        }
                                        label={trendValue}
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            bgcolor:
                                                trend === 'up'
                                                    ? alpha('#22c55e', 0.15)
                                                    : trend === 'down'
                                                    ? alpha('#ef4444', 0.15)
                                                    : alpha('#64748b', 0.15),
                                            color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b',
                                            '& .MuiChip-icon': {
                                                color: 'inherit',
                                            },
                                        }}
                                    />
                                )}
                                {subtitle && (
                                    <Typography variant="caption" color="text.secondary">
                                        {subtitle}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                    <Avatar
                        sx={{
                            width: 56,
                            height: 56,
                            background: gradient,
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                    >
                        {icon}
                    </Avatar>
                </Box>
            </CardContent>
            {/* Decorative bottom border */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: gradient,
                }}
            />
            {/* Decorative glow effect */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }}
            />
        </Card>
    );
}

interface ProgressCardProps {
    title: string;
    value: number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    isLoading?: boolean;
    showWarning?: boolean;
}

export function ProgressCard({
    title,
    value,
    subtitle,
    icon,
    color,
    isLoading,
    showWarning = true,
}: ProgressCardProps) {
    const theme = useTheme();
    const isWarning = showWarning && value >= 80;
    const isCritical = showWarning && value >= 90;

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: alpha(color, 0.15),
                            color: color,
                        }}
                    >
                        {icon}
                    </Avatar>
                    <Typography variant="body1" fontWeight={600}>
                        {title}
                    </Typography>
                </Box>
                {isLoading ? (
                    <Skeleton width="100%" height={60} />
                ) : (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 800,
                                    color: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : 'text.primary',
                                }}
                            >
                                {value.toFixed(1)}
                            </Typography>
                            <Typography variant="h5" color="text.secondary" fontWeight={500}>
                                %
                            </Typography>
                            {subtitle && (
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(value, 100)}
                            sx={{
                                height: 10,
                                borderRadius: 5,
                                bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.06),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 5,
                                    background: isCritical
                                        ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                                        : isWarning
                                        ? 'linear-gradient(90deg, #22c55e 0%, #f59e0b 100%)'
                                        : `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                                },
                            }}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

interface StatusBadgeProps {
    status: 'running' | 'stopped' | 'warning' | 'error' | 'success' | 'info';
    label?: string;
    size?: 'small' | 'medium';
}

export function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
    const statusConfig = {
        running: {
            color: '#22c55e',
            bgColor: alpha('#22c55e', 0.15),
            borderColor: alpha('#22c55e', 0.3),
            defaultLabel: 'Running',
        },
        stopped: {
            color: '#ef4444',
            bgColor: alpha('#ef4444', 0.15),
            borderColor: alpha('#ef4444', 0.3),
            defaultLabel: 'Stopped',
        },
        warning: {
            color: '#f59e0b',
            bgColor: alpha('#f59e0b', 0.15),
            borderColor: alpha('#f59e0b', 0.3),
            defaultLabel: 'Warning',
        },
        error: {
            color: '#ef4444',
            bgColor: alpha('#ef4444', 0.15),
            borderColor: alpha('#ef4444', 0.3),
            defaultLabel: 'Error',
        },
        success: {
            color: '#22c55e',
            bgColor: alpha('#22c55e', 0.15),
            borderColor: alpha('#22c55e', 0.3),
            defaultLabel: 'Success',
        },
        info: {
            color: '#0ea5e9',
            bgColor: alpha('#0ea5e9', 0.15),
            borderColor: alpha('#0ea5e9', 0.3),
            defaultLabel: 'Info',
        },
    };

    const config = statusConfig[status];

    return (
        <Chip
            label={label || config.defaultLabel}
            size={size}
            sx={{
                height: size === 'small' ? 24 : 28,
                bgcolor: config.bgColor,
                color: config.color,
                border: `1px solid ${config.borderColor}`,
                fontWeight: 600,
                fontSize: size === 'small' ? '0.7rem' : '0.8rem',
            }}
        />
    );
}

interface GradientTextProps {
    children: React.ReactNode;
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2';
    gradient?: string;
    fontWeight?: number;
}

export function GradientText({
    children,
    variant = 'h4',
    gradient = 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
    fontWeight = 700,
}: GradientTextProps) {
    return (
        <Typography
            variant={variant}
            sx={{
                fontWeight,
                background: gradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
            }}
        >
            {children}
        </Typography>
    );
}

interface GlassCardProps {
    children: React.ReactNode;
    sx?: object;
}

export function GlassCard({ children, sx = {} }: GlassCardProps) {
    const theme = useTheme();

    return (
        <Card
            sx={{
                background:
                    theme.palette.mode === 'dark' ? alpha('#1e293b', 0.6) : alpha('#fff', 0.8),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${
                    theme.palette.mode === 'dark' ? alpha('#fff', 0.1) : alpha('#0ea5e9', 0.15)
                }`,
                ...sx,
            }}
        >
            {children}
        </Card>
    );
}
