// VM types
export interface VM {
    vm_uuid: string;
    vm_id: number | null;
    name: string;
    group_name: string | null;
    group_name_path: string | null;
    host_name: string | null;
    az_name: string | null;
    power_state: string | null;
    status: string | null;
    cpu_cores: number | null;
    memory_total_mb: number | null;
    memory_used_mb: number | null;
    storage_total_mb: number | null;
    storage_used_mb: number | null;
    storage_usage: number | null;
    cpu_usage: number | null;
    memory_usage: number | null;
    os_type: string | null;
    os_name: string | null;
    os_display_name: string | null;
    os_kernel: string | null;
    os_arch: string | null;
    protection_enabled: boolean | null;
    last_metrics_at: string | null;
    is_deleted?: boolean;
    // New fields
    ip_address: string | null;
    mac_address: string | null;
    storage_name: string | null;
    project_name: string | null;
    // Protection fields
    in_protection: boolean | null;
    protection_name: string | null;
    backup_file_count: number | null;
}

export interface VMDetail extends VM {
    os_distribution: string | null;
    cpu_sockets: number | null;
    cpu_cores_per_socket: number | null;
    cpu_total_mhz: number | null;
    cpu_used_mhz: number | null;
    cpu_ratio: number | null;
    memory_ratio: number | null;
    storage_usage: number | null;
    storage_used_mb: number | null;
    memory_used_mb: number | null;
    network_read_bitps: number | null;
    network_write_bitps: number | null;
    network_read_mbps: number | null;
    network_write_mbps: number | null;
    disk_read_iops: number | null;
    disk_write_iops: number | null;
    disk_read_byteps: number | null;
    disk_write_byteps: number | null;
    uptime_seconds: number | null;
    protection_name: string | null;
    protection_id: string | null;
    protection_type: string | null;
    backup_file_count: number | null;
    backup_policy_enable: boolean | null;
    in_protection: boolean | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    config_updated_at: string | null;
    // Network
    primary_network_name: string | null;
    // Project
    project_id: string | null;
    user_name: string | null;
    // Description & Tags
    description: string | null;
    tags: string[] | null;
    // Storage details
    storage_id: string | null;
    storage_file_size_mb: number | null;
    // Expiry
    expire_time: string | null;
    // Real-time percentages (from API)
    cpu_percent?: number | null;
    memory_percent?: number | null;
    storage_percent?: number | null;
}

// VM Alarm type
export interface Alarm {
    alarm_id: number;
    vm_uuid: string | null;
    vm_name: string | null;
    resource_id: string | null;
    resource_name: string | null;
    group_name: string | null;
    source: string;
    severity: string | null;       // null = platform alert (no policy-based severity)
    title: string | null;
    description: string | null;
    status: string;
    object_type: string | null;
    begin_time: string | null;
    end_time: string | null;
    alert_count: number;           // number of duplicate grouped occurrences
    recommendation: string | null; // suggested action to resolve
    created_at: string;
    updated_at: string | null;
}

export interface AlarmListResponse {
    items: Alarm[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export interface VMAlarm extends Alarm { } // Alias for backward compatibility if needed temporarily

export interface VMMetrics {
    collected_at: string;
    cpu_ratio: number | null;
    cpu_used_mhz: number | null;
    memory_ratio: number | null;
    memory_used_mb: number | null;
    storage_ratio: number | null;
    storage_used_mb: number | null;
    network_read_bitps: number | null;
    network_write_bitps: number | null;
    disk_read_iops: number | null;
    disk_write_iops: number | null;
    power_state: string | null;
    status: string | null;
}

export interface VMDisk {
    disk_id: string;
    storage_id: string | null;
    storage_name: string | null;
    storage_file: string | null;
    size_mb: number | null;
    preallocate: string | null;
    eagerly_scrub: boolean | null;
}

export interface VMNetwork {
    vif_id: string;
    network_name: string | null;
    ip_address: string | null;
    mac_address: string | null;
    model: string | null;
    is_connected: boolean | null;
    ipv6_address: string | null;
    subnet_id: string | null;
    subnet_name: string | null;
    cidr: string | null;
    gateway: string | null;
    custom_gateway: string | null;
    vpc_id: string | null;
    vpc_name: string | null;
    device_id: string | null;
}

// Dashboard types
export interface DashboardSummary {
    total_vms: number;
    running_vms: number;
    stopped_vms: number;
    total_hosts: number;
    total_groups: number;
    total_cpu_cores: number;
    total_memory_gb: number;
    total_storage_tb: number;
    avg_cpu_usage: number;
    avg_memory_usage: number;
    vms_with_alarms: number;
    unprotected_vms: number;
}

export interface TopVM {
    vm_uuid: string;
    vm_name: string;
    group_name: string | null;
    host_name: string | null;
    avg_usage: number;
    max_usage: number;
    current_usage: number | null;
}

export interface GroupSummary {
    group_id: string;
    group_name: string;
    group_name_path: string | null;
    total_vms: number;
    running_vms: number;
    total_cpu_cores: number;
    total_memory_mb: number;
    total_storage_mb: number;
}

export interface HostSummary {
    host_id: string;
    host_name: string;
    az_name: string | null;
    vm_count: number;
    running_vms: number;
    cpu_usage_pct: number;
    memory_usage_pct: number;
}

// User types
export interface User {
    id: number;
    username: string;
    email: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

// Admin types
export interface SystemStats {
    total_users: number;
    active_users: number;
    admin_count: number;
    manager_count: number;
    viewer_count: number;
    total_vms: number;
    running_vms: number;
    recent_logins: number;
}

export interface AuditLogItem {
    id: number;
    user_id: number;
    username: string;
    action: string;
    details: string | null;
    created_at: string;
}
