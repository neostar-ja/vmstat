import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Alert,
    Grid,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    alpha,
} from '@mui/material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Wifi as TestIcon,
    VpnKey as KeyIcon,
    Person as PersonIcon,
    Login as LoginIcon,
} from '@mui/icons-material';
import { keycloakApi } from '../services/api';

interface AllowedUser {
    username: string;
    role: string;
}

interface KeycloakConfig {
    id?: number;
    is_enabled: boolean;
    server_url: string;
    realm: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    scope: string;
    default_role: string;
    auto_create_user: boolean;
    sync_user_info: boolean;
    allowed_users: AllowedUser[];
}

const defaultConfig: KeycloakConfig = {
    is_enabled: false,
    server_url: '',
    realm: '',
    client_id: 'vmstat',
    client_secret: '',
    redirect_uri: '',
    scope: 'openid profile email',
    default_role: 'viewer',
    auto_create_user: true,
    sync_user_info: true,
    allowed_users: [],
};

export default function KeycloakSettings() {
    const [config, setConfig] = useState<KeycloakConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    const [isNew, setIsNew] = useState(true);

    // Add user dialog
    const [addUserOpen, setAddUserOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newUserRole, setNewUserRole] = useState('viewer');

    // Test login dialog
    const [testLoginOpen, setTestLoginOpen] = useState(false);
    const [testLoginResult, setTestLoginResult] = useState<any>(null);
    const [testLoginLoading, setTestLoginLoading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await keycloakApi.getConfig();
            setConfig(res.data);
            setIsNew(false);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setConfig(defaultConfig);
                setIsNew(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config.server_url || !config.realm || !config.client_id || !config.redirect_uri) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน โดยเฉพาะ Redirect URI');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await keycloakApi.saveConfig(config);
            setSuccess('✅ บันทึกการตั้งค่า Keycloak สำเร็จ!');
            setIsNew(false);
            fetchConfig();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await keycloakApi.testConnection(config);
            setTestResult(res.data);
        } catch (err: any) {
            setTestResult({ success: false, message: err.response?.data?.detail || 'Connection failed' });
        } finally {
            setTesting(false);
        }
    };



    const handleRemoveUser = (username: string) => {
        setConfig({
            ...config,
            allowed_users: config.allowed_users.filter(u => u.username !== username),
        });
    };

    const handleTestSSO = async () => {
        setTestLoginLoading(true);
        setTestLoginResult(null);
        setError('');

        try {
            // 1. Get Auth URL
            const res = await keycloakApi.initiateLogin();
            const authUrl = res.data.auth_url;

            // 2. Open Popup
            const width = 500;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            const popup = window.open(
                authUrl,
                'keycloak_test',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // 3. Listen for message from popup
            const messageHandler = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;

                if (event.data?.type === 'KEYCLOAK_TEST_SUCCESS') {
                    const { code, state } = event.data;
                    popup?.close();
                    window.removeEventListener('message', messageHandler);

                    // 4. Verify Code (Exchange for token)
                    try {
                        const tokenRes = await keycloakApi.handleCallback(code, state);
                        setTestLoginResult({
                            success: true,
                            username: tokenRes.data.user.username,
                            email: tokenRes.data.user.email,
                            full_name: tokenRes.data.user.full_name,
                            role: tokenRes.data.user.role
                        });
                        setTestLoginOpen(true); // Open dialog to show result
                    } catch (err: any) {
                        setTestLoginResult({
                            success: false,
                            message: 'Token exchange failed: ' + (err.response?.data?.detail || err.message)
                        });
                        setTestLoginOpen(true);
                    } finally {
                        setTestLoginLoading(false);
                    }
                }
            };

            window.addEventListener('message', messageHandler);

            // Optional: Check if popup closed without success
            const timer = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(timer);
                    window.removeEventListener('message', messageHandler);
                    setTestLoginLoading(false);
                }
            }, 1000);

        } catch (err: any) {
            setError('Failed to start SSO test: ' + err.message);
            setTestLoginLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: 2,
                        background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <KeyIcon sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Keycloak SSO Configuration</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isNew ? 'ยังไม่ได้ตั้งค่า — กรอกข้อมูลด้านล่าง' : 'แก้ไขการตั้งค่า SSO'}
                        </Typography>
                    </Box>
                </Box>
                <FormControlLabel
                    control={
                        <Switch
                            checked={config.is_enabled}
                            onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                            color="success"
                        />
                    }
                    label={config.is_enabled ? '✅ เปิดใช้งาน' : '❌ ปิดใช้งาน'}
                    sx={{ fontWeight: 600 }}
                />
            </Box>

            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Connection Settings */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>🔗 Connection Settings</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Keycloak Server URL"
                                placeholder="https://keycloak.example.com"
                                value={config.server_url}
                                onChange={(e) => setConfig({ ...config, server_url: e.target.value })}
                                fullWidth size="small"
                                helperText="Keycloak server base URL (ไม่ต้องรวม /auth)"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Realm"
                                placeholder="WUH"
                                value={config.realm}
                                onChange={(e) => setConfig({ ...config, realm: e.target.value })}
                                fullWidth size="small"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Client ID"
                                placeholder="vmstat"
                                value={config.client_id}
                                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                                fullWidth size="small"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Client Secret"
                                type="password"
                                placeholder={isNew ? 'กรอก Client Secret' : 'เว้นว่างถ้าไม่ต้องการเปลี่ยน'}
                                value={config.client_secret === '••••••••' ? '' : config.client_secret}
                                onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                                fullWidth size="small"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Redirect URI"
                                placeholder="https://host/vmstat/login"
                                value={config.redirect_uri}
                                onChange={(e) => setConfig({ ...config, redirect_uri: e.target.value })}
                                fullWidth size="small"
                                required
                                error={!config.redirect_uri && !isNew}
                                helperText={!config.redirect_uri && !isNew ? "กรุณากรอก Redirect URI (เช่น https://10.251.150.222:3345/vmstat/login)" : "URL ที่ Keycloak จะ redirect กลับมาหลัง login (ต้องตรงกับ Keycloak)"}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Scope"
                                value={config.scope}
                                onChange={(e) => setConfig({ ...config, scope: e.target.value })}
                                fullWidth size="small"
                            />
                        </Grid>
                    </Grid>

                    {/* Test Connection */}
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
                            onClick={handleTestConnection}
                            disabled={testing || !config.server_url || !config.realm}
                            size="small"
                        >
                            {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                        </Button>
                        {testResult && (
                            <Chip
                                icon={testResult.success ? <SuccessIcon /> : <ErrorIcon />}
                                label={testResult.message}
                                color={testResult.success ? 'success' : 'error'}
                                variant="outlined"
                                size="small"
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* User Settings */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>👤 User Settings</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Default Role</InputLabel>
                                <Select
                                    value={config.default_role}
                                    onChange={(e) => setConfig({ ...config, default_role: e.target.value })}
                                    label="Default Role"
                                >
                                    <MenuItem value="admin">Admin</MenuItem>
                                    <MenuItem value="manager">Manager</MenuItem>
                                    <MenuItem value="viewer">Viewer</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.auto_create_user}
                                        onChange={(e) => setConfig({ ...config, auto_create_user: e.target.checked })}
                                    />
                                }
                                label="สร้างผู้ใช้อัตโนมัติ"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.sync_user_info}
                                        onChange={(e) => setConfig({ ...config, sync_user_info: e.target.checked })}
                                    />
                                }
                                label="ซิงค์ข้อมูลผู้ใช้"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Allowed Users */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>🛡️ Allowed Users</Typography>
                            <Typography variant="body2" color="text.secondary">
                                ผู้ใช้ Keycloak ที่ได้รับอนุญาตให้เข้าสู่ระบบ
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setAddUserOpen(true)}
                            size="small"
                            sx={{
                                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #9333ea 0%, #db2777 100%)' },
                            }}
                        >
                            เพิ่มผู้ใช้
                        </Button>
                    </Box>

                    {config.allowed_users.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            ยังไม่มีผู้ใช้ — เพิ่มผู้ใช้ Keycloak ที่อนุญาตให้เข้าสู่ระบบ
                        </Alert>
                    ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {config.allowed_users.map((user) => (
                                <Chip
                                    key={user.username}
                                    icon={<PersonIcon />}
                                    label={
                                        <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                                            onClick={() => {
                                                setNewUsername(user.username);
                                                setNewUserRole(user.role);
                                                setAddUserOpen(true);
                                            }}
                                        >
                                            <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{user.username}</span>
                                            <Chip
                                                label={user.role}
                                                size="small"
                                                color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'info'}
                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                            />
                                        </Box>
                                    }
                                    onDelete={() => handleRemoveUser(user.username)}
                                    deleteIcon={<DeleteIcon />}
                                    sx={{
                                        py: 2,
                                        borderRadius: 2,
                                        border: `1px solid`,
                                        borderColor: alpha('#a855f7', 0.3),
                                        bgcolor: alpha('#a855f7', 0.05),
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #0284c7 0%, #16a34a 100%)' },
                        px: 4,
                    }}
                >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<LoginIcon />}
                    onClick={handleTestSSO}
                    disabled={isNew || !config.is_enabled || testLoginLoading}
                >
                    {testLoginLoading ? 'กำลังทดสอบ...' : 'ทดสอบ SSO Login'}
                </Button>
            </Box>

            {/* Add/Edit User Dialog */}
            <Dialog open={addUserOpen} onClose={() => setAddUserOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {config.allowed_users.some(u => u.username === newUsername) ? 'แก้ไขสิทธิ์ผู้ใช้' : 'เพิ่มผู้ใช้ Keycloak'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        label="Keycloak Username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        fullWidth
                        sx={{ mb: 2, mt: 1 }}
                        size="small"
                        placeholder="กรอกชื่อผู้ใช้จาก Keycloak"
                        disabled={config.allowed_users.some(u => u.username === newUsername)} // Disable username edit if it exists (editing role only)
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            label="Role"
                        >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="manager">Manager</MenuItem>
                            <MenuItem value="viewer">Viewer</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => {
                        setAddUserOpen(false);
                        setNewUsername('');
                        setNewUserRole('viewer');
                    }}>ยกเลิก</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            // Check if user exists to determine if we are editing or adding
                            const existingUserIndex = config.allowed_users.findIndex(u => u.username === newUsername);

                            let newAllowedUsers = [...config.allowed_users];
                            if (existingUserIndex >= 0) {
                                // Edit existing
                                newAllowedUsers[existingUserIndex] = { username: newUsername, role: newUserRole };
                            } else {
                                // Add new
                                newAllowedUsers.push({ username: newUsername.trim(), role: newUserRole });
                            }

                            setConfig({
                                ...config,
                                allowed_users: newAllowedUsers,
                            });

                            setNewUsername('');
                            setNewUserRole('viewer');
                            setAddUserOpen(false);
                        }}
                        disabled={!newUsername.trim()}
                        sx={{
                            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #9333ea 0%, #db2777 100%)' },
                        }}
                    >
                        {config.allowed_users.some(u => u.username === newUsername) ? 'บันทึก' : 'เพิ่ม'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Test Result Dialog */}
            <Dialog open={testLoginOpen} onClose={() => { setTestLoginOpen(false); setTestLoginResult(null); }} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>ผลการทดสอบ SSO Login</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {testLoginResult ? (
                        <Alert
                            severity={testLoginResult.success ? 'success' : 'error'}
                            sx={{ mt: 2, borderRadius: 2 }}
                        >
                            {testLoginResult.success ? (
                                <>
                                    ✅ Login สำเร็จ!<br />
                                    Username: <strong>{testLoginResult.username}</strong><br />
                                    Email: {testLoginResult.email || '-'}<br />
                                    Name: {testLoginResult.full_name || '-'}
                                </>
                            ) : (
                                `❌ ${testLoginResult.message}`
                            )}
                        </Alert>
                    ) : (
                        <Typography>กำลังรอผลการทดสอบ...</Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setTestLoginOpen(false); setTestLoginResult(null); }}>ปิด</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
