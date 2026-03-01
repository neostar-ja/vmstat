import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Typography,
    IconButton,
    alpha,
    Card,
    useTheme,
    Tooltip,
    Chip,
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
    CircularProgress
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Cloud as CloudIcon,
    Dns as DnsIcon,
    Router as RouterIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    VerifiedUser as VerifiedUserIcon,
    DeleteForever as DeletedIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
    PowerSettingsNew as ShutdownIcon,
    RestartAlt as RestartIcon,
    MoreVert as MoreVertIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { vmControlApi } from '../../services/api';
import WindowIcon from '@mui/icons-material/Window';
import AppleIcon from '@mui/icons-material/Apple';
import { SiUbuntu, SiCentos, SiDebian, SiRedhat, SiLinux } from 'react-icons/si';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import type { VM } from '../../types';

interface ModernVMTableProps {
    vms: VM[];
    formatUsage: (value: number | null) => string;
    formatStorage: (mb: number | null) => string;
    getUsageColor: (percentage: number) => { main: string; light: string };
}

type VMAction = 'start' | 'stop' | 'shutdown' | 'reboot';

interface ConfirmState {
    open: boolean;
    action: VMAction | '';
    vmUuid: string;
    vmName: string;
    label: string;
}

const ModernVMTable: React.FC<ModernVMTableProps> = ({
    vms,
    formatUsage,
    formatStorage,
    getUsageColor
}) => {
    const navigate = useNavigate();
    const theme = useTheme();
    // Dropdown state
    const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; vm: typeof vms[0] } | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState>({ open: false, action: '', vmUuid: '', vmName: '', label: '' });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
    const [loadingAction, setLoadingAction] = useState<string | null>(null); // 'vmUuid:action'
    const [pendingStates, setPendingStates] = useState<Record<string, string>>({}); // vmUuid -> expected power_state
    const queryClient = useQueryClient();

    const getExpectedPowerState = (action: VMAction): string =>
        action === 'stop' ? 'off' : 'on';

    const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, vm: typeof vms[0]) => {
        e.stopPropagation();
        setMenuAnchor({ el: e.currentTarget, vm });
    };

    const handleCloseMenu = () => setMenuAnchor(null);

    const ACTION_LABELS: Record<VMAction, string> = {
        start: 'Start VM',
        stop: 'Force Stop',
        shutdown: 'Shutdown',
        reboot: 'Restart',
    };

    const ACTION_CONFIG: Record<VMAction, {
        thaiTitle: string;
        thaiDesc: (vmName: string) => string;
        thaiWarning?: string;
        color: string;
        gradient: string;
    }> = {
        start: {
            thaiTitle: 'เริ่มต้นเครื่องเสมือน (Start)',
            thaiDesc: (n) => `ต้องการเริ่มต้นเครื่องเสมือน "${n}" ใช่หรือไม่?`,
            color: '#22c55e',
            gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
        },
        shutdown: {
            thaiTitle: 'ปิดเครื่องเสมือน (Shutdown)',
            thaiDesc: (n) => `ต้องการปิดเครื่องเสมือน "${n}" อย่างปกติใช่หรือไม่?`,
            thaiWarning: 'ระบบจะส่งสัญญาณปิดเครื่องให้ OS ปิดอย่างถูกต้อง (graceful shutdown)',
            color: '#f97316',
            gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
        },
        stop: {
            thaiTitle: 'บังคับปิดเครื่องเสมือน (Force Stop)',
            thaiDesc: (n) => `ต้องการบังคับปิดเครื่องเสมือน "${n}" ใช่หรือไม่?`,
            thaiWarning: 'การบังคับปิดจะหยุดเครื่องทันที อาจทำให้ข้อมูลที่ยังไม่ได้บันทึกสูญหาย',
            color: '#ef4444',
            gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        },
        reboot: {
            thaiTitle: 'รีสตาร์ทเครื่องเสมือน (Restart)',
            thaiDesc: (n) => `ต้องการรีสตาร์ทเครื่องเสมือน "${n}" ใช่หรือไม่?`,
            thaiWarning: 'ระบบจะปิดและเปิดเครื่องใหม่อย่างถูกต้อง (graceful restart)',
            color: '#3b82f6',
            gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
        },
    };

    const handleActionClick = (action: VMAction, vm: typeof vms[0]) => {
        handleCloseMenu();
        setConfirm({ open: true, action, vmUuid: vm.vm_uuid, vmName: vm.name, label: ACTION_LABELS[action] });
    };

    const executeAction = async (action: VMAction, vmUuid: string, vmName: string) => {
        const key = `${vmUuid}:${action}`;
        setLoadingAction(key);
        try {
            const resp = await vmControlApi.controlAction(vmUuid, action, false);
            const data = resp.data;
            // Optimistic instant update — show expected state immediately
            const expectedState = data.expected_power_state ?? getExpectedPowerState(action);
            setPendingStates(p => ({ ...p, [vmUuid]: expectedState }));
            setSnackbar({ open: true, message: `${ACTION_LABELS[action]} on "${vmName}" ${data.dry_run ? '(dry run) ' : ''}succeeded`, severity: 'success' });
            // Trigger a refetch after 6 s (backend MV refresh should be done by then).
            // Do NOT clear pendingStates here — useEffect below will clear it only when
            // the server data confirms the expected state, preventing the flash.
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['vms'] });
            }, 6000);
            // Safety: force-clear after 30 s in case server never agrees
            setTimeout(() => {
                setPendingStates(p => { const n = { ...p }; delete n[vmUuid]; return n; });
            }, 30000);
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || `Failed to execute ${action}`;
            setSnackbar({ open: true, message, severity: 'error' });
        } finally {
            setLoadingAction(null);
        }
    };

    // Clear pending state for a VM as soon as the server confirms the expected power_state.
    // This avoids the flash that occurs when pendingStates is cleared before the
    // invalidated query has fetched fresh data.
    useEffect(() => {
        if (Object.keys(pendingStates).length === 0) return;
        vms.forEach(vm => {
            if (pendingStates[vm.vm_uuid] && vm.power_state === pendingStates[vm.vm_uuid]) {
                setPendingStates(p => { const n = { ...p }; delete n[vm.vm_uuid]; return n; });
            }
        });
    }, [vms]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConfirm = () => {
        if (confirm.action && confirm.vmUuid) {
            setConfirm(prev => ({ ...prev, open: false }));
            executeAction(confirm.action as VMAction, confirm.vmUuid, confirm.vmName);
        }
    };

    // Premium pulse animation
    const pulseKeyframes = `
        @keyframes pulse-status {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
    `;

    const getOsIcon = (osType: string | null | undefined, osName: string | null | undefined) => {
        const type = (osType || '').toLowerCase();
        const name = (osName || '').toLowerCase();

        // Windows: explicit keyword OR Sangfor ws* codes (ws1664=Win2016, ws1264=Win2012, etc.)
        if (type.includes('windows') || name.includes('windows') || /^ws\d/.test(type)) return { icon: <WindowIcon sx={{ fontSize: 20 }} />, color: '#0078D7' };
        if (name.includes('ubuntu') || name.includes('linux-ubuntu')) return { icon: <SiUbuntu size={18} />, color: '#E95420' };
        if (name.includes('centos')) return { icon: <SiCentos size={18} />, color: '#932279' };
        if (name.includes('red hat') || name.includes('rhel')) return { icon: <SiRedhat size={18} />, color: '#EE0000' };
        if (name.includes('debian') || name.includes('linux-debian')) return { icon: <SiDebian size={18} />, color: '#A81D33' };
        // Linux: explicit keyword OR Sangfor l26* codes (l2664=Linux 64-bit)
        if (type.includes('linux') || name.includes('linux') || /^l\d/.test(type)) return { icon: <SiLinux size={18} />, color: '#FCC624' };
        if (type.includes('mac') || name.includes('mac')) return { icon: <AppleIcon sx={{ fontSize: 20 }} />, color: '#000000' };
        return { icon: <HelpOutlineIcon sx={{ fontSize: 20 }} />, color: '#9ca3af' };
    };

    const getAZColor = (azName: string | null) => {
        if (!azName) return { main: '#6b7280', light: '#9ca3af' };
        const colors = [
            { main: '#3b82f6', light: '#60a5fa' },
            { main: '#8b5cf6', light: '#a78bfa' },
            { main: '#ec4899', light: '#f472b6' },
            { main: '#f59e0b', light: '#fbbf24' },
            { main: '#10b981', light: '#34d399' },
            { main: '#06b6d4', light: '#22d3ee' },
            { main: '#f97316', light: '#fb923c' },
        ];
        const hash = azName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // Helper function to get protection status with color and VerifiedUserIcon
    const getProtectionStatus = (vm: VM) => {
        // Check if has backup_policy_enable from API data
        const hasBackupPolicy = vm.backup_file_count && vm.backup_file_count > 0;
        const hasProtection = vm.in_protection;

        // Based on the data structure, determine protection type
        if (hasProtection && hasBackupPolicy) {
            // Check if has backup policy name or type
            return {
                color: '#22c55e', // Green - Full DR Protection
                icon: VerifiedUserIcon,
                status: 'DR Protected',
                tooltip: `DR Protection Active\nBackup Files: ${vm.backup_file_count || 0}\nPolicy: ${vm.protection_name || 'Unnamed'}`
            };
        } else if (hasBackupPolicy || (hasProtection && vm.protection_name)) {
            return {
                color: '#f59e0b', // Amber - AZ Backup
                icon: VerifiedUserIcon,
                status: 'AZ Backup',
                tooltip: `AZ Backup Active\nBackup Files: ${vm.backup_file_count || 0}\nPolicy: ${vm.protection_name || 'Basic Backup'}`
            };
        } else {
            return {
                color: '#ef4444', // Red - No Protection
                icon: VerifiedUserIcon,
                status: 'Unprotected',
                tooltip: 'No protection policy configured'
            };
        }
    };

    return (
        <Box sx={{ position: 'relative' }}>
            <style>{pulseKeyframes}</style>

            {/* Desktop View: Table */}
            <TableContainer
                component={Card}
                elevation={0}
                sx={{
                    overflow: 'visible',
                    borderRadius: 5,
                    border: '2px solid',
                    borderColor: alpha(theme.palette.divider, 0.08),
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha('#1e293b', 0.95)} 0%, ${alpha('#0f172a', 0.98)} 100%)`
                        : `linear-gradient(135deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 1)} 100%)`,
                    backdropFilter: 'blur(24px)',
                    boxShadow: theme.palette.mode === 'dark'
                        ? `0 24px 56px -4px rgba(0,0,0,0.5), 0 0 0 1px ${alpha('#fff', 0.05)} inset`
                        : `0 24px 56px -4px rgba(0,0,0,0.1), 0 0 0 1px ${alpha('#000', 0.02)} inset`,
                }}
            >
                <Table sx={{ minWidth: 1000 }} stickyHeader>
                    <TableHead>
                        <TableRow
                            sx={{
                                '& th': {
                                    fontWeight: 1000,
                                    textTransform: 'uppercase',
                                    fontSize: '0.8rem',
                                    letterSpacing: '0.15em',
                                    color: theme.palette.text.primary,
                                    background: theme.palette.mode === 'dark'
                                        ? `linear-gradient(135deg, ${alpha('#1a1a2e', 0.98)} 0%, ${alpha('#16213e', 1)} 50%, ${alpha('#0f3460', 0.95)} 100%)`
                                        : `linear-gradient(135deg, ${alpha('#fefefe', 1)} 0%, ${alpha('#f0f9ff', 1)} 50%, ${alpha('#e0f2fe', 0.98)} 100%)`,
                                    borderBottom: `4px solid transparent`,
                                    py: 4,
                                    px: 3,
                                    position: 'relative',
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: theme.palette.mode === 'dark'
                                        ? `0 12px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 ${alpha('#60a5fa', 0.2)}, inset 0 -1px 0 ${alpha('#1e40af', 0.3)}`
                                        : `0 12px 32px -8px rgba(0,0,0,0.08), inset 0 1px 0 ${alpha('#dbeafe', 0.5)}, inset 0 -1px 0 ${alpha('#3b82f6', 0.1)}`,
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                                        borderRadius: '0',
                                        zIndex: -1
                                    },
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        bottom: -4,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '80%',
                                        height: '4px',
                                        background: `linear-gradient(90deg, transparent 0%, ${theme.palette.primary.main} 20%, ${theme.palette.secondary.main} 50%, ${theme.palette.primary.main} 80%, transparent 100%)`,
                                        borderRadius: '2px',
                                        opacity: 0,
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                    },
                                    '&:hover': {
                                        background: theme.palette.mode === 'dark'
                                            ? `linear-gradient(135deg, ${alpha('#1e293b', 1)} 0%, ${alpha('#1a2332', 1)} 50%, ${alpha('#0f4c75', 0.98)} 100%)`
                                            : `linear-gradient(135deg, ${alpha('#ffffff', 1)} 0%, ${alpha('#f8fafc', 1)} 50%, ${alpha('#e2e8f0', 1)} 100%)`,
                                        transform: 'translateY(-2px)',
                                        '&::after': {
                                            opacity: 0.8,
                                            width: '95%'
                                        }
                                    }
                                }
                            }}
                        >
                            <TableCell sx={{ pl: 4, minWidth: 280, maxWidth: 300 }}>VM NAME</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>ZONE</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>NETWORK</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>STATUS</TableCell>
                            <TableCell sx={{ minWidth: 280 }}>PERFORMANCE</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>STORAGE</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>PROTECTION</TableCell>
                            <TableCell align="right" sx={{ pr: 5, minWidth: 100 }}>ACTION</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vms.map((vm, index) => {
                            const cpuPercent = (vm.cpu_usage || 0) * 100;
                            const memPercent = (vm.memory_usage || 0) * 100;
                            const rawStorageUsage = vm.storage_usage || 0;
                            const storagePercent = rawStorageUsage <= 1 ? rawStorageUsage * 100 : rawStorageUsage;
                            const azColor = getAZColor(vm.az_name);
                            const osInfo = getOsIcon(vm.os_type, vm.os_name);
                            const protectionInfo = getProtectionStatus(vm);
                            const isCritical = cpuPercent > 90 || memPercent > 90 || storagePercent > 90;

                            return (
                                <TableRow
                                    key={vm.vm_uuid}
                                    hover
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: index % 2 === 0
                                            ? theme.palette.mode === 'dark'
                                                ? `linear-gradient(90deg, ${alpha('#1e293b', 0.3)} 0%, transparent 100%)`
                                                : `linear-gradient(90deg, ${alpha('#f8fafc', 0.8)} 0%, transparent 100%)`
                                            : 'transparent',
                                        borderLeft: isCritical ? `4px solid ${theme.palette.error.main}` : '4px solid transparent',
                                        opacity: vm.is_deleted ? 0.6 : 1,
                                        filter: vm.is_deleted ? 'grayscale(100%)' : 'none',
                                        '&:hover': {
                                            bgcolor: 'transparent',
                                            background: theme.palette.mode === 'dark'
                                                ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
                                                : `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                                            transform: 'translateX(4px) scale(1.001)',
                                            boxShadow: `4px 0 24px -4px ${alpha(theme.palette.primary.main, 0.15)}`,
                                            zIndex: 1,
                                            position: 'relative',
                                            '& .action-button': {
                                                opacity: 1,
                                                transform: 'scale(1.1) rotate(5deg)'
                                            }
                                        },
                                        '& .MuiTableCell-root': {
                                            py: 2.5,
                                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.04)}`
                                        }
                                    }}
                                    onClick={() => navigate(`/vms/${vm.vm_uuid}`)}
                                >
                                    {/* VM Name */}
                                    <TableCell sx={{ pl: 4, maxWidth: 300 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
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
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Tooltip title={vm.name} placement="top" arrow>
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight={800}
                                                            sx={{
                                                                color: theme.palette.text.primary,
                                                                fontSize: '1rem',
                                                                mb: 0.25,
                                                                letterSpacing: '-0.01em',
                                                                maxWidth: '200px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {vm.name}
                                                        </Typography>
                                                    </Tooltip>
                                                    {vm.is_deleted && (
                                                        <Chip
                                                            icon={<DeletedIcon sx={{ fontSize: 14 }} />}
                                                            label="DELETED"
                                                            size="small"
                                                            sx={{
                                                                height: 22,
                                                                bgcolor: alpha('#ef4444', 0.12),
                                                                color: '#ef4444',
                                                                border: `1px solid ${alpha('#ef4444', 0.3)}`,
                                                                fontWeight: 800,
                                                                fontSize: '0.65rem',
                                                                letterSpacing: '0.03em',
                                                                '& .MuiChip-icon': {
                                                                    color: '#ef4444',
                                                                    fontSize: 14
                                                                },
                                                                animation: 'pulse-deleted 2s ease-in-out infinite',
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, fontSize: '0.7rem' }}>
                                                    {vm.os_display_name || vm.os_name || 'Unknown OS'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    {/* Zone */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {/* Zone Badge */}
                                            <Card
                                                className="glass-card"
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    px: 1.8,
                                                    py: 1.2,
                                                    borderRadius: 3,
                                                    background: theme.palette.mode === 'dark'
                                                        ? `linear-gradient(135deg, ${alpha(azColor.main, 0.15)} 0%, ${alpha(azColor.main, 0.05)} 100%)`
                                                        : `linear-gradient(135deg, ${alpha(azColor.main, 0.08)} 0%, ${alpha(azColor.main, 0.02)} 100%)`,
                                                    border: '1px solid',
                                                    borderColor: alpha(azColor.main, 0.2),
                                                    boxShadow: `0 4px 12px ${alpha(azColor.main, 0.15)}`,
                                                    width: 'fit-content',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        width: 3,
                                                        height: '100%',
                                                        bgcolor: azColor.main,
                                                        opacity: 0.6
                                                    }
                                                }}
                                            >
                                                <CloudIcon sx={{ fontSize: 18, color: azColor.main }} />
                                                <Typography variant="body2" fontWeight={800} sx={{
                                                    color: azColor.main,
                                                    fontSize: '0.8rem',
                                                    textShadow: theme.palette.mode === 'dark' ? `0 0 10px ${alpha(azColor.main, 0.3)}` : 'none'
                                                }}>
                                                    {vm.az_name || 'Global'}
                                                </Typography>
                                            </Card>

                                            {/* Host IP (without "host" text) */}
                                            {vm.host_name && (
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    pl: 0.5
                                                }}>
                                                    <Box sx={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
                                                        boxShadow: `0 0 6px ${alpha(theme.palette.info.main, 0.4)}`
                                                    }} />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontFamily: '"JetBrains Mono", monospace',
                                                            color: theme.palette.text.secondary,
                                                            fontWeight: 600,
                                                            fontSize: '0.72rem',
                                                            opacity: 0.8
                                                        }}
                                                    >
                                                        {vm.host_name}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </TableCell>

                                    {/* Network */}
                                    <TableCell>
                                        <Card
                                            className="glass-card"
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                px: 2,
                                                py: 1.2,
                                                borderRadius: 3,
                                                background: theme.palette.mode === 'dark'
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.15)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`
                                                    : `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.info.main, 0.2),
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.15)}`,
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
                                            }}
                                        >
                                            <RouterIcon sx={{
                                                fontSize: 18,
                                                color: theme.palette.info.main,
                                                filter: `drop-shadow(0 0 4px ${alpha(theme.palette.info.main, 0.3)})`
                                            }} />
                                            <Typography variant="body2" sx={{
                                                fontFamily: '"JetBrains Mono", monospace',
                                                color: vm.ip_address ? theme.palette.text.primary : theme.palette.text.secondary,
                                                fontWeight: vm.ip_address ? 700 : 500,
                                                fontSize: '0.85rem',
                                                textShadow: vm.ip_address && theme.palette.mode === 'dark' ? `0 0 8px ${alpha(theme.palette.info.main, 0.2)}` : 'none'
                                            }}>
                                                {vm.ip_address ? vm.ip_address.split(',')[0] : '—'}
                                            </Typography>
                                        </Card>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 1.25,
                                                px: 2,
                                                py: 1,
                                                borderRadius: '16px',
                                                bgcolor: vm.is_deleted
                                                    ? alpha(theme.palette.text.disabled, 0.1)
                                                    : ((pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on'
                                                        ? alpha(theme.palette.success.main, 0.15)
                                                        : alpha(theme.palette.error.main, 0.15)),
                                                color: (pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on'
                                                    ? theme.palette.success.main
                                                    : vm.is_deleted
                                                        ? theme.palette.text.disabled
                                                        : theme.palette.error.main,
                                                border: `2px solid ${(pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on' ? alpha(theme.palette.success.main, 0.3) : (vm.is_deleted ? alpha(theme.palette.text.disabled, 0.3) : alpha(theme.palette.error.main, 0.3))}`,
                                                boxShadow: (pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on'
                                                    ? `0 4px 16px ${alpha(theme.palette.success.main, 0.25)}`
                                                    : vm.is_deleted
                                                        ? 'none'
                                                        : `0 4px 16px ${alpha(theme.palette.error.main, 0.25)}`
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: 'currentColor',
                                                    boxShadow: (pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on' ? '0 0 12px currentColor' : 'none',
                                                    animation: (pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on' ? 'pulse-status 2s infinite' : 'none',
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight={900} sx={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                                {vm.is_deleted ? 'DELETED' : ((pendingStates[vm.vm_uuid] ?? vm.power_state) === 'on' ? 'ONLINE' : 'OFFLINE')}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    {/* Performance (CPU + RAM) */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {/* CPU */}
                                            <Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Box sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                                        }}>
                                                            <DnsIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                                                        </Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                            CPU ({vm.cpu_cores || 0} vCPU)
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" fontWeight={900} sx={{
                                                        color: getUsageColor(cpuPercent).main,
                                                        fontSize: '0.8rem',
                                                        textShadow: theme.palette.mode === 'dark' ? `0 2px 8px ${alpha(getUsageColor(cpuPercent).main, 0.3)}` : 'none'
                                                    }}>
                                                        {formatUsage(vm.cpu_usage)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ position: 'relative', height: 8, borderRadius: 2, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.08) }}>
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        height: '100%',
                                                        width: `${cpuPercent}%`,
                                                        background: `linear-gradient(90deg, ${getUsageColor(cpuPercent).main}, ${getUsageColor(cpuPercent).light})`,
                                                        borderRadius: 2,
                                                        boxShadow: `0 0 12px ${alpha(getUsageColor(cpuPercent).main, 0.4)}`,
                                                        transition: 'width 1s ease, background 0.3s ease'
                                                    }} />
                                                </Box>
                                            </Box>
                                            {/* RAM */}
                                            <Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Box sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
                                                        }}>
                                                            <MemoryIcon sx={{ fontSize: 14, color: theme.palette.secondary.main }} />
                                                        </Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                            RAM ({formatStorage(vm.memory_total_mb)})
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" fontWeight={900} sx={{
                                                        color: getUsageColor(memPercent).main,
                                                        fontSize: '0.8rem',
                                                        textShadow: theme.palette.mode === 'dark' ? `0 2px 8px ${alpha(getUsageColor(memPercent).main, 0.3)}` : 'none'
                                                    }}>
                                                        {formatUsage(vm.memory_usage)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ position: 'relative', height: 8, borderRadius: 2, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.08) }}>
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        height: '100%',
                                                        width: `${memPercent}%`,
                                                        background: `linear-gradient(90deg, ${getUsageColor(memPercent).main}, ${getUsageColor(memPercent).light})`,
                                                        borderRadius: 2,
                                                        boxShadow: `0 0 12px ${alpha(getUsageColor(memPercent).main, 0.4)}`,
                                                        transition: 'width 1s ease, background 0.3s ease'
                                                    }} />
                                                </Box>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    {/* Storage */}
                                    <TableCell>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
                                                <Box sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                                    border: `1.5px solid ${alpha(theme.palette.info.main, 0.25)}`
                                                }}>
                                                    <StorageIcon sx={{ fontSize: 18, color: theme.palette.info.main }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" fontWeight={900} display="block" sx={{ lineHeight: 1.2, fontSize: '0.85rem', color: 'text.primary' }}>
                                                        {(() => {
                                                            const storageTotal = vm.storage_total_mb || 0;
                                                            const storageUsedMBFromUsage = (rawStorageUsage <= 1 ? rawStorageUsage : rawStorageUsage / 100) * storageTotal;
                                                            const usedMB = vm.storage_used_mb ?? storageUsedMBFromUsage;
                                                            return formatStorage(usedMB);
                                                        })()}
                                                        <Typography component="span" variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                                            {' / '}{formatStorage(vm.storage_total_mb)}
                                                        </Typography>
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700 }}>
                                                        {storagePercent.toFixed(1)}% Used
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ position: 'relative', height: 10, borderRadius: 2.5, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.08) }}>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    height: '100%',
                                                    width: `${storagePercent}%`,
                                                    background: `linear-gradient(90deg, ${getUsageColor(storagePercent).main}, ${getUsageColor(storagePercent).light})`,
                                                    borderRadius: 2.5,
                                                    boxShadow: `0 0 16px ${alpha(getUsageColor(storagePercent).main, 0.5)}`,
                                                    transition: 'width 1s ease'
                                                }} />
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    {/* Protection */}
                                    <TableCell>
                                        <Tooltip title={protectionInfo.tooltip} placement="top" arrow>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 2.5,
                                                    border: `2px solid ${alpha(protectionInfo.color, 0.3)}`,
                                                    bgcolor: alpha(protectionInfo.color, 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                    boxShadow: `0 4px 12px ${alpha(protectionInfo.color, 0.15)}`,
                                                    '&:hover': {
                                                        bgcolor: alpha(protectionInfo.color, 0.2),
                                                        border: `2px solid ${alpha(protectionInfo.color, 0.5)}`,
                                                        transform: 'scale(1.05)',
                                                        boxShadow: `0 8px 24px ${alpha(protectionInfo.color, 0.25)}`
                                                    }
                                                }}>
                                                    <protectionInfo.icon sx={{
                                                        fontSize: 20,
                                                        color: protectionInfo.color,
                                                        filter: `drop-shadow(0 0 4px ${alpha(protectionInfo.color, 0.4)})`
                                                    }} />
                                                </Box>
                                                <Typography variant="caption" fontWeight={700} sx={{
                                                    color: protectionInfo.color,
                                                    fontSize: '0.7rem',
                                                    textShadow: theme.palette.mode === 'dark' ? `0 0 8px ${alpha(protectionInfo.color, 0.3)}` : 'none'
                                                }}>
                                                    {protectionInfo.status}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell align="right" sx={{ pr: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                                            {/* View detail */}
                                            <Tooltip title="View Detail" arrow>
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        color: theme.palette.primary.main,
                                                        border: `1.5px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                                        borderRadius: 2,
                                                        width: 36,
                                                        height: 36,
                                                        transition: 'all 0.25s ease',
                                                        '&:hover': {
                                                            bgcolor: theme.palette.primary.main,
                                                            color: '#fff',
                                                            boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                                                        }
                                                    }}
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/vms/${vm.vm_uuid}`); }}
                                                >
                                                    <ViewIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>

                                            {/* Action dropdown */}
                                            <Tooltip title="VM Control" arrow>
                                                <IconButton
                                                    className="action-button"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                        color: theme.palette.warning.main,
                                                        border: `1.5px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                                                        borderRadius: 2,
                                                        width: 36,
                                                        height: 36,
                                                        transition: 'all 0.25s ease',
                                                        '&:hover': {
                                                            bgcolor: theme.palette.warning.main,
                                                            color: '#fff',
                                                            boxShadow: `0 6px 16px ${alpha(theme.palette.warning.main, 0.35)}`,
                                                        }
                                                    }}
                                                    onClick={(e) => handleOpenMenu(e, vm)}
                                                >
                                                    {loadingAction?.startsWith(vm.vm_uuid)
                                                        ? <CircularProgress size={16} color="inherit" />
                                                        : <MoreVertIcon sx={{ fontSize: 18 }} />}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            {/* Dropdown Menu */}
            <Menu
                anchorEl={menuAnchor?.el}
                open={Boolean(menuAnchor)}
                onClose={handleCloseMenu}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    elevation: 8,
                    sx: {
                        minWidth: 200,
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                        overflow: 'visible',
                        mt: 0.5,
                        '& .MuiMenuItem-root': { borderRadius: 2, mx: 0.5, my: 0.25, px: 2, py: 1 }
                    }
                }}
            >
                <MenuItem onClick={() => { handleCloseMenu(); navigate(`/vms/${menuAnchor?.vm.vm_uuid}`); }}>
                    <ListItemIcon><ViewIcon fontSize="small" color="primary" /></ListItemIcon>
                    <ListItemText primary="View Detail" />
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                {/* Start — only when OFF */}
                {(pendingStates[menuAnchor?.vm.vm_uuid ?? ''] ?? menuAnchor?.vm.power_state) !== 'on' && (
                    <MenuItem onClick={() => handleActionClick('start', menuAnchor!.vm)}>
                        <ListItemIcon><StartIcon fontSize="small" sx={{ color: '#22c55e' }} /></ListItemIcon>
                        <ListItemText primary="Start" primaryTypographyProps={{ color: '#22c55e', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {/* Shutdown — only when ON (graceful) */}
                {(pendingStates[menuAnchor?.vm.vm_uuid ?? ''] ?? menuAnchor?.vm.power_state) === 'on' && (
                    <MenuItem onClick={() => handleActionClick('shutdown', menuAnchor!.vm)}>
                        <ListItemIcon><ShutdownIcon fontSize="small" sx={{ color: '#f97316' }} /></ListItemIcon>
                        <ListItemText primary="Shutdown" primaryTypographyProps={{ color: '#f97316', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {/* Force Stop — only when ON */}
                {(pendingStates[menuAnchor?.vm.vm_uuid ?? ''] ?? menuAnchor?.vm.power_state) === 'on' && (
                    <MenuItem onClick={() => handleActionClick('stop', menuAnchor!.vm)}>
                        <ListItemIcon><StopIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                        <ListItemText primary="Force Stop" primaryTypographyProps={{ color: '#ef4444', fontWeight: 700 }} />
                    </MenuItem>
                )}
                <Divider sx={{ my: 0.5 }} />
                {/* Restart — only when ON (graceful) */}
                {(pendingStates[menuAnchor?.vm.vm_uuid ?? ''] ?? menuAnchor?.vm.power_state) === 'on' && (
                    <MenuItem onClick={() => handleActionClick('reboot', menuAnchor!.vm)}>
                        <ListItemIcon><RestartIcon fontSize="small" sx={{ color: '#3b82f6' }} /></ListItemIcon>
                        <ListItemText primary="Restart" primaryTypographyProps={{ color: '#3b82f6', fontWeight: 700 }} />
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
                        PaperProps={{ sx: { borderRadius: 4, minWidth: 420, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' } }}
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
                                {confirm.action === 'shutdown' && <ShutdownIcon sx={{ fontSize: 38, color: 'white' }} />}
                                {confirm.action === 'stop' && <StopIcon sx={{ fontSize: 38, color: 'white' }} />}
                                {confirm.action === 'reboot' && <RestartIcon sx={{ fontSize: 38, color: 'white' }} />}
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
                                    {confirm.vmName}
                                </Typography>
                            </Box>
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: cfg.thaiWarning ? 2 : 0.5 }}>
                                {cfg.thaiDesc(confirm.vmName)}
                            </Typography>
                            {cfg.thaiWarning && (
                                <Box sx={{
                                    bgcolor: alpha('#f59e0b', 0.08),
                                    border: '1px solid',
                                    borderColor: alpha('#f59e0b', 0.3),
                                    borderRadius: 2, p: 1.5,
                                    display: 'flex', gap: 1, alignItems: 'flex-start',
                                }}>
                                    <WarningIcon sx={{ color: '#f59e0b', fontSize: 18, mt: 0.15, flexShrink: 0 }} />
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
        </Box>
    );
};

export default ModernVMTable;
