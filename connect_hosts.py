# -*- coding: utf-8 -*-
import requests
import urllib3
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from dotenv import load_dotenv

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# ======================================================================================
# 0. Auth Helper (To keep main clean and automated)
# ======================================================================================
class SCPAuth:
    def __init__(self, ip, username, password):
        self.ip = ip
        self.username = username
        self.password = password
        self.base_url = f"https://{ip}"
    
    def get_token(self):
        print(f"🔐 Authenticating with {self.ip}...")
        try:
            # 1. Get Public Key
            # Note: janus/public-key is often at root, not versioned api
            resp = requests.get(f"{self.base_url}/janus/public-key", verify=False, timeout=10)
            resp.raise_for_status()
            pub_key = resp.json()['data']['public_key'].replace('\\n', '').strip()
            
            # 2. Encrypt Password
            e = int(0x10001)
            n = bytes_to_long(a2b_hex(pub_key))
            rsa_key = RSA.construct((n, e))
            cipher = PKCS1_v1_5.new(rsa_key.publickey())
            enc_password = b2a_hex(cipher.encrypt(self.password.encode('utf-8'))).decode('utf-8')
            
            # 3. Authenticate
            payload = {
                "auth": {
                    "passwordCredentials": {
                        "username": self.username,
                        "password": enc_password
                    }
                }
            }
            resp = requests.post(f"{self.base_url}/janus/authenticate", 
                               json=payload, 
                               headers={"Content-Type": "application/json"},
                               verify=False, 
                               timeout=30)
            resp.raise_for_status()
            result = resp.json()
            
            # 4. Extract Token
            if result.get("code") == 0 and "data" in result:
                data = result["data"]
                # Try standard paths
                token = None
                if isinstance(data, dict):
                    token = data.get("access", {}).get("token", {}).get("id")
                    if not token:
                        token = data.get("token", {}).get("id")
                    if not token: # Try just 'token' string
                         token = data.get("token") if isinstance(data.get("token"), str) else None
                
                if token:
                    print("✅ Authentication successful")
                    return token
            
            # If we reached here, token extraction failed
            print(f"❌ Could not extract token from response: {result}")
            return None
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return None

# ======================================================================================
# 1. SCPClient (User Defined Structure)
# ======================================================================================
class SCPClient:
    """
    SCP API Client
    """
    def __init__(self, scp_ip, token):
        self.base_url = f"https://{scp_ip}"
        self.default_version = "/janus/20180725"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Token {token}"
        }

    def get(self, path, params=None):
        # Allow path to be absolute (start with /janus) or relative (use default version)
        if path.startswith("/janus"):
            url = f"{self.base_url}{path}"
        else:
            url = f"{self.base_url}{self.default_version}{path}"
            
        try:
            resp = requests.get(
                url,
                headers=self.headers,
                params=params,
                verify=False,
                timeout=30
            )
            # Log 404s but don't crash, let caller handle empty
            if resp.status_code == 404:
                print(f"⚠️  Endpoint not found: {url}")
                return []
                
            resp.raise_for_status()
            
            data = resp.json()
            # Handle different data envelopes
            if "data" in data:
                return data["data"]
            return data
            
        except Exception as e:
            print(f"⚠️  GET {path} failed: {e}")
            return []

# ======================================================================================
# 2. SCPCollector (User Defined Structure)
# ======================================================================================
class SCPCollector:
    """
    Collect raw resources from SCP
    """
    def __init__(self, client: SCPClient):
        self.client = client

    def get_hosts(self):
        # Try 2019 first for better data
        return self.client.get("/janus/20190725/hosts")

    def get_vms(self):
        return self.client.get("/janus/20190725/servers")

    def get_datastores(self):
        # User said /datastores but API is usually /storages
        return self.client.get("/janus/20190725/storages")

    def get_azs(self):
        # User said /availability-zones but API is /azs
        return self.client.get("/janus/20180725/azs")

    def get_alarms(self):
        return self.client.get("/janus/20190725/alarms")

# ======================================================================================
# 3. HostResourceAggregator (User Defined Structure)
# ======================================================================================
class HostResourceAggregator:
    """
    Build full host resource view
    """
    def __init__(self, hosts, vms, datastores, azs, alarms):
        # Robust handling if inputs are dict wrappers
        self.hosts = self._extract_list(hosts)
        self.vms = self._extract_list(vms)
        self.datastores = {d["id"]: d for d in self._extract_list(datastores)}
        
        azs_list = self._extract_list(azs)
        self.azs = {a["id"]: a["name"] for a in azs_list}

        self.host_alarms = defaultdict(list)
        alarms_list = self._extract_list(alarms)
        for alarm in alarms_list:
            obj_type = alarm.get("object_type") or alarm.get("resource_type")
            obj_id = alarm.get("object_id") or alarm.get("resource_id") or alarm.get("resid")
            
            if obj_type == "host" or obj_type == "server_physical": # Check for variations
                self.host_alarms[obj_id].append(alarm)
    
    def _extract_list(self, data):
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if "data" in data and isinstance(data["data"], list):
                return data["data"]
            if "servers" in data: return data["servers"]
            if "hosts" in data: return data["hosts"]
        return []

    def build(self):
        result = {}
        
        for host in self.hosts:
            host_id = host.get("id")
            # Fallback for IP if empty (common in VMware hosts where name IS key)
            ip_addr = host.get("ip")
            if not ip_addr and host.get("name"):
                ip_addr = host.get("name")

            cpu_data = host.get("cpu") or host.get("cpu_status") or {}
            mem_data = host.get("memory") or host.get("memory_status") or {}

            # Extract CPU metrics
            # API uses 'core_count'/'socket_count' often, but sometimes 'cores'/'sockets'
            cpu_cores = cpu_data.get("core_count") or cpu_data.get("cores") or 0
            cpu_sockets = cpu_data.get("socket_count") or cpu_data.get("sockets") or 0
            cpu_total = cpu_data.get("total_mhz")
            cpu_used = cpu_data.get("used_mhz")
            cpu_ratio = cpu_data.get("ratio")
            mem_total = mem_data.get("total_mb")
            mem_used = mem_data.get("used_mb")
            mem_ratio = mem_data.get("ratio")

            result[host_id] = {
                "host_id": host_id,
                "host_name": host.get("name") or ip_addr,
                "ip": ip_addr,
                "type": host.get("type"),
                "status": host.get("status"),
                "az": self.azs.get(host.get("az_id"), "unknown"),
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
                    "free_mb": int(float(str(mem_total or 0))) - int(float(str(mem_used or 0))),
                    "usage_ratio": mem_ratio
                },

                # VM
                "vm": {
                    "total": 0,
                    "running": 0,
                    "stopped": 0
                },

                # Storage (derived)
                "datastores": set(),

                # Alarm
                "alarms": {
                    "count": len(self.host_alarms.get(host_id, [])),
                    "details": self.host_alarms.get(host_id, [])
                }
            }

        # Aggregate VM → Host → Datastore
        for vm in self.vms:
            host_id = vm.get("host_id")
            if host_id not in result:
                continue

            h = result[host_id]
            h["vm"]["total"] += 1

            if vm.get("status") == "active" or vm.get("power_state") == "on":
                h["vm"]["running"] += 1
            else:
                h["vm"]["stopped"] += 1

            # Storage handling
            for disk in vm.get("disks", []):
                storage_id = disk.get("storage_id")
                if storage_id and storage_id in self.datastores:
                     h["datastores"].add(self.datastores[storage_id]["name"])
            
            storage_id = vm.get("storage_id")
            if storage_id and storage_id in self.datastores:
                h["datastores"].add(self.datastores[storage_id]["name"])

        # Convert set → list
        for h in result.values():
            h["datastores"] = sorted(list(h["datastores"]))

        return result

def save_to_json(data, filename="host_resources.json"):
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Data exported to {filename}")
    except Exception as e:
        print(f"❌ Failed to export JSON: {e}")

# ======================================================================================
# 4. Main
# ======================================================================================
def main():
    print("=== Sangfor Host Explorer 2.0 (Architecture Refactor) ===")
    
    # 1. Config
    SCP_IP = os.getenv('SCP_IP')
    USERNAME = os.getenv('SCP_USERNAME')
    PASSWORD = os.getenv('SCP_PASSWORD')
    
    if not all([SCP_IP, USERNAME, PASSWORD]):
        print("❌ Missing environment variables")
        sys.exit(1)

    # 2. Get Token (Automated)
    auth = SCPAuth(SCP_IP, USERNAME, PASSWORD)
    token = auth.get_token()
    
    if not token:
        print("❌ Failed to obtain token")
        sys.exit(1)

    # 3. Client & Collector
    client = SCPClient(SCP_IP, token)
    collector = SCPCollector(client)

    print("\n📦 Collecting data from SCP...")
    hosts = collector.get_hosts()
    vms = collector.get_vms()
    datastores = collector.get_datastores()
    azs = collector.get_azs()
    alarms = collector.get_alarms()
    
    print(f"   Stats: Hosts={len(hosts) if hosts else 0}, VMs={len(vms) if vms else 0}")

    # 4. Aggregator
    aggregator = HostResourceAggregator(
        hosts, vms, datastores, azs, alarms
    )

    host_resources = aggregator.build()

    # 5. Output
    print("\n=== Host Resource Summary ===")
    for host in host_resources.values():
        print(f"Host: {host['host_name']} ({host['ip']})")
        print(f"  AZ        : {host['az']}")
        print(f"  Status    : {host['status']}")
        
        cpu_rt = host['cpu']['usage_ratio']
        mem_rt = host['memory']['usage_ratio']
        # Convert fractional to percentage if needed
        cpu_pct = f"{cpu_rt*100:.1f}%" if isinstance(cpu_rt, (int, float)) else str(cpu_rt)
        mem_pct = f"{mem_rt*100:.1f}%" if isinstance(mem_rt, (int, float)) else str(mem_rt)

        print(f"  CPU       : {cpu_pct}")
        print(f"  Memory    : {mem_pct}")
        print(f"  VM        : {host['vm']['total']} (running {host['vm']['running']})")
        print(f"  Datastore : {', '.join(host['datastores'])}")
        print(f"  Alarms    : {host['alarms']['count']}")
        print("")

    # 6. Export
    save_to_json(host_resources)

if __name__ == "__main__":
    main()
