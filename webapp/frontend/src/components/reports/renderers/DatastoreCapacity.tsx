import React from 'react'
import { Stack, Grid, Card, Typography, Chip, LinearProgress } from '@mui/material'
import { Storage, Warning, Error as ErrorIcon } from '@mui/icons-material'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`
const fmtGb = (v: number) => `${((v ?? 0) / 1024).toFixed(1)} GB`
const statusColor = (p: number): 'success' | 'warning' | 'error' => p >= 90 ? 'error' : p >= 75 ? 'warning' : 'success'

export const RenderDatastoreCapacity: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.datastores || []
    const summary = data.summary || {}
    const chartData = rows.map((r: any) => ({
        name: r.name?.length > 16 ? r.name.substring(0, 16) + '…' : r.name,
        'ใช้แล้ว': r.used_mb / 1024, 'ว่าง': (r.total_mb - r.used_mb) / 1024,
    }))
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="Datastore รวม" value={summary.total_datastores ?? rows.length} icon={<Storage />} color="#2196f3" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Critical (>90%)" value={summary.critical_count ?? 0} icon={<ErrorIcon />} color="#f44336" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Warning (>80%)" value={summary.warning_count ?? 0} icon={<Warning />} color="#ff9800" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="พื้นที่รวม" value={fmtGb(summary.total_capacity_mb)} icon={<Storage />} color="#4caf50" /></Grid>
            </Grid>
            {chartData.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>Datastore Capacity (GB)</Typography>
                    <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 12 }} unit=" G" />
                            <ReTooltip />
                            <Legend />
                            <Bar dataKey="ใช้แล้ว" fill="#2196f3" stackId="a" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="ว่าง" fill="#e0e0e0" stackId="a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
            <SortableTable defaultSort="ratio" columns={[
                { id: 'name', label: 'Datastore' },
                { id: 'ratio', label: 'ใช้ %', numeric: true, render: (v: number) => { const pct = v * 100; return <><Chip label={fmtPct(pct)} size="small" color={statusColor(pct)} sx={{ mb: 0.5 }} /><LinearProgress variant="determinate" value={Math.min(pct, 100)} color={statusColor(pct)} sx={{ height: 4, borderRadius: 2 }} /></> } },
                { id: 'used_mb', label: 'ใช้ (GB)', numeric: true, render: fmtGb },
                { id: 'total_mb', label: 'รวม (GB)', numeric: true, render: fmtGb },
            ]} rows={rows} />
        </Stack>
    )
}
