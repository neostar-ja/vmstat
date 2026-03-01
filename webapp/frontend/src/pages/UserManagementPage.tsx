import React, { useState } from 'react';
import { Tabs, Tab } from '@mui/material';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Alert,
    Skeleton,
    Tooltip,
    Grid,
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    LockReset as ResetIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
    SupervisorAccount as ManagerIcon,
    Visibility as ViewerIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import type { User } from '../types';
import MenuPermissionManagement from '../components/MenuPermissionManagement';

interface UserFormData {
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: string;
    is_active: boolean;
}

const emptyForm: UserFormData = {
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'viewer',
    is_active: true,
};

export default function UserManagementPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>(emptyForm);
    const [formError, setFormError] = useState('');

    const [deleteDialog, setDeleteDialog] = useState(false);
    const [resetDialog, setResetDialog] = useState(false);
    const [tempPassword, setTempPassword] = useState('');

    // Fetch users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['admin-users', page, pageSize, search, roleFilter],
        queryFn: () => adminApi.getUsers({
            page: page + 1,
            page_size: pageSize,
            search: search || undefined,
            role: roleFilter || undefined,
            is_active: showInactive ? undefined : true,
        }),
    });

    const users: User[] = usersData?.data?.items || [];
    const total = usersData?.data?.total || 0;

    // Mutations
    const createUserMutation = useMutation({
        mutationFn: (data: UserFormData) => adminApi.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            handleCloseDialog();
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            setFormError(err.response?.data?.detail || 'Failed to create user');
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<UserFormData> }) =>
            adminApi.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            handleCloseDialog();
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            setFormError(err.response?.data?.detail || 'Failed to update user');
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: number) => adminApi.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setDeleteDialog(false);
            setSelectedUser(null);
            // Show success message? existing code doesn't have snackbar here, could add one if needed
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            // Re-use logic or add a snackbar for error
            alert(`Failed to delete user: ${err.response?.data?.detail || err.message}`);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: (id: number) => adminApi.resetPassword(id),
        onSuccess: (response: { data: { temporary_password: string } }) => {
            setTempPassword(response.data.temporary_password);
        },
    });

    // Handlers
    const handleOpenCreate = () => {
        setDialogMode('create');
        setFormData(emptyForm);
        setFormError('');
        setOpenDialog(true);
    };

    const handleOpenEdit = (user: User) => {
        setDialogMode('edit');
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            full_name: user.full_name || '',
            password: '',
            role: user.role,
            is_active: user.is_active,
        });
        setFormError('');
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedUser(null);
        setFormData(emptyForm);
        setFormError('');
    };

    const handleSubmit = () => {
        if (dialogMode === 'create') {
            if (!formData.username || !formData.email || !formData.password) {
                setFormError('Please fill in all required fields');
                return;
            }
            createUserMutation.mutate(formData);
        } else if (selectedUser) {
            const updateData: Partial<UserFormData> = {
                email: formData.email,
                full_name: formData.full_name,
                role: formData.role,
                is_active: formData.is_active,
            };
            if (formData.password) {
                updateData.password = formData.password;
            }
            updateUserMutation.mutate({ id: selectedUser.id, data: updateData });
        }
    };

    const handleOpenDelete = (user: User) => {
        setSelectedUser(user);
        setDeleteDialog(true);
    };

    const handleOpenReset = (user: User) => {
        setSelectedUser(user);
        setTempPassword('');
        setResetDialog(true);
    };

    const handleConfirmReset = () => {
        if (selectedUser) {
            resetPasswordMutation.mutate(selectedUser.id);
        }
    };

    const getRoleChip = (role: string) => {
        const config: Record<string, { color: 'error' | 'warning' | 'info'; icon: JSX.Element }> = {
            admin: { color: 'error', icon: <AdminIcon sx={{ fontSize: 16 }} /> },
            manager: { color: 'warning', icon: <ManagerIcon sx={{ fontSize: 16 }} /> },
            viewer: { color: 'info', icon: <ViewerIcon sx={{ fontSize: 16 }} /> },
        };
        const cfg = config[role] || config.viewer;
        return (
            <Chip
                icon={cfg.icon}
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                size="small"
                color={cfg.color}
                variant="outlined"
            />
        );
    };

    const [activeTab, setActiveTab] = useState(0);

    return (
        <Box className="animate-fade-in">
            {/* Page Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                        gutterBottom
                    >
                        👥 จัดการผู้ใช้งาน
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึงระบบ
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    sx={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                        fontWeight: 600,
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                        },
                        transition: 'all 0.3s ease',
                    }}
                >
                    เพิ่มผู้ใช้งาน
                </Button>
            </Box>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="👥 ผู้ใช้งาน" sx={{ fontWeight: 600, textTransform: 'none' }} />
                <Tab label="🔐 สิทธิ์เมนู" sx={{ fontWeight: 600, textTransform: 'none' }} />
            </Tabs>

            {activeTab === 1 ? (
                <MenuPermissionManagement />
            ) : (
                <>

                    {/* Filters */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <TextField
                                    placeholder="Search users..."
                                    size="small"
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setSearch(e.target.value);
                                        setPage(0);
                                    }}
                                    sx={{ minWidth: 250, flex: 1 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Role</InputLabel>
                                    <Select
                                        value={roleFilter}
                                        label="Role"
                                        onChange={(e: { target: { value: string } }) => {
                                            setRoleFilter(e.target.value);
                                            setPage(0);
                                        }}
                                    >
                                        <MenuItem value="">All Roles</MenuItem>
                                        <MenuItem value="admin">Admin</MenuItem>
                                        <MenuItem value="manager">Manager</MenuItem>
                                        <MenuItem value="viewer">Viewer</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={showInactive}
                                            onChange={(e) => setShowInactive(e.target.checked)}
                                        />
                                    }
                                    label="Show Deleted Users"
                                />
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Users Table */}
                    <Card>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading ? (
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={i}>
                                                {[...Array(6)].map((_, j) => (
                                                    <TableCell key={j}><Skeleton /></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                                <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                                <Typography color="text.secondary">
                                                    No users found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                background: 'linear-gradient(135deg, #9333ea 0%, #f97316 100%)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontWeight: 600,
                                                                fontSize: '0.875rem',
                                                            }}
                                                        >
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={500}>
                                                                {user.username}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {user.full_name || 'No name'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>{getRoleChip(user.role)}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={user.is_active ? 'Active' : 'Inactive'}
                                                        size="small"
                                                        color={user.is_active ? 'success' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {new Date(user.created_at).toLocaleDateString('th-TH')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                        <Tooltip title="Edit">
                                                            <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Reset Password">
                                                            <IconButton size="small" onClick={() => handleOpenReset(user)}>
                                                                <ResetIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleOpenDelete(user)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
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
                            count={total}
                            page={page}
                            onPageChange={(_: unknown, newPage: number) => setPage(newPage)}
                            rowsPerPage={pageSize}
                            onRowsPerPageChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setPageSize(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[10, 20, 50]}
                        />
                    </Card>

                    {/* Create/Edit Dialog */}
                    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                        <DialogTitle>
                            {dialogMode === 'create' ? 'Create New User' : 'Edit User'}
                        </DialogTitle>
                        <DialogContent>
                            {formError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {formError}
                                </Alert>
                            )}
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Username"
                                        fullWidth
                                        required
                                        disabled={dialogMode === 'edit'}
                                        value={formData.username}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Email"
                                        type="email"
                                        fullWidth
                                        required
                                        value={formData.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Full Name"
                                        fullWidth
                                        value={formData.full_name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label={dialogMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
                                        type="password"
                                        fullWidth
                                        required={dialogMode === 'create'}
                                        value={formData.password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Role</InputLabel>
                                        <Select
                                            value={formData.role}
                                            label="Role"
                                            onChange={(e: { target: { value: string } }) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <MenuItem value="admin">Admin</MenuItem>
                                            <MenuItem value="manager">Manager</MenuItem>
                                            <MenuItem value="viewer">Viewer</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.is_active}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                                            />
                                        }
                                        label="Active"
                                        sx={{ mt: 1 }}
                                    />
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDialog}>Cancel</Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                            >
                                {dialogMode === 'create' ? 'Create' : 'Save'}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
                                This will deactivate the account.
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
                            <Button
                                color="error"
                                variant="contained"
                                onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
                                disabled={deleteUserMutation.isPending}
                            >
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Reset Password Dialog */}
                    <Dialog open={resetDialog} onClose={() => setResetDialog(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogContent>
                            {tempPassword ? (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Password has been reset for <strong>{selectedUser?.username}</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                        Temporary password: <strong>{tempPassword}</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Please share this password securely with the user.
                                    </Typography>
                                </Alert>
                            ) : (
                                <Typography sx={{ mt: 2 }}>
                                    Are you sure you want to reset the password for <strong>{selectedUser?.username}</strong>?
                                    A new temporary password will be generated.
                                </Typography>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setResetDialog(false)}>
                                {tempPassword ? 'Close' : 'Cancel'}
                            </Button>
                            {!tempPassword && (
                                <Button
                                    variant="contained"
                                    onClick={handleConfirmReset}
                                    disabled={resetPasswordMutation.isPending}
                                >
                                    Reset Password
                                </Button>
                            )}
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Box>
    );
}
