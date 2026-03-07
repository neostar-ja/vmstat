import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Alert,
    Paper,
    CircularProgress,
    Fade,
} from '@mui/material';
import {
    DataObject as RawDataIcon,
} from '@mui/icons-material';
import { } from '../helpers';
import type { Tab8Props } from '../types';

export default function Tab8RawData(props: Tab8Props) {
    const { theme, rawLoading, rawData, rawError } = props;

    return (
        <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Box>
                    {rawLoading && (
                        <Fade in={true}>
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 8,
                                gap: { xs: 1, sm: 1.5, md: 2 }
                            }}>
                                <CircularProgress size={60} thickness={4} />
                                <Typography variant="h6" color="text.secondary">
                                    กำลังดึงข้อมูลดิบจาก API...
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    อาจใช้เวลาสักครู่
                                </Typography>
                            </Box>
                        </Fade>
                    )}
                    {!rawLoading && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.5, md: 2 }, flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>
                                    <RawDataIcon /> Comprehensive Diagnostic Data (Raw)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {rawData?.data?.api_source?.endpoint && (
                                        <Chip
                                            label={`API: ${rawData.data.api_source.endpoint}`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                        />
                                    )}
                                    {rawData?.data?.collected_at && (
                                        <Chip
                                            label={`Fetched: ${new Date(rawData.data.collected_at).toLocaleString('th-TH')}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 1.5, md: 2 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                ข้อมูลชุดนี้เป็นการรวมข้อมูลดิบจากทั้ง Sangfor API และข้อมูลล่าสุดที่เก็บไว้ใน Database (Master, Disks, Networks, Alarms, Metrics) เพื่อใช้สำหรับการตรวจสอบความถูกต้อง
                            </Typography>

                            {rawError ? (
                                <Alert severity="error">
                                    ไม่สามารถดึงข้อมูลดิบได้: {(rawError as any)?.response?.data?.detail || rawError.message}
                                </Alert>
                            ) : (
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: { xs: 1.5, md: 2 },
                                        bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#1e1e1e',
                                        color: '#d4d4d4',
                                        overflow: 'auto',
                                        maxHeight: { xs: '500px', sm: '600px', md: '700px' },
                                        borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <pre style={{ margin: 0, fontFamily: '"Fira Code", "Source Code Pro", monospace', fontSize: 'clamp(10px, 2.5vw, 13px)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                                        {JSON.stringify(rawData?.data, null, 2)}
                                    </pre>
                                </Paper>
                            )}
                        </>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}
