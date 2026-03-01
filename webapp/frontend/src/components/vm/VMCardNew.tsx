/**
 * VMCardNew.tsx — Ultra-Modern Mobile-First VM Card
 * Fully responsive design built for mobile screens.
 * Clean, colorful, professional with MUI + Tailwind CSS.
 */
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Card,
    Box,
    Typography,
    alpha,
    useTheme,
    Tooltip,
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
    Chip,
    LinearProgress,
} from '@mui/material';
import {
    PlayArrow as StartIcon,
    Stop as StopIcon,
    PowerSettingsNew as ShutdownIcon,
    RestartAlt as RebootIcon,
    Warning as WarnIcon,
    MoreVert as MoreVertIcon,
    Visibility as ViewIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    Dns as CpuIcon,
    Cloud as CloudIcon,
    VerifiedUser as ShieldIcon,
    DeleteForever as DeletedIcon,
    AccountTree as GroupIcon,
    Computer as HostIcon,
    NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { SiUbuntu, SiCentos, SiRedhat, SiLinux, SiDebian } from 'react-icons/si';
import { BsWindows } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import { vmControlApi } from '../../services/api';
import type { VM } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
type VMAction = 'start' | 'stop' | 'shutdown' | 'reboot';

interface Props {
    vm: VM;
    formatUsage?: (value: number | null) => string;
    formatStorage: (mb: number | null) => string;
    getUsageColor: (pct: number) => { main: string; light: string; dark: string; bg: string };
}

// ─── Action config ──────────────────────────────────────────────────────────
const ACTION_LABELS: Record<VMAction, string> = {
    start: 'Start VM',
    stop: 'Force Stop',
    shutdown: 'Shutdown',
    reboot: 'Restart',
};

const ACTION_CONFIG: Record<VMAction, {
    thaiTitle: string;
    thaiDesc: (n: string) => string;
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

// ─── OS detection ─────────────────────────────────────────────────────────────
function getOSInfo(osType: string | null | undefined, osName: string | null | undefined, fallbackColor: string) {
    const t = (osType || '').toLowerCase();
    const n = (osName || '').toLowerCase();

    if (t.includes('windows') || n.includes('windows') || /^ws\d/.test(t))
        return { icon: <BsWindows />, color: '#0078D7', label: 'Windows' };
    if (n.includes('ubuntu'))
        return { icon: <SiUbuntu />, color: '#E95420', label: 'Ubuntu' };
    if (n.includes('centos'))
        return { icon: <SiCentos />, color: '#932279', label: 'CentOS' };
    if (n.includes('red hat') || n.includes('rhel'))
        return { icon: <SiRedhat />, color: '#EE0000', label: 'Red Hat' };
    if (n.includes('debian'))
        return { icon: <SiDebian />, color: '#A81D33', label: 'Debian' };
    if (t.includes('linux') || n.includes('linux') || /^l\d/.test(t))
        return { icon: <SiLinux />, color: '#FCC624', label: 'Linux' };

    return { icon: <HostIcon />, color: fallbackColor, label: 'Unknown' };
}

// ─── Protection ───────────────────────────────────────────────────────────────
function getProtection(vm: VM) {
    if (vm.in_protection && vm.backup_file_count && vm.backup_file_count > 0)
        return { color: '#22c55e', label: 'DR Protected', bgColor: 'rgba(34,197,94,0.12)', tips: `Backups: ${vm.backup_file_count}` };
    if (vm.backup_file_count || vm.protection_name)
        return { color: '#f59e0b', label: 'AZ Backup', bgColor: 'rgba(245,158,11,0.12)', tips: `Backups: ${vm.backup_file_count || 0}` };
    return { color: '#ef4444', label: 'Unprotected', bgColor: 'rgba(239,68,68,0.10)', tips: 'No backup policy' };
}

// ─── Min-metric row ──────────────────────────────────────────────────────────
interface MetricBarProps {
    icon: React.ReactNode;
    label: string;
    pct: number;
    value: string;
    total: string;
    color: string;
}

const MetricBar: React.FC<MetricBarProps> = ({ icon, label, pct, value, total, color }) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const clamped = Math.min(Math.max(pct, 0), 100);
    const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f97316' : color;

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: '2px', sm: '3px', md: '4px' },
            p: { xs: '6px 7px', sm: '7px 9px', md: '10px' },
            borderRadius: { xs: '6px', sm: '8px', md: '10px' },
            bgcolor: dark ? alpha(barColor, 0.08) : alpha(barColor, 0.05),
            border: `1px solid ${alpha(barColor, dark ? 0.2 : 0.15)}`,
            minWidth: 0,
            overflow: 'hidden',
        }}>
            {/* Label and percentage row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: { xs: '2px', sm: '3px', md: '4px' }, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '3px', sm: '4px', md: '5px' }, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <Box sx={{ color: barColor, display: 'flex', alignItems: 'center', fontSize: { xs: '10px', sm: '11px', md: '13px' }, flexShrink: 0 }}>
                        {icon}
                    </Box>
                    <Typography sx={{
                        fontSize: { xs: '0.52rem', sm: '0.58rem', md: '0.65rem' },
                        fontWeight: 700,
                        color: barColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {label}
                    </Typography>
                </Box>
                <Typography sx={{
                    fontSize: { xs: '0.62rem', sm: '0.68rem', md: '0.75rem' },
                    fontWeight: 800,
                    color: barColor,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    ml: 'auto',
                    pl: 0.5,
                }}>
                    {clamped > 0 ? `${pct.toFixed(0)}%` : '—'}
                </Typography>
            </Box>

            {/* Progress bar */}
            <LinearProgress
                variant="determinate"
                value={clamped}
                sx={{
                    height: { xs: 3, sm: 4, md: 5 },
                    borderRadius: 2,
                    bgcolor: alpha(barColor, dark ? 0.15 : 0.12),
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        bgcolor: barColor,
                    },
                }}
            />

            {/* Value / Total */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <Typography sx={{
                    fontSize: { xs: '0.52rem', sm: '0.58rem', md: '0.65rem' },
                    color: dark ? alpha('#fff', 0.6) : alpha('#000', 0.5),
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                }}>
                    <Box component="span" sx={{ color: barColor, fontWeight: 700, mr: '2px' }}>{value}</Box>
                    <Box component="span">/ {total}</Box>
                </Typography>
                {pct >= 90 && (
                    <Chip
                        label="HI"
                        size="small"
                        sx={{
                            height: { xs: 10, sm: 12, md: 14 },
                            fontSize: { xs: '0.38rem', sm: '0.43rem', md: '0.5rem' },
                            fontWeight: 800,
                            bgcolor: alpha('#ef4444', 0.12),
                            color: '#ef4444',
                            border: `1px solid ${alpha('#ef4444', 0.3)}`,
                            '& .MuiChip-label': { px: { xs: '2px', sm: '3px', md: '4px' } },
                            flexShrink: 0,
                        }}
                    />
                )}
            </Box>
        </Box>
    );
};

// ─── Main Card ────────────────────────────────────────────────────────────────
const VMCardNew: React.FC<Props> = ({ vm, formatStorage }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const dark = theme.palette.mode === 'dark';

    // ── Power state (optimistic) ─────────────────────────────────────────────
    const [pendingState, setPendingState] = useState<string | null>(null);
    const effectivePS = pendingState ?? vm.power_state;
    const isOn = effectivePS === 'on';

    useEffect(() => {
        if (pendingState && vm.power_state === pendingState) setPendingState(null);
    }, [vm.power_state]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Action menu / confirm / snackbar state ────────────────────────────────
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [confirm, setConfirm] = useState<{ open: boolean; action: VMAction | '' }>({ open: false, action: '' });
    const [busy, setBusy] = useState(false);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; ok: boolean }>({ open: false, msg: '', ok: true });

    const executeAction = async (action: VMAction) => {
        setBusy(true);
        try {
            const resp = await vmControlApi.controlAction(vm.vm_uuid, action, false);
            const expected = resp.data.expected_power_state ?? (action === 'stop' ? 'off' : 'on');
            setPendingState(expected);
            setSnack({ open: true, msg: `${ACTION_LABELS[action]} on "${vm.name}" succeeded`, ok: true });
            setTimeout(() => { queryClient.invalidateQueries({ queryKey: ['vms'] }); }, 6000);
            setTimeout(() => { setPendingState(null); }, 30000);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || `Failed to execute ${action}`;
            setSnack({ open: true, msg, ok: false });
        } finally {
            setBusy(false);
        }
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const os = getOSInfo(vm.os_type, vm.os_name, theme.palette.text.secondary);
    const prot = getProtection(vm);

    const normalizePercent = (v: number | null | undefined) => {
        if (!v && v !== 0) return 0;
        return v <= 1 ? v * 100 : v;
    };

    const cpuPct = normalizePercent(vm.cpu_usage);
    const memPct = normalizePercent(vm.memory_usage);
    const storPct = normalizePercent(vm.storage_usage);

    const ip = vm.ip_address ? vm.ip_address.split(',')[0].trim() : null;

    // Status pill config
    const statusColor = isOn ? '#22c55e' : '#94a3b8';
    const headerGradient = isOn
        ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #0ea5e9 100%)'
        : 'linear-gradient(135deg, #334155 0%, #475569 40%, #64748b 100%)';

    return (
        <Card
            onClick={() => navigate(`/vms/${vm.vm_uuid}`)}
            sx={{
                cursor: 'pointer',
                position: 'relative',
                borderRadius: { xs: '10px', sm: '12px', md: '16px' },
                overflow: 'visible',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'transparent',
                boxShadow: dark
                    ? '0 4px 24px rgba(0,0,0,0.4)'
                    : '0 4px 20px rgba(0,0,0,0.10)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: dark
                        ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(statusColor, 0.3)}`
                        : `0 8px 28px rgba(0,0,0,0.14), 0 0 0 1px ${alpha(statusColor, 0.2)}`,
                },
            }}
        >
            {/* ── Header Section ──────────────────────────────────────────── */}
            <Box sx={{
                background: headerGradient,
                borderRadius: { xs: '10px 10px 0 0', sm: '12px 12px 0 0', md: '16px 16px 0 0' },
                pt: vm.is_deleted ? { xs: 2.5, sm: 3, md: 4 } : { xs: 1, sm: 1.3, md: 2 },
                pb: { xs: 1, sm: 1.3, md: 2 },
                px: { xs: 1, sm: 1.3, md: 2 },
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, right: 0, bottom: 0, left: 0,
                    background: 'radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)',
                    pointerEvents: 'none',
                },
            }}>
                {/* Deleted Banner */}
                {vm.is_deleted && (
                    <Box sx={{
                        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                        bgcolor: 'rgba(0,0,0,0.75)', py: '5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        borderBottom: '1px solid rgba(248,113,113,0.5)',
                    }}>
                        <DeletedIcon sx={{ fontSize: 14, color: '#f87171' }} />
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.08em' }}>
                            DELETED
                        </Typography>
                    </Box>
                )}

                {/* Status row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: '5px', sm: '7px', md: '12px' }, position: 'relative', zIndex: 1 }}>
                    {/* Status pill */}
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: { xs: '3px', sm: '4px', md: '6px' },
                        px: { xs: '5px', sm: '7px', md: '10px' }, py: { xs: '2px', sm: '3px', md: '4px' },
                        borderRadius: '999px',
                        bgcolor: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                    }}>
                        <Box sx={{
                            width: { xs: 5, sm: 6, md: 7 }, height: { xs: 5, sm: 6, md: 7 }, borderRadius: '50%',
                            bgcolor: isOn ? '#4ade80' : '#f87171',
                            boxShadow: isOn ? '0 0 8px rgba(74,222,128,0.8)' : '0 0 8px rgba(248,113,113,0.8)',
                            animation: isOn ? 'vm-pulse 2.5s ease-in-out infinite' : 'none',
                            '@keyframes vm-pulse': {
                                '0%,100%': { boxShadow: '0 0 6px rgba(74,222,128,0.8)' },
                                '50%': { boxShadow: '0 0 12px rgba(74,222,128,1)' },
                            },
                        }} />
                        <Typography sx={{ fontSize: { xs: '0.52rem', sm: '0.58rem', md: '0.65rem' }, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                            {isOn ? 'ONLINE' : 'OFFLINE'}
                        </Typography>
                        {pendingState && (
                            <CircularProgress size={8} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                        )}
                    </Box>

                    {/* Action button */}
                    <Tooltip title="Actions" placement="left">
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
                            sx={{
                                width: { xs: 24, sm: 26, md: 32 }, height: { xs: 24, sm: 26, md: 32 }, 
                                borderRadius: { xs: '6px', sm: '7px', md: '10px' },
                                bgcolor: 'rgba(255,255,255,0.18)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                color: '#fff',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
                            }}
                        >
                            {busy ? (
                                <CircularProgress size={12} sx={{ color: '#fff' }} />
                            ) : (
                                <MoreVertIcon sx={{ fontSize: { xs: 14, sm: 16, md: 18 } }} />
                            )}
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* VM Name + OS */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '6px', sm: '8px', md: '12px' }, position: 'relative', zIndex: 1 }}>
                    {/* OS Icon */}
                    <Box sx={{
                        flexShrink: 0,
                        width: { xs: 32, sm: 36, md: 42 }, height: { xs: 32, sm: 36, md: 42 },
                        borderRadius: { xs: '7px', sm: '9px', md: '12px' },
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        border: '1.5px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        fontSize: { xs: 15, sm: 17, md: 20 },
                    }}>
                        {os.icon}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                            fontWeight: 800,
                            fontSize: { xs: '0.75rem', sm: '0.82rem', md: '0.95rem' },
                            color: '#fff',
                            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                        }}>
                            {vm.name}
                        </Typography>
                        <Typography sx={{
                            fontSize: { xs: '0.55rem', sm: '0.62rem', md: '0.7rem' },
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: 500,
                            mt: '1px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {vm.os_display_name || vm.os_name || os.label}
                        </Typography>
                    </Box>
                </Box>

                {/* Tags row */}
                <Box sx={{
                    display: 'flex', flexWrap: 'wrap', gap: { xs: '3px', sm: '4px', md: '5px' },
                    mt: { xs: '5px', sm: '7px', md: '10px' }, position: 'relative', zIndex: 1,
                }}>
                    {vm.az_name && (
                        <Chip
                            icon={<CloudIcon sx={{ fontSize: { xs: '8px !important', sm: '9px !important', md: '11px !important' } }} />}
                            label={vm.az_name}
                            size="small"
                            sx={{
                                height: { xs: 15, sm: 17, md: 20 }, maxWidth: '120px',
                                fontSize: { xs: '0.48rem', sm: '0.53rem', md: '0.6rem' }, fontWeight: 700,
                                bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                '& .MuiChip-label': { px: { xs: '4px', sm: '5px', md: '6px' }, overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                        />
                    )}
                    {vm.group_name && (
                        <Chip
                            icon={<GroupIcon sx={{ fontSize: { xs: '8px !important', sm: '9px !important', md: '11px !important' } }} />}
                            label={vm.group_name}
                            size="small"
                            sx={{
                                height: { xs: 15, sm: 17, md: 20 }, maxWidth: '120px',
                                fontSize: { xs: '0.48rem', sm: '0.53rem', md: '0.6rem' }, fontWeight: 700,
                                bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                '& .MuiChip-label': { px: { xs: '4px', sm: '5px', md: '6px' }, overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                        />
                    )}
                    {ip && (
                        <Chip
                            icon={<NetworkIcon sx={{ fontSize: { xs: '8px !important', sm: '9px !important', md: '11px !important' } }} />}
                            label={ip}
                            size="small"
                            sx={{
                                height: { xs: 15, sm: 17, md: 20 }, maxWidth: '130px',
                                fontSize: { xs: '0.48rem', sm: '0.53rem', md: '0.6rem' }, fontWeight: 700,
                                fontFamily: '"SF Mono", monospace',
                                bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                '& .MuiChip-label': { px: { xs: '4px', sm: '5px', md: '6px' }, overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                        />
                    )}
                </Box>
            </Box>

            {/* ── Body Section ─────────────────────────────────────────────── */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                p: { xs: '7px', sm: '9px', md: '12px' },
                gap: { xs: '4px', sm: '5px', md: '8px' },
                background: dark
                    ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: { xs: '0 0 10px 10px', sm: '0 0 12px 12px', md: '0 0 16px 16px' },
                border: '1px solid',
                borderTop: 'none',
                borderColor: dark
                    ? alpha(isOn ? '#2563eb' : '#475569', 0.3)
                    : alpha(isOn ? '#93c5fd' : '#cbd5e1', 0.4),
            }}>
                {/* Metrics: CPU / RAM / Disk */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '4px', sm: '5px', md: '6px' } }}>
                    <MetricBar
                        icon={<CpuIcon sx={{ fontSize: '13px' }} />}
                        label="CPU"
                        pct={cpuPct}
                        color="#60a5fa"
                        value={cpuPct > 0 ? `${cpuPct.toFixed(1)}%` : '—'}
                        total={vm.cpu_cores ? `${vm.cpu_cores} Cores` : '—'}
                    />
                    <MetricBar
                        icon={<MemoryIcon sx={{ fontSize: '13px' }} />}
                        label="RAM"
                        pct={memPct}
                        color="#34d399"
                        value={vm.memory_used_mb ? formatStorage(vm.memory_used_mb) : '—'}
                        total={formatStorage(vm.memory_total_mb)}
                    />
                    <MetricBar
                        icon={<StorageIcon sx={{ fontSize: '13px' }} />}
                        label="DISK"
                        pct={storPct}
                        color="#a78bfa"
                        value={vm.storage_used_mb ? formatStorage(vm.storage_used_mb) : '—'}
                        total={formatStorage(vm.storage_total_mb)}
                    />
                </Box>

                {/* Host + IP Info */}
                {(vm.host_name || ip) && (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: vm.host_name && ip ? '1fr 1fr' : '1fr',
                        gap: { xs: '4px', sm: '5px', md: '6px' },
                        p: { xs: '6px', sm: '8px', md: '10px' },
                        borderRadius: { xs: '6px', sm: '8px', md: '10px' },
                        bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    }}>
                        {vm.host_name && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '5px', sm: '6px', md: '7px' }, minWidth: 0, overflow: 'hidden' }}>
                                <HostIcon sx={{ fontSize: { xs: 13, sm: 14, md: 15 }, color: dark ? '#94a3b8' : '#64748b', flexShrink: 0 }} />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontSize: { xs: '0.48rem', sm: '0.52rem', md: '0.55rem' }, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                                        Host
                                    </Typography>
                                    <Tooltip title={vm.host_name}>
                                        <Typography sx={{
                                            fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, fontWeight: 700, color: 'text.primary',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {vm.host_name}
                                        </Typography>
                                    </Tooltip>
                                </Box>
                            </Box>
                        )}
                        {ip && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '5px', sm: '6px', md: '7px' }, minWidth: 0, overflow: 'hidden' }}>
                                <NetworkIcon sx={{ fontSize: { xs: 13, sm: 14, md: 15 }, color: dark ? '#93c5fd' : '#3b82f6', flexShrink: 0 }} />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontSize: { xs: '0.48rem', sm: '0.52rem', md: '0.55rem' }, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                                        IP
                                    </Typography>
                                    <Typography sx={{
                                        fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, fontWeight: 700,
                                        color: dark ? '#93c5fd' : '#2563eb',
                                        fontFamily: '"SF Mono", "Courier New", monospace',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {ip}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Footer: Protection + Detail */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pt: { xs: '5px', sm: '6px', md: '8px' },
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    gap: { xs: '5px', sm: '6px', md: '8px' },
                }}>
                    {/* Protection Badge */}
                    <Tooltip title={prot.tips} arrow>
                        <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: { xs: '3px', sm: '4px', md: '5px' },
                            px: { xs: '6px', sm: '8px', md: '10px' }, py: { xs: '3px', sm: '4px', md: '5px' },
                            borderRadius: '999px',
                            bgcolor: prot.bgColor,
                            border: `1px solid ${alpha(prot.color, 0.3)}`,
                            cursor: 'help',
                            flexShrink: 0,
                        }}>
                            <ShieldIcon sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, color: prot.color }} />
                            <Typography sx={{
                                fontSize: { xs: '0.5rem', sm: '0.55rem', md: '0.6rem' }, fontWeight: 700,
                                color: prot.color, letterSpacing: '0.03em', textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            }}>
                                {prot.label}
                            </Typography>
                        </Box>
                    </Tooltip>

                    {/* Detail Button */}
                    <Box
                        component="button"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/vms/${vm.vm_uuid}`); }}
                        sx={{
                            display: 'inline-flex', alignItems: 'center', gap: { xs: '3px', sm: '4px', md: '5px' },
                            px: { xs: '8px', sm: '10px', md: '12px' }, py: { xs: '4px', sm: '5px', md: '6px' }, borderRadius: '999px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            background: isOn
                                ? `linear-gradient(135deg, ${alpha('#2563eb', dark ? 0.25 : 0.12)}, ${alpha('#0ea5e9', dark ? 0.15 : 0.08)})`
                                : `linear-gradient(135deg, ${alpha('#64748b', dark ? 0.25 : 0.12)}, ${alpha('#94a3b8', dark ? 0.15 : 0.08)})`,
                            color: isOn ? (dark ? '#93c5fd' : '#2563eb') : (dark ? '#cbd5e1' : '#64748b'),
                            border: `1px solid ${alpha(isOn ? '#3b82f6' : '#94a3b8', 0.3)}`,
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                background: isOn
                                    ? `linear-gradient(135deg, ${alpha('#2563eb', 0.3)}, ${alpha('#0ea5e9', 0.2)})`
                                    : `linear-gradient(135deg, ${alpha('#64748b', 0.3)}, ${alpha('#94a3b8', 0.2)})`,
                            },
                        }}
                    >
                        <ViewIcon sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: 'inherit' }} />
                        <Typography sx={{
                            fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' }, fontWeight: 800, color: 'inherit',
                            letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1,
                        }}>
                            DETAIL
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* ── Action Menu ────────────────────────────────────────────────── */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                onClick={(e) => e.stopPropagation()}
                transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
                PaperProps={{
                    elevation: 12,
                    sx: {
                        minWidth: 185, borderRadius: 3,
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
                    <MenuItem onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); setConfirm({ open: true, action: 'start' }); }}>
                        <ListItemIcon><StartIcon fontSize="small" sx={{ color: '#22c55e' }} /></ListItemIcon>
                        <ListItemText primary="Start" primaryTypographyProps={{ color: '#22c55e', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {isOn && (
                    <MenuItem onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); setConfirm({ open: true, action: 'shutdown' }); }}>
                        <ListItemIcon><ShutdownIcon fontSize="small" sx={{ color: '#f97316' }} /></ListItemIcon>
                        <ListItemText primary="Shutdown" primaryTypographyProps={{ color: '#f97316', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {isOn && (
                    <MenuItem onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); setConfirm({ open: true, action: 'stop' }); }}>
                        <ListItemIcon><StopIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                        <ListItemText primary="Force Stop" primaryTypographyProps={{ color: '#ef4444', fontWeight: 700 }} />
                    </MenuItem>
                )}
                {isOn && (
                    <MenuItem onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); setConfirm({ open: true, action: 'reboot' }); }}>
                        <ListItemIcon><RebootIcon fontSize="small" sx={{ color: '#3b82f6' }} /></ListItemIcon>
                        <ListItemText primary="Restart" primaryTypographyProps={{ color: '#3b82f6', fontWeight: 700 }} />
                    </MenuItem>
                )}
            </Menu>

            {/* ── Confirm Dialog ────────────────────────────────────────────── */}
            {confirm.open && confirm.action && (() => {
                const cfg = ACTION_CONFIG[confirm.action as VMAction];
                return (
                    <Dialog
                        open
                        onClose={() => setConfirm({ open: false, action: '' })}
                        onClick={(e) => e.stopPropagation()}
                        PaperProps={{ sx: { borderRadius: { xs: 3, sm: 4 }, minWidth: { xs: '88vw', sm: 400 }, maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' } }}
                    >
                        <Box sx={{ background: cfg.gradient, pt: { xs: 3, sm: 4 }, pb: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                            <Box sx={{
                                bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                                borderRadius: '50%', width: { xs: 52, sm: 68 }, height: { xs: 52, sm: 68 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid rgba(255,255,255,0.5)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                            }}>
                                {confirm.action === 'start' && <StartIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                                {confirm.action === 'shutdown' && <ShutdownIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                                {confirm.action === 'stop' && <StopIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                                {confirm.action === 'reboot' && <RebootIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'white' }} />}
                            </Box>
                            <Typography sx={{ color: 'white', fontWeight: 800, textAlign: 'center', fontSize: { xs: '0.95rem', sm: '1.1rem' }, textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
                                {cfg.thaiTitle}
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: { xs: 2, sm: 3 }, pb: 1, px: { xs: 2, sm: 3 } }}>
                            <Box sx={{ bgcolor: alpha(cfg.color, 0.06), border: `1px solid ${alpha(cfg.color, 0.2)}`, borderRadius: 2, p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 2.5 }, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, color: 'text.secondary', mb: 0.5 }}>เครื่องเสมือน (VM)</Typography>
                                <Typography sx={{ fontWeight: 700, color: cfg.color, fontSize: { xs: '0.9rem', sm: '1rem' }, wordBreak: 'break-all' }}>{vm.name}</Typography>
                            </Box>
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: cfg.thaiWarning ? 2 : 0.5 }}>
                                {cfg.thaiDesc(vm.name)}
                            </Typography>
                            {cfg.thaiWarning && (
                                <Box sx={{ bgcolor: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.3)}`, borderRadius: 2, p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <WarnIcon sx={{ color: '#f59e0b', fontSize: 18, mt: 0.15, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>{cfg.thaiWarning}</Typography>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ p: { xs: 2, sm: 3 }, pt: 2, gap: { xs: 1, sm: 1.5 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                            <Button variant="outlined" fullWidth onClick={(e) => { e.stopPropagation(); setConfirm({ open: false, action: '' }); }} sx={{ borderRadius: 2.5, py: { xs: 1, sm: 1.2 }, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                ยกเลิก
                            </Button>
                            <Button
                                variant="contained" fullWidth onClick={(e) => { e.stopPropagation(); executeAction(confirm.action as VMAction); setConfirm({ open: false, action: '' }); }}
                                sx={{ borderRadius: 2.5, py: { xs: 1, sm: 1.2 }, fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, bgcolor: cfg.color, boxShadow: `0 4px 14px ${alpha(cfg.color, 0.4)}`, '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.88)' } }}
                            >
                                ยืนยัน
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}

            {/* ── Snackbar ──────────────────────────────────────────────────── */}
            <Snackbar
                open={snack.open} autoHideDuration={5000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snack.ok ? 'success' : 'error'} variant="filled" sx={{ borderRadius: 2 }}
                    onClose={() => setSnack(s => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Card>
    );
};

export default VMCardNew;
