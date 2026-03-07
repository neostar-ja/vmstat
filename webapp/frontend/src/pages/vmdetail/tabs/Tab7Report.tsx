import {
    Box, Button, Card, CardContent, Chip, CircularProgress,
    Grid, LinearProgress, Table, TableBody,
    TableCell, TableContainer, TableRow, Typography, alpha,
} from '@mui/material';
import {
    Assessment as AssessmentIcon,
    Backup as BackupIcon,
    CheckCircle as CheckCircleIcon,
    Memory as MemoryIcon,
    NetworkCheck as NetworkIcon,
    NotificationsActive as AlarmIcon,
    Print as PrintIcon,
    Shield as ShieldIcon,
    ShowChart as PerformanceIcon,
    Speed as CpuIcon,
    Storage as StorageIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Area, AreaChart, CartesianGrid, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatUptime, formatBytes, formatMhz, formatThaiDateTime, CustomTooltip, OSIcon } from '../helpers';
import type { Tab7Props } from '../types';

// ───────────── Helpers ─────────────
const avgField = (data: any[], key: string) =>
    data.length ? (data.reduce((s, d) => s + (d[key] || 0), 0) / data.length).toFixed(1) : '-';

const timeRangeLabel = (tr: string, cs: string, ce: string) => {
    if (tr === 'custom') return `${cs} ถึง ${ce}`;
    const map: Record<string, string> = {
        '1h': 'ย้อนหลัง 1 ชั่วโมง', '6h': 'ย้อนหลัง 6 ชั่วโมง',
        '12h': 'ย้อนหลัง 12 ชั่วโมง', '24h': 'ย้อนหลัง 1 วัน',
        '1d': 'ย้อนหลัง 1 วัน', '7d': 'ย้อนหลัง 7 วัน', '30d': 'ย้อนหลัง 30 วัน',
    };
    return map[tr] || tr;
};

const barColor = (v: number, threshHigh = 80, threshMid = 50) =>
    v > threshHigh ? '#ef4444' : v > threshMid ? '#f59e0b' : undefined;

const SectionHeader = ({ icon, label, bg }: { icon: React.ReactNode; label: string; bg: string }) => (
    <Box sx={{
        background: bg, px: 2, py: 1.25,
        borderBottom: '2px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 1,
        '@media print': { background: '#f0f0f0 !important', borderBottom: '2px solid #999 !important' },
    }}>
        {icon}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ '@media print': { color: '#000 !important' } }}>
            {label}
        </Typography>
    </Box>
);

const ResourceBar = ({
    icon, label, value, caption, colorOverride,
}: {
    icon: React.ReactNode; label: string; value: number;
    caption: string; colorOverride?: string;
}) => {
    const color = colorOverride || barColor(value) || '#3b82f6';
    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {icon}
                    <Typography variant="body2" fontWeight="700">{label}</Typography>
                </Box>
                <Typography variant="h6" fontWeight="900" sx={{
                    color, fontSize: '1.1rem',
                    '@media print': { color: '#000 !important' },
                }}>
                    {value.toFixed(1)}%
                </Typography>
            </Box>
            {/* ASCII-style bar for print, colour bar for screen */}
            <Box sx={{ display: 'none', '@media print': { display: 'block', fontFamily: 'monospace', fontSize: '0.75rem', mb: 0.25 } }}>
                {'[' + '█'.repeat(Math.round(value / 5)) + '░'.repeat(20 - Math.round(value / 5)) + ']'}
                {' '}{value.toFixed(1)}%
            </Box>
            <LinearProgress
                variant="determinate"
                value={Math.min(value, 100)}
                sx={{
                    display: 'block',
                    '@media print': { display: 'none !important' },
                    height: 12, borderRadius: 6,
                    bgcolor: alpha(color, 0.12),
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    },
                }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', '@media print': { color: '#555 !important' } }}>
                {caption}
            </Typography>
        </Box>
    );
};

const ChartBox = ({ title, legend, children }: { title: string; legend?: React.ReactNode; children: React.ReactNode }) => (
    <Box sx={{
        border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5,
        pageBreakInside: 'avoid', breakInside: 'avoid',
        '@media print': { border: '1px solid #ccc !important' },
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" fontWeight="bold" sx={{ '@media print': { color: '#000 !important' } }}>
                {title}
            </Typography>
            {legend}
        </Box>
        <Box sx={{ height: 170 }}>{children}</Box>
    </Box>
);

// ───────────── Main Component ─────────────
export default function Tab7Report(props: Tab7Props) {
    const {
        vm, theme, metricsLoading, chartData, realtime, networks, alarms,
        platformAlerts, currentCpu, currentMemory, currentStorage,
        storageGrowth, timeRange, actualTimeRange, user, customStartDate, customEndDate,
    } = props;

    const isDark = theme.palette.mode === 'dark';
    const printDate = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    const isLongRange = actualTimeRange.endsWith('d');

    const axisProps = { tick: { fontSize: 10, fill: '#888' }, tickMargin: 4, minTickGap: 40 };
    const xAngle = isLongRange ? -25 : 0;
    const xAnchor = isLongRange ? 'end' : 'middle';

    return (
        <Box className="report-container" sx={{
            '@media print': { backgroundColor: '#fff !important', color: '#000 !important' }
        }}>
            {/* ───── Print CSS ───── */}
            <style type="text/css">{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm 14mm; }
                    html, body, #root, main, .MuiBox-root, .MuiGrid-root {
                        height: auto !important; min-height: auto !important;
                        max-height: none !important; overflow: visible !important;
                        position: static !important;
                    }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    nav, aside, .MuiDrawer-root, .MuiAppBar-root, .MuiTabs-root,
                    .breadcrumb-container, .action-buttons, button { display: none !important; }
                    .animate-fade-in > .MuiCard-root:first-of-type { display: none !important; }
                    .report-container { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    .MuiCard-root { page-break-inside: avoid !important; break-inside: avoid !important;
                        border: 1px solid #bbb !important; box-shadow: none !important; background: #fff !important; }
                    .MuiGrid-item { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .MuiTypography-root { color: #000 !important; }
                    .MuiLinearProgress-root { display: none !important; }
                    .recharts-wrapper { background: #fff !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>

            {/* ───── REPORT HEADER ───── */}
            <Box sx={{
                mb: 3, pb: 2,
                borderBottom: '3px solid', borderColor: 'primary.main',
                '@media print': { borderBottom: '3px solid #000 !important', mb: 2, pb: 1.5 },
            }}>
                {/* Top row: Logo + Title | Print Btn */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60, height: 60, borderRadius: 2, flexShrink: 0,
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
                            '@media print': { background: '#1a3a6c !important', boxShadow: 'none !important' },
                        }}>
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>WUH</Typography>
                            <AssessmentIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', mt: 0.2 }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight="900" sx={{
                                letterSpacing: '-0.5px', lineHeight: 1.15,
                                '@media print': { fontSize: '1.35rem !important' },
                            }}>
                                VM PERFORMANCE REPORT
                            </Typography>
                            <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{
                                textTransform: 'uppercase', letterSpacing: '0.8px',
                                '@media print': { color: '#444 !important' },
                            }}>
                                รายงานสถานะและการใช้งานเครื่องเสมือน (Virtual Machine)
                            </Typography>
                            {vm && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <OSIcon osType={vm.os_type} osName={vm.os_name} size={16} />
                                    <Typography variant="body2" fontWeight="700">{vm.name}</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => window.print()}
                            className="action-buttons"
                            sx={{
                                '@media print': { display: 'none !important' },
                                borderRadius: 2, px: 2, mb: 1,
                                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                                textTransform: 'none', fontWeight: 700, fontSize: '0.85rem',
                            }}
                        >
                            พิมพ์รายงาน
                        </Button>
                        <Typography variant="body2" fontWeight="bold" sx={{ '@media print': { color: '#000 !important' } }}>
                            วันที่ออกรายงาน: {printDate} น.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ '@media print': { color: '#333 !important' } }}>
                            ผู้พิมพ์: {user?.username || 'Administrator'}
                        </Typography>
                    </Box>
                </Box>

                {/* Divider row: time range */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    bgcolor: isDark ? alpha('#0ea5e9', 0.07) : alpha('#0ea5e9', 0.05),
                    borderRadius: 1.5, px: 2, py: 0.75,
                    '@media print': { background: '#e8f4fd !important', borderRadius: '4px !important' },
                }}>
                    <Typography variant="body2" color="text.secondary" sx={{ '@media print': { color: '#333 !important' } }}>
                        📅 ช่วงเวลาข้อมูล:
                    </Typography>
                    <Typography variant="body2" fontWeight="700" sx={{ '@media print': { color: '#000 !important' } }}>
                        {timeRangeLabel(timeRange, customStartDate, customEndDate)}
                    </Typography>
                    {chartData.length > 0 && (
                        <Chip label={`${chartData.length} จุดข้อมูล`} size="small"
                            sx={{ height: 20, fontSize: '0.68rem', '@media print': { display: 'none !important' } }} />
                    )}
                </Box>
            </Box>

            {/* ═══════════════════════════════════════════════════
                SECTION 1: EXECUTIVE SUMMARY
            ═══════════════════════════════════════════════════ */}
            <Card sx={{
                mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                '@media print': { border: '1px solid #bbb !important', mb: 2, borderRadius: '4px !important', pageBreakInside: 'avoid' },
            }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SectionHeader
                        icon={<AssessmentIcon sx={{ fontSize: 18, color: 'primary.main', '@media print': { color: '#000 !important' } }} />}
                        label="[1] ภาพรวมระบบ (Executive Summary)"
                        bg={isDark ? alpha('#0ea5e9', 0.1) : alpha('#0ea5e9', 0.06)}
                    />
                    <TableContainer>
                        <Table size="small" sx={{
                            '& .MuiTableCell-root': {
                                py: 0.9, px: 1.5, borderBottom: '1px solid', borderColor: 'divider',
                                '@media print': { py: 0.7, borderBottom: '1px solid #e0e0e0 !important' },
                            },
                        }}>
                            <TableBody>
                                {[
                                    ['ชื่อเครื่องเสมือน (VM Name):', vm?.name, 'สถานะปัจจุบัน:', vm?.power_state === 'on' ? '🟢 กำลังทำงาน (Running)' : '🔴 หยุดทำงาน (Stopped)'],
                                    ['รหัสอ้างอิง (UUID):', vm?.vm_uuid?.substring(0, 24) + '…', 'เวลาทำงานสะสม:', formatUptime(realtime?.uptime || vm?.uptime_seconds, vm?.power_state)],
                                    ['ระบบปฏิบัติการ (OS):', vm?.os_name || vm?.os_type || 'Unknown', 'IP Address:', vm?.ip_address || (networks.length > 0 ? networks[0].ip_address : 'ไม่ระบุ')],
                                    ['โฮสต์ (Host):', vm?.host_name || 'ไม่ระบุ', 'Datastore:', vm?.storage_name || 'ไม่ระบุ'],
                                    ['กลุ่ม (Group / Project):', vm?.group_name_path || vm?.group_name || vm?.project_name || 'ไม่ระบุ', 'สถานะการปกป้อง:', vm?.protection_type ? `🛡️ ได้รับการปกป้อง${vm.backup_file_count ? ` (${vm.backup_file_count} ชุด)` : ''}` : '❌ ไม่มีการสำรองข้อมูล'],
                                ].map((row, i) => (
                                    <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? 'transparent' : (isDark ? alpha('#fff', 0.02) : alpha('#000', 0.015)) }}>
                                        {[0, 2].map((ci) => (
                                            <>
                                                <TableCell key={ci} sx={{ width: '22%', bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.025), '@media print': { background: '#f5f5f5 !important' } }}>
                                                    <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ '@media print': { color: '#444 !important' } }}>{row[ci]}</Typography>
                                                </TableCell>
                                                <TableCell key={ci + 1} sx={{ width: '28%' }}>
                                                    <Typography variant="body2" fontWeight="bold" sx={{ wordBreak: 'break-all', '@media print': { color: '#000 !important' } }}>{row[ci + 1] as string}</Typography>
                                                </TableCell>
                                            </>
                                        ))}
                                    </TableRow>
                                ))}
                                {/* Hardware specs row */}
                                <TableRow sx={{ bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.015) }}>
                                    <TableCell sx={{ bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.025), '@media print': { background: '#f5f5f5 !important' } }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ '@media print': { color: '#444 !important' } }}>CPU Spec:</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            {vm?.cpu_cores || '-'} Cores
                                            {vm?.cpu_sockets ? ` (${vm.cpu_sockets} Sockets)` : ''}
                                            {vm?.cpu_total_mhz ? ` · ${formatMhz(vm.cpu_total_mhz)}` : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.025), '@media print': { background: '#f5f5f5 !important' } }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ '@media print': { color: '#444 !important' } }}>Memory / Storage:</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            RAM {formatBytes(vm?.memory_total_mb)} · Storage {formatBytes(vm?.storage_total_mb)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                SECTION 2: CURRENT RESOURCE UTILIZATION
            ═══════════════════════════════════════════════════ */}
            <Card sx={{
                mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                '@media print': { border: '1px solid #bbb !important', mb: 2, borderRadius: '4px !important', pageBreakInside: 'avoid' },
            }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SectionHeader
                        icon={<CpuIcon sx={{ fontSize: 18, color: 'success.main', '@media print': { color: '#000 !important' } }} />}
                        label="[2] การใช้งานทรัพยากรปัจจุบัน (Current Resource Utilization)"
                        bg={isDark ? alpha('#22c55e', 0.08) : alpha('#22c55e', 0.05)}
                    />
                    <Box sx={{ p: 2.5 }}>
                        <ResourceBar
                            icon={<CpuIcon sx={{ fontSize: 16, color: barColor(currentCpu) || '#3b82f6', '@media print': { color: '#333 !important' } }} />}
                            label="CPU (หน่วยประมวลผล)"
                            value={currentCpu}
                            colorOverride={barColor(currentCpu) || '#3b82f6'}
                            caption={[
                                `สเปค: ${vm?.cpu_cores || '-'} Cores`,
                                vm?.cpu_total_mhz ? `ความเร็วรวม: ${formatMhz(vm.cpu_total_mhz)}` : '',
                                vm?.cpu_used_mhz ? `ใช้งาน: ${formatMhz(vm.cpu_used_mhz)}` : '',
                            ].filter(Boolean).join(' | ')}
                        />
                        <ResourceBar
                            icon={<MemoryIcon sx={{ fontSize: 16, color: barColor(currentMemory) || '#8b5cf6', '@media print': { color: '#333 !important' } }} />}
                            label="Memory (หน่วยความจำ)"
                            value={currentMemory}
                            colorOverride={barColor(currentMemory) || '#8b5cf6'}
                            caption={`ใช้งาน: ${formatBytes(vm?.memory_used_mb)} / ทั้งหมด: ${formatBytes(vm?.memory_total_mb)}`}
                        />
                        <ResourceBar
                            icon={<StorageIcon sx={{ fontSize: 16, color: barColor(currentStorage, 80, 60) || '#10b981', '@media print': { color: '#333 !important' } }} />}
                            label="Storage (พื้นที่เก็บข้อมูล)"
                            value={currentStorage}
                            colorOverride={barColor(currentStorage, 80, 60) || '#10b981'}
                            caption={[
                                `ใช้งาน: ${formatBytes(vm?.storage_used_mb)} / ทั้งหมด: ${formatBytes(vm?.storage_total_mb)}`,
                                storageGrowth.perDay > 0 ? `เพิ่มขึ้น ~${formatBytes(storageGrowth.perDay)}/วัน` : '',
                            ].filter(Boolean).join(' · ')}
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                SECTION 3: PERFORMANCE TRENDS (6 Charts)
            ═══════════════════════════════════════════════════ */}
            <Card sx={{
                mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                '@media print': { border: '1px solid #bbb !important', mb: 2, borderRadius: '4px !important' },
            }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SectionHeader
                        icon={<PerformanceIcon sx={{ fontSize: 18, color: '#8b5cf6', '@media print': { color: '#000 !important' } }} />}
                        label={`[3] แนวโน้มประสิทธิภาพตามช่วงเวลา (Performance Trends — ${timeRangeLabel(timeRange, customStartDate, customEndDate)})`}
                        bg={isDark ? alpha('#8b5cf6', 0.08) : alpha('#8b5cf6', 0.05)}
                    />

                    {chartData.length > 0 ? (
                        <Box sx={{ p: 2 }}>
                            <Grid container spacing={2}>
                                {/* Chart 1: CPU */}
                                <Grid item xs={12} md={6}>
                                    <ChartBox
                                        title={`📊 กราฟที่ 1: CPU Usage (%) — เฉลี่ย ${avgField(chartData, 'cpu')}%`}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                                <XAxis dataKey="time" {...axisProps} angle={xAngle} textAnchor={xAnchor} />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={[0, 100]} width={28} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" strokeWidth={2} fill="url(#gcpu)" dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </ChartBox>
                                </Grid>

                                {/* Chart 2: Memory */}
                                <Grid item xs={12} md={6}>
                                    <ChartBox title={`📊 กราฟที่ 2: Memory Usage (%) — เฉลี่ย ${avgField(chartData, 'memory')}%`}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                                <XAxis dataKey="time" {...axisProps} angle={xAngle} textAnchor={xAnchor} />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={[0, 100]} width={28} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="memory" name="Memory %" stroke="#8b5cf6" strokeWidth={2} fill="url(#gmem)" dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </ChartBox>
                                </Grid>

                                {/* Chart 3: Network */}
                                <Grid item xs={12} md={6}>
                                    <ChartBox
                                        title="📊 กราฟที่ 3: Network Traffic (MB/s)"
                                        legend={
                                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                <Typography variant="caption" sx={{ color: '#10b981' }}>■ RX (รับ)</Typography>
                                                <Typography variant="caption" sx={{ color: '#f59e0b' }}>■ TX (ส่ง)</Typography>
                                            </Box>
                                        }
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                                <XAxis dataKey="time" {...axisProps} angle={xAngle} textAnchor={xAnchor} />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} width={28} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="networkIn" name="RX รับ (MB/s)" stroke="#10b981" dot={false} strokeWidth={2} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="networkOut" name="TX ส่ง (MB/s)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartBox>
                                </Grid>

                                {/* Chart 4: Disk I/O */}
                                <Grid item xs={12} md={6}>
                                    <ChartBox
                                        title="📊 กราฟที่ 4: Disk I/O (IOPS)"
                                        legend={
                                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                <Typography variant="caption" sx={{ color: '#0ea5e9' }}>■ Read</Typography>
                                                <Typography variant="caption" sx={{ color: '#ec4899' }}>■ Write</Typography>
                                            </Box>
                                        }
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                                <XAxis dataKey="time" {...axisProps} angle={xAngle} textAnchor={xAnchor} />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} width={28} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="diskRead" name="Read IOPS" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="diskWrite" name="Write IOPS" stroke="#ec4899" dot={false} strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartBox>
                                </Grid>

                                {/* Chart 5: Storage Used GB */}
                                <Grid item xs={12} md={6}>
                                    <ChartBox
                                        title={`📊 กราฟที่ 5: Storage Used (GB) — ปัจจุบัน ${chartData.length ? (chartData[chartData.length - 1].storageUsedGB || 0).toFixed(1) : '-'} GB`}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="gsgb" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                                <XAxis dataKey="time" {...axisProps} angle={xAngle} textAnchor={xAnchor} />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} width={28} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="storageUsedGB" name="Used GB" stroke="#6366f1" strokeWidth={2} fill="url(#gsgb)" dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </ChartBox>
                                </Grid>

                                {/* Chart 6: Storage % */}
                                <Grid item xs={12} md={6}>
                                    <ChartBox
                                        title={`📊 กราฟที่ 6: Storage Usage (%) — ปัจจุบัน ${chartData.length ? (chartData[chartData.length - 1].storagePercent || 0).toFixed(1) : '-'}%`}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="gspct" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.45} />
                                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                                <XAxis dataKey="time" {...axisProps} angle={xAngle} textAnchor={xAnchor} />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={[0, 100]} width={28} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="storagePercent" name="Usage %" stroke="#14b8a6" strokeWidth={2} fill="url(#gspct)" dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </ChartBox>
                                </Grid>
                            </Grid>
                        </Box>
                    ) : (
                        <Box sx={{ py: 5, textAlign: 'center' }}>
                            {metricsLoading
                                ? <CircularProgress size={32} />
                                : <Typography color="text.secondary">ไม่มีข้อมูลในช่วงเวลาที่เลือก — กรุณาเลือกช่วงเวลาจาก Dropdown ด้านบน</Typography>}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                SECTION 4: PROTECTION & SYSTEM HEALTH
            ═══════════════════════════════════════════════════ */}
            <Card sx={{
                mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                '@media print': { border: '1px solid #bbb !important', mb: 2, borderRadius: '4px !important', pageBreakInside: 'avoid' },
            }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SectionHeader
                        icon={<ShieldIcon sx={{ fontSize: 18, color: 'warning.main', '@media print': { color: '#000 !important' } }} />}
                        label="[4] ความปลอดภัยและสถานะความสมบูรณ์ (Protection & System Health)"
                        bg={isDark ? alpha('#f59e0b', 0.08) : alpha('#f59e0b', 0.05)}
                    />
                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                            {/* Left: Backup Protection + Network */}
                            <Grid item xs={12} md={6}>
                                <Box sx={{
                                    p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%',
                                    '@media print': { border: '1px solid #ddd !important' },
                                }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BackupIcon sx={{ fontSize: 16 }} />
                                        สถานะการสำรองข้อมูล (Backup Protection)
                                    </Typography>
                                    {vm?.protection_type ? (
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                                <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ '@media print': { color: '#000 !important' } }}>
                                                    🛡️ ได้รับการปกป้อง (Protected)
                                                </Typography>
                                            </Box>
                                            {vm.protection_name && <Typography variant="body2" sx={{ mb: 0.4 }}><strong>นโยบาย:</strong> {vm.protection_name}</Typography>}
                                            {vm.backup_file_count != null && <Typography variant="body2" sx={{ mb: 0.4 }}><strong>ไฟล์สำรอง:</strong> {vm.backup_file_count} ชุด</Typography>}
                                            {vm.protection_type && <Typography variant="body2"><strong>ประเภท:</strong> {vm.protection_type}</Typography>}
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WarningIcon sx={{ fontSize: 18, color: 'error.main' }} />
                                            <Typography variant="body2" fontWeight="bold" color="error.main" sx={{ '@media print': { color: '#000 !important' } }}>
                                                ❌ ไม่มีการสำรองข้อมูล (Unprotected)
                                            </Typography>
                                        </Box>
                                    )}

                                    {networks.length > 0 && (
                                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', '@media print': { borderTop: '1px solid #ddd !important' } }}>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <NetworkIcon sx={{ fontSize: 15 }} />
                                                เครือข่าย ({networks.length} Interface)
                                            </Typography>
                                            {networks.slice(0, 5).map((n, i) => (
                                                <Typography key={i} variant="body2" sx={{ '&:not(:last-child)': { mb: 0.3 } }}>
                                                    • {n.ip_address || 'No IP'}{n.mac_address ? ` — ${n.mac_address}` : ''}
                                                    {n.network_name ? ` (${n.network_name})` : ''}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            {/* Right: Alarms */}
                            <Grid item xs={12} md={6}>
                                <Box sx={{
                                    p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%',
                                    '@media print': { border: '1px solid #ddd !important' },
                                }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AlarmIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                        การแจ้งเตือน (Alarms & Alerts)
                                    </Typography>
                                    {alarms.length === 0 && platformAlerts.length === 0 ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                            <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ '@media print': { color: '#000 !important' } }}>
                                                ✅ ทำงานปกติ ไม่มีการแจ้งเตือน
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box>
                                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                                                ⚠️ พบการแจ้งเตือน {alarms.length + platformAlerts.length} รายการ
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                                {[...alarms, ...platformAlerts].slice(0, 8).map((alarm, idx) => (
                                                    <Box key={idx} sx={{
                                                        display: 'flex', alignItems: 'flex-start', gap: 1,
                                                        p: 0.75, borderRadius: 1, borderLeft: '3px solid #f59e0b',
                                                        bgcolor: isDark ? alpha('#ef4444', 0.06) : alpha('#ef4444', 0.03),
                                                        '@media print': { bgcolor: '#fffbeb !important', borderLeft: '3px solid #f59e0b !important' },
                                                    }}>
                                                        <WarningIcon sx={{ fontSize: 13, color: 'warning.main', mt: 0.3, flexShrink: 0 }} />
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="caption" fontWeight="600" sx={{ display: 'block', lineHeight: 1.35 }}>
                                                                {alarm.title || alarm.description || 'Alarm'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ '@media print': { color: '#666 !important' } }}>
                                                                {alarm.begin_time ? formatThaiDateTime(alarm.begin_time) : 'ไม่ระบุเวลา'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                                {(alarms.length + platformAlerts.length) > 8 && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                        … และอีก {(alarms.length + platformAlerts.length) - 8} รายการ
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                PRINT-ONLY FOOTER
            ═══════════════════════════════════════════════════ */}
            <Box sx={{
                display: 'none',
                '@media print': {
                    display: 'block !important',
                    mt: 3, pt: 1.5,
                    borderTop: '2px solid #333',
                },
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#555 !important', display: 'block', fontStyle: 'italic' }}>
                            ════════════════════════════════════════════════════════════════════
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#555 !important', display: 'block', mb: 0.25 }}>
                            รายงานฉบับนี้จัดทำโดยระบบ VMStat Intelligence Center (Sangfor SCP)
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888 !important', display: 'block' }}>
                            สงวนลิขสิทธิ์ — ห้ามเผยแพร่โดยไม่ได้รับอนุญาต · จบรายงาน
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#000 !important', display: 'block', fontWeight: 'bold', mb: 4 }}>
                            พิมพ์โดย: {user?.username || 'System User'} | ลงนาม / Approved by:
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#333 !important', display: 'block' }}>
                            _______________________________ วันที่ ___________
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
