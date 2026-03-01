import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Paper,
    useTheme,
    alpha,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    SdStorage as SdStorageIcon,
    CloudOff as CloudOffIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { syncApi } from '../services/api';
// import ExecutiveDatastoreCard from '../components/ExecutiveDatastoreCard'; // Replaced by SortableDatastoreItem
import SortableDatastoreItem from '../components/SortableDatastoreItem';

// Types
interface DatastoreData {
    datastore_id: string;
    name: string;
    az_id: string | null;
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


const DataStoreExecutiveDashboard: React.FC = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const { data, error, isLoading } = useQuery({
        queryKey: ['datastore-dashboard-data'],
        queryFn: async () => {
            const res = await syncApi.getDatastoreDashboardData();
            return res.data;
        },
        refetchInterval: 30000,
    });

    const datastores: DatastoreData[] = data?.data || [];
    const [items, setItems] = useState<DatastoreData[]>([]);

    // Sync items with fetched data
    React.useEffect(() => {
        if (datastores.length > 0) {
            // Only update if items are empty or if the source data has changed significantly
            // For now, simpler equality check or just standard update
            setItems(datastores);
        }
    }, [data]); // data triggers update

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required to start drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.datastore_id === active.id);
                const newIndex = items.findIndex((item) => item.datastore_id === over?.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                // Save the new order
                const newOrderIds = newItems.map(item => item.datastore_id);
                syncApi.saveDatastoreOrder(newOrderIds).catch(err => {
                    console.error('Failed to save order:', err);
                });

                return newItems;
            });
        }
    };

    // Listen for fullscreen changes
    React.useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
                <CircularProgress size={56} thickness={4} sx={{ color: '#0ea5e9' }} />
                <Typography variant="body1" color="text.secondary" fontWeight={600}>
                    กำลังโหลดข้อมูล...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2, borderRadius: 3 }}>
                ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ
            </Alert>
        );
    }

    return (
        <Box
            ref={containerRef}
            sx={{
                py: 2,
                px: { xs: 1, sm: 2 },
                bgcolor: isFullscreen ? 'background.default' : 'transparent',
                minHeight: isFullscreen ? '100vh' : 'auto',
                overflowY: isFullscreen ? 'auto' : 'visible',
            }}
        >
            <Box className="animate-fade-in">
                {/* ===== SECTION HEADER ===== */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SdStorageIcon sx={{ color: '#0ea5e9', fontSize: 22 }} />
                        <Typography variant="h6" fontWeight={800} color="text.primary">
                            รายละเอียด Data Store
                        </Typography>
                        <Chip
                            label={`${items.length} รายการ`}
                            size="small"
                            sx={{
                                height: 22,
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                bgcolor: alpha('#0ea5e9', isDark ? 0.2 : 0.1),
                                color: '#0ea5e9',
                            }}
                        />
                    </Box>
                    <Tooltip title={isFullscreen ? "ออกจากเต็มหน้าจอ" : "เต็มหน้าจอ"}>
                        <IconButton
                            onClick={handleToggleFullscreen}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                },
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            }}
                        >
                            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* ===== DATASTORE CARDS GRID (2 columns) - Sortable ===== */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={items.map((ds) => ds.datastore_id)}
                        strategy={rectSortingStrategy}
                    >
                        <Grid container spacing={2.5}>
                            {items.map((ds, index) => (
                                <SortableDatastoreItem key={ds.datastore_id} id={ds.datastore_id} data={ds} index={index} />
                            ))}
                        </Grid>
                    </SortableContext>
                </DndContext>

                {/* ===== EMPTY STATE ===== */}
                {items.length === 0 && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            borderRadius: 4,
                            bgcolor: isDark ? alpha('#1e293b', 0.5) : alpha('#f8fafc', 0.8),
                            border: `2px dashed ${isDark ? alpha('#475569', 0.4) : alpha('#cbd5e1', 0.6)}`,
                        }}
                    >
                        <CloudOffIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                        <Typography variant="h6" color="text.secondary" fontWeight={700}>
                            ไม่พบ Data Store
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                            กรุณาตรวจสอบการตั้งค่า Sync หรือเลือก Data Store ในหน้าตั้งค่า
                        </Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default DataStoreExecutiveDashboard;
