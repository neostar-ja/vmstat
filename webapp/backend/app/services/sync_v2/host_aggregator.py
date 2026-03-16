import logging
from typing import Dict, Any, List
from collections import defaultdict

logger = logging.getLogger(__name__)

class HostResourceAggregator:
    """
    Build full host resource view by aggregating raw API responses
    """
    def __init__(self, hosts: List[Dict[str, Any]], vms: List[Dict[str, Any]], datastores: List[Dict[str, Any]], alarms: List[Dict[str, Any]]):
        self.hosts = hosts
        self.vms = vms
        
        # Datastores mappings
        self.datastores = {d.get("id"): d for d in datastores if d.get("id")}
        
        # We don't really have `azs` from the new `sync_v2.service` since `fetch_azs()` isn't in `sangfor_client.py` 
        # But we don't strictly need AZ mapping here if we extract it from hosts/azs logic.
        
        # Alarms mapping
        self.host_alarms = defaultdict(list)
        for alarm in alarms:
            obj_type = alarm.get("object_type") or alarm.get("resource_type")
            obj_id = alarm.get("object_id") or alarm.get("resource_id") or alarm.get("resid")
            
            if obj_type in ["host", "server_physical"]:
                self.host_alarms[obj_id].append(alarm)
    
    def build(self) -> Dict[str, Any]:
        result = {}
        
        for host in self.hosts:
            host_id = host.get("id")
            if not host_id:
                continue

            ip_addr = host.get("ip")
            if not ip_addr and host.get("name"):
                ip_addr = host.get("name")

            cpu_data = host.get("cpu") or host.get("cpu_status") or {}
            mem_data = host.get("memory") or host.get("memory_status") or {}

            cpu_cores = cpu_data.get("core_count") or cpu_data.get("cores") or 0
            cpu_sockets = cpu_data.get("socket_count") or cpu_data.get("sockets") or 0
            cpu_total = cpu_data.get("total_mhz")
            cpu_used = cpu_data.get("used_mhz")
            cpu_ratio = cpu_data.get("ratio")
            
            mem_total = mem_data.get("total_mb")
            mem_used = mem_data.get("used_mb")
            mem_ratio = mem_data.get("ratio")

            # Fallback for free_mb
            free_mb = 0
            if mem_total is not None and mem_used is not None:
                free_mb = int(float(str(mem_total))) - int(float(str(mem_used)))

            result[host_id] = {
                "host_id": host_id,
                "host_name": host.get("name") or ip_addr,
                "ip": ip_addr,
                "type": host.get("type"),
                "status": host.get("status"),
                "az": host.get("az", "unknown"),  # Note: Host sync expects this or 'az_id'
                "cluster_id": host.get("cluster_id"),
                "cluster_name": host.get("cluster_name"),

                # CPU
                "cpu": {
                    "cores": cpu_cores,
                    "sockets": cpu_sockets,
                    "total_mhz": cpu_total,
                    "used_mhz": cpu_used,
                    "usage_ratio": cpu_ratio
                },

                # Memory
                "memory": {
                    "total_mb": mem_total,
                    "used_mb": mem_used,
                    "free_mb": free_mb,
                    "usage_ratio": mem_ratio
                },

                # VM Statistics
                "vm": {
                    "total": 0,
                    "running": 0,
                    "stopped": 0,
                    "details": []
                },

                # Storage (derived)
                "datastores": set(),

                # External resources
                "alarms": {
                    "count": len(self.host_alarms.get(host_id, [])),
                    "details": self.host_alarms.get(host_id, [])
                }
            }

        # Aggregate VM -> Host -> Datastore
        for vm in self.vms:
            host_id = vm.get("host_id") or vm.get("hostId")
            if host_id and host_id in result:
                h = result[host_id]
                h["vm"]["total"] += 1
                
                if vm.get("status") == "active" or vm.get("power_state") == "on":
                    h["vm"]["running"] += 1
                else:
                    h["vm"]["stopped"] += 1
                
                h["vm"]["details"].append({
                    "id": vm.get("id"),
                    "name": vm.get("name"),
                    "status": vm.get("status")
                })
                
                # Storage handling
                for disk in vm.get("disks", []):
                    storage_id = disk.get("storage_id")
                    if storage_id and storage_id in self.datastores:
                        h["datastores"].add(self.datastores[storage_id].get("name") or storage_id)
                
                storage_id = vm.get("storage_id")
                if storage_id and storage_id in self.datastores:
                    h["datastores"].add(self.datastores[storage_id].get("name") or storage_id)

        # Convert set to list
        for h in result.values():
            h["datastores"] = sorted(list(h["datastores"]))

        return result

