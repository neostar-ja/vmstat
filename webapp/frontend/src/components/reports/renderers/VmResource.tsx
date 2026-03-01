import React from 'react'
import { Stack, Grid, Card, Typography, LinearProgress, Box } from '@mui/material'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`

export const RenderVmResource: React.FC<{ data: any }> = ({ data }) => {
    const ts = data.time_series || []; const stats = data.statistics || {}
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                {([
                    { label: 'CPU เฉลี่ย', v: stats.cpu_avg, max: stats.cpu_max, color: '#2196f3' },
                    { label: 'RAM เฉลี่ย', v: stats.mem_avg, max: stats.mem_max, color: '#ff9800' },
                    { label: 'Storage เฉลี่ย', v: stats.storage_avg, max: stats.storage_max, color: '#4caf50' },
                ] as { label: string; v: number; max: number; color: string }[]).map(({ label, v, max, color }) => (
                    <Grid item xs={12} sm={4} key={label}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Box sx={{ p: 2 }}>
                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                <Typography variant="h5" fontWeight={700} color={color}>{fmtPct(v ?? 0)}</Typography>
                                <Typography variant="caption" color="text.secondary">Max: {fmtPct(max ?? 0)}</Typography>
                                <LinearProgress variant="determinate" value={Math.min(v ?? 0, 100)} sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {ts.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>CPU & Memory — Time Series</Typography>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={ts} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="collected_at" tick={{ fontSize: 10 }} tickFormatter={(t) => t?.slice(11, 16)} />
                            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                            <ReTooltip formatter={(v: number) => `${v?.toFixed(1)}%`} labelFormatter={(l) => String(l).slice(0, 16).replace('T', ' ')} />
                            <Legend />
                            <Area type="monotone" dataKey="cpu_ratio" name="CPU %" stroke="#2196f3" fill="#bbdefb" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="memory_ratio" name="RAM %" stroke="#ff9800" fill="#ffe0b2" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            )}
        </Stack>
    )
}
