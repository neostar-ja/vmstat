import React from 'react';
import { Grid, Box } from '@mui/material';
import VMCardNew from './VMCardNew';
import type { VM } from '../../types';

interface ModernVMGridProps {
    vms: VM[];
    formatUsage: (value: number | null) => string;
    formatStorage: (mb: number | null) => string;
    getUsageColor: (percentage: number) => { main: string; light: string; dark: string; bg: string };
}

const ModernVMGrid: React.FC<ModernVMGridProps> = ({
    vms,
    formatUsage,
    formatStorage,
    getUsageColor
}) => {
    return (
        <Box sx={{
            px: { xs: 0, sm: 2 },
            width: '100%',
            overflowX: 'hidden' // Force no horizontal scrolling at the grid level
        }}>
            {/* 
              MUI Grid generates negative margins which pushes content outside the bounds 
              on small mobile screens causing an overflow and horizontal scrolling.
              Adding mx: 0 and width: 100% fixes this. 
            */}
            <Grid container spacing={{ xs: 1.5, sm: 2.5, md: 3 }} sx={{ mt: 0.5, mx: 0, width: '100%' }}>
                {vms.map((vm) => (
                    <Grid item xs={12} sm={6} md={6} lg={4} xl={3} key={vm.vm_uuid} sx={{ px: { xs: 0, sm: undefined } }}>
                        <VMCardNew
                            vm={vm}
                            formatStorage={formatStorage}
                            getUsageColor={getUsageColor}
                            formatUsage={formatUsage}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default ModernVMGrid;
