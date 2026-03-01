import { Box, Typography, alpha, Stack, IconButton, Container, Link } from '@mui/material';
import {
    Facebook,
    Twitter,
    LinkedIn,
    Instagram,
    Phone,
    Email,
    LocationOn,
    AutoGraph,
    Terminal
} from '@mui/icons-material';
import { useThemeStore } from '../../stores/themeStore';

export default function Footer() {
    const { mode } = useThemeStore();
    const currentYear = new Date().getFullYear();
    const isDark = mode === 'dark';

    const glassSx = {
        background: isDark
            ? 'rgba(30, 41, 59, 0.4)'
            : 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.5)',
    };

    return (
        <Box
            component="footer"
            sx={{
                mt: 'auto',
                borderTop: 1,
                borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
                background: isDark
                    ? 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,1) 100%)'
                    : 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,1) 100%)',
                py: { xs: 4, sm: 3 },
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Dynamic Background Glow */}
            <Box sx={{
                position: 'absolute',
                bottom: -40,
                left: '20%',
                width: 400,
                height: 100,
                background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0) 70%)',
                borderRadius: '50%',
                zIndex: 0,
                pointerEvents: 'none'
            }} />
            <Box sx={{
                position: 'absolute',
                bottom: -40,
                right: '20%',
                width: 400,
                height: 100,
                background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 70%)',
                borderRadius: '50%',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={{ xs: 3, lg: 0 }}
                    justifyContent="space-between"
                    alignItems="center"
                >
                    {/* Left Section: Logo & Brand */}
                    <Stack direction="row" spacing={2.5} alignItems="center">
                        <Box
                            component="img"
                            src="/vmstat/wuh_logo.png"
                            alt="WUH Logo"
                            sx={{
                                height: { xs: 40, sm: 50 },
                                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                '&:hover': { transform: 'scale(1.1) rotate(2deg)' },
                                filter: isDark ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                            }}
                        />
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    letterSpacing: '-0.02em',
                                    color: 'text.primary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                <AutoGraph sx={{ fontSize: 20, color: '#3B82F6', WebkitTextFillColor: 'initial' }} />
                                VM STAT
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.5 }}>
                                โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
                            </Typography>
                        </Box>
                    </Stack>

                    {/* Middle Section: Contact & Developer Info */}
                    <Stack spacing={1.5} alignItems="center">
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={{ xs: 1, sm: 4 }}
                            alignItems="center"
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: '20px',
                                ...glassSx
                            }}
                        >
                            <Link href="tel:075-479999" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                                <Phone fontSize="small" color="primary" />
                                <Typography variant="body2" fontWeight={700}>075-479999</Typography>
                            </Link>
                            <Link href="mailto:wuh@wu.ac.th" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                                <Email fontSize="small" color="primary" />
                                <Typography variant="body2" fontWeight={700}>wuh@wu.ac.th</Typography>
                            </Link>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <LocationOn fontSize="small" color="primary" />
                                <Typography variant="body2" color="text.secondary">อ.ท่าศาลา จ.นครศรีธรรมราช</Typography>
                            </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <Terminal sx={{ fontSize: 16, color: 'primary.main', opacity: 0.7 }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: '0.02em' }}>
                                พัฒนาโดย <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>กลุ่มงานโครงสร้างพื้นฐานดิจิทัลทางการแพทย์</Box>
                            </Typography>
                        </Stack>
                    </Stack>

                    {/* Right Section: Social & Legal */}
                    <Stack spacing={1.5} alignItems={{ xs: 'center', lg: 'flex-end' }}>
                        <Stack direction="row" spacing={1}>
                            {[Facebook, Twitter, LinkedIn, Instagram].map((Icon, idx) => (
                                <IconButton
                                    key={idx}
                                    size="small"
                                    sx={{
                                        color: 'text.secondary',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            color: 'primary.main',
                                            transform: 'translateY(-3px)',
                                            bgcolor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'
                                        }
                                    }}
                                >
                                    <Icon fontSize="small" />
                                </IconButton>
                            ))}
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
                                © {currentYear} VM Stat v1.1.0
                            </Typography>
                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled', opacity: 0.3 }} />
                            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
                                All Rights Reserved
                            </Typography>
                        </Stack>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}