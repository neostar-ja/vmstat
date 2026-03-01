import React from 'react';
import { Card, CardContent, Box, Typography, alpha, Tooltip, Fade, useTheme, IconButton } from '@mui/material';
import {
    Visibility as ViewIcon,
    Cloud as CloudIcon,
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
}

const ModernVMCard: React.FC<ModernVMCardProps> = ({ vm, getUsageColor, density }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const getOsIcon = (osType: string | null | undefined, osName: string | null | undefined) => {
        const type = (osType || '').toLowerCase();
        const name = (osName || '').toLowerCase();
        const size = density === 'compact' ? 20 : 24;

        if (type.includes('windows') || name.includes('windows')) {
            return { icon: <WindowIcon sx={{ fontSize: size }} />, color: '#0078D7' };
        }
        if (name.includes('ubuntu')) {
            return { icon: <SiUbuntu size={size - 2} />, color: '#E95420' };
        }
        if (name.includes('centos')) {
            return { icon: <SiCentos size={size - 2} />, color: '#932279' };
        }
        if (name.includes('red hat') || name.includes('rhel')) {
            return { icon: <SiRedhat size={size - 2} />, color: '#EE0000' };
        }
        if (name.includes('debian')) {
            return { icon: <SiDebian size={size - 2} />, color: '#A81D33' };
        }
        if (type.includes('linux') || name.includes('linux')) {
            return { icon: <SiLinux size={size - 2} />, color: '#FCC624' };
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
            { main: '#14b8a6', light: '#2dd4bf' },
        ];
        return colors[hash % colors.length];
    };

    const cpuPercent = (vm.cpu_usage || 0) * 100;
    const memPercent = (vm.memory_usage || 0) * 100;
    const rawStorageUsage = vm.storage_usage || 0;
    const storagePercent = rawStorageUsage <= 1 ? rawStorageUsage * 100 : rawStorageUsage;
    const isActive = vm.power_state === 'on';
    const isCritical = cpuPercent > 90 || memPercent > 90 || storagePercent > 90;
    const isWarning = cpuPercent > 75 || memPercent > 75 || storagePercent > 75;

    return (
        <Fade in timeout={500}>
            <Card
                className="card-elite"
                sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    border: '2px solid',
                    borderColor: isCritical 
                        ? alpha(theme.palette.error.main, 0.3)
                        : isWarning
                        ? alpha(theme.palette.warning.main, 0.2)
                        : theme.palette.mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.06),
                    borderRadius: density === 'compact' ? 4 : 6,
                    position: 'relative',
                    overflow: 'hidden',
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha('#1e293b', 0.9)} 0%, ${alpha('#0f172a', 0.95)} 100%)`
                        : `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.98)} 100%)`,
                    backdropFilter: 'blur(24px)',
                    boxShadow: isCritical
                        ? `0 12px 48px ${alpha(theme.palette.error.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.error.main, 0.1)} inset`
                        : theme.palette.mode === 'dark' 
                        ? `0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px ${alpha('#fff', 0.05)} inset`
                        : `0 12px 48px rgba(0,0,0,0.08), 0 0 0 1px ${alpha('#000', 0.02)} inset`,
                    '&::before': isCritical ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.warning.main})`,
                        animation: 'shimmer 2s linear infinite',
                    } : {},
                    '&:hover': {
                        transform: 'translateY(-12px) scale(1.02)',
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                        boxShadow: theme.palette.mode === 'dark'
                            ? `0 24px 72px rgba(0,0,0,0.7), 0 0 24px ${alpha(theme.palette.primary.main, 0.3)}, 0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)} inset`
                            : `0 24px 72px rgba(0,0,0,0.12), 0 0 24px ${alpha(theme.palette.primary.main, 0.2)}, 0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)} inset`,
                        '& .card-actions': { opacity: 1, transform: 'translateY(0)' },
                        '& .card-header-icon': {
                            transform: 'rotate(-8deg) scale(1.15)',
                            boxShadow: `0 16px 32px ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.4)}`
                        },
                        '& .status-pulse': {
                            animation: 'pulse-glow 1.5s ease-in-out infinite'
                        }
                    },
                }}
                onClick={() => navigate(`/vms/${vm.vm_uuid}`)}
            >
                <CardContent sx={{ p: density === 'compact' ? '20px !important' : '32px !important', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: density === 'compact' ? 1.5 : 2.5, mb: density === 'compact' ? 2.5 : 4 }}>
                        <Box
                            className="card-header-icon"
                            sx={{
                                width: density === 'compact' ? 52 : 64,
                                height: density === 'compact' ? 52 : 64,
                                borderRadius: density === 'compact' ? '16px' : '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: theme.palette.mode === 'dark'
                                    ? `linear-gradient(135deg, ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.3)}, ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.08)})`
                                    : `linear-gradient(135deg, ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.2)}, ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.05)})`,
                                border: '2px solid',
                                borderColor: alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.4),
                                color: getOsIcon(vm.os_type, vm.os_name).color,
                                boxShadow: `0 12px 28px ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.2)}, 0 0 0 4px ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.05)}`,
                                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                flexShrink: 0,
                                position: 'relative',
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: -4,
                                    borderRadius: 'inherit',
                                    background: `radial-gradient(circle at 30% 30%, ${alpha(getOsIcon(vm.os_type, vm.os_name).color, 0.15)}, transparent 70%)`,
                                    pointerEvents: 'none'
                                }
                            }}
                        >
                            {getOsIcon(vm.os_type, vm.os_name).icon}
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Tooltip title={vm.name} placement="top-start">
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={900}
                                    noWrap
                                    sx={{
                                        fontSize: density === 'compact' ? '1rem' : '1.15rem',
                                        lineHeight: 1.2,
                                        mb: 0.75,
                                        letterSpacing: '-0.02em',
                                        color: 'text.primary',
                                        textShadow: theme.palette.mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                                    }}
                                >
                                    {vm.name}
                                </Typography>
                            </Tooltip>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Box 
                                    className="status-pulse"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        px: 1.25,
                                        py: 0.5,
                                        borderRadius: '10px',
                                        bgcolor: isActive ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.error.main, 0.15),
                                        border: '1.5px solid',
                                        borderColor: isActive ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.error.main, 0.3),
                                        color: isActive ? theme.palette.success.main : theme.palette.error.main,
                                        boxShadow: isActive 
                                            ? `0 4px 12px ${alpha(theme.palette.success.main, 0.2)}`
                                            : `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                                    }}
                                >
                                    <Box sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: 'currentColor',
                                        boxShadow: isActive ? `0 0 8px currentColor` : 'none',
                                        animation: isActive ? 'pulse-glow 2s ease-in-out infinite' : 'none'
                                    }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {isActive ? 'ONLINE' : 'OFFLINE'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                    {vm.os_display_name || vm.os_name || 'Generic OS'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Infrastructure Tag */}
                    <Box sx={{ display: 'flex', gap: 1, mb: density === 'compact' ? 2.5 : 3.5, flexWrap: 'wrap' }}>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${alpha(getAZColor(vm.az_name).main, 0.12)}, ${alpha(getAZColor(vm.az_name).main, 0.05)})`,
                            border: '1.5px solid',
                            borderColor: alpha(getAZColor(vm.az_name).main, 0.25),
                            boxShadow: `0 4px 12px ${alpha(getAZColor(vm.az_name).main, 0.15)}`
                        }}>
                            <CloudIcon sx={{ fontSize: 16, color: getAZColor(vm.az_name).main, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                            <Typography variant="caption" fontWeight={900} sx={{ color: getAZColor(vm.az_name).main, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {vm.az_name || 'GLOBAL'}
                            </Typography>
                        </Box>
                        {isCritical && (
                            <Box sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.5,
                                borderRadius: '10px',
                                bgcolor: alpha(theme.palette.error.main, 0.15),
                                border: '1.5px solid',
                                borderColor: alpha(theme.palette.error.main, 0.3),
                                animation: 'pulse-glow 2s ease-in-out infinite'
                            }}>
                                <Typography variant="caption" fontWeight={800} sx={{ color: theme.palette.error.main, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                    ⚠ CRITICAL
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Circular Progress Rings for Resources */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mb: density === 'compact' ? 2 : 3, gap: 2 }}>
                        {/* CPU Ring */}
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width={density === 'compact' ? 70 : 85} height={density === 'compact' ? 70 : 85}>
                                <circle
                                    cx={density === 'compact' ? 35 : 42.5}
                                    cy={density === 'compact' ? 35 : 42.5}
                                    r={density === 'compact' ? 30 : 36}
                                    fill="none"
                                    stroke={alpha(theme.palette.divider, 0.15)}
                                    strokeWidth="6"
                                />
                                <circle
                                    cx={density === 'compact' ? 35 : 42.5}
                                    cy={density === 'compact' ? 35 : 42.5}
                                    r={density === 'compact' ? 30 : 36}
                                    fill="none"
                                    stroke={`url(#cpuGradient-${vm.vm_uuid})`}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(density === 'compact' ? 188.5 : 226.2) * (cpuPercent / 100)} ${density === 'compact' ? 188.5 : 226.2}`}
                                    transform={`rotate(-90 ${density === 'compact' ? 35 : 42.5} ${density === 'compact' ? 35 : 42.5})`}
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                />
                                <defs>
                                    <linearGradient id={`cpuGradient-${vm.vm_uuid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={getUsageColor(cpuPercent).main} />
                                        <stop offset="100%" stopColor={getUsageColor(cpuPercent).light} />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                                <Typography variant="h6" fontWeight={900} sx={{ fontSize: density === 'compact' ? '0.95rem' : '1.1rem', lineHeight: 1, color: getUsageColor(cpuPercent).main }}>
                                    {cpuPercent.toFixed(0)}%
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                                    CPU
                                </Typography>
                            </Box>
                        </Box>

                        {/* RAM Ring */}
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width={density === 'compact' ? 70 : 85} height={density === 'compact' ? 70 : 85}>
                                <circle
                                    cx={density === 'compact' ? 35 : 42.5}
                                    cy={density === 'compact' ? 35 : 42.5}
                                    r={density === 'compact' ? 30 : 36}
                                    fill="none"
                                    stroke={alpha(theme.palette.divider, 0.15)}
                                    strokeWidth="6"
                                />
                                <circle
                                    cx={density === 'compact' ? 35 : 42.5}
                                    cy={density === 'compact' ? 35 : 42.5}
                                    r={density === 'compact' ? 30 : 36}
                                    fill="none"
                                    stroke={`url(#memGradient-${vm.vm_uuid})`}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(density === 'compact' ? 188.5 : 226.2) * (memPercent / 100)} ${density === 'compact' ? 188.5 : 226.2}`}
                                    transform={`rotate(-90 ${density === 'compact' ? 35 : 42.5} ${density === 'compact' ? 35 : 42.5})`}
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                />
                                <defs>
                                    <linearGradient id={`memGradient-${vm.vm_uuid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={getUsageColor(memPercent).main} />
                                        <stop offset="100%" stopColor={getUsageColor(memPercent).light} />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                                <Typography variant="h6" fontWeight={900} sx={{ fontSize: density === 'compact' ? '0.95rem' : '1.1rem', lineHeight: 1, color: getUsageColor(memPercent).main }}>
                                    {memPercent.toFixed(0)}%
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                                    RAM
                                </Typography>
                            </Box>
                        </Box>

                        {/* Disk Ring */}
                        {density !== 'compact' && (
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width={85} height={85}>
                                    <circle
                                        cx={42.5}
                                        cy={42.5}
                                        r={36}
                                        fill="none"
                                        stroke={alpha(theme.palette.divider, 0.15)}
                                        strokeWidth="6"
                                    />
                                    <circle
                                        cx={42.5}
                                        cy={42.5}
                                        r={36}
                                        fill="none"
                                        stroke={`url(#diskGradient-${vm.vm_uuid})`}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${226.2 * (storagePercent / 100)} 226.2`}
                                        transform={`rotate(-90 42.5 42.5)`}
                                        style={{ transition: 'stroke-dasharray 1s ease' }}
                                    />
                                    <defs>
                                        <linearGradient id={`diskGradient-${vm.vm_uuid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={getUsageColor(storagePercent).main} />
                                            <stop offset="100%" stopColor={getUsageColor(storagePercent).light} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                                    <Typography variant="h6" fontWeight={900} sx={{ fontSize: '1.1rem', lineHeight: 1, color: getUsageColor(storagePercent).main }}>
                                        {storagePercent.toFixed(0)}%
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                                        DISK
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* Footer */}
                    <Box sx={{ mt: 'auto', pt: density === 'compact' ? 2 : 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${alpha(theme.palette.divider, 0.08)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.6)}`,
                                animation: 'pulse-glow 3s ease-in-out infinite'
                            }} />
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    fontFamily: "'JetBrains Mono', monospace", 
                                    color: 'primary.main', 
                                    fontWeight: 900, 
                                    fontSize: '0.75rem',
                                    letterSpacing: '0.02em',
                                    textShadow: theme.palette.mode === 'dark' ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}` : 'none'
                                }}
                            >
                                {vm.ip_address ? vm.ip_address.split(',')[0].trim() : 'Unassigned'}
                            </Typography>
                        </Box>

                        <Box className="card-actions" sx={{
                            display: 'flex',
                            gap: 0.75,
                            opacity: density === 'compact' ? 0.9 : 0,
                            transform: density === 'compact' ? 'none' : 'translateY(10px)',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}>
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); navigate(`/vms/${vm.vm_uuid}`); }}
                                sx={{
                                    color: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    width: 36, 
                                    height: 36,
                                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { 
                                        bgcolor: 'primary.main', 
                                        color: '#fff',
                                        transform: 'scale(1.15) rotate(5deg)',
                                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.4)}`
                                    }
                                }}
                            >
                                <ViewIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Fade>
    );
};

export default ModernVMCard;
