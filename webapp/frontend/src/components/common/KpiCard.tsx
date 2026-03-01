import React from 'react'
import { Card, Box, Stack, Avatar, Typography } from '@mui/material'

interface KpiCardProps {
    title: string
    value: string | number
    sub?: string
    color?: string
    icon?: React.ReactNode
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, sub, color = '#2196f3', icon }) => (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: color + '20', color, width: 44, height: 44 }}>{icon}</Avatar>
                <Box flex={1} minWidth={0}>
                    <Typography variant="caption" color="text.secondary" noWrap>{title}</Typography>
                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{value}</Typography>
                    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
                </Box>
            </Stack>
        </Box>
    </Card>
)
