import React from 'react'
import { Stack, Grid, Card, Typography, Chip } from '@mui/material'
import { PauseCircle } from '@mui/icons-material'
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`
const fmtGb = (v: number) => `${(v ?? 0).toFixed(1)} GB`
const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4']

export const RenderIdleVms: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.data || []
    const typeCnt = rows.reduce((a: any, r: any) => { a[r.idle_type] = (a[r.idle_type] || 0) + 1; return a }, {})
    const pieData = Object.entries(typeCnt).map(([n, v]) => ({ name: n, value: v }))
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4}><KpiCard title="VM ใช้งานน้อย" value={data.total_idle ?? 0} icon={<PauseCircle />} color="#ff9800" sub={`CPU<${data.cpu_threshold}% หรือ RAM<${data.mem_threshold}%`} /></Grid>
                {Object.entries(typeCnt).map(([k, v]: any) => (
                    <Grid item xs={12} sm={4} key={k}>
                        <KpiCard title={k === 'idle' ? 'Idle ทั้ง CPU+RAM' : k === 'cpu_idle' ? 'CPU Idle' : 'RAM Idle'} value={v} icon={<PauseCircle />} color={k === 'idle' ? '#f44336' : '#ff9800'} />
                    </Grid>
                ))}
            </Grid>
            {pieData.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={1}>ประเภท VM Idle</Typography>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}:${value}`}>
                                {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <ReTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            )}
            <SortableTable defaultSort="avg_cpu_pct" defaultDir="asc" columns={[
                { id: 'vm_name', label: 'ชื่อ VM' }, { id: 'group_name', label: 'กลุ่ม' }, { id: 'az_name', label: 'AZ' },
                { id: 'cpu_cores', label: 'Cores', numeric: true }, { id: 'memory_total_gb', label: 'RAM (GB)', numeric: true, render: fmtGb },
                { id: 'avg_cpu_pct', label: 'CPU %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" /> },
                { id: 'avg_memory_pct', label: 'RAM %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" /> },
                { id: 'idle_type', label: 'ประเภท', render: (v: string) => <Chip label={v === 'idle' ? 'Idle ทั้งหมด' : v === 'cpu_idle' ? 'CPU Idle' : 'RAM Idle'} size="small" color={v === 'idle' ? 'error' : 'warning'} variant="outlined" /> },
            ]} rows={rows} />
        </Stack>
    )
}
