/**
 * VMDetailPrintReport — Tailwind CSS Print-Only Report Component
 *
 * Rendering strategy:
 * • On screen  : className="hidden" → display:none
 * • On print   : print:block overrides hidden via @media print
 *
 * Chart strategy:
 * • Fixed pixel widths (CW/CH) instead of <ResponsiveContainer>.
 *   ResizeObserver returns 0 for display:none parents, which makes
 *   ResponsiveContainer render 0×0 SVGs that are invisible when printed.
 *   Fixed dimensions render correctly regardless of parent visibility.
 */

import {
    Area, AreaChart, CartesianGrid, Line, LineChart,
    Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatUptime, formatBytes, formatMhz } from './helpers';
import type { Tab7Props } from './types';

// ─── Chart dimensions ───────────────────────────────────────
// Must be fixed pixels — no ResponsiveContainer
const CW = 640; // full A4 content width (210mm - 24mm margins) at ~96dpi — 1-column layout
const CH = 140;

// ─── Helper math ────────────────────────────────────────────
const numAvg = (data: any[], key: string) =>
    data.length ? data.reduce((s, d) => s + (d[key] || 0), 0) / data.length : 0;
const numMin = (data: any[], key: string) =>
    data.length ? Math.min(...data.map(d => d[key] || 0)) : 0;
const numMax = (data: any[], key: string) =>
    data.length ? Math.max(...data.map(d => d[key] || 0)) : 0;

const fmt = (v: number, unit = '') => `${v.toFixed(1)}${unit}`;

const timeRangeLabel = (tr: string, cs: string, ce: string) => {
    if (tr === 'custom') return `${cs} ถึง ${ce}`;
    const m: Record<string, string> = {
        '1h': '1 ชั่วโมงล่าสุด', '6h': '6 ชั่วโมงล่าสุด',
        '12h': '12 ชั่วโมงล่าสุด', '24h': '24 ชั่วโมงล่าสุด',
        '1d': '24 ชั่วโมงล่าสุด', '7d': '7 วันล่าสุด', '30d': '30 วันล่าสุด',
    };
    return m[tr] || tr;
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
}

function ChartCard({ title, unit, dataKey, dataKey2, data, color, color2, label, label2, kind = 'area', domainMax }: ChartCardProps) {
    const gradId = `pr-g-${dataKey}`;
    const axisProps = { tick: { fontSize: 8, fill: '#6b7280' }, minTickGap: 40, tickMargin: 2 };
    const yDomain: [number | string, number | string] = domainMax ? [0, domainMax] : ['auto', 'auto'];

    const minVal = numMin(data, dataKey);
    const maxVal = numMax(data, dataKey);
    const avgVal = numAvg(data, dataKey);
    const min2 = dataKey2 ? numMin(data, dataKey2) : 0;
    const max2 = dataKey2 ? numMax(data, dataKey2) : 0;
    const avg2 = dataKey2 ? numAvg(data, dataKey2) : 0;
    void min2;

    return (
        <div className="break-inside-avoid border border-slate-200 rounded overflow-hidden">
            {/* Title bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-2 py-1">
                <p className="text-[10px] font-bold text-slate-700 leading-tight">{title}</p>
                {dataKey2 && color2 && label2 && (
                    <div className="flex gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[9px]" style={{ color }}>
                            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
                            {label}
                        </span>
                        <span className="flex items-center gap-1 text-[9px]" style={{ color: color2 }}>
                            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: color2 }} />
                            {label2}
                        </span>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="p-1 bg-white">
                {kind === 'area' ? (
                    <AreaChart width={CW} height={CH} data={data} margin={{ top: 4, right: 4, left: -18, bottom: 2 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="time" {...axisProps} />
                        <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} domain={yDomain} width={24} />
                        <Tooltip contentStyle={{ fontSize: 10 }} />
                        <Area isAnimationActive={false} type="monotone" dataKey={dataKey} name={label}
                            stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} />
                    </AreaChart>
                ) : (
                    <LineChart width={CW} height={CH} data={data} margin={{ top: 4, right: 4, left: -18, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="time" {...axisProps} />
                        <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} width={24} />
                        <Tooltip contentStyle={{ fontSize: 10 }} />
                        <Line isAnimationActive={false} type="monotone" dataKey={dataKey} name={label}
                            stroke={color} strokeWidth={1.5} dot={false} />
                        {dataKey2 && color2 && label2 && (
                            <Line isAnimationActive={false} type="monotone" dataKey={dataKey2} name={label2}
                                stroke={color2} strokeWidth={1.5} dot={false} />
                        )}
                    </LineChart>
                )}
            </div>

            {/* Stats row */}
            <div className="border-t border-slate-200 bg-slate-50 px-2 py-1 flex flex-wrap gap-x-4 gap-y-0.5">
                <span className="text-[9px] text-slate-500">
                    <span className="font-bold text-slate-700">Max</span> {fmt(maxVal, unit)}
                </span>
                <span className="text-[9px] text-slate-500">
                    <span className="font-bold text-slate-700">Min</span> {fmt(minVal, unit)}
                </span>
                <span className="text-[9px] text-slate-500">
                    <span className="font-bold text-slate-700">Avg</span> {fmt(avgVal, unit)}
                </span>
                {dataKey2 && label2 && (
                    <>
                        <span className="text-[9px] text-slate-400">|</span>
                        <span className="text-[9px] text-slate-500">
                            <span className="font-bold text-slate-600">{label2} Max</span> {fmt(max2, unit)}
                        </span>
                        <span className="text-[9px] text-slate-500">
                            <span className="font-bold text-slate-600">Avg</span> {fmt(avg2, unit)}
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
        <div className="flex items-center gap-3 px-3 py-2" style={{ backgroundColor: bgColor }}>
            <div className="w-6 h-6 rounded-full border-2 border-white border-opacity-40 bg-white bg-opacity-15
                            flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-black leading-none">{num}</span>
            </div>
            <div>
                <p className="text-white text-xs font-black leading-tight">{title}</p>
                {sub && <p className="text-white text-opacity-75 text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{sub}</p>}
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

    // Recommendations
    const recs: { icon: string; color: string; text: string }[] = [];
    if (currentCpu >= 80) recs.push({ icon: '⚠', color: '#c0392b', text: `CPU ใช้งานสูง ${currentCpu.toFixed(1)}% — พิจารณาเพิ่ม vCPU หรือปรับ Workload` });
    if (currentMemory >= 80) recs.push({ icon: '⚠', color: '#c0392b', text: `Memory ใช้งานสูง ${currentMemory.toFixed(1)}% — พิจารณาเพิ่ม RAM` });
    if (currentStorage >= 85) recs.push({ icon: '⚠', color: '#c0392b', text: `Storage ใช้งานสูง ${currentStorage.toFixed(1)}% — ควรเพิ่มพื้นที่โดยเร็ว` });
    if (!vm?.protection_type) recs.push({ icon: '❌', color: '#c0392b', text: 'ไม่มี Backup Policy — ความเสี่ยงสูงมาก' });
    if (totalAlarms > 0) recs.push({ icon: '⚠', color: '#d97706', text: `พบการแจ้งเตือน ${totalAlarms} รายการ — ควรตรวจสอบในระบบ` });
    if (storageGrowth.perDay > 500 * 1024 * 1024) recs.push({ icon: 'ℹ', color: '#2563eb', text: `Storage เพิ่มขึ้น ~${formatBytes(storageGrowth.perDay)}/วัน — ควรวางแผนขยาย Storage` });
    if (recs.length === 0) recs.push({ icon: '✓', color: '#16a34a', text: 'ระบบทำงานปกติ ทรัพยากรทุกรายการอยู่ในระดับที่ยอมรับได้' });

    return (
        <>
            {/* ── Global print CSS ── */}
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm 12mm 12mm; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { background: white !important; }
                    html, body, #root { height: auto !important; overflow: visible !important; }

                    /* Hide all MUI layout chrome */
                    nav, aside, header, footer,
                    .MuiDrawer-root, .MuiAppBar-root,
                    .MuiTabs-root, .MuiTab-root { display: none !important; }

                    /* Hide the VM detail UI (hero, tabs, cards) */
                    .animate-fade-in { display: none !important; }

                    /* Ensure print report is visible */
                    .vm-print-report { display: block !important; }

                    /* Recharts white backgrounds */
                    .recharts-wrapper, .recharts-surface { background: white !important; }
                    .recharts-cartesian-grid line { stroke: #e5e7eb !important; }

                    /* Page break utilities */
                    .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
                }
            `}</style>

            {/* ────────────────────────────────────────────────────────
                REPORT ROOT — hidden on screen, block on print
                ──────────────────────────────────────────────────────── */}
            <div className="vm-print-report hidden print:block print:bg-white print:text-black font-sans text-sm w-full">

                {/* ═══════════════ HEADER ═══════════════ */}
                <div className="mb-6">
                    {/* Top accent gradient bar */}
                    <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3560 0%, #2563eb 60%, #38bdf8 100%)' }} />
                    <div className="border border-t-0 border-slate-300 px-5 py-4">
                        <div className="flex items-center justify-between gap-4">
                            {/* Left: logo + titles */}
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <img src="/wuh_logo.png" alt="Logo"
                                    style={{ height: 56, width: 'auto', maxWidth: 88, objectFit: 'contain' }} />
                                <div className="border-l border-slate-300 pl-4">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                                        Sangfor SCP · VMStat Intelligence Center
                                    </p>
                                    <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">
                                        VM SPECIFICATION &amp; STATUS REPORT
                                    </h1>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        รายงานข้อมูลจำเพาะและสถานะเครื่องเสมือน (VM Performance Assessment)
                                    </p>
                                </div>
                            </div>
                            {/* Right: classification stamp */}
                            <div className="text-center flex-shrink-0">
                                <div style={{
                                    border: '2px solid #1a3560',
                                    padding: '6px 14px',
                                    display: 'inline-block',
                                }}>
                                    <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: '#1a3560', textTransform: 'uppercase', margin: 0 }}>CONFIDENTIAL</p>
                                    <p style={{ fontSize: 8, color: '#64748b', letterSpacing: '0.1em', margin: 0 }}>Internal Use Only</p>
                                </div>
                            </div>
                        </div>

                        {/* VM identity row */}
                        {vm && (
                            <div className="mt-3 pt-3 border-t border-slate-200"
                                style={{ display: 'flex', flexWrap: 'wrap', gap: '0 32px' }}>
                                <div className="mr-6">
                                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>VM Name</p>
                                    <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>{vm.name}</p>
                                </div>
                                <div className="mr-6">
                                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>UUID</p>
                                    <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569', margin: 0 }}>{vm.vm_uuid}</p>
                                </div>
                                <div className="mr-6">
                                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Report Period</p>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: 0 }}>{timeRangeLabel(timeRange, customStartDate, customEndDate)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Power Status</p>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: vm.power_state === 'on' ? '#16a34a' : '#c0392b', margin: 0 }}>
                                        {vm.power_state === 'on' ? '● Running' : '● Stopped'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════ BODY SECTIONS ═══════════════ */}
                <div className="space-y-5">

                    {/* ──────────── SECTION 1: General Information ──────────── */}
                    <section className="break-inside-avoid">
                        <SecHead num="1" title="ข้อมูลทั่วไป (General Information)" bgColor="#1a3560" />
                        <div className="border border-slate-300 border-t-0">
                            {([
                                ['VM Name', vm?.name, 'Power State',
                                    vm?.power_state === 'on' ? '🟢 Powered On (Running)' : '🔴 Powered Off (Stopped)'],
                                ['Guest OS', vm?.os_name || vm?.os_type || 'Unknown', 'IP Address',
                                    vm?.ip_address || networks[0]?.ip_address || 'ไม่ระบุ'],
                                ['Cluster / Group', vm?.group_name_path || vm?.group_name || vm?.project_name || 'ไม่ระบุ',
                                    'Host', vm?.host_name || 'ไม่ระบุ'],
                                ['Datastore', vm?.storage_name || 'ไม่ระบุ', 'Uptime',
                                    formatUptime(realtime?.uptime || vm?.uptime_seconds, vm?.power_state)],
                                ['CPU Spec', `${vm?.cpu_cores || '-'} Cores${vm?.cpu_sockets ? ` / ${vm.cpu_sockets} Sockets` : ''}${vm?.cpu_total_mhz ? ` · ${formatMhz(vm.cpu_total_mhz)}` : ''}`,
                                    'RAM / Storage', `${formatBytes(vm?.memory_total_mb)} RAM · ${formatBytes(vm?.storage_total_mb)} Storage`],
                            ] as [string, string | null | undefined, string, string][]).map(([k1, v1, k2, v2], i) => (
                                <div key={i} className="grid grid-cols-2 border-b border-slate-200 last:border-b-0"
                                    style={{ backgroundColor: i % 2 === 1 ? '#fafafa' : 'white' }}>
                                    <div className="flex border-r border-slate-200">
                                        <span className="w-36 flex-shrink-0 bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600 border-r border-slate-200">
                                            {k1}
                                        </span>
                                        <span className="px-3 py-1.5 text-xs font-bold text-slate-900 break-all">
                                            {v1 ?? '—'}
                                        </span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-28 flex-shrink-0 bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600 border-r border-slate-200">
                                            {k2}
                                        </span>
                                        <span className="px-3 py-1.5 text-xs font-bold text-slate-900">
                                            {v2 ?? '—'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ──────────── SECTION 2: Resource Specifications ──────────── */}
                    <section className="break-inside-avoid">
                        <SecHead num="2" title="ข้อมูลทรัพยากร (Resource Specifications)" bgColor="#155e75" />
                        <table className="w-full border-collapse text-xs border border-slate-300 border-t-0">
                            <thead>
                                <tr style={{ backgroundColor: '#eef2f9' }}>
                                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-36">
                                        ประเภท (Resource)
                                    </th>
                                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                                        ที่จัดสรรไว้ (Allocated)
                                    </th>
                                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">
                                        การใช้งานปัจจุบัน (Current Usage)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-200 px-3 py-1.5 font-semibold bg-slate-50">vCPU</td>
                                    <td className="border border-slate-200 px-3 py-1.5">
                                        {vm?.cpu_cores || '-'} Cores
                                        {vm?.cpu_sockets ? ` (${vm.cpu_sockets} Sockets)` : ''}
                                        {vm?.cpu_total_mhz ? ` · ${formatMhz(vm.cpu_total_mhz)}` : ''}
                                    </td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold"
                                        style={{ color: riskColor(currentCpu) }}>
                                        {currentCpu.toFixed(1)}%
                                        {vm?.cpu_used_mhz ? ` · ${formatMhz(vm.cpu_used_mhz)} used` : ''}
                                    </td>
                                </tr>
                                <tr style={{ backgroundColor: '#fafafa' }}>
                                    <td className="border border-slate-200 px-3 py-1.5 font-semibold bg-slate-50">Memory (RAM)</td>
                                    <td className="border border-slate-200 px-3 py-1.5">{formatBytes(vm?.memory_total_mb)}</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold"
                                        style={{ color: riskColor(currentMemory) }}>
                                        {formatBytes(vm?.memory_used_mb)} ({currentMemory.toFixed(1)}%)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 px-3 py-1.5 font-semibold bg-slate-50">Storage (Disk)</td>
                                    <td className="border border-slate-200 px-3 py-1.5">
                                        {formatBytes(vm?.storage_total_mb)} (Provisioned)
                                    </td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold"
                                        style={{ color: riskColor(currentStorage, 85, 70) }}>
                                        {formatBytes(vm?.storage_used_mb)} ({currentStorage.toFixed(1)}%)
                                        {storageGrowth.perDay > 0 ? ` · +${formatBytes(storageGrowth.perDay)}/วัน` : ''}
                                    </td>
                                </tr>
                                {networks.length > 0 && (
                                    <tr style={{ backgroundColor: '#fafafa' }}>
                                        <td className="border border-slate-200 px-3 py-1.5 font-semibold bg-slate-50">Network (NIC)</td>
                                        <td className="border border-slate-200 px-3 py-1.5">
                                            {networks.length} Interface{networks.length > 1 ? 's' : ''}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-1.5">
                                            {networks.slice(0, 4).map(n => n.ip_address).filter(Boolean).join(', ') || 'ไม่ระบุ'}
                                            {networks.length > 4 ? ` + ${networks.length - 4} more` : ''}
                                        </td>
                                    </tr>
                                )}
                                {disks.length > 0 && (
                                    <tr>
                                        <td className="border border-slate-200 px-3 py-1.5 font-semibold bg-slate-50">Virtual Disk(s)</td>
                                        <td className="border border-slate-200 px-3 py-1.5 col-span-2" colSpan={2}>
                                            {disks.map((d, i) => (
                                                <span key={i} className="mr-4 text-[10px]">
                                                    {d.storage_file?.split('/').pop() ?? `disk-${i + 1}`}: <strong>{formatBytes(d.size_mb)}</strong>
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>

                    {/* ──────────── SECTION 3: Performance Metrics (6 Charts) ──────────── */}
                    <section>
                        <SecHead
                            num="3"
                            title="ประสิทธิภาพการทำงาน (Performance Metrics)"
                            sub={chartData.length > 0
                                ? `${timeRangeLabel(timeRange, customStartDate, customEndDate)} · ${chartData.length} Data Points`
                                : 'ไม่มีข้อมูลในช่วงเวลาที่เลือก'}
                            bgColor="#4c1d95"
                        />
                        {chartData.length > 0 ? (
                            <div className="flex flex-col gap-4 mt-2">
                                <ChartCard
                                    title="📊 1. CPU Usage (%)"
                                    unit="%"
                                    dataKey="cpu"
                                    data={chartData}
                                    color="#3b82f6"
                                    label="CPU %"
                                    kind="area"
                                    domainMax={100}
                                />
                                <ChartCard
                                    title="📊 2. Memory Usage (%)"
                                    unit="%"
                                    dataKey="memory"
                                    data={chartData}
                                    color="#8b5cf6"
                                    label="Memory %"
                                    kind="area"
                                    domainMax={100}
                                />
                                <ChartCard
                                    title="📈 3. Disk IOPS (Read / Write)"
                                    unit=" IOPS"
                                    dataKey="diskRead"
                                    dataKey2="diskWrite"
                                    data={chartData}
                                    color="#0ea5e9"
                                    color2="#ec4899"
                                    label="Read"
                                    label2="Write"
                                    kind="line"
                                />
                                <ChartCard
                                    title="📈 4. Storage Trend (GB Used)"
                                    unit=" GB"
                                    dataKey="storageUsedGB"
                                    data={chartData}
                                    color="#6366f1"
                                    label="Used GB"
                                    kind="area"
                                />
                                <ChartCard
                                    title="🌐 5. Network Traffic (MB/s)"
                                    unit=" MB/s"
                                    dataKey="networkIn"
                                    dataKey2="networkOut"
                                    data={chartData}
                                    color="#10b981"
                                    color2="#f59e0b"
                                    label="RX (In)"
                                    label2="TX (Out)"
                                    kind="line"
                                />
                                <ChartCard
                                    title="⏱️ 6. Storage Usage (%)"
                                    unit="%"
                                    dataKey="storagePercent"
                                    data={chartData}
                                    color="#14b8a6"
                                    label="Storage %"
                                    kind="area"
                                    domainMax={100}
                                />
                            </div>
                        ) : (
                            <div className="mt-2 border border-slate-200 rounded p-6 text-center text-slate-400 text-xs">
                                ไม่มีข้อมูล Metrics — กรุณาเลือกช่วงเวลาก่อนพิมพ์รายงาน
                            </div>
                        )}
                    </section>

                    {/* ──────────── SECTION 4: Health & Backup ──────────── */}
                    <section className="break-inside-avoid">
                        <SecHead num="4" title="สถานะภาพรวม (Health & Backup Status)" bgColor="#78350f" />
                        <div className="border border-slate-300 border-t-0 divide-y divide-slate-200">
                            {/* Backup row */}
                            <div className="flex items-start gap-3 px-4 py-3">
                                <span className="text-lg leading-none flex-shrink-0 mt-0.5">
                                    {vm?.protection_type ? '🛡️' : '❌'}
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 mb-0.5">สถานะการสำรองข้อมูล (Backup Protection)</p>
                                    {vm?.protection_type ? (
                                        <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                                            ได้รับการปกป้องแล้ว — Policy: {vm.protection_name || vm.protection_type}
                                            {vm.backup_file_count ? ` · ${vm.backup_file_count} ชุดสำรอง` : ''}
                                        </p>
                                    ) : (
                                        <p className="text-xs font-semibold" style={{ color: '#c0392b' }}>
                                            ไม่มีการสำรองข้อมูล (Unprotected) — ความเสี่ยงสูง ควรกำหนด Backup Policy โดยทันที
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Alarms row */}
                            <div className="flex items-start gap-3 px-4 py-3">
                                <span className="text-lg leading-none flex-shrink-0 mt-0.5">
                                    {totalAlarms === 0 ? '✅' : '⚠️'}
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 mb-0.5">
                                        การแจ้งเตือน (Alarms &amp; Alerts) — {totalAlarms} รายการ
                                    </p>
                                    {totalAlarms === 0 ? (
                                        <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                                            ทำงานปกติ — ไม่พบการแจ้งเตือน
                                        </p>
                                    ) : (
                                        <>
                                            <p className="text-xs font-semibold" style={{ color: '#d97706' }}>
                                                พบ {totalAlarms} รายการ · รายการล่าสุด: {firstAlarm?.title || firstAlarm?.description || 'ดูรายละเอียดในระบบ'}
                                            </p>
                                            {totalAlarms > 1 && (
                                                <p className="text-[10px] text-slate-500 italic mt-0.5">
                                                    และอีก {totalAlarms - 1} รายการ — ดูรายละเอียดเพิ่มเติมในระบบ VMStat
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="px-4 py-3">
                                <p className="text-xs font-bold text-slate-800 mb-1.5">ข้อเสนอแนะ (Recommendations)</p>
                                <div className="space-y-1">
                                    {recs.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs"
                                            style={{ borderLeft: `3px solid ${r.color}`, paddingLeft: 8 }}>
                                            <span className="font-bold flex-shrink-0" style={{ color: r.color }}>{r.icon}</span>
                                            <span className="text-slate-700">{r.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* ═══════════════ SIGNATURES ═══════════════ */}
                <div className="mt-10 break-inside-avoid">
                    {/* Signature section header */}
                    <div style={{ borderTop: '2px solid #1a3560', marginBottom: 16, paddingTop: 10 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#1a3560', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
                            ลายมือชื่อผู้รับรอง / Authorization Signatures
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        {([
                            { th: 'ผู้จัดทำ', en: 'Prepared By' },
                            { th: 'ผู้ตรวจสอบ', en: 'Reviewed By' },
                            { th: 'ผู้อนุมัติ', en: 'Approved By' },
                        ] as const).map(({ th, en }) => (
                            <div key={en} style={{ border: '1px solid #cbd5e1', padding: '12px 14px', borderRadius: 2 }}>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#1a3560', margin: '0 0 2px' }}>{en}</p>
                                <p style={{ fontSize: 8, color: '#64748b', margin: '0 0 24px' }}>{th}</p>
                                {/* Signature line */}
                                <div style={{ borderBottom: '1.5px solid #64748b', marginBottom: 6, marginTop: 20 }} />
                                <p style={{ fontSize: 8, color: '#94a3b8', margin: '0 0 4px' }}>ชื่อ / Name: ___________________________</p>
                                <p style={{ fontSize: 8, color: '#94a3b8', margin: '0 0 4px' }}>ตำแหน่ง / Position: ___________________</p>
                                <p style={{ fontSize: 8, color: '#94a3b8', margin: 0 }}>วันที่ / Date: _______ / _______ / _______</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══════════════ FOOTER ═══════════════ */}
                <div className="mt-6 break-inside-avoid">
                    {/* Print info row */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 2,
                        padding: '6px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                    }}>
                        <div style={{ display: 'flex', gap: 24 }}>
                            <span style={{ fontSize: 9, color: '#64748b' }}>
                                <span style={{ fontWeight: 700, color: '#334155' }}>วันที่พิมพ์ / Printed:</span>{' '}
                                {printDate} · {printTime}
                            </span>
                            <span style={{ fontSize: 9, color: '#64748b' }}>
                                <span style={{ fontWeight: 700, color: '#334155' }}>ผู้พิมพ์ / Printed By:</span>{' '}
                                {user?.username || 'Administrator'}
                            </span>
                            <span style={{ fontSize: 9, color: '#64748b' }}>
                                <span style={{ fontWeight: 700, color: '#334155' }}>VM:</span>{' '}
                                {vm?.name || '—'}
                            </span>
                        </div>
                        <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>Page 1 / 1</span>
                    </div>
                    {/* Confidential strip */}
                    <div style={{
                        borderTop: '1px solid #cbd5e1',
                        paddingTop: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <p style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                            CONFIDENTIAL DOCUMENT — FOR INTERNAL USE ONLY · ห้ามเผยแพร่ต่อโดยไม่ได้รับอนุญาต
                        </p>
                        <p style={{ fontSize: 8, color: '#94a3b8', margin: 0 }}>
                            Sangfor SCP VMStat © 2026
                        </p>
                    </div>
                </div>

            </div>
        </>
    );
}
