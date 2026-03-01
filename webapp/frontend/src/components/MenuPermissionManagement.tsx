import React, { useState, useEffect, useMemo } from 'react';
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
    Checkbox,
    Button,
    Alert,
    Skeleton,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Snackbar,
    Tooltip,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Menu as MenuIcon,
    Tab as TabIcon,
    Visibility as ViewIcon,
    VisibilityOff as HideIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi, type RolePermissionMatrix, type PermissionMatrixItem, type MenuItem as MenuItemType } from '../services/permissionsApi';
import { usePermissions } from '../contexts/PermissionContext';

interface LocalPermissions {
    [roleId: number]: {
        [menuItemId: number]: {
            can_view: boolean;
            can_edit: boolean;
            can_delete: boolean;
        };
    };
}

export default function MenuPermissionManagement() {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { refreshPermissions } = usePermissions();
    const isDark = theme.palette.mode === 'dark';

    const [localPermissions, setLocalPermissions] = useState<LocalPermissions>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });
    const [menuDialog, setMenuDialog] = useState(false);
    const [menuForm, setMenuForm] = useState<Partial<MenuItemType>>({
        name: '', display_name: '', path: '', icon: '', menu_type: 'menu', order: 0, is_visible: true, description: '',
    });
    const [editingMenu, setEditingMenu] = useState<MenuItemType | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<MenuItemType | null>(null);

    // Fetch permission matrix
    const { data: matrix, isLoading: matrixLoading } = useQuery({
        queryKey: ['permissionMatrix'],
        queryFn: () => permissionsApi.getMatrix(),
    });

    // Fetch menu items
    const { data: menuItems, isLoading: menusLoading } = useQuery({
        queryKey: ['menuItems'],
        queryFn: () => permissionsApi.getMenuItems(),
    });

    // Initialize local permissions from matrix
    useEffect(() => {
        if (matrix) {
            const local: LocalPermissions = {};
            matrix.forEach((role: RolePermissionMatrix) => {
                local[role.role_id] = {};
                role.permissions.forEach((perm: PermissionMatrixItem) => {
                    local[role.role_id][perm.menu_item_id] = {
                        can_view: perm.can_view,
                        can_edit: perm.can_edit,
                        can_delete: perm.can_delete,
                    };
                });
            });
            setLocalPermissions(local);
            setHasChanges(false);
        }
    }, [matrix]);

    // Mutations
    const bulkUpdateMutation = useMutation({
        mutationFn: (data: { role_id: number; permissions: Array<{ menu_item_id: number; can_view: boolean; can_edit: boolean; can_delete: boolean }> }) =>
            permissionsApi.bulkUpdate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
            refreshPermissions();
            setSnackbar({ open: true, message: 'บันทึกสิทธิ์สำเร็จ!', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการบันทึก', severity: 'error' });
        },
    });

    const createMenuMutation = useMutation({
        mutationFn: (data: Partial<MenuItemType>) => permissionsApi.createMenuItem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menuItems'] });
            queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
            refreshPermissions();
            setMenuDialog(false);
            setSnackbar({ open: true, message: 'เพิ่มเมนูสำเร็จ!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' }),
    });

    const updateMenuMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<MenuItemType> }) => permissionsApi.updateMenuItem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menuItems'] });
            queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
            refreshPermissions();
            setMenuDialog(false);
            setEditingMenu(null);
            setSnackbar({ open: true, message: 'อัปเดตเมนูสำเร็จ!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' }),
    });

    const deleteMenuMutation = useMutation({
        mutationFn: (id: number) => permissionsApi.deleteMenuItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menuItems'] });
            queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
            refreshPermissions();
            setDeleteDialog(null);
            setSnackbar({ open: true, message: 'ลบเมนูสำเร็จ!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' }),
    });

    const initDefaultsMutation = useMutation({
        mutationFn: () => permissionsApi.initDefaultPermissions(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
            refreshPermissions();
            setSnackbar({ open: true, message: 'รีเซ็ตสิทธิ์เป็นค่าเริ่มต้นสำเร็จ!', severity: 'success' });
        },
    });

    // Handlers
    const handleToggle = (roleId: number, menuId: number, field: 'can_view' | 'can_edit' | 'can_delete') => {
        setLocalPermissions((prev) => {
            const updated = { ...prev };
            if (!updated[roleId]) updated[roleId] = {};
            if (!updated[roleId][menuId]) {
                updated[roleId][menuId] = { can_view: false, can_edit: false, can_delete: false };
            }
            updated[roleId][menuId] = { ...updated[roleId][menuId], [field]: !updated[roleId][menuId][field] };
            return updated;
        });
        setHasChanges(true);
    };

    const handleSaveAll = async () => {
        if (!matrix) return;

        for (const role of matrix) {
            const rolePerms = localPermissions[role.role_id];
            if (!rolePerms) continue;

            const permissions = Object.entries(rolePerms).map(([menuItemId, perms]) => ({
                menu_item_id: parseInt(menuItemId),
                can_view: perms.can_view,
                can_edit: perms.can_edit,
                can_delete: perms.can_delete,
            }));

            await bulkUpdateMutation.mutateAsync({ role_id: role.role_id, permissions });
        }
        setHasChanges(false);
    };

    const handleOpenCreateMenu = () => {
        setEditingMenu(null);
        setMenuForm({ name: '', display_name: '', path: '', icon: '', menu_type: 'menu', order: 0, is_visible: true, description: '' });
        setMenuDialog(true);
    };

    const handleOpenEditMenu = (item: MenuItemType) => {
        setEditingMenu(item);
        setMenuForm({ ...item });
        setMenuDialog(true);
    };

    const handleSubmitMenu = () => {
        if (editingMenu) {
            updateMenuMutation.mutate({ id: editingMenu.id, data: menuForm });
        } else {
            createMenuMutation.mutate(menuForm);
        }
    };

    // Separate menus and tabs
    const { mainMenus, tabMenus } = useMemo(() => {
        if (!menuItems) return { mainMenus: [], tabMenus: [] };
        return {
            mainMenus: menuItems.filter((m: MenuItemType) => m.menu_type === 'menu'),
            tabMenus: menuItems.filter((m: MenuItemType) => m.menu_type === 'tab'),
        };
    }, [menuItems]);

    const isLoading = matrixLoading || menusLoading;

    if (isLoading) {
        return (
            <Box>
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                ))}
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700} sx={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        🔐 จัดการสิทธิ์เมนู
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        กำหนดสิทธิ์การเข้าถึงเมนูและแท็บสำหรับแต่ละ Role
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" startIcon={<AddIcon />} onClick={handleOpenCreateMenu}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }} variant="outlined">
                        เพิ่มเมนู
                    </Button>
                    <Button size="small" startIcon={<RefreshIcon />} onClick={() => initDefaultsMutation.mutate()}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }} variant="outlined" color="warning">
                        รีเซ็ตค่าเริ่มต้น
                    </Button>
                    <Button size="small" startIcon={<SaveIcon />} onClick={handleSaveAll}
                        disabled={!hasChanges || bulkUpdateMutation.isPending}
                        variant="contained" color="primary"
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 600,
                            background: hasChanges ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : undefined,
                            '&:hover': { background: hasChanges ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : undefined },
                        }}>
                        {bulkUpdateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                    </Button>
                </Box>
            </Box>

            {hasChanges && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    ⚠️ มีการแก้ไขที่ยังไม่ได้บันทึก — กรุณากดปุ่ม "บันทึกทั้งหมด"
                </Alert>
            )}

            {/* Permission Matrix Table */}
            <Card sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
                <CardContent sx={{ p: 0 }}>
                    <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MenuIcon fontSize="small" color="primary" /> เมนูหลัก
                    </Typography>
                    <TableContainer sx={{ maxHeight: 500 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{
                                        fontWeight: 700, minWidth: 200, position: 'sticky', left: 0, zIndex: 3,
                                        bgcolor: isDark ? '#1e1b4b' : '#f1f5f9'
                                    }}>
                                        เมนู
                                    </TableCell>
                                    {matrix?.map((role: RolePermissionMatrix) => (
                                        <TableCell key={role.role_id} align="center" colSpan={3}
                                            sx={{
                                                fontWeight: 700, borderLeft: `2px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
                                                bgcolor: isDark ? '#1e1b4b' : '#f1f5f9'
                                            }}>
                                            <Chip label={role.role_display_name} size="small" color={
                                                role.role_name === 'admin' ? 'error' :
                                                    role.role_name === 'manager' ? 'warning' : 'info'
                                            } variant="outlined" />
                                        </TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e1b4b' : '#f1f5f9', minWidth: 100 }}>
                                        จัดการ
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{
                                        position: 'sticky', left: 0, zIndex: 3,
                                        bgcolor: isDark ? '#1e1b4b' : '#f1f5f9'
                                    }} />
                                    {matrix?.map((role: RolePermissionMatrix) => (
                                        <React.Fragment key={`sub-${role.role_id}`}>
                                            <TableCell align="center" sx={{
                                                fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary',
                                                borderLeft: `2px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
                                                bgcolor: isDark ? '#1e1b4b' : '#f1f5f9', py: 0.5
                                            }}>
                                                ดู
                                            </TableCell>
                                            <TableCell align="center" sx={{
                                                fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary',
                                                bgcolor: isDark ? '#1e1b4b' : '#f1f5f9', py: 0.5
                                            }}>
                                                แก้ไข
                                            </TableCell>
                                            <TableCell align="center" sx={{
                                                fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary',
                                                bgcolor: isDark ? '#1e1b4b' : '#f1f5f9', py: 0.5
                                            }}>
                                                ลบ
                                            </TableCell>
                                        </React.Fragment>
                                    ))}
                                    <TableCell sx={{ bgcolor: isDark ? '#1e1b4b' : '#f1f5f9' }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {mainMenus.map((menu: MenuItemType) => (
                                    <TableRow key={menu.id} hover>
                                        <TableCell sx={{
                                            position: 'sticky', left: 0, zIndex: 1,
                                            bgcolor: isDark ? '#0f172a' : '#ffffff'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {menu.is_visible ? <ViewIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> :
                                                    <HideIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>{menu.display_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{menu.path}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        {matrix?.map((role: RolePermissionMatrix) => {
                                            const perms = localPermissions[role.role_id]?.[menu.id] || { can_view: false, can_edit: false, can_delete: false };
                                            const isAdmin = role.role_name === 'admin';
                                            return (
                                                <React.Fragment key={`${role.role_id}-${menu.id}`}>
                                                    <TableCell align="center" sx={{ borderLeft: `2px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}` }}>
                                                        <Checkbox size="small" checked={perms.can_view} disabled={isAdmin}
                                                            onChange={() => handleToggle(role.role_id, menu.id, 'can_view')}
                                                            sx={{ color: '#22c55e', '&.Mui-checked': { color: '#22c55e' } }} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Checkbox size="small" checked={perms.can_edit} disabled={isAdmin}
                                                            onChange={() => handleToggle(role.role_id, menu.id, 'can_edit')}
                                                            sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Checkbox size="small" checked={perms.can_delete} disabled={isAdmin}
                                                            onChange={() => handleToggle(role.role_id, menu.id, 'can_delete')}
                                                            sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} />
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                <Tooltip title="แก้ไข">
                                                    <IconButton size="small" onClick={() => handleOpenEditMenu(menu)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="ลบ">
                                                    <IconButton size="small" color="error" onClick={() => setDeleteDialog(menu)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Tab Permissions */}
            {tabMenus.length > 0 && (
                <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <CardContent sx={{ p: 0 }}>
                        <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TabIcon fontSize="small" color="secondary" /> แท็บย่อย
                        </Typography>
                        <TableContainer sx={{ maxHeight: 400 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{
                                            fontWeight: 700, minWidth: 200, position: 'sticky', left: 0, zIndex: 3,
                                            bgcolor: isDark ? '#1e1b4b' : '#f1f5f9'
                                        }}>
                                            แท็บ
                                        </TableCell>
                                        {matrix?.map((role: RolePermissionMatrix) => (
                                            <TableCell key={role.role_id} align="center"
                                                sx={{
                                                    fontWeight: 700,
                                                    borderLeft: `2px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
                                                    bgcolor: isDark ? '#1e1b4b' : '#f1f5f9'
                                                }}>
                                                <Chip label={role.role_display_name} size="small" color={
                                                    role.role_name === 'admin' ? 'error' :
                                                        role.role_name === 'manager' ? 'warning' : 'info'
                                                } variant="outlined" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tabMenus.map((tab: MenuItemType) => {
                                        const parentMenu = mainMenus.find((m: MenuItemType) => m.id === tab.parent_id);
                                        return (
                                            <TableRow key={tab.id} hover>
                                                <TableCell sx={{
                                                    position: 'sticky', left: 0, zIndex: 1,
                                                    bgcolor: isDark ? '#0f172a' : '#ffffff'
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2 }}>
                                                        <TabIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={500}>{tab.display_name}</Typography>
                                                            <Typography variant="caption" color="text.disabled">
                                                                {parentMenu?.display_name} → {tab.path}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                {matrix?.map((role: RolePermissionMatrix) => {
                                                    const perms = localPermissions[role.role_id]?.[tab.id] || { can_view: false, can_edit: false, can_delete: false };
                                                    const isAdmin = role.role_name === 'admin';
                                                    return (
                                                        <TableCell key={`${role.role_id}-${tab.id}`} align="center"
                                                            sx={{ borderLeft: `2px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}` }}>
                                                            <Checkbox size="small" checked={perms.can_view} disabled={isAdmin}
                                                                onChange={() => handleToggle(role.role_id, tab.id, 'can_view')}
                                                                sx={{ color: '#22c55e', '&.Mui-checked': { color: '#22c55e' } }} />
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Add/Edit Menu Dialog */}
            <Dialog open={menuDialog} onClose={() => setMenuDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMenu ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Name (key)" fullWidth size="small" value={menuForm.name || ''}
                            disabled={!!editingMenu}
                            onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} />
                        <TextField label="Display Name" fullWidth size="small" value={menuForm.display_name || ''}
                            onChange={(e) => setMenuForm({ ...menuForm, display_name: e.target.value })} />
                        <TextField label="Path" fullWidth size="small" value={menuForm.path || ''}
                            onChange={(e) => setMenuForm({ ...menuForm, path: e.target.value })} />
                        <TextField label="Icon" fullWidth size="small" value={menuForm.icon || ''}
                            onChange={(e) => setMenuForm({ ...menuForm, icon: e.target.value })}
                            helperText="ชื่อ MUI Icon เช่น Dashboard, Computer, Storage" />
                        <FormControl size="small" fullWidth>
                            <InputLabel>ประเภท</InputLabel>
                            <Select value={menuForm.menu_type || 'menu'} label="ประเภท"
                                onChange={(e) => setMenuForm({ ...menuForm, menu_type: e.target.value })}>
                                <MenuItem value="menu">Menu</MenuItem>
                                <MenuItem value="tab">Tab</MenuItem>
                                <MenuItem value="page">Page</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Order" type="number" fullWidth size="small" value={menuForm.order || 0}
                            onChange={(e) => setMenuForm({ ...menuForm, order: parseInt(e.target.value) || 0 })} />
                        <TextField label="Description" fullWidth size="small" multiline rows={2} value={menuForm.description || ''}
                            onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />
                        <FormControlLabel
                            control={<Switch checked={menuForm.is_visible !== false}
                                onChange={(e) => setMenuForm({ ...menuForm, is_visible: e.target.checked })} />}
                            label="Visible"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMenuDialog(false)}>ยกเลิก</Button>
                    <Button variant="contained" onClick={handleSubmitMenu}
                        disabled={createMenuMutation.isPending || updateMenuMutation.isPending}>
                        {editingMenu ? 'บันทึก' : 'เพิ่ม'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
                <DialogTitle>ยืนยันการลบ</DialogTitle>
                <DialogContent>
                    <Typography>
                        คุณต้องการลบเมนู <strong>{deleteDialog?.display_name}</strong> ({deleteDialog?.path}) หรือไม่?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(null)}>ยกเลิก</Button>
                    <Button color="error" variant="contained"
                        onClick={() => deleteDialog && deleteMenuMutation.mutate(deleteDialog.id)}
                        disabled={deleteMenuMutation.isPending}>
                        ลบ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}
                    sx={{ borderRadius: 2 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
