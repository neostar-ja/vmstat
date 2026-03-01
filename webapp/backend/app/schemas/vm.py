"""
Pydantic schemas for VMs
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal

class VMBase(BaseModel):
    vm_uuid: str
    vm_id: Optional[int] = None
    name: str

class VMListItem(VMBase):
    group_name: Optional[str] = None
    group_name_path: Optional[str] = None
    host_name: Optional[str] = None
    az_name: Optional[str] = None
    power_state: Optional[str] = None
    status: Optional[str] = None
    cpu_cores: Optional[int] = None
    memory_total_mb: Optional[float] = None
    storage_total_mb: Optional[float] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    storage_usage: Optional[float] = None
    storage_used_mb: Optional[float] = None
    os_type: Optional[str] = None
    os_name: Optional[str] = None
    os_display_name: Optional[str] = None
    os_kernel: Optional[str] = None
    os_arch: Optional[str] = None
    protection_enabled: Optional[bool] = None
    in_protection: Optional[bool] = None
    protection_name: Optional[str] = None
    backup_file_count: Optional[int] = None
    last_metrics_at: Optional[datetime] = None
    # New fields
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    storage_name: Optional[str] = None
    project_name: Optional[str] = None
    is_deleted: Optional[bool] = None
    
    class Config:
        from_attributes = True

class VMDetail(VMListItem):
    os_distribution: Optional[str] = None
    cpu_sockets: Optional[int] = None
    cpu_cores_per_socket: Optional[int] = None
    cpu_total_mhz: Optional[float] = None
    cpu_used_mhz: Optional[float] = None
    storage_usage: Optional[float] = None
    storage_used_mb: Optional[float] = None
    memory_used_mb: Optional[float] = None
    network_read_bitps: Optional[float] = None
    network_write_bitps: Optional[float] = None
    network_read_mbps: Optional[float] = None
    network_write_mbps: Optional[float] = None
    disk_read_iops: Optional[float] = None
    disk_write_iops: Optional[float] = None
    disk_read_byteps: Optional[float] = None
    disk_write_byteps: Optional[float] = None
    uptime_seconds: Optional[int] = None
    protection_name: Optional[str] = None
    protection_id: Optional[str] = None
    protection_type: Optional[str] = None
    backup_file_count: Optional[int] = None
    backup_policy_enable: Optional[bool] = None
    in_protection: Optional[bool] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    config_updated_at: Optional[datetime] = None
    # Network
    primary_network_name: Optional[str] = None
    # Project
    project_id: Optional[str] = None
    user_name: Optional[str] = None
    # Description & Tags
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    # Storage details
    storage_id: Optional[str] = None
    storage_file_size_mb: Optional[float] = None
    # Expiry
    expire_time: Optional[str] = None
    # Counts
    network_count: Optional[int] = None
    disk_count: Optional[int] = None

class VMMetrics(BaseModel):
    collected_at: datetime
    cpu_ratio: Optional[float] = None
    cpu_used_mhz: Optional[float] = None
    memory_ratio: Optional[float] = None
    memory_used_mb: Optional[float] = None
    storage_ratio: Optional[float] = None
    storage_used_mb: Optional[float] = None
    network_read_bitps: Optional[float] = None
    network_write_bitps: Optional[float] = None
    disk_read_iops: Optional[float] = None
    disk_write_iops: Optional[float] = None
    power_state: Optional[str] = None
    status: Optional[str] = None
    
    class Config:
        from_attributes = True

class VMDisk(BaseModel):
    disk_id: str
    storage_id: Optional[str] = None
    storage_name: Optional[str] = None
    storage_file: Optional[str] = None
    size_mb: Optional[float] = None
    preallocate: Optional[str] = None
    eagerly_scrub: Optional[bool] = None
    
    class Config:
        from_attributes = True

class VMNetwork(BaseModel):
    vif_id: str
    network_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    model: Optional[str] = None
    is_connected: Optional[bool] = None
    ipv6_address: Optional[str] = None
    subnet_id: Optional[str] = None
    subnet_name: Optional[str] = None
    cidr: Optional[str] = None
    gateway: Optional[str] = None
    custom_gateway: Optional[str] = None
    vpc_id: Optional[str] = None
    vpc_name: Optional[str] = None
    device_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class VMListResponse(BaseModel):
    items: List[VMListItem]
    total: int
    page: int
    page_size: int
    pages: int
