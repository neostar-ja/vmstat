/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Box,
    alpha,
    useTheme,
    Skeleton,
    LinearProgress,
    Tooltip,
    Badge,
    Chip,
} from '@mui/material';
import {
    Computer as VmIcon,
    PlayArrow as RunningIcon,
    Stop as StopIcon,
    Memory as MemoryIcon,
    Speed as CpuIcon,
    Warning as WarningIcon,
    Dns as HostIcon,
    Folder as GroupIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckIcon,
    CloudDone as CloudIcon,
    Security as SecurityIcon,
    Schedule as ScheduleIcon,
    Storage as StorageIcon,
    LocationOn as LocationIcon,
    Timer as TimerIcon,
    FiberManualRecord as DotIcon,
    Bolt as BoltIcon,
    ViewModule as GridViewIcon,
    Circle as CircleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import AlarmsCard from '../components/AlarmsCard';
import { useState, useEffect, useRef } from 'react';
import {
    PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
    RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
    sky: { from: '#0ea5e9', to: '#38bdf8', text: '#0284c7', ring: '#bae6fd', soft: 'rgba(14,165,233,0.1)' },
    emerald: { from: '#10b981', to: '#34d399', text: '#059669', ring: '#6ee7b7', soft: 'rgba(16,185,129,0.1)' },
    amber: { from: '#f59e0b', to: '#fbbf24', text: '#d97706', ring: '#fde68a', soft: 'rgba(245,158,11,0.1)' },
    violet: { from: '#8b5cf6', to: '#a78bfa', text: '#7c3aed', ring: '#ddd6fe', soft: 'rgba(139,92,246,0.1)' },
    red: { from: '#ef4444', to: '#f87171', text: '#dc2626', ring: '#fca5a5', soft: 'rgba(239,68,68,0.1)' },
    cyan: { from: '#06b6d4', to: '#22d3ee', text: '#0891b2', ring: '#a5f3fc', soft: 'rgba(6,182,212,0.1)' },
    indigo: { from: '#6366f1', to: '#818cf8', text: '#4f46e5', ring: '#c7d2fe', soft: 'rgba(99,102,241,0.1)' },
    slate: { from: '#64748b', to: '#94a3b8', text: '#475569', ring: '#cbd5e1', soft: 'rgba(100,116,139,0.1)' },
    orange: { from: '#f97316', to: '#fb923c', text: '#ea580c', ring: '#fed7aa', soft: 'rgba(249,115,22,0.1)' },
};

const grad = (c: { from: string; to: string }) => `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`;

// ─── Animated Count-Up ────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
    const [count, setCount] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const diff = target - prev.current;
        if (diff === 0) return;
        const start = prev.current;
        const startTime = performance.now();
        const raf = (now: number) => {
            const elapsed = now - startTime;
            const p = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.round(start + diff * ease));
            if (p < 1) requestAnimationFrame(raf);
            else prev.current = target;
        };
        requestAnimationFrame(raf);
    }, [target, duration]);
    return count;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, suffix = '', icon, color, sub, isLoading }: {
    title: string; value: number; suffix?: string; icon: React.ReactNode;
    color: typeof C.sky; sub?: string; isLoading?: boolean;
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const displayed = useCountUp(value);

    return (
        <div
            className="relative overflow-hidden rounded-3xl p-5 h-full transition-all duration-300 hover:-translate-y-1 cursor-default select-none"
            style={{
                background: isDark
                    ? `linear-gradient(145deg, ${alpha(color.from, 0.18)} 0%, ${alpha('#0f172a', 0.96)} 100%)`
                    : `linear-gradient(145deg, ${alpha(color.from, 0.09)} 0%, #ffffff 100%)`,
                border: `1.5px solid ${isDark ? alpha(color.from, 0.3) : alpha(color.from, 0.22)}`,
                boxShadow: `0 8px 32px -8px ${alpha(color.from, 0.25)}`,
            }}
        >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-25 blur-2xl pointer-events-none"
                style={{ background: grad(color) }} />
            <div className="relative z-10 flex flex-col gap-3 h-full">
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ background: grad(color) }}>
                        {icon}
                    </div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color.from }} />
                </div>
                {isLoading ? (
                    <Skeleton width="55%" height={44} sx={{ borderRadius: 2 }} />
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight"
                            style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                            {displayed.toLocaleString()}
                        </span>
                        {suffix && <span className="text-lg font-bold" style={{ color: color.text }}>{suffix}</span>}
                    </div>
                )}
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? alpha(color.ring, 0.9) : color.text }}>{title}</p>
                    {sub && <p className="text-xs font-medium text-slate-400 mt-0.5">{sub}</p>}
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl" style={{ background: grad(color) }} />
        </div>
    );
}

// ─── Radial Gauge Card ────────────────────────────────────────────────────────
function GaugeCard({ title, subtitle, value, color, icon, isLoading }: {
    title: string; subtitle?: string; value: number;
    color: typeof C.sky; icon: React.ReactNode; isLoading?: boolean;
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isCrit = value >= 90;
    const isWarn = value >= 75 && value < 90;
    const effectiveColor = isCrit ? C.red : isWarn ? C.amber : color;
    const gaugeData = [{ value: Math.min(value, 100), fill: effectiveColor.from }];

    return (
        <div className="relative overflow-hidden rounded-3xl p-5 flex flex-col h-full transition-all duration-300 hover:-translate-y-1"
            style={{
                background: isDark
                    ? `linear-gradient(145deg, ${alpha(effectiveColor.from, 0.15)} 0%, ${alpha('#0f172a', 0.96)} 100%)`
                    : `linear-gradient(145deg, ${alpha(effectiveColor.from, 0.07)} 0%, #ffffff 100%)`,
                border: `1.5px solid ${isDark ? alpha(effectiveColor.from, 0.28) : alpha(effectiveColor.from, 0.18)}`,
                boxShadow: `0 8px 32px -8px ${alpha(effectiveColor.from, 0.2)}`,
            }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ background: grad(effectiveColor) }}>{icon}</div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>{title}</p>
                    {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
                </div>
                {isCrit && <Chip size="small" label="วิกฤต" color="error" sx={{ ml: 'auto', height: 22, fontSize: '0.65rem', fontWeight: 800 }} />}
                {isWarn && <Chip size="small" label="เตือน" color="warning" sx={{ ml: 'auto', height: 22, fontSize: '0.65rem', fontWeight: 800 }} />}
            </div>
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Skeleton variant="circular" width={140} height={140} />
                </div>
            ) : (
                <div className="flex-1 relative flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={160}>
                        <RadialBarChart innerRadius="65%" outerRadius="100%"
                            data={gaugeData} startAngle={210} endAngle={-30} barSize={14}>
                            <RadialBar
                                background={{ fill: isDark ? alpha('#1e293b', 0.8) : alpha('#e2e8f0', 0.6) }}
                                dataKey="value" cornerRadius={8}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black" style={{ color: effectiveColor.from }}>{value.toFixed(1)}</span>
                        <span className="text-sm font-bold text-slate-400">%</span>
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl" style={{ background: grad(effectiveColor) }} />
        </div>
    );
}

// ─── VM Status Donut ──────────────────────────────────────────────────────────
function VmStatusDonut({ running, stopped, isLoading }: { running: number; stopped: number; isLoading: boolean }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const total = running + stopped;
    const data = [
        { name: 'Running', value: running, color: '#10b981' },
        { name: 'Stopped', value: stopped, color: isDark ? '#334155' : '#e2e8f0' },
    ];

    return (
        <div className="rounded-3xl overflow-hidden h-full flex flex-col"
            style={{
                background: isDark ? alpha('#0f172a', 0.96) : '#ffffff',
                border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`,
                boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                    <VmIcon sx={{ fontSize: 20 }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>สถานะ VM</p>
                    <p className="text-xs text-slate-400 font-medium">VM Status</p>
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {isLoading ? <Skeleton variant="circular" width={140} height={140} /> : total === 0 ? (
                    <div className="text-slate-400 text-sm">ไม่พบข้อมูล</div>
                ) : (
                    <>
                        <div className="relative">
                            <ResponsiveContainer width={150} height={150}>
                                <PieChart>
                                    <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={68}
                                        paddingAngle={4} dataKey="value" strokeWidth={0}>
                                        {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <ReTooltip contentStyle={{
                                        background: isDark ? '#1e293b' : '#fff',
                                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                        borderRadius: 12, fontSize: 12, fontWeight: 700,
                                    }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{total.toLocaleString()}</span>
                                <span className="text-xs text-slate-400 font-semibold">Total</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-3 w-full px-2">
                            {[{ label: 'กำลังทำงาน', value: running, color: '#10b981' }, { label: 'หยุดทำงาน', value: stopped, color: '#94a3b8' }].map((it, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: it.color }} />
                                        <span className="text-xs font-semibold text-slate-400">{it.label}</span>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color: it.color }}>{it.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── AZ Distribution Chart ────────────────────────────────────────────────────
function AZDistributionChart({ azs, isLoading }: { azs: any[]; isLoading: boolean }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const azColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444'];
    const data = azs.map((az, i) => ({
        name: az.name.length > 12 ? az.name.slice(0, 11) + '…' : az.name,
        fullName: az.name,
        vms: az.vm_count,
        fill: azColors[i % azColors.length],
    }));

    return (
        <div className="rounded-3xl overflow-hidden h-full flex flex-col"
            style={{
                background: isDark ? alpha('#0f172a', 0.96) : '#ffffff',
                border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`,
                boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                    <LocationIcon sx={{ fontSize: 20 }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Availability Zones</p>
                    <p className="text-xs text-slate-400 font-medium">การกระจาย VM</p>
                </div>
            </div>
            <div className="flex-1 p-3 flex items-center">
                {isLoading ? (
                    <div className="space-y-3 w-full">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} height={48} sx={{ borderRadius: 2 }} />)}
                    </div>
                ) : data.length === 0 ? (
                    <div className="w-full flex items-center justify-center text-slate-400 text-sm">ไม่พบข้อมูล AZ</div>
                ) : (
                    <ResponsiveContainer width="100%" height={130}>
                        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                            <CartesianGrid horizontal={false} stroke={isDark ? alpha('#334155', 0.4) : alpha('#e2e8f0', 0.8)} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={72} />
                            <ReTooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12, fontWeight: 700 }}
                                formatter={(v: any, _: any, p: any) => [v, p.payload.fullName]} />
                            <Bar dataKey="vms" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

// ─── Top VMs Table ────────────────────────────────────────────────────────────
function TopVMsTable({ title, subtitle, data, type, isLoading }: {
    title: string; subtitle: string; data: any[]; type: 'cpu' | 'memory'; isLoading: boolean;
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const color = type === 'cpu' ? C.sky : C.emerald;
    const getBarColor = (v: number) => v >= 90 ? '#ef4444' : v >= 75 ? '#f59e0b' : color.from;

    return (
        <div className="rounded-3xl overflow-hidden flex flex-col h-full"
            style={{
                background: isDark ? alpha('#0f172a', 0.96) : '#ffffff',
                border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`,
                boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: grad(color) }}>
                    {type === 'cpu' ? <CpuIcon sx={{ fontSize: 20 }} /> : <MemoryIcon sx={{ fontSize: 20 }} />}
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{title}</p>
                    <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} height={52} sx={{ borderRadius: 2 }} />)}
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm p-4">ไม่พบข้อมูล</div>
                ) : (
                    <div className="p-2">
                        {data.slice(0, 7).map((vm: any, i: number) => {
                            const usage = vm.current_usage || 0;
                            const barColor = getBarColor(usage);
                            const rankBg = ['#f59e0b', '#94a3b8', '#92400e'];
                            return (
                                <div key={vm.vm_uuid}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                                        style={i < 3
                                            ? { backgroundColor: rankBg[i], color: '#fff' }
                                            : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b' }}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Tooltip title={vm.vm_name}>
                                            <p className="text-sm font-bold truncate" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>{vm.vm_name}</p>
                                        </Tooltip>
                                        <p className="text-xs text-slate-400 truncate font-medium">{vm.group_name || '—'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-black" style={{ color: barColor }}>{usage.toFixed(1)}%</span>
                                        <div className="w-20 mt-1 h-1.5 rounded-full overflow-hidden"
                                            style={{ backgroundColor: isDark ? alpha('#334155', 0.8) : '#e2e8f0' }}>
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${Math.min(usage, 100)}%`, backgroundColor: barColor }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── VM Groups Card ────────────────────────────────────────────────────────────
function VMGroupsCard({ data, isLoading }: { data: any[]; isLoading: boolean }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const palette = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#f97316', '#ec4899'];

    return (
        <div className="rounded-3xl overflow-hidden flex flex-col h-full"
            style={{
                background: isDark ? alpha('#0f172a', 0.96) : '#ffffff',
                border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`,
                boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
                    <GroupIcon sx={{ fontSize: 20 }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>VM Groups</p>
                    <p className="text-xs text-slate-400 font-medium">กลุ่ม VM ทั้งหมด</p>
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} height={48} sx={{ borderRadius: 2 }} />)}
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm p-4">ไม่พบกลุ่ม VM</div>
                ) : (
                    <div className="p-2">
                        {data.slice(0, 8).map((group: any, i: number) => {
                            const col = palette[i % palette.length];
                            const runPct = group.total_vms > 0 ? (group.running_vms / group.total_vms) * 100 : 0;
                            return (
                                <div key={group.group_id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                                        style={{ background: `linear-gradient(135deg, ${col}, ${col}99)` }}>
                                        {group.group_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Tooltip title={group.group_name}>
                                            <p className="text-sm font-bold truncate" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>{group.group_name}</p>
                                        </Tooltip>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="flex-1 h-1 rounded-full overflow-hidden"
                                                style={{ backgroundColor: isDark ? alpha('#334155', 0.8) : '#e2e8f0' }}>
                                                <div className="h-full rounded-full" style={{ width: `${runPct}%`, backgroundColor: '#10b981' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-xs font-bold text-emerald-500">{group.running_vms}▶</span>
                                        <p className="text-xs text-slate-400">{group.total_vms} VMs</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Host Health Grid ─────────────────────────────────────────────────────────
function HostHealthGrid({ hosts, isLoading }: { hosts: any[]; isLoading: boolean }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const metricColor = (v: number) => v >= 90 ? '#ef4444' : v >= 75 ? '#f59e0b' : '#10b981';

    return (
        <div className="rounded-3xl overflow-hidden flex flex-col h-full"
            style={{
                background: isDark ? alpha('#0f172a', 0.96) : '#ffffff',
                border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`,
                boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                    <HostIcon sx={{ fontSize: 20 }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Host Health Matrix</p>
                    <p className="text-xs text-slate-400 font-medium">{hosts?.length || 0} Physical Hosts</p>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} height={72} sx={{ borderRadius: 2 }} />)}
                    </div>
                ) : hosts.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">ไม่พบข้อมูล Host</div>
                ) : (
                    <div className="space-y-2">
                        {hosts.slice(0, 8).map((host: any) => {
                            const cpuCol = metricColor(host.cpu_usage_pct || 0);
                            const memCol = metricColor(host.memory_usage_pct || 0);
                            return (
                                <div key={host.host_id}
                                    className="px-3 py-2.5 rounded-2xl transition-colors"
                                    style={{
                                        background: isDark ? alpha('#1e293b', 0.5) : alpha('#f8fafc', 0.8),
                                        border: `1px solid ${isDark ? alpha('#334155', 0.4) : alpha('#e2e8f0', 0.6)}`,
                                    }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                                            <Tooltip title={host.host_name}>
                                                <span className="text-sm font-bold truncate" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>{host.host_name}</span>
                                            </Tooltip>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg ml-2 flex-shrink-0"
                                            style={{ background: alpha('#3b82f6', 0.12), color: '#3b82f6', border: `1px solid ${alpha('#3b82f6', 0.2)}` }}>
                                            {host.running_vms}/{host.vm_count} VMs
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[{ label: 'CPU', value: host.cpu_usage_pct || 0, color: cpuCol }, { label: 'Memory', value: host.memory_usage_pct || 0, color: memCol }].map(m => (
                                            <div key={m.label}>
                                                <div className="flex justify-between mb-0.5">
                                                    <span className="text-xs text-slate-400 font-semibold">{m.label}</span>
                                                    <span className="text-xs font-bold" style={{ color: m.color }}>{m.value.toFixed(0)}%</span>
                                                </div>
                                                <LinearProgress variant="determinate" value={Math.min(m.value, 100)}
                                                    sx={{
                                                        height: 4, borderRadius: 2,
                                                        bgcolor: isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8),
                                                        '& .MuiLinearProgress-bar': { borderRadius: 2, backgroundColor: m.color }
                                                    }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Storage Gauge Card ───────────────────────────────────────────────────────
interface StorageSummary {
    total_count: number; total_mb: number; used_mb: number; free_mb: number; usage_percent: number;
}

function StorageGaugeCard({ storageSummary, isLoading }: { storageSummary: StorageSummary | null; isLoading: boolean }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const pct = storageSummary?.usage_percent ?? 0;
    const totalTB = ((storageSummary?.total_mb ?? 0) / 1048576).toFixed(1);
    const usedTB = ((storageSummary?.used_mb ?? 0) / 1048576).toFixed(1);
    const freeTB = ((storageSummary?.free_mb ?? 0) / 1048576).toFixed(1);
    const color = pct >= 90 ? C.red : pct >= 75 ? C.amber : C.violet;
    const gaugeData = [{ value: Math.min(pct, 100), fill: color.from }];

    return (
        <div className="relative overflow-hidden rounded-3xl p-5 flex flex-col h-full transition-all duration-300 hover:-translate-y-1"
            style={{
                background: isDark
                    ? `linear-gradient(145deg, ${alpha(color.from, 0.15)} 0%, ${alpha('#0f172a', 0.96)} 100%)`
                    : `linear-gradient(145deg, ${alpha(color.from, 0.07)} 0%, #ffffff 100%)`,
                border: `1.5px solid ${isDark ? alpha(color.from, 0.28) : alpha(color.from, 0.18)}`,
                boxShadow: `0 8px 32px -8px ${alpha(color.from, 0.2)}`,
            }}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ background: grad(color) }}>
                    <StorageIcon />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>Storage</p>
                    <p className="text-xs text-slate-400 font-medium">{storageSummary ? `${storageSummary.total_count} Datastores` : 'พื้นที่จัดเก็บ'}</p>
                </div>
                {pct >= 90 && <Chip size="small" label="วิกฤต" color="error" sx={{ ml: 'auto', height: 22, fontSize: '0.65rem', fontWeight: 800 }} />}
                {pct >= 75 && pct < 90 && <Chip size="small" label="เตือน" color="warning" sx={{ ml: 'auto', height: 22, fontSize: '0.65rem', fontWeight: 800 }} />}
            </div>
            {isLoading && !storageSummary ? (
                <div className="flex-1 flex items-center justify-center"><Skeleton variant="circular" width={140} height={140} /></div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="relative">
                        <ResponsiveContainer width={150} height={150}>
                            <RadialBarChart innerRadius="65%" outerRadius="100%"
                                data={gaugeData} startAngle={210} endAngle={-30} barSize={14}>
                                <RadialBar background={{ fill: isDark ? alpha('#1e293b', 0.8) : alpha('#e2e8f0', 0.6) }}
                                    dataKey="value" cornerRadius={8} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black" style={{ color: color.from }}>{pct.toFixed(1)}</span>
                            <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full mt-2">
                        {[{ label: 'รวม', v: `${totalTB} TB`, c: isDark ? '#e2e8f0' : '#1e293b' },
                        { label: 'ใช้', v: `${usedTB} TB`, c: color.from },
                        { label: 'ว่าง', v: `${freeTB} TB`, c: '#10b981' }].map((s, i) => (
                            <div key={i} className="text-center py-2 px-1 rounded-xl"
                                style={{ background: isDark ? alpha('#1e293b', 0.6) : alpha('#f8fafc', 0.9), border: `1px solid ${isDark ? alpha('#334155', 0.4) : alpha('#e2e8f0', 0.8)}` }}>
                                <p className="text-xs text-slate-400 font-semibold mb-0.5">{s.label}</p>
                                <p className="text-xs font-black" style={{ color: s.c }}>{s.v}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl" style={{ background: grad(color) }} />
        </div>
    );
}

// ─── System Status Card ───────────────────────────────────────────────────────
function SystemStatusCard({ isLoading, unprotectedCount, summary }: { isLoading: boolean; unprotectedCount: number; summary: any }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const items = [
        { icon: <CloudIcon sx={{ fontSize: 20 }} />, label: 'Backup Protection', value: unprotectedCount > 0 ? `${unprotectedCount} VMs ไม่ได้สำรอง` : 'ป้องกันครบทุก VM', ok: unprotectedCount === 0 },
        { icon: <SecurityIcon sx={{ fontSize: 20 }} />, label: 'Security Status', value: 'ระบบปกติ', ok: true },
        { icon: <ScheduleIcon sx={{ fontSize: 20 }} />, label: 'Data Sync', value: 'ข้อมูลล่าสุด', ok: true },
        { icon: <BoltIcon sx={{ fontSize: 20 }} />, label: 'Performance', value: summary ? `CPU เฉลี่ย ${(summary.avg_cpu_usage || 0).toFixed(1)}%` : '—', ok: (summary?.avg_cpu_usage || 0) < 80 },
    ];

    return (
        <div className="rounded-3xl overflow-hidden flex flex-col h-full"
            style={{ background: isDark ? alpha('#0f172a', 0.96) : '#ffffff', border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`, boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)' }}>
                    <CheckIcon sx={{ fontSize: 20 }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>สถานะระบบ</p>
                    <p className="text-xs text-slate-400 font-medium">System Health</p>
                </div>
            </div>
            <div className="flex-1 p-4 space-y-3">
                {isLoading ? (
                    <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} height={56} sx={{ borderRadius: 2 }} />)}</div>
                ) : items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: isDark ? alpha(item.ok ? '#10b981' : '#ef4444', 0.08) : alpha(item.ok ? '#10b981' : '#ef4444', 0.06), border: `1px solid ${alpha(item.ok ? '#10b981' : '#ef4444', 0.2)}` }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: alpha(item.ok ? '#10b981' : '#ef4444', 0.15), color: item.ok ? '#10b981' : '#ef4444' }}>
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 font-semibold">{item.label}</p>
                            <p className="text-sm font-bold truncate" style={{ color: item.ok ? '#10b981' : '#ef4444' }}>{item.value}</p>
                        </div>
                        {item.ok ? <CheckIcon sx={{ fontSize: 18, color: '#10b981' }} /> : <WarningIcon sx={{ fontSize: 18, color: '#ef4444' }} />}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Resource Summary Card ────────────────────────────────────────────────────
function ResourceSummaryCard({ summary, storageSummary, isLoading }: { summary: any; storageSummary: StorageSummary | null; isLoading: boolean }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const rows = [
        { label: 'CPU Cores ทั้งหมด', value: (summary?.total_cpu_cores || 0).toLocaleString(), icon: <CpuIcon sx={{ fontSize: 18 }} />, color: C.sky },
        { label: 'Memory รวม', value: `${(summary?.total_memory_gb || 0).toFixed(0)} GB`, icon: <MemoryIcon sx={{ fontSize: 18 }} />, color: C.emerald },
        { label: 'Storage รวม', value: `${((storageSummary?.total_mb || 0) / 1048576).toFixed(1)} TB`, icon: <StorageIcon sx={{ fontSize: 18 }} />, color: C.violet },
        { label: 'Resource Groups', value: (summary?.total_groups || 0).toLocaleString(), icon: <GroupIcon sx={{ fontSize: 18 }} />, color: C.amber },
        { label: 'Datastores', value: String(storageSummary?.total_count || 0), icon: <GridViewIcon sx={{ fontSize: 18 }} />, color: C.cyan },
    ];

    return (
        <div className="rounded-3xl overflow-hidden flex flex-col h-full"
            style={{ background: isDark ? alpha('#0f172a', 0.96) : '#ffffff', border: `1.5px solid ${isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8)}`, boxShadow: '0 4px 24px -6px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8) }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <GridViewIcon sx={{ fontSize: 20 }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Resource Summary</p>
                    <p className="text-xs text-slate-400 font-medium">ทรัพยากรระบบทั้งหมด</p>
                </div>
            </div>
            <div className="flex-1 p-4 space-y-2">
                {isLoading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} height={48} sx={{ borderRadius: 2 }} />)}</div>
                ) : rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        style={{ border: `1px solid ${isDark ? alpha('#334155', 0.4) : alpha('#e2e8f0', 0.6)}`, background: isDark ? alpha('#1e293b', 0.4) : alpha('#f8fafc', 0.8) }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: alpha(row.color.from, 0.15), color: row.color.from }}>
                            {row.icon}
                        </div>
                        <span className="flex-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{row.label}</span>
                        <span className="text-base font-black" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Live Badge ───────────────────────────────────────────────────────────────
function LiveBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.25)}`, color }}>
            <DotIcon sx={{ fontSize: 8 }} className="animate-pulse" />
            {label}: <span className="font-black ml-0.5">{value}</span>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [refreshKey, setRefreshKey] = useState(0);

    const { data: dashboardData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['dashboard-consolidated', refreshKey],
        queryFn: () => dashboardApi.getConsolidatedData({ top_vms_limit: 10, alarms_limit: 20 }),
        refetchInterval: 60000,
        staleTime: 55000,
        gcTime: 120000,
        placeholderData: (prev) => prev,
    });

    const { data: storageData, isLoading: storageLoading } = useQuery({
        queryKey: ['dashboard-storage-summary', refreshKey],
        queryFn: () => dashboardApi.getStorageSummary(),
        refetchInterval: 300000,
        staleTime: 290000,
        gcTime: 600000,
        placeholderData: (prev) => prev,
    });

    const storageSummary: StorageSummary | null = storageData?.data?.summary ?? null;
    const handleRefresh = () => { setRefreshKey(k => k + 1); refetch(); };

    const d = dashboardData?.data;
    const summary = d?.summary;
    const topCpu = d?.top_cpu_vms || [];
    const topMem = d?.top_memory_vms || [];
    const alarms = d?.active_alarms || [];
    const groups = d?.groups || [];
    const hosts = d?.hosts || [];
    const azs = d?.availability_zones || [];
    const queryMs = d?.query_time_ms;
    const freshness = d?.data_freshness;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: isDark
                    ? 'linear-gradient(160deg, #020617 0%, #0f172a 55%, #1e1b4b 100%)'
                    : 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 55%, #f5f3ff 100%)',
                p: { xs: 2, sm: 2.5, md: 3 },
            }}
        >
            <div className="max-w-screen-2xl mx-auto space-y-5">

                {/* ── HEADER ──────────────────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }}>
                                <BoltIcon />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight bg-clip-text text-transparent"
                                style={{ backgroundImage: isDark ? 'linear-gradient(90deg, #38bdf8, #a78bfa, #34d399)' : 'linear-gradient(90deg, #0ea5e9, #8b5cf6, #10b981)' }}>
                                Executive Dashboard
                            </h1>
                        </div>
                        <p className="text-sm font-medium text-slate-400 ml-1">ภาพรวม Virtual Machine Infrastructure · อัปเดตทุก 60 วินาที</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {queryMs && <LiveBadge label="โหลด" value={`${queryMs.toFixed(0)}ms`} color="#10b981" />}
                            {freshness && <LiveBadge label="อัปเดต" value={new Date(freshness).toLocaleTimeString('th-TH')} color="#0ea5e9" />}
                            {isFetching && !isLoading && <LiveBadge label="กำลังอัปเดต" value="..." color="#f59e0b" />}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge badgeContent={alarms.length > 0 ? alarms.length : undefined} color="error" max={99}>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                                style={{ background: isDark ? alpha('#1e293b', 0.8) : '#ffffff', border: `1.5px solid ${isDark ? alpha('#334155', 0.7) : alpha('#e2e8f0', 0.9)}`, color: isDark ? '#94a3b8' : '#64748b', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <WarningIcon sx={{ fontSize: 18, color: alarms.length > 0 ? '#ef4444' : undefined }} /> Alarms
                            </button>
                        </Badge>
                        <button onClick={handleRefresh} disabled={isLoading || isFetching}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-60 text-white"
                            style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}>
                            <RefreshIcon sx={{ fontSize: 18, animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
                            {isFetching ? 'กำลังโหลด…' : 'รีเฟรช'}
                        </button>
                    </div>
                </div>

                {/* ── ROW 1: KPI CARDS (6 cards) ───────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KpiCard title="VM ทั้งหมด" value={summary?.total_vms || 0} icon={<VmIcon />} color={C.sky}
                        sub={`${summary?.running_vms || 0} Running`} isLoading={isLoading} />
                    <KpiCard title="กำลังทำงาน" value={summary?.running_vms || 0} icon={<RunningIcon />} color={C.emerald}
                        sub={`จาก ${summary?.total_vms || 0} VM`} isLoading={isLoading} />
                    <KpiCard title="หยุดทำงาน" value={summary?.stopped_vms || 0} icon={<StopIcon />} color={C.slate}
                        sub="Stopped VMs" isLoading={isLoading} />
                    <KpiCard title="Physical Hosts" value={summary?.total_hosts || 0} icon={<HostIcon />} color={C.violet}
                        sub={`${summary?.total_groups || 0} Groups`} isLoading={isLoading} />
                    <KpiCard title="CPU Cores" value={summary?.total_cpu_cores || 0} icon={<CpuIcon />} color={C.indigo}
                        sub={`Avg ${(summary?.avg_cpu_usage || 0).toFixed(1)}% ใช้งาน`} isLoading={isLoading} />
                    <KpiCard title="Active Alarms" value={summary?.active_alarms_count || 0} icon={<WarningIcon />}
                        color={(summary?.active_alarms_count || 0) > 0 ? C.red : C.emerald}
                        sub={(summary?.active_alarms_count || 0) > 0 ? 'ต้องดำเนินการ' : 'ระบบปกติ'} isLoading={isLoading} />
                </div>

                {/* ── ROW 2: GAUGES + DONUT + AZ ────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <GaugeCard title="CPU เฉลี่ย" subtitle="Avg CPU Utilization"
                        value={summary?.avg_cpu_usage || 0} color={C.sky} icon={<CpuIcon />} isLoading={isLoading} />
                    <GaugeCard title="Memory เฉลี่ย" subtitle="Avg Memory Utilization"
                        value={summary?.avg_memory_usage || 0} color={C.emerald} icon={<MemoryIcon />} isLoading={isLoading} />
                    <StorageGaugeCard storageSummary={storageSummary} isLoading={storageLoading} />
                    <VmStatusDonut running={summary?.running_vms || 0} stopped={summary?.stopped_vms || 0} isLoading={isLoading} />
                    <AZDistributionChart azs={azs} isLoading={isLoading} />
                </div>

                {/* ── ROW 3: TOP CONSUMERS + VM GROUPS ─────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="h-96"><TopVMsTable title="Top CPU Users" subtitle="VM ที่ใช้ CPU สูงสุด 7 อันดับ"
                        data={topCpu} type="cpu" isLoading={isLoading} /></div>
                    <div className="h-96"><TopVMsTable title="Top Memory Users" subtitle="VM ที่ใช้ Memory สูงสุด 7 อันดับ"
                        data={topMem} type="memory" isLoading={isLoading} /></div>
                    <div className="h-96"><VMGroupsCard data={groups} isLoading={isLoading} /></div>
                </div>

                {/* ── ROW 4: HOST HEALTH + ALARMS ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-[420px]"><HostHealthGrid hosts={hosts} isLoading={isLoading} /></div>
                    <div className="h-[420px]">
                        <AlarmsCard title="แจ้งเตือนระบบ (System Alerts)" data={alarms.slice(0, 8)} isLoading={isLoading} />
                    </div>
                </div>

                {/* ── ROW 5: SYSTEM STATUS + RESOURCE SUMMARY ───────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SystemStatusCard isLoading={isLoading} unprotectedCount={summary?.unprotected_vms || 0} summary={summary} />
                    <ResourceSummaryCard summary={summary} storageSummary={storageSummary} isLoading={isLoading || storageLoading} />
                </div>

                {/* ── FOOTER ───────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 pb-6">
                    <p className="text-xs text-slate-400 font-medium">
                        Sangfor SCP — VMStat Dashboard · Powered by Materialized Views · อัปเดตทุก 5 นาที
                    </p>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-emerald-500">
                            <CircleIcon sx={{ fontSize: 8 }} /> Live
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                            <TimerIcon sx={{ fontSize: 14 }} />
                            {queryMs ? `${queryMs.toFixed(0)}ms` : '—'}
                        </span>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </Box>
    );
}
