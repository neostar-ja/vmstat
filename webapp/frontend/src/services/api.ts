import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = '/vmstat/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/vmstat/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authApi = {
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),
    getMe: (token?: string) =>
        api.get('/auth/me', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
        }),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

// Keycloak SSO API
export const keycloakApi = {
    // Public (no auth)
    getPublicConfig: () => api.get('/auth/keycloak/public-config'),
    initiateLogin: () => api.get('/auth/keycloak/login'),
    handleCallback: (code: string, state: string) =>
        api.post('/auth/keycloak/callback', { code, state }),
    testUserLogin: (username: string, password: string) =>
        api.post('/auth/keycloak/test-user-login', { username, password }),
    // Admin
    getConfig: () => api.get('/auth/keycloak/config'),
    saveConfig: (data: any) => api.post('/auth/keycloak/config', data),
    updateConfig: (data: any) => api.put('/auth/keycloak/config', data),
    deleteConfig: () => api.delete('/auth/keycloak/config'),
    testConnection: (data?: any) => api.post('/auth/keycloak/test-connection', data),
};


// Dashboard API
export const dashboardApi = {
    // ⚡ NEW: Consolidated endpoint for optimal performance (85-90% faster)
    getConsolidatedData: (params?: { 
        top_vms_limit?: number; 
        alarms_limit?: number;
    }) => api.get('/dashboard/dashboard-data', { params }),

    // Real storage/datastore aggregate summary (replaces hardcoded 62.5%)
    getStorageSummary: () => api.get('/dashboard/storage-summary'),
    
    // Legacy endpoints (kept for backward compatibility)
    getSummary: () => api.get('/dashboard/summary'),
    getTopCpuVMs: (limit = 10) => api.get(`/dashboard/top-vms/cpu?limit=${limit}`),
    getTopMemoryVMs: (limit = 10) => api.get(`/dashboard/top-vms/memory?limit=${limit}`),
    getAlarms: (limit = 20) => api.get(`/dashboard/alarms?limit=${limit}`),
    getActiveAlarms: (limit = 20) => api.get(`/dashboard/alarms?limit=${limit}`),
    getGroups: () => api.get('/dashboard/groups'),
    getHosts: () => api.get('/dashboard/hosts'),
    getAZs: () => api.get('/dashboard/azs').then(res => res.data),
};

// VM Control API
export const vmControlApi = {
    /**
     * Control a VM: start | stop | shutdown | reboot | reset
     * Set dry_run=true to simulate without actually sending the command
     */
    controlAction: (vmUuid: string, action: 'start' | 'stop' | 'shutdown' | 'reboot' | 'reset', dryRun = false) =>
        api.post(`/vms/${vmUuid}/control`, { action, dry_run: dryRun }),

    /** Poll async task status from Sangfor */
    getTaskStatus: (vmUuid: string, taskId: string) =>
        api.get(`/vms/${vmUuid}/control/task/${taskId}`),

    /** Get audit logs - all or for a specific VM */
    getLogs: (vmUuid?: string, limit = 50) =>
        api.get('/vms/control/logs', { params: { vm_uuid: vmUuid, limit } }),
};

// VMs API
export const vmsApi = {
    getList: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        status?: string;
        group_id?: string;
        host_id?: string;
        az_name?: string;
        storage_min?: number;
        show_deleted?: boolean;
        sort_by?: string;
        sort_order?: string;
    }) => api.get('/vms', { params }),
    getDetail: (vmUuid: string) => api.get(`/vms/${vmUuid}`),
    getMetrics: (vmUuid: string, hours = 24, interval = '1h') =>
        api.get(`/vms/${vmUuid}/metrics?hours=${hours}&interval=${interval}`),
    getDisks: (vmUuid: string) => api.get(`/vms/${vmUuid}/disks`),
    getNetworks: (vmUuid: string) => api.get(`/vms/${vmUuid}/networks`),
    // Alarms
    getAlarms: (vmUuid: string, params?: { status?: string, limit?: number }) => api.get(`/vms/${vmUuid}/alarms`, { params }),
    // Raw Data
    getRaw: (vmUuid: string) => api.get(`/vms/${vmUuid}/raw`),
    // Recycle Bin Management
    getRecycleBin: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        sort_by?: string;
        sort_order?: string;
    }) => api.get('/vms/deleted-vms', { params }),
    restoreVM: (vmUuid: string) => api.post(`/vms/${vmUuid}/restore`),
    permanentlyDeleteVM: (vmUuid: string) => api.delete(`/vms/${vmUuid}/permanent?confirm=true`),
};

// Alarms API
export const alarmsApi = {
    getList: (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        severity?: string;
        source?: string;
        alarm_type?: string;   // "alarm" (with severity) or "alert" (no severity)
        search?: string;
    }) => api.get('/alarms', { params }),
    getSummary: () => api.get('/alarms/summary'),
    getDetail: (alarmId: number) => api.get(`/alarms/${alarmId}`),
    getVmAlarms: (vmUuid: string, params?: { status?: string }) =>
        api.get(`/alarms/vm/${vmUuid}`, { params }),
};

// Admin API
export const adminApi = {
    // User Management
    getUsers: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        role?: string;
        is_active?: boolean;
    }) => api.get('/admin/users', { params }),
    getUser: (id: number) => api.get(`/admin/users/${id}`),
    createUser: (data: {
        username: string;
        email: string;
        password: string;
        full_name?: string;
        role?: string;
    }) => api.post('/admin/users', data),
    updateUser: (id: number, data: {
        email?: string;
        full_name?: string;
        role?: string;
        is_active?: boolean;
        password?: string;
    }) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
    resetPassword: (id: number) => api.post(`/admin/users/${id}/reset-password`),

    // System
    getSystemStats: () => api.get('/admin/system/stats'),
    getAuditLogs: (limit = 50) => api.get(`/admin/audit-logs?limit=${limit}`),

    // VM Management
    deleteVM: (vmUuid: string) => api.delete(`/admin/vms/${vmUuid}`),
    restoreVM: (vmUuid: string) => api.post(`/admin/vms/${vmUuid}/restore`),
};

// Sync API V2
export const syncApi = {
    // Status
    getStatus: () => api.get('/sync/status').then(r => r.data),
    getStats: () => api.get('/sync/stats').then(r => r.data),

    // Sync Control
    run: () => api.post('/sync/run').then(r => r.data),
    runForeground: () => api.post('/sync/run-foreground').then(r => r.data),

    // Jobs (History)
    getJobs: (params?: { limit?: number; offset?: number; status?: string }) =>
        api.get('/sync/jobs', { params }).then(r => r.data),
    getJob: (jobId: string) => api.get(`/sync/jobs/${jobId}`).then(r => r.data),
    getHistory: (limit = 50) => api.get(`/sync/history?limit=${limit}`).then(r => r.data),

    // Scheduler
    controlScheduler: (params: { action: 'start' | 'stop'; interval_minutes?: number }) =>
        api.post('/sync/scheduler', params).then(r => r.data),
    getSchedulerStatus: () => api.get('/sync/scheduler/status').then(r => r.data),
    startScheduler: (intervalMinutes = 5) =>
        api.post('/sync/scheduler', { action: 'start', interval_minutes: intervalMinutes }).then(r => r.data),
    stopScheduler: () => api.post('/sync/scheduler', { action: 'stop' }).then(r => r.data),

    // Configuration
    getConfig: () => api.get('/sync/config').then(r => r.data),
    updateConfig: (data: {
        scp_ip?: string;
        scp_port?: number;
        scp_username?: string;
        scp_password?: string;
        sync_timeout_seconds?: number;
        max_retries?: number;
        batch_size?: number;
    }) => api.put('/sync/config', data).then(r => r.data),
    testConnection: () => api.post('/sync/test-connection').then(r => r.data),

    // Legacy settings endpoint
    getSettings: () => api.get('/sync/settings').then(r => r.data),
    updateSettings: (data: {
        scp_ip?: string;
        scp_username?: string;
        scp_password?: string;
        sync_interval_minutes?: number;
    }) => api.put('/sync/config', data).then(r => r.data),

    // Metrics Settings
    getMetricsSettings: () => api.get('/sync/metrics-settings'),
    updateMetricsSettings: (data: {
        collect_metrics?: boolean;
        collection_interval_seconds?: number;
        retain_raw_days?: number;
        retain_hourly_days?: number;
        retain_daily_days?: number;
        auto_aggregate?: boolean;
    }) => api.put('/sync/metrics-settings', data),

    // Datastores
    getDatastores: () => api.get('/sync/datastores'),
    getDatastoreStats: () => api.get('/sync/datastores/stats'),
    getDatastoreDetail: (datastoreId: string) => api.get(`/sync/datastores/${datastoreId}`),

    // Data Store Dashboard Settings
    getDatastoreDashboardSettings: () => api.get('/sync/dashboard/datastore-settings'),
    updateDatastoreDashboardSettings: (data: { selected_datastore_ids: string[] }) =>
        api.put('/sync/dashboard/datastore-settings', data),
    getDatastoreDashboardData: () => api.get('/sync/dashboard/datastore-data'),
    // Datastore Ordering
    saveDatastoreOrder: (order: string[]) => api.post('/sync/datastores/order', { order }),
};

// Metrics API (Hybrid - Historical Data)
export const metricsApi = {
    // VM Metrics
    getVMHistory: (vmUuid: string, params?: {
        time_range?: string;  // 1h, 6h, 12h, 1d, 7d, 30d, 90d
        interval?: string;    // 1m, 5m, 15m, 1h, 6h, 1d
        start_time?: string;
        end_time?: string;
    }) => api.get(`/metrics/vm/${vmUuid}/history`, { params }),
    getVMLatest: (vmUuid: string) => api.get(`/metrics/vm/${vmUuid}/latest`),

    // Real-time (from Sangfor API)
    getVMRealtime: (vmUuid: string) => api.get(`/vms/${vmUuid}/realtime`),
    compareRealtimeVsCached: (vmUuid: string) => api.get(`/vms/${vmUuid}/compare`),

    // System Summary
    getSummary: () => api.get('/metrics/summary'),
    getTopConsumers: (limit = 10) => api.get(`/metrics/top-consumers?limit=${limit}`),

    // Host Metrics
    getHostHistory: (hostId: string, params?: {
        time_range?: string;
        interval?: string;
    }) => api.get(`/metrics/host/${hostId}/history`, { params }),

    // Retention Info
    getRetentionInfo: () => api.get('/metrics/retention-info'),
};
