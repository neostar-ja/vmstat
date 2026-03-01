#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import uuid
import urllib3
import os
import sys
from datetime import datetime
from collections import defaultdict
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# =========================
# CONFIG
# =========================
SCP_IP = os.getenv('SCP_IP')
USERNAME = os.getenv('SCP_USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD')

if not all([SCP_IP, USERNAME, PASSWORD]):
    print("❌ Error: Missing SCP_IP, SCP_USERNAME, or SCP_PASSWORD in .env")
    sys.exit(1)

BASE_URL = f"https://{SCP_IP}/janus"
SERVERS_API = f"{BASE_URL}/20190725/servers"
HOSTS_API = f"{BASE_URL}/20190725/hosts"
ALARMS_API = f"{BASE_URL}/20190725/alarms"

# =========================
# AUTHENTICATION
# =========================
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
                    if not token:
                         token = data.get("token") if isinstance(data.get("token"), str) else None
                
                if token:
                    print("✅ Authentication successful")
                    return token
            
            print(f"❌ Could not extract token from response")
            return None
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return None

# =========================
# FETCH FUNCTIONS
# =========================

def fetch_data(api, token):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Token {token}",
        "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}"
    }
    
    all_data = []
    page_num = 0
    page_size = 100
    
    print(f"   Fetching from {api}...")
    
    while True:
        try:
            params = {
                "page_num": page_num,
                "page_size": page_size
            }
            
            resp = requests.get(api, headers=headers, params=params, verify=False, timeout=60)
            
            if resp.status_code != 200:
                print(f"   ⚠️ API returned {resp.status_code} on page {page_num}")
                break
                
            json_data = resp.json()
            current_batch = []
            
            if "data" in json_data:
                inner_data = json_data["data"]
                if isinstance(inner_data, dict) and "data" in inner_data:
                    current_batch = inner_data["data"]
                elif isinstance(inner_data, list):
                    current_batch = inner_data
                elif isinstance(inner_data, dict):
                     current_batch = [inner_data]
            
            if not current_batch:
                break
                
            all_data.extend(current_batch)
            print(f"   Page {page_num}: Found {len(current_batch)} records")
            
            if len(current_batch) < page_size:
                break
                
            page_num += 1
            if page_num > 100: # Safety break
                break
                
        except Exception as e:
            print(f"   ⚠️ Error fetching {api}: {e}")
            break
            
    return all_data

# =========================
# FIELD HELPERS
# =========================

def map_severity(level):
    if not level: return "Low"
    level = str(level).lower()
    mapping = {
        "p1": "Critical",
        "p2": "Medium",
        "p3": "Low",
        "critical": "Critical",
        "warning": "Medium",
        "info": "Low"
    }
    return mapping.get(level, level.capitalize())

def map_object_type(obj_type):
    if not obj_type: return "Unknown"
    obj_type = str(obj_type).lower()
    mapping = {
        "vm": "Virtual Machine",
        "host": "Node",
        "datastore": "Datastore",
        "net": "Network",
        "switch": "Switch"
    }
    return mapping.get(obj_type, obj_type.title())

def get_description(a):
    return (
        a.get("description")
        or a.get("alarm_desc")
        or a.get("detail")
        or a.get("desc")
        or a.get("content")
        or ""
    )

def get_recommendation(a):
    return (
        a.get("recommendation")
        or a.get("suggestion")
        or a.get("solution")
        or a.get("advice")
        or "Contact Administrator"
    )

# =========================
# BUILD RESOURCE POOL MAP
# =========================

def build_resource_pool_map(servers, hosts):
    resource_pool = {}

    for s in servers:
        resource_pool[s.get("id")] = s.get("az_name") or s.get("zone", {}).get("name")

    for h in hosts:
        resource_pool[h.get("id")] = h.get("az_name") or h.get("zone", {}).get("name")

    return resource_pool

# =========================
# BUILD UI STYLE ALARM
# =========================

def build_alarm_report(alarms, resource_pool_map):

    grouped = defaultdict(list)

    for a in alarms:
        # Group by (Title, Object Name)
        key = (a.get("title"), a.get("object_name"))
        grouped[key].append(a)

    final_result = []

    for (title, object_name), alarm_list in grouped.items():
        # Sort by time (newest first)
        alarm_list.sort(key=lambda x: x.get("begin_time") or "", reverse=True)
        first = alarm_list[0]
        
        # Determine Resource Pool / AZ
        obj_id = first.get("object_id")
        resource_pool = resource_pool_map.get(obj_id, "")
        if not resource_pool and first.get("source") == "system":
             resource_pool = "All Zones"

        final_result.append({
            "Severity": map_severity(first.get("severity_level")),
            "Alert Object": object_name,
            "Time Occurred": first.get("begin_time"),
            "Policy Name": title,
            "Object Type": map_object_type(first.get("object_type")),
            "Resource Pool": resource_pool,
            "Description": get_description(first),
            "Recommendations": get_recommendation(first),
            "Alert Count": len(alarm_list)
        })

    # Sort final result by Severity (Critical first)
    severity_order = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}
    
    final_result.sort(key=lambda x: severity_order.get(x["Severity"], 99))
    
    return final_result

# =========================
# PROCESS ALARMS
# =========================

def extract_vm_alarms(servers):
    vm_alarms = []
    for s in servers:
        alarm_block = s.get("alarm", {})
        if alarm_block.get("alarm") == 1 or alarm_block.get("alarm") is True:
            for a in alarm_block.get("alarm_info", []):
                # Standardize keys
                a["object_id"] = s.get("id")
                a["object_name"] = s.get("name")
                a["object_type"] = "vm"
                a["source"] = "vm"
                # Ensure keys exist for builder
                a["severity_level"] = a.get("severity_level")
                a["title"] = a.get("title")
                a["begin_time"] = a.get("begin_time")
                vm_alarms.append(a)
    return vm_alarms

def extract_host_alarms(hosts):
    host_alarms = []
    for h in hosts:
        alarm_block = h.get("alarm", {})
        if alarm_block.get("alarm") == 1 or alarm_block.get("alarm") is True:
            for a in alarm_block.get("alarm_info", []):
                # Standardize keys
                a["object_id"] = h.get("id")
                a["object_name"] = h.get("name")
                a["object_type"] = "host"
                a["source"] = "host"
                
                a["severity_level"] = a.get("severity_level")
                a["title"] = a.get("title")
                a["begin_time"] = a.get("begin_time")
                host_alarms.append(a)
    return host_alarms

def extract_system_alarms(system_alarms):
    # System alarms usually already have object_id/name etc, but let's ensure consistency
    for a in system_alarms:
        a["source"] = "system"
        if "severity_level" not in a and "severity" in a:
            a["severity_level"] = a["severity"]
    return system_alarms

# =========================
# MAIN
# =========================

def main():
    # 1. Get Token
    auth = SCPAuth(SCP_IP, USERNAME, PASSWORD)
    token = auth.get_token()
    
    if not token:
        sys.exit(1)

    print("Fetching servers...")
    servers = fetch_data(SERVERS_API, token)
    print(f"   Found {len(servers)} servers")

    print("Fetching hosts...")
    hosts = fetch_data(HOSTS_API, token)
    print(f"   Found {len(hosts)} hosts")

    print("Fetching general alarms...")
    # These are usually system-wide or non-resource bound alarms
    system_alarms = fetch_data(ALARMS_API, token)
    print(f"   Found {len(system_alarms)} general/system alarms")

    # Build Map
    resource_pool_map = build_resource_pool_map(servers, hosts)

    # Extract & Aggregate
    vm_alarm_list = extract_vm_alarms(servers)
    host_alarm_list = extract_host_alarms(hosts)
    system_alarm_list = extract_system_alarms(system_alarms)
    
    all_alarms = vm_alarm_list + host_alarm_list + system_alarm_list
    print(f"Total Combined Alarms: {len(all_alarms)}")

    # Build Report
    report = build_alarm_report(all_alarms, resource_pool_map)

    result = {
        "generated_at": datetime.now().isoformat(),
        "total_alert_groups": len(report),
        "total_alerts_raw": len(all_alarms),
        "alerts": report
    }

    output_path = "alarm_ui_style_report.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✔ Exported {output_path}")

if __name__ == "__main__":
    main()
