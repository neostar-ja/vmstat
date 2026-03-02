import React, { useState, Suspense } from 'react';
import { Box, Tab, Tabs, Typography, CircularProgress, Alert, Button, IconButton, Tooltip } from '@mui/material';
import FilterPanel from './FilterPanel';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { format, subDays } from 'date-fns';

// Lazy load sub-tabs for performance
const VMSnapshotTab = React.lazy(() => import('./tabs/VMSnapshotTab'));
const VMPerformanceTab = React.lazy(() => import('./tabs/VMPerformanceTab'));
const VMCapacityTab = React.lazy(() => import('./tabs/VMCapacityTab'));
const VMOptimizationTab = React.lazy(() => import('./tabs/VMOptimizationTab'));
const VMHealthTab = React.lazy(() => import('./tabs/VMHealthTab'));
const VMOperationTab = React.lazy(() => import('./tabs/VMOperationTab'));

import { Dashboard, TrendingUp, Storage, AutoAwesome, MonitorHeart, History, Print, Download, PictureAsPdf } from '@mui/icons-material';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function SubTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`subreport-tabpanel-${index}`}
            aria-labelledby={`subreport-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function VMIntelligenceReport() {
    const [subTab, setSubTab] = useState(0);

    // Global filter state for this report
    const [filterConfig, setFilterConfig] = useState<any>(null);

    const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setSubTab(newValue);
    };

    const handleFilterApply = (config: any) => {
        setFilterConfig(config);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (!reportData) return;
        // Basic CSV Export Logic (mock)
        const csvContent = "data:text/csv;charset=utf-8,Mock,CSV,Export\n1,2,3";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vm_report_${filterConfig?.vmName || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Fetch the full report when filterConfig changes
    const { data: reportData, isLoading, error } = useQuery({
        queryKey: ['vm-full-report', filterConfig],
        queryFn: async () => {
            if (!filterConfig) return null;
            const endDate = new Date();
            const startDate = subDays(endDate, filterConfig.days);

            const params = new URLSearchParams({
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                interval: filterConfig.interval
            });

            const res = await api.get(`/reports/vm-full-report/${filterConfig.vmUuid}?${params.toString()}`);
            return res.data?.data;
        },
        enabled: !!filterConfig,
        refetchOnWindowFocus: false,
    });

    return (
        <Box className="space-y-4">
            <Box className="flex justify-between items-center mb-4">
                <Typography variant="h5" fontWeight={700}>
                    Enterprise VM Intelligence Center
                </Typography>

                {reportData && (
                    <Box className="flex gap-2">
                        <Tooltip title="พิมพ์รายงาน">
                            <IconButton onClick={handlePrint} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
                                <Print />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="ส่งออกข้อมูลเป็น CSV">
                            <Button variant="outlined" startIcon={<Download />} onClick={handleExportCSV}>
                                CSV
                            </Button>
                        </Tooltip>
                        <Tooltip title="ส่งออกข้อมูลเป็น PDF (Print format)">
                            <Button variant="contained" startIcon={<PictureAsPdf />} onClick={handlePrint}>
                                PDF
                            </Button>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            <FilterPanel onApply={handleFilterApply} />

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    เกิดข้อผิดพลาดในการโหลดข้อมูล: {(error as Error).message}
                </Alert>
            )}

            {/* Sub-tabs section */}
            <Box sx={{ width: '100%', mt: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={subTab}
                        onChange={handleSubTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                minHeight: 56,
                            },
                        }}
                    >
                        <Tab icon={<Dashboard />} iconPosition="start" label="ภาพรวม" />
                        <Tab icon={<TrendingUp />} iconPosition="start" label="ประสิทธิภาพ" />
                        <Tab icon={<Storage />} iconPosition="start" label="ความจุ" />
                        <Tab icon={<AutoAwesome />} iconPosition="start" label="การปรับขนาด" />
                        <Tab icon={<MonitorHeart />} iconPosition="start" label="สุขภาพ" />
                        <Tab icon={<History />} iconPosition="start" label="การดำเนินการ" />
                    </Tabs>
                </Box>

                {/* Loading State overlays the tabs content */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Suspense fallback={
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress size={30} />
                        </Box>
                    }>
                        <SubTabPanel value={subTab} index={0}>
                            <VMSnapshotTab data={reportData} filterConfig={filterConfig} />
                        </SubTabPanel>
                        <SubTabPanel value={subTab} index={1}>
                            <VMPerformanceTab data={reportData} filterConfig={filterConfig} />
                        </SubTabPanel>
                        <SubTabPanel value={subTab} index={2}>
                            <VMCapacityTab data={reportData} filterConfig={filterConfig} />
                        </SubTabPanel>
                        <SubTabPanel value={subTab} index={3}>
                            <VMOptimizationTab data={reportData} filterConfig={filterConfig} />
                        </SubTabPanel>
                        <SubTabPanel value={subTab} index={4}>
                            <VMHealthTab data={reportData} filterConfig={filterConfig} />
                        </SubTabPanel>
                        <SubTabPanel value={subTab} index={5}>
                            <VMOperationTab data={reportData} filterConfig={filterConfig} />
                        </SubTabPanel>
                    </Suspense>
                )}
            </Box>
        </Box>
    );
}
