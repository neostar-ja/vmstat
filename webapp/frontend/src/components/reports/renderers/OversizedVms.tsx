import React from 'react'
import { Stack, Alert, Chip } from '@mui/material'
import { SpeedOutlined } from '@mui/icons-material'
import { SortableTable } from '../../common/SortableTable'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`
const fmtGb = (v: number) => `${(v ?? 0).toFixed(1)} GB`

export const RenderOversizedVms: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.data || []
    return (
        <Stack spacing={3}>
            <Alert severity="info" icon={<SpeedOutlined />}>พบ VM over-provisioned <strong>{data.total}</strong> รายการ — ควรพิจารณา Right-Sizing</Alert>
            <SortableTable defaultSort="avg_cpu_pct" defaultDir="asc" columns={[
                { id: 'vm_name', label: 'ชื่อ VM' }, { id: 'group_name', label: 'กลุ่ม' }, { id: 'az_name', label: 'AZ' },
                { id: 'cpu_cores', label: 'Cores', numeric: true }, { id: 'memory_total_gb', label: 'RAM (GB)', numeric: true, render: fmtGb },
                { id: 'avg_cpu_pct', label: 'Avg CPU %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={v < 10 ? 'error' : v < 30 ? 'warning' : 'default'} /> },
                { id: 'max_cpu_pct', label: 'Max CPU %', numeric: true, render: fmtPct },
                { id: 'avg_memory_pct', label: 'Avg RAM %', numeric: true, render: (v: number) => <Chip label={fmtPct(v)} size="small" color={v < 20 ? 'error' : v < 40 ? 'warning' : 'default'} /> },
                { id: 'cpu_status', label: 'CPU Status', render: (v: string) => <Chip label={v} size="small" color={v === 'oversized' ? 'warning' : 'default'} variant="outlined" /> },
                { id: 'memory_status', label: 'RAM Status', render: (v: string) => <Chip label={v} size="small" color={v === 'oversized' ? 'warning' : 'default'} variant="outlined" /> },
            ]} rows={rows} />
        </Stack>
    )
}
