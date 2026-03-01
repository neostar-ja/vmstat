import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    Box,
    Typography,
    alpha,
    useTheme,
    Tooltip,
    LinearProgress,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Snackbar,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Computer as ComputerIcon,
    Cloud as CloudIcon,
    Dns as DnsIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    VerifiedUser as VerifiedUserIcon,
    DeleteForever as DeletedIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
    RestartAlt as RebootIcon,
    Warning as ResetIcon,
    MoreVert as MoreVertIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { vmControlApi } from '../../services/api';
import { SiUbuntu, SiCentos, SiRedhat, SiLinux, SiDebian } from 'react-icons/si';
import { BsWindows } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import type { VM } from '../../types';

type ViewDensity = 'compact' | 'comfortable' | 'spacious';

interface ModernVMCardProfessionalProps {
    vm: VM;
    density?: ViewDensity;
    getUsageColor: (percentage: number) => { main: string; light: string; dark: string; bg: string };
    formatUsage: (value: number | null) => string;
    formatStorage: (mb: number | null) => string;
}

type VMAction = 'start' | 'stop' | 'reboot';

const ACTION_LABELS: Record<VMAction, string> = {
    start: 'Start VM',
    stop: 'Shutdown',
    reboot: 'Reboot',
};

const ACTION_CONFIG: Record<VMAction, {
    thaiTitle: string;
    thaiDesc: (vmName: string) => string;
    thaiWarning?: string;
    color: string;
    gradient: string;
}> = {
    start: {
        thaiTitle: '\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19',
        thaiDesc: (n: string) => `\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19 "${n}" \u0e43\u0e0a\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?`,
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
    },
    stop: {
        thaiTitle: '\u0e1b\u0e34\u0e14\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19 (Shutdown)',
        thaiDesc: (n: string) => `\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e1b\u0e34\u0e14\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19 "${n}" \u0e43\u0e0a\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?`,
        thaiWarning: '\u0e01\u0e32\u0e23\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e08\u0e30\u0e1b\u0e34\u0e14\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e17\u0e31\u0e19\u0e17\u0e35 \u0e2d\u0e32\u0e08\u0e17\u0e33\u0e43\u0e2b\u0e49\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e2a\u0e39\u0e0d\u0e2b\u0e32\u0e22',
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    },
    reboot: {
        thaiTitle: '\u0e23\u0e35\u0e1a\u0e39\u0e15\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19 (Reboot)',
        thaiDesc: (n: string) => `\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e23\u0e35\u0e1a\u0e39\u0e15\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19 "${n}" \u0e43\u0e0a\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?`,
        thaiWarning: '\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e30\u0e23\u0e35\u0e2a\u0e15\u0e32\u0e23\u0e4c\u0e17\u0e42\u0e14\u0e22\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e14\u0e46',
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    },
};



const ModernVMCardProfessional: React.FC<ModernVMCardProfessionalProps> = ({
    vm,
    density = 'comfortable',
    formatUsage,
    formatStorage
}) => {
    const navigate = useNavigate();
    const theme = useTheme();

    // Control dropdown state
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [confirm, setConfirm] = useState<{ open: boolean; action: VMAction | ''; label: string }>({ open: false, action: '', label: '' });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
    const [loadingAction, setLoadingAction] = useState(false);
    const [pendingPowerState, setPendingPowerState] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const handleActionClick = (action: VMAction) => {
        setMenuAnchor(null);
        setConfirm({ open: true, action, label: ACTION_LABELS[action] });
    };

    const executeAction = async (action: VMAction) => {
        setLoadingAction(true);
        try {
            const resp = await vmControlApi.controlAction(vm.vm_uuid, action, false);
            // Optimistic instant update
            const expectedState = resp.data.expected_power_state ?? (action === 'stop' ? 'off' : 'on');
            setPendingPowerState(expectedState);
            setSnackbar({ open: true, message: `${ACTION_LABELS[action]} on "${vm.name}" ${resp.data.dry_run ? '(dry run) ' : ''}succeeded`, severity: 'success' });
            // Trigger refetch after 6 s; do NOT clear pendingPowerState here.
            // useEffect below clears it once the server confirms the new state.
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['vms'] });
            }, 6000);
            // Safety: force-clear after 30 s
            setTimeout(() => { setPendingPowerState(null); }, 30000);
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || `Failed to execute ${action}`;
            setSnackbar({ open: true, message, severity: 'error' });
        } finally {
            setLoadingAction(false);
        }
    };

    // Clear pending state once the server-returned vm.power_state matches
    // the expected pending value (no flash between clear and fresh data arriving).
    useEffect(() => {
        if (pendingPowerState && vm.power_state === pendingPowerState) {
            setPendingPowerState(null);
        }
    }, [vm.power_state]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConfirm = () => {
        if (confirm.action) {
            setConfirm(prev => ({ ...prev, open: false }));
            executeAction(confirm.action as VMAction);
        }
    };

    const effectivePowerState = pendingPowerState ?? vm.power_state;
    const isOn = effectivePowerState === 'on';

    // OS Detection and Styling (เหมือน table view)
    const getOSInfo = (osType: string | null | undefined, osName: string | null | undefined) => {
        const type = (osType || '').toLowerCase();
        const name = (osName || '').toLowerCase();

        // Windows: explicit keyword OR Sangfor ws* codes (ws1664=Win2016, ws1264=Win2012, ws1964=Win2019, etc.)
        if (type.includes('windows') || name.includes('windows') || /^ws\d/.test(type)) {
            return {
                icon: <BsWindows size={24} />,
                color: '#0078D7',
                name: 'Windows'
            };
        } else if (name.includes('ubuntu') || name.includes('linux-ubuntu')) {
            return {
                icon: <SiUbuntu size={24} />,
                color: '#E95420',
                name: 'Ubuntu'
            };
        } else if (name.includes('centos')) {
            return {
                icon: <SiCentos size={24} />,
                color: '#932279',
                name: 'CentOS'
            };
        } else if (name.includes('red hat') || name.includes('rhel')) {
            return {
                icon: <SiRedhat size={24} />,
                color: '#EE0000',
                name: 'Red Hat'
            };
        } else if (name.includes('debian') || name.includes('linux-debian')) {
            return {
                icon: <SiDebian size={24} />,
                color: '#A81D33',
                name: 'Debian'
            };
        // Linux: explicit keyword OR Sangfor l26* codes (l2664=Linux 64-bit)
        } else if (type.includes('linux') || name.includes('linux') || /^l\d/.test(type)) {
            return {
                icon: <SiLinux size={24} />,
                color: '#FCC624',
                name: 'Linux'
            };
        }
        return {
            icon: <ComputerIcon sx={{ fontSize: 26 }} />,
            color: theme.palette.text.secondary,
            name: 'Unknown'
        };
    };

    // Protection Status
    const getProtectionStatus = (vm: VM) => {
        const hasBackupPolicy = vm.backup_file_count && vm.backup_file_count > 0;
        const hasProtection = vm.in_protection;

        if (hasProtection && hasBackupPolicy) {
            return {
                color: '#22c55e',
                status: 'DR Protected',
                level: 'High Security',
                tooltip: `DR Protection Active\nBackup Files: ${vm.backup_file_count || 0}\nPolicy: ${vm.protection_name || 'Unnamed'}`
            };
        } else if (hasBackupPolicy || (hasProtection && vm.protection_name)) {
            return {
                color: '#f59e0b',
                status: 'AZ Backup',
                level: 'Medium Security',
                tooltip: `AZ Backup Active\nBackup Files: ${vm.backup_file_count || 0}\nPolicy: ${vm.protection_name || 'Basic Backup'}`
            };
        } else {
            return {
                color: '#ef4444',
                status: 'Unprotected',
                level: 'No Security',
                tooltip: 'No protection policy configured'
            };
        }
    };

    // Performance Calculations
    const cpuPercent = (vm.cpu_usage || 0) * 100;
    const memPercent = (vm.memory_usage || 0) * 100;
    // Normalize storage usage: if backend stores fraction (0..1) or percent (0..100), handle both
    const rawStorageUsage = vm.storage_usage || 0;
    const storagePercent = rawStorageUsage <= 1 ? rawStorageUsage * 100 : rawStorageUsage;

    const osInfo = getOSInfo(vm.os_type, vm.os_name);
    const protectionInfo = getProtectionStatus(vm);
    const isActive = effectivePowerState === 'on' || vm.status?.toLowerCase() === 'poweredon' || vm.status?.toLowerCase() === 'running';
    const isCritical = cpuPercent > 90 || memPercent > 90 || storagePercent > 90;

    // Zone Color (แบบ table view)
    const getZoneColor = (azName: string | null) => {
        if (!azName) return { main: '#6b7280', light: '#9ca3af' };
        const colors = [
            { main: '#3b82f6', light: '#60a5fa' },
            { main: '#8b5cf6', light: '#a78bfa' },
            { main: '#ec4899', light: '#f472b6' },
            { main: '#f59e0b', light: '#fbbf24' },
            { main: '#10b981', light: '#34d399' },
            { main: '#ef4444', light: alpha('#ef4444', 0.1) },
            { main: '#8b5cf6', light: alpha('#8b5cf6', 0.1) },
        ];
        const zone = azName || 'default';
        const hash = zone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const zoneColor = getZoneColor(vm.az_name);

    return (
        <Card
            onClick={() => navigate(`/vms/${vm.vm_uuid}`)}
            sx={{
                height: density === 'compact' ? 490 : density === 'comfortable' ? 530 : 510,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'visible',
                borderRadius: 4,
                // Modern bright background
                background: theme.palette.mode === 'dark'
                    ? `linear-gradient(145deg, ${alpha('#1e293b', 0.85)} 0%, ${alpha('#0f172a', 0.80)} 50%, ${alpha('#020617', 0.85)} 100%)`
                    : `linear-gradient(145deg, ${alpha('#ffffff', 1)} 0%, ${alpha('#fefefe', 0.98)} 50%, ${alpha('#fafafa', 0.95)} 100%)`,
                border: '1.5px solid',
                borderColor: theme.palette.mode === 'dark'
                    ? alpha(osInfo.color, 0.25)
                    : alpha(osInfo.color, 0.15),
                boxShadow: theme.palette.mode === 'dark'
                    ? `0 16px 40px -8px ${alpha('#000', 0.4)}, 0 0 0 1px ${alpha(osInfo.color, 0.1)} inset`
                    : `0 16px 40px -8px ${alpha('#000', 0.08)}, 0 0 0 1px ${alpha(osInfo.color, 0.05)} inset`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    borderColor: alpha(osInfo.color, 0.3),
                    boxShadow: theme.palette.mode === 'dark'
                        ? `0 24px 56px -8px ${alpha('#000', 0.6)}, 0 0 0 1px ${alpha(osInfo.color, 0.2)} inset`
                        : `0 24px 56px -8px ${alpha('#000', 0.12)}, 0 0 0 1px ${alpha(osInfo.color, 0.1)} inset`,
                    transform: 'translateY(-4px)',
                    '& .performance-section': {
                        transform: 'scaleX(1.02)'
                    }
                },

                // Critical state pulsing
                ...(isCritical && {
                    animation: 'pulse 2s infinite ease-in-out',
                    '@keyframes pulse': {
                        '0%, 100%': {
                            boxShadow: theme.palette.mode === 'dark'
                                ? `0 16px 40px -8px ${alpha('#000', 0.4)}, 0 0 0 1px ${alpha('#ef4444', 0.3)} inset`
                                : `0 16px 40px -8px ${alpha('#000', 0.08)}, 0 0 0 1px ${alpha('#ef4444', 0.2)} inset`
                        },
                        '50%': {
                            boxShadow: theme.palette.mode === 'dark'
                                ? `0 20px 48px -8px ${alpha('#ef4444', 0.3)}, 0 0 0 1px ${alpha('#ef4444', 0.5)} inset`
                                : `0 20px 48px -8px ${alpha('#ef4444', 0.15)}, 0 0 0 1px ${alpha('#ef4444', 0.3)} inset`
                        }
                    }
                })
            }}
        >
            {/* Deleted Badge - แสดงที่มุมบนขวาถ้า VM ถูกลบ */}
            {vm.is_deleted && (
                <Chip
                    icon={<DeletedIcon sx={{ fontSize: 18 }} />}
                    label="DELETED FROM SCP"
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 10,
                        bgcolor: alpha('#ef4444', 0.15),
                        color: '#ef4444',
                        border: `1.5px solid ${alpha('#ef4444', 0.4)}`,
                        fontWeight: 800,
                        fontSize: '0.70rem',
                        letterSpacing: '0.05em',
                        backdropFilter: 'blur(12px)',
                        boxShadow: `0 4px 12px ${alpha('#ef4444', 0.25)}`,
                        '& .MuiChip-icon': {
                            color: '#ef4444'
                        },
                        animation: 'pulse-deleted 2s ease-in-out infinite',
                        '@keyframes pulse-deleted': {
                            '0%, 100%': {
                                opacity: 0.9,
                                transform: 'scale(1)'
                            },
                            '50%': {
                                opacity: 1,
                                transform: 'scale(1.02)'
                            }
                        }
                    }}
                />
            )}
            
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2 }}>
                {/* Header Section - แบบ Table View */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, mb: 3 }}>
                    {/* OS Icon แบบ Table View */}
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(osInfo.color, 0.18)}, ${alpha(osInfo.color, 0.06)})`,
                            border: `2px solid ${alpha(osInfo.color, 0.25)}`,
                            color: osInfo.color,
                            boxShadow: `0 8px 20px ${alpha(osInfo.color, 0.15)}, 0 0 0 4px ${alpha(osInfo.color, 0.05)}`,
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {React.cloneElement(osInfo.icon as React.ReactElement, { sx: { fontSize: 26 } })}
                    </Box>

                    {/* VM Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="overline" sx={{
                            color: theme.palette.text.secondary,
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            letterSpacing: '0.1em',
                            mb: 0.5,
                            display: 'block'
                        }}>
                            VIRTUAL MACHINE
                        </Typography>

                        <Tooltip title={vm.name} placement="top-start">
                            <Typography
                                variant="h4"
                                fontWeight={900}
                                sx={{
                                    color: theme.palette.text.primary,
                                    fontSize: density === 'compact' ? '1.3rem' : '1.5rem',
                                    lineHeight: 1.2,
                                    mb: 0.5,
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {vm.name}
                            </Typography>
                        </Tooltip>

                        {/* OS แบบ Table View - แสดงแค่ส่วนสำคัญ */}
                        <Typography variant="caption" sx={{
                            color: theme.palette.text.secondary,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {vm.os_display_name || vm.os_name || 'Unknown OS'}
                        </Typography>
                    </Box>

                    {/* Status Indicator with IP */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}>
                        <Box sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: isActive ? '#22c55e' : '#ef4444',
                            boxShadow: `0 0 16px ${alpha(isActive ? '#22c55e' : '#ef4444', 0.6)}`,
                            ...(isActive && {
                                animation: 'pulse-glow 1.5s ease-in-out infinite'
                            }),
                            '@keyframes pulse-glow': {
                                '0%, 100%': {
                                    boxShadow: `0 0 16px ${alpha('#22c55e', 0.6)}`,
                                    transform: 'scale(1)'
                                },
                                '50%': {
                                    boxShadow: `0 0 24px ${alpha('#22c55e', 0.8)}`,
                                    transform: 'scale(1.1)'
                                }
                            }
                        }} />
                        <Box>
                            <Typography variant="caption" fontWeight={900} sx={{
                                fontSize: '0.8rem',
                                letterSpacing: '0.05em',
                                color: isActive ? theme.palette.success.main : theme.palette.error.main,
                                display: 'block'
                            }}>
                                {isActive ? 'ONLINE' : 'OFFLINE'}
                            </Typography>
                            {vm.ip_address && (
                                <Typography variant="caption" sx={{
                                    color: theme.palette.text.secondary,
                                    fontSize: '0.65rem',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    display: 'block',
                                    mt: 0.2,
                                    fontWeight: 600
                                }}>
                                    {vm.ip_address.split(',')[0]}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Chip Cards Row - AZ, Protection */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {/* AZ Chip */}
                    <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 1,
                        borderRadius: 2.5,
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(zoneColor.main, 0.12)} 0%, ${alpha(zoneColor.main, 0.04)} 100%)`
                            : `linear-gradient(135deg, ${alpha(zoneColor.main, 0.06)} 0%, ${alpha(zoneColor.main, 0.01)} 100%)`,
                        border: '1px solid',
                        borderColor: alpha(zoneColor.main, 0.15),
                        boxShadow: `0 2px 6px ${alpha(zoneColor.main, 0.1)}`,
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 2,
                            height: '100%',
                            bgcolor: zoneColor.main,
                            opacity: 0.6
                        }
                    }}>
                        <CloudIcon sx={{ fontSize: 14, color: zoneColor.main }} />
                        <Typography variant="caption" fontWeight={800} sx={{
                            color: zoneColor.main,
                            fontSize: '0.7rem',
                            textShadow: theme.palette.mode === 'dark' ? `0 0 4px ${alpha(zoneColor.main, 0.2)}` : 'none'
                        }}>
                            {vm.az_name || 'Global Zone'}
                        </Typography>
                    </Box>

                    {/* Protection Chip */}
                    <Tooltip title={protectionInfo.tooltip} placement="top" arrow>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5,
                            py: 1,
                            borderRadius: 2.5,
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha(protectionInfo.color, 0.12)} 0%, ${alpha(protectionInfo.color, 0.04)} 100%)`
                                : `linear-gradient(135deg, ${alpha(protectionInfo.color, 0.06)} 0%, ${alpha(protectionInfo.color, 0.01)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha(protectionInfo.color, 0.15),
                            boxShadow: `0 2px 6px ${alpha(protectionInfo.color, 0.1)}`,
                            cursor: 'help',
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
                            <VerifiedUserIcon sx={{ fontSize: 14, color: protectionInfo.color }} />
                        </Box>
                    </Tooltip>
                </Box>

                {/* Performance Section - Ultra Compact */}
                <Box className="performance-section" sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mb: 1.5,
                        pb: 1,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`
                    }}>
                        <ComputerIcon sx={{ fontSize: 18, color: theme.palette.primary.main, opacity: 0.8 }} />
                        <Typography variant="subtitle2" fontWeight={800} sx={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: theme.palette.text.primary,
                            fontSize: '0.75rem'
                        }}>
                            Performance Metrics
                        </Typography>
                    </Box>

                    {/* CPU Performance - Super Compact with Blue/Purple Theme */}
                    <Box sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? alpha('#3b82f6', 0.08) : alpha('#dbeafe', 0.6),
                        border: `1px solid ${theme.palette.mode === 'dark' ? alpha('#3b82f6', 0.2) : alpha('#3b82f6', 0.25)}`,
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha('#3b82f6', 0.1)} 0%, ${alpha('#8b5cf6', 0.08)} 100%)`
                            : `linear-gradient(135deg, ${alpha('#dbeafe', 0.7)} 0%, ${alpha('#e0e7ff', 0.5)} 100%)`,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: theme.palette.mode === 'dark' 
                            ? `0 2px 8px ${alpha('#3b82f6', 0.1)}` 
                            : `0 2px 8px ${alpha('#3b82f6', 0.08)}`,
                        '&:hover': {
                            borderColor: alpha('#3b82f6', 0.35),
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#3b82f6', 0.12) : alpha('#dbeafe', 0.8),
                            boxShadow: theme.palette.mode === 'dark' 
                                ? `0 4px 12px ${alpha('#3b82f6', 0.2)}` 
                                : `0 4px 12px ${alpha('#3b82f6', 0.15)}`
                        },
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
                            opacity: 0.6
                        }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Box sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 1.2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha('#3b82f6', 0.15),
                                    border: `1px solid ${alpha('#3b82f6', 0.25)}`
                                }}>
                                    <DnsIcon sx={{ 
                                        fontSize: 13, 
                                        color: '#3b82f6'
                                    }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" fontWeight={700} sx={{
                                        color: '#3b82f6',
                                        textTransform: 'uppercase',
                                        fontSize: '0.6rem',
                                        display: 'block',
                                        letterSpacing: '0.03em',
                                        lineHeight: 1.2
                                    }}>
                                        CPU • {vm.cpu_cores || 0} vCPU
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500} sx={{
                                        lineHeight: 1,
                                        fontSize: '0.62rem',
                                        color: theme.palette.text.secondary,
                                        mt: 0.2
                                    }}>
                                        {formatUsage(vm.cpu_usage)}
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{
                                color: '#3b82f6',
                                fontSize: '0.9rem',
                                fontFeatureSettings: '"tnum"',
                                textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha('#3b82f6', 0.4)}` : 'none'
                            }}>
                                {cpuPercent > 0 ? cpuPercent.toFixed(1) : '0.0'}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(Math.max(cpuPercent, 0), 100)}
                            sx={{
                                height: 3.5,
                                borderRadius: 1.5,
                                bgcolor: alpha('#3b82f6', 0.1),
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                                    borderRadius: 1.5,
                                    boxShadow: `0 0 8px ${alpha('#3b82f6', 0.4)}`
                                }
                            }}
                        />
                    </Box>

                    {/* Memory Performance - Super Compact with Pink/Orange Theme */}
                    <Box sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? alpha('#ec4899', 0.08) : alpha('#fce7f3', 0.6),
                        border: `1px solid ${theme.palette.mode === 'dark' ? alpha('#ec4899', 0.2) : alpha('#ec4899', 0.25)}`,
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha('#ec4899', 0.1)} 0%, ${alpha('#f97316', 0.08)} 100%)`
                            : `linear-gradient(135deg, ${alpha('#fce7f3', 0.7)} 0%, ${alpha('#fed7aa', 0.5)} 100%)`,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: theme.palette.mode === 'dark' 
                            ? `0 2px 8px ${alpha('#ec4899', 0.1)}` 
                            : `0 2px 8px ${alpha('#ec4899', 0.08)}`,
                        '&:hover': {
                            borderColor: alpha('#ec4899', 0.35),
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#ec4899', 0.12) : alpha('#fce7f3', 0.8),
                            boxShadow: theme.palette.mode === 'dark' 
                                ? `0 4px 12px ${alpha('#ec4899', 0.2)}` 
                                : `0 4px 12px ${alpha('#ec4899', 0.15)}`
                        },
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            background: 'linear-gradient(180deg, #ec4899, #f97316)',
                            opacity: 0.6
                        }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Box sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 1.2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha('#ec4899', 0.15),
                                    border: `1px solid ${alpha('#ec4899', 0.25)}`
                                }}>
                                    <MemoryIcon sx={{ 
                                        fontSize: 13, 
                                        color: '#ec4899'
                                    }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" fontWeight={700} sx={{
                                        color: '#ec4899',
                                        textTransform: 'uppercase',
                                        fontSize: '0.6rem',
                                        display: 'block',
                                        letterSpacing: '0.03em',
                                        lineHeight: 1.2
                                    }}>
                                        RAM • {formatStorage(vm.memory_total_mb)}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{
                                        lineHeight: 1,
                                        fontSize: '0.62rem',
                                        color: theme.palette.text.secondary,
                                        mt: 0.2
                                    }}>
                                        {formatStorage(vm.memory_used_mb || (vm.memory_total_mb || 0) * (vm.memory_usage || 0))}
                                        <Typography component="span" variant="caption" color="text.disabled" fontWeight={400} sx={{ fontSize: '0.58rem' }}>
                                            {' / '}{formatStorage(vm.memory_total_mb)}
                                        </Typography>
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{
                                color: '#ec4899',
                                fontSize: '0.9rem',
                                fontFeatureSettings: '"tnum"',
                                textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha('#ec4899', 0.4)}` : 'none'
                            }}>
                                {memPercent > 0 ? memPercent.toFixed(1) : '0.0'}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(Math.max(memPercent, 0), 100)}
                            sx={{
                                height: 3.5,
                                borderRadius: 1.5,
                                bgcolor: alpha('#ec4899', 0.1),
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #ec4899 0%, #f97316 100%)',
                                    borderRadius: 1.5,
                                    boxShadow: `0 0 8px ${alpha('#ec4899', 0.4)}`
                                }
                            }}
                        />
                    </Box>

                    {/* Storage Performance - Super Compact with Teal/Green Theme */}
                    <Box sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? alpha('#14b8a6', 0.08) : alpha('#ccfbf1', 0.6),
                        border: `1px solid ${theme.palette.mode === 'dark' ? alpha('#14b8a6', 0.2) : alpha('#14b8a6', 0.25)}`,
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha('#14b8a6', 0.1)} 0%, ${alpha('#10b981', 0.08)} 100%)`
                            : `linear-gradient(135deg, ${alpha('#ccfbf1', 0.7)} 0%, ${alpha('#d1fae5', 0.5)} 100%)`,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: theme.palette.mode === 'dark' 
                            ? `0 2px 8px ${alpha('#14b8a6', 0.1)}` 
                            : `0 2px 8px ${alpha('#14b8a6', 0.08)}`,
                        '&:hover': {
                            borderColor: alpha('#14b8a6', 0.35),
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#14b8a6', 0.12) : alpha('#ccfbf1', 0.8),
                            boxShadow: theme.palette.mode === 'dark' 
                                ? `0 4px 12px ${alpha('#14b8a6', 0.2)}` 
                                : `0 4px 12px ${alpha('#14b8a6', 0.15)}`
                        },
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 3,
                            height: '100%',
                            background: 'linear-gradient(180deg, #14b8a6, #10b981)',
                            opacity: 0.6
                        }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Box sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 1.2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha('#14b8a6', 0.15),
                                    border: `1px solid ${alpha('#14b8a6', 0.25)}`
                                }}>
                                    <StorageIcon sx={{ 
                                        fontSize: 13, 
                                        color: '#14b8a6'
                                    }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" fontWeight={700} sx={{
                                        color: '#14b8a6',
                                        textTransform: 'uppercase',
                                        fontSize: '0.6rem',
                                        display: 'block',
                                        letterSpacing: '0.03em',
                                        lineHeight: 1.2
                                    }}>
                                        Storage Usage
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{
                                        lineHeight: 1,
                                        fontSize: '0.62rem',
                                        color: theme.palette.text.secondary,
                                        mt: 0.2
                                    }}>
                                        {(() => {
                                            const storageTotal = vm.storage_total_mb || 0;
                                            const storageUsedMBFromUsage = (rawStorageUsage <= 1 ? rawStorageUsage : rawStorageUsage / 100) * storageTotal;
                                            const usedMB = vm.storage_used_mb ?? storageUsedMBFromUsage;
                                            return formatStorage(usedMB);
                                        })()}
                                        <Typography component="span" variant="caption" color="text.disabled" fontWeight={400} sx={{ fontSize: '0.58rem' }}>
                                            {' / '}{formatStorage(vm.storage_total_mb)}
                                        </Typography>
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{
                                color: '#14b8a6',
                                fontSize: '0.9rem',
                                fontFeatureSettings: '"tnum"',
                                textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha('#14b8a6', 0.4)}` : 'none'
                            }}>
                                {storagePercent > 0 ? storagePercent.toFixed(1) : '0.0'}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(Math.max(storagePercent, 0), 100)}
                            sx={{
                                height: 3.5,
                                borderRadius: 1.5,
                                bgcolor: alpha('#14b8a6', 0.1),
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                                    borderRadius: 1.5,
                                    boxShadow: `0 0 8px ${alpha('#14b8a6', 0.4)}`
                                }
                            }}
                        />
                    </Box>
                </Box>

                {/* Bottom Action Buttons */}
                <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                    {/* View Details */}
                    <Box
                        onClick={(e) => { e.stopPropagation(); navigate(`/vms/${vm.vm_uuid}`); }}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            py: 1.5,
                            borderRadius: 3,
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha(osInfo.color, 0.15)} 0%, ${alpha(osInfo.color, 0.08)} 100%)`
                                : `linear-gradient(135deg, ${alpha(osInfo.color, 0.1)} 0%, ${alpha(osInfo.color, 0.05)} 100%)`,
                            border: `1.5px solid ${alpha(osInfo.color, 0.2)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 6px 16px ${alpha(osInfo.color, 0.25)}`,
                                borderColor: alpha(osInfo.color, 0.4),
                            }
                        }}
                    >
                        <ViewIcon sx={{ fontSize: 18, color: osInfo.color }} />
                        <Typography variant="body2" fontWeight={700} sx={{ color: osInfo.color, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            View Details
                        </Typography>
                    </Box>

                    {/* Control dropdown */}
                    <Tooltip title="VM Control" arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 3,
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: theme.palette.warning.main,
                                border: `1.5px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    bgcolor: theme.palette.warning.main,
                                    color: '#fff',
                                    boxShadow: `0 6px 16px ${alpha(theme.palette.warning.main, 0.35)}`,
                                    transform: 'translateY(-2px)',
                                }
                            }}
                        >
                            {loadingAction ? <CircularProgress size={18} color="inherit" /> : <MoreVertIcon sx={{ fontSize: 20 }} />}
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Action Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
                    onClick={(e) => e.stopPropagation()}
                    PaperProps={{
                        elevation: 8,
                        sx: {
                            minWidth: 190,
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                            mb: 0.5,
                            '& .MuiMenuItem-root': { borderRadius: 2, mx: 0.5, my: 0.25, px: 2, py: 1 }
                        }
                    }}
                >
                    <MenuItem onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); navigate(`/vms/${vm.vm_uuid}`); }}>
                        <ListItemIcon><ViewIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="View Detail" />
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    {!isOn && (
                        <MenuItem onClick={(e) => { e.stopPropagation(); handleActionClick('start'); }}>
                            <ListItemIcon><StartIcon fontSize="small" sx={{ color: '#22c55e' }} /></ListItemIcon>
                            <ListItemText primary="Start" primaryTypographyProps={{ color: '#22c55e', fontWeight: 700 }} />
                        </MenuItem>
                    )}
                    {isOn && (
                        <MenuItem onClick={(e) => { e.stopPropagation(); handleActionClick('stop'); }}>
                            <ListItemIcon><StopIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                            <ListItemText primary="Shutdown" primaryTypographyProps={{ color: '#ef4444', fontWeight: 700 }} />
                        </MenuItem>
                    )}
                    {isOn && (
                        <MenuItem onClick={(e) => { e.stopPropagation(); handleActionClick('reboot'); }}>
                            <ListItemIcon><RebootIcon fontSize="small" sx={{ color: '#3b82f6' }} /></ListItemIcon>
                            <ListItemText primary="Reboot" primaryTypographyProps={{ color: '#3b82f6', fontWeight: 700 }} />
                        </MenuItem>
                    )}
                </Menu>

                {/* Confirmation Dialog — Thai Beautiful */}
                {(() => {
                    const cfg = confirm.action ? ACTION_CONFIG[confirm.action as VMAction] : ACTION_CONFIG.start;
                    return (
                        <Dialog
                            open={confirm.open}
                            onClose={() => setConfirm(prev => ({ ...prev, open: false }))}
                            onClick={(e) => e.stopPropagation()}
                            PaperProps={{ sx: { borderRadius: 4, minWidth: 400, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' } }}
                        >
                            {/* Gradient Header */}
                            <Box sx={{
                                background: cfg.gradient,
                                pt: 4, pb: 3, px: 3,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                            }}>
                                <Box sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '50%',
                                    width: 72, height: 72,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid rgba(255,255,255,0.5)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                }}>
                                    {confirm.action === 'start' && <StartIcon sx={{ fontSize: 38, color: 'white' }} />}
                                    {confirm.action === 'stop' && <StopIcon sx={{ fontSize: 38, color: 'white' }} />}
                                    {confirm.action === 'reboot' && <RebootIcon sx={{ fontSize: 38, color: 'white' }} />}
                                </Box>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, textAlign: 'center', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                                    {cfg.thaiTitle}
                                </Typography>
                            </Box>
                            <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
                                <Box sx={{
                                    bgcolor: alpha(cfg.color, 0.06),
                                    border: '1px solid',
                                    borderColor: alpha(cfg.color, 0.2),
                                    borderRadius: 2, p: 2, mb: 2.5, textAlign: 'center',
                                }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, letterSpacing: 0.5 }}>
                                        เครื่องเสมือน (VM)
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: cfg.color }}>
                                        {vm.name}
                                    </Typography>
                                </Box>
                                <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: cfg.thaiWarning ? 2 : 0.5 }}>
                                    {cfg.thaiDesc(vm.name)}
                                </Typography>
                                {cfg.thaiWarning && (
                                    <Box sx={{
                                        bgcolor: alpha('#f59e0b', 0.08),
                                        border: '1px solid',
                                        borderColor: alpha('#f59e0b', 0.3),
                                        borderRadius: 2, p: 1.5,
                                        display: 'flex', gap: 1, alignItems: 'flex-start',
                                    }}>
                                        <ResetIcon sx={{ color: '#f59e0b', fontSize: 18, mt: 0.15, flexShrink: 0 }} />
                                        <Typography variant="body2" sx={{ color: '#92400e', lineHeight: 1.5 }}>
                                            {cfg.thaiWarning}
                                        </Typography>
                                    </Box>
                                )}
                            </DialogContent>
                            <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => setConfirm(prev => ({ ...prev, open: false }))}
                                    sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 600, fontSize: '1rem' }}
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleConfirm}
                                    sx={{
                                        borderRadius: 2.5, py: 1.2,
                                        fontWeight: 700, fontSize: '1rem',
                                        bgcolor: cfg.color,
                                        boxShadow: `0 4px 14px ${alpha(cfg.color, 0.4)}`,
                                        '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.88)', boxShadow: `0 6px 20px ${alpha(cfg.color, 0.5)}` },
                                    }}
                                >
                                    ยืนยัน
                                </Button>
                            </DialogActions>
                        </Dialog>
                    );
                })()}

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={5000}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </CardContent>
        </Card>
    );
};

export default ModernVMCardProfessional;