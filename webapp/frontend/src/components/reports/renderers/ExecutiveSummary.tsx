import React from 'react'
import { Stack, Grid, Alert } from '@mui/material'
import { Assessment, CheckCircle, SpeedOutlined, Dns, Warning } from '@mui/icons-material'
import { KpiCard } from '../../common/KpiCard'

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`

export const RenderExecutiveSummary: React.FC<{ data: any }> = ({ data }) => {
    const kpis = data.kpis || data.summary || data.vm_summary || {};
    const util = data.utilization || {};
    const alarms = data.alarm_summary || {};
    const infra = data.host_summary || {};
    return (
        <Stack spacing={3}>
            <Grid container spacing={2}>
                {([
                    { label: 'VM ทั้งหมด', v: kpis.total_vms ?? infra.total_vms, icon: <Assessment />, color: '#2196f3' },
                    { label: 'VM กำลังรัน', v: util.running_vms ?? kpis.running_vms ?? infra.running_vms, icon: <CheckCircle />, color: '#4caf50' },
                    { label: 'Host รวม', v: infra.total_hosts ?? kpis.total_hosts, icon: <Dns />, color: '#ff9800' },
                    { label: 'CPU เฉลี่ย', v: fmtPct(util.avg_cpu ?? kpis.avg_cpu_pct ?? 0), icon: <SpeedOutlined />, color: '#9c27b0' },
                    { label: 'RAM เฉลี่ย', v: fmtPct(util.avg_memory ?? kpis.avg_memory_pct ?? 0), icon: <Assessment />, color: '#e91e63' },
                    { label: 'Alarm Active', v: alarms.open_alarms ?? kpis.active_alarms ?? 0, icon: <Warning />, color: '#f44336' },
                ] as { label: string; v: any; icon: React.ReactNode; color: string }[]).map(({ label, v, icon, color }) => (
                    <Grid item xs={6} sm={4} md={2} key={label}><KpiCard title={label} value={String(v ?? 0)} icon={icon} color={color} /></Grid>
                ))}
            </Grid>
            <Alert severity="info" sx={{ borderRadius: 2 }}>รายงานผู้บริหาร — ภาพรวมระบบ ณ เวลาปัจจุบัน</Alert>
        </Stack>
    )
}
