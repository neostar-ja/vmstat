import React from 'react'
import { Stack, Card, Typography, Chip } from '@mui/material'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { SortableTable } from '../../common/SortableTable'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`
const fmtGb = (v: number) => `${(v ?? 0).toFixed(1)} GB`
const statusColor = (p: number): 'success' | 'warning' | 'error' => p >= 90 ? 'error' : p >= 75 ? 'warning' : 'success'

export const RenderGroupSummary: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.data || []
    const top10 = rows.slice(0, 10)
    const chartData = top10.map((r: any) => ({
        name: r.group_name?.length > 16 ? r.group_name.substring(0, 16) + '…' : r.group_name,
        CPU: r.avg_cpu_pct, RAM: r.avg_memory_pct
    }))
    return (
        <Stack spacing={3}>
            {chartData.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>Top 10 กลุ่ม — CPU & RAM (%)</Typography>
                    <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
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
            <SortableTable defaultSort="total_vms" columns={[
                { id: 'group_name', label: 'กลุ่ม VM' },
                { id: 'total_vms', label: 'VM รวม', numeric: true },
                { id: 'running_vms', label: 'กำลังรัน', numeric: true, render: (v: number) => <Chip label={v} size="small" color="success" variant="outlined" /> },
                { id: 'total_cpu_cores', label: 'CPU Cores', numeric: true },
                { id: 'total_memory_gb', label: 'RAM (GB)', numeric: true, render: fmtGb },
                { id: 'total_storage_gb', label: 'Storage (GB)', numeric: true, render: fmtGb },
                { id: 'avg_cpu_pct', label: 'CPU %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={statusColor(v)} /> },
                { id: 'avg_memory_pct', label: 'RAM %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={statusColor(v)} /> },
                { id: 'protected_vms', label: 'Protected', numeric: true },
            ]} rows={rows} />
        </Stack>
    )
}
