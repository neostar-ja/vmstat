import { Box, Typography, Grid, Card, CardContent, useTheme, Alert } from '@mui/material';
import { Timeline, Warning, CheckCircle } from '@mui/icons-material';

export default function VMCapacityTab({ data, filterConfig }: { data: any, filterConfig: any }) {
    const theme = useTheme();
    if (!filterConfig || !data || !data.capacity) return null;

    const capacity = data.capacity || {};

    // Fallback logic if no capacity projections exist
    if (Object.keys(capacity).length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                ไม่พบข้อมูลการพยากรณ์ความจุ (Capacity Projection) สำหรับ VM นี้
            </Alert>
        );
    }

    return (
        <Box className="space-y-6">
            <Typography variant="h6" fontWeight={700} gutterBottom>
                การวิเคราะห์แนวโน้มและความจุทรัพยากร (Capacity Forecast)
            </Typography>

            <Grid container spacing={4}>
                {['disk', 'memory', 'cpu'].map((resourceType) => {
                    const info = capacity[resourceType];
                    if (!info) return null;

                    const isCritical = info.days_until_full !== null && info.days_until_full < 30;
                    const isWarning = info.days_until_full !== null && info.days_until_full >= 30 && info.days_until_full < 90;

                    let statusColor = theme.palette.success.main;
                    let StatusIcon = CheckCircle;

                    if (isCritical) {
                        statusColor = theme.palette.error.main;
                        StatusIcon = Warning;
                    } else if (isWarning) {
                        statusColor = theme.palette.warning.main;
                        StatusIcon = Warning;
                    }

                    return (
                        <Grid item xs={12} md={4} key={resourceType}>
                            <Card sx={{ borderRadius: 3, borderTop: `4px solid ${statusColor}`, boxShadow: theme.shadows[2] }}>
                                <CardContent className="p-6">
                                    <Box className="flex justify-between items-center mb-4">
                                        <Typography variant="h6" fontWeight={800} sx={{ textTransform: 'capitalize' }}>
                                            {resourceType}
                                        </Typography>
                                        <StatusIcon sx={{ color: statusColor }} />
                                    </Box>

                                    <Box className="space-y-3">
                                        <Box className="flex justify-between">
                                            <Typography variant="body2" color="text.secondary">อัตราการใช้งานปัจจุบัน:</Typography>
                                            <Typography variant="body2" fontWeight={700}>{info.current_usage.toFixed(2)}%</Typography>
                                        </Box>
                                        <Box className="flex justify-between">
                                            <Typography variant="body2" color="text.secondary">อัตราการเติบโต/วัน:</Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {info.growth_rate > 0 ? '+' : ''}{info.growth_rate.toFixed(4)}%
                                            </Typography>
                                        </Box>
                                        <Box className="flex justify-between">
                                            <Typography variant="body2" color="text.secondary">ระยะเวลาจนกว่าจะเต็ม:</Typography>
                                            <Typography variant="body2" fontWeight={800} color={statusColor}>
                                                {info.days_until_full !== null ? `${info.days_until_full} วัน` : 'ปลอดภัย (> 1 ปี)'}
                                            </Typography>
                                        </Box>
                                        {info.estimated_full_date && (
                                            <Box className="flex justify-between">
                                                <Typography variant="body2" color="text.secondary">วันที่คาดว่าจะเต็ม:</Typography>
                                                <Typography variant="body2" fontWeight={700}>{info.estimated_full_date}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            <Card sx={{ mt: 4, borderRadius: 3, bgcolor: theme.palette.background.paper }}>
                <CardContent className="p-6">
                    <Box className="flex items-center gap-2 mb-3">
                        <Timeline color="primary" />
                        <Typography variant="h6" fontWeight={700}>ข้อเสนอแนะเรื่องความจุ</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        ข้อมูลการเติบโตคำนวณจากค่าเฉลี่ยย้อนหลัง 30 วัน หากพบว่า VM มีระยะเวลาใช้งานเหลือต่ำกว่า 30 วัน ระบบจะแจ้งเตือนระดับวิกฤติ และควรพิจารณาปรับขยายทรัพยากร (Scale Up) โดยด่วนเพื่อป้องกันระบบขัดข้อง
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
