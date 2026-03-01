import React from 'react'
import { Stack, Grid, Card, Typography, Chip } from '@mui/material'
import { Dns, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`
const fmtGb = (v: number) => `${(v ?? 0).toFixed(1)} GB`
const statusColor = (p: number): 'success' | 'warning' | 'error' => p >= 90 ? 'error' : p >= 75 ? 'warning' : 'success'

export const RenderHostDetail: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.data || []; const summary = data.summary || {}
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="Host ทั้งหมด" value={summary.total_hosts ?? 0} icon={<Dns />} color="#2196f3" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="สุขภาพดี" value={summary.hosts_healthy ?? 0} icon={<CheckCircle />} color="#4caf50" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Warning" value={summary.hosts_warning ?? 0} icon={<Warning />} color="#ff9800" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Critical" value={summary.hosts_critical ?? 0} icon={<ErrorIcon />} color="#f44336" /></Grid>
            </Grid>
            {rows.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>CPU & Memory Usage per Host</Typography>
                    <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={rows.slice(0, 15).map((r: any) => ({
                            name: r.host_name?.length > 14 ? r.host_name.substring(0, 14) + '…' : r.host_name,
                            CPU: r.cpu_usage_pct, RAM: r.memory_usage_pct
                        }))} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                            <ReTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                            <Legend />
                            <Bar dataKey="CPU" fill="#2196f3" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="RAM" fill="#ff9800" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
            <SortableTable defaultSort="cpu_usage_pct" columns={[
                { id: 'host_name', label: 'Host' }, { id: 'az_name', label: 'AZ' },
                { id: 'vm_count', label: 'VMs', numeric: true }, { id: 'running_vms', label: 'รัน', numeric: true },
                { id: 'cpu_usage_pct', label: 'CPU %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={statusColor(v)} /> },
                { id: 'memory_usage_pct', label: 'RAM %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={statusColor(v)} /> },
                { id: 'memory_total_gb', label: 'RAM รวม (GB)', numeric: true, render: fmtGb },
                { id: 'alarm_count', label: 'Alarms', numeric: true, render: (v: number) => v > 0 ? <Chip label={v} size="small" color="error" /> : <>-</> },
                { id: 'health_status', label: 'สุขภาพ', render: (v: string) => <Chip label={v} size="small" color={v === 'healthy' ? 'success' : v === 'warning' ? 'warning' : 'error'} /> },
            ]} rows={rows} />
        </Stack>
    )
}
