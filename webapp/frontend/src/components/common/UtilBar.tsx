import React from 'react'
import { Box, Stack, Typography, LinearProgress } from '@mui/material'

interface UtilBarProps {
    label: string
    pct: number
}

const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`

export const UtilBar: React.FC<UtilBarProps> = ({ label, pct }) => {
    const color = pct >= 90 ? 'error' : pct >= 75 ? 'warning' : 'success'
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption">{label}</Typography>
                <Typography variant="caption" fontWeight={600}>{fmtPct(pct)}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={Math.min(pct, 100)} color={color} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
    )
}
