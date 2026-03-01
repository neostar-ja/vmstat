import React from 'react'
import { Stack, Grid, Chip } from '@mui/material'
import { Security, Error as ErrorIcon } from '@mui/icons-material'
import { KpiCard } from '../../common/KpiCard'
import { SortableTable } from '../../common/SortableTable'

export const RenderProtectionStatus: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.unprotected_vms || data.vms || []; const summary = data.summary || {}
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><KpiCard title="Protected" value={summary.protected_count ?? summary.protected ?? 0} icon={<Security />} color="#4caf50" /></Grid>
                <Grid item xs={6} sm={3}><KpiCard title="Unprotected" value={summary.unprotected_count ?? summary.unprotected ?? 0} icon={<ErrorIcon />} color="#f44336" /></Grid>
            </Grid>
            <SortableTable defaultSort="name" columns={[
                { id: 'name', label: 'VM' }, { id: 'group_name', label: 'กลุ่ม' },
                { id: 'protection_type', label: 'ประเภท Protection' },
                { id: 'protection_status', label: 'สถานะ', render: (v: string) => <Chip label={v || 'ไม่มี'} size="small" color={v ? 'success' : 'error'} /> },
            ]} rows={rows} />
        </Stack>
    )
}
