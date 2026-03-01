"""
Pydantic schemas for Dashboard
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DashboardSummary(BaseModel):
    total_vms: int
    running_vms: int
    stopped_vms: int
    total_hosts: int
    total_groups: int
    total_cpu_cores: int
    total_memory_gb: float
    total_storage_tb: float
    avg_cpu_usage: float
    avg_memory_usage: float
    vms_with_alarms: int
    unprotected_vms: int
    active_alarms_count: int = 0

class TopVM(BaseModel):
    vm_uuid: str
    vm_name: str
    group_name: Optional[str] = None
    host_name: Optional[str] = None
    avg_usage: float
    max_usage: float
    current_usage: Optional[float] = None

class AlarmItem(BaseModel):
    vm_uuid: str
    vm_name: str
    group_name: Optional[str] = None
    alarm_count: int
    warning_type: Optional[str] = None
    collected_at: datetime

class GroupSummary(BaseModel):
    group_id: str
    group_name: str
    group_name_path: Optional[str] = None
    total_vms: int
    running_vms: int
    total_cpu_cores: int
    total_memory_mb: float
    total_storage_mb: float

class HostSummary(BaseModel):
    host_id: str
    host_name: str
    az_name: Optional[str] = None
    vm_count: int
    running_vms: int
    cpu_usage_pct: float
    memory_usage_pct: float


class AZSummary(BaseModel):
    name: str
    vm_count: int


# ============================================================================
# NEW: Consolidated Dashboard Response Schema
# ============================================================================

class ConsolidatedDashboardData(BaseModel):
    """Single response with all dashboard data for optimal performance"""
    # Summary statistics
    summary: DashboardSummary
    
    # Top consumers
    top_cpu_vms: List[TopVM]
    top_memory_vms: List[TopVM]
    
    # Active alarms
    active_alarms: List[AlarmItem]
    
    # Groups and hosts
    groups: List[GroupSummary]
    hosts: List[HostSummary]
    
    # Availability zones
    availability_zones: List[AZSummary]
    
    # Metadata
    data_freshness: Optional[datetime] = None  # When materialized views were last refreshed
    query_time_ms: Optional[float] = None  # How long the query took
