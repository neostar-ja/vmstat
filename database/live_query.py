#!/usr/bin/env python3
"""
Sangfor SCP Live API Query Module

This module provides functions to query live data from Sangfor SCP API
without storing to database. Useful for real-time dashboards.

Usage:
    from database.live_query import SangforLiveQuery
    
    live = SangforLiveQuery()
    vms = live.get_all_vms()
    vm_detail = live.get_vm_detail(vm_uuid)
"""

import json
import os
from typing import Any, Dict, List, Optional
from datetime import datetime

import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from dotenv import load_dotenv

# Suppress SSL warnings for self-signed certificates
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Load environment variables
load_dotenv()


class SangforAPIClient:
    """
    Sangfor SCP API Client.
    
    Handles authentication and API requests to Sangfor SCP.
    """
    
    def __init__(self):
        self.scp_ip = os.getenv('SCP_IP', '10.251.204.30')
        self.username = os.getenv('USERNAME', 'admin')
        self.password = os.getenv('PASSWORD', '')
        self.base_url = f"https://{self.scp_ip}:8443"
        self.token = None
        self.session = requests.Session()
        self.session.verify = False
        
    def authenticate(self) -> bool:
        """
        Authenticate with Sangfor SCP API.
        
        Returns:
            True if authentication successful
        """
        auth_url = f"{self.base_url}/api/auth/tokens"
        
        payload = {
            "auth": {
                "identity": {
                    "methods": ["password"],
                    "password": {
                        "user": {
                            "name": self.username,
                            "password": self.password,
                            "domain": {"name": "default"}
                        }
                    }
                },
                "scope": {
                    "project": {"name": "admin", "domain": {"name": "default"}}
                }
            }
        }
        
        try:
            response = self.session.post(
                auth_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            self.token = response.headers.get('X-Subject-Token')
            return True
            
        except requests.RequestException as e:
            print(f"Authentication failed: {e}")
            return False
    
    def get(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """
        Make authenticated GET request.
        
        Args:
            endpoint: API endpoint (without base URL)
            params: Query parameters
            
        Returns:
            Response JSON or None if failed
        """
        if not self.token:
            if not self.authenticate():
                return None
        
        url = f"{self.base_url}{endpoint}"
        headers = {"X-Auth-Token": self.token}
        
        try:
            response = self.session.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"API request failed: {e}")
            return None


class SangforLiveQuery:
    """
    Live query interface for Sangfor SCP data.
    
    Queries data directly from API without database storage.
    Suitable for real-time dashboard views.
    """
    
    def __init__(self, api_client: SangforAPIClient = None):
        self.api = api_client or SangforAPIClient()
        
    def get_all_vms(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Get all VMs from Sangfor SCP.
        
        Args:
            limit: Maximum number of VMs to return
            
        Returns:
            List of VM dictionaries
        """
        result = self.api.get("/api/compute/v2.2/servers/detail", params={"limit": limit})
        if result:
            return result.get("servers", [])
        return []
    
    def get_vm_detail(self, vm_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for a specific VM.
        
        Args:
            vm_uuid: VM UUID
            
        Returns:
            VM detail dictionary or None
        """
        result = self.api.get(f"/api/compute/v2.2/servers/{vm_uuid}")
        if result:
            return result.get("server")
        return None
    
    def get_vm_metrics(self, vm_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Get current metrics for a specific VM.
        
        Args:
            vm_uuid: VM UUID
            
        Returns:
            VM metrics dictionary
        """
        vm = self.get_vm_detail(vm_uuid)
        if not vm:
            return None
        
        return {
            "vm_uuid": vm_uuid,
            "timestamp": datetime.now().isoformat(),
            "power_state": vm.get("power_state"),
            "status": vm.get("status"),
            "cpu": vm.get("cpu_status", {}),
            "memory": vm.get("memory_status", {}),
            "storage": vm.get("storage_status", {}),
            "network": vm.get("network_status", {}),
            "io": vm.get("io_status", {}),
            "gpu": vm.get("gpu_status", {})
        }
    
    def get_vms_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics for all VMs.
        
        Returns:
            Summary dictionary with counts and resource usage
        """
        vms = self.get_all_vms()
        
        if not vms:
            return {"error": "Failed to fetch VMs"}
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_vms": len(vms),
            "running_vms": 0,
            "stopped_vms": 0,
            "total_cpu_mhz": 0,
            "used_cpu_mhz": 0,
            "total_memory_mb": 0,
            "used_memory_mb": 0,
            "total_storage_mb": 0,
            "used_storage_mb": 0,
            "vms_with_alarms": 0,
            "vms_with_warnings": 0,
            "vms_by_group": {},
            "vms_by_host": {}
        }
        
        for vm in vms:
            # Count running/stopped
            if vm.get("power_state") == "on":
                summary["running_vms"] += 1
            else:
                summary["stopped_vms"] += 1
            
            # CPU stats
            cpu = vm.get("cpu_status", {})
            summary["total_cpu_mhz"] += cpu.get("total_mhz", 0)
            summary["used_cpu_mhz"] += cpu.get("used_mhz", 0)
            
            # Memory stats
            memory = vm.get("memory_status", {})
            summary["total_memory_mb"] += memory.get("total_mb", 0)
            summary["used_memory_mb"] += memory.get("used_mb", 0)
            
            # Storage stats
            storage = vm.get("storage_status", {})
            summary["total_storage_mb"] += storage.get("total_mb", 0)
            summary["used_storage_mb"] += storage.get("used_mb", 0)
            
            # Alarms/Warnings
            alarm = vm.get("alarm", {})
            warning = vm.get("warning", {})
            if alarm.get("alarm", 0) > 0:
                summary["vms_with_alarms"] += 1
            if warning.get("warning", 0) > 0:
                summary["vms_with_warnings"] += 1
            
            # Group by group_name
            group_name = vm.get("group_name", "No Group")
            summary["vms_by_group"][group_name] = summary["vms_by_group"].get(group_name, 0) + 1
            
            # Group by host
            host_name = vm.get("host_name", "Unknown")
            summary["vms_by_host"][host_name] = summary["vms_by_host"].get(host_name, 0) + 1
        
        # Calculate usage percentages
        if summary["total_cpu_mhz"] > 0:
            summary["cpu_usage_pct"] = round(summary["used_cpu_mhz"] / summary["total_cpu_mhz"] * 100, 2)
        else:
            summary["cpu_usage_pct"] = 0
            
        if summary["total_memory_mb"] > 0:
            summary["memory_usage_pct"] = round(summary["used_memory_mb"] / summary["total_memory_mb"] * 100, 2)
        else:
            summary["memory_usage_pct"] = 0
            
        if summary["total_storage_mb"] > 0:
            summary["storage_usage_pct"] = round(summary["used_storage_mb"] / summary["total_storage_mb"] * 100, 2)
        else:
            summary["storage_usage_pct"] = 0
        
        return summary
    
    def get_top_vms_by_resource(self, resource: str = "cpu", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get top VMs by resource usage.
        
        Args:
            resource: Resource type (cpu, memory, storage, network)
            limit: Number of VMs to return
            
        Returns:
            List of VMs sorted by resource usage
        """
        vms = self.get_all_vms()
        
        if not vms:
            return []
        
        def get_usage(vm):
            if resource == "cpu":
                return vm.get("cpu_status", {}).get("ratio", 0)
            elif resource == "memory":
                return vm.get("memory_status", {}).get("ratio", 0)
            elif resource == "storage":
                return vm.get("storage_status", {}).get("ratio", 0)
            elif resource == "network":
                net = vm.get("network_status", {})
                return net.get("read_speed_bitps", 0) + net.get("write_speed_bitps", 0)
            return 0
        
        # Sort by usage (descending)
        sorted_vms = sorted(vms, key=get_usage, reverse=True)
        
        # Format output
        result = []
        for vm in sorted_vms[:limit]:
            result.append({
                "vm_uuid": vm.get("id"),
                "name": vm.get("name"),
                "group_name": vm.get("group_name"),
                "host_name": vm.get("host_name"),
                "usage": get_usage(vm),
                "power_state": vm.get("power_state")
            })
        
        return result
    
    def get_vms_with_alarms(self) -> List[Dict[str, Any]]:
        """
        Get VMs that have active alarms or warnings.
        
        Returns:
            List of VMs with alarms/warnings
        """
        vms = self.get_all_vms()
        
        if not vms:
            return []
        
        result = []
        for vm in vms:
            alarm = vm.get("alarm", {})
            warning = vm.get("warning", {})
            
            if alarm.get("alarm", 0) > 0 or warning.get("warning", 0) > 0:
                result.append({
                    "vm_uuid": vm.get("id"),
                    "name": vm.get("name"),
                    "group_name": vm.get("group_name"),
                    "host_name": vm.get("host_name"),
                    "alarm_count": alarm.get("alarm", 0),
                    "alarm_info": alarm.get("alarm_info", []),
                    "warning_type": warning.get("warning_type"),
                    "warning_info": warning.get("warning_info"),
                    "power_state": vm.get("power_state"),
                    "status": vm.get("status")
                })
        
        return result
    
    def search_vms(self, query: str) -> List[Dict[str, Any]]:
        """
        Search VMs by name or IP address.
        
        Args:
            query: Search query (partial match)
            
        Returns:
            List of matching VMs
        """
        vms = self.get_all_vms()
        
        if not vms:
            return []
        
        query_lower = query.lower()
        result = []
        
        for vm in vms:
            name = vm.get("name", "").lower()
            ips = vm.get("ips", [])
            
            if query_lower in name or any(query_lower in ip for ip in ips):
                result.append({
                    "vm_uuid": vm.get("id"),
                    "name": vm.get("name"),
                    "group_name": vm.get("group_name"),
                    "host_name": vm.get("host_name"),
                    "ips": ips,
                    "power_state": vm.get("power_state"),
                    "status": vm.get("status")
                })
        
        return result


def main():
    """Example usage."""
    live = SangforLiveQuery()
    
    print("Fetching VM Summary...")
    summary = live.get_vms_summary()
    
    if "error" not in summary:
        print(f"\n=== VM Summary ===")
        print(f"Timestamp: {summary['timestamp']}")
        print(f"Total VMs: {summary['total_vms']}")
        print(f"Running VMs: {summary['running_vms']}")
        print(f"Stopped VMs: {summary['stopped_vms']}")
        print(f"CPU Usage: {summary['cpu_usage_pct']}%")
        print(f"Memory Usage: {summary['memory_usage_pct']}%")
        print(f"Storage Usage: {summary['storage_usage_pct']}%")
        print(f"VMs with Alarms: {summary['vms_with_alarms']}")
        print(f"VMs with Warnings: {summary['vms_with_warnings']}")
        
        print(f"\n=== VMs by Group ===")
        for group, count in sorted(summary['vms_by_group'].items()):
            print(f"  {group}: {count}")
        
        print(f"\n=== VMs by Host ===")
        for host, count in sorted(summary['vms_by_host'].items()):
            print(f"  {host}: {count}")
    else:
        print(f"Error: {summary['error']}")


if __name__ == "__main__":
    main()
