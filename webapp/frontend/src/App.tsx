import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { PermissionProvider, usePermissions } from './contexts/PermissionContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VMListPage from './pages/VMListPage';
import VMDetailPage from './pages/VMDetailPage';
import VMListPage2 from './pages/VMListPage2';
import VMListPage3 from './pages/VMListPage3';
import VMDetailPage2 from './pages/VMDetailPage2';
import GroupsPage from './pages/GroupsPage';
import HostsPage from './pages/HostsPageNew';
import HostDetailPage from './pages/HostDetailPage';
import AlarmsPage from './pages/AlarmsPage';
import AlarmDetailPage from './pages/AlarmDetailPage';
import DataStorePage from './pages/DataStorePage';
import DataStoreDetailPage from './pages/DataStoreDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import SyncPage from './pages/SyncPage';
import ProfilePage from './pages/ProfilePage';
import VMReportIntelligencePage from './pages/VMReportIntelligencePage';
import { Box, Typography, Button, alpha } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useIdleTimer } from './hooks/useIdleTimer';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

// Permission-based Route wrapper
function PermissionRoute({ children, menuPath }: { children: React.ReactNode; menuPath: string }) {
    const { isAuthenticated } = useAuthStore();
    const { canViewMenu } = usePermissions();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!canViewMenu(menuPath)) {
        return <AccessDeniedPage />;
    }

    return <>{children}</>;
}

// Access Denied page
function AccessDeniedPage() {
    const location = useLocation();
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 3,
                textAlign: 'center',
                p: 4,
            }}
        >
            <Box
                sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${alpha('#ef4444', 0.15)} 0%, ${alpha('#dc2626', 0.1)} 100%)`,
                    border: `2px solid ${alpha('#ef4444', 0.3)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                }}
            >
                <LockIcon sx={{ fontSize: 48, color: '#ef4444', filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))' }} />
            </Box>
            <Typography variant="h4" fontWeight={800} color="error.main">
                Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={400}>
                คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง
            </Typography>
            <Typography variant="caption" color="text.disabled">
                Path: {location.pathname}
            </Typography>
            <Button
                variant="contained"
                onClick={() => window.history.back()}
                sx={{
                    mt: 1,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    },
                }}
            >
                กลับหน้าก่อนหน้า
            </Button>
        </Box>
    );
}

// Public Route wrapper (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

// Idle Monitor Component
function IdleMonitor() {
    const { logout, isAuthenticated } = useAuthStore();

    // 30 minutes = 30 * 60 * 1000 ms
    useIdleTimer(() => {
        if (isAuthenticated) {
            console.log('User idle for 30 minutes, logging out...');
            logout();
            window.location.href = '/login';
        }
    }, 30 * 60 * 1000);

    return null;
}

export default function App() {
    return (
        <PermissionProvider>
            <IdleMonitor />
            <Routes>
                {/* Public routes */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />

                {/* Protected routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="/vms" element={
                        <PermissionRoute menuPath="/vms"><VMListPage /></PermissionRoute>
                    } />
                    <Route path="/vms/:vmUuid" element={
                        <PermissionRoute menuPath="/vms"><VMDetailPage /></PermissionRoute>
                    } />
                    <Route path="/vms2" element={
                        <PermissionRoute menuPath="/vms"><VMListPage2 /></PermissionRoute>
                    } />
                    <Route path="/vms3" element={
                        <PermissionRoute menuPath="/vms"><VMListPage3 /></PermissionRoute>
                    } />
                    <Route path="/vm2/:vmUuid" element={
                        <PermissionRoute menuPath="/vms"><VMDetailPage2 /></PermissionRoute>
                    } />
                    <Route path="/groups" element={
                        <PermissionRoute menuPath="/groups"><GroupsPage /></PermissionRoute>
                    } />
                    <Route path="/hosts" element={
                        <PermissionRoute menuPath="/hosts"><HostsPage /></PermissionRoute>
                    } />
                    <Route path="/hosts/:hostId" element={
                        <PermissionRoute menuPath="/hosts"><HostDetailPage /></PermissionRoute>
                    } />
                    <Route path="/alarms" element={
                        <PermissionRoute menuPath="/alarms"><AlarmsPage /></PermissionRoute>
                    } />
                    <Route path="/alarms/:alarmId" element={
                        <PermissionRoute menuPath="/alarms"><AlarmDetailPage /></PermissionRoute>
                    } />
                    <Route path="/datastores" element={
                        <PermissionRoute menuPath="/datastores"><DataStorePage /></PermissionRoute>
                    } />
                    <Route path="/datastores/:datastoreId" element={
                        <PermissionRoute menuPath="/datastores"><DataStoreDetailPage /></PermissionRoute>
                    } />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/vmreport" element={
                        <PermissionRoute menuPath="/vmreport"><VMReportIntelligencePage /></PermissionRoute>
                    } />

                    {/* Admin routes - permission checked */}
                    <Route path="/admin/users" element={
                        <PermissionRoute menuPath="/admin/users"><UserManagementPage /></PermissionRoute>
                    } />
                    <Route path="/admin/settings" element={
                        <PermissionRoute menuPath="/admin/settings"><AdminSettingsPage /></PermissionRoute>
                    } />
                    <Route path="/admin/sync" element={
                        <PermissionRoute menuPath="/admin/sync"><SyncPage /></PermissionRoute>
                    } />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </PermissionProvider>
    );
}
