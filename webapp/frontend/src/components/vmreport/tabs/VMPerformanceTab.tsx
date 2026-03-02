import { Box, Typography, Grid, Card, CardContent, useTheme, alpha } from '@mui/material';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush
} from 'recharts';

export default function VMPerformanceTab({ data, filterConfig }: { data: any, filterConfig: any }) {
    const theme = useTheme();
    if (!filterConfig || !data || !data.performance) return null;

    const timeseries = data.performance.timeseries || [];

    // Format data for display if needed
    const chartData = timeseries.map((pt: any) => ({
        ...pt,
        Time: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        Date: new Date(pt.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }));

    return (
        <Box className="space-y-6">
            {/* CPU & RAM Chart */}
            <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[1], border: `1px solid ${theme.palette.divider}` }}>
                <CardContent className="p-6">
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        CPU & Memory Usage
                    </Typography>
                    <Box sx={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                <XAxis dataKey={filterConfig.interval === 'day' ? 'Date' : 'Time'} stroke={theme.palette.text.secondary} />
                                <YAxis yAxisId="left" stroke={theme.palette.primary.main} />
                                <YAxis yAxisId="right" orientation="right" stroke={theme.palette.secondary.main} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8, border: 'none', boxShadow: theme.shadows[3] }}
                                />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="cpu_usage" name="CPU (%)" stroke={theme.palette.primary.main} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="memory_usage" name="RAM (%)" stroke={theme.palette.secondary.main} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                <Brush dataKey={filterConfig.interval === 'day' ? 'Date' : 'Time'} height={30} stroke={theme.palette.primary.light} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            <Grid container spacing={4}>
                {/* Disk IO / Usage */}
                <Grid item xs={12} lg={6}>
                    <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[1], border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <CardContent className="p-6">
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Disk Usage
                            </Typography>
                            <Box sx={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                        <XAxis dataKey={filterConfig.interval === 'day' ? 'Date' : 'Time'} stroke={theme.palette.text.secondary} />
                                        <YAxis stroke={theme.palette.text.secondary} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8, border: 'none', boxShadow: theme.shadows[3] }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="disk_usage" name="Disk (%)" stroke={theme.palette.warning.main} fill={alpha(theme.palette.warning.main, 0.2)} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Network */}
                <Grid item xs={12} lg={6}>
                    <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[1], border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <CardContent className="p-6">
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Network Throughput (MB/s)
                            </Typography>
                            <Box sx={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                        <XAxis dataKey={filterConfig.interval === 'day' ? 'Date' : 'Time'} stroke={theme.palette.text.secondary} />
                                        <YAxis stroke={theme.palette.text.secondary} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8, border: 'none', boxShadow: theme.shadows[3] }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="network_rx" name="RX" stroke={theme.palette.info.main} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="network_tx" name="TX" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
