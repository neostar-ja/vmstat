import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, alpha, useTheme, Alert } from '@mui/material';

export default function VMOperationTab({ data, filterConfig }: { data: any, filterConfig: any }) {
    const theme = useTheme();
    if (!filterConfig || !data) return null;

    const operations = data.operations || [];

    if (operations.length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                ไม่พบประวัติการตั้งค่าหรือการดำเนินการในระบบ (Audit Logs)
            </Alert>
        );
    }

    return (
        <Box className="space-y-6">
            <Typography variant="h6" fontWeight={700} gutterBottom>
                ประวัติการดำเนินการ (Operation Logs)
            </Typography>

            <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[1] }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                <TableCell sx={{ fontWeight: 700 }}>วันที่ (Timestamp)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>การกระทำ (Action)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>ผู้ใช้งาน (User)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>สถานะ (Status)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {operations.map((op: any, index: number) => (
                                <TableRow key={index} hover>
                                    <TableCell>{new Date(op.timestamp).toLocaleString()}</TableCell>
                                    <TableCell>{op.action}</TableCell>
                                    <TableCell>{op.user}</TableCell>
                                    <TableCell>{op.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}
