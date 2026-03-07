import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    alpha,
} from '@mui/material';
import {
    Storage as StorageIcon,
    Security as SecurityIcon,
    Shield as ShieldIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { formatBytesWithMB } from '../helpers';
import type { Tab5Props } from '../types';

export default function Tab5BackupDR(props: Tab5Props) {
    const { vm, theme } = props;

    return (
        <Box>
            {/* Hero Overview Cards */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                {/* Protection Status Card */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: vm.in_protection
                                ? `linear-gradient(135deg, ${alpha('#22c55e', 0.08)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
                                : `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.02)} 100%)`,
                            border: '2px solid',
                            borderColor: vm.in_protection ? alpha('#22c55e', 0.2) : alpha('#f59e0b', 0.2),
                            transition: 'all 0.3s ease',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: vm.in_protection
                                    ? 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)'
                                    : 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f59e0b 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                borderColor: vm.in_protection ? alpha('#22c55e', 0.4) : alpha('#f59e0b', 0.4),
                                boxShadow: vm.in_protection
                                    ? `0 12px 28px ${alpha('#22c55e', 0.25)}`
                                    : `0 12px 28px ${alpha('#f59e0b', 0.25)}`,
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                <Box
                                    sx={{
                                        width: { xs: 48, sm: 52, md: 56 },
                                        height: { xs: 48, sm: 52, md: 56 },
                                        borderRadius: 2.5,
                                        background: vm.in_protection
                                            ? `linear-gradient(135deg, ${alpha('#22c55e', 0.2)} 0%, ${alpha('#22c55e', 0.1)} 100%)`
                                            : `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid',
                                        borderColor: vm.in_protection ? alpha('#22c55e', 0.3) : alpha('#f59e0b', 0.3),
                                    }}
                                >
                                    <ShieldIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: vm.in_protection ? '#22c55e' : '#f59e0b' }} />
                                </Box>
                                {vm.in_protection && (
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
                                            animation: 'pulse 2s ease-in-out infinite',
                                            '@keyframes pulse': {
                                                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                '50%': { opacity: 0.7, transform: 'scale(1.3)' }
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                🛡️ Protection Status
                            </Typography>
                            <Typography variant="h4" fontWeight={900} color={vm.in_protection ? '#22c55e' : '#f59e0b'} sx={{ mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                                {vm.in_protection ? 'Protected' : 'Unprotected'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {vm.in_protection ? 'ระบบปกป้องเปิดใช้งาน' : 'ไม่มีการปกป้อง'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Backup Files Count Card */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.08)} 0%, ${alpha('#3b82f6', 0.02)} 100%)`,
                            border: '2px solid',
                            borderColor: alpha('#3b82f6', 0.2),
                            transition: 'all 0.3s ease',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                borderColor: alpha('#3b82f6', 0.4),
                                boxShadow: `0 12px 28px ${alpha('#3b82f6', 0.25)}`,
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}>
                                <Box
                                    sx={{
                                        width: { xs: 48, sm: 52, md: 56 },
                                        height: { xs: 48, sm: 52, md: 56 },
                                        borderRadius: 2.5,
                                        background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)} 0%, ${alpha('#3b82f6', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid',
                                        borderColor: alpha('#3b82f6', 0.3),
                                    }}
                                >
                                    <StorageIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#3b82f6' }} />
                                </Box>
                            </Box>
                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                📦 Backup Files
                            </Typography>
                            <Typography variant="h4" fontWeight={900} color="#3b82f6" sx={{ mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                                {vm.backup_file_count || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                ไฟล์สำรองทั้งหมด
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Total Backup Size Card */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`,
                            border: '2px solid',
                            borderColor: alpha('#8b5cf6', 0.2),
                            transition: 'all 0.3s ease',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #8b5cf6 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                borderColor: alpha('#8b5cf6', 0.4),
                                boxShadow: `0 12px 28px ${alpha('#8b5cf6', 0.25)}`,
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 2.5,
                                        background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid',
                                        borderColor: alpha('#8b5cf6', 0.3),
                                    }}
                                >
                                    <SaveIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                                </Box>
                            </Box>
                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                💾 Total Backup Size
                            </Typography>
                            <Typography variant="h4" fontWeight={900} color="#8b5cf6" sx={{ mb: 0.5 }}>
                                {vm.storage_file_size_mb
                                    ? formatBytesWithMB(vm.storage_file_size_mb)
                                    : vm.backup_file_count && vm.backup_file_count > 0 ? 'ไม่ทราบขนาด' : '-'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                พื้นที่ใช้สำรอง
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Protection Type Card */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: vm.protection_type === 'backup_disaster'
                                ? `linear-gradient(135deg, ${alpha('#ef4444', 0.08)} 0%, ${alpha('#ef4444', 0.02)} 100%)`
                                : vm.protection_type === 'az_backup'
                                    ? `linear-gradient(135deg, ${alpha('#f59e0b', 0.08)} 0%, ${alpha('#f59e0b', 0.02)} 100%)`
                                    : `linear-gradient(135deg, ${alpha('#94a3b8', 0.08)} 0%, ${alpha('#94a3b8', 0.02)} 100%)`,
                            border: '2px solid',
                            borderColor: vm.protection_type === 'backup_disaster'
                                ? alpha('#ef4444', 0.2)
                                : vm.protection_type === 'az_backup'
                                    ? alpha('#f59e0b', 0.2)
                                    : alpha('#94a3b8', 0.2),
                            transition: 'all 0.3s ease',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: vm.protection_type === 'backup_disaster'
                                    ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)'
                                    : vm.protection_type === 'az_backup'
                                        ? 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f59e0b 100%)'
                                        : 'linear-gradient(90deg, #94a3b8 0%, #64748b 50%, #94a3b8 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                borderColor: vm.protection_type === 'backup_disaster'
                                    ? alpha('#ef4444', 0.4)
                                    : vm.protection_type === 'az_backup'
                                        ? alpha('#f59e0b', 0.4)
                                        : alpha('#94a3b8', 0.4),
                                boxShadow: vm.protection_type === 'backup_disaster'
                                    ? `0 12px 28px ${alpha('#ef4444', 0.25)}`
                                    : vm.protection_type === 'az_backup'
                                        ? `0 12px 28px ${alpha('#f59e0b', 0.25)}`
                                        : `0 12px 28px ${alpha('#000', 0.1)}`,
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 2.5,
                                        background: vm.protection_type === 'backup_disaster'
                                            ? `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`
                                            : vm.protection_type === 'az_backup'
                                                ? `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`
                                                : `linear-gradient(135deg, ${alpha('#94a3b8', 0.2)} 0%, ${alpha('#94a3b8', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid',
                                        borderColor: vm.protection_type === 'backup_disaster'
                                            ? alpha('#ef4444', 0.3)
                                            : vm.protection_type === 'az_backup'
                                                ? alpha('#f59e0b', 0.3)
                                                : alpha('#94a3b8', 0.3),
                                    }}
                                >
                                    <SecurityIcon sx={{
                                        fontSize: 32,
                                        color: vm.protection_type === 'backup_disaster'
                                            ? '#ef4444'
                                            : vm.protection_type === 'az_backup'
                                                ? '#f59e0b'
                                                : '#94a3b8'
                                    }} />
                                </Box>
                            </Box>
                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                🔐 Protection Type
                            </Typography>
                            <Typography variant="h6" fontWeight={900} color={
                                vm.protection_type === 'backup_disaster'
                                    ? '#ef4444'
                                    : vm.protection_type === 'az_backup'
                                        ? '#f59e0b'
                                        : '#94a3b8'
                            } sx={{ mb: 0.5 }}>
                                {vm.protection_type === 'backup_disaster' ? 'DR System' :
                                    vm.protection_type === 'az_backup' ? 'AZ Backup' :
                                        'No Protection'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                {vm.protection_type === 'backup_disaster' ? 'Disaster Recovery' :
                                    vm.protection_type === 'az_backup' ? 'Zone Backup' :
                                        'ไม่มีการกำหนด'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content - Protection Details */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                {/* Protection Policy Card */}
                <Grid item xs={12} lg={6}>
                    <Card
                        sx={{
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(145deg, ${alpha('#6366f1', 0.08)} 0%, ${alpha('#6366f1', 0.02)} 100%)`
                                : `linear-gradient(145deg, ${alpha('#6366f1', 0.05)} 0%, ${alpha('#6366f1', 0.01)} 100%)`,
                            border: '2px solid',
                            borderColor: alpha('#6366f1', 0.2),
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                borderColor: alpha('#6366f1', 0.4),
                                boxShadow: `0 12px 24px ${alpha('#6366f1', 0.2)}`,
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 3, borderBottom: `2px solid ${alpha('#6366f1', 0.1)}` }}>
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        background: `linear-gradient(135deg, ${alpha('#6366f1', 0.2)} 0%, ${alpha('#6366f1', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#6366f1', 0.3)}`
                                    }}
                                >
                                    <ShieldIcon sx={{ fontSize: 32, color: '#6366f1' }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" fontWeight={900} color="#6366f1">
                                        🛡️ Protection Policy
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        การกำหนดค่าระบบป้องกัน
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Policy Details */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {/* Protection Status */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        📊 สถานะ Protection
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Chip
                                            label={vm.in_protection ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                            icon={vm.in_protection ? <CheckCircleIcon /> : <WarningIcon />}
                                            sx={{
                                                height: 36,
                                                fontSize: '0.9rem',
                                                fontWeight: 800,
                                                background: vm.in_protection
                                                    ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                                                    : alpha('#f59e0b', 0.15),
                                                color: vm.in_protection ? '#fff' : '#f59e0b',
                                                border: vm.in_protection ? 'none' : `2px solid ${alpha('#f59e0b', 0.3)}`,
                                                boxShadow: vm.in_protection ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
                                            }}
                                        />
                                        {vm.backup_policy_enable && (
                                            <Chip
                                                label="Backup Policy Active"
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    background: alpha('#3b82f6', 0.15),
                                                    color: '#3b82f6',
                                                    border: `1px solid ${alpha('#3b82f6', 0.3)}`
                                                }}
                                            />
                                        )}
                                    </Box>
                                </Box>

                                {/* Policy Name */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        📋 ชื่อ Policy
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            background: alpha('#6366f1', 0.05),
                                            border: `1px solid ${alpha('#6366f1', 0.15)}`
                                        }}
                                    >
                                        <Typography variant="h6" fontWeight={800} color="#6366f1">
                                            {vm.protection_name || 'ไม่มีการกำหนด Policy'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Protection ID */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        🔑 Protection ID
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        fontFamily="monospace"
                                        fontWeight={600}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            background: alpha('#000', 0.03),
                                            border: `1px solid ${alpha('#000', 0.1)}`,
                                            wordBreak: 'break-all',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        {vm.protection_id || 'N/A'}
                                    </Typography>
                                </Box>

                                {/* Protection Type Badge */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        🏷️ ประเภท Protection
                                    </Typography>
                                    <Box>
                                        {vm.protection_type === 'backup_disaster' && (
                                            <Chip
                                                label="🔴 DR (Disaster Recovery)"
                                                sx={{
                                                    height: 36,
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                    color: '#fff',
                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                                }}
                                            />
                                        )}
                                        {vm.protection_type === 'az_backup' && (
                                            <Chip
                                                label="🟡 AZ Backup (Zone Backup)"
                                                sx={{
                                                    height: 36,
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
                                                    color: '#fff',
                                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                                }}
                                            />
                                        )}
                                        {!vm.protection_type && (
                                            <Chip
                                                label="⚪ ไม่ระบุประเภท"
                                                sx={{
                                                    height: 36,
                                                    fontWeight: 700,
                                                    background: alpha('#94a3b8', 0.15),
                                                    color: '#64748b',
                                                    border: `1px solid ${alpha('#94a3b8', 0.3)}`
                                                }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Backup Storage & Configuration Card */}
                <Grid item xs={12} lg={6}>
                    <Card
                        sx={{
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(145deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`
                                : `linear-gradient(145deg, ${alpha('#8b5cf6', 0.05)} 0%, ${alpha('#8b5cf6', 0.01)} 100%)`,
                            border: '2px solid',
                            borderColor: alpha('#8b5cf6', 0.2),
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #8b5cf6 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                borderColor: alpha('#8b5cf6', 0.4),
                                boxShadow: `0 12px 24px ${alpha('#8b5cf6', 0.2)}`,
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 3, borderBottom: `2px solid ${alpha('#8b5cf6', 0.1)}`, flexWrap: 'wrap' }}>
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.2)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#8b5cf6', 0.3)}`
                                    }}
                                >
                                    <StorageIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" fontWeight={900} color="#8b5cf6">
                                        💾 Backup Storage
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        การจัดเก็บและจัดการ Backup
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Storage Details */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {/* Backup Files Count */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        📦 จำนวนไฟล์ Backup
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                px: 3,
                                                py: 1.5,
                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.15)} 0%, ${alpha('#3b82f6', 0.05)} 100%)`,
                                                border: `2px solid ${alpha('#3b82f6', 0.3)}`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}
                                        >
                                            <Typography variant="h5" fontWeight={900} color="#3b82f6">
                                                {vm.backup_file_count || 0}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                Files
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={vm.backup_file_count && vm.backup_file_count > 0 ? 'มี Backup' : 'ไม่มี Backup'}
                                            size="small"
                                            color={vm.backup_file_count && vm.backup_file_count > 0 ? 'success' : 'default'}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Box>
                                </Box>

                                {/* Total Backup Size */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        💿 ขนาดไฟล์ Backup รวม
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                            background: alpha('#8b5cf6', 0.05),
                                            border: `1px solid ${alpha('#8b5cf6', 0.15)}`
                                        }}
                                    >
                                        <Typography variant="h6" fontWeight={800} color="#8b5cf6">
                                            {vm.storage_file_size_mb
                                                ? formatBytesWithMB(vm.storage_file_size_mb)
                                                : vm.backup_file_count && vm.backup_file_count > 0
                                                    ? `${vm.backup_file_count} ไฟล์ (ไม่ทราบขนาด)`
                                                    : 'ไม่มี Backup'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Datastore Information */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        🗄️ Datastore
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            background: alpha('#8b5cf6', 0.05),
                                            border: `1px solid ${alpha('#8b5cf6', 0.15)}`
                                        }}
                                    >
                                        {vm.storage_name || 'ไม่ระบุ Datastore'}
                                    </Typography>
                                    {vm.storage_id && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            fontFamily="monospace"
                                            sx={{
                                                display: 'block',
                                                mt: 1,
                                                p: 1,
                                                borderRadius: 1,
                                                background: alpha('#000', 0.03),
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            ID: {vm.storage_id}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Expiry Time */}
                                <Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                                        ⏰ วันหมดอายุ
                                    </Typography>
                                    <Chip
                                        label={vm.expire_time || 'Unlimited'}
                                        sx={{
                                            height: 36,
                                            fontWeight: 800,
                                            background: vm.expire_time && vm.expire_time !== 'unlimited'
                                                ? 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)'
                                                : 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                                            color: '#fff',
                                            boxShadow: vm.expire_time && vm.expire_time !== 'unlimited'
                                                ? '0 4px 12px rgba(245, 158, 11, 0.3)'
                                                : '0 4px 12px rgba(34, 197, 94, 0.3)'
                                        }}
                                    />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Protection Type Information & Details */}
                <Grid item xs={12}>
                    <Card
                        sx={{
                            borderRadius: { xs: 2.5, sm: 3, md: 4 },
                            background: theme.palette.mode === 'dark'
                                ? `linear-gradient(145deg, ${alpha('#3b82f6', 0.08)} 0%, ${alpha('#3b82f6', 0.02)} 100%)`
                                : `linear-gradient(145deg, ${alpha('#3b82f6', 0.05)} 0%, ${alpha('#3b82f6', 0.01)} 100%)`,
                            border: '2px solid',
                            borderColor: alpha('#3b82f6', 0.2),
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s linear infinite',
                            },
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                borderColor: alpha('#3b82f6', 0.3),
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2.5,
                                        background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)} 0%, ${alpha('#3b82f6', 0.1)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha('#3b82f6', 0.3)}`
                                    }}
                                >
                                    <InfoIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={900} color="#3b82f6">
                                        ℹ️ ข้อมูลเพิ่มเติม
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        รายละเอียดและคำอธิบายแบบละเอียด
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Information Content */}
                            {vm.protection_type === 'backup_disaster' && (
                                <Box
                                    sx={{
                                        p: 3,
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        background: theme.palette.mode === 'dark'
                                            ? alpha('#ef4444', 0.08)
                                            : alpha('#ef4444', 0.05),
                                        border: `2px solid ${alpha('#ef4444', 0.2)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                background: `linear-gradient(135deg, ${alpha('#ef4444', 0.2)} 0%, ${alpha('#ef4444', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#ef4444', 0.3)}`
                                            }}
                                        >
                                            <Typography fontSize="24px">🔴</Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={900} color="#ef4444">
                                            DR (Disaster Recovery)
                                        </Typography>
                                    </Box>
                                    <Box sx={{ pl: 7 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • <strong>VM นี้อยู่ภายใต้ระบบ Disaster Recovery แบบเต็มรูปแบบ</strong>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • มีการทำ <strong>Backup และ Replication</strong> ไปยัง Site สำรอง
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • สามารถ <strong>Failover</strong> ได้ในกรณีเกิดภัยพิบัติ
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • Protection Policy: <Chip
                                                label={vm.protection_name}
                                                size="small"
                                                sx={{
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                    color: '#fff',
                                                    ml: 0.5
                                                }}
                                            />
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                            • จำนวน Backup Files: <strong>{vm.backup_file_count || 0} ไฟล์</strong>
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {vm.protection_type === 'az_backup' && (
                                <Box
                                    sx={{
                                        p: 3,
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        background: theme.palette.mode === 'dark'
                                            ? alpha('#f59e0b', 0.08)
                                            : alpha('#f59e0b', 0.05),
                                        border: `2px solid ${alpha('#f59e0b', 0.2)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.2)} 0%, ${alpha('#f59e0b', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#f59e0b', 0.3)}`
                                            }}
                                        >
                                            <Typography fontSize="24px">🟡</Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={900} color="#f59e0b">
                                            AZ Backup (Availability Zone Backup)
                                        </Typography>
                                    </Box>
                                    <Box sx={{ pl: 7 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • <strong>VM นี้มีการทำ Backup ระหว่าง Availability Zone</strong>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • Backup จะถูกเก็บใน <strong>AZ อื่นเพื่อความปลอดภัย</strong>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • จำนวน Backup ปัจจุบัน: <Chip
                                                label={`${vm.backup_file_count || 0} ไฟล์`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                    color: '#fff',
                                                    ml: 0.5
                                                }}
                                            />
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • Protection Policy: <Chip
                                                label={vm.protection_name || 'Unnamed'}
                                                size="small"
                                                sx={{
                                                    fontWeight: 800,
                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
                                                    color: '#fff',
                                                    ml: 0.5
                                                }}
                                            />
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                            • ขนาด Backup: <strong>{vm.storage_file_size_mb ? formatBytesWithMB(vm.storage_file_size_mb) : 'N/A'}</strong>
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {!vm.protection_type && !vm.in_protection && (
                                <Box
                                    sx={{
                                        p: 3,
                                        borderRadius: { xs: 2, sm: 2.5, md: 3 },
                                        background: theme.palette.mode === 'dark'
                                            ? alpha('#94a3b8', 0.08)
                                            : alpha('#94a3b8', 0.05),
                                        border: `2px solid ${alpha('#94a3b8', 0.2)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: { xs: 1.5, sm: 1.75, md: 2 },
                                                background: `linear-gradient(135deg, ${alpha('#94a3b8', 0.2)} 0%, ${alpha('#94a3b8', 0.1)} 100%)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${alpha('#94a3b8', 0.3)}`
                                            }}
                                        >
                                            <Typography fontSize="24px">⚪</Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={900} color="#64748b">
                                            ไม่มี Protection
                                        </Typography>
                                    </Box>
                                    <Box sx={{ pl: 7 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • <strong>VM นี้ยังไม่ได้เปิดใช้งานระบบ Protection</strong>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
                                            • {vm.backup_file_count && vm.backup_file_count > 0
                                                ? `มี ${vm.backup_file_count} ไฟล์ Backup แบบ Manual`
                                                : 'ยังไม่มีไฟล์ Backup'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                            • <strong style={{ color: '#f59e0b' }}>⚠️ แนะนำให้เปิดใช้งาน Protection Policy เพื่อความปลอดภัย</strong>
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
