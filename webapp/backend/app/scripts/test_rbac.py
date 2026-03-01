"""
Test RBAC System - Verify login and permissions for all 3 users
"""
import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

# API Base URL - adjust if needed
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/vmstat/api")

# Test users with their expected permissions
TEST_USERS = [
    {
        "username": "admin_user",
        "password": "Admin@2026!",
        "role": "admin",
        "expected_access": {
            "/admin/users": True,
            "/admin/roles": True,
            "/admin/permissions": True,
            "/admin/settings": True,
            "/admin/database/stats": True,
            "/admin/system/health": True,
            "/admin/audit-logs": True,
            "/vms": True,
            "/dashboard/summary": True,
        }
    },
    {
        "username": "manager_user",
        "password": "Manager@2026!",
        "role": "manager",
        "expected_access": {
            "/admin/users": False,  # Managers cannot access user management
            "/admin/roles": False,
            "/admin/permissions": False,
            "/admin/settings": False,
            "/admin/database/stats": False,
            "/admin/system/health": False,
            "/admin/audit-logs": False,
            "/vms": True,
            "/dashboard/summary": True,
        }
    },
    {
        "username": "viewer_user",
        "password": "Viewer@2026!",
        "role": "viewer",
        "expected_access": {
            "/admin/users": False,
            "/admin/roles": False,
            "/admin/permissions": False,
            "/admin/settings": False,
            "/admin/database/stats": False,
            "/admin/system/health": False,
            "/admin/audit-logs": False,
            "/vms": True,
            "/dashboard/summary": True,
        }
    },
]


def login(username: str, password: str) -> dict:
    """Attempt to login and return token info"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            return {"success": True, "token": response.json()["access_token"]}
        else:
            return {"success": False, "error": response.json().get("detail", "Unknown error")}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}


def test_endpoint(endpoint: str, token: str) -> bool:
    """Test if an endpoint is accessible with the given token"""
    try:
        response = requests.get(
            f"{API_BASE_URL}{endpoint}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        # 200-299 means success, 403 means forbidden
        return response.status_code < 400
    except requests.exceptions.RequestException:
        return False


def get_user_permissions(token: str) -> dict:
    """Get the user's permissions from the API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/admin/my-permissions",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        return {}
    except requests.exceptions.RequestException:
        return {}


def test_user(user: dict) -> dict:
    """Test a single user's login and permissions"""
    print(f"\n{'='*60}")
    print(f"Testing User: {user['username']} (Role: {user['role']})")
    print("="*60)
    
    results = {
        "username": user["username"],
        "role": user["role"],
        "login_success": False,
        "endpoints": {},
        "permissions": [],
        "errors": []
    }
    
    # Test login
    login_result = login(user["username"], user["password"])
    if not login_result["success"]:
        print(f"❌ Login FAILED: {login_result.get('error', 'Unknown error')}")
        results["errors"].append(f"Login failed: {login_result.get('error')}")
        return results
    
    print(f"✅ Login SUCCESS")
    results["login_success"] = True
    token = login_result["token"]
    
    # Get permissions
    permissions_data = get_user_permissions(token)
    if permissions_data:
        results["permissions"] = permissions_data.get("permissions", [])
        print(f"📋 Role: {permissions_data.get('role_display_name', user['role'])}")
        print(f"🔑 Permissions: {len(results['permissions'])}")
    
    # Test endpoints
    print("\n📡 Testing Endpoints:")
    all_correct = True
    
    for endpoint, expected_access in user["expected_access"].items():
        actual_access = test_endpoint(endpoint, token)
        results["endpoints"][endpoint] = {
            "expected": expected_access,
            "actual": actual_access,
            "correct": actual_access == expected_access
        }
        
        if actual_access == expected_access:
            status_icon = "✅"
        else:
            status_icon = "❌"
            all_correct = False
            results["errors"].append(f"{endpoint}: expected {expected_access}, got {actual_access}")
        
        access_icon = "🔓" if actual_access else "🔒"
        print(f"   {status_icon} {endpoint}: {access_icon} {'Allowed' if actual_access else 'Denied'}")
    
    if all_correct:
        print(f"\n✅ All endpoint tests PASSED for {user['username']}")
    else:
        print(f"\n⚠️ Some endpoint tests FAILED for {user['username']}")
    
    return results


def test_invalid_user():
    """Test that invalid credentials are rejected"""
    print(f"\n{'='*60}")
    print("Testing Invalid Credentials")
    print("="*60)
    
    # Test wrong password
    result = login("admin_user", "wrong_password")
    if not result["success"]:
        print("✅ Wrong password correctly rejected")
    else:
        print("❌ Wrong password was incorrectly accepted!")
    
    # Test non-existent user
    result = login("nonexistent_user", "password123")
    if not result["success"]:
        print("✅ Non-existent user correctly rejected")
    else:
        print("❌ Non-existent user was incorrectly accepted!")


def test_token_validation():
    """Test token validation"""
    print(f"\n{'='*60}")
    print("Testing Token Validation")
    print("="*60)
    
    # Test with invalid token
    try:
        response = requests.get(
            f"{API_BASE_URL}/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"},
            timeout=10
        )
        if response.status_code == 401:
            print("✅ Invalid token correctly rejected")
        else:
            print(f"❌ Invalid token not properly handled (status: {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Could not test: {e}")
    
    # Test without token
    try:
        response = requests.get(
            f"{API_BASE_URL}/auth/me",
            timeout=10
        )
        if response.status_code in [401, 403]:
            print("✅ Missing token correctly rejected")
        else:
            print(f"❌ Missing token not properly handled (status: {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Could not test: {e}")


def main():
    """Run all RBAC tests"""
    print("="*60)
    print("🔐 RBAC System Test Suite")
    print("="*60)
    print(f"API Base URL: {API_BASE_URL}")
    
    # Check API is running
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API is running")
        else:
            print("❌ API health check failed")
            return
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to API: {e}")
        print("\n⚠️ Make sure the API server is running!")
        print("   Run: cd webapp/backend && uvicorn app.main:app --reload")
        return
    
    # Test each user
    all_results = []
    for user in TEST_USERS:
        result = test_user(user)
        all_results.append(result)
    
    # Test invalid credentials
    test_invalid_user()
    
    # Test token validation
    test_token_validation()
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print("="*60)
    
    total_tests = 0
    passed_tests = 0
    
    for result in all_results:
        user_tests = len(result["endpoints"])
        user_passed = sum(1 for e in result["endpoints"].values() if e["correct"])
        total_tests += user_tests + 1  # +1 for login
        passed_tests += user_passed + (1 if result["login_success"] else 0)
        
        status = "✅" if not result["errors"] else "❌"
        print(f"{status} {result['username']} ({result['role']}): {user_passed}/{user_tests} endpoints")
        
        if result["errors"]:
            for error in result["errors"]:
                print(f"   ⚠️ {error}")
    
    print(f"\n📈 Overall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All RBAC tests passed!")
    else:
        print(f"\n⚠️ {total_tests - passed_tests} tests failed")


if __name__ == "__main__":
    main()
