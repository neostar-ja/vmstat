import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Divider,
    alpha,
    Fade,
    Tooltip,
    Zoom,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Person as PersonIcon,
    Lock as LockIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    VpnKey as KeycloakIcon,
    Computer as VmIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { authApi, keycloakApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const { mode, toggleTheme } = useThemeStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [keycloakEnabled, setKeycloakEnabled] = useState(false);
    const [keycloakLoading, setKeycloakLoading] = useState(false);

    // Fetch Keycloak public config on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await keycloakApi.getPublicConfig();
                setKeycloakEnabled(res.data?.is_enabled ?? false);
            } catch {
                setKeycloakEnabled(false);
            }
        };
        fetchConfig();
    }, []);

    // Handle Keycloak OAuth callback (code + state in URL)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (code && state) {
            // Check if running in a popup (for testing from Admin Settings)
            if (window.opener && window.opener !== window) {
                window.opener.postMessage({ type: 'KEYCLOAK_TEST_SUCCESS', code, state }, window.location.origin);
                window.close();
                return;
            }
            handleKeycloakCallback(code, state);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleKeycloakCallback = async (code: string, state: string) => {
        setKeycloakLoading(true);
        setError('');
        try {
            const response = await keycloakApi.handleCallback(code, state);
            const { access_token, user } = response.data;
            login(access_token, {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
            });
            // Store menu permissions if available
            if (user.menu_permissions) {
                useAuthStore.getState().setMenuPermissions(user.menu_permissions);
            }
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/');
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'Keycloak SSO ล้มเหลว กรุณาลองใหม่';
            setError(`❌ ${detail}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
            setKeycloakLoading(false);
        }
    };

    const loginMutation = useMutation({
        mutationFn: () => authApi.login(username, password),
        onSuccess: async (response) => {
            const token = response.data.access_token;
            try {
                const userResponse = await authApi.getMe(token);
                login(token, userResponse.data);
                navigate('/');
            } catch {
                login(token, { id: 0, username, email: '', full_name: null, role: 'viewer' });
                navigate('/');
            }
        },
        onError: (err: Error & { response?: { data?: { detail?: string }; status?: number } }) => {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;

            // Handle specific error cases
            if (status === 401) {
                setError('❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
            } else if (status === 404) {
                setError('❌ ไม่พบบัญชีผู้ใช้งานนี้ในระบบ');
            } else if (status === 403) {
                setError('🚫 บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
            } else if (status === 429) {
                setError('⏱️ คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่');
            } else if (detail) {
                setError(`⚠️ ${detail}`);
            } else {
                setError('❌ เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            }
        },
    });

    const validateForm = (): boolean => {
        let isValid = true;

        // Reset errors
        setError('');
        setUsernameError('');
        setPasswordError('');

        // Validate username
        if (!username.trim()) {
            setUsernameError('กรุณากรอกชื่อผู้ใช้งาน');
            isValid = false;
        } else if (username.length < 3) {
            setUsernameError('ชื่อผู้ใช้งานต้องมีอย่างน้อย 3 ตัวอักษร');
            isValid = false;
        }

        // Validate password
        if (!password) {
            setPasswordError('กรุณากรอกรหัสผ่าน');
            isValid = false;
        } else if (password.length < 4) {
            setPasswordError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        loginMutation.mutate();
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
        if (usernameError) setUsernameError('');
        if (error) setError('');
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (passwordError) setPasswordError('');
        if (error) setError('');
    };

    const handleKeycloakLogin = async () => {
        if (!keycloakEnabled) {
            setError('ℹ️ ระบบ Keycloak SSO ยังไม่ได้เปิดใช้งาน กรุณาตั้งค่าในหน้า Admin');
            return;
        }
        setKeycloakLoading(true);
        setError('');
        try {
            const res = await keycloakApi.initiateLogin();
            // Redirect to Keycloak login page
            window.location.href = res.data.auth_url;
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'ไม่สามารถเชื่อมต่อ Keycloak ได้';
            setError(`❌ ${detail}`);
            setKeycloakLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: mode === 'dark'
                    ? 'linear-gradient(135deg, #0c1929 0%, #0f172a 50%, #1e1b4b 100%)'
                    : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
                p: 2,
            }}
        >
            {/* Enhanced Animated Background Elements */}
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {/* Multiple Gradient Orbs */}
                <Box
                    className="orb-1"
                    sx={{
                        position: 'absolute',
                        top: '-20%',
                        right: '-10%',
                        width: '50vw',
                        height: '50vw',
                        borderRadius: '50%',
                        background: mode === 'dark'
                            ? 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, transparent 70%)',
                        filter: 'blur(80px)',
                        animation: 'float-orb-1 20s ease-in-out infinite',
                    }}
                />
                <Box
                    className="orb-2"
                    sx={{
                        position: 'absolute',
                        bottom: '-30%',
                        left: '-15%',
                        width: '60vw',
                        height: '60vw',
                        borderRadius: '50%',
                        background: mode === 'dark'
                            ? 'radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
                        filter: 'blur(90px)',
                        animation: 'float-orb-2 25s ease-in-out infinite',
                    }}
                />
                <Box
                    className="orb-3"
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '40vw',
                        height: '40vw',
                        borderRadius: '50%',
                        background: mode === 'dark'
                            ? 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)',
                        filter: 'blur(70px)',
                        animation: 'float-orb-3 18s ease-in-out infinite',
                        transform: 'translate(-50%, -50%)',
                    }}
                />

                {/* Animated Particles */}
                {[...Array(20)].map((_, i) => (
                    <Box
                        key={i}
                        className={`particle particle-${i}`}
                        sx={{
                            position: 'absolute',
                            width: Math.random() * 6 + 2,
                            height: Math.random() * 6 + 2,
                            borderRadius: '50%',
                            background: mode === 'dark'
                                ? `rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 255, ${Math.random() * 0.3 + 0.2})`
                                : `rgba(14, 165, 233, ${Math.random() * 0.3 + 0.1})`,
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animation: `particle-float ${Math.random() * 10 + 10}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}

                {/* Enhanced Grid Pattern */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: mode === 'dark'
                            ? `linear-gradient(rgba(14, 165, 233, 0.03) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(14, 165, 233, 0.03) 1px, transparent 1px)`
                            : `linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                        animation: 'grid-move 20s linear infinite',
                    }}
                />
            </Box>

            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'โหมดสว่าง ☀️' : 'โหมดมืด 🌙'} arrow placement="left">
                <IconButton
                    onClick={toggleTheme}
                    sx={{
                        position: 'absolute',
                        top: 24,
                        right: 24,
                        zIndex: 10,
                        bgcolor: mode === 'dark' ? alpha('#fff', 0.08) : alpha('#fff', 0.9),
                        backdropFilter: 'blur(20px)',
                        width: 50,
                        height: 50,
                        boxShadow: mode === 'dark'
                            ? '0 8px 24px rgba(0,0,0,0.3)'
                            : '0 8px 24px rgba(0,0,0,0.1)',
                        border: `1px solid ${mode === 'dark' ? alpha('#fff', 0.1) : alpha('#0ea5e9', 0.2)}`,
                        '&:hover': {
                            bgcolor: mode === 'dark' ? alpha('#fff', 0.12) : alpha('#fff', 0.95),
                            transform: 'scale(1.1) rotate(15deg)',
                            boxShadow: mode === 'dark'
                                ? '0 12px 32px rgba(0,0,0,0.4)'
                                : '0 12px 32px rgba(0,0,0,0.15)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {mode === 'dark' ? (
                        <LightModeIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
                    ) : (
                        <DarkModeIcon sx={{ color: '#6366f1', fontSize: 24 }} />
                    )}
                </IconButton>
            </Tooltip>

            {/* Centered Content */}
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 520,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <Fade in timeout={800}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        {/* Hospital Logo - Enhanced */}
                        <Zoom in timeout={1000}>
                            <Box
                                sx={{
                                    mb: 2.5,
                                    display: 'inline-flex',
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: -15,
                                        borderRadius: '50%',
                                        background: mode === 'dark'
                                            ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(34, 197, 94, 0.12) 100%)'
                                            : 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)',
                                        filter: 'blur(30px)',
                                        animation: 'pulse-glow 3s ease-in-out infinite',
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: 'transparent',
                                        position: 'relative',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: '50%',
                                            padding: 2,
                                            background: 'linear-gradient(135deg, #0ea5e9, #22c55e)',
                                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                            WebkitMaskComposite: 'xor',
                                            maskComposite: 'exclude',
                                            animation: 'rotate-border 8s linear infinite',
                                        }
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src="/vmstat/wuh_logo.png"
                                        alt="Walailak University Hospital"
                                        sx={{
                                            width: 100,
                                            height: 100,
                                            objectFit: 'contain',
                                            position: 'relative',
                                            zIndex: 1,
                                            filter: mode === 'dark'
                                                ? 'brightness(1.1) drop-shadow(0 0 20px rgba(255,255,255,0.2))'
                                                : 'drop-shadow(0 0 20px rgba(14,165,233,0.2))',
                                            animation: 'float-logo 4s ease-in-out infinite',
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Zoom>

                        {/* Title */}
                        <Typography
                            variant="h3"
                            fontWeight={900}
                            sx={{
                                mb: 1,
                                background: mode === 'dark'
                                    ? 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #a855f7 100%)'
                                    : 'linear-gradient(135deg, #0369a1 0%, #15803d 50%, #7e22ce 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.02em',
                                textShadow: mode === 'dark' ? '0 0 40px rgba(14,165,233,0.3)' : 'none',
                                animation: 'gradient-shift 5s ease infinite',
                                backgroundSize: '200% 200%',
                                fontSize: { xs: '2rem', sm: '2.5rem' },
                            }}
                        >
                            VM Stat
                        </Typography>

                        <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            color="text.primary"
                            sx={{
                                mb: 0.5,
                                lineHeight: 1.3,
                                fontSize: { xs: '0.95rem', sm: '1rem' },
                            }}
                        >
                            ระบบตรวจสอบทรัพยากร Virtual Machine
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                mb: 2.5,
                                fontWeight: 500,
                                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                            }}
                        >
                            Virtual Machine Statistics System
                        </Typography>
                    </Box>
                </Fade>

                {/* Login Form Card */}
                <Fade in timeout={1000}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 5,
                            background: mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#1e293b', 0.95)} 0%, ${alpha('#1e1b4b', 0.9)} 100%)`
                                : alpha('#fff', 0.98),
                            backdropFilter: 'blur(30px)',
                            border: `2px solid ${mode === 'dark' ? alpha('#0ea5e9', 0.2) : alpha('#0ea5e9', 0.15)}`,
                            boxShadow: mode === 'dark'
                                ? '0 30px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                                : '0 30px 90px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: 'linear-gradient(90deg, #0ea5e9 0%, #22c55e 50%, #a855f7 100%)',
                                animation: 'gradient-shift 3s ease infinite',
                                backgroundSize: '200% 100%',
                            },
                        }}
                    >
                        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                            {/* Login Header */}
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Zoom in timeout={800}>
                                    <Box
                                        sx={{
                                            width: 60,
                                            height: 60,
                                            mx: 'auto',
                                            mb: 2,
                                            borderRadius: 3,
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 12px 35px rgba(14, 165, 233, 0.4)',
                                            position: 'relative',
                                            animation: 'pulse-shadow 2s ease-in-out infinite',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                inset: -2,
                                                borderRadius: 'inherit',
                                                padding: 1.5,
                                                background: 'linear-gradient(135deg, #0ea5e9, #22c55e)',
                                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                                WebkitMaskComposite: 'xor',
                                                maskComposite: 'exclude',
                                                opacity: 0.5,
                                            }
                                        }}
                                    >
                                        <VmIcon sx={{ fontSize: 32, color: '#fff' }} />
                                    </Box>
                                </Zoom>
                                <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.01em' }}>
                                    เข้าสู่ระบบ
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                    กรุณาใส่ข้อมูลประจำตัวของคุณ
                                </Typography>
                            </Box>

                            {error && (
                                <Alert
                                    severity={error.includes('ℹ️') ? 'info' : 'error'}
                                    sx={{
                                        mb: 3,
                                        borderRadius: 2.5,
                                        border: error.includes('ℹ️')
                                            ? `1px solid ${alpha('#3b82f6', 0.3)}`
                                            : `1px solid ${alpha('#ef4444', 0.3)}`,
                                        '& .MuiAlert-icon': { alignItems: 'center' },
                                        animation: 'shake 0.5s ease-in-out',
                                        '@keyframes shake': {
                                            '0%, 100%': { transform: 'translateX(0)' },
                                            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                                            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
                                        },
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit}>
                                <TextField
                                    label="ชื่อผู้ใช้งาน"
                                    placeholder="กรอกชื่อผู้ใช้งานของคุณ"
                                    fullWidth
                                    value={username}
                                    onChange={handleUsernameChange}
                                    error={!!usernameError}
                                    helperText={usernameError}
                                    sx={{
                                        mb: 2,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2.5,
                                            '&:hover': {
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'primary.main',
                                                },
                                            },
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Box
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 1.5,
                                                        background: usernameError
                                                            ? alpha('#ef4444', 0.1)
                                                            : alpha('#0ea5e9', 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <PersonIcon sx={{
                                                        color: usernameError ? '#ef4444' : 'primary.main',
                                                        fontSize: 20
                                                    }} />
                                                </Box>
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <TextField
                                    label="รหัสผ่าน"
                                    placeholder="กรอกรหัสผ่านของคุณ"
                                    type={showPassword ? 'text' : 'password'}
                                    fullWidth
                                    value={password}
                                    onChange={handlePasswordChange}
                                    error={!!passwordError}
                                    helperText={passwordError}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2.5,
                                            '&:hover': {
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'primary.main',
                                                },
                                            },
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Box
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 1.5,
                                                        background: passwordError
                                                            ? alpha('#ef4444', 0.1)
                                                            : alpha('#0ea5e9', 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <LockIcon sx={{
                                                        color: passwordError ? '#ef4444' : 'primary.main',
                                                        fontSize: 20
                                                    }} />
                                                </Box>
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    size="small"
                                                    sx={{
                                                        '&:hover': {
                                                            bgcolor: alpha('#0ea5e9', 0.1),
                                                        }
                                                    }}
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={loginMutation.isPending || !username || !password}
                                    sx={{
                                        py: 1.75,
                                        fontSize: '1.05rem',
                                        fontWeight: 700,
                                        borderRadius: 2.5,
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                        boxShadow: '0 8px 25px rgba(14, 165, 233, 0.35)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: '-100%',
                                            width: '100%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                            transition: 'left 0.5s',
                                        },
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #0284c7 0%, #16a34a 100%)',
                                            boxShadow: '0 12px 35px rgba(14, 165, 233, 0.5)',
                                            transform: 'translateY(-2px)',
                                            '&::before': {
                                                left: '100%',
                                            },
                                        },
                                        '&.Mui-disabled': {
                                            background: mode === 'dark'
                                                ? alpha('#fff', 0.08)
                                                : alpha('#000', 0.08),
                                            color: mode === 'dark'
                                                ? alpha('#fff', 0.3)
                                                : alpha('#000', 0.3),
                                        },
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    {loginMutation.isPending ? (
                                        <CircularProgress size={24} color="inherit" />
                                    ) : (
                                        <>
                                            🚀 เข้าสู่ระบบ
                                        </>
                                    )}
                                </Button>
                            </form>

                            {/* Divider */}
                            <Divider sx={{ my: 3 }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: 2,
                                        bgcolor: mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.03),
                                        fontWeight: 600,
                                    }}
                                >
                                    หรือ
                                </Typography>
                            </Divider>

                            {/* Enhanced Keycloak SSO Button */}
                            <Button
                                variant="outlined"
                                fullWidth
                                size="large"
                                onClick={handleKeycloakLogin}
                                disabled={keycloakLoading}
                                startIcon={
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1.5,
                                            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                                        }}
                                    >
                                        <KeycloakIcon sx={{ fontSize: 18, color: '#fff' }} />
                                    </Box>
                                }
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2.5,
                                    borderWidth: 2,
                                    borderColor: mode === 'dark' ? alpha('#a855f7', 0.3) : alpha('#a855f7', 0.4),
                                    color: mode === 'dark' ? '#e9d5ff' : '#7e22ce',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    background: mode === 'dark'
                                        ? `linear-gradient(135deg, ${alpha('#a855f7', 0.08)} 0%, ${alpha('#ec4899', 0.05)} 100%)`
                                        : `linear-gradient(135deg, ${alpha('#a855f7', 0.05)} 0%, ${alpha('#ec4899', 0.03)} 100%)`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: '-100%',
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.2), transparent)',
                                        transition: 'left 0.5s',
                                    },
                                    '&:hover': {
                                        borderWidth: 2,
                                        borderColor: '#a855f7',
                                        bgcolor: alpha('#a855f7', 0.15),
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 25px rgba(168, 85, 247, 0.35)',
                                        '&::before': {
                                            left: '100%',
                                        },
                                    },
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Typography component="span" sx={{ fontWeight: 700 }}>
                                        เข้าสู่ระบบด้วย
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontWeight: 800,
                                            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        Keycloak SSO
                                    </Typography>
                                </Box>
                            </Button>

                            {/* Footer */}
                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                                    © 2024-2026 กลุ่มงานโครงสร้างพื้นฐานดิจิทัลทางการแพทย์
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.75rem' }}>
                                    โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Fade>
            </Box>

            {/* Enhanced CSS Animations */}
            <style>
                {`
                    @keyframes float-orb-1 {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(30px, -40px) scale(1.1); }
                        66% { transform: translate(-20px, 30px) scale(0.9); }
                    }
                    
                    @keyframes float-orb-2 {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(-40px, 30px) scale(0.95); }
                        66% { transform: translate(30px, -20px) scale(1.05); }
                    }
                    
                    @keyframes float-orb-3 {
                        0%, 100% { transform: translate(-50%, -50%) scale(1); }
                        50% { transform: translate(-50%, -50%) scale(1.15); }
                    }
                    
                    @keyframes particle-float {
                        0%, 100% { 
                            transform: translateY(0) translateX(0);
                            opacity: 0.3;
                        }
                        50% { 
                            transform: translateY(-100px) translateX(50px);
                            opacity: 0.8;
                        }
                    }
                    
                    @keyframes grid-move {
                        0% { transform: translate(0, 0); }
                        100% { transform: translate(60px, 60px); }
                    }
                    
                    @keyframes pulse-glow {
                        0%, 100% { opacity: 0.5; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.1); }
                    }
                    
                    @keyframes rotate-border {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    @keyframes float-logo {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                    
                    @keyframes gradient-shift {
                        0%, 100% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                    }
                    
                    @keyframes pulse-shadow {
                        0%, 100% { 
                            box-shadow: 0 15px 40px rgba(14, 165, 233, 0.4);
                        }
                        50% { 
                            box-shadow: 0 20px 50px rgba(14, 165, 233, 0.6);
                        }
                    }
                `}
            </style>
        </Box>
    );
}
