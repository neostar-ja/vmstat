import { Box, Typography, Grid, Card, CardContent, useTheme, Chip, Divider } from '@mui/material';
import { MonitorHeart, Warning, CheckCircle, Error } from '@mui/icons-material';

export default function VMHealthTab({ data, filterConfig }: { data: any, filterConfig: any }) {
    const theme = useTheme();
    if (!filterConfig || !data || !data.health) return null;

    const health = data.health || {};
    const score = health.score || 0;
    const issues = health.issues || [];

    const scoreColor = score >= 80 ? 'success.main' : score >= 50 ? 'warning.main' : 'error.main';
    const StatusIcon = score >= 80 ? CheckCircle : score >= 50 ? Warning : Error;

    return (
        <Box className="space-y-6">
            <Grid container spacing={4}>
                {/* Score Panel */}
                <Grid item xs={12} md={4} lg={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[2], height: '100%', textAlign: 'center', p: 4 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>คะแนนสุขภาพ</Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mt: 2, mb: 2 }}>
                            <Box
                                sx={{
                                    width: 150, height: 150, borderRadius: '50%',
                                    border: `8px solid ${scoreColor}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <Typography variant="h2" fontWeight={900} sx={{ color: scoreColor }}>
                                    {score}
                                </Typography>
                            </Box>
                        </Box>
                        <Box className="flex items-center justify-center gap-2 mt-2">
                            <StatusIcon sx={{ color: scoreColor }} />
                            <Typography variant="h6" fontWeight={800} sx={{ color: scoreColor }}>
                                {health.risk_level || 'ปกติ'}
                            </Typography>
                        </Box>
                    </Card>
                </Grid>

                {/* Issues List */}
                <Grid item xs={12} md={8} lg={9}>
                    <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[1], height: '100%' }}>
                        <CardContent className="p-6">
                            <Box className="flex items-center gap-2 mb-4">
                                <MonitorHeart color="error" />
                                <Typography variant="h6" fontWeight={800}>ความเสี่ยงและปัญหาที่พบ (Detected Issues)</Typography>
                                <Chip label={`${issues.length} Issues`} size="small" color={issues.length > 0 ? "error" : "success"} sx={{ ml: 'auto' }} />
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {issues.length > 0 ? (
                                <Grid container spacing={2}>
                                    {issues.map((issue: string, idx: number) => (
                                        <Grid item xs={12} sm={6} key={idx}>
                                            <Box className="flex items-start gap-3 p-3 rounded-lg" sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                                                <Error color="error" sx={{ mt: 0.5 }} />
                                                <Typography variant="body2" fontWeight={600} color="error.900">
                                                    {issue}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <CheckCircle color="success" sx={{ fontSize: 60, mb: 2, opacity: 0.8 }} />
                                    <Typography variant="h6" color="success.main" fontWeight={700}>ไม่พบปัญหาการใช้งาน</Typography>
                                    <Typography variant="body2" color="text.secondary">ทรัพยากรอยู่ในเกณฑ์ปกติ (Healthy State)</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
