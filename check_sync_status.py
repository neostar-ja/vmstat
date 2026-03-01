#!/usr/bin/env python3
"""
Check Sync Service Status
"""
import requests
import json
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

BASE_URL = "https://10.251.150.222:3345/vmstat/api"

# Login
print("🔐 Logging in...")
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"username": "admin", "password": "admin123"},
    verify=False,
    timeout=10
)

if response.status_code != 200:
    print(f"❌ Login failed: {response.status_code}")
    exit(1)

token_data = response.json()
if "access_token" in token_data:
    token = token_data["access_token"]
elif "data" in token_data and "token" in token_data["data"]:
    token = token_data["data"]["token"]
elif "token" in token_data:
    token = token_data["token"]
else:
    print("❌ Cannot find token in response")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

print("✅ Logged in\n")

# Check sync status
print("="*80)
print("🔄 SYNC SERVICE STATUS")
print("="*80)

response = requests.get(f"{BASE_URL}/admin/sync/status", headers=headers, verify=False, timeout=10)

if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, indent=2))
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

print("\n" + "="*80)

# Check latest VMs to see update pattern
print("\n🔍 CHECKING LATEST VM UPDATES")
print("="*80)

response = requests.get(
    f"{BASE_URL}/vms",
    headers=headers,
    verify=False,
    params={"page": 1, "page_size": 5, "sort_by": "last_seen_at", "sort_order": "desc"},
    timeout=10
)

if response.status_code == 200:
    data = response.json()
    vms = data.get("items", [])
    
    print(f"\nTotal VMs in system: {data.get('total', 0)}")
    print(f"\nLast 5 updated VMs:")
    print("-" * 80)
    
    for vm in vms[:5]:
        print(f"  • {vm.get('name', 'N/A'):<30} | Last Seen: {vm.get('last_seen_at', 'N/A')}")
    
print("\n" + "="*80)

# Trigger manual sync
print("\n💡 You can manually trigger sync with:")
print(f"   curl -k -X POST -H 'Authorization: Bearer {token[:50]}...' \\")
print(f"        '{BASE_URL}/admin/sync/trigger'")
