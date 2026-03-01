import React from 'react'
import { Grid, Card, Typography, Box, Stack, Chip, useTheme } from '@mui/material'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Brush, Legend } from 'recharts'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'
import { Memory, Speed, Storage, NetworkCheck, Computer, DataObject, Dns, Domain, Timeline } from '@mui/icons-material'

const fmt2 = (v: any) => typeof v === 'number' ? v.toFixed(2) : v

const getStatusColor = (val: number, isHighBad = true) => {
    if (isHighBad) {
        if (val >= 80) return 'error'
        if (val >= 60) return 'warning'
        return 'success'
    }
    return 'info'
}

export const RenderVmHistoricalAnalytics: React.FC<{ data: any }> = ({ data }) => {
    const theme = useTheme()
    const { vm_info, summary, timeseries } = data
    if (!vm_info || !timeseries) return null

    const tableRows = timeseries.map((t: any, idx: number) => ({
        id: idx,
        timestamp: new Date(t.timestamp).toLocaleString(),
        cpu_avg: fmt2(t.cpu_avg),
        cpu_max: fmt2(t.cpu_max),
        ram_avg: fmt2(t.ram_avg),
        disk_read: fmt2(t.disk_read_bps / 1024 / 1024),
        disk_write: fmt2(t.disk_write_bps / 1024 / 1024),
        disk_read_iops: fmt2(t.disk_read_iops),
        disk_write_iops: fmt2(t.disk_write_iops),
        net_rx: fmt2(t.net_rx),
        net_tx: fmt2(t.net_tx),
    }))

    const chartData = timeseries.map((t: any) => ({
        ...t,
        timeLabel: new Date(t.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        disk_read_mbps: t.disk_read_bps / 1024 / 1024,
        disk_write_mbps: t.disk_write_bps / 1024 / 1024,
    }))

    return (
        <Stack spacing={3}>
            {/* Section 1: VM Info Card */}
            <Card elevation={4} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
                <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={2.5}>
                            <Computer sx={{ fontSize: 48, opacity: 0.9 }} />
                            <Box>
                                <Typography variant="h5" fontWeight="bold" letterSpacing={0.5}>{vm_info.name}</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>UUID: {vm_info.uuid}</Typography>
                            </Box>
                        </Stack>
                        <Chip label={vm_info.power_state === 'poweredOn' ? 'Running' : vm_info.power_state}
                            color={vm_info.power_state === 'poweredOn' ? 'success' : 'default'}
                            size="medium"
                            sx={{ bgcolor: vm_info.power_state === 'poweredOn' ? 'success.main' : 'grey.300', color: '#fff', fontWeight: 600, fontSize: '0.9rem', px: 1, py: 2.5, borderRadius: 2 }} />
                    </Stack>
                </Box>
                <Box sx={{ p: 4, bgcolor: '#fbfcfd' }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} sm={4}>
                            <Stack spacing={2.5}>
                                <Typography variant="subtitle2" color="primary.main" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Hardware</Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center"><Speed fontSize="small" color="action" /> <Typography>vCPU: <Box component="span" fontWeight={600}>{vm_info.vcpu} Cores</Box></Typography></Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center"><Memory fontSize="small" color="action" /> <Typography>vRAM: <Box component="span" fontWeight={600}>{vm_info.vram_gb} GB</Box></Typography></Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center"><DataObject fontSize="small" color="action" /> <Typography>OS: <Box component="span" fontWeight={600}>{vm_info.os || '-'}</Box></Typography></Stack>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Stack spacing={2.5}>
                                <Typography variant="subtitle2" color="primary.main" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Location</Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center"><Dns fontSize="small" color="action" /> <Typography>Host: <Box component="span" fontWeight={600}>{vm_info.host || '-'}</Box></Typography></Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center"><Domain fontSize="small" color="action" /> <Typography>AZ: <Box component="span" fontWeight={600}>{vm_info.az || '-'}</Box></Typography></Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center"><Storage fontSize="small" color="action" /> <Typography>Datastore: <Box component="span" fontWeight={600}>{vm_info.datastore || '-'}</Box></Typography></Stack>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Stack spacing={2.5}>
                                <Typography variant="subtitle2" color="primary.main" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Logical</Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center"><Typography>Group: <Box component="span" fontWeight={600}>{vm_info.group || '-'}</Box></Typography></Stack>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Card>

            {/* Section 2: KPI Summary */}
            <Typography variant="h6" fontWeight={700} pt={1} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline color="primary" /> สรุปสถิติช่วงเวลา (Aggregated KPIs)
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                    <KpiCard title="CPU Average" value={`${fmt2(summary.cpu_avg)}%`} icon={<Speed />} color={getStatusColor(summary.cpu_avg)} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <KpiCard title="RAM Average" value={`${fmt2(summary.ram_avg)}%`} icon={<Memory />} color={getStatusColor(summary.ram_avg)} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <KpiCard title="Avg Disk IOPS" value={`${fmt2(summary.disk_iops_avg)}`} icon={<Storage />} color="info" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <KpiCard title="Avg Network (RX+TX)" value={`${fmt2(summary.network_avg)} Mbps`} icon={<NetworkCheck />} color="info" />
                </Grid>
            </Grid>

            {/* Section 3: Time-Series Charts */}
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={3} color="text.secondary">CPU & Memory Utilization Trend</Typography>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="timeLabel" tick={{ fontSize: 12, fill: '#6B7280' }} minTickGap={30} />
                                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
                                <ReTooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: theme.shadows[4], fontWeight: 500 }}
                                    formatter={(v: number) => [`${v.toFixed(2)} %`, '']}
                                />
                                <Legend wrapperStyle={{ paddingTop: 20 }} />
                                <Line type="monotone" dataKey="cpu_avg" name="CPU Avg" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="cpu_max" name="CPU Peak" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="ram_avg" name="RAM Avg" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                <Brush dataKey="timeLabel" height={40} stroke="#3B82F6" fill="#EFF6FF" tickFormatter={() => ''} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={3} color="text.secondary">Disk Throughput (MB/s)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="timeLabel" tick={{ fontSize: 12 }} hide />
                                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <ReTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: theme.shadows[4] }} formatter={(v: number) => [`${v.toFixed(2)} MB/s`, '']} />
                                <Legend wrapperStyle={{ paddingTop: 20 }} />
                                <Area type="monotone" dataKey="disk_read_mbps" name="Read MB/s" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.7} />
                                <Area type="monotone" dataKey="disk_write_mbps" name="Write MB/s" stackId="1" stroke="#EC4899" fill="#EC4899" fillOpacity={0.7} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={3} color="text.secondary">Network Traffic (Mbps)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="timeLabel" tick={{ fontSize: 12 }} hide />
                                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <ReTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: theme.shadows[4] }} formatter={(v: number) => [`${v.toFixed(2)} Mbps`, '']} />
                                <Legend wrapperStyle={{ paddingTop: 20 }} />
                                <Line type="monotone" dataKey="net_rx" name="RX (In)" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="net_tx" name="TX (Out)" stroke="#4F46E5" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>
            </Grid>

            {/* Section 4: Detailed Table */}
            <Typography variant="h6" fontWeight={700} mt={3} mb={-1} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DataObject color="primary" /> ข้อมูลโดยละเอียด (Raw Data Logs)
            </Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                <SortableTable defaultSort="timestamp" defaultDir="desc" columns={[
                    { id: 'timestamp', label: 'เวลา (Timestamp)' },
                    { id: 'cpu_avg', label: 'CPU Avg (%)', numeric: true },
                    { id: 'cpu_max', label: 'CPU Max (%)', numeric: true },
                    { id: 'ram_avg', label: 'RAM Avg (%)', numeric: true },
                    { id: 'disk_read', label: 'Disk Read (MB/s)', numeric: true },
                    { id: 'disk_write', label: 'Disk Write (MB/s)', numeric: true },
                    { id: 'disk_read_iops', label: 'Read IOPS', numeric: true },
                    { id: 'disk_write_iops', label: 'Write IOPS', numeric: true },
                    { id: 'net_rx', label: 'Net RX (Mbps)', numeric: true },
                    { id: 'net_tx', label: 'Net TX (Mbps)', numeric: true },
                ]} rows={tableRows} />
            </Box>
        </Stack>
    )
}
