#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import urllib3
import os
import uuid
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

SCP_IP = os.getenv('SCP_IP')
USERNAME = os.getenv('SCP_USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD')

def get_public_key():
    url = f'https://{SCP_IP}/janus/public-key'
    response = requests.get(url, verify=False, timeout=10)
    return response.json()['data']['public_key'].replace('\\n', '').strip()

def encrypt_password(password, modulus):
    password = password.encode('utf-8')
    e = int(0x10001)
    n = bytes_to_long(a2b_hex(modulus))
    rsa_key = RSA.construct((n, e))
    public_key = rsa_key.publickey()
    cipher = PKCS1_v1_5.new(public_key)
    encrypted = cipher.encrypt(password)
    return b2a_hex(encrypted).decode('utf-8')

def get_token(username, encrypted_password):
    url = f"https://{SCP_IP}/janus/authenticate"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    payload = {"auth": {"passwordCredentials": {"username": username, "password": encrypted_password}}}
    response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
    data = response.json()["data"]
    return data["access"]["token"]["id"]

def main():
    if not SCP_IP:
        print("SCP_IP not set")
        return

    print(f"Authenticating with {SCP_IP}...")
    try:
        modulus = get_public_key()
        enc_pass = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, enc_pass)
        print("Authentication successful.")
    except Exception as e:
        print(f"Auth failed: {e}")
        return

    endpoints = [
        "/janus/operation-logs",
        "/janus/20190725/operation-logs",
        "/janus/20180725/operation-logs",
        "/janus/operations",
        "/janus/20190725/operations",
        "/janus/logs",
        "/janus/api/operation-logs",
        "/janus/20190725/log/operation",
        "/janus/log/operation",
        "/janus/tasks",
        "/janus/jobs"
    ]

    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": f"aCMPAuthToken={uuid.uuid4().hex}"
    }

    print("\nProbing endpoints...")
    for ep in endpoints:
        url = f"https://{SCP_IP}{ep}"
        try:
            # We don't strictly need params to check existence, 
            # but some APIs might 400 without them which is better than 404.
            # Let's try minimal params
            params = {"page_size": 1, "operation": "delete"} 
            resp = requests.get(url, headers=headers, params=params, verify=False, timeout=5)
            
            status = resp.status_code
            print(f"[{status}] {ep}")
            
            if status == 200:
                print(f"   >>> SUCCESS! Found content at {ep}")
                print(f"   Response preview: {str(resp.json())[:200]}")
            elif status == 400:
                 print(f"   >>> POTENTIAL MATCH (400 Bad Request) - Endpoint likely exists but needs params.")
                 print(f"   Message: {resp.text[:200]}")
                 
        except Exception as e:
            print(f"[ERR] {ep}: {e}")

if __name__ == "__main__":
    main()
