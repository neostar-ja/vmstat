import {
    Paper,
    Typography,
    Box,
} from '@mui/material';
import { SiUbuntu, SiCentos, SiRedhat, SiDebian, SiLinux } from 'react-icons/si';
import WindowIcon from '@mui/icons-material/Window';
import { Computer as VmIcon } from '@mui/icons-material';

// ช่วงเวลา
export const TIME_RANGES = [
    { label: '1 ชั่วโมง', value: '1h' },
    { label: '6 ชั่วโมง', value: '6h' },
    { label: '12 ชั่วโมง', value: '12h' },
    { label: '1 วัน', value: '1d' },
    { label: '7 วัน', value: '7d' },
    { label: '30 วัน', value: '30d' },
    { label: 'กำหนดเอง', value: 'custom' },
];

// Helper: OS Icon จาก os_type และ os_name
export const getOSInfo = (osType: string | null | undefined, osName: string | null | undefined) => {
    const type = (osType || '').toLowerCase();
    const name = (osName || '').toLowerCase();
    if (type.includes('windows') || name.includes('windows') || /^ws\d/.test(type)) {
        return { icon: null as null, color: '#0078D7', label: 'Windows', emoji: '🪟', isWindows: true };
    } else if (name.includes('ubuntu') || name.includes('linux-ubuntu')) {
        return { icon: 'ubuntu' as const, color: '#E95420', label: 'Ubuntu', emoji: '🐧', isWindows: false };
    } else if (name.includes('centos')) {
        return { icon: 'centos' as const, color: '#932279', label: 'CentOS', emoji: '🐧', isWindows: false };
    } else if (name.includes('red hat') || name.includes('rhel')) {
        return { icon: 'redhat' as const, color: '#EE0000', label: 'Red Hat', emoji: '🎩', isWindows: false };
    } else if (name.includes('debian') || name.includes('linux-debian')) {
        return { icon: 'debian' as const, color: '#A81D33', label: 'Debian', emoji: '🐧', isWindows: false };
    } else if (type.includes('linux') || name.includes('linux') || /^l\d/.test(type)) {
        return { icon: 'linux' as const, color: '#FCC624', label: 'Linux', emoji: '🐧', isWindows: false };
    }
    return { icon: null as null, color: '#6b7280', label: 'Unknown', emoji: '💻', isWindows: false };
};

// OS Icon Renderer component
export const OSIcon = ({ osType, osName, size = 24 }: { osType?: string | null; osName?: string | null; size?: number }) => {
    const info = getOSInfo(osType, osName);
    if (info.isWindows) return <WindowIcon sx={{ fontSize: size, color: info.color }} />;
    if (info.icon === 'ubuntu') return <SiUbuntu size={size} color={info.color} />;
    if (info.icon === 'centos') return <SiCentos size={size} color={info.color} />;
    if (info.icon === 'redhat') return <SiRedhat size={size} color={info.color} />;
    if (info.icon === 'debian') return <SiDebian size={size} color={info.color} />;
    if (info.icon === 'linux') return <SiLinux size={size} color={info.color} />;
    return <VmIcon sx={{ fontSize: size, color: info.color }} />;
};

// Helper: แปลงเวลาทำงาน
export const formatUptime = (seconds: number | null | undefined, powerState?: string | null) => {
    if (powerState === 'off' || powerState === 'stopped') return 'ไม่ทำงาน';
    if (seconds === null || seconds === undefined || seconds === 0) return 'ไม่มีข้อมูล';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} วัน ${hours} ชม. ${mins} นาที`;
    if (hours > 0) return `${hours} ชม. ${mins} นาที`;
    return `${mins} นาที`;
};

// Helper: แปลง MB เป็น GB หรือ TB
export const formatBytes = (mb: number | null) => {
    if (!mb) return '-';
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(1)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
};

// Helper: แปลง MB เป็น GB พร้อมแสดง MB
export const formatBytesWithMB = (mb: number | null) => {
    if (!mb) return '-';
    const formatted = mb.toLocaleString('th-TH', { maximumFractionDigits: 2 });
    if (mb >= 1024) {
        return `${formatted} MB (${(mb / 1024).toFixed(1)} GB)`;
    }
    return `${formatted} MB`;
};

// Helper: แปลง MHz เป็น GHz
export const formatMhz = (mhz: number | null) => {
    if (!mhz) return '-';
    const formatted = mhz.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    if (mhz >= 1000) return `${formatted} MHz (${(mhz / 1000).toFixed(2)} GHz)`;
    return `${formatted} MHz`;
};

// Helper: แปลง Network speed
export const formatNetworkSpeed = (bitps: number | null) => {
    if (!bitps) return '0 bps';
    if (bitps >= 1000000000) return `${(bitps / 1000000000).toFixed(2)} Gbps`;
    if (bitps >= 1000000) return `${(bitps / 1000000).toFixed(2)} Mbps`;
    if (bitps >= 1000) return `${(bitps / 1000).toFixed(2)} Kbps`;
    return `${bitps.toFixed(0)} bps`;
};

// Helper: แปลงเปอร์เซ็นต์ (รองรับทั้ง 0..1 และ 0..100)
export const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '0%';
    const v = value <= 1 ? value * 100 : value;
    return `${v.toFixed(2)}%`;
};

// Helper: ปรับค่าเปอร์เซ็นต์ให้เป็น 0..100 (รองรับทั้ง 0..1 และ 0..100)
export const normalizePercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 0;
    return value <= 1 ? value * 100 : value;
};

// Helper: แปลงเวลาเป็นรูปแบบไทยแบบเต็ม
export const formatThaiDateTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Custom Tooltip สำหรับกราฟที่แสดงวันที่และเวลาแบบเต็ม
export const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const timestamp = payload[0]?.payload?.timestamp;
        const color = payload[0]?.color || '#333';
        return (
            <Paper sx={{
                p: 2,
                borderLeft: `4px solid ${color}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2
            }}>
                <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ mb: 1, pb: 1, borderBottom: '1px solid #eee' }}>
                    📅 {timestamp ? formatThaiDateTime(timestamp) : label}
                </Typography>
                {payload.map((entry: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block' }}></span>
                            {entry.name}
                        </Typography>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: entry.color }}>
                            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} {entry.unit || ''}
                        </Typography>
                    </Box>
                ))}
            </Paper>
        );
    }
    return null;
};
