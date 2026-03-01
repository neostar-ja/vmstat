import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Alert,
    Divider,
    Chip,
    Avatar,
} from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Badge as BadgeIcon,
    Lock as LockIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';

export default function ProfilePage() {
    const { user } = useAuthStore();
    
    // Password change form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const changePasswordMutation = useMutation({
        mutationFn: () => authApi.changePassword(currentPassword, newPassword),
        onSuccess: () => {
            setPasswordSuccess('Password changed successfully!');
            setPasswordError('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            setPasswordError(err.response?.data?.detail || 'Failed to change password');
            setPasswordSuccess('');
        },
    });

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('Please fill in all fields');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        changePasswordMutation.mutate();
    };

    const getRoleBadge = (role: string) => {
        const colors: Record<string, 'error' | 'warning' | 'info'> = {
            admin: 'error',
            manager: 'warning',
            viewer: 'info',
        };
        return (
            <Chip
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                color={colors[role] || 'info'}
                size="small"
            />
        );
    };

    return (
        <Box className="animate-fade-in">
            {/* Page Header */}
            <Box sx={{ mb: 4 }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                    gutterBottom
                >
                    👤 โปรไฟล์
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    ดูและจัดการข้อมูลบัญชีของคุณ
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Profile Information */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={600} mb={3}>
                                Account Information
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                                <Avatar
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        background: 'linear-gradient(135deg, #9333ea 0%, #f97316 100%)',
                                        fontSize: '2rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight={600}>
                                        {user?.full_name || user?.username}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        {user?.role && getRoleBadge(user.role)}
                                    </Box>
                                </Box>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <PersonIcon color="action" />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Username
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {user?.username}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <EmailIcon color="action" />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Email
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {user?.email}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <BadgeIcon color="action" />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Full Name
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {user?.full_name || 'Not set'}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Change Password */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <LockIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>
                                    Change Password
                                </Typography>
                            </Box>

                            {passwordError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {passwordError}
                                </Alert>
                            )}

                            {passwordSuccess && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    {passwordSuccess}
                                </Alert>
                            )}

                            <form onSubmit={handleChangePassword}>
                                <TextField
                                    label="Current Password"
                                    type="password"
                                    fullWidth
                                    value={currentPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                                    margin="normal"
                                    required
                                />
                                <TextField
                                    label="New Password"
                                    type="password"
                                    fullWidth
                                    value={newPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                                    margin="normal"
                                    required
                                    helperText="Minimum 8 characters"
                                />
                                <TextField
                                    label="Confirm New Password"
                                    type="password"
                                    fullWidth
                                    value={confirmPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                    margin="normal"
                                    required
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    sx={{ mt: 2 }}
                                    disabled={changePasswordMutation.isPending}
                                >
                                    Change Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
