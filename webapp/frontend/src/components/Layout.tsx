import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
    Box,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    TopBar,
} from './topbar';
import { Sidebar } from './sidebar';
import { Footer } from './footer';

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

export default function Layout() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // Auto-collapse on tablet
    useEffect(() => {
        if (isTablet && !isMobile) {
            setCollapsed(true);
        }
    }, [isTablet, isMobile]);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleCollapseToggle = () => setCollapsed(!collapsed);

    const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;



    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Sidebar Component */}
            <Sidebar
                isMobile={isMobile}
                mobileOpen={mobileOpen}
                collapsed={collapsed}
                onMobileToggle={handleDrawerToggle}
                onCollapseToggle={handleCollapseToggle}
            />

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${currentDrawerWidth}px)` },
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Top Header Bar */}
                <TopBar onMobileMenuToggle={handleDrawerToggle} />

                {/* Page Content */}
                <Box
                    sx={{
                        flex: 1,
                        p: { xs: 2, sm: 2.5, md: 3, lg: 4 },
                        overflow: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: '1600px' }}>
                        <Outlet />
                    </Box>
                </Box>

                {/* Footer Component */}
                <Footer />
            </Box>
        </Box>
    );
}
