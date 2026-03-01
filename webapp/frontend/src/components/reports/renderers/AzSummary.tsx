import React from 'react'
import { Stack, Grid, Card, Typography, Box } from '@mui/material'
import { CloudQueue } from '@mui/icons-material'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { UtilBar } from '../../common/UtilBar'

const fmtGb = (v: number) => `${(v ?? 0).toFixed(1)} GB`

export const RenderAzSummary: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.data || []
    const chartData = rows.map((r: any) => ({ name: r.az_name, 'VM รัน': r.running_vms, 'VM หยุด': r.stopped_vms }))
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                {rows.map((az: any) => (
                    <Grid item xs={12} sm={6} md={4} key={az.az_id}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Box sx={{ p: 2 }}>
                                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                    <CloudQueue color="primary" />
                                    <Typography fontWeight={700}>{az.az_name}</Typography>
                                </Stack>
                                <Grid container spacing={1} mb={2}>
                                    {([['VM ทั้งหมด', az.total_vms], ['กำลังรัน', az.running_vms], ['Host', az.total_hosts], ['CPU Cores', az.total_cpu_cores], ['RAM รวม', fmtGb(az.total_memory_gb)], ['Storage รวม', fmtGb(az.total_storage_gb)]] as [string, any][]).map(([l, v]) => (
                                        <Grid item xs={6} key={l}>
                                            <Typography variant="caption" color="text.secondary">{l}</Typography>
                                            <Typography fontWeight={600}>{v}</Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                                <Stack spacing={1}>
                                    <UtilBar label="CPU" pct={az.avg_cpu_pct} />
                                    <UtilBar label="Memory" pct={az.avg_memory_pct} />
                                    <UtilBar label="Storage" pct={az.avg_storage_pct} />
                                </Stack>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {chartData.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>VM per AZ</Typography>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <ReTooltip />
                            <Legend />
                            <Bar dataKey="VM รัน" fill="#4caf50" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="VM หยุด" fill="#bdbdbd" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
        </Stack>
    )
}
