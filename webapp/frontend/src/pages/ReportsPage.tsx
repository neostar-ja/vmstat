import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Grid, Card, CardActionArea, Typography, Chip,
  IconButton, Drawer,
  Divider, Alert, Tooltip,
  Stack, LinearProgress,
  useTheme, useMediaQuery, Tab, Tabs, Skeleton,
  Avatar, Fade
} from '@mui/material'
import {
  Assessment, TrendingUp, Inventory, Storage, Dns, Warning,
  Security, History, Sync, Dashboard, CloudQueue, Folder,
  PauseCircle, SpeedOutlined, NetworkCheck, DnsOutlined,
  Download, Print, Refresh, Close,
  ArrowBack, Menu as MenuIcon, ChevronLeft
} from '@mui/icons-material'

import api from '../services/api'
import { FilterPanel, FilterState } from '../components/reports/FilterPanel'
import { ReportResultRenderer } from '../components/reports/renderers'

// Types
export interface ReportType {
  id: string; name: string; description: string; category: string
  endpoint: string; icon: string; requires_vm: boolean
}

// Constants
const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด', icon: <Dashboard /> },
  { id: 'resource', label: 'ทรัพยากร', icon: <Assessment /> },
  { id: 'infrastructure', label: 'โครงสร้าง', icon: <Dns /> },
  { id: 'alarm', label: 'การแจ้งเตือน', icon: <Warning /> },
  { id: 'protection', label: 'Protection', icon: <Security /> },
  { id: 'operational', label: 'ปฏิบัติการ', icon: <History /> },
  { id: 'executive', label: 'ผู้บริหาร', icon: <Dashboard /> },
]

const CAT_COLOR: Record<string, string> = {
  resource: '#2196f3', infrastructure: '#4caf50', alarm: '#ff9800',
  protection: '#9c27b0', operational: '#009688', executive: '#e91e63',
}

const ICON_MAP: Record<string, React.ReactElement> = {
  Assessment: <Assessment />, TrendingUp: <TrendingUp />, Inventory: <Inventory />,
  Storage: <Storage />, Dns: <Dns />, Warning: <Warning />, Security: <Security />,
  History: <History />, Sync: <Sync />, Dashboard: <Dashboard />,
  CloudQueue: <CloudQueue />, Folder: <Folder />, PauseCircle: <PauseCircle />,
  SpeedOutlined: <SpeedOutlined />, NetworkCheck: <NetworkCheck />, DnsOutlined: <DnsOutlined />,
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [filters, setFilters] = useState<FilterState>({
    az_name: '', group_id: '', vm_uuid: '', vm_label: '',
    hours: 24, top_n: 10, metric: 'cpu', cpu_threshold: 20, mem_threshold: 30,
    start_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 16),
    end_date: new Date().toISOString().slice(0, 16), interval: 'hour'
  })

  const [azList, setAzList] = useState<{ az_id: string; az_name: string }[]>([])
  const [groupList, setGroupList] = useState<{ group_id: string; group_name: string }[]>([])
  const [vmList, setVmList] = useState<{ vm_uuid: string; name: string }[]>([])

  useEffect(() => { api.get('/reports/types').then((r: any) => setReportTypes(r.data.report_types || [])) }, [])
  useEffect(() => { api.get('/reports/filter/az-list').then((r: any) => setAzList(r.data.data || [])) }, [])

  useEffect(() => {
    const p = filters.az_name ? `?az_name=${encodeURIComponent(filters.az_name)}` : ''
    api.get(`/reports/filter/group-list${p}`).then((r: any) => setGroupList(r.data.data || []))
  }, [filters.az_name])

  useEffect(() => {
    const p = new URLSearchParams({ page_size: '200' })
    if (filters.az_name) p.set('az_name', filters.az_name)
    api.get(`/vms?${p}`).then((r: any) => setVmList(r.data.items || r.data.vms || r.data.data || []))
  }, [filters.az_name])

  const setFilter = (key: keyof FilterState, value: any) => {
    if (key === 'az_name') setFilters(prev => ({ ...prev, az_name: value, group_id: '', vm_uuid: '', vm_label: '' }))
    else setFilters(prev => ({ ...prev, [key]: value }))
  }

  const filtered = useMemo(() =>
    selectedCategory === 'all' ? reportTypes : reportTypes.filter(r => r.category === selectedCategory)
    , [reportTypes, selectedCategory])

  const generateReport = useCallback(async (report: ReportType) => {
    setLoading(true); setError(''); setReportData(null)
    try {
      let url = report.endpoint; const params: Record<string, any> = {}
      if (url.includes('{vm_uuid}')) {
        if (!filters.vm_uuid) { setError('กรุณาเลือก VM ก่อน'); setLoading(false); return }
        url = url.replace('{vm_uuid}', filters.vm_uuid)
      }
      params.hours = filters.hours
      if (report.id === 'top_vms') { params.top_n = filters.top_n; params.metric = filters.metric }
      if (report.id === 'idle_vms') { params.cpu_threshold = filters.cpu_threshold; params.mem_threshold = filters.mem_threshold }
      if (report.id === 'network_top') params.top_n = filters.top_n
      if (report.id === 'vm_historical_analytics') {
        params.start_date = new Date(filters.start_date).toISOString()
        params.end_date = new Date(filters.end_date).toISOString()
        params.interval = filters.interval
      }
      if (['az_summary', 'group_summary', 'host_detail', 'idle_vms', 'oversized_vms', 'network_top'].includes(report.id)) {
        if (filters.az_name) params.az_name = filters.az_name
      }
      const res = await api.get(url, { params })
      setReportData(res.data); setSelectedReport(report)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'เกิดข้อผิดพลาดในการโหลดรายงาน')
    } finally { setLoading(false) }
  }, [filters])

  const exportCSV = () => {
    if (!reportData) return
    const findArr = (obj: any): any[] => {
      if (Array.isArray(obj)) return obj
      if (obj && typeof obj === 'object') { for (const v of Object.values(obj)) { const a = findArr(v); if (a.length > 0) return a } }
      return []
    }
    const rows = findArr(reportData); if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${selectedReport?.id}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const SidebarContent = () => (
    <Stack sx={{ width: 220, py: 2 }} spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>หมวดหมู่</Typography>
      {CATEGORIES.map(cat => {
        const count = cat.id === 'all' ? reportTypes.length : reportTypes.filter(r => r.category === cat.id).length
        return (
          <Box key={cat.id} onClick={() => { setSelectedCategory(cat.id); if (isMobile) setSidebarOpen(false) }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, mx: 1, cursor: 'pointer', borderRadius: 2,
              bgcolor: selectedCategory === cat.id ? 'primary.main' : 'transparent',
              color: selectedCategory === cat.id ? 'primary.contrastText' : 'text.primary',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: selectedCategory === cat.id ? 'primary.main' : 'action.hover' }
            }}>
            {React.cloneElement(cat.icon, { fontSize: 'small' })}
            <Typography variant="body2" flex={1} fontWeight={selectedCategory === cat.id ? 600 : 400}>{cat.label}</Typography>
            <Chip label={count} size="small" sx={{
              height: 20, fontSize: 11, fontWeight: 600,
              bgcolor: selectedCategory === cat.id ? 'rgba(255,255,255,0.2)' : 'action.selected',
              color: selectedCategory === cat.id ? 'inherit' : 'text.secondary'
            }} />
          </Box>
        )
      })}
    </Stack>
  )

  const ReportCards = () => (
    <Grid container spacing={2}>
      {filtered.map(report => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
          <Card elevation={0} sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              borderColor: CAT_COLOR[report.category] || 'primary.main',
              boxShadow: `0 8px 24px ${(CAT_COLOR[report.category] || '#2196f3')}20`,
              transform: 'translateY(-2px)'
            }
          }}>
            <CardActionArea onClick={() => { setSelectedReport(report); setReportData(null); setError(''); }} sx={{ height: '100%', p: 0 }}>
              <Box sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar sx={{
                    bgcolor: (CAT_COLOR[report.category] || '#2196f3') + '15',
                    color: CAT_COLOR[report.category] || 'primary.main',
                    width: 48, height: 48, flexShrink: 0,
                    borderRadius: 2
                  }}>
                    {ICON_MAP[report.icon] || <Assessment />}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ lineHeight: 1.2 }}>{report.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1.5 }}>{report.description}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                      <Chip label={report.category} size="small"
                        sx={{ bgcolor: (CAT_COLOR[report.category] || '#2196f3') + '15', color: CAT_COLOR[report.category] || 'primary.main', fontSize: 10, fontWeight: 600, borderRadius: 1 }} />
                      {report.requires_vm && <Chip label="ต้องมีการระบุ VM" size="small" variant="outlined" sx={{ fontSize: 10, borderRadius: 1 }} />}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  )

  const ResultPanel = () => (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3} flexWrap="wrap">
          <IconButton size="small" onClick={() => { setSelectedReport(null); setReportData(null); setError('') }} sx={{ bgcolor: 'action.hover' }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
            <Avatar sx={{ bgcolor: (CAT_COLOR[selectedReport?.category || ''] || '#2196f3') + '20', color: CAT_COLOR[selectedReport?.category || ''] || 'primary.main', width: 40, height: 40, borderRadius: 2 }}>
              {ICON_MAP[selectedReport?.icon || ''] || <Assessment />}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{selectedReport?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{selectedReport?.description}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'auto' } }}>
            <Tooltip title="Export CSV"><IconButton sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }} onClick={exportCSV}><Download fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="รีเฟรช"><IconButton sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }} onClick={() => selectedReport && generateReport(selectedReport)}><Refresh fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="พิมพ์"><IconButton sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }} onClick={() => window.print()}><Print fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Stack>

        <Box mb={3}>
          <FilterPanel
            filters={filters} setFilter={setFilter}
            azList={azList} groupList={groupList} vmList={vmList}
            selectedReport={selectedReport}
            onApply={() => selectedReport && generateReport(selectedReport)}
            loading={loading}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />
        {loading && !reportData ? <Stack spacing={2}>{[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 2 }} />)}</Stack>
          : error ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
            : reportData ? <Fade in><Box><ReportResultRenderer reportId={selectedReport?.id || ''} data={reportData} /></Box></Fade>
              : <Alert severity="info" icon={<Assessment fontSize="small" />} sx={{ borderRadius: 2 }}>กรุณากำหนดตั้งค่าตัวกรองและกด "ดึงรายงาน" เพื่อแสดงข้อมูล</Alert>}
      </Box>
    </Card>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Sidebar desktop */}
      {!isMobile && (
        <Box sx={{
          width: sidebarOpen ? 240 : 0, flexShrink: 0, overflow: 'hidden',
          borderRight: sidebarOpen ? '1px solid' : 'none', borderColor: 'divider',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', bgcolor: 'background.paper',
          boxShadow: sidebarOpen ? '1px 0 10px rgba(0,0,0,0.03)' : 'none',
          zIndex: 10
        }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <Assessment fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} color="text.primary" lineHeight={1.2}>Reports Central</Typography>
              <Typography variant="caption" color="text.secondary">Sangfor SCP Analytics</Typography>
            </Box>
          </Box>
          <SidebarContent />
        </Box>
      )}

      {/* Sidebar mobile drawer */}
      <Drawer anchor="left" open={isMobile && sidebarOpen} onClose={() => setSidebarOpen(false)}
        PaperProps={{ sx: { width: 260 } }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}><Assessment fontSize="small" /></Avatar>
            <Typography variant="subtitle1" fontWeight={800}>Reports</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setSidebarOpen(false)}><Close fontSize="small" /></IconButton>
        </Box>
        <SidebarContent />
      </Drawer>

      {/* Main Content Area */}
      <Box flex={1} minWidth={0} sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <Box sx={{
          px: { xs: 2, md: 4 }, py: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid', borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 2,
          position: 'sticky', top: 0, zIndex: 5
        }}>
          <IconButton onClick={() => setSidebarOpen(s => !s)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
            {sidebarOpen && !isMobile ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800} color="text.primary">ระบบรายงานและวิเคราะห์ข้อมูล</Typography>
            <Typography variant="body2" color="text.secondary">
              เลือกดูรายงานและวิเคราะห์พฤติกรรมการใช้ทรัพยากรของระบบ ({filtered.length} รายการจาก {reportTypes.length} รายงานทั้งหมด)
            </Typography>
          </Box>
        </Box>

        {/* Scrollable Area */}
        <Box sx={{ p: { xs: 2, md: 4 }, flex: 1, overflowY: 'auto' }}>

          {/* Mobile Categories Tabs */}
          {isMobile && (
            <Box sx={{ mb: 3, mx: -2 }}>
              <Tabs value={selectedCategory} onChange={(_, v) => setSelectedCategory(v)}
                variant="scrollable" scrollButtons="auto"
                sx={{ px: 2, minHeight: 48, '& .MuiTab-root': { minHeight: 48, fontWeight: 600, fontSize: 13 } }}>
                {CATEGORIES.map(cat => (
                  <Tab key={cat.id} value={cat.id} label={cat.label} iconPosition="start"
                    icon={React.cloneElement(cat.icon, { fontSize: 'small' })} />
                ))}
              </Tabs>
              <Divider />
            </Box>
          )}

          {/* Dynamic Content */}
          {loading && !reportData && !selectedReport ? (
            <Stack spacing={3}>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Grid container spacing={3}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Grid item xs={12} sm={6} md={4} lg={3} key={i}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} /></Grid>)}
              </Grid>
            </Stack>
          ) : selectedReport ? (
            <ResultPanel />
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
              <ReportCards />
              {loading && <LinearProgress sx={{ mt: 3, borderRadius: 1 }} />}
            </>
          )}

        </Box>
      </Box>
    </Box>
  )
}
