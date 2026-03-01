#!/usr/bin/env python3
"""Get VM storage history (last 7 days hourly) for a VM by name or vm_id and print to console."""
import requests
import sys
import os
from datetime import datetime

BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8001')
print(f"Using API_BASE_URL={BASE_URL}")
USERNAME = os.getenv('TEST_USER', 'viewer_user')
PASSWORD = os.getenv('TEST_PASS', 'Viewer@2026!')

SEARCH = 'WUH-PACS'  # Can be VM name or part of it
VM_ID_LOOKUP = '3187048674258'

def get_token(username, password):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password}, verify=False, timeout=10)
    resp.raise_for_status()
    return resp.json().get('access_token')


def find_vm_uuid(token, search=None, vm_id=None):
    headers = {'Authorization': f'Bearer {token}'}
    params = {'limit': 50}
    if search:
        params['search'] = search
    try:
        resp = requests.get(f"{BASE_URL}/vms", headers=headers, params=params, verify=False, timeout=10)
        resp.raise_for_status()
        items = resp.json().get('items', [])
        # Try to match vm_id first
        for it in items:
            if str(it.get('vm_id')) == str(vm_id) or it.get('name') == search or (search and search.lower() in it.get('name','').lower()):
                return it.get('vm_uuid'), it
        # fallback to first
        if items:
            return items[0].get('vm_uuid'), items[0]
        return None, None
    except Exception as e:
        print(f"Error finding VM: {e}")
        return None, None


def get_vm_metrics(token, vm_uuid, hours=168, interval='1h'):
    headers = {'Authorization': f'Bearer {token}'}
    params = {'hours': hours, 'interval': interval}
    resp = requests.get(f"{BASE_URL}/vms/{vm_uuid}/metrics", headers=headers, params=params, verify=False, timeout=30)
    resp.raise_for_status()
    return resp.json()


def pretty_print_metrics(metrics):
    print("\nStorage usage history (time bucket, storage_used_mb, storage_ratio):")
    for m in metrics:
        ts = m.get('collected_at')
        # ts might be ISO or datetime; ensure readable
        try:
            tstr = ts.strftime('%Y-%m-%d %H:%M') if hasattr(ts, 'strftime') else str(ts)
        except Exception:
            tstr = str(ts)
        used_mb = m.get('storage_used_mb')
        ratio = m.get('storage_ratio')
        print(f"  {tstr}  |  used: {used_mb} MB  |  ratio: {ratio:.3f})" )


if __name__ == '__main__':
    try:
        token = get_token(USERNAME, PASSWORD)
    except Exception as e:
        print(f"Failed to authenticate: {e}")
        sys.exit(1)

    vm_uuid, vm_info = find_vm_uuid(token, search=SEARCH, vm_id=VM_ID_LOOKUP)
    if not vm_uuid:
        print("VM not found")
        sys.exit(1)

    print(f"Found VM: {vm_info.get('name')} ({vm_uuid}) - vm_id: {vm_info.get('vm_id')}")

    try:
        metrics = get_vm_metrics(token, vm_uuid, hours=168, interval='1h')
    except Exception as e:
        print(f"Failed to get metrics: {e}")
        sys.exit(1)

    if not metrics:
        print('No metrics data returned')
        sys.exit(0)

    # Print details
    print(f"Returned {len(metrics)} buckets")
    for m in metrics:
        ca = m.get('collected_at')
        # format collected_at
        if isinstance(ca, str):
            ca_str = ca
        else:
            ca_str = str(ca)
        print(f"{ca_str} | storage_used_mb={m.get('storage_used_mb')} | storage_ratio={m.get('storage_ratio'):.6f} | storage_used={format(m.get('storage_used_mb')/1024/1024 if m.get('storage_used_mb') else 0, '.2f')} TB | cpu={m.get('cpu_ratio'):.2f}% | mem={m.get('memory_ratio'):.2f}%")

    print('\nDone')
