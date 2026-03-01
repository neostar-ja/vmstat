import React from 'react';
import {
    Box,
    Typography,
    Skeleton,
    LinearProgress,
    alpha,
    useTheme,
    Divider,
} from '@mui/material';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: string;
    action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        {icon && <span>{icon}</span>}
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {action && <Box>{action}</Box>}
            </Box>
        </Box>
    );
}

interface LoadingSkeletonProps {
    variant?: 'card' | 'table' | 'list' | 'text';
    count?: number;
    height?: number;
}

export function LoadingSkeleton({ variant = 'card', count = 1, height = 120 }: LoadingSkeletonProps) {
    const theme = useTheme();
    
    if (variant === 'card') {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[...Array(count)].map((_, i) => (
                    <Skeleton
                        key={i}
                        variant="rounded"
                        height={height}
                        sx={{
                            borderRadius: 2,
                            bgcolor: theme.palette.mode === 'dark'
                                ? alpha('#fff', 0.05)
                                : alpha('#0ea5e9', 0.05),
                        }}
                    />
                ))}
            </Box>
        );
    }

    if (variant === 'table') {
        return (
            <Box>
                <Skeleton variant="rounded" height={48} sx={{ mb: 1, borderRadius: 1 }} />
                {[...Array(count)].map((_, i) => (
                    <Skeleton
                        key={i}
                        variant="rounded"
                        height={56}
                        sx={{ mb: 0.5, borderRadius: 1 }}
                    />
                ))}
            </Box>
        );
    }

    if (variant === 'list') {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[...Array(count)].map((_, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="40%" />
                        </Box>
                    </Box>
                ))}
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...Array(count)].map((_, i) => (
                <Skeleton key={i} variant="text" width={`${Math.random() * 40 + 60}%`} />
            ))}
        </Box>
    );
}

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                px: 4,
                textAlign: 'center',
            }}
        >
            <Box
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: theme.palette.mode === 'dark'
                        ? alpha('#fff', 0.05)
                        : alpha('#0ea5e9', 0.05),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    mb: 2,
                }}
            >
                {icon}
            </Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
                {title}
            </Typography>
            {description && (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
                    {description}
                </Typography>
            )}
            {action}
        </Box>
    );
}

interface ProgressBarProps {
    value: number;
    color?: string;
    height?: number;
    showLabel?: boolean;
    animate?: boolean;
}

export function ProgressBar({
    value,
    color = '#0ea5e9',
    height = 8,
    showLabel = false,
    animate = true,
}: ProgressBarProps) {
    const theme = useTheme();
    const normalizedValue = Math.min(Math.max(value, 0), 100);
    const isWarning = normalizedValue >= 80;
    const isCritical = normalizedValue >= 90;

    const getColor = () => {
        if (isCritical) return 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)';
        if (isWarning) return 'linear-gradient(90deg, #22c55e 0%, #f59e0b 100%)';
        return color.includes('gradient') ? color : `linear-gradient(90deg, ${color}, ${alpha(color, 0.7)})`;
    };

    return (
        <Box sx={{ width: '100%' }}>
            {showLabel && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Progress
                    </Typography>
                    <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                            color: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : color,
                        }}
                    >
                        {normalizedValue.toFixed(1)}%
                    </Typography>
                </Box>
            )}
            <LinearProgress
                variant="determinate"
                value={normalizedValue}
                sx={{
                    height,
                    borderRadius: height / 2,
                    bgcolor: theme.palette.mode === 'dark'
                        ? alpha('#fff', 0.08)
                        : alpha('#000', 0.06),
                    '& .MuiLinearProgress-bar': {
                        borderRadius: height / 2,
                        background: getColor(),
                        transition: animate ? 'transform 0.5s ease' : 'none',
                    },
                }}
            />
        </Box>
    );
}

interface SectionDividerProps {
    title?: string;
    icon?: string;
}

export function SectionDivider({ title, icon }: SectionDividerProps) {
    if (!title) {
        return (
            <Divider
                sx={{
                    my: 3,
                    borderColor: 'transparent',
                    '&::before, &::after': {
                        borderColor: 'divider',
                    },
                }}
            />
        );
    }

    return (
        <Divider
            sx={{
                my: 3,
                '&::before, &::after': {
                    borderColor: 'divider',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                }}
            >
                {icon && <span>{icon}</span>}
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    {title}
                </Typography>
            </Box>
        </Divider>
    );
}

interface AnimatedNumberProps {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
    color?: string;
}

export function AnimatedNumber({
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    variant = 'h4',
    color,
}: AnimatedNumberProps) {
    return (
        <Typography
            variant={variant}
            sx={{
                fontWeight: 700,
                color: color || 'text.primary',
                fontFeatureSettings: '"tnum"', // Tabular numbers
            }}
        >
            {prefix}
            {value.toFixed(decimals)}
            {suffix}
        </Typography>
    );
}
