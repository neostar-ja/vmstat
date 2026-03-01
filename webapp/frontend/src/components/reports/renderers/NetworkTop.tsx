import React from 'react'
import { Stack, Card, Typography } from '@mui/material'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'
import { SortableTable } from '../../common/SortableTable'

const fmtMbps = (v: number) => `${(v ?? 0).toFixed(2)} Mbps`

export const RenderNetworkTop: React.FC<{ data: any }> = ({ data }) => {
    const rows = data.data || []
    const chartData = rows.slice(0, 15).map((r: any) => ({
        name: r.vm_name?.length > 14 ? r.vm_name.substring(0, 14) + '…' : r.vm_name,
        RX: r.avg_rx_mbps, TX: r.avg_tx_mbps
    }))
    return (
        <Stack spacing={3}>
            {chartData.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600} mb={2}>Top 15 VM — Network Bandwidth (Mbps)</Typography>
                    <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 12 }} unit=" M" />
                            <ReTooltip formatter={(v: number) => `${v.toFixed(2)} Mbps`} />
                            <Legend />
                            <Bar dataKey="RX" fill="#4caf50" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="TX" fill="#2196f3" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
            <SortableTable defaultSort="avg_total_mbps" columns={[
                { id: 'vm_name', label: 'ชื่อ VM' }, { id: 'group_name', label: 'กลุ่ม' }, { id: 'az_name', label: 'AZ' },
                { id: 'avg_rx_mbps', label: 'Avg RX', numeric: true, render: fmtMbps },
                { id: 'avg_tx_mbps', label: 'Avg TX', numeric: true, render: fmtMbps },
                { id: 'max_rx_mbps', label: 'Max RX', numeric: true, render: fmtMbps },
                { id: 'max_tx_mbps', label: 'Max TX', numeric: true, render: fmtMbps },
                { id: 'avg_total_mbps', label: 'Total รวม', numeric: true, render: fmtMbps },
                { id: 'sample_count', label: 'Samples', numeric: true },
            ]} rows={rows} />
        </Stack>
    )
}
