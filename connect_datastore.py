#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import urllib3
import json
import csv
import os
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from datetime import datetime
from dotenv import load_dotenv

# Disable SSL warnings
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
# GET DATASTORES
# =========================
def get_datastores(token):
    print("📡 Fetching datastores...")
    
    endpoints = [
        "/janus/20190725/storages",
        "/janus/20180725/storages"
    ]

    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        print(f"Trying endpoint: {endpoint}")

        headers = {
            **HEADERS,
            "Authorization": f"Token {token}"
        }

        try:
            r = requests.get(
                url,
                headers=headers,
                verify=False
            )
            
            if r.status_code == 200:
                result = r.json()
                # Handle potential response variations
                if "data" in result and "data" in result["data"]:
                    return result["data"]["data"]
                elif "data" in result:
                    return result["data"]
                return result
            else:
                print(f"  ❌ Failed with {r.status_code}")

        except Exception as e:
            print(f"❌ Error fetching datastores from {endpoint}: {e}")
            
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
        datastores = get_datastores(token)

        print(f"\nพบ datastore ทั้งหมด: {len(datastores)} รายการ\n")

        for ds in datastores:
            total = ds.get('total_mb', 0)
            used = ds.get('used_mb', 0)
            free = total - used
            
            print("=" * 60)
            print(f"Datastore Name : {ds.get('name')}")
            print(f"Datastore ID   : {ds.get('id')}")
            print(f"Total Size MB  : {total}")
            print(f"Used Size MB   : {used}")
            print(f"Free Size MB   : {free}")
            print(f"Type           : {ds.get('type')}")
            print(f"Status         : {ds.get('status')}")
            print("=" * 60)

        # Export to JSON
        filename = "datastores_output.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(datastores, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Data exported to {filename}")

    except Exception as e:
        print(f"\n❌ Execution Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
