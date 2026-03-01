import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip,
    TextField,
    InputAdornment,
    TablePagination,
    CircularProgress,
    useTheme,
    alpha
} from '@mui/material';
import {
    RestoreFromTrash as RestoreIcon,
    DeleteForever as DeleteForeverIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Computer as VmIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vmsApi } from '../../services/api';
import type { VM } from '../../types';

export default function DeletedVMManager() {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');

    // Dialog states
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [selectedVM, setSelectedVM] = useState<VM | null>(null);

    // Fetch Deleted VMs
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['deleted-vms', page, pageSize, search],
        queryFn: () => vmsApi.getRecycleBin({
            page: page + 1,
            page_size: pageSize,
            search: search || undefined,
            sort_by: 'deleted_at',
            sort_order: 'desc'
        }),
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (uuid: string) => vmsApi.permanentlyDeleteVM(uuid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-vms'] });
            setDeleteConfirmOpen(false);
            setSelectedVM(null);
        },
    });

    const restoreMutation = useMutation({
        mutationFn: (uuid: string) => vmsApi.restoreVM(uuid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted-vms'] });
            setRestoreConfirmOpen(false);
            setSelectedVM(null);
        },
    });

    const handleDeleteClick = (vm: VM) => {
        setSelectedVM(vm);
        setDeleteConfirmOpen(true);
    };

    const handleRestoreClick = (vm: VM) => {
        setSelectedVM(vm);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedVM) {
            deleteMutation.mutate(selectedVM.vm_uuid);
        }
    };

    const handleConfirmRestore = () => {
        if (selectedVM) {
            restoreMutation.mutate(selectedVM.vm_uuid);
        }
    };

    return (
        <Card>
            <CardContent sx={{ p: 0 }}>
                {/* Header */}
                <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <DeleteForeverIcon color="error" />
                            <Typography variant="h6" fontWeight={600}>
                                จัดการ VM ที่ถูกลบ (Recycle Bin)
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            กู้คืนหรือลบข้อมูล VM อย่างถาวร
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="ค้นหา..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 250 }}
                        />
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={() => refetch()}
                            variant="outlined"
                        >
                            รีเฟรช
                        </Button>
                    </Box>
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                                <TableCell sx={{ fontWeight: 600 }}>VM Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Host / IP</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Resources</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : data?.data?.items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                        <DeleteForeverIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                        <Typography color="text.secondary">
                                            ไม่พบรายการที่ถูกลบ
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.data?.items.map((vm: VM) => (
                                    <TableRow key={vm.vm_uuid} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{
                                                    width: 40, height: 40,
                                                    borderRadius: 1,
                                                    bgcolor: alpha(theme.palette.grey[500], 0.1),
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <VmIcon color="disabled" />
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {vm.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {vm.vm_uuid}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{vm.ip_address || '-'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{vm.host_name || '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Chip label={`${vm.cpu_cores} vCPU`} size="small" variant="outlined" />
                                                <Chip label={`${(vm.memory_total_mb || 0) / 1024} GB RAM`} size="small" variant="outlined" />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <Tooltip title="กู้คืน (Restore)">
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => handleRestoreClick(vm)}
                                                        size="small"
                                                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                                                    >
                                                        <RestoreIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="ลบถาวร (Delete Permanently)">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleDeleteClick(vm)}
                                                        size="small"
                                                        sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
                                                    >
                                                        <DeleteForeverIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={data?.data?.total || 0}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(e) => {
                        setPageSize(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />

                {/* Restore Dialog */}
                <Dialog open={restoreConfirmOpen} onClose={() => setRestoreConfirmOpen(false)}>
                    <DialogTitle>ยืนยันการกู้คืน?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            คุณต้องการกู้คืน VM <b>{selectedVM?.name}</b> หรือไม่?
                            <br /><br />
                            <Typography variant="caption" color="warning.main">
                                หมายเหตุ: หาก VM นี้ยังไม่ปรากฏใน Source (Sangfor), มันอาจจะถูกลบอีกครั้งในการ Sync รอบถัดไป
                            </Typography>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRestoreConfirmOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleConfirmRestore} variant="contained" color="primary">
                            ยืนยันกู้คืน
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Dialog */}
                <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                    <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteForeverIcon />
                        ยืนยันการลบถาวร?
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            การลบ VM <b>{selectedVM?.name}</b> จะทำให้ข้อมูลทั้งหมด (Metrics, Logs, Config) หายไปและ<b>ไม่สามารถกู้คืนได้</b>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteConfirmOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleConfirmDelete} variant="contained" color="error">
                            ยืนยันลบถาวร
                        </Button>
                    </DialogActions>
                </Dialog>

            </CardContent>
        </Card>
    );
}
