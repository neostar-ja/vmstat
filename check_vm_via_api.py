#!/usr/bin/env python3
"""
Check VM deletion status via API
"""
import requests
import json
import urllib3
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_BASE = "https://10.251.150.222:3345/vmstat/api"
VM_UUID = "cb1745e7-1044-45d5-b6ee-51c0cbc5f455"

# Login first to get token
print("🔐 Logging in...")
login_response = requests.post(
    f"{API_BASE}/auth/login",
    json={"username": "admin", "password": "admin123"},
    verify=False
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
print(f"Login response: {json.dumps(login_data, indent=2)}")

# Try different response formats
if "data" in login_data and "token" in login_data["data"]:
    token = login_data["data"]["token"]
elif "access_token" in login_data:
    token = login_data["access_token"]
elif "token" in login_data:
    token = login_data["token"]
else:
    print(f"❌ Cannot find token in response")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

print(f"✅ Logged in successfully\n")

# Get VM detail
print("="*80)
print("🔍 CHECKING VM DELETION STATUS")
print("="*80)

print(f"\n📌 Fetching VM: {VM_UUID}")

try:
    response = requests.get(
        f"{API_BASE}/vms/{VM_UUID}",
        headers=headers,
        verify=False
    )
    
    if response.status_code == 404:
        print(f"\n❌ VM not found in system")
        exit(0)
    elif response.status_code != 200:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)
        exit(1)
    
    # Try different response formats
    vm_data = response.json()
    if "data" in vm_data:
        vm = vm_data["data"]
    else:
        vm = vm_data
    
    print(f"\n📋 VM Information:")
    print(f"   Name:          {vm.get('name', 'N/A')}")
    print(f"   UUID:          {vm.get('vm_uuid', 'N/A')}")
    print(f"   Host:          {vm.get('host_name', 'N/A')}")
    print(f"   Group:         {vm.get('group_name', 'N/A')}")
    print(f"   Power State:   {vm.get('power_state', 'N/A')}")
    print(f"   Status:        {vm.get('status', 'N/A')}")
    
    print(f"\n⏱️  Timeline:")
    if vm.get('first_seen_at'):
        print(f"   First Seen:    {vm['first_seen_at']}")
    if vm.get('last_seen_at'):
        print(f"   Last Seen:     {vm['last_seen_at']}")
    if vm.get('last_metrics_at'):
        print(f"   Last Metrics:  {vm['last_metrics_at']}")
    
    print(f"\n🗑️  Deletion Status:")
    is_deleted = vm.get('is_deleted', False)
    
    if is_deleted:
        print(f"   ⚠️  STATUS: ❗ DELETED FROM SANGFOR SCP")
        if vm.get('deleted_at'):
            print(f"   Deleted At:    {vm['deleted_at']}")
            # Calculate time since deletion
            deleted_at = datetime.fromisoformat(vm['deleted_at'].replace('Z', '+00:00'))
            now = datetime.now(deleted_at.tzinfo)
            delta = now - deleted_at
            hours = delta.total_seconds() / 3600
            print(f"   Time Since:    {hours:.1f} hours ago ({delta.days} days)")
    else:
        print(f"   ✅ STATUS: ACTIVE IN DATABASE")
        print(f"   This VM is currently being tracked")
    
    # Check recycle bin
    print(f"\n♻️  Checking Recycle Bin...")
    recycle_response = requests.get(
        f"{API_BASE}/vms/recycle-bin",
        headers=headers,
        params={"search": vm.get('name', '')},
        verify=False
    )
    
    if recycle_response.status_code == 200:
        recycle_data = recycle_response.json()["data"]
        if recycle_data['total'] > 0:
            print(f"   ⚠️  Found in Recycle Bin ({recycle_data['total']} items)")
        else:
            print(f"   ✅ Not in Recycle Bin")
    
    print("\n" + "="*80)
    
    # Recommendations
    print("\n💡 RECOMMENDATIONS:\n")
    
    if is_deleted:
        print("""   ⚠️  This VM has been DELETED from Sangfor SCP source!
   
   What this means:
   • VM no longer exists in Sangfor SCP API
   • Was automatically detected during sync process
   • Data is preserved in VMStat database
   
   Actions available:
   
   1. 🔍 VERIFY in Sangfor Console:
      - Login to Sangfor SCP web interface
      - Check if VM really doesn't exist
      - Confirm it wasn't just powered off
   
   2. ♻️  RESTORE (if mistake):
      - Go to: https://10.251.150.222:3345/vmstat/admin/settings
      - Click "Recycle Bin" tab
      - Find this VM and click "Restore"
      - ⚠️  Will be deleted again if not in SCP during next sync
   
   3. 🗑️  DELETE PERMANENTLY:
      - Same location as restore
      - Click "Delete Permanently" button
      - ⚠️  This removes ALL data from database (cannot undo!)
      - Removes: VM record, metrics history, disk config, network config
   
   4. 📊 VIEW HISTORICAL DATA:
      - Historical metrics still available
      - Can review performance before deletion
      - Access via VM detail page
        """)
    else:
        print("""   ✅ This VM is ACTIVE and being monitored
   
   How deletion detection works:
   
   1. 🔄 Automatic Detection:
      • Sync runs every 5 minutes (configurable)
      • Fetches complete VM list from Sangfor SCP API
      • Compares with database records
      • Marks missing VMs as deleted
   
   2. 🏷️  Visual Indicators:
      • Red "DELETED" badge appears automatically
      • Visible in both card and table views
      • Clear visual distinction from active VMs
   
   3. ♻️  Recycle Bin Management:
      • Deleted VMs kept for safety
      • Admin can restore or permanently delete
      • Prevents accidental data loss
   
   4. 📈 Data Retention:
      • All metrics history preserved
      • Review performance before deletion
      • Audit trail maintained
        """)
    
    print("="*80 + "\n")
    
    # Show raw data option
    print("📄 For detailed technical data, use:")
    print(f"   curl -k -H 'Authorization: Bearer {token}' '{API_BASE}/vms/{VM_UUID}/raw'\n")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
