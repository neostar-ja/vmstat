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

if not SCP_IP:
    print("Warning: SCP_IP not found in env, using default.")
if not USERNAME or not PASSWORD:
    print("Error: SCP_USERNAME or SCP_PASSWORD not found in environment variables.")
    # We might want to exit or let it fail later? 
    # Let's assume they might be in .env or we fail at auth.

# =========================
# AUTHENTICATION FUNCTIONS (From connect.py)
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
# FETCHING FUNCTIONS
# =========================

def get_all_servers(token):
    """Get list of all servers with pagination support (adapted from connect.py)"""
    print("⏳ Fetching server list...")
    
    all_servers = []
    page_size = 100
    
    # Endpoints to try
    endpoints = [
        "/janus/20190725/servers",
        "/janus/20180725/servers",
        "/janus/servers" # Added the one from user snippet as fallback
    ]
    
    for endpoint in endpoints:
        print(f"🔹 Trying endpoint: {endpoint}")
        all_servers = []
        page_num = 0 # 0-indexed or 1-indexed? connect.py used 0.
        
        while True:
            url = f"https://{SCP_IP}{endpoint}"
            headers = {
                "Authorization": f"Token {token}",
                "Content-Type": "application/json",
                "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}" # Added from user snippet
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
                    total_count = 0
                    
                    if "data" in result:
                        data = result["data"]
                        if isinstance(data, dict) and "data" in data:
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
                     # Endpoint not supported or bad request, try next endpoint
                     if not all_servers: # If we haven't found anything yet on this endpoint
                         print(f"   Endpoint {endpoint} returned {response.status_code}")
                         break # Break while loop to try next endpoint
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

# =========================
# EXTRACTION FUNCTIONS (From User Request)
# =========================

def extract_network_info(server):
    """
    ดึงข้อมูล network ของ VM ให้ครบถ้วน
    """
    vm_network = {
        "vm_id": server.get("vm_id") or server.get("id"), # Fallback to top level id
        "vm_uuid": server.get("id"),
        "vm_name": server.get("name"),
        "group_name": server.get("group_name"),
        "status": server.get("status"),
        "power_state": server.get("power_state"),
        "network_type": server.get("network_type"),
        "primary_ips": server.get("ips", []),
        "network_status": server.get("network_status", {}),
        "floating_ip": server.get("floatingip", {}),
        "interfaces": []
    }

    for net in server.get("networks", []):
        nic = {
            "network_name": net.get("name"),
            "vif_id": net.get("vif_id"),
            "port_id": net.get("port_id"),
            "mac_address": net.get("mac_address"),
            "model": net.get("model"),
            "connected": bool(net.get("connect")),
            "ip_address": net.get("ip_address"),
            "ipv6_address": net.get("ipv6_address"),
            "subnet_id": net.get("subnet_id"),
            "subnet_name": net.get("subnet_name"),
            "cidr": net.get("cidr"),
            "gateway": net.get("subnet_gateway_ip"),
            "custom_gateway": net.get("custom_gateway_ip"),
            "vpc_id": net.get("vpc_id"),
            "vpc_name": net.get("vpc_name"),
            "device_id": net.get("device_id")
        }
        vm_network["interfaces"].append(nic)

    return vm_network


def collect_all_networks(servers):
    """
    รวมข้อมูล network ของทุก VM
    """
    result = []
    for server in servers:
        result.append(extract_network_info(server))
    return result


# =========================
# MAIN
# =========================

def main():
    try:
        # Auth
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
        
        # GetData
        servers = get_all_servers(token)
        networks = collect_all_networks(servers)

        output = {
            "metadata": {
                "total_vms": len(networks),
                "source": f"Sangfor SCP ({SCP_IP})",
                "timestamp": datetime.now().isoformat()
            },
            "vm_networks": networks
        }

        with open("vm_network_full.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"✔ Network data exported to vm_network_full.json ({len(networks)} VMs)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
