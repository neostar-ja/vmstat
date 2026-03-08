import {
    Box, Card, CardContent, CircularProgress,
    Grid, LinearProgress, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography, alpha,
} from '@mui/material';
import {
    Backup as BackupIcon,
    CheckCircle as CheckCircleIcon,
    Memory as MemoryIcon,
    NetworkCheck as NetworkIcon,
    NotificationsActive as AlarmIcon,
    Speed as CpuIcon,
    Storage as StorageIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Area, AreaChart, CartesianGrid, Line, LineChart,
    Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatUptime, formatBytes, formatMhz, formatThaiDateTime, CustomTooltip, OSIcon } from '../helpers';
import type { Tab7Props } from '../types';

// ─── Helpers ────────────────────────────────────────────
const avgField = (data: any[], key: string) =>
    data.length ? (data.reduce((s, d) => s + (d[key] || 0), 0) / data.length).toFixed(1) : '-';
const minField = (data: any[], key: string) =>
    data.length ? Math.min(...data.map(d => d[key] || 0)).toFixed(1) : '-';
const maxField = (data: any[], key: string) =>
    data.length ? Math.max(...data.map(d => d[key] || 0)).toFixed(1) : '-';

const timeRangeLabel = (tr: string, cs: string, ce: string) => {
    if (tr === 'custom') return `${cs} ถึง ${ce}`;
    const m: Record<string, string> = {
        '1h': '1 ชั่วโมงล่าสุด', '6h': '6 ชั่วโมงล่าสุด',
        '12h': '12 ชั่วโมงล่าสุด', '24h': '24 ชั่วโมงล่าสุด',
        '1d': '24 ชั่วโมงล่าสุด', '7d': '7 วันล่าสุด', '30d': '30 วันล่าสุด',
    };
    return m[tr] || tr;
};

const statusColor = (v: number, h = 80, m = 60) =>
    v >= h ? '#c0392b' : v >= m ? '#d97706' : '#16a34a';

const riskLabel = (v: number, h = 80, m = 60) =>
    v >= h ? 'สูง' : v >= m ? 'กลาง' : 'ต่ำ';

const riskBg = (v: number, h = 80, m = 60) =>
    v >= h ? '#fdf0f0' : v >= m ? '#fffbeb' : '#f0fdf4';

// ─── Sub-components ─────────────────────────────────────

const SecHeader = ({
    num, label, sub, bg = '#1a3560',
}: { num: string; label: string; sub?: string; bg?: string }) => (
    <Box sx={{
        background: bg,
        px: 2.5, py: 1.1,
        display: 'flex', alignItems: 'center', gap: 1.75,
        '@media print': { '-webkit-print-color-adjust': 'exact', 'print-color-adjust': 'exact' },
    }}>
        <Box sx={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{num}</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff !important', lineHeight: 1.25, '@media print': { color: '#fff !important' } }}>
                {label}
            </Typography>
            {sub && (
                <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8) !important', lineHeight: 1.2, '@media print': { color: 'rgba(255,255,255,0.8) !important' } }}>
                    {sub}
                </Typography>
            )}
        </Box>
    </Box>
);

const KpiCard = ({
    label, value, unit, color, sub,
}: { label: string; value: string | number; unit?: string; color: string; sub?: string }) => (
    <Box sx={{
        textAlign: 'center', p: 1.75, borderRadius: 2,
        border: `2px solid ${color}40`, background: `${color}0d`,
        pageBreakInside: 'avoid', breakInside: 'avoid',
        '@media print': {
            border: `2px solid ${color} !important`,
            background: `${color}15 !important`,
            borderRadius: '6px !important',
        },
    }}>
        <Typography sx={{
            fontSize: '2rem', fontWeight: 900, lineHeight: 1,
            color: `${color} !important`,
            '@media print': { color: `${color} !important` },
        }}>
            {value}
            {unit && <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 700, color: `${color} !important` }}>{unit}</Typography>}
        </Typography>
        <Typography sx={{
            fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary',
            display: 'block', mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em',
            '@media print': { color: '#444 !important' },
        }}>
            {label}
        </Typography>
        {sub && (
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', display: 'block', '@media print': { color: '#777 !important' } }}>
                {sub}
            </Typography>
        )}
    </Box>
);

const AsciiBar = ({ value }: { value: number }) => {
    const filled = Math.min(20, Math.round(Math.min(value, 100) / 5));
    return (
        <Box sx={{
            display: 'none',
            '@media print': { display: 'block !important', fontFamily: 'monospace', fontSize: '0.72rem', color: '#333 !important', mb: 0.25 },
        }}>
            {'[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + '] ' + value.toFixed(1) + '%'}
        </Box>
    );
};

// Fixed-dimension chart containers — NO ResponsiveContainer!
// ResponsiveContainer uses ResizeObserver which returns 0 when parent is display:none
const CW = 315; // half-width chart  (~half A4 content width)
const CH = 140; // chart height

// ─── Main Component ─────────────────────────────────────
export default function Tab7Report(props: Tab7Props) {
    const {
        vm, theme, metricsLoading, chartData, realtime, disks, networks, alarms,
        platformAlerts, currentCpu, currentMemory, currentStorage,
        storageGrowth, timeRange, user, customStartDate, customEndDate, actualTimeRange,
    } = props;

    const isDark = theme.palette.mode === 'dark';
    const printDate = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    const isLong = actualTimeRange?.endsWith('d');
    const xProps = { tick: { fontSize: 9, fill: '#555' }, tickMargin: 3, minTickGap: 40 };
    const xA = isLong ? -22 : 0;
    const xT = isLong ? 'end' : 'middle';
    const gridSx = { strokeDasharray: '3 3', stroke: 'rgba(0,0,0,0.09)', vertical: false };

    // Auto-recommendations
    const recs: { level: 'warn' | 'info' | 'ok'; text: string }[] = [];
    if (currentCpu >= 80) recs.push({ level: 'warn', text: `CPU ใช้งานสูง ${currentCpu.toFixed(1)}% — พิจารณาเพิ่ม CPU หรือปรับ Workload Balance` });
    if (currentMemory >= 80) recs.push({ level: 'warn', text: `Memory ใช้งานสูง ${currentMemory.toFixed(1)}% — พิจารณาเพิ่ม RAM` });
    if (currentStorage >= 85) recs.push({ level: 'warn', text: `Storage ใช้งานสูง ${currentStorage.toFixed(1)}% — ควรเพิ่มพื้นที่หรือย้ายข้อมูลโดยเร็ว` });
    if (!vm?.protection_type) recs.push({ level: 'warn', text: 'ไม่มีการสำรองข้อมูล (Backup) — ความเสี่ยงสูง ควรกำหนด Backup Policy' });
    if (alarms.length + platformAlerts.length > 0) recs.push({ level: 'warn', text: `พบการแจ้งเตือน ${alarms.length + platformAlerts.length} รายการ — ควรตรวจสอบและแก้ไขโดยด่วน` });
    if (storageGrowth.perDay > 500 * 1024 * 1024) recs.push({ level: 'info', text: `Storage เพิ่มขึ้น ~${formatBytes(storageGrowth.perDay)}/วัน — ควรวางแผนการขยาย Storage` });
    if (recs.length === 0) recs.push({ level: 'ok', text: 'ระบบทำงานปกติ ทรัพยากรทุกรายการอยู่ในระดับที่ยอมรับได้ ไม่มีข้อแนะนำเร่งด่วน' });

    const recColors = { warn: '#c0392b', info: '#2563eb', ok: '#16a34a' };
    const recBgs = { warn: '#fef2f2', info: '#eff6ff', ok: '#f0fdf4' };
    const recIcons = { warn: '⚠', info: 'ℹ', ok: '✓' };

    return (
        <Box className="report-container" sx={{ fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif' }}>

            {/* ─── Print CSS ─── */}
            <style type="text/css">{`
                @media print {
                    @page { size: A4 portrait; margin: 8mm 10mm 10mm; }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body, #root { height: auto !important; overflow: visible !important; }

                    /* Hide all page chrome */
                    nav, aside, header, footer,
                    .MuiDrawer-root, .MuiAppBar-root,
                    .MuiTabs-root, .MuiTab-root { display: none !important; }

                    /* Hide the VM detail UI tiles */
                    .animate-fade-in > .MuiCard-root,
                    .animate-fade-in > .MuiGrid-root,
                    .animate-fade-in > div { display: none !important; }

                    /* Show report section */
                    #vm-report-print-section { display: block !important; }

                    .report-container { width: 100% !important; margin: 0 !important; padding: 0 !important; }

                    .MuiCard-root {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        border: 1px solid #bbb !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        margin-bottom: 5mm !important;
                        border-radius: 4px !important;
                    }
                    .MuiCardContent-root { padding: 0 !important; }
                    .MuiGrid-item { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .MuiTableCell-root { color: #000 !important; font-size: 0.78rem !important; }
                    .MuiTypography-root { color: #000 !important; }
                    .MuiLinearProgress-root { display: none !important; }
                    .recharts-wrapper, .recharts-surface { background: white !important; }
                    .recharts-cartesian-grid line { stroke: #ddd !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>

            {/* ════════ DOCUMENT HEADER ════════ */}
            <Box sx={{
                mb: 2.5,
                border: '2px solid #1a3560',
                borderRadius: 2,
                overflow: 'hidden',
                '@media print': { border: '2px solid #1a3560 !important', mb: '5mm !important', borderRadius: '4px !important' },
            }}>
                {/* Top navy banner */}
                <Box sx={{
                    background: 'linear-gradient(135deg, #1a3560 0%, #0d2040 100%)',
                    px: 3, py: 2,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    '@media print': { '-webkit-print-color-adjust': 'exact', 'print-color-adjust': 'exact' },
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 52, height: 52, borderRadius: 2, flexShrink: 0,
                            background: 'rgba(255,255,255,0.13)',
                            border: '1.5px solid rgba(255,255,255,0.35)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>SCP</Typography>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>VMStat</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                SANGFOR SCP · VMStat Intelligence Center
                            </Typography>
                            <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.25, '@media print': { color: '#fff !important' } }}>
                                รายงานประเมินสมรรถนะเครื่องเสมือน
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em', '@media print': { color: 'rgba(255,255,255,0.85) !important' } }}>
                                VM Performance Assessment Report
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Box sx={{
                            px: 1.75, py: 0.5, borderRadius: 1, mb: 1,
                            border: '1px solid rgba(255,255,255,0.45)',
                            background: 'rgba(255,255,255,0.1)',
                            display: 'inline-block',
                        }}>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.15em', '@media print': { color: '#fff !important' } }}>
                                ทั่วไป / GENERAL
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.75)', display: 'block', '@media print': { color: 'rgba(255,255,255,0.75) !important' } }}>
                            วันที่ออกรายงาน
                        </Typography>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', '@media print': { color: '#fff !important' } }}>
                            {printDate}
                        </Typography>
                    </Box>
                </Box>

                {/* Sub-info bar */}
                <Box sx={{
                    background: '#eef2f9',
                    px: 3, py: 1.25,
                    display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
                    alignItems: 'center', gap: 0,
                    '@media print': { background: '#eef2f9 !important' },
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pr: 2 }}>
                        {vm && <OSIcon osType={vm.os_type} osName={vm.os_name} size={22} />}
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: '#64748b', display: 'block', lineHeight: 1, '@media print': { color: '#555 !important' } }}>ชื่อเครื่องเสมือน (VM Name)</Typography>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.3px', '@media print': { color: '#000 !important' } }}>{vm?.name || '—'}</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ width: '1px', height: 36, background: '#cbd5e1' }} />
                    <Box sx={{ px: 2, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.62rem', color: '#64748b', display: 'block', '@media print': { color: '#555 !important' } }}>ช่วงเวลาข้อมูล</Typography>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, '@media print': { color: '#000 !important' } }}>{timeRangeLabel(timeRange, customStartDate, customEndDate)}</Typography>
                    </Box>
                    <Box sx={{ width: '1px', height: 36, background: '#cbd5e1' }} />
                    <Box sx={{ pl: 2, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.62rem', color: '#64748b', display: 'block', '@media print': { color: '#555 !important' } }}>ผู้พิมพ์รายงาน</Typography>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, '@media print': { color: '#000 !important' } }}>{user?.username || 'Administrator'}</Typography>
                    </Box>
                </Box>
            </Box>

            {/* ════════ SECTION 1: VM IDENTITY ════════ */}
            <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SecHeader num="1" label="ข้อมูลประจำเครื่องเสมือน" sub="VM Identity & System Configuration" bg="#1a3560" />
                    <TableContainer>
                        <Table size="small" sx={{
                            '& .MuiTableCell-root': {
                                py: 0.9, px: 1.75, fontSize: '0.8rem',
                                borderBottom: '1px solid', borderColor: 'divider',
                                '@media print': { borderBottom: '1px solid #ddd !important' },
                            },
                        }}>
                            <TableBody>
                                {[
                                    ['ชื่อ VM:', vm?.name, 'สถานะ:', vm?.power_state === 'on' ? '● กำลังทำงาน (Running)' : '○ หยุดทำงาน (Stopped)'],
                                    ['UUID:', vm?.vm_uuid, 'Uptime:', formatUptime(realtime?.uptime || vm?.uptime_seconds, vm?.power_state)],
                                    ['ระบบปฏิบัติการ:', vm?.os_name || vm?.os_type || 'Unknown', 'IP Address:', vm?.ip_address || (networks.length > 0 ? networks[0].ip_address : 'ไม่ระบุ')],
                                    ['โฮสต์ (Host):', vm?.host_name || 'ไม่ระบุ', 'Datastore:', vm?.storage_name || 'ไม่ระบุ'],
                                    ['กลุ่ม / Project:', vm?.group_name_path || vm?.group_name || vm?.project_name || 'ไม่ระบุ', 'Backup:', vm?.protection_type ? `ได้รับการปกป้อง (${vm.backup_file_count ?? 0} ชุด)` : '❌ ไม่มีการสำรองข้อมูล'],
                                    ['CPU Spec:', `${vm?.cpu_cores || '-'} Cores${vm?.cpu_sockets ? ` / ${vm.cpu_sockets} Sockets` : ''}${vm?.cpu_total_mhz ? ` · ${formatMhz(vm.cpu_total_mhz)}` : ''}`, 'Memory / Storage:', `RAM ${formatBytes(vm?.memory_total_mb)} · Storage ${formatBytes(vm?.storage_total_mb)}`],
                                ].map((row, i) => (
                                    <TableRow key={i} sx={{ bgcolor: i % 2 === 1 ? (isDark ? alpha('#fff', 0.025) : '#fafafa') : 'transparent' }}>
                                        <TableCell sx={{ width: '19%', fontWeight: 700, color: '#555', fontSize: '0.75rem !important', bgcolor: isDark ? alpha('#fff', 0.04) : '#f0f4f9', '@media print': { background: '#eef2f9 !important', color: '#333 !important', fontWeight: 700 } }}>
                                            {row[0]}
                                        </TableCell>
                                        <TableCell sx={{ width: '31%', fontWeight: 700, wordBreak: 'break-all' }}>{row[1] as string}</TableCell>
                                        <TableCell sx={{ width: '19%', fontWeight: 700, color: '#555', fontSize: '0.75rem !important', bgcolor: isDark ? alpha('#fff', 0.04) : '#f0f4f9', '@media print': { background: '#eef2f9 !important', color: '#333 !important', fontWeight: 700 } }}>
                                            {row[2]}
                                        </TableCell>
                                        <TableCell sx={{ width: '31%', fontWeight: 700, wordBreak: 'break-all' }}>{row[3] as string}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* ════════ SECTION 2: KPI SUMMARY ════════ */}
            <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SecHeader num="2" label="ภาพรวมสถานะทรัพยากร" sub="Executive KPI Summary — Current Utilization" bg="#155e75" />
                    <Box sx={{ p: 2.5 }}>
                        {/* KPI cards */}
                        <Grid container spacing={2} sx={{ mb: 2.5 }}>
                            <Grid item xs={3}>
                                <KpiCard label="CPU Usage" value={currentCpu.toFixed(1)} unit="%" color={statusColor(currentCpu)} sub={`${vm?.cpu_cores || '-'} Cores`} />
                            </Grid>
                            <Grid item xs={3}>
                                <KpiCard label="Memory Usage" value={currentMemory.toFixed(1)} unit="%" color={statusColor(currentMemory)} sub={formatBytes(vm?.memory_total_mb)} />
                            </Grid>
                            <Grid item xs={3}>
                                <KpiCard label="Storage Usage" value={currentStorage.toFixed(1)} unit="%" color={statusColor(currentStorage, 85, 70)} sub={formatBytes(vm?.storage_total_mb)} />
                            </Grid>
                            <Grid item xs={3}>
                                <KpiCard
                                    label="สถานะระบบ"
                                    value={vm?.power_state === 'on' ? 'ON' : 'OFF'}
                                    color={vm?.power_state === 'on' ? '#16a34a' : '#c0392b'}
                                    sub={formatUptime(realtime?.uptime || vm?.uptime_seconds, vm?.power_state)}
                                />
                            </Grid>
                        </Grid>

                        {/* Progress bars */}
                        {[
                            { label: 'CPU (หน่วยประมวลผล)', value: currentCpu, color: statusColor(currentCpu), icon: <CpuIcon sx={{ fontSize: 14 }} />, cap: [vm?.cpu_cores ? `${vm.cpu_cores} Cores` : '', vm?.cpu_total_mhz ? formatMhz(vm.cpu_total_mhz) : '', vm?.cpu_used_mhz ? `ใช้งาน ${formatMhz(vm.cpu_used_mhz)}` : ''].filter(Boolean).join(' · ') },
                            { label: 'Memory (หน่วยความจำ)', value: currentMemory, color: statusColor(currentMemory), icon: <MemoryIcon sx={{ fontSize: 14 }} />, cap: `ใช้งาน ${formatBytes(vm?.memory_used_mb)} / ทั้งหมด ${formatBytes(vm?.memory_total_mb)}` },
                            { label: 'Storage (พื้นที่เก็บข้อมูล)', value: currentStorage, color: statusColor(currentStorage, 85, 70), icon: <StorageIcon sx={{ fontSize: 14 }} />, cap: `ใช้งาน ${formatBytes(vm?.storage_used_mb)} / ทั้งหมด ${formatBytes(vm?.storage_total_mb)}${storageGrowth.perDay > 0 ? ` · เพิ่ม ~${formatBytes(storageGrowth.perDay)}/วัน` : ''}` },
                        ].map((r, i) => (
                            <Box key={i} sx={{ mb: i < 2 ? 1.75 : 0 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        {r.icon}
                                        <Typography variant="body2" fontWeight={700}>{r.label}</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={900} sx={{ color: r.color, '@media print': { color: `${r.color} !important` } }}>
                                        {r.value.toFixed(1)}%
                                    </Typography>
                                </Box>
                                <AsciiBar value={r.value} />
                                <LinearProgress variant="determinate" value={Math.min(r.value, 100)} sx={{
                                    height: 10, borderRadius: 5,
                                    '@media print': { display: 'none !important' },
                                    bgcolor: alpha(r.color, 0.12),
                                    '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: r.color },
                                }} />
                                <Typography variant="caption" color="text.secondary" sx={{ '@media print': { color: '#555 !important' } }}>{r.cap}</Typography>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>

            {/* ════════ SECTION 3: STATISTICS TABLE ════════ */}
            {chartData.length > 0 && (
                <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <SecHeader
                            num="3"
                            label="สถิติสมรรถนะในช่วงเวลา"
                            sub={`Performance Statistics · ${timeRangeLabel(timeRange, customStartDate, customEndDate)} · ${chartData.length} จุดข้อมูล`}
                            bg="#1e4976"
                        />
                        <TableContainer>
                            <Table size="small" sx={{
                                '& .MuiTableCell-root': {
                                    py: 0.85, px: 1.75, fontSize: '0.8rem',
                                    borderBottom: '1px solid', borderColor: 'divider',
                                    '@media print': { borderBottom: '1px solid #ddd !important' },
                                },
                                '& .MuiTableHead-root .MuiTableCell-root': {
                                    fontWeight: 700, bgcolor: isDark ? alpha('#fff', 0.06) : '#eef2f9',
                                    '@media print': { background: '#e8eef8 !important', fontWeight: 700 },
                                },
                            }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ทรัพยากร (Resource)</TableCell>
                                        <TableCell align="center">ปัจจุบัน</TableCell>
                                        <TableCell align="center">ต่ำสุด (Min)</TableCell>
                                        <TableCell align="center">สูงสุด (Max)</TableCell>
                                        <TableCell align="center">เฉลี่ย (Avg)</TableCell>
                                        <TableCell align="center">ระดับความเสี่ยง</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {[
                                        { label: 'CPU (%)', key: 'cpu', cur: currentCpu, h: 80, m: 60, unit: '%' },
                                        { label: 'Memory (%)', key: 'memory', cur: currentMemory, h: 80, m: 60, unit: '%' },
                                        { label: 'Storage (%)', key: 'storagePercent', cur: currentStorage, h: 85, m: 70, unit: '%' },
                                        { label: 'Storage Used (GB)', key: 'storageUsedGB', cur: chartData[chartData.length - 1]?.storageUsedGB ?? 0, h: 999, m: 999, unit: ' GB' },
                                        { label: 'Network RX (MB/s)', key: 'networkIn', cur: chartData[chartData.length - 1]?.networkIn ?? 0, h: 999, m: 999, unit: ' MB/s' },
                                        { label: 'Network TX (MB/s)', key: 'networkOut', cur: chartData[chartData.length - 1]?.networkOut ?? 0, h: 999, m: 999, unit: ' MB/s' },
                                    ].map((row, i) => {
                                        const c = statusColor(row.cur, row.h, row.m);
                                        const rl = riskLabel(row.cur, row.h, row.m);
                                        const rbg = riskBg(row.cur, row.h, row.m);
                                        const isInfo = row.h === 999;
                                        const rc = isInfo ? '#1a3560' : c;
                                        const rb = isInfo ? '#eef2f9' : rbg;
                                        return (
                                            <TableRow key={i} sx={{ bgcolor: i % 2 === 1 ? (isDark ? alpha('#fff', 0.025) : '#fafafa') : 'transparent' }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700, color: rc, '@media print': { color: `${rc} !important` } }}>
                                                    {row.cur.toFixed(1)}{row.unit}
                                                </TableCell>
                                                <TableCell align="center">{minField(chartData, row.key)}{row.unit}</TableCell>
                                                <TableCell align="center">{maxField(chartData, row.key)}{row.unit}</TableCell>
                                                <TableCell align="center">{avgField(chartData, row.key)}{row.unit}</TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{
                                                        display: 'inline-block', px: 1.5, py: 0.2,
                                                        borderRadius: 10, bgcolor: rb, color: rc,
                                                        fontWeight: 700, fontSize: '0.72rem',
                                                        '@media print': { border: `1px solid ${rc}`, bgcolor: `${rb} !important`, color: `${rc} !important` },
                                                    }}>
                                                        {isInfo ? 'ข้อมูล' : rl}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* ════════ SECTION 4: PERFORMANCE TREND CHARTS ════════ */}
            {/* NOTE: Charts use fixed pixel width (CW/CH) instead of ResponsiveContainer.
                This is required because the parent Box has display:none on screen.
                ResizeObserver returns 0 for display:none elements, causing ResponsiveContainer
                to render charts with 0 dimensions. Fixed pixel dimensions always render correctly. */}
            <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SecHeader
                        num="4"
                        label="กราฟแนวโน้มสมรรถนะตามช่วงเวลา"
                        sub={`Performance Trend Charts · ${timeRangeLabel(timeRange, customStartDate, customEndDate)}`}
                        bg="#4c1d95"
                    />
                    {chartData.length > 0 ? (
                        <Box sx={{ p: 1.75 }}>
                            <Grid container spacing={1.5}>

                                {/* ── Chart 1: CPU ── */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', mb: 0.75 }}>
                                            กราฟที่ 1: CPU Usage (%) · เฉลี่ย {avgField(chartData, 'cpu')}%
                                        </Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <AreaChart width={CW} height={CH} data={chartData} margin={{ top: 4, right: 6, left: -22, bottom: xA !== 0 ? 18 : 2 }}>
                                                <defs>
                                                    <linearGradient id="g-cpu" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid {...gridSx} />
                                                <XAxis dataKey="time" {...xProps} angle={xA} textAnchor={xT} />
                                                <YAxis tick={{ fontSize: 9, fill: '#555' }} domain={[0, 100]} width={26} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" strokeWidth={2} fill="url(#g-cpu)" dot={false} />
                                            </AreaChart>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* ── Chart 2: Memory ── */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', mb: 0.75 }}>
                                            กราฟที่ 2: Memory Usage (%) · เฉลี่ย {avgField(chartData, 'memory')}%
                                        </Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <AreaChart width={CW} height={CH} data={chartData} margin={{ top: 4, right: 6, left: -22, bottom: xA !== 0 ? 18 : 2 }}>
                                                <defs>
                                                    <linearGradient id="g-mem" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid {...gridSx} />
                                                <XAxis dataKey="time" {...xProps} angle={xA} textAnchor={xT} />
                                                <YAxis tick={{ fontSize: 9, fill: '#555' }} domain={[0, 100]} width={26} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="memory" name="Memory %" stroke="#8b5cf6" strokeWidth={2} fill="url(#g-mem)" dot={false} />
                                            </AreaChart>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* ── Chart 3: Network I/O ── */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', mb: 0.4 }}>
                                            กราฟที่ 3: Network Traffic (MB/s)
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                                            <Typography sx={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>■ RX (รับ)</Typography>
                                            <Typography sx={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>■ TX (ส่ง)</Typography>
                                        </Box>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <LineChart width={CW} height={CH} data={chartData} margin={{ top: 4, right: 6, left: -22, bottom: xA !== 0 ? 18 : 2 }}>
                                                <CartesianGrid {...gridSx} />
                                                <XAxis dataKey="time" {...xProps} angle={xA} textAnchor={xT} />
                                                <YAxis tick={{ fontSize: 9, fill: '#555' }} width={26} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="networkIn" name="RX (MB/s)" stroke="#10b981" dot={false} strokeWidth={2} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="networkOut" name="TX (MB/s)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                                            </LineChart>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* ── Chart 4: Disk I/O ── */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', mb: 0.4 }}>
                                            กราฟที่ 4: Disk I/O (IOPS)
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                                            <Typography sx={{ fontSize: '0.65rem', color: '#0ea5e9', fontWeight: 700 }}>■ Read</Typography>
                                            <Typography sx={{ fontSize: '0.65rem', color: '#ec4899', fontWeight: 700 }}>■ Write</Typography>
                                        </Box>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <LineChart width={CW} height={CH} data={chartData} margin={{ top: 4, right: 6, left: -22, bottom: xA !== 0 ? 18 : 2 }}>
                                                <CartesianGrid {...gridSx} />
                                                <XAxis dataKey="time" {...xProps} angle={xA} textAnchor={xT} />
                                                <YAxis tick={{ fontSize: 9, fill: '#555' }} width={26} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="diskRead" name="Read IOPS" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                                                <Line isAnimationActive={false} type="monotone" dataKey="diskWrite" name="Write IOPS" stroke="#ec4899" dot={false} strokeWidth={2} />
                                            </LineChart>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* ── Chart 5: Storage GB ── */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', mb: 0.75 }}>
                                            กราฟที่ 5: Storage Used (GB) · ปัจจุบัน {(chartData[chartData.length - 1]?.storageUsedGB ?? 0).toFixed(1)} GB
                                        </Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <AreaChart width={CW} height={CH} data={chartData} margin={{ top: 4, right: 6, left: -22, bottom: xA !== 0 ? 18 : 2 }}>
                                                <defs>
                                                    <linearGradient id="g-sgb" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid {...gridSx} />
                                                <XAxis dataKey="time" {...xProps} angle={xA} textAnchor={xT} />
                                                <YAxis tick={{ fontSize: 9, fill: '#555' }} width={26} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="storageUsedGB" name="Used (GB)" stroke="#6366f1" strokeWidth={2} fill="url(#g-sgb)" dot={false} />
                                            </AreaChart>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* ── Chart 6: Storage % ── */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', mb: 0.75 }}>
                                            กราฟที่ 6: Storage Usage (%) · ปัจจุบัน {(chartData[chartData.length - 1]?.storagePercent ?? 0).toFixed(1)}%
                                        </Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <AreaChart width={CW} height={CH} data={chartData} margin={{ top: 4, right: 6, left: -22, bottom: xA !== 0 ? 18 : 2 }}>
                                                <defs>
                                                    <linearGradient id="g-spct" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.5} />
                                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid {...gridSx} />
                                                <XAxis dataKey="time" {...xProps} angle={xA} textAnchor={xT} />
                                                <YAxis tick={{ fontSize: 9, fill: '#555' }} domain={[0, 100]} width={26} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area isAnimationActive={false} type="monotone" dataKey="storagePercent" name="Usage %" stroke="#14b8a6" strokeWidth={2} fill="url(#g-spct)" dot={false} />
                                            </AreaChart>
                                        </Box>
                                    </Box>
                                </Grid>

                            </Grid>
                        </Box>
                    ) : (
                        <Box sx={{ py: 5, textAlign: 'center' }}>
                            {metricsLoading
                                ? <CircularProgress size={28} />
                                : <Typography variant="body2" color="text.secondary">ไม่มีข้อมูลในช่วงเวลาที่เลือก</Typography>}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* ════════ SECTION 5: NETWORK & STORAGE DETAIL ════════ */}
            <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SecHeader num="5" label="รายละเอียดเครือข่ายและดิสก์" sub="Network Interface & Virtual Disk Detail" bg="#065f46" />
                    <Grid container>
                        {/* Network */}
                        <Grid item xs={12} md={6} sx={{ borderRight: { md: '1px solid' }, borderColor: { md: 'divider' } }}>
                            <Box sx={{ p: 1.75 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, pb: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <NetworkIcon sx={{ fontSize: 15 }} /> Network Interfaces ({networks.length})
                                </Typography>
                                {networks.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.6, px: 1, fontSize: '0.75rem', borderBottom: '1px solid', borderColor: 'divider', '@media print': { borderBottom: '1px solid #ddd !important' } } }}>
                                            <TableHead>
                                                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: isDark ? alpha('#fff', 0.05) : '#f8fafc', '@media print': { background: '#f0f4f8 !important' } } }}>
                                                    <TableCell>Network</TableCell>
                                                    <TableCell>IP Address</TableCell>
                                                    <TableCell>MAC Address</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {networks.map((n, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell sx={{ fontWeight: 600 }}>{n.network_name || `eth${i}`}</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>{n.ip_address || '—'}</TableCell>
                                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{n.mac_address || '—'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>ไม่พบข้อมูล Network Interface</Typography>
                                )}
                            </Box>
                        </Grid>

                        {/* Disks */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ p: 1.75 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, pb: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <StorageIcon sx={{ fontSize: 15 }} /> Virtual Disks ({disks.length})
                                </Typography>
                                {disks.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.6, px: 1, fontSize: '0.75rem', borderBottom: '1px solid', borderColor: 'divider', '@media print': { borderBottom: '1px solid #ddd !important' } } }}>
                                            <TableHead>
                                                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: isDark ? alpha('#fff', 0.05) : '#f8fafc', '@media print': { background: '#f0f4f8 !important' } } }}>
                                                    <TableCell>Disk / File</TableCell>
                                                    <TableCell align="right">ขนาด</TableCell>
                                                    <TableCell>Datastore</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {disks.map((d, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell sx={{ fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {d.storage_file ? d.storage_file.split('/').pop() : `disk-${i + 1}`}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatBytes(d.size_mb)}</TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{d.storage_name || '—'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>ไม่พบข้อมูล Virtual Disk</Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* ════════ SECTION 6: PROTECTION & ALERTS ════════ */}
            <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SecHeader num="6" label="สถานะการปกป้องและการแจ้งเตือน" sub="Backup Protection & Alarm Status" bg="#78350f" />
                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                            {/* Backup */}
                            <Grid item xs={12} md={4}>
                                <Box sx={{ p: 1.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', height: '100%', '@media print': { border: '1px solid #ccc !important' } }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <BackupIcon sx={{ fontSize: 15 }} /> สถานะ Backup
                                    </Typography>
                                    {vm?.protection_type ? (
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                                <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                                                <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a', '@media print': { color: '#16a34a !important' } }}>
                                                    ได้รับการปกป้องแล้ว
                                                </Typography>
                                            </Box>
                                            {vm.protection_name && <Typography variant="body2" sx={{ mb: 0.35 }}><strong>Policy:</strong> {vm.protection_name}</Typography>}
                                            {vm.backup_file_count != null && <Typography variant="body2" sx={{ mb: 0.35 }}><strong>ชุดสำรอง:</strong> {vm.backup_file_count} ชุด</Typography>}
                                            <Typography variant="body2"><strong>ประเภท:</strong> {vm.protection_type}</Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                                            <WarningIcon sx={{ fontSize: 16, color: '#c0392b', mt: 0.1 }} />
                                            <Typography variant="body2" fontWeight={700} sx={{ color: '#c0392b', '@media print': { color: '#c0392b !important' } }}>
                                                ไม่มี Backup<br />ความเสี่ยงสูงมาก — ควรกำหนด Backup Policy โดยทันที
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                            {/* Alarms */}
                            <Grid item xs={12} md={8}>
                                <Box sx={{ p: 1.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', height: '100%', '@media print': { border: '1px solid #ccc !important' } }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <AlarmIcon sx={{ fontSize: 15, color: 'error.main' }} /> การแจ้งเตือน ({alarms.length + platformAlerts.length} รายการ)
                                    </Typography>
                                    {alarms.length === 0 && platformAlerts.length === 0 ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                                            <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a', '@media print': { color: '#16a34a !important' } }}>
                                                ทำงานปกติ — ไม่มีการแจ้งเตือน
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                                            {[...alarms, ...platformAlerts].slice(0, 12).map((a, i) => (
                                                <Box key={i} sx={{
                                                    p: 0.75, borderRadius: 1, borderLeft: '3px solid #f59e0b',
                                                    bgcolor: isDark ? alpha('#f59e0b', 0.07) : '#fffbeb',
                                                    '@media print': { bgcolor: '#fffbeb !important', borderLeft: '3px solid #f59e0b !important' },
                                                }}>
                                                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', lineHeight: 1.3 }}>
                                                        ⚠ {a.title || a.description || 'Alarm'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ '@media print': { color: '#666 !important' } }}>
                                                        {a.begin_time ? formatThaiDateTime(a.begin_time) : 'ไม่ระบุเวลา'}
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {(alarms.length + platformAlerts.length) > 12 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                    … และอีก {(alarms.length + platformAlerts.length) - 12} รายการ
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                </CardContent>
            </Card>

            {/* ════════ SECTION 7: RECOMMENDATIONS ════════ */}
            <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <SecHeader num="7" label="ข้อเสนอแนะและการประเมินความเสี่ยง" sub="Recommendations & Risk Assessment" bg="#1e3a5f" />
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {recs.map((r, i) => (
                                <Box key={i} sx={{
                                    display: 'flex', gap: 1.5, p: 1.25, borderRadius: 1.5,
                                    borderLeft: `4px solid ${recColors[r.level]}`,
                                    bgcolor: isDark ? alpha(recColors[r.level], 0.08) : recBgs[r.level],
                                    '@media print': {
                                        bgcolor: `${recBgs[r.level]} !important`,
                                        borderLeft: `4px solid ${recColors[r.level]} !important`,
                                    },
                                }}>
                                    <Typography sx={{ fontSize: '1rem', lineHeight: 1.2, mt: 0.05, color: recColors[r.level], '@media print': { color: `${recColors[r.level]} !important` } }}>
                                        {recIcons[r.level]}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={r.level === 'warn' ? 700 : 500}>
                                        {r.text}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* ════════ DOCUMENT FOOTER (print only) ════════ */}
            <Box sx={{
                display: 'none',
                '@media print': {
                    display: 'block !important',
                    mt: 2, pt: 1.75,
                    borderTop: '2px solid #1a3560',
                },
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#1a3560 !important', display: 'block', mb: 0.25 }}>
                            ระบบ VMStat Intelligence Center — SANGFOR SCP
                        </Typography>
                        <Typography sx={{ fontSize: '0.67rem', color: '#555 !important', display: 'block', mb: 0.2 }}>
                            ออกรายงานวันที่: {printDate} · ผู้พิมพ์: {user?.username || 'Administrator'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.63rem', color: '#888 !important', display: 'block', fontStyle: 'italic' }}>
                            รายงานนี้จัดทำโดยระบบอัตโนมัติ — ห้ามเผยแพร่โดยไม่ได้รับอนุญาต
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', minWidth: 220 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#000 !important', display: 'block', mb: 2.5 }}>
                            อนุมัติ / Approved By
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: '#333 !important', display: 'block' }}>
                            ลงนาม: ____________________________
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: '#333 !important', display: 'block', mt: 0.5 }}>
                            ชื่อ / Name: ________________________
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: '#333 !important', display: 'block', mt: 0.5 }}>
                            วันที่: ________________________________
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5, pt: 1, borderTop: '1px solid #ccc' }}>
                    <Typography sx={{ fontSize: '0.62rem', color: '#aaa !important' }}>
                        — จบรายงาน | End of Report · {vm?.name} · {printDate} —
                    </Typography>
                </Box>
            </Box>

        </Box>
    );
}
