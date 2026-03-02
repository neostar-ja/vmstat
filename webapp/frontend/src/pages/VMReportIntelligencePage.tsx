/**
 * VM Resource Intelligence System - Main Page
 * ระบบรายงานทรัพยากรเครื่องเสมือนแบบครบวงจร
 * 
 * Features:
 * - Executive Dashboard
 * - Per-VM Detail Report
 * - Capacity Planning
 * - Efficiency Analysis
 * - Export PDF/Excel
 * 
 * ✅ Mobile First Design
 * ✅ Dark Mode Default
 * ✅ MUI + TailwindCSS
 * ✅ ภาษาไทยเป็นทางการ
 */

import { useState } from 'react';
import {
    Box,
    Container,
    Paper,
    Tabs,
    Tab,
    Typography,
    alpha,
    useTheme,
    useMediaQuery,
    AppBar,
    Toolbar,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Description as ReportIcon,
    TrendingUp as TrendingUpIcon,
    Speed as EfficiencyIcon,
    Menu as MenuIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

// Import Components
import ExecutiveDashboard from '../components/vmreport/ExecutiveDashboard';
import VMIntelligenceReport from '../components/vmreport/VMIntelligenceReport';
import CapacityPlanning from '../components/vmreport/CapacityPlanning';
import EfficiencyReport from '../components/vmreport/EfficiencyReport';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`report-tabpanel-${index}`}
            aria-labelledby={`report-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box className="p-0 md:p-4">
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function VMReportIntelligencePage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [activeTab, setActiveTab] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        if (isMobile) {
            setMobileMenuOpen(false);
        }
    };

    const menuItems = [
        { label: 'แดชบอร์ดผู้บริหาร', icon: <DashboardIcon />, index: 0 },
        { label: 'รายงานราย VM', icon: <ReportIcon />, index: 1 },
        { label: 'วางแผนความจุ', icon: <TrendingUpIcon />, index: 2 },
        { label: 'ประสิทธิภาพ', icon: <EfficiencyIcon />, index: 3 },
    ];

    return (
        <Box className="min-h-screen" sx={{ bgcolor: 'background.default' }}>
            {/* Mobile Header */}
            {isMobile && (
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setMobileMenuOpen(true)}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
                            {menuItems[activeTab].label}
                        </Typography>
                    </Toolbar>
                </AppBar>
            )}

            {/* Mobile Drawer Menu */}
            <Drawer
                anchor="left"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                PaperProps={{
                    sx: {
                        width: 280,
                        bgcolor: 'background.paper',
                    },
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                        เมนูรายงาน
                    </Typography>
                    <IconButton onClick={() => setMobileMenuOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Divider />
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.index} disablePadding>
                            <ListItemButton
                                selected={activeTab === item.index}
                                onClick={() => {
                                    setActiveTab(item.index);
                                    setMobileMenuOpen(false);
                                }}
                                sx={{
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        borderRight: `3px solid ${theme.palette.primary.main}`,
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ color: activeTab === item.index ? 'primary.main' : 'text.secondary' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontWeight: activeTab === item.index ? 700 : 400,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            {/* Main Content */}
            <Container maxWidth="xl" className="py-4 md:py-8">
                {/* Desktop Header */}
                {!isMobile && (
                    <Box className="mb-6">
                        <Typography
                            variant="h4"
                            component="h1"
                            gutterBottom
                            sx={{
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 1,
                            }}
                        >
                            ระบบรายงานทรัพยากรเครื่องเสมือน
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            VM Resource Intelligence System - วิเคราะห์และพยากรณ์ทรัพยากร VM อย่างครบวงจร
                        </Typography>
                    </Box>
                )}

                {/* Desktop Tabs */}
                {!isMobile && (
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 3,
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            variant="fullWidth"
                            sx={{
                                '& .MuiTab-root': {
                                    minHeight: 64,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                },
                                '& .Mui-selected': {
                                    color: 'primary.main',
                                },
                            }}
                        >
                            {menuItems.map((item) => (
                                <Tab
                                    key={item.index}
                                    label={item.label}
                                    icon={item.icon}
                                    iconPosition="start"
                                />
                            ))}
                        </Tabs>
                    </Paper>
                )}

                {/* Tab Panels */}
                <TabPanel value={activeTab} index={0}>
                    <ExecutiveDashboard />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <VMIntelligenceReport />
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    <CapacityPlanning />
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                    <EfficiencyReport />
                </TabPanel>
            </Container>
        </Box>
    );
}
