import React from 'react'
import { Stack, Grid, Chip } from '@mui/material'
import { History, CheckCircle, Error as ErrorIcon, Refresh } from '@mui/icons-material'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

export const RenderVmControlActions: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.actions || []; const summary = data.summary || {}
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="Actions รวม" value={summary.total_actions ?? 0} icon={<History />} color="#2196f3" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Start" value={summary.start_count ?? summary.by_action?.start ?? 0} icon={<CheckCircle />} color="#4caf50" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Stop" value={summary.stop_count ?? summary.by_action?.stop ?? 0} icon={<ErrorIcon />} color="#f44336" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Reboot" value={summary.reboot_count ?? summary.by_action?.reboot ?? 0} icon={<Refresh />} color="#ff9800" /></Grid>
            </Grid>
            <SortableTable defaultSort="performed_at" defaultDir="desc" columns={[
                { id: 'vm_name', label: 'VM' },
                { id: 'action', label: 'Action', render: (v: string) => <Chip label={v} size="small" color={v === 'start' ? 'success' : v === 'stop' ? 'error' : 'warning'} /> },
                { id: 'performed_by', label: 'ผู้ดำเนินการ' },
                { id: 'performed_at', label: 'เวลา', render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
                { id: 'success', label: 'ผลลัพธ์', render: (v: boolean) => <Chip label={v ? 'success' : 'failed'} size="small" color={v ? 'success' : 'error'} variant="outlined" /> },
            ]} rows={rows} />
        </Stack>
    )
}
