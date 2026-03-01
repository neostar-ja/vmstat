#!/usr/bin/env python3
"""
Test script for Metrics API endpoints

ทดสอบ:
1. Metrics API - Historical data for graphs
2. Real-time VM API - Live data from Sangfor
3. Sync Settings API - Metrics retention settings
"""
import requests
import json
import sys
from datetime import datetime

# Configuration
# BASE_URL = "https://vmstat.sangfor.trueidc.com/vmstat/api"
BASE_URL = "http://localhost:8001"

# Test users
TEST_USERS = {
    "viewer": {"username": "viewer_user", "password": "Viewer@2026!"},
    "operator": {"username": "operator_user", "password": "Operator@2026!"},
    "admin": {"username": "admin_user", "password": "Admin@2026!"}
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_result(name: str, success: bool, message: str = ""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if success else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"  {status} {name}")
    if message:
        print(f"         {message}")

def get_token(username: str, password: str) -> str:
    """Get JWT token for authentication"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": username, "password": password},
            verify=False,
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    except Exception as e:
        print(f"  {Colors.RED}Login error: {e}{Colors.END}")
        return None

def test_metrics_api(token: str):
    """Test Metrics API endpoints"""
    print(f"\n{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BLUE}📊 Testing Metrics API (Historical Data for Graphs){Colors.END}")
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    results = []
    
    # 1. Get Retention Info
    print(f"\n{Colors.YELLOW}1. GET /metrics/retention-info{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/metrics/retention-info", headers=headers, verify=False, timeout=10)
        success = resp.status_code == 200
        results.append(success)
        print_result("Retention Info", success, f"Status: {resp.status_code}")
        if success:
            data = resp.json()
            print(f"         Total metrics: {data.get('total_metrics', 0)}")
            print(f"         VMs with metrics: {data.get('vms_with_metrics', 0)}")
    except Exception as e:
        results.append(False)
        print_result("Retention Info", False, str(e))
    
    # 2. Get System Summary
    print(f"\n{Colors.YELLOW}2. GET /metrics/summary{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/metrics/summary", headers=headers, verify=False, timeout=10)
        success = resp.status_code == 200
        results.append(success)
        print_result("System Summary", success, f"Status: {resp.status_code}")
        if success:
            data = resp.json()
            print(f"         Total VMs: {data.get('total_vms', 0)}")
            print(f"         Active VMs: {data.get('active_vms', 0)}")
    except Exception as e:
        results.append(False)
        print_result("System Summary", False, str(e))
    
    # 3. Get Top Consumers
    print(f"\n{Colors.YELLOW}3. GET /metrics/top-consumers{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/metrics/top-consumers", headers=headers, verify=False, timeout=10)
        success = resp.status_code == 200
        results.append(success)
        print_result("Top Consumers", success, f"Status: {resp.status_code}")
        if success:
            data = resp.json()
            for key in ['by_cpu', 'by_memory', 'by_storage']:
                count = len(data.get(key, []))
                print(f"         {key}: {count} VMs")
    except Exception as e:
        results.append(False)
        print_result("Top Consumers", False, str(e))
    
    # Get a VM UUID for testing
    print(f"\n{Colors.YELLOW}4. Getting sample VM UUID...{Colors.END}")
    sample_uuid = None
    try:
        resp = requests.get(f"{BASE_URL}/vms?limit=1", headers=headers, verify=False, timeout=10)
        if resp.status_code == 200:
            vms = resp.json().get('data', [])
            if vms:
                sample_uuid = vms[0].get('vm_uuid')
                print(f"         Found VM: {vms[0].get('name')} ({sample_uuid[:8]}...)")
    except Exception as e:
        print(f"         {Colors.RED}Failed: {e}{Colors.END}")
    
    if sample_uuid:
        # 5. Get VM Historical Metrics
        print(f"\n{Colors.YELLOW}5. GET /metrics/vm/{{uuid}}/history (1 hour){Colors.END}")
        try:
            params = {"time_range": "1h", "interval": "5m"}
            resp = requests.get(f"{BASE_URL}/metrics/vm/{sample_uuid}/history", 
                              headers=headers, params=params, verify=False, timeout=10)
            success = resp.status_code == 200
            results.append(success)
            print_result("VM Historical Metrics", success, f"Status: {resp.status_code}")
            if success:
                data = resp.json()
                print(f"         Time range: {data.get('time_range')}")
                print(f"         Interval: {data.get('interval')}")
                print(f"         Data points: {len(data.get('data', []))}")
        except Exception as e:
            results.append(False)
            print_result("VM Historical Metrics", False, str(e))
        
        # 6. Get VM Latest Metrics
        print(f"\n{Colors.YELLOW}6. GET /metrics/vm/{{uuid}}/latest{Colors.END}")
        try:
            resp = requests.get(f"{BASE_URL}/metrics/vm/{sample_uuid}/latest", 
                              headers=headers, verify=False, timeout=10)
            success = resp.status_code == 200
            results.append(success)
            print_result("VM Latest Metrics", success, f"Status: {resp.status_code}")
            if success:
                data = resp.json()
                if data:
                    print(f"         Power State: {data.get('power_state')}")
                    print(f"         CPU: {data.get('cpu_percent', 0):.1f}%")
                    print(f"         Memory: {data.get('memory_percent', 0):.1f}%")
        except Exception as e:
            results.append(False)
            print_result("VM Latest Metrics", False, str(e))
    
    return results


def test_realtime_api(token: str):
    """Test Real-time VM API endpoints"""
    print(f"\n{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BLUE}🔴 Testing Real-time VM API (Live Data){Colors.END}")
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    results = []
    
    # Get a VM UUID
    print(f"\n{Colors.YELLOW}Getting sample VM UUID...{Colors.END}")
    sample_uuid = None
    try:
        resp = requests.get(f"{BASE_URL}/vms?limit=1", headers=headers, verify=False, timeout=10)
        if resp.status_code == 200:
            vms = resp.json().get('data', [])
            if vms:
                sample_uuid = vms[0].get('vm_uuid')
                print(f"  Found VM: {vms[0].get('name')} ({sample_uuid[:8]}...)")
    except Exception as e:
        print(f"  {Colors.RED}Failed: {e}{Colors.END}")
    
    if sample_uuid:
        # 1. Get Real-time VM Data
        print(f"\n{Colors.YELLOW}1. GET /vms/{{uuid}}/realtime{Colors.END}")
        try:
            resp = requests.get(f"{BASE_URL}/vms/{sample_uuid}/realtime", 
                              headers=headers, verify=False, timeout=20)
            success = resp.status_code == 200
            results.append(success)
            print_result("Real-time VM Data", success, f"Status: {resp.status_code}")
            if success:
                data = resp.json()
                print(f"         Source: {data.get('source', 'unknown')}")
                print(f"         Power State: {data.get('power_state')}")
                cpu = data.get('cpu', {})
                mem = data.get('memory', {})
                print(f"         CPU: {cpu.get('percent', 0):.1f}%")
                print(f"         Memory: {mem.get('percent', 0):.1f}%")
        except Exception as e:
            results.append(False)
            print_result("Real-time VM Data", False, str(e))
        
        # 2. Compare Real-time vs Cached
        print(f"\n{Colors.YELLOW}2. GET /vms/{{uuid}}/compare{Colors.END}")
        try:
            resp = requests.get(f"{BASE_URL}/vms/{sample_uuid}/compare", 
                              headers=headers, verify=False, timeout=20)
            success = resp.status_code == 200
            results.append(success)
            print_result("Compare Real-time vs Cached", success, f"Status: {resp.status_code}")
            if success:
                data = resp.json()
                comp = data.get('comparison', {})
                print(f"         Time diff: {comp.get('time_difference_seconds', 0):.0f}s")
                print(f"         CPU diff: {comp.get('cpu_diff', 0):.1f}%")
                print(f"         Memory diff: {comp.get('memory_diff', 0):.1f}%")
        except Exception as e:
            results.append(False)
            print_result("Compare Real-time vs Cached", False, str(e))
    
    return results


def test_sync_settings(token: str):
    """Test Sync Settings API (Admin only)"""
    print(f"\n{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BLUE}⚙️ Testing Sync Settings API (Admin Only){Colors.END}")
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    results = []
    
    # 1. Get Sync Status
    print(f"\n{Colors.YELLOW}1. GET /sync/status{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/sync/status", headers=headers, verify=False, timeout=10)
        success = resp.status_code == 200
        results.append(success)
        print_result("Sync Status", success, f"Status: {resp.status_code}")
        if success:
            data = resp.json().get('data', {})
            print(f"         Scheduler: {'Active' if data.get('scheduler_active') else 'Inactive'}")
            print(f"         Last sync: {data.get('last_sync_at', 'Never')}")
    except Exception as e:
        results.append(False)
        print_result("Sync Status", False, str(e))
    
    # 2. Get Sync Stats
    print(f"\n{Colors.YELLOW}2. GET /sync/stats{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/sync/stats", headers=headers, verify=False, timeout=10)
        success = resp.status_code == 200
        results.append(success)
        print_result("Sync Stats", success, f"Status: {resp.status_code}")
        if success:
            data = resp.json().get('data', {})
            print(f"         Total VMs: {data.get('total_vms', 0)}")
            print(f"         Total Metrics: {data.get('total_metrics', 0)}")
    except Exception as e:
        results.append(False)
        print_result("Sync Stats", False, str(e))
    
    # 3. Get Metrics Settings
    print(f"\n{Colors.YELLOW}3. GET /sync/metrics-settings{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/sync/metrics-settings", headers=headers, verify=False, timeout=10)
        success = resp.status_code == 200
        results.append(success)
        print_result("Metrics Settings", success, f"Status: {resp.status_code}")
        if success:
            data = resp.json().get('data', {})
            print(f"         Collect metrics: {data.get('collect_metrics', True)}")
            print(f"         Interval: {data.get('collection_interval_seconds', 60)}s")
            print(f"         Raw retention: {data.get('retain_raw_days', 7)} days")
            print(f"         Daily retention: {data.get('retain_daily_days', 365)} days")
    except Exception as e:
        results.append(False)
        print_result("Metrics Settings", False, str(e))
    
    return results


def main():
    """Run all tests"""
    import urllib3
    urllib3.disable_warnings()
    
    print(f"\n{Colors.BLUE}╔═══════════════════════════════════════════════════════════╗{Colors.END}")
    print(f"{Colors.BLUE}║     Sangfor VMStat - Metrics API Test Suite               ║{Colors.END}")
    print(f"{Colors.BLUE}╚═══════════════════════════════════════════════════════════╝{Colors.END}")
    print(f"\nBase URL: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    all_results = []
    
    # Login as admin
    print(f"\n{Colors.YELLOW}🔐 Logging in as admin...{Colors.END}")
    admin_creds = TEST_USERS["admin"]
    token = get_token(admin_creds["username"], admin_creds["password"])
    
    if not token:
        print(f"{Colors.RED}❌ Failed to login as admin!{Colors.END}")
        sys.exit(1)
    
    print(f"{Colors.GREEN}✅ Logged in successfully{Colors.END}")
    
    # Run tests
    all_results.extend(test_metrics_api(token))
    all_results.extend(test_realtime_api(token))
    all_results.extend(test_sync_settings(token))
    
    # Summary
    passed = sum(1 for r in all_results if r)
    total = len(all_results)
    
    print(f"\n{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.BLUE}📋 Test Summary{Colors.END}")
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.END}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}✅ All tests passed: {passed}/{total}{Colors.END}\n")
    else:
        print(f"\n{Colors.YELLOW}⚠️ Tests passed: {passed}/{total}{Colors.END}")
        print(f"{Colors.RED}   Failed: {total - passed}{Colors.END}\n")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
