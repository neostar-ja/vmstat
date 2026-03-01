#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import uuid
import urllib3
import os
import csv
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Imports for Auth (from connect.py)
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# =========================
# CONFIG
# =========================
SCP_IP = os.getenv('SCP_IP')
USERNAME = os.getenv('SCP_USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD')

# Fallback or check
if not SCP_IP:
    # Try to hardcode if not found, or raise likely
    # Based on user request history, IP is 10.251.150.222 usually, but prompt said 10.251.204.30.
    # I will trust the env var first, as connect.py does.
    print("Warning: SCP_IP not set in .env")

# Base URL (User example had /janus, connect.py constructs it dynamically)
BASE_URL = f"https://{SCP_IP}/janus" if SCP_IP else ""
OP_LOG_API = f"{BASE_URL}/operation-logs"

# =========================
# AUTH FUNCTIONS (From connect.py)
# =========================

def get_public_key():
    """Get public key modulus from server"""
    print("🔑 Getting public key...")
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
    print("🔐 Encrypting password...")
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
    print("🎫 Requesting token...")
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
                return temp_token
    
    raise Exception(f"Authentication failed: HTTP {response.status_code} - {response.text[:100]}")

# =========================
# FETCH FUNCTIONS
# =========================

def get_server_list(token):
    """Get list of all servers (From connect.py)"""
    print("🌐 Fetching server list...")
    
    all_servers = []
    page_size = 100
    page_num = 0
    
    # Try different API endpoints
    endpoints = [
        "/janus/20190725/servers",
        "/janus/20180725/servers"
    ]
    
    for endpoint in endpoints:
        print(f"👉 Trying endpoint: {endpoint}")
        all_servers = []
        page_num = 0
        
        while True:
            url = f"https://{SCP_IP}{endpoint}"
            headers = {
                "Authorization": f"Token {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            params = {
                "page_num": page_num,
                "page_size": page_size
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, verify=False, timeout=15)
                
                if response.status_code == 200:
                    result = response.json()
                    servers = []
                    total_count = 0
                    
                    if "data" in result:
                        data = result["data"]
                        if "data" in data:
                            servers = data["data"]
                            total_count = data.get("total", len(servers))
                        elif isinstance(data, list):
                            servers = data
                            total_count = len(servers)
                    elif "servers" in result:
                        servers = result["servers"]
                        total_count = result.get("total", len(servers))
                    elif isinstance(result, list):
                        servers = result
                        total_count = len(servers)
                    
                    if servers:
                        all_servers.extend(servers)
                        if len(servers) < page_size:
                            break
                        page_num += 1
                        if page_num > 100: break # Safety
                    else:
                        break
                elif response.status_code == 404:
                    break # Try next endpoint
                else:
                    print(f"HTTP {response.status_code} on {endpoint}")
                    break
            except Exception as e:
                print(f"Error fetching servers: {e}")
                break
        
        if all_servers:
            print(f"✅ Found {len(all_servers)} servers using {endpoint}")
            return all_servers

    return []

def fetch_delete_logs(token, days_back=7):
    """
    ดึง operation log ที่เป็น delete VM
    """
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days_back)

    params = {
        "operation": "delete",
        "resource_type": "vm",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "page_size": 200
    }
    
    # Use headers imitating user example plus Authentication
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Token {token}",
        "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}",
        "Accept": "application/json"
    }

    url = f"https://{SCP_IP}/janus/operation-logs"
    print(f"📜 Fetching delete operation logs from {url}...")

    try:
        resp = requests.get(url, headers=headers, params=params, verify=False, timeout=60)
        
        if resp.status_code != 200:
             # Fallback if unversioned endpoint fails, try versioned? 
             # But user specifically asked for /operation-logs.
             # Let's try 20190725 if base fails.
             print(f"⚠️ Failed to fetch from base URL (HTTP {resp.status_code}). Trying versioned endpoint...")
             url = f"https://{SCP_IP}/janus/20190725/operation-logs"
             resp = requests.get(url, headers=headers, params=params, verify=False, timeout=60)
        
        resp.raise_for_status()
        
        result = resp.json()
        if "data" in result and "data" in result["data"]:
            return result["data"]["data"]
        elif "data" in result:
            return result["data"]
        return []
        
    except Exception as e:
        print(f"❌ Error fetching operation logs: {e}")
        return []

# =========================
# PROCESS DELETE EVENTS
# =========================

def extract_deleted_vms(operation_logs):
    deleted_vms = []

    for log in operation_logs:
        deleted_vms.append({
            "vm_name": log.get("resource_name"),
            "vm_uuid": log.get("resource_id"),
            "operator": log.get("user_name"),
            "operation_time": log.get("operation_time"),
            "operation_result": log.get("result")
        })

    return deleted_vms

# =========================
# MAIN
# =========================

def main():
    print("=== Sangfor SCP - Deleted VM Report ===")
    
    if not SCP_IP or not USERNAME or not PASSWORD:
        print("❌ Error: Environment variables (SCP_IP, SCP_USERNAME, SCP_PASSWORD) are missing.")
        return

    # 1. Authenticate
    try:
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return

    # 2. Fetch Current VMs
    print("\n🌐 Fetching current VMs...")
    current_servers = get_server_list(token)
    current_vm_uuids = {vm.get("id") for vm in current_servers}
    print(f"✅ Active VMs found: {len(current_vm_uuids)}")

    # 3. Fetch Delete Logs
    print("\n📜 Fetching delete operation logs...")
    try:
        # Using 30 days as per user example
        operation_logs = fetch_delete_logs(token, days_back=30)
        print(f"✅ Delete events found: {len(operation_logs)}")
    except Exception as e:
        print(f"⚠️ Failed to fetch delete logs: {e}")
        print("ℹ️ Note: The /operation-logs endpoint might not be available on this Sangfor SCP version.")
        operation_logs = []

    # 4. Process
    deleted_vms = extract_deleted_vms(operation_logs)

    # ตรวจว่า VM ใน log ยังมีอยู่ไหม (กันกรณี false event)
    confirmed_deleted = []

    for vm in deleted_vms:
        if vm["vm_uuid"] not in current_vm_uuids:
            confirmed_deleted.append(vm)

    result = {
        "checked_at": datetime.now().isoformat(),
        "total_delete_events": len(deleted_vms),
        "confirmed_deleted_vms": confirmed_deleted
    }

    output_file = "vm_deleted_from_operation_log.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print("\n=== VM DELETE REPORT ===")
    print(f"Total delete events: {len(deleted_vms)}")
    print(f"Confirmed deleted VMs (Reference Only): {len(confirmed_deleted)}\n")

    for vm in confirmed_deleted:
        print(f"- {vm['vm_name']} ({vm['vm_uuid']})")
        print(f"  Deleted by: {vm['operator']}")
        print(f"  Result: {vm['operation_result']}")
        print(f"  Time: {vm['operation_time']}")
        print()

    print(f"✔ Exported {output_file}")

if __name__ == "__main__":
    main()
