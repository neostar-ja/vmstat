# 📊 Data Store Executive Dashboard - Technical Implementation Guide

## Overview

This document describes the technical implementation of the Data Store Executive Dashboard feature added to the Sangfor SCP VMStat application.

## Implementation Date
**February 14, 2026**

## Files Modified/Created

### New Files Created:
1. **`/opt/code/sangfor_scp/webapp/frontend/src/pages/DataStoreExecutiveDashboard.tsx`**
   - Main executive dashboard component
   - Implements full-screen mode
   - Implements high-resolution PNG export
   - Responsive single-page layout

### Modified Files:
1. **`/opt/code/sangfor_scp/webapp/frontend/src/pages/DataStorePage.tsx`**
   - Added tab navigation
   - Integrated executive dashboard component
   - Added imports for Tabs, Tab MUI components

## Features Implemented

### 1. Tab Navigation
- Added Material-UI Tabs component to DataStorePage
- Two tabs:
  - **"รายการ Data Store"** (Data Store List): Original table view
  - **"ภาพรวมผู้บริหาร"** (Executive Overview): New executive dashboard

### 2. Executive Dashboard Components

#### Summary Cards
- 4 summary cards showing key metrics:
  - Total Data Store count
  - Total capacity
  - Used space
  - Free space
- Uses gradient backgrounds for visual appeal
- Animated hover effects

#### Visualization Charts
- **Pie Chart**: Shows distribution of used space across datastores
- **Bar Chart**: Compares used vs free space in GB
- Both charts use Recharts library
- Custom tooltips with formatted data

#### Datastore Cards
- Individual cards for each datastore
- Features:
  - Status badges (normal/warning)
  - Type and AZ chips
  - Color-coded usage progress bars
  - Statistics grid (capacity, used, free)
  - Trend indicators (1-day and 7-day changes)
- Responsive grid layout:
  - Desktop: 3 columns
  - Tablet: 2 columns
  - Mobile: 1 column

### 3. Full-Screen Mode
- Implementation using Fullscreen API
- Toggle button in header
- Automatically detects fullscreen state changes
- Exits on ESC key
- Optimized padding for full-screen display

### 4. High-Resolution Export
- Uses html2canvas library (already installed)
- Export settings:
  - Scale: 3x (ultra-high resolution)
  - Quality: 100%
  - Format: PNG
  - Filename: `datastore-executive-dashboard-YYYY-MM-DD.png`
- Handles dark/light mode backgrounds
- Loading indicator during export

### 5. Auto-Refresh
- Uses TanStack Query (React Query)
- Refresh interval: 60 seconds (60000ms)
- Manual refresh button available
- Maintains state during refresh

## Technical Stack

### Frontend Technologies
- **React**: 18.2+
- **TypeScript**: 5.3+
- **Material-UI (MUI)**: 5.15+
- **Tailwind CSS**: 3.4+ (utility classes available)
- **Recharts**: 2.10+ (charts)
- **html2canvas**: 1.4+ (export functionality)
- **TanStack Query**: 5.17+ (data fetching)

### Design Patterns
- **Component-based architecture**: Reusable components
- **Hooks**: useState, useEffect, useRef, useQuery
- **Responsive design**: Mobile-first approach
- **Theme-aware**: Uses MUI theme for dark/light mode

## Color Palette

### Usage Level Colors
```typescript
const getUsageColor = (percent: number) => {
    if (percent >= 90) return COLORS.danger;    // #ef4444 (Red)
    if (percent >= 80) return COLORS.warning;   // #f59e0b (Orange)
    if (percent >= 70) return { main: '#facc15' }; // Yellow
    return COLORS.success;                       // #10b981 (Green)
};
```

### Component Colors
- **Primary**: #2563eb (Blue) - Main theme
- **Success**: #10b981 (Green) - Positive states
- **Warning**: #f59e0b (Orange) - Caution
- **Danger**: #ef4444 (Red) - Critical
- **Info**: #06b6d4 (Cyan) - Information
- **Purple**: #8b5cf6 (Purple) - Accent

## API Integration

### Endpoint Used
- **`GET /vmstat/api/sync/dashboard/datastore-data`**
  - Returns selected datastores with metrics
  - Includes trend data (yesterday, week)
  - Filtered by admin settings

### Data Structure
```typescript
interface DatastoreData {
    datastore_id: string;
    name: string;
    az_id: string | null;
    az_name: string;
    type: string;
    status: string;
    total_mb: number;
    used_mb: number;
    free_mb: number;
    usage_percent: number;
    change_yesterday_mb: number | null;
    change_yesterday_percent: number | null;
    change_week_mb: number | null;
    change_week_percent: number | null;
    updated_at: string;
}
```

## Responsive Breakpoints

### Grid Layout
- **xs (< 600px)**: 1 column
- **sm (600px - 960px)**: 2 columns
- **md (960px - 1280px)**: 2 columns
- **lg (1280px+)**: 3-4 columns

### Chart Heights
- Summary cards: 120px
- Charts: 320px
- Datastore cards: Auto-height (min 280px)

## Performance Optimizations

1. **React Query Caching**: Reduces unnecessary API calls
2. **Memoization**: Charts data prepared once
3. **Lazy Loading**: Components load on-demand
4. **Debounced Export**: Prevents multiple simultaneous exports
5. **Optimized Rendering**: Uses React best practices

## Browser Compatibility

### Tested On
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required Features
- ES6+ JavaScript
- Flexbox/Grid CSS
- Fullscreen API
- Canvas API (for export)

## Deployment

### Build Process
The component is automatically included in the production build:
```bash
cd /opt/code/sangfor_scp/webapp
./start.sh
```

### Docker Containers
- **Frontend**: nginx:alpine serving React build
- **Backend**: Python FastAPI application
- No additional configuration required

## Testing

### Manual Testing Checklist
- [x] Tab navigation works
- [x] Dashboard loads data correctly
- [x] Summary cards display accurate totals
- [x] Charts render properly
- [x] Datastore cards show all information
- [x] Usage colors match thresholds
- [x] Trends show correct indicators
- [x] Responsive layout works on all screen sizes
- [x] Full-screen mode toggles correctly
- [x] Export creates high-quality PNG
- [x] Auto-refresh works (60s interval)
- [x] Manual refresh button works
- [x] Dark/Light mode compatibility

### Known Limitations
1. Export quality depends on browser canvas implementation
2. Fullscreen may require user permission in some browsers
3. Very large datasets (50+ datastores) may slow export

## Future Enhancements

### Potential Improvements
1. **PDF Export**: Add PDF export option
2. **Customizable Refresh**: Allow users to set refresh interval
3. **Filters**: Add filtering by AZ, type, status
4. **Sorting**: Sort datastores by various criteria
5. **Favorites**: Mark favorite datastores for quick access
6. **Alerts**: Visual alerts for critical thresholds
7. **Comparison Mode**: Compare multiple time periods
8. **Drill-down**: Click cards to see detailed metrics

## Troubleshooting

### Issue: Dashboard shows no data
**Solution**: Check that datastores are selected in Admin Settings > Data Store Dashboard

### Issue: Export fails
**Solution**: 
1. Check browser console for errors
2. Try disabling browser extensions
3. Ensure sufficient memory available

### Issue: Full-screen doesn't work
**Solution**: Some browsers block fullscreen by default. Check browser settings.

### Issue: Charts don't render
**Solution**: 
1. Verify Recharts is installed: `npm list recharts`
2. Check browser console for errors
3. Try hard refresh (Ctrl+F5)

## Code Structure

### Component Hierarchy
```
DataStorePage
├── Tabs
│   ├── Tab: "รายการ Data Store" (Original)
│   └── Tab: "ภาพรวมผู้บริหาร"
└── DataStoreExecutiveDashboard
    ├── Header (with controls)
    ├── Summary Cards Grid
    │   ├── SummaryCard (Total)
    │   ├── SummaryCard (Capacity)
    │   ├── SummaryCard (Used)
    │   └── SummaryCard (Free)
    ├── Charts Row
    │   ├── PieChart Card
    │   └── BarChart Card
    └── Datastore Cards Grid
        └── DatastoreCard[] (mapped)
```

### Key Functions

```typescript
// Full-screen toggle
const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
        await dashboardRef.current?.requestFullscreen();
    } else {
        await document.exitFullscreen();
    }
};

// Export to PNG
const handleExport = async () => {
    const canvas = await html2canvas(dashboardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
    });
    // Download logic...
};

// Format bytes
const formatBytes = (mb: number): string => {
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(2)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(0)} MB`;
};
```

## Maintenance

### Regular Updates
- Update dependencies quarterly
- Review color palette for accessibility
- Monitor performance on large datasets
- Gather user feedback

### Monitoring
- Check browser console for warnings
- Monitor API response times
- Track export success rate
- Monitor query cache hit rate

## Documentation Files

1. **User Guide**: `/opt/code/sangfor_scp/document/EXECUTIVE_DASHBOARD_GUIDE.md`
2. **Technical Guide**: This file
3. **API Documentation**: `/opt/code/sangfor_scp/document/COMPREHENSIVE_MANUAL.md`

## Credits

**Developed by**: AI Agent  
**Date**: February 14, 2026  
**Version**: 1.0  
**Framework**: React + Material-UI + Tailwind CSS  
**Charts**: Recharts  
**Export**: html2canvas  

---

**Last Updated**: February 14, 2026
