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
from datetime import datetime
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# =========================
# CONFIGURATION
# =========================
SCP_IP = os.getenv('SCP_IP')
USERNAME = os.getenv('SCP_USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD')

# Validate required environment variables
if not SCP_IP:
    raise ValueError("SCP_IP environment variable is required")
if not USERNAME:
    raise ValueError("SCP_USERNAME environment variable is required")
if not PASSWORD:
    raise ValueError("SCP_PASSWORD environment variable is required")

BASE_URL = f"https://{SCP_IP}/janus"

# =========================
# AUTHENTICATION (From connect.py)
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
                return data["access"]["token"]["id"]
        
        # Try alternative paths
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
    
    raise Exception(f"Authentication failed: HTTP {response.status_code}")

# =========================
# FETCH DATA
# =========================

def fetch_servers(token):
    """Get list of all servers with pagination support"""
    print("⏳ Fetching server list...")
    
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
                "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}"
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
                    if "data" in result:
                        data = result["data"]
                        if "data" in data:
                            servers = data["data"]
                        elif isinstance(data, list):
                            servers = data
                    elif "servers" in result:
                        servers = result["servers"]
                    elif isinstance(result, list):
                        servers = result
                    
                    if servers:
                        all_servers.extend(servers)
                        if len(servers) < page_size:
                            break # Last page
                        page_num += 1
                        if page_num > 100: # Safety break
                            break
                    else:
                        break # No more servers
                        
                elif response.status_code == 404:
                    break # Endpoint not found, try next
                else:
                    print(f"❌ Error fetching servers: HTTP {response.status_code}")
                    break
                    
            except Exception as e:
                print(f"❌ Error: {e}")
                break
        
        if all_servers:
            print(f"✅ Found {len(all_servers)} servers using {endpoint}")
            return all_servers

    if not all_servers:
        print("⚠️ No servers found using any endpoint")
    
    return all_servers

# =========================
# OS LOGIC (CORE)
# =========================

def build_os_display(server):
    """
    สร้างชื่อ OS ที่ถูกต้องและเหมาะสำหรับแสดงผล
    ตามแนวทาง Open-API PDF
    """

    image_name = server.get("image_name")
    os_option = server.get("os_option", {}) or {}

    kernel = os_option.get("kernel_name")
    distro = os_option.get("distribution_name")
    arch = os_option.get("arch")

    # 1) ถ้ามี image_name -> เชื่อถือสูงสุด
    if image_name:
        if arch:
            return f"{image_name} ({arch})"
        return image_name

    # 2) ไม่มี image -> ใช้ kernel + distro
    parts = []
    if distro:
        parts.append(distro.capitalize())
    if kernel and kernel.lower() != distro:
        parts.append(kernel.capitalize())

    if parts:
        name = " ".join(parts)
        if arch:
            name += f" ({arch})"
        return name

    # 3) fallback สุดท้าย
    return server.get("os_name", "unknown")


def extract_os_info(server):
    """
    ดึงข้อมูล OS ให้ครบถ้วน (raw + display)
    """
    
    os_option = server.get("os_option") or {}
    
    return {
        "os_display_name": build_os_display(server),

        # raw fields
        "os_name": server.get("os_name"),
        "os_type": server.get("os_type"),
        "os_installed": server.get("os_installed"),
        "image_name": server.get("image_name"),
        "image_id": server.get("image_id"),

        # technical
        "os_option": {
            "kernel": os_option.get("kernel_name"),
            "distribution": os_option.get("distribution_name"),
            "architecture": os_option.get("arch")
        }
    }

# =========================
# BUILD INVENTORY
# =========================

def build_os_inventory(servers):
    inventory = []

    for server in servers:
        inventory.append({
            "vm_id": server.get("vm_id") or server.get("id"), # Handle potential id field differences
            "vm_uuid": server.get("id"),
            "vm_name": server.get("name"),
            "group_name": server.get("group_name"),
            "vm_type": server.get("vmtype"),
            "status": server.get("status"),
            "power_state": server.get("power_state"),
            "os": extract_os_info(server)
        })

    return inventory

# =========================
# MAIN
# =========================

def main():
    print("=== Sangfor SCP - OS Inventory Exporter ===")
    
    try:
        # Auth
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
        print("✅ Authenticated successfully")
        
        # Fetch
        servers = fetch_servers(token)
        if not servers:
            print("❌ No servers retrieved. Exiting.")
            return

        # Build Inventory
        inventory = build_os_inventory(servers)

        output = {
            "metadata": {
                "total_vms": len(inventory),
                "source": f"Sangfor SCP ({SCP_IP})",
                "timestamp": datetime.now().isoformat(),
                "note": "OS display name is built according to SCP Open-API design"
            },
            "vms": inventory
        }

        with open("vm_os_inventory.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"✅ Exported vm_os_inventory.json ({len(inventory)} VMs)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
