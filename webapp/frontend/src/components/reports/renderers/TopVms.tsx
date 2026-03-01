import React from 'react'
import { Stack, Card, Typography, Chip } from '@mui/material'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Cell, ResponsiveContainer } from 'recharts'
import { SortableTable } from '../../common/SortableTable'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`
const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548']
const statusColor = (p: number): 'success' | 'warning' | 'error' => p >= 90 ? 'error' : p >= 75 ? 'warning' : 'success'

export const RenderTopVms: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.items || data.top_vms || []
    const chartData = rows.slice(0, 15).map((r: any) => ({
        name: r.vm_name?.length > 14 ? r.vm_name.substring(0, 14) + '…' : r.vm_name,
        value: r.metric_value
    }))
    return (
        <Stack spacing={3}>
            {chartData.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>Top VMs — {data.metric?.toUpperCase()}</Typography>
                    <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 32, top: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                            <ReTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
            <SortableTable defaultSort="metric_value" columns={[
                { id: 'rank', label: '#', numeric: true }, { id: 'vm_name', label: 'ชื่อ VM' },
                { id: 'group_name', label: 'กลุ่ม' }, { id: 'host_name', label: 'Host' },
                { id: 'metric_value', label: 'ค่า', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={statusColor(v)} /> },
            ]} rows={rows} />
        </Stack>
    )
}
