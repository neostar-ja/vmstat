import { Box, Typography, Grid, Card, CardContent, useTheme, Alert, Chip } from '@mui/material';
import { AutoAwesome, Compress } from '@mui/icons-material';

export default function VMOptimizationTab({ data, filterConfig }: { data: any, filterConfig: any }) {
    const theme = useTheme();
    if (!filterConfig || !data || !data.optimization) return null;

    const opt = data.optimization || {};
    const { is_over_provisioned, is_idle, recommendations } = opt;

    if (!is_over_provisioned && !is_idle && (!recommendations || recommendations.length === 0)) {
        return (
            <Alert severity="success" sx={{ mt: 2 }}>
                VM นี้ใช้งานทรัพยากรได้อย่างมีประสิทธิภาพ ไม่พบคำแนะนำการปรับขนาด (Right-sizing) ในขณะนี้
            </Alert>
        );
    }

    return (
        <Box className="space-y-6">
            <Typography variant="h6" fontWeight={700} gutterBottom>
                ลดต้นทุนและเพิ่มประสิทธิภาพ (Right-Sizing Analysis)
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, borderLeft: `6px solid ${theme.palette.warning.main}`, height: '100%' }}>
                        <CardContent className="p-6">
                            <Box className="flex items-center gap-2 mb-4">
                                <Compress color="warning" />
                                <Typography variant="h6" fontWeight={800}>สถานะการใช้งานจริง</Typography>
                            </Box>

                            <Box className="flex gap-2 mb-4">
                                {is_over_provisioned && (
                                    <Chip label="Over-Provisioned (ทรัพยากรมากเกินไป)" color="warning" sx={{ fontWeight: 600 }} />
                                )}
                                {is_idle && (
                                    <Chip label="Zombie VM (ไม่มีการใช้งาน)" color="error" sx={{ fontWeight: 600 }} />
                                )}
                            </Box>

                            <Typography variant="body2" color="text.secondary">
                                จากการวิเคราะห์พฤติกรรมการใช้งานย้อนหลัง พบว่า VM นี้อาจมีการจองทรัพยากรมากเกินความจำเป็น การปรับลด (Scale Down) จะช่วยคืนทรัพยากรให้ระบบโดยรวม
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, borderLeft: `6px solid ${theme.palette.info.main}`, height: '100%' }}>
                        <CardContent className="p-6">
                            <Box className="flex items-center gap-2 mb-4">
                                <AutoAwesome color="info" />
                                <Typography variant="h6" fontWeight={800}>AI ข้อเสนอแนะ (Recommendation)</Typography>
                            </Box>

                            <ul className="space-y-3 m-0 pl-5">
                                {recommendations && recommendations.length > 0 ? (
                                    recommendations.map((rec: string, idx: number) => (
                                        <li key={idx}>
                                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                                {rec}
                                            </Typography>
                                        </li>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">ไม่มีข้อเสนอแนะเพิ่มเติม</Typography>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
