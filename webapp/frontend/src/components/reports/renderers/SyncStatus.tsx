import React from 'react'
import { Stack, Grid, Chip } from '@mui/material'
import { CheckCircle, Error as ErrorIcon, History, Sync } from '@mui/icons-material'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

export const RenderSyncStatus: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.jobs || data.recent_jobs || []; const summary = data.summary || data.stats || {}
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="งาน Sync รวม" value={summary.total_jobs ?? rows.length} icon={<Sync />} color="#2196f3" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="สำเร็จ" value={summary.success_count ?? summary.successful_jobs ?? 0} icon={<CheckCircle />} color="#4caf50" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="ล้มเหลว" value={summary.failed_count ?? summary.failed_jobs ?? 0} icon={<ErrorIcon />} color="#f44336" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="เวลาเฉลี่ย" value={`${Math.round((summary.avg_duration_ms ?? 0) / 1000)}s`} icon={<History />} color="#9c27b0" /></Grid>
            </Grid>
            <SortableTable defaultSort="started_at" defaultDir="desc" columns={[
                { id: 'source', label: 'แหล่งข้อมูล' },
                { id: 'status', label: 'สถานะ', render: (v: string) => <Chip label={v} size="small" color={v === 'success' ? 'success' : v === 'failed' ? 'error' : 'warning'} /> },
                { id: 'started_at', label: 'เริ่ม', render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
                { id: 'duration_ms', label: 'เวลา (s)', numeric: true, render: (v: number) => (v / 1000).toFixed(1) },
                { id: 'total_vms_fetched', label: 'VM records', numeric: true },
            ]} rows={rows} />
        </Stack>
    )
}
