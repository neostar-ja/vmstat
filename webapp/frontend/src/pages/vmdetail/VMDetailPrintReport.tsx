/**
 * VMDetailPrintReport — Professional A4 Print Report (v3)
 *
 * Layout strategy:
 *   • position:fixed header (top:0) + footer (bottom:0) in @media print
 *     → reliably pinned to every physical page regardless of content height
 *   • CSS counter(page) in the fixed footer for auto page numbers X/3
 *   • Simple break-before:page on section 3 and section 4 divs
 *   • 2-column chart grid (3 rows × 2 cols) → halves chart-page height
 *
 * Chart strategy: fixed pixel dimensions — no ResponsiveContainer.
 */

import {
    Area, AreaChart, CartesianGrid, Line, LineChart,
    Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatUptime, formatBytes, formatMhz } from './helpers';
import type { Tab7Props } from './types';

// ─── Chart dimensions ───────────────────────────────────────
// Must be fixed pixels — no ResponsiveContainer
const CW = 640; // chart width — full content width (1-column layout)
const CH = 100; // chart height — taller for readability

// ─── Helper math ────────────────────────────────────────────
const numAvg = (data: any[], key: string) =>
    data.length ? data.reduce((s, d) => s + (d[key] || 0), 0) / data.length : 0;
const numMin = (data: any[], key: string) =>
    data.length ? Math.min(...data.map(d => d[key] || 0)) : 0;
const numMax = (data: any[], key: string) =>
    data.length ? Math.max(...data.map(d => d[key] || 0)) : 0;

const fmt = (v: number, unit = '') => `${v.toFixed(1)}${unit}`;

const getTimeRangeData = (tr: string, cs: string, ce: string) => {
    let label = '';
    const m: Record<string, string> = {
        '1h': '1 ชั่วโมงล่าสุด', '6h': '6 ชั่วโมงล่าสุด',
        '12h': '12 ชั่วโมงล่าสุด', '24h': '24 ชั่วโมงล่าสุด',
        '1d': '24 ชั่วโมงล่าสุด', '7d': '7 วัน', '30d': '30 วัน',
    };
    label = m[tr] || tr;
    if (tr === 'custom') label = 'กำหนดเอง';

    const start = new Date();
    const end = new Date();
    const fmtDateTime = (d: Date) => d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const fmtDateOnly = (d: Date) => d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let range = '';
    if (tr === 'custom') {
        range = `${cs} - ${ce}`;
    } else if (tr.endsWith('h')) {
        start.setHours(end.getHours() - parseInt(tr));
        range = `${fmtDateTime(start)} - ${fmtDateTime(end)}`;
    } else if (tr.endsWith('d')) {
        start.setDate(end.getDate() - parseInt(tr));
        range = `${fmtDateOnly(start)} - ${fmtDateOnly(end)}`;
    } else {
        range = tr;
    }

    return { label, range };
};

const riskColor = (v: number, h = 80, m = 60) =>
    v >= h ? '#c0392b' : v >= m ? '#d97706' : '#16a34a';

// ─── Reusable chart card ─────────────────────────────────────
interface ChartCardProps {
    title: string;
    unit: string;
    dataKey: string;
    dataKey2?: string;
    data: any[];
    color: string;
    color2?: string;
    label: string;
    label2?: string;
    kind?: 'area' | 'line';
    domainMax?: number;
    accentColor?: string; // colored left-border accent (defaults to primary color)
    w?: number;
    h?: number;
}

function ChartCard({ title, unit, dataKey, dataKey2, data, color, color2, label, label2, kind = 'area', domainMax, accentColor, w = CW, h = CH }: ChartCardProps) {
    const gradId = `pr-g-${dataKey}`;
    const axisProps = { tick: { fontSize: 7, fill: '#6b7280' }, minTickGap: 30, tickMargin: 2 };
    const yDomain: [number | string, number | string] = domainMax ? [0, domainMax] : ['auto', 'auto'];

    const minVal = numMin(data, dataKey);
    const maxVal = numMax(data, dataKey);
    const avgVal = numAvg(data, dataKey);
    const min2 = dataKey2 ? numMin(data, dataKey2) : 0;
    const max2 = dataKey2 ? numMax(data, dataKey2) : 0;
    const avg2 = dataKey2 ? numAvg(data, dataKey2) : 0;
    void min2;

    const ac = accentColor ?? color;
    return (
        <div className="break-inside-avoid rounded overflow-hidden" style={{
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${ac}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            marginBottom: 2,
        }}>
            {/* Title bar with subtle tinted background */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px',
                background: `linear-gradient(90deg, ${ac}14 0%, white 60%)`,
                borderBottom: `1px solid ${ac}25`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: ac, flexShrink: 0,
                    }} />
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</p>
                </div>
                {/* Legend for dual-series */}
                {dataKey2 && color2 && label2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color }}>
                            <span style={{ display: 'inline-block', width: 18, height: 2.5, borderRadius: 2, backgroundColor: color }} />
                            {label}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: color2 }}>
                            <span style={{ display: 'inline-block', width: 18, height: 2.5, borderRadius: 2, backgroundColor: color2 }} />
                            {label2}
                        </span>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div style={{ backgroundColor: 'white', padding: '4px 4px 0' }}>
                {kind === 'area' ? (
                    <AreaChart width={w} height={h} data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.03} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" {...axisProps} />
                        <YAxis tick={{ fontSize: 7, fill: '#94a3b8' }} domain={yDomain} width={26} />
                        <Tooltip contentStyle={{ fontSize: 9, borderRadius: 4, border: `1px solid ${color}40`, backgroundColor: 'white' }} />
                        <Area isAnimationActive={false} type="monotone" dataKey={dataKey} name={label}
                            stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
                    </AreaChart>
                ) : (
                    <LineChart width={w} height={h} data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" {...axisProps} />
                        <YAxis tick={{ fontSize: 7, fill: '#94a3b8' }} width={26} />
                        <Tooltip contentStyle={{ fontSize: 9, borderRadius: 4, border: `1px solid ${color}40`, backgroundColor: 'white' }} />
                        <Line isAnimationActive={false} type="monotone" dataKey={dataKey} name={label}
                            stroke={color} strokeWidth={2} dot={false} />
                        {dataKey2 && color2 && label2 && (
                            <Line isAnimationActive={false} type="monotone" dataKey={dataKey2} name={label2}
                                stroke={color2} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                        )}
                    </LineChart>
                )}
            </div>

            {/* Stats bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                borderTop: `1px solid ${ac}20`,
                backgroundColor: `${ac}08`,
                padding: '4px 10px',
            }}>
                {[ 
                    { label: 'Max', value: fmt(maxVal, unit), bold: true },
                    { label: 'Min', value: fmt(minVal, unit), bold: false },
                    { label: 'Avg', value: fmt(avgVal, unit), bold: true },
                ].map(({ label: sl, value, bold }, i) => (
                    <span key={sl} style={{
                        fontSize: 8.5, color: '#475569',
                        paddingRight: 14, marginRight: 14,
                        borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                    }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{sl}</span>{' '}
                        <span style={{ fontWeight: bold ? 800 : 500, color: bold ? ac : '#64748b' }}>{value}</span>
                    </span>
                ))}
                {dataKey2 && label2 && (
                    <>
                        <span style={{ fontSize: 8.5, color: '#475569', paddingRight: 14, marginRight: 14, borderRight: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{label2} Max</span>{' '}
                            <span style={{ fontWeight: 800, color: color2 ?? '#888' }}>{fmt(max2, unit)}</span>
                        </span>
                        <span style={{ fontSize: 8.5, color: '#475569' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>Avg</span>{' '}
                            <span style={{ fontWeight: 800, color: color2 ?? '#888' }}>{fmt(avg2, unit)}</span>
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────
function SecHead({ num, title, sub, bgColor = '#1e293b' }: { num: string; title: string; sub?: string; bgColor?: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 14px',
            background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)`,
            borderRadius: '4px 4px 0 0',
            borderBottom: '2px solid rgba(255,255,255,0.15)',
        }}>
            <div style={{
                width: 26, height: 26, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>{num}</span>
            </div>
            <div>
                <p style={{ color: 'white', fontSize: 11, fontWeight: 800, margin: 0, lineHeight: 1.25, letterSpacing: '0.01em' }}>{title}</p>
                {sub && <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 9, margin: 0, lineHeight: 1.3, marginTop: 1 }}>{sub}</p>}
            </div>
        </div>
    );
}

// ─── Page footer (explicit page number per page) ────────────
function PageFooter({ pageNum, totalPages, printDate, printTime, userName, year }: {
    pageNum: number; totalPages: number;
    printDate: string; printTime: string; userName: string; year: number;
}) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1.5px solid #cbd5e1',
            padding: '7px 4mm',
            backgroundColor: 'white',
        }}>
            {/* Left */}
            <div>
                <p style={{ fontSize: 7.5, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>CONFIDENTIAL · For Internal Use Only · WUH VMStat</p>
                <p style={{ fontSize: 7.5, color: '#94a3b8', margin: 0 }}>พิมพ์เมื่อ: {printDate} {printTime} น. · โดย: {userName}</p>
            </div>
            {/* Center — page number badge */}
            <div style={{
                display: 'flex', alignItems: 'baseline', gap: 3,
                border: '1.5px solid #1a3560', borderRadius: 4,
                padding: '3px 14px', backgroundColor: '#f8fafc',
            }}>
                <span style={{ fontSize: 8, color: '#64748b' }}>หน้า</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#1a3560', lineHeight: 1 }}>{pageNum}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>/</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{totalPages}</span>
            </div>
            {/* Right */}
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 7.5, color: '#94a3b8', margin: 0 }}>เอกสารอ้างอิง: WUH-IT-VMRPT-{year}</p>
                <p style={{ fontSize: 7.5, color: '#94a3b8', margin: 0 }}>Sangfor SCP VMStat © {year}</p>
            </div>
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────
export default function VMDetailPrintReport(props: Tab7Props) {
    const {
        vm, realtime, disks, networks, alarms, platformAlerts,
        chartData, currentCpu, currentMemory, currentStorage,
        storageGrowth, timeRange, user, customStartDate, customEndDate,
    } = props;

    const printDate = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const printTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const totalAlarms = alarms.length + platformAlerts.length;
    const firstAlarm = alarms[0] || platformAlerts[0];
    const { label: trLabel, range: trRange } = getTimeRangeData(timeRange, customStartDate, customEndDate);

    // Recommendations
    const recs: { icon: string; color: string; text: string }[] = [];
    if (currentCpu >= 80) recs.push({ icon: '⚠', color: '#c0392b', text: `CPU ใช้งานสูง ${currentCpu.toFixed(1)}% — พิจารณาเพิ่ม vCPU หรือปรับ Workload` });
    if (currentMemory >= 80) recs.push({ icon: '⚠', color: '#c0392b', text: `Memory ใช้งานสูง ${currentMemory.toFixed(1)}% — พิจารณาเพิ่ม RAM` });
    if (currentStorage >= 85) recs.push({ icon: '⚠', color: '#c0392b', text: `Storage ใช้งานสูง ${currentStorage.toFixed(1)}% — ควรเพิ่มพื้นที่โดยเร็ว` });
    if (!vm?.protection_type) recs.push({ icon: '❌', color: '#c0392b', text: 'ไม่มี Backup Policy — ความเสี่ยงสูงมาก' });
    if (totalAlarms > 0) recs.push({ icon: '⚠', color: '#d97706', text: `พบการแจ้งเตือน ${totalAlarms} รายการ — ควรตรวจสอบในระบบ` });
    if (storageGrowth.perDay > 500 * 1024 * 1024) recs.push({ icon: 'ℹ', color: '#2563eb', text: `Storage เพิ่มขึ้น ~${formatBytes(storageGrowth.perDay)}/วัน — ควรวางแผนขยาย Storage` });
    if (recs.length === 0) recs.push({ icon: '✓', color: '#16a34a', text: 'ระบบทำงานปกติ ทรัพยากรทุกรายการอยู่ในระดับที่ยอมรับได้' });

    const userName = user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : (user?.username || 'Administrator');
    const YEAR = new Date().getFullYear();

    return (
        <>
            {/* ── Global print CSS ── */}
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 14mm 12mm 16mm; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { background: white !important; }
                    html, body, #root { height: auto !important; overflow: visible !important; }

                    nav, aside, header, footer,
                    .MuiDrawer-root, .MuiAppBar-root,
                    .MuiTabs-root, .MuiTab-root { display: none !important; }
                    .animate-fade-in { display: none !important; }

                    /* ── Report root ── */
                    .vm-print-report { display: block !important; }

                    /* ── Fixed running header — top of EVERY page ── */
                    .print-rh {
                        position: fixed;
                        top: 0; left: 0; right: 0;
                        height: 32px;
                        background: white;
                        border-bottom: 2px solid #1a3560;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 4mm;
                        z-index: 1000;
                    }

                    /* ── Page break helpers ── */
                    .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
                    /* Force new page BEFORE page 2 and 3 sections */
                    .page-break-before { break-before: page !important; page-break-before: always !important; }

                    /* ── Recharts ── */
                    .recharts-wrapper, .recharts-surface { background: white !important; }
                    .recharts-cartesian-grid line { stroke: #e5e7eb !important; }
                }
            `}</style>

            {/* ── REPORT ROOT ── */}
            <div className="vm-print-report hidden print:block print:bg-white print:text-black font-sans text-sm w-full">

                {/* ════════════════════════════════════════════
                    FIXED RUNNING HEADER — appears on every page
                    ════════════════════════════════════════════ */}
                <div className="print-rh">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src="/vmstat/wuh_logo.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#1a3560', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            VM Specification &amp; Status Report
                        </span>
                        <span style={{ fontSize: 8, color: '#64748b', marginLeft: 4 }}>· {vm?.name || '—'}</span>
                    </div>
                    <span style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic' }}>
                        โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์ · {printDate} {printTime} น.
                    </span>
                </div>

                {/* ════════════════════════════════════════
                    PAGE 1: Cover Header + Sections 1 & 2
                    ════════════════════════════════════════ */}
                {/* paddingTop gives space below fixed running header */}
                <div style={{ paddingTop: 38 }}>

                {/* ── HEADER ── */}
                <div className="mb-5 relative border-[1.5px] border-slate-300 rounded overflow-hidden">
                    {/* Top accent bar */}
                    <div style={{ height: 6, background: 'linear-gradient(90deg, #0f172a 0%, #1a3560 35%, #2563eb 70%, #38bdf8 100%)' }} />
                    <div className="px-5 py-4 bg-white">
                        <div className="flex justify-between items-start">
                            {/* Logo + titles */}
                            <div className="flex gap-4">
                                <div style={{
                                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 72, height: 72, border: '1.5px solid #e2e8f0', borderRadius: 6, backgroundColor: '#f8fafc', padding: 6,
                                }}>
                                    <img src="/vmstat/wuh_logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#1a3560', margin: '0 0 2px', textTransform: 'uppercase' }}>
                                        โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
                                    </p>
                                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                                        VM Specification &amp; Status Report
                                    </h1>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', margin: '3px 0 0' }}>
                                        รายงานข้อมูลจำเพาะและสถานะเครื่องเสมือน · VM Performance Assessment
                                    </p>
                                </div>
                            </div>

                            {/* Right info */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 12px', backgroundColor: '#f8fafc' }}>
                                    <p style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Document Ref.</p>
                                    <p style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                        WUH-IT-VMRPT-{new Date().getFullYear()}
                                    </p>
                                </div>
                                <div style={{ border: '2.5px solid #1a3560', padding: '4px 14px', transform: 'rotate(-2deg)', backgroundColor: 'white' }}>
                                    <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.25em', color: '#1a3560', textTransform: 'uppercase', margin: 0, lineHeight: 1.2 }}>CONFIDENTIAL</p>
                                    <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#64748b', textAlign: 'center', margin: 0 }}>Internal Use Only</p>
                                </div>
                            </div>
                        </div>

                        {/* VM identity row */}
                        {vm && (
                            <div style={{
                                marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                                border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', backgroundColor: '#f8fafc',
                            }}>
                                {([
                                    { label: 'VM Name', value: vm.name },
                                    { label: 'UUID', value: vm.vm_uuid, mono: true },
                                    { label: 'Report Period', value: trLabel, sub: trRange },
                                    {
                                        label: 'Power Status', value: vm.power_state === 'on' ? 'RUNNING' : 'STOPPED',
                                        badge: true, on: vm.power_state === 'on',
                                    },
                                ] as any[]).map((item, i) => (
                                    <div key={i} style={{
                                        padding: '10px 12px',
                                        borderRight: i < 3 ? '1px solid #e2e8f0' : 'none',
                                    }}>
                                        <p style={{ fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>{item.label}</p>
                                        {item.badge ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.on ? '#16a34a' : '#dc2626' }} />
                                                <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.05em', color: item.on ? '#15803d' : '#b91c1c' }}>{item.value}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p style={{
                                                    fontSize: item.mono ? 10 : 13, fontWeight: 900,
                                                    fontFamily: item.mono ? 'monospace' : undefined,
                                                    color: '#0f172a', margin: 0, wordBreak: 'break-all', lineHeight: 1.2,
                                                }}>{item.value}</p>
                                                {item.sub && <p style={{ fontSize: 9, fontFamily: 'monospace', color: '#64748b', margin: '2px 0 0', lineHeight: 1.3 }}>{item.sub}</p>}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SECTION 1: General Information ── */}
                <section className="break-inside-avoid mb-4">
                    <SecHead num="1" title="ข้อมูลทั่วไป (General Information)" bgColor="#1a3560" />
                    <div style={{ border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                        {([
                            ['VM Name', vm?.name, 'Power State', vm?.power_state === 'on' ? '🟢 Powered On (Running)' : '🔴 Powered Off (Stopped)'],
                            ['Guest OS', vm?.os_name || vm?.os_type || 'Unknown', 'IP Address', vm?.ip_address || networks[0]?.ip_address || 'ไม่ระบุ'],
                            ['Cluster / Group', vm?.group_name_path || vm?.group_name || vm?.project_name || 'ไม่ระบุ', 'Host', vm?.host_name || 'ไม่ระบุ'],
                            ['Datastore', vm?.storage_name || 'ไม่ระบุ', 'Uptime', formatUptime(realtime?.uptime || vm?.uptime_seconds, vm?.power_state)],
                            ['CPU Spec', `${vm?.cpu_cores || '-'} Cores${vm?.cpu_sockets ? ` / ${vm.cpu_sockets} Sockets` : ''}${vm?.cpu_total_mhz ? ` · ${formatMhz(vm.cpu_total_mhz)}` : ''}`,
                                'RAM / Storage', `${formatBytes(vm?.memory_total_mb)} RAM · ${formatBytes(vm?.storage_total_mb)} Storage`],
                        ] as [string, string | null | undefined, string, string][]).map(([k1, v1, k2, v2], i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr',
                                borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none',
                                backgroundColor: i % 2 === 1 ? '#fafafa' : 'white',
                            }}>
                                <div style={{ display: 'flex', borderRight: '1px solid #f1f5f9' }}>
                                    <span style={{ width: 130, flexShrink: 0, backgroundColor: '#f1f5f9', padding: '7px 12px', fontSize: 9, fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0' }}>{k1}</span>
                                    <span style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>{v1 ?? '—'}</span>
                                </div>
                                <div style={{ display: 'flex' }}>
                                    <span style={{ width: 110, flexShrink: 0, backgroundColor: '#f1f5f9', padding: '7px 12px', fontSize: 9, fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0' }}>{k2}</span>
                                    <span style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{v2 ?? '—'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── SECTION 2: Resource Specifications ── */}
                <section className="break-inside-avoid mb-4">
                    <SecHead num="2" title="ข้อมูลทรัพยากร (Resource Specifications)" bgColor="#155e75" />
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1.5px solid #e2e8f0', borderTop: 'none' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eef6fb' }}>
                                <th style={{ border: '1px solid #e2e8f0', padding: '7px 12px', textAlign: 'left', fontWeight: 800, color: '#0369a1', width: 120, fontSize: 10 }}>ประเภท (Resource)</th>
                                <th style={{ border: '1px solid #e2e8f0', padding: '7px 12px', textAlign: 'left', fontWeight: 800, color: '#0369a1', fontSize: 10 }}>ที่จัดสรรไว้ (Allocated)</th>
                                <th style={{ border: '1px solid #e2e8f0', padding: '7px 12px', textAlign: 'left', fontWeight: 800, color: '#0369a1', fontSize: 10 }}>การใช้งานปัจจุบัน (Current Usage)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {([
                                {
                                    label: 'vCPU', alloc: `${vm?.cpu_cores || '-'} Cores${vm?.cpu_sockets ? ` (${vm.cpu_sockets} Sockets)` : ''}${vm?.cpu_total_mhz ? ` · ${formatMhz(vm.cpu_total_mhz)}` : ''}`,
                                    usage: `${currentCpu.toFixed(1)}%${vm?.cpu_used_mhz ? ` · ${formatMhz(vm.cpu_used_mhz)} used` : ''}`, pct: currentCpu,
                                },
                                {
                                    label: 'Memory (RAM)', alloc: formatBytes(vm?.memory_total_mb),
                                    usage: `${formatBytes(vm?.memory_used_mb)} (${currentMemory.toFixed(1)}%)`, pct: currentMemory,
                                },
                                {
                                    label: 'Storage (Disk)', alloc: `${formatBytes(vm?.storage_total_mb)} (Provisioned)`,
                                    usage: `${formatBytes(vm?.storage_used_mb)} (${currentStorage.toFixed(1)}%)${storageGrowth.perDay > 0 ? ` · +${formatBytes(storageGrowth.perDay)}/วัน` : ''}`,
                                    pct: currentStorage,
                                },
                            ]).map((row, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 === 1 ? '#fafafa' : 'white' }}>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px', fontWeight: 700, backgroundColor: '#f8fafc', fontSize: 10 }}>{row.label}</td>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px' }}>{row.alloc}</td>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px', fontWeight: 800, color: riskColor(row.pct, i === 2 ? 85 : 80, i === 2 ? 70 : 60) }}>
                                        {row.usage}
                                    </td>
                                </tr>
                            ))}
                            {networks.length > 0 && (
                                <tr style={{ backgroundColor: '#fafafa' }}>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px', fontWeight: 700, backgroundColor: '#f8fafc', fontSize: 10 }}>Network (NIC)</td>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px' }}>{networks.length} Interface{networks.length > 1 ? 's' : ''}</td>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px' }}>
                                        {networks.slice(0, 4).map(n => n.ip_address).filter(Boolean).join(', ') || 'ไม่ระบุ'}
                                        {networks.length > 4 ? ` + ${networks.length - 4} more` : ''}
                                    </td>
                                </tr>
                            )}
                            {disks.length > 0 && (
                                <tr>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px', fontWeight: 700, backgroundColor: '#f8fafc', fontSize: 10 }}>Virtual Disk(s)</td>
                                    <td style={{ border: '1px solid #f1f5f9', padding: '7px 12px' }} colSpan={2}>
                                        {disks.map((d, i) => (
                                            <span key={i} style={{ marginRight: 16, fontSize: 10 }}>
                                                {d.storage_file?.split('/').pop() ?? `disk-${i + 1}`}: <strong>{formatBytes(d.size_mb)}</strong>
                                            </span>
                                        ))}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>

                </div>{/* /page-1 content */}
                <PageFooter pageNum={1} totalPages={3} printDate={printDate} printTime={printTime} userName={userName} year={YEAR} />

                {/* ════════════════════════════════════════
                    PAGE 2: Performance Charts (1-column)
                    ════════════════════════════════════════ */}
                <div className="page-break-before" style={{ paddingTop: 38 }}>
                    <SecHead
                        num="3"
                        title="ประสิทธิภาพการทำงาน (Performance Metrics)"
                        sub={chartData.length > 0
                            ? `${trLabel} (${trRange}) · ${chartData.length} Data Points`
                            : 'ไม่มีข้อมูลในช่วงเวลาที่เลือก'}
                        bgColor="#4c1d95"
                    />
                    {chartData.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                            <ChartCard title="📊 1. CPU Usage (%)" unit="%" dataKey="cpu" data={chartData} color="#3b82f6" accentColor="#3b82f6" label="CPU %" kind="area" domainMax={100} />
                            <ChartCard title="📊 2. Memory Usage (%)" unit="%" dataKey="memory" data={chartData} color="#8b5cf6" accentColor="#8b5cf6" label="Memory %" kind="area" domainMax={100} />
                            <ChartCard title="📈 3. Disk IOPS (Read / Write)" unit=" IOPS" dataKey="diskRead" dataKey2="diskWrite" data={chartData} color="#0ea5e9" color2="#ec4899" accentColor="#0ea5e9" label="Read" label2="Write" kind="line" />
                            <ChartCard title="📈 4. Storage Trend (GB Used)" unit=" GB" dataKey="storageUsedGB" data={chartData} color="#6366f1" accentColor="#6366f1" label="Used GB" kind="area" />
                            <ChartCard title="🌐 5. Network Traffic (MB/s)" unit=" MB/s" dataKey="networkIn" dataKey2="networkOut" data={chartData} color="#10b981" color2="#f59e0b" accentColor="#10b981" label="RX (In)" label2="TX (Out)" kind="line" />
                            <ChartCard title="⏱️ 6. Storage Usage (%)" unit="%" dataKey="storagePercent" data={chartData} color="#14b8a6" accentColor="#14b8a6" label="Storage %" kind="area" domainMax={100} />
                        </div>
                    ) : (
                        <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 4, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
                            ไม่มีข้อมูล Metrics — กรุณาเลือกช่วงเวลาก่อนพิมพ์รายงาน
                        </div>
                    )}
                </div>{/* /page-2 charts */}
                <PageFooter pageNum={2} totalPages={3} printDate={printDate} printTime={printTime} userName={userName} year={YEAR} />

                {/* ════════════════════════════════════════
                    PAGE 3: Health & Backup + Signatures
                    ════════════════════════════════════════ */}
                <div className="page-break-before" style={{ paddingTop: 38 }}>

                    {/* ── SECTION 4: Health & Backup ── */}
                    <section className="break-inside-avoid mb-5">
                        <SecHead num="4" title="สถานะภาพรวม (Health & Backup Status)" bgColor="#78350f" />
                        <div style={{ border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                            {/* Backup */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{vm?.protection_type ? '🛡️' : '❌'}</span>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: '0 0 3px' }}>สถานะการสำรองข้อมูล (Backup Protection)</p>
                                    {vm?.protection_type ? (
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', margin: 0 }}>
                                            ได้รับการปกป้องแล้ว — Policy: {vm.protection_name || vm.protection_type}
                                            {vm.backup_file_count ? ` · ${vm.backup_file_count} ชุดสำรอง` : ''}
                                        </p>
                                    ) : (
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0392b', margin: 0 }}>
                                            ไม่มีการสำรองข้อมูล (Unprotected) — ความเสี่ยงสูง ควรกำหนด Backup Policy โดยทันที
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Alarms */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{totalAlarms === 0 ? '✅' : '⚠️'}</span>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: '0 0 3px' }}>
                                        การแจ้งเตือน (Alarms &amp; Alerts) — {totalAlarms} รายการ
                                    </p>
                                    {totalAlarms === 0 ? (
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', margin: 0 }}>ทำงานปกติ — ไม่พบการแจ้งเตือน</p>
                                    ) : (
                                        <>
                                            <p style={{ fontSize: 11, fontWeight: 600, color: '#d97706', margin: 0 }}>
                                                พบ {totalAlarms} รายการ · รายการล่าสุด: {firstAlarm?.title || firstAlarm?.description || 'ดูรายละเอียดในระบบ'}
                                            </p>
                                            {totalAlarms > 1 && (
                                                <p style={{ fontSize: 9, color: '#64748b', fontStyle: 'italic', margin: '3px 0 0' }}>
                                                    และอีก {totalAlarms - 1} รายการ — ดูรายละเอียดเพิ่มเติมในระบบ VMStat
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Recommendations */}
                            <div style={{ padding: '12px 16px' }}>
                                <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>ข้อเสนอแนะ (Recommendations)</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {recs.map((r, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11,
                                            borderLeft: `3px solid ${r.color}`, paddingLeft: 10,
                                            backgroundColor: `${r.color}08`, borderRadius: '0 4px 4px 0', padding: '5px 10px',
                                        }}>
                                            <span style={{ fontWeight: 900, flexShrink: 0, color: r.color }}>{r.icon}</span>
                                            <span style={{ color: '#334155' }}>{r.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── AUTHORIZATION SIGNATURES ── */}
                    <section className="break-inside-avoid mb-5">
                        {/* Section header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1a3560 100%)',
                            borderRadius: '4px 4px 0 0',
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.4)',
                                background: 'rgba(255,255,255,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                fontSize: 14,
                            }}>✍️</div>
                            <div>
                                <p style={{ color: 'white', fontSize: 12, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
                                    ลายมือชื่อผู้รับรอง (Authorization Signatures)
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 9, margin: 0, lineHeight: 1.3, marginTop: 2 }}>
                                    เอกสารนี้มีผลบังคับใช้เมื่อได้รับการลงนามรับรองจากผู้มีอำนาจครบทั้ง 3 ฝ่ายแล้วเท่านั้น
                                </p>
                            </div>
                        </div>

                        {/* Signature cards container */}
                        <div style={{
                            border: '1.5px solid #e2e8f0', borderTop: 'none',
                            borderRadius: '0 0 4px 4px', padding: 16,
                            backgroundColor: '#f8fafc',
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
                        }}>
                            {([
                                { th: 'ผู้จัดทำรายงาน', en: 'Prepared By', color: '#1e40af', bg: '#eff6ff' },
                                { th: 'ผู้ตรวจสอบรายงาน', en: 'Reviewed By', color: '#065f46', bg: '#f0fdf4' },
                                { th: 'ผู้อนุมัติรายงาน', en: 'Approved By', color: '#7c2d12', bg: '#fff7ed' },
                            ] as const).map(({ th, en, color, bg }) => (
                                <div key={en} style={{
                                    border: `1.5px solid ${color}30`, borderRadius: 6,
                                    overflow: 'hidden', backgroundColor: 'white',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                                }}>
                                    {/* Card header */}
                                    <div style={{ backgroundColor: color, padding: '8px 14px' }}>
                                        <p style={{ color: 'white', fontSize: 11, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{en}</p>
                                        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 9, margin: '2px 0 0', lineHeight: 1.2 }}>{th}</p>
                                    </div>

                                    {/* Signature drawing area */}
                                    <div style={{
                                        height: 90, backgroundColor: bg,
                                        borderBottom: `1.5px dashed ${color}35`,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'flex-end',
                                        paddingBottom: 6,
                                    }}>
                                        <div style={{
                                            width: '75%', borderBottom: `1.5px solid ${color}60`,
                                            marginBottom: 4,
                                        }} />
                                        <span style={{ fontSize: 8, color: `${color}60`, fontStyle: 'italic' }}>
                                            ลายเซ็นต์ / Signature
                                        </span>
                                    </div>

                                    {/* Detail fields */}
                                    <div style={{ padding: '10px 14px 14px' }}>
                                        {([
                                            { label: 'ชื่อ-นามสกุล', sub: 'Full Name' },
                                            { label: 'ตำแหน่ง', sub: 'Position / Title' },
                                            { label: 'วันที่', sub: 'Date (DD/MM/YYYY)' },
                                        ]).map(({ label, sub }) => (
                                            <div key={label} style={{ marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 3 }}>
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#334155' }}>{label}</span>
                                                    <span style={{ fontSize: 8, color: '#94a3b8' }}>({sub})</span>
                                                </div>
                                                <div style={{
                                                    borderBottom: `1px solid ${color}50`,
                                                    width: '100%', height: 20,
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Note bar */}
                        <div style={{
                            marginTop: 10, padding: '7px 14px',
                            backgroundColor: '#fefce8', border: '1px solid #fde047',
                            borderRadius: 4, display: 'flex', alignItems: 'flex-start', gap: 8,
                        }}>
                            <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
                            <p style={{ fontSize: 9, color: '#713f12', margin: 0, lineHeight: 1.6 }}>
                                <strong>หมายเหตุ / Remark:</strong>{' '}
                                เอกสารฉบับนี้จัดทำโดยระบบ VMStat อัตโนมัติ และมีผลบังคับเมื่อได้รับการลงนามครบทั้ง 3 ฝ่ายแล้วเท่านั้น ·
                                This document is system-generated and becomes effective only upon completion of all three authorized signatures.
                            </p>
                        </div>
                    </section>

                </div>{/* /page-3 */}
                <PageFooter pageNum={3} totalPages={3} printDate={printDate} printTime={printTime} userName={userName} year={YEAR} />

            </div>{/* /vm-print-report */}
        </>
    );
}
