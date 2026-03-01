import React from 'react';
import { Card, CardContent, Box, Typography, alpha, Tooltip, useTheme, IconButton } from '@mui/material';
import {
    Visibility as ViewIcon,
    Cloud as CloudIcon,
    Router as RouterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { VM } from '../../types';

// Icons for OS
import WindowIcon from '@mui/icons-material/Window';
import AppleIcon from '@mui/icons-material/Apple';
import { SiUbuntu, SiCentos, SiDebian, SiRedhat, SiLinux } from 'react-icons/si';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface ModernVMCardProps {
    vm: VM;
    getUsageColor: (percentage: number) => { main: string; light: string };
    density: 'compact' | 'normal' | 'comfortable';
    formatUsage?: (value: number | null) => string;
    formatStorage?: (mb: number | null) => string;
}

const ModernVMCardPremium: React.FC<ModernVMCardProps> = ({ 
    vm, 
    getUsageColor, 
    density, 
    formatUsage = (value: number | null) => value ? `${(value * 100).toFixed(1)}%` : '-',
    formatStorage = (mb: number | null) => {
        if (!mb) return '-';
        if (mb >= 1024 * 1024) return `${(mb / 1024 / 1024).toFixed(1)} TB`;
        if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb.toFixed(0)} MB`;
    }
}) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const getOsIcon = (osType: string | null | undefined, osName: string | null | undefined) => {
        const type = (osType || '').toLowerCase();
        const name = (osName || '').toLowerCase();
        const size = density === 'compact' ? 28 : 32;

        if (type.includes('windows') || name.includes('windows')) {
            return { icon: <WindowIcon sx={{ fontSize: size }} />, color: '#0078D7' };
        }
        if (name.includes('ubuntu')) {
            return { icon: <SiUbuntu size={size - 4} />, color: '#E95420' };
        }
        if (name.includes('centos')) {
            return { icon: <SiCentos size={size - 4} />, color: '#932279' };
        }
        if (name.includes('red hat') || name.includes('rhel')) {
            return { icon: <SiRedhat size={size - 4} />, color: '#EE0000' };
        }
        if (name.includes('debian')) {
            return { icon: <SiDebian size={size - 4} />, color: '#A81D33' };
        }
        if (type.includes('linux') || name.includes('linux')) {
            return { icon: <SiLinux size={size - 4} />, color: '#FCC624' };
        }
        if (type.includes('mac') || name.includes('mac')) {
            return { icon: <AppleIcon sx={{ fontSize: size }} />, color: '#000000' };
        }
        return { icon: <HelpOutlineIcon sx={{ fontSize: size }} />, color: '#9ca3af' };
    };

    const getAZColor = (azName: string | null) => {
        if (!azName) return { main: '#6b7280', light: '#9ca3af' };
        const hash = azName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = [
            { main: '#3b82f6', light: '#60a5fa' },
            { main: '#8b5cf6', light: '#a78bfa' },
            { main: '#ec4899', light: '#f472b6' },
            { main: '#f59e0b', light: '#fbbf24' },
            { main: '#10b981', light: '#34d399' },
            { main: '#06b6d4', light: '#22d3ee' },
            { main: '#f97316', light: '#fb923c' },
        ];
        return colors[hash % colors.length];
    };

    // Helper function to get protection status with color and symbol
    const getProtectionStatus = (vm: VM) => {
        const hasBackupPolicy = vm.backup_file_count && vm.backup_file_count > 0;
        const hasProtection = vm.in_protection;
        
        if (hasProtection && hasBackupPolicy) {
            return {
                color: '#4ade80', // Green - Full DR Protection
                symbol: '🟢',
                status: 'DR Protected'
            };
        } else if (hasBackupPolicy || (hasProtection && vm.protection_name)) {
            return {
                color: '#fbbf24', // Yellow/Amber - AZ Backup
                symbol: '🟡', 
                status: 'AZ Backup'
            };
        } else {
            return {
                color: '#9ca3af', // Gray - No Protection
                symbol: '⚪',
                status: 'Unprotected'
            };
        }
    };

    // Calculate metrics
    const cpuPercent = (vm.cpu_usage || 0) * 100;
    const memPercent = (vm.memory_usage || 0) * 100;
    const rawStorageUsage = vm.storage_usage || 0;
    const storagePercent = rawStorageUsage <= 1 ? rawStorageUsage * 100 : rawStorageUsage;
    const osInfo = getOsIcon(vm.os_type, vm.os_name);
    const azColor = getAZColor(vm.az_name);
    const protectionInfo = getProtectionStatus(vm);
    const isActive = vm.power_state === 'on';
    const isCritical = cpuPercent > 90 || memPercent > 90 || storagePercent > 90;

    // Animated progress ring component
    const ProgressRing = ({ percentage, color, size = 60, strokeWidth = 4 }: {
        percentage: number;
        color: string;
        size?: number;
        strokeWidth?: number;
    }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <Box sx={{ position: 'relative', width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={alpha(color, 0.1)}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        style={{
                            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            filter: `drop-shadow(0 0 6px ${alpha(color, 0.6)})`
                        }}
                    />
                </svg>
                <Typography
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: color,
                        textShadow: `0 0 8px ${alpha(color, 0.3)}`
                    }}
                >
                    {Math.round(percentage)}%
                </Typography>
            </Box>
        );
    };

    return (
        <Card
            className="glass-card card-hover"
            onClick={() => navigate(`/vms/${vm.vm_uuid}`)}
            sx={{
                height: density === 'compact' ? 400 : density === 'comfortable' ? 480 : 440,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                // Glass card effect matching VMSummaryCards
                background: theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${alpha(osInfo.color, 0.15)} 0%, ${alpha(osInfo.color, 0.05)} 100%)`
                    : `linear-gradient(135deg, ${alpha(osInfo.color, 0.08)} 0%, ${alpha(osInfo.color, 0.02)} 100%)`,
                border: '1px solid',
                borderColor: isActive 
                    ? alpha('#22c55e', 0.4)
                    : alpha(osInfo.color, 0.2),
                boxShadow: isActive
                    ? `0 12px 30px -10px ${alpha('#22c55e', 0.4)}`
                    : `0 8px 20px -8px ${alpha(osInfo.color, 0.15)}`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                // Visual accent strip on right (like VMSummaryCards)
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 4,
                    height: '100%',
                    bgcolor: isActive ? '#22c55e' : osInfo.color,
                    opacity: 0.6
                },
                // Shimmer effect on hover (like VMSummaryCards)
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(45deg, transparent, ${alpha(osInfo.color, 0.1)}, transparent)`,
                    transform: 'translateX(-100%)',
                    transition: 'transform 0.6s',
                },
                '&:hover': {
                    transform: 'translateY(-6px)',
                    borderColor: isActive ? alpha('#22c55e', 0.5) : alpha(osInfo.color, 0.5),
                    boxShadow: isActive
                        ? `0 16px 40px -12px ${alpha('#22c55e', 0.5)}`
                        : `0 12px 30px -10px ${alpha(osInfo.color, 0.4)}`,
                    '&::after': {
                        transform: 'translateX(100%)',
                    },
                    '& .stat-icon-container': {
                        transform: 'rotate(10deg) scale(1.1)',
                        boxShadow: `0 0 20px ${alpha(osInfo.color, 0.4)}`,
                    }
                },
                // Critical pulse for high usage (matching VMSummaryCards)
                ...(isCritical && {
                    animation: 'pulse-glow-red 2s infinite ease-in-out'
                })
            }}
        >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
                {/* Status Indicator - Matching VMSummaryCards style */}
                <Box sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: isActive ? '#22c55e' : '#ef4444',
                    boxShadow: `0 0 12px ${alpha(isActive ? '#22c55e' : '#ef4444', 0.6)}`,
                    ...(isActive && {
                        animation: 'pulse 2s infinite'
                    })
                }} />

                {/* Header Section - VMSummaryCards style */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600} sx={{ 
                            textTransform: 'uppercase', 
                            fontSize: '0.7rem', 
                            letterSpacing: '0.5px',
                            mb: 1
                        }}>
                            Virtual Machine
                        </Typography>
                        <Tooltip title={vm.name} placement="top-start">
                            <Typography
                                variant="h5"
                                fontWeight={900}
                                noWrap
                                sx={{
                                    color: osInfo.color,
                                    fontSize: density === 'compact' ? '1.1rem' : '1.25rem',
                                    lineHeight: 1,
                                    mb: 1,
                                    textShadow: theme.palette.mode === 'dark' ? `0 0 20px ${alpha(osInfo.color, 0.3)}` : 'none',
                                }}
                            >
                                {vm.name}
                            </Typography>
                        </Tooltip>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                display: 'block',
                                fontWeight: 500,
                                fontSize: '0.8rem',
                                mb: 1.5
                            }}
                        >
                            {vm.os_display_name || vm.os_name || 'Unknown OS'}
                        </Typography>
                    </Box>
                    
                    {/* OS Icon - VMSummaryCards style */}
                    <Box
                        className="stat-icon-container"
                        sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            bgcolor: alpha(osInfo.color, 0.15),
                            color: osInfo.color,
                            boxShadow: `0 4px 12px ${alpha(osInfo.color, 0.15)}`,
                            border: `1px solid ${alpha(osInfo.color, 0.2)}`,
                            transition: 'all 0.3s ease',
                            display: 'flex',
                        }}
                    >
                        {osInfo.icon}
                    </Box>
                </Box>

                {/* Zone, Protection & Network Info - Glass Card Style */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {/* Zone Badge - VMSummaryCards glass style */}
                        <Card className="glass-card" sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.8,
                            borderRadius: 3,
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha(azColor.main, 0.15)} 0%, ${alpha(azColor.main, 0.05)} 100%)`
                                : `linear-gradient(135deg, ${alpha(azColor.main, 0.08)} 0%, ${alpha(azColor.main, 0.02)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha(azColor.main, 0.2),
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: 2,
                                height: '100%',
                                bgcolor: azColor.main,
                                opacity: 0.6
                            }
                        }}>
                            <CloudIcon sx={{ fontSize: 14, color: azColor.main }} />
                            <Typography variant="caption" fontWeight={700} sx={{ 
                                color: azColor.main, 
                                fontSize: '0.7rem',
                                textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha(azColor.main, 0.3)}` : 'none'
                            }}>
                                {vm.az_name || 'Global'}
                            </Typography>
                        </Card>

                        {/* Protection Status - Glass card with cyber symbols */}
                        <Card className="glass-card" sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.8,
                            borderRadius: 3,
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha(protectionInfo.color, 0.15)} 0%, ${alpha(protectionInfo.color, 0.05)} 100%)`
                                : `linear-gradient(135deg, ${alpha(protectionInfo.color, 0.08)} 0%, ${alpha(protectionInfo.color, 0.02)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha(protectionInfo.color, 0.2),
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: 2,
                                height: '100%',
                                bgcolor: protectionInfo.color,
                                opacity: 0.6
                            }
                        }}>
                            <Typography sx={{ 
                                fontSize: '14px',
                                filter: `drop-shadow(0 0 4px ${alpha(protectionInfo.color, 0.4)})`
                            }}>
                                {protectionInfo.symbol === '🟢' ? '🛡️' : 
                                 protectionInfo.symbol === '🟡' ? '🔐' : '⚠️'}
                            </Typography>
                            <Typography variant="caption" fontWeight={600} sx={{ 
                                color: protectionInfo.color, 
                                fontSize: '0.7rem',
                                textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha(protectionInfo.color, 0.3)}` : 'none'
                            }}>
                                {protectionInfo.status}
                            </Typography>
                        </Card>
                    </Box>

                    {/* Network & Host Info - Glass card */}
                    <Card className="glass-card" sx={{
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.15)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.info.main, 0.2),
                        borderRadius: 3,
                        p: 1.5,
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            bgcolor: theme.palette.info.main,
                            opacity: 0.6
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: vm.host_name ? 1 : 0 }}>
                            <RouterIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />
                            <Typography variant="body2" sx={{ 
                                fontFamily: '"JetBrains Mono", monospace', 
                                fontWeight: 600, 
                                fontSize: '0.8rem',
                                color: vm.ip_address ? theme.palette.text.primary : theme.palette.text.secondary,
                                textShadow: vm.ip_address && theme.palette.mode === 'dark' ? `0 0 8px ${alpha(theme.palette.info.main, 0.2)}` : 'none'
                            }}>
                                {vm.ip_address ? vm.ip_address.split(',')[0] : '—'}
                            </Typography>
                        </Box>
                        
                        {vm.host_name && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 2 }}>
                                <Box sx={{ 
                                    width: 4, 
                                    height: 4, 
                                    borderRadius: '50%', 
                                    bgcolor: theme.palette.text.secondary,
                                    opacity: 0.6
                                }} />
                                <Typography variant="caption" sx={{ 
                                    color: theme.palette.text.secondary, 
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                }}>
                                    {vm.host_name}
                                </Typography>
                            </Box>
                        )}
                    </Card>
                </Box>

                {/* Performance Metrics - Complete Data like Table View */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* CPU Section with detailed info */}
                    <Card className="glass-card" sx={{
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(getUsageColor(cpuPercent).main, 0.15)} 0%, ${alpha(getUsageColor(cpuPercent).main, 0.05)} 100%)`
                            : `linear-gradient(135deg, ${alpha(getUsageColor(cpuPercent).main, 0.08)} 0%, ${alpha(getUsageColor(cpuPercent).main, 0.02)} 100%)`,
                        border: '1px solid',
                        borderColor: alpha(getUsageColor(cpuPercent).main, 0.2),
                        borderRadius: 3,
                        p: 2,
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            bgcolor: getUsageColor(cpuPercent).main,
                            opacity: 0.6
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ 
                                    textTransform: 'uppercase', 
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.5px'
                                }}>
                                    CPU ({vm.cpu_cores || 0} vCPU)
                                </Typography>
                                <Typography
                                    variant="h6"
                                    fontWeight={900}
                                    sx={{
                                        color: getUsageColor(cpuPercent).main,
                                        fontSize: '1rem',
                                        textShadow: theme.palette.mode === 'dark' ? `0 0 10px ${alpha(getUsageColor(cpuPercent).main, 0.3)}` : 'none',
                                    }}
                                >
                                    {formatUsage(vm.cpu_usage)}
                                </Typography>
                            </Box>
                            <ProgressRing
                                percentage={cpuPercent}
                                color={getUsageColor(cpuPercent).main}
                                size={40}
                                strokeWidth={3}
                            />
                        </Box>
                        {/* CPU Progress Bar */}
                        <Box sx={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.08) }}>
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                height: '100%',
                                width: `${cpuPercent}%`,
                                background: `linear-gradient(90deg, ${getUsageColor(cpuPercent).main}, ${getUsageColor(cpuPercent).light})`,
                                borderRadius: 3,
                                boxShadow: `0 0 8px ${alpha(getUsageColor(cpuPercent).main, 0.4)}`,
                                transition: 'width 1s ease, background 0.3s ease'
                            }} />
                        </Box>
                    </Card>

                    {/* Memory Section with detailed info */}
                    <Card className="glass-card" sx={{
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(getUsageColor(memPercent).main, 0.15)} 0%, ${alpha(getUsageColor(memPercent).main, 0.05)} 100%)`
                            : `linear-gradient(135deg, ${alpha(getUsageColor(memPercent).main, 0.08)} 0%, ${alpha(getUsageColor(memPercent).main, 0.02)} 100%)`,
                        border: '1px solid',
                        borderColor: alpha(getUsageColor(memPercent).main, 0.2),
                        borderRadius: 3,
                        p: 2,
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            bgcolor: getUsageColor(memPercent).main,
                            opacity: 0.6
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ 
                                    textTransform: 'uppercase', 
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.5px'
                                }}>
                                    RAM ({formatStorage(vm.memory_total_mb)})
                                </Typography>
                                <Typography
                                    variant="h6"
                                    fontWeight={900}
                                    sx={{
                                        color: getUsageColor(memPercent).main,
                                        fontSize: '1rem',
                                        textShadow: theme.palette.mode === 'dark' ? `0 0 10px ${alpha(getUsageColor(memPercent).main, 0.3)}` : 'none',
                                    }}
                                >
                                    {formatUsage(vm.memory_usage)}
                                </Typography>
                            </Box>
                            <ProgressRing
                                percentage={memPercent}
                                color={getUsageColor(memPercent).main}
                                size={40}
                                strokeWidth={3}
                            />
                        </Box>
                        {/* Memory Progress Bar */}
                        <Box sx={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.08) }}>
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                height: '100%',
                                width: `${memPercent}%`,
                                background: `linear-gradient(90deg, ${getUsageColor(memPercent).main}, ${getUsageColor(memPercent).light})`,
                                borderRadius: 3,
                                boxShadow: `0 0 8px ${alpha(getUsageColor(memPercent).main, 0.4)}`,
                                transition: 'width 1s ease, background 0.3s ease'
                            }} />
                        </Box>
                    </Card>

                    {/* Storage Section with detailed info like table view */}
                    <Card className="glass-card" sx={{
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(getUsageColor(storagePercent).main, 0.15)} 0%, ${alpha(getUsageColor(storagePercent).main, 0.05)} 100%)`
                            : `linear-gradient(135deg, ${alpha(getUsageColor(storagePercent).main, 0.08)} 0%, ${alpha(getUsageColor(storagePercent).main, 0.02)} 100%)`,
                        border: '1px solid',
                        borderColor: alpha(getUsageColor(storagePercent).main, 0.2),
                        borderRadius: 3,
                        p: 2,
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            bgcolor: getUsageColor(storagePercent).main,
                            opacity: 0.6
                        }
                    }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ 
                            textTransform: 'uppercase', 
                            fontSize: '0.65rem',
                            letterSpacing: '0.5px',
                            mb: 1,
                            display: 'block'
                        }}>
                            Storage
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                                <Typography variant="body2" fontWeight={700} sx={{ 
                                    fontSize: '0.85rem', 
                                    color: 'text.primary',
                                    lineHeight: 1.2
                                }}>
                                    {(() => {
                                        const storageTotal = vm.storage_total_mb || 0;
                                        const storageUsedMBFromUsage = (rawStorageUsage <= 1 ? rawStorageUsage : rawStorageUsage / 100) * storageTotal;
                                        const usedMB = vm.storage_used_mb ?? storageUsedMBFromUsage;
                                        return formatStorage(usedMB);
                                    })()}
                                    <Typography component="span" variant="caption" color="text.secondary" fontWeight={500} sx={{ 
                                        fontSize: '0.75rem',
                                        ml: 0.5 
                                    }}>
                                        / {formatStorage(vm.storage_total_mb)}
                                    </Typography>
                                </Typography>
                            </Box>
                            <Typography
                                variant="h6"
                                fontWeight={900}
                                sx={{
                                    color: getUsageColor(storagePercent).main,
                                    fontSize: '0.95rem',
                                    textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha(getUsageColor(storagePercent).main, 0.3)}` : 'none',
                                }}
                            >
                                {storagePercent.toFixed(1)}%
                            </Typography>
                        </Box>
                        {/* Storage Progress Bar */}
                        <Box sx={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.08) }}>
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                height: '100%',
                                width: `${storagePercent}%`,
                                background: `linear-gradient(90deg, ${getUsageColor(storagePercent).main}, ${getUsageColor(storagePercent).light})`,
                                borderRadius: 4,
                                boxShadow: `0 0 12px ${alpha(getUsageColor(storagePercent).main, 0.5)}`,
                                transition: 'width 1s ease'
                            }} />
                        </Box>
                    </Card>
                </Box>

                {/* Action Button */}
                <Box sx={{ pt: 2, display: 'flex', justifyContent: 'center' }}>
                    <IconButton
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            color: 'white',
                            width: 48,
                            height: 48,
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'scale(1.1) rotate(5deg)',
                                boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.6)}`,
                                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vms/${vm.vm_uuid}`);
                        }}
                    >
                        <ViewIcon />
                    </IconButton>
                </Box>
            </CardContent>

            {/* Global Styles for Animation */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(0.95); }
                    }
                `}
            </style>
        </Card>
    );
};

export default ModernVMCardPremium;