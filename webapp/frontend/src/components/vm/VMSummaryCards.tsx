import React from 'react';
import { Box, Card, CardContent, Grid, Typography, Zoom, alpha, useTheme } from '@mui/material';
import {
    Computer as ComputerIcon,
    CheckCircle as CheckCircleIcon,
    Shield as ShieldIcon,
    Speed as SpeedIcon,
    Storage as StorageIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useThemeStore } from '../../stores/themeStore';

interface VMSummaryProps {
    stats: {
        total: number;
        running: number;
        stopped: number;
        protected: number;
        avgCpu: number;
        avgMemory: number;
        totalStorage: number;
        usedStorage: number;
        avgStorageUsage: number;
        highStorageCount: number;
    };
    formatStorage: (mb: number | null) => string;
    onFilterClick?: (type: string, value: string) => void;
}

const StatCard = ({
    title,
    value,
    icon,
    color,
    subtitle,
    trend,
    delay = 0,
    sparklineData = [],
    onClick,
    id
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    delay?: number;
    sparklineData?: number[];
    onClick?: () => void;
    id?: string;
}) => {
    const { mode } = useThemeStore();

    return (
        <Zoom in style={{ transitionDelay: `${delay}ms` }}>
            <Card
                className="card-hover glass-card"
                onClick={onClick}
                sx={{
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: onClick ? 'pointer' : 'default',
                    background: mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(color, 0.15)} 0%, ${alpha(color, 0.05)} 100%)`
                        : `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
                    border: '1px solid',
                    borderColor: alpha(color, 0.2),
                    borderRadius: 4,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(45deg, transparent, ${alpha(color, 0.1)}, transparent)`,
                        transform: 'translateX(-100%)',
                        transition: 'transform 0.6s',
                    },
                    '&:hover': {
                        transform: 'translateY(-6px)',
                        borderColor: alpha(color, 0.5),
                        boxShadow: `0 12px 30px -10px ${alpha(color, 0.4)}`,
                        '&::before': {
                            transform: 'translateX(100%)',
                        },
                        '& .stat-icon-container': {
                            transform: 'rotate(10deg) scale(1.1)',
                            boxShadow: `0 0 20px ${alpha(color, 0.4)}`,
                        }
                    },
                    // Critical pulse for high storage or similar
                    animation: (id === 'high-load' && Number(value) > 0) ? 'pulse-glow-red 2s infinite ease-in-out' : 'none',
                }}
            >
                {/* Visual Accent */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 4,
                    height: '100%',
                    bgcolor: color,
                    opacity: 0.6
                }} />
                <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 1.5, sm: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: { xs: '0.6rem', sm: '0.7rem' }, letterSpacing: '0.5px' }}>
                                {title}
                            </Typography>
                            <Typography
                                variant="h3"
                                fontWeight={900}
                                sx={{
                                    color,
                                    mb: 0.5,
                                    textShadow: mode === 'dark' ? `0 0 20px ${alpha(color, 0.3)}` : 'none',
                                    fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2rem' },
                                    lineHeight: 1,
                                }}
                            >
                                {value}
                            </Typography>
                            {subtitle && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500, fontSize: { xs: '0.6rem', sm: '0.75rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                        <Box
                            className="stat-icon-container"
                            sx={{
                                p: { xs: 1, sm: 1.5 },
                                borderRadius: 2.5,
                                bgcolor: alpha(color, 0.15),
                                color: color,
                                boxShadow: `0 4px 12px ${alpha(color, 0.15)}`,
                                border: `1px solid ${alpha(color, 0.2)}`,
                                transition: 'all 0.3s ease',
                                display: 'flex',
                            }}
                        >
                            {icon}
                        </Box>
                    </Box>

                    {/* Elite Area Sparkline */}
                    {sparklineData.length > 0 && (
                        <Box sx={{ height: { xs: 30, sm: 40 }, mt: 1, mx: { xs: -1.5, sm: -2.5 }, position: 'relative', display: { xs: 'none', sm: 'block' } }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.map((v: number, i: number) => ({ value: v, index: i }))}>
                                    <defs>
                                        <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={color}
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
                                        isAnimationActive={true}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    )}

                    {trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(color, 0.2)}` }}>
                            {trend === 'up' && <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                            {trend === 'down' && <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{
                                    color: trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary',
                                    textTransform: 'uppercase',
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.3px'
                                }}
                            >
                                {trend === 'up' ? '↑ เพิ่มขึ้น' : trend === 'down' ? '↓ ลดลง' : 'คงที่'}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Zoom>
    );
};

const VMSummaryCards: React.FC<VMSummaryProps> = ({ stats, formatStorage, onFilterClick }) => {
    const theme = useTheme();

    // Generate sparkline data
    const generateSparkline = (base: number) => {
        return Array.from({ length: 15 }, () => base + Math.random() * 20 - 10);
    };

    return (
        <Box sx={{ width: '100%', overflowX: 'hidden', px: { xs: 0.5, sm: 0 } }}>
            <style>
                {`
                    @keyframes pulse-glow-red {
                        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                    }
                `}
            </style>
            <Grid container spacing={{ xs: 1.5, sm: 2.5 }} sx={{ mb: { xs: 2, md: 4 } }}>
                <Grid item xs={6} sm={6} md={4} lg={2}>
                    <StatCard
                        title="Total VMs"
                        value={stats.total}
                        icon={<ComputerIcon sx={{ fontSize: 24 }} />}
                        color={theme.palette.primary.main}
                        subtitle={`${stats.running} ทำงาน · ${stats.stopped} หยุด`}
                        sparklineData={generateSparkline(stats.total)}
                        onClick={() => onFilterClick?.('status', '')}
                        delay={0}
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={4} lg={2}>
                    <StatCard
                        title="Running VMs"
                        value={stats.running}
                        icon={<CheckCircleIcon sx={{ fontSize: 24 }} />}
                        color={theme.palette.success.main}
                        subtitle={`${((stats.running / (stats.total || 1)) * 100).toFixed(0)}% กำลังทำงาน`}
                        trend="up"
                        onClick={() => onFilterClick?.('status', 'on')}
                        sparklineData={generateSparkline(stats.running)}
                        delay={100}
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={4} lg={2}>
                    <StatCard
                        title="Protected"
                        value={stats.protected}
                        icon={<ShieldIcon sx={{ fontSize: 24 }} />}
                        color={theme.palette.info.main}
                        subtitle={`${((stats.protected / (stats.total || 1)) * 100).toFixed(0)}% ได้รับความคุ้มครอง`}
                        sparklineData={generateSparkline(stats.protected)}
                        delay={200}
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={4} lg={2}>
                    <StatCard
                        title="Avg CPU"
                        value={`${stats.avgCpu.toFixed(1)}%`}
                        icon={<SpeedIcon sx={{ fontSize: 24 }} />}
                        color={stats.avgCpu > 70 ? theme.palette.warning.main : theme.palette.secondary.main}
                        subtitle={`RAM Average: ${stats.avgMemory.toFixed(1)}%`}
                        sparklineData={generateSparkline(stats.avgCpu)}
                        delay={300}
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={4} lg={2}>
                    <StatCard
                        title="Storage"
                        value={formatStorage(stats.usedStorage)}
                        icon={<StorageIcon sx={{ fontSize: 24 }} />}
                        color={stats.avgStorageUsage > 80 ? theme.palette.error.main : stats.avgStorageUsage > 60 ? theme.palette.warning.main : theme.palette.success.main}
                        subtitle={`${stats.avgStorageUsage.toFixed(1)}% จาก ${formatStorage(stats.totalStorage)}`}
                        sparklineData={generateSparkline(stats.avgStorageUsage)}
                        delay={400}
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={4} lg={2}>
                    <StatCard
                        id="high-load"
                        title="High Disk Load"
                        value={stats.highStorageCount}
                        icon={<TrendingUpIcon sx={{ fontSize: 24 }} />}
                        color={stats.highStorageCount > 0 ? theme.palette.error.main : theme.palette.success.main}
                        subtitle={stats.highStorageCount > 0 ? `${stats.highStorageCount} เครื่อง Disk > 80%` : 'การใช้งานปกติ'}
                        trend={stats.highStorageCount > 0 ? 'up' : 'neutral'}
                        onClick={() => onFilterClick?.('status', 'high-load')}
                        sparklineData={generateSparkline(stats.highStorageCount)}
                        delay={500}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default VMSummaryCards;
