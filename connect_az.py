#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import uuid
import json
import urllib3
import os
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables from .env file
load_dotenv()

# =========================
# CONFIG
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

BASE_URL = f"https://{SCP_IP}"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# =========================
# AUTHENTICATION
# =========================
def get_public_key():
    """Get public key modulus from server"""
    print("🔑 Getting public key...")
    url = f'{BASE_URL}/janus/public-key'
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
    print("📡 Requesting token...")
    url = f"{BASE_URL}/janus/authenticate"
    payload = {
        "auth": {
            "passwordCredentials": {
                "username": username,
                "password": encrypted_password
            }
        }
    }
    
    response = requests.post(url, json=payload, headers=HEADERS, verify=False, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        if result.get("code") == 0 and "data" in result:
            data = result["data"]
            if "access" in data and "token" in data["access"] and "id" in data["access"]["token"]:
                print("✅ Token acquired successfully")
                return data["access"]["token"]["id"]
    
    raise Exception(f"Authentication failed: HTTP {response.status_code} - {response.text}")

# =========================
# GET AVAILABILITY ZONES
# =========================
def get_azs(token):
    print("📡 Fetching Availability Zones...")
    
    # Try the user's requested endpoint first, then fallbacks
    endpoints = [
        "/janus/20180725/availability-zones", # User request
        "/janus/20180725/azs",                # Commonly used abbreviation
        "/janus/20190725/availability-zones",
        "/janus/20190725/azs"
    ]

    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        print(f"Trying endpoint: {endpoint}")

        headers = {
            **HEADERS,
            "Authorization": f"Token {token}",
            "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}" # Included from user example as fail-safe
        }

        try:
            r = requests.get(
                url,
                headers=headers,
                verify=False,
                timeout=30
            )
            
            if r.status_code == 200:
                result = r.json()
                if "data" in result:
                    # Depending on API, list might be directly in 'data' or nested in 'data["data"]'
                    data = result["data"]
                    if isinstance(data, dict) and "data" in data:
                        return data["data"]
                    elif isinstance(data, list):
                        return data
                    else:
                        return data # Fallback
                return []
            else:
                print(f"  ❌ Failed with {r.status_code}")

        except Exception as e:
            print(f"❌ Error fetching AZs from {endpoint}: {e}")
            
    return []

# =========================
# MAIN
# =========================
def main():
    try:
        # Auth flow
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
        
        # Get Data
        azs = get_azs(token)
        
        print(f"\nพบ Availability Zone ทั้งหมด: {len(azs)} รายการ\n")

        print("=== Availability Zones ===")
        for az in azs:
            print(f"- AZ Name : {az.get('name')}")
            print(f"  AZ ID   : {az.get('id')}")
            print(f"  Status  : {az.get('status')}")
            print(f"  Type    : {az.get('type')}")
            print("")
            
        # Export to JSON
        filename = "az_output.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(azs, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Data exported to {filename}")

    except Exception as e:
        print(f"\n❌ Execution Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
