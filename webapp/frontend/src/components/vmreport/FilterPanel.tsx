import { useState } from 'react';
import {
    Card, CardContent, Grid, Autocomplete, TextField,
    FormControl, InputLabel, Select, MenuItem, Button,
    useTheme, alpha
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Search } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface FilterPanelProps {
    onApply: (config: {
        az: string;
        vmUuid: string;
        vmName: string;
        days: number;
        interval: 'hour' | 'day';
    }) => void;
}

export default function FilterPanel({ onApply }: FilterPanelProps) {
    const theme = useTheme();

    // Form State
    const [az, setAz] = useState<string>('all');
    const [vm, setVm] = useState<any>(null);
    const [days, setDays] = useState<number>(7);
    const [interval, setInterval] = useState<'hour' | 'day'>('hour');

    // Fetch VMs for autocomplete
    const { data: vmsData, isLoading: isLoadingVMs } = useQuery({
        queryKey: ['vms-list'],
        queryFn: async () => {
            const res = await api.get('/vms?page=1&page_size=200');
            return res.data?.items || [];
        }
    });

    const handleApply = () => {
        if (!vm) return;
        onApply({
            az,
            vmUuid: vm.vm_uuid || vm.id || '',
            vmName: vm.vm_name || vm.name || 'Unknown VM',
            days,
            interval
        });
    };

    return (
        <Card
            elevation={0}
            sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.6),
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
            }}
        >
            <CardContent className="p-4">
                <Grid container spacing={2} alignItems="center">
                    {/* AZ Select */}
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Availability Zone</InputLabel>
                            <Select
                                value={az}
                                label="Availability Zone"
                                onChange={(e: SelectChangeEvent) => setAz(e.target.value)}
                            >
                                <MenuItem value="all">ทั้งหมด (All AZ)</MenuItem>
                                {/* Add more zones here when API supports it */}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* VM Autocomplete */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            size="small"
                            options={vmsData || []}
                            getOptionLabel={(option) => option.name || option.vm_name || ''}
                            value={vm}
                            onChange={(_e, newValue) => setVm(newValue)}
                            loading={isLoadingVMs}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="เลือก Virtual Machine"
                                    placeholder="ค้นหาชื่อ VM..."
                                    variant="outlined"
                                    required
                                    error={!vm}
                                />
                            )}
                        />
                    </Grid>

                    {/* Date Range & Interval */}
                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>ช่วงเวลา</InputLabel>
                            <Select
                                value={days}
                                label="ช่วงเวลา"
                                onChange={(e: SelectChangeEvent<number>) => setDays(e.target.value as number)}
                            >
                                <MenuItem value={1}>1 วัน</MenuItem>
                                <MenuItem value={7}>7 วัน</MenuItem>
                                <MenuItem value={30}>30 วัน</MenuItem>
                                <MenuItem value={90}>90 วัน</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>ความถี่</InputLabel>
                            <Select
                                value={interval}
                                label="ความถี่"
                                onChange={(e: SelectChangeEvent) => setInterval(e.target.value as 'hour' | 'day')}
                            >
                                <MenuItem value="hour">รายชั่วโมง (Hour)</MenuItem>
                                <MenuItem value="day">รายวัน (Day)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Apply Button */}
                    <Grid item xs={12} sm={4} md={2}>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Search />}
                            onClick={handleApply}
                            disabled={!vm}
                            sx={{ height: 40, borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                        >
                            สร้างรายงาน
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
