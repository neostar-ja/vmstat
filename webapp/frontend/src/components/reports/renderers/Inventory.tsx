import React from 'react'
import { Stack, Grid, Card, Typography } from '@mui/material'
import { Assessment, CheckCircle, SpeedOutlined, Dns } from '@mui/icons-material'
import { BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { KpiCard } from '../../common/KpiCard'

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548']

export const RenderInventory: React.FC<{ data: any }> = ({ data }) => {
    const summary = data.vm_summary || {}; const byOS = data.by_os || []; const byGroup = data.by_group || []; const hostSummary = data.host_summary || {}
    const osChart = byOS.slice(0, 8).map((r: any) => ({ name: r.os_name, value: r.count }))
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="VM ทั้งหมด" value={summary.total_vms ?? 0} icon={<Assessment />} color="#2196f3" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="กำลังรัน" value={data.by_power_state?.on ?? 0} icon={<CheckCircle />} color="#4caf50" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="CPU Cores รวม" value={summary.total_vcpus ?? 0} icon={<SpeedOutlined />} color="#9c27b0" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Host ทั้งหมด" value={hostSummary.total_hosts ?? 0} icon={<Dns />} color="#ff9800" /></Grid>
            </Grid>
            <Grid container spacing={3}>
                {osChart.length > 0 && (
                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                            <Typography fontWeight={600} mb={2}>สัดส่วน OS</Typography>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={osChart} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                                        {osChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <ReTooltip /><Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Grid>
                )}
                {byGroup.length > 0 && (
                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                            <Typography fontWeight={600} mb={2}>VM per Group (Top 10)</Typography>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={byGroup.slice(0, 10).map((r: any) => ({ name: r.group_name?.slice(0, 12), count: r.count }))} margin={{ left: 0, right: 8, top: 8, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <ReTooltip />
                                    <Bar dataKey="count" fill="#2196f3" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Stack>
    )
}
