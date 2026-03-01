import React from 'react'
import { Stack, Grid, Card, Typography, Chip } from '@mui/material'
import { Warning, Error as ErrorIcon, History } from '@mui/icons-material'
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

export const RenderAlarmSummary: React.FC<{ data: any }> = ({ data }) => {
    const summary = data.summary || {}; const topVms = data.top_vms_by_alarm || []
    const pieData = [
        { name: 'P1 Critical', value: summary.p1_count ?? 0 },
        { name: 'P2 Major', value: summary.p2_count ?? 0 },
        { name: 'P3 Minor', value: summary.p3_count ?? 0 },
    ].filter(d => d.value > 0)
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="Alarm รวม" value={summary.total_alarms ?? 0} icon={<Warning />} color="#e91e63" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="P1 Critical" value={summary.p1_count ?? 0} icon={<ErrorIcon />} color="#f44336" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Active ขณะนี้" value={summary.open_count ?? 0} icon={<Warning />} color="#ff9800" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="MTTR เฉลี่ย" value={`${Math.round(summary.avg_mttr_minutes ?? 0)} นาที`} icon={<History />} color="#9c27b0" /></Grid>
            </Grid>
            <Grid container spacing={3}>
                {pieData.length > 0 && (
                    <Grid item xs={12} md={5}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                            <Typography fontWeight={600} mb={2}>Alarm by Severity</Typography>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}:${value}`}>
                                        <Cell fill="#f44336" /><Cell fill="#ff9800" /><Cell fill="#4caf50" />
                                    </Pie>
                                    <ReTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Grid>
                )}
                {topVms.length > 0 && (
                    <Grid item xs={12} md={7}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                            <Typography fontWeight={600} mb={2}>VM มี Alarm มากสุด</Typography>
                            <SortableTable defaultSort="alarm_count" columns={[
                                { id: 'resource_name', label: 'ชือ Resource' },
                                { id: 'alarm_count', label: 'Alarm', numeric: true, render: (v: number) => <Chip label={v} size="small" color="error" /> },
                                { id: 'p1_count', label: 'P1', numeric: true },
                            ]} rows={topVms} />
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Stack>
    )
}
