import React from 'react'
import { Grid, FormControl, InputLabel, Select, MenuItem, TextField, Autocomplete, Paper, Typography, Button, CircularProgress } from '@mui/material'
import { FilterList, PlayArrow } from '@mui/icons-material'

export interface FilterState {
    az_name: string; group_id: string; vm_uuid: string; vm_label: string
    hours: number; top_n: number; metric: string; cpu_threshold: number; mem_threshold: number
    start_date: string; end_date: string; interval: string
}

interface FilterPanelProps {
    filters: FilterState
    setFilter: (key: keyof FilterState, value: any) => void
    azList: { az_id: string; az_name: string }[]
    groupList: { group_id: string; group_name: string }[]
    vmList: { vm_uuid: string; name: string }[]
    selectedReport: any
    onApply: () => void
    loading?: boolean
}

const METRIC_OPTIONS = [
    { value: 'cpu', label: 'CPU' }, { value: 'memory', label: 'Memory' },
    { value: 'storage', label: 'Storage' }, { value: 'network', label: 'Network' },
    { value: 'disk_iops', label: 'Disk IOPS' },
]

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilter, azList, groupList, vmList, selectedReport, onApply, loading }) => (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FilterList fontSize="small" /> ตัวกรอง
        </Typography>
        <Grid container spacing={1.5} alignItems="center">
            {selectedReport?.id !== 'vm_historical_analytics' && (
                <>
                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>AZ</InputLabel>
                            <Select value={filters.az_name} label="AZ" onChange={e => setFilter('az_name', e.target.value)}>
                                <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                                {azList.map(az => <MenuItem key={az.az_id} value={az.az_name}>{az.az_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>กลุ่ม VM</InputLabel>
                            <Select value={filters.group_id} label="กลุ่ม VM" onChange={e => setFilter('group_id', e.target.value)}>
                                <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                                {groupList.map(g => <MenuItem key={g.group_id} value={g.group_id}>{g.group_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>ช่วงเวลา</InputLabel>
                            <Select value={filters.hours} label="ช่วงเวลา" onChange={e => setFilter('hours', e.target.value)}>
                                {[1, 6, 12, 24, 48, 72, 168, 336, 720].map(h => (
                                    <MenuItem key={h} value={h}>{h < 24 ? `${h} ชม.` : `${h / 24} วัน`}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </>
            )}
            {selectedReport?.id === 'vm_historical_analytics' && (
                <>
                    <Grid item xs={6} sm={4} md={2.5}>
                        <TextField fullWidth size="small" label="Start Date" type="datetime-local"
                            value={filters.start_date} onChange={e => setFilter('start_date', e.target.value)}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6} sm={4} md={2.5}>
                        <TextField fullWidth size="small" label="End Date" type="datetime-local"
                            value={filters.end_date} onChange={e => setFilter('end_date', e.target.value)}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>ความถี่</InputLabel>
                            <Select value={filters.interval} label="ความถี่" onChange={e => setFilter('interval', e.target.value)}>
                                <MenuItem value="hour">รายชั่วโมง (Hour)</MenuItem>
                                <MenuItem value="day">รายวัน (Day)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </>
            )}
            {selectedReport?.id === 'top_vms' && (
                <>
                    <Grid item xs={6} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Metric</InputLabel>
                            <Select value={filters.metric} label="Metric" onChange={e => setFilter('metric', e.target.value)}>
                                {METRIC_OPTIONS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <TextField fullWidth size="small" label="Top N" type="number" value={filters.top_n}
                            inputProps={{ min: 1, max: 100 }} onChange={e => setFilter('top_n', parseInt(e.target.value))} />
                    </Grid>
                </>
            )}
            {selectedReport?.id === 'idle_vms' && (
                <>
                    <Grid item xs={6} sm={4} md={2}>
                        <TextField fullWidth size="small" label="CPU Threshold (%)" type="number" value={filters.cpu_threshold}
                            inputProps={{ min: 1, max: 100 }} onChange={e => setFilter('cpu_threshold', parseFloat(e.target.value))} />
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <TextField fullWidth size="small" label="RAM Threshold (%)" type="number" value={filters.mem_threshold}
                            inputProps={{ min: 1, max: 100 }} onChange={e => setFilter('mem_threshold', parseFloat(e.target.value))} />
                    </Grid>
                </>
            )}
            {selectedReport?.id === 'network_top' && (
                <Grid item xs={6} sm={4} md={2}>
                    <TextField fullWidth size="small" label="Top N" type="number" value={filters.top_n}
                        inputProps={{ min: 1, max: 50 }} onChange={e => setFilter('top_n', parseInt(e.target.value))} />
                </Grid>
            )}
            {selectedReport?.requires_vm && (
                <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete size="small" options={vmList} getOptionLabel={o => o.name}
                        value={vmList.find(v => v.vm_uuid === filters.vm_uuid) || null}
                        onChange={(_, opt) => { setFilter('vm_uuid', opt?.vm_uuid || ''); setFilter('vm_label', opt?.name || '') }}
                        renderInput={p => <TextField {...p} label="เลือก VM" />} />
                </Grid>
            )}
            <Grid item xs={12} sm={12} md="auto" sx={{ ml: 'auto' }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                    onClick={onApply}
                    disabled={loading || (selectedReport?.requires_vm && !filters.vm_uuid)}
                    disableElevation
                >
                    ดึงรายงาน
                </Button>
            </Grid>
        </Grid>
    </Paper>
)
