#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import uuid
import urllib3
import os
import sys
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from dotenv import load_dotenv
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# =========================
# CONFIGURATION
# =========================
SCP_IP = os.getenv('SCP_IP', '10.251.204.30')
USERNAME = os.getenv('SCP_USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD')

BASE_URL = f"https://{SCP_IP}/janus"
ALARMS_API = f"{BASE_URL}/alarms"

if not SCP_IP:
    print("Warning: SCP_IP not found in env, using default.")
if not USERNAME or not PASSWORD:
    print("Error: SCP_USERNAME or SCP_PASSWORD not found in environment variables.")

# =========================
# AUTHENTICATION FUNCTIONS
# =========================

def get_public_key():
    """Get public key modulus from server"""
    print("⏳ Getting public key...")
    url = f'https://{SCP_IP}/janus/public-key'
    response = requests.get(url, verify=False, timeout=10)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get public key: HTTP {response.status_code}")
    
    result = response.json()
    if 'data' in result and 'public_key' in result['data']:
        public_key = result['data']['public_key'].replace('\\n', '').strip()
        print("✅ Public key obtained successfully")
        return public_key
    else:
        raise Exception("Public key not found in response")

def encrypt_password(password, modulus):
    """Encrypt password using RSA public key"""
    print("⏳ Encrypting password...")
    password = password.encode('utf-8')
    e = int(0x10001)
    n = bytes_to_long(a2b_hex(modulus))
    rsa_key = RSA.construct((n, e))
    public_key = rsa_key.publickey()
    cipher = PKCS1_v1_5.new(public_key)
    encrypted = cipher.encrypt(password)
    encrypted_hex = b2a_hex(encrypted).decode('utf-8')
    print("✅ Password encrypted successfully")
    return encrypted_hex

def get_token(username, encrypted_password):
    """Get authentication token using encrypted password"""
    print("⏳ Requesting token...")
    url = f"https://{SCP_IP}/janus/authenticate"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "auth": {
            "passwordCredentials": {
                "username": username,
                "password": encrypted_password
            }
        }
    }
    
    response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        if result.get("code") == 0 and "data" in result:
            data = result["data"]
            if "access" in data and "token" in data["access"] and "id" in data["access"]["token"]:
                token = data["access"]["token"]["id"]
                print("✅ Token acquired successfully")
                return token
        
        # Alternative paths
        token_paths = [
            ["access", "token", "id"],
            ["token", "id"],
            ["access_token"],
            ["token"],
            ["id"]
        ]
        
        for path in token_paths:
            temp_token = result
            for key in path:
                if isinstance(temp_token, dict) and key in temp_token:
                    temp_token = temp_token[key]
                else:
                    temp_token = None
                    break
            
            if temp_token and isinstance(temp_token, str):
                print(f"✅ Token found at path: {' -> '.join(path)}")
                return temp_token

    raise Exception(f"Authentication failed: HTTP {response.status_code}")

# =========================
# FETCH FUNCTIONS
# =========================

def get_all_servers(token):
    """Get list of all servers with pagination support"""
    print("⏳ Fetching server list...")
    
    all_servers = []
    page_size = 100
    
    # Endpoints to try
    endpoints = [
        "/janus/20190725/servers",
        "/janus/20180725/servers",
        "/janus/servers"
    ]
    
    for endpoint in endpoints:
        print(f"🔹 Trying endpoint: {endpoint}")
        all_servers = []
        page_num = 0
        
        while True:
            url = f"https://{SCP_IP}{endpoint}"
            headers = {
                "Authorization": f"Token {token}",
                "Content-Type": "application/json",
                "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}"
            }
            params = {
                "page_num": page_num,
                "page_size": page_size
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, verify=False, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    servers = []
                    
                    if "data" in result:
                        data = result["data"]
                        if isinstance(data, dict) and "data" in data:
                            servers = data["data"]
                        elif isinstance(data, list):
                            servers = data
                    elif "servers" in result:
                        servers = result["servers"]
                    elif isinstance(result, list):
                        servers = result
                    
                    current_count = len(servers)
                    print(f"   Found {current_count} servers on page {page_num}")
                    
                    if servers:
                        all_servers.extend(servers)
                        if current_count < page_size:
                            break # Last page
                        page_num += 1
                        if page_num > 100: break # Safety
                    else:
                        break # No more
                        
                elif response.status_code in [404, 400]:
                     if not all_servers:
                         print(f"   Endpoint {endpoint} returned {response.status_code}")
                         break
                     else:
                         print(f"   Error on page {page_num}: {response.status_code}")
                         break
                else:
                    print(f"   HTTP {response.status_code}")
                    break
                    
            except Exception as e:
                print(f"   Error: {e}")
                break
        
        if all_servers:
            print(f"✅ Successfully retrieved {len(all_servers)} servers total from {endpoint}")
            return all_servers
            
    if not all_servers:
        print("⚠️ No servers found from any endpoint.")
    return all_servers

def fetch_alarms(token):
    """
    ดึง alarm ทั้งระบบ (เฉพาะที่ยัง open)
    """
    print("⏳ Fetching system alarms...")
    
    # Endpoints to try (mimicking server list logic)
    endpoints = [
        "/janus/20190725/alarms", 
        "/janus/20180725/alarms",
        "/janus/alarms"
    ]
    
    params = {
        "status": "open",
        "page_size": 100,
        "page_num": 0  # Add page_num explicitly
    }
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
        "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}"
    }
    
    for endpoint in endpoints:
        print(f"🔹 Trying alarm endpoint: {endpoint}")
        url = f"https://{SCP_IP}{endpoint}"
        
        try:
            resp = requests.get(url, headers=headers, params=params, verify=False, timeout=30)
            
            if resp.status_code == 200:
                result = resp.json()
                alarms = []
                
                if "data" in result:
                    data = result["data"]
                    if isinstance(data, dict):
                        # Some versions return {data: {data: [], total: N}}
                        if "data" in data:
                            alarms = data["data"]
                    elif isinstance(data, list):
                        alarms = data
                
                # If we got a successful 200 OK, even if empty list, it's the right endpoint
                print(f"✅ Retrieved {len(alarms)} system alarms from {endpoint}")
                return alarms
                
            elif resp.status_code == 404:
                print(f"   Endpoint {endpoint} returned 404, trying next...")
                continue
            else:
                print(f"⚠️ Failed to fetch alarms from {endpoint}: {resp.status_code}")
                # Don't break immediately, maybe next endpoint works? 
                # Actually if it's 401 or 403 we should probably stop but let's try others just in case
                
        except Exception as e:
            print(f"   Error fetching from {endpoint}: {e}")
            continue
            
    print("❌ Failed to fetch alarms from all endpoints")
    return []

# =========================
# DATA PROCESSING
# =========================

def extract_network(server):
    interfaces = []
    for net in server.get("networks", []):
        interfaces.append({
            "network_name": net.get("name"),
            "vif_id": net.get("vif_id"),
            "port_id": net.get("port_id"),
            "mac_address": net.get("mac_address"),
            "model": net.get("model"),
            "connected": bool(net.get("connect")),
            "ip_address": net.get("ip_address"),
            "ipv6_address": net.get("ipv6_address"),
            "device_id": net.get("device_id")
        })
    return interfaces

def extract_vm_alarm(server):
    """
    Alarm ที่ติดมากับ VM (/servers)
    """
    alarms = []
    alarm_block = server.get("alarm", {})
    # Check explicitly for 1 or boolean true or string "1"
    has_alarm = alarm_block.get("alarm")
    
    if has_alarm == 1 or has_alarm is True:
        for a in alarm_block.get("alarm_info", []):
            alarms.append({
                "source": "vm",
                "severity": a.get("severity_level"),
                "title": a.get("title"),
                "status": a.get("status"),
                "begin_time": a.get("begin_time"),
                "object_type": a.get("object_type")
            })
    return alarms

def map_system_alarms(vm, system_alarms):
    """
    ผูก alarm จาก /alarms เข้ากับ VM
    """
    vm_alarms = []
    vm_id = vm.get("id") or vm.get("vm_id")
    vm_name = vm.get("name")
    
    for a in system_alarms:
        # Check matching object_id or object_name
        # Be careful with None values
        if (vm_id and a.get("object_id") == vm_id) or \
           (vm_name and a.get("object_name") == vm_name):
            vm_alarms.append({
                "source": "system",
                "severity": a.get("severity_level"),
                "title": a.get("title"),
                "status": a.get("status"),
                "begin_time": a.get("begin_time"),
                "object_type": a.get("object_type")
            })
    return vm_alarms

# =========================
# MAIN LOGIC
# =========================

def build_vm_inventory(servers, system_alarms):
    result = []

    for server in servers:
        vm_data = {
            "vm_id": server.get("vm_id"),
            "vm_uuid": server.get("id"),
            "vm_name": server.get("name"),
            "group_name": server.get("group_name"),
            "status": server.get("status"),
            "power_state": server.get("power_state"),
            "primary_ips": server.get("ips", []),
            "network": extract_network(server),
            "alarms": []
        }

        # 1) alarm จาก /servers
        vm_data["alarms"].extend(extract_vm_alarm(server))

        # 2) alarm จาก /alarms
        vm_data["alarms"].extend(
            map_system_alarms(server, system_alarms)
        )

        result.append(vm_data)

    return result

# =========================
# ENTRY POINT
# =========================

def main():
    try:
        # Auth
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
        
        # Fetch Data
        servers = get_all_servers(token)
        system_alarms = fetch_alarms(token)

        # Build Hybrid Inventory
        inventory = build_vm_inventory(servers, system_alarms)

        output = {
            "metadata": {
                "total_vms": len(inventory),
                "total_system_alarms": len(system_alarms),
                "source": f"Sangfor SCP ({SCP_IP})",
                "timestamp": datetime.now().isoformat()
            },
            "vms": inventory
        }

        output_path = "/opt/code/sangfor_scp/vm_network_alarm_hybrid.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"✔ Exported {output_path} with {len(inventory)} VMs")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
