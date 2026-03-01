import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    alpha,
    useTheme,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    SdStorage as SdStorageIcon,
    DataUsage as DataUsageIcon,
    FolderOpen as FolderOpenIcon,
    LocationOn as LocationOnIcon,
    Category as CategoryIcon,
    Backup as BackupIcon,
} from '@mui/icons-material';

// Types
interface DatastoreData {
    datastore_id: string;
    name: string;
    az_name: string;
    type: string;
    status: string;
    total_mb: number;
    used_mb: number;
    free_mb: number;
    usage_percent: number;
    change_yesterday_mb: number | null;
    change_yesterday_percent: number | null;
    change_week_mb: number | null;
    change_week_percent: number | null;
    updated_at: string;
}

// Format bytes
const formatBytes = (mb: number): string => {
    if (mb === 0) return '0 MB';
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(2)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
};

// Format change in MB
const formatChange = (mb: number): string => {
    const abs = Math.abs(mb);
    if (abs >= 1048576) return `${(abs / 1048576).toFixed(2)} TB`;
    if (abs >= 1024) return `${(abs / 1024).toFixed(1)} GB`;
    return `${abs.toFixed(0)} MB`;
};

// Usage color based on threshold
const getUsageColor = (percent: number) => {
    if (percent >= 90) return { main: '#ef4444', light: '#fca5a5', bg: '#fef2f2', label: 'วิกฤต', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
    if (percent >= 80) return { main: '#f97316', light: '#fdba74', bg: '#fff7ed', label: 'เตือน', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' };
    if (percent >= 60) return { main: '#eab308', light: '#fde047', bg: '#fefce8', label: 'ปานกลาง', gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' };
    return { main: '#22c55e', light: '#86efac', bg: '#f0fdf4', label: 'ปกติ', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' };
};

// Color based on AZ Name (HCI-DC vs HCI-DR)
const getAzColor = (azName: string) => {
    const name = azName?.toUpperCase() || '';
    if (name.includes('DC')) return { main: '#3b82f6', light: '#93c5fd', bg: '#eff6ff', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }; // Blue
    if (name.includes('DR')) return { main: '#8b5cf6', light: '#c4b5fd', bg: '#f5f3ff', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }; // Violet
    return { main: '#64748b', light: '#cbd5e1', bg: '#f8fafc', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }; // Slate
};

// Color based on Type (NFS vs VS)
const getTypeColor = (type: string) => {
    const t = type?.toUpperCase() || '';
    if (t.includes('NFS')) return { main: '#06b6d4', light: '#67e8f9', bg: '#ecfeff', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }; // Cyan
    if (t.includes('VS')) return { main: '#10b981', light: '#6ee7b7', bg: '#ecfdf5', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }; // Emerald
    return { main: '#6366f1', light: '#a5b4fc', bg: '#eef2ff', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }; // Indigo
};

// Status in Thai
const getStatusInfo = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'normal' || s === 'ok') return { label: 'ปกติ', color: '#22c55e' as const, icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> };
    if (s === 'warning') return { label: 'เตือน', color: '#f59e0b' as const, icon: <WarningIcon sx={{ fontSize: 16 }} /> };
    return { label: 'ออฟไลน์', color: '#ef4444' as const, icon: <ErrorIcon sx={{ fontSize: 16 }} /> };
};

interface ExecutiveDatastoreCardProps {
    data: DatastoreData;
    index: number;
}

const ExecutiveDatastoreCard: React.FC<ExecutiveDatastoreCardProps> = ({ data, index }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const usagePercent = data.usage_percent || (data.total_mb > 0 ? (data.used_mb / data.total_mb) * 100 : 0);
    const usageColor = getUsageColor(usagePercent);
    const azColor = getAzColor(data.az_name);
    const typeColor = getTypeColor(data.type);
    const statusInfo = getStatusInfo(data.status);



    return (
        <Card
            className="card-hover"
            elevation={0}
            sx={{
                borderRadius: 5,
                overflow: 'visible',
                position: 'relative',
                background: isDark
                    ? `linear-gradient(145deg, ${alpha(azColor.main, 0.15)} 0%, ${alpha('#0f172a', 0.95)} 50%, ${alpha('#1e293b', 0.9)} 100%)`
                    : `linear-gradient(145deg, ${alpha(azColor.main, 0.08)} 0%, ${alpha('#ffffff', 1)} 50%, ${alpha('#f8fafc', 0.95)} 100%)`,
                backdropFilter: 'blur(16px) saturate(180%)',
                border: `2.5px solid ${alpha(azColor.main, isDark ? 0.4 : 0.3)}`,
                boxShadow: `
                    0 0 0 1px ${alpha(azColor.main, 0.1)},
                    0 20px 60px -15px ${alpha(azColor.main, 0.3)},
                    0 8px 24px -8px ${alpha(azColor.main, 0.2)}
                `,
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: `slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both`,
                transform: 'scale(1.0)',
                transformOrigin: 'center',
                '&:hover': {
                    transform: 'scale(1.02) translateY(-8px)',
                    boxShadow: `
                        0 0 0 2px ${alpha(usageColor.main, 0.2)},
                        0 32px 80px -20px ${alpha(usageColor.main, 0.45)},
                        0 16px 40px -12px ${alpha(usageColor.main, 0.35)},
                        inset 0 1px 0 ${alpha('#ffffff', 0.1)}
                    `,
                    borderColor: alpha(usageColor.main, 0.6),
                    '& .usage-glow': {
                        opacity: 1,
                        transform: 'scale(1.05)',
                    },
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -2,
                    borderRadius: 5,
                    padding: 2,
                    background: `linear-gradient(135deg, ${alpha(azColor.main, 0.6)}, transparent, ${alpha(azColor.main, 0.3)})`,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    opacity: 0.5,
                    pointerEvents: 'none',
                },
            }}
        >
            {/* Animated gradient overlay */}
            <Box
                className="usage-glow"
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at 70% 30%, ${alpha(usageColor.main, 0.15)} 0%, transparent 60%)`,
                    opacity: 0.7,
                    transition: 'all 0.4s ease',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            {/* Top gradient accent bar - Based on AZ Color */}
            <Box sx={{
                height: 8,
                background: azColor.gradient,
                borderRadius: '20px 20px 0 0',
                boxShadow: `0 4px 16px ${alpha(azColor.main, 0.4)}`,
                position: 'relative',
                overflow: 'hidden',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite',
                },
            }} />

            <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>

                {/* Header: Icon (Left) + Name (Middle) + Chips (Right) */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    {/* 1. Large Icon (Left) - Increased size & Enhanced Visuals */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 3,
                            background: azColor.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `
                                0 10px 30px ${alpha(azColor.main, 0.4)},
                                inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                            `,
                            mr: 2.5,
                            flexShrink: 0,
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.3s ease',
                            '&:hover': {
                                transform: 'scale(1.05)',
                            }
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                            }}
                        />
                        <BackupIcon sx={{ fontSize: 48, color: 'white', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
                    </Box>

                    {/* 2. Datastore Name (Middle) */}
                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                mb: 0,
                                background: isDark
                                    ? 'linear-gradient(45deg, #f1f5f9 30%, #cbd5e1 90%)'
                                    : 'linear-gradient(45deg, #334155 30%, #64748b 90%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px',
                                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                                lineHeight: 1.2,
                                display: 'block',
                                width: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textShadow: isDark
                                    ? '0 2px 12px rgba(255,255,255,0.15)'
                                    : '0 2px 12px rgba(0,0,0,0.1)',
                                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))',
                            }}
                            title={data.name}
                        >
                            {data.name}
                        </Typography>
                    </Box>

                    {/* 3. Chips (Right) - Inline & Wrapped */}
                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.8, maxWidth: '40%' }}>
                        {/* Status Chip */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                            borderRadius: '6px',
                            bgcolor: alpha(statusInfo.color, isDark ? 0.15 : 0.1),
                            border: `1px solid ${alpha(statusInfo.color, 0.3)}`,
                            color: statusInfo.color,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            boxShadow: `0 2px 8px ${alpha(statusInfo.color, 0.1)}`,
                        }}>
                            <Box component="span" sx={{ display: 'flex', fontSize: 13 }}>{statusInfo.icon}</Box>
                            {statusInfo.label}
                        </Box>

                        {/* AZ Chip */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                            borderRadius: '6px',
                            bgcolor: alpha(azColor.main, isDark ? 0.15 : 0.1),
                            border: `1px solid ${alpha(azColor.main, 0.3)}`,
                            color: azColor.main,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: `0 2px 8px ${alpha(azColor.main, 0.1)}`,
                        }}>
                            <LocationOnIcon sx={{ fontSize: 13 }} />
                            {data.az_name || 'N/A'}
                        </Box>

                        {/* Type Chip */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                            borderRadius: '6px',
                            bgcolor: alpha(typeColor.main, isDark ? 0.15 : 0.1),
                            border: `1px solid ${alpha(typeColor.main, 0.3)}`,
                            color: typeColor.main,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            boxShadow: `0 2px 8px ${alpha(typeColor.main, 0.1)}`,
                        }}>
                            <CategoryIcon sx={{ fontSize: 13 }} />
                            {data.type || 'N/A'}
                        </Box>
                    </Box>
                </Box>

                {/* Progress Bar + Percentage - Re-designed */}
                <Box sx={{ mb: 2 }}>
                    {/* Percentage Display - Top Right */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'baseline',
                        mb: 0.5,
                        gap: 2
                    }}>
                        <Typography
                            sx={{
                                fontSize: { xs: '3.5rem', sm: '4rem' },
                                fontWeight: 900,
                                lineHeight: 1,
                                background: usageColor.gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-2px',
                                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                                textShadow: `
                                    0 0 40px ${alpha(usageColor.main, 0.3)},
                                    0 0 20px ${alpha(usageColor.main, 0.2)}
                                `,
                                filter: 'drop-shadow(0 2px 12px ' + alpha(usageColor.main, 0.3) + ')',
                            }}
                        >
                            {Math.round(usagePercent)}
                            <Box component="span" sx={{ fontSize: '0.4em', verticalAlign: 'super', ml: 0.5 }}>%</Box>
                        </Typography>
                    </Box>

                    {/* Progress Bar - Full Width */}
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{
                            position: 'relative',
                            height: 24,
                            borderRadius: 12,
                            bgcolor: isDark ? alpha('#1e293b', 0.6) : alpha('#e2e8f0', 0.5),
                            overflow: 'hidden',
                            boxShadow: `
                                inset 0 2px 8px ${alpha('#000', 0.15)},
                                0 1px 0 ${alpha('#ffffff', 0.1)}
                            `,
                            border: `1px solid ${alpha(usageColor.main, 0.2)}`,
                        }}>
                            {/* Animated background */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `repeating-linear-gradient(
                                        90deg,
                                        transparent,
                                        transparent 10px,
                                        ${alpha('#ffffff', 0.03)} 10px,
                                        ${alpha('#ffffff', 0.03)} 20px
                                    )`,
                                    animation: 'scroll 20s linear infinite',
                                }}
                            />
                            {/* Progress fill */}
                            <Box
                                sx={{
                                    width: `${Math.min(usagePercent, 100)}%`,
                                    height: '100%',
                                    background: usageColor.gradient,
                                    borderRadius: 12,
                                    transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    boxShadow: `
                                        0 0 32px ${alpha(usageColor.main, 0.7)},
                                        0 0 16px ${alpha(usageColor.main, 0.5)},
                                        inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                                    `,
                                    position: 'relative',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                                        borderRadius: '12px 12px 0 0',
                                    },
                                }}
                            />
                        </Box>
                        {/* Footer: Update Time (Left) + Status Text (Right) */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            {/* Update Time - Moved here */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Box
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        bgcolor: usageColor.main,
                                        boxShadow: `0 0 6px ${alpha(usageColor.main, 0.6)}`,
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                    อัปเดต: {data.updated_at ? new Date(data.updated_at).toLocaleDateString('th-TH', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }) : '-'}
                                </Typography>
                            </Box>

                            {/* Status Text */}
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{
                                    color: usageColor.main,
                                    display: 'inline-block',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    fontSize: '0.85rem',
                                }}
                            >
                                {usageColor.label === 'ปกติ' ? '✅ ปกติ' :
                                    usageColor.label === 'ปานกลาง' ? '⚠️ ระวัง' :
                                        usageColor.label === 'เตือน' ? '🟠 เตือน' :
                                            '🔴 วิกฤต'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 3-Column Stats Cards - Enhanced & Compacted */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                        { label: 'ความจุรวม', value: formatBytes(data.total_mb), icon: <SdStorageIcon />, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
                        { label: 'ใช้งานแล้ว', value: formatBytes(data.used_mb), icon: <DataUsageIcon />, color: usageColor.main, gradient: usageColor.gradient },
                        { label: 'พื้นที่ว่าง', value: formatBytes(data.free_mb), icon: <FolderOpenIcon />, color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
                    ].map((stat, i) => (
                        <Grid item xs={4} key={i}>
                            <Box sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: isDark ? alpha(stat.color, 0.12) : alpha(stat.color, 0.08),
                                border: `2px solid ${alpha(stat.color, isDark ? 0.3 : 0.2)}`,
                                textAlign: 'center',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: `0 4px 16px ${alpha(stat.color, 0.15)}`,
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 24px ${alpha(stat.color, 0.3)}`,
                                    borderColor: alpha(stat.color, 0.5),
                                },
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    background: stat.gradient,
                                },
                            }}>
                                <Box
                                    sx={{
                                        color: stat.color,
                                        mb: 0.5,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        '& svg': { fontSize: 26 },
                                    }}
                                >
                                    {stat.icon}
                                </Box>
                                <Typography variant="caption" display="block" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.75rem', mb: 0.25, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {stat.label}
                                </Typography>
                                <Typography
                                    variant="h5"
                                    fontWeight={900}
                                    sx={{
                                        background: stat.gradient,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: '1.2rem',
                                    }}
                                >
                                    {stat.value}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                {/* Trend Cards - 2 Columns with Reduced Height */}
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Box sx={{
                            p: 1,
                            borderRadius: 3,
                            bgcolor: data.change_yesterday_mb !== null && data.change_yesterday_mb > 0
                                ? isDark ? alpha('#ef4444', 0.15) : alpha('#ef4444', 0.1)
                                : data.change_yesterday_mb !== null && data.change_yesterday_mb < 0
                                    ? isDark ? alpha('#22c55e', 0.15) : alpha('#22c55e', 0.1)
                                    : isDark ? alpha('#64748b', 0.1) : alpha('#64748b', 0.08),
                            border: `2px solid ${data.change_yesterday_mb !== null && data.change_yesterday_mb > 0 ? alpha('#ef4444', 0.4) : data.change_yesterday_mb !== null && data.change_yesterday_mb < 0 ? alpha('#22c55e', 0.4) : alpha('#64748b', 0.25)}`,
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            boxShadow: `0 4px 12px ${alpha(data.change_yesterday_mb !== null && data.change_yesterday_mb > 0 ? '#ef4444' : data.change_yesterday_mb !== null && data.change_yesterday_mb < 0 ? '#22c55e' : '#64748b', 0.15)}`,
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 20px ${alpha(data.change_yesterday_mb !== null && data.change_yesterday_mb > 0 ? '#ef4444' : data.change_yesterday_mb !== null && data.change_yesterday_mb < 0 ? '#22c55e' : '#64748b', 0.25)}`,
                            },
                        }}>
                            <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                                📈 24 ชั่วโมง
                            </Typography>
                            {data.change_yesterday_mb !== null ? (
                                <Typography variant="h5" fontWeight={900}
                                    sx={{
                                        color: data.change_yesterday_mb > 0 ? '#ef4444' : data.change_yesterday_mb < 0 ? '#22c55e' : 'text.secondary',
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    {data.change_yesterday_mb > 0 ? '+' : data.change_yesterday_mb < 0 ? '-' : ''}
                                    {formatChange(Math.abs(data.change_yesterday_mb))}
                                </Typography>
                            ) : (
                                <Typography variant="caption" color="text.disabled">
                                    ไม่มีข้อมูล
                                </Typography>
                            )}
                        </Box>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{
                            p: 1,
                            borderRadius: 3,
                            bgcolor: data.change_week_mb !== null && data.change_week_mb > 0
                                ? isDark ? alpha('#ef4444', 0.15) : alpha('#ef4444', 0.1)
                                : data.change_week_mb !== null && data.change_week_mb < 0
                                    ? isDark ? alpha('#22c55e', 0.15) : alpha('#22c55e', 0.1)
                                    : isDark ? alpha('#64748b', 0.1) : alpha('#64748b', 0.08),
                            border: `2px solid ${data.change_week_mb !== null && data.change_week_mb > 0 ? alpha('#ef4444', 0.4) : data.change_week_mb !== null && data.change_week_mb < 0 ? alpha('#22c55e', 0.4) : alpha('#64748b', 0.25)}`,
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            boxShadow: `0 4px 12px ${alpha(data.change_week_mb !== null && data.change_week_mb > 0 ? '#ef4444' : data.change_week_mb !== null && data.change_week_mb < 0 ? '#22c55e' : '#64748b', 0.15)}`,
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 20px ${alpha(data.change_week_mb !== null && data.change_week_mb > 0 ? '#ef4444' : data.change_week_mb !== null && data.change_week_mb < 0 ? '#22c55e' : '#64748b', 0.25)}`,
                            },
                        }}>
                            <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                                📊 7 วัน
                            </Typography>
                            {data.change_week_mb !== null ? (
                                <Typography variant="h5" fontWeight={900}
                                    sx={{
                                        color: data.change_week_mb > 0 ? '#ef4444' : data.change_week_mb < 0 ? '#22c55e' : 'text.secondary',
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    {data.change_week_mb > 0 ? '+' : data.change_week_mb < 0 ? '-' : ''}
                                    {formatChange(Math.abs(data.change_week_mb))}
                                </Typography>
                            ) : (
                                <Typography variant="caption" color="text.disabled">
                                    ไม่มีข้อมูล
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default ExecutiveDatastoreCard;
