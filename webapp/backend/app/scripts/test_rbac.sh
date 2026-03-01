#!/bin/bash
# Test RBAC System for VMStat API
# Tests all 3 users with their permissions

API_URL="https://localhost:3345/vmstat/api"
CURL_OPTS="-sk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================"
echo "🔐 RBAC System Test Suite"
echo "============================================================"
echo "API URL: $API_URL"
echo ""

# Function to login and get token
login_user() {
    local username=$1
    local password=$2
    local response=$(curl $CURL_OPTS -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}")
    
    # Extract token from response
    echo "$response" | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//;s/"$//'
}

# Function to test an endpoint
test_endpoint() {
    local token=$1
    local endpoint=$2
    local expected=$3
    
    local status=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $token" \
        "$API_URL$endpoint")
    
    if [[ "$status" -ge 200 && "$status" -lt 400 ]]; then
        actual="allowed"
    else
        actual="denied"
    fi
    
    if [[ "$actual" == "$expected" ]]; then
        echo -e "   ${GREEN}✅${NC} $endpoint: $actual (expected: $expected)"
        return 0
    else
        echo -e "   ${RED}❌${NC} $endpoint: $actual (expected: $expected)"
        return 1
    fi
}

# Test health check
echo "📡 Testing API Health..."
health=$(curl $CURL_OPTS "$API_URL/health")
if echo "$health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API is not healthy${NC}"
    exit 1
fi

echo ""
echo "============================================================"
echo "🔑 Test 1: admin_user (Admin Role)"
echo "============================================================"

ADMIN_TOKEN=$(login_user "admin_user" "Admin@2026!")
if [[ -z "$ADMIN_TOKEN" ]]; then
    echo -e "${RED}❌ Login failed for admin_user${NC}"
else
    echo -e "${GREEN}✅ Login successful for admin_user${NC}"
    
    # Get user info
    echo ""
    echo "📋 User Info:"
    curl $CURL_OPTS -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/auth/me" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20
    
    echo ""
    echo "🔍 Testing Endpoints:"
    
    admin_passed=0
    admin_total=0
    
    test_endpoint "$ADMIN_TOKEN" "/admin/users" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/admin/roles" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/admin/permissions" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/admin/settings" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/admin/database/stats" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/admin/system/health" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/admin/audit-logs" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/vms" "allowed" && ((admin_passed++)); ((admin_total++))
    test_endpoint "$ADMIN_TOKEN" "/dashboard/summary" "allowed" && ((admin_passed++)); ((admin_total++))
    
    echo ""
    echo "   📊 Admin tests: $admin_passed/$admin_total passed"
fi

echo ""
echo "============================================================"
echo "🔑 Test 2: manager_user (Manager Role)"
echo "============================================================"

MANAGER_TOKEN=$(login_user "manager_user" "Manager@2026!")
if [[ -z "$MANAGER_TOKEN" ]]; then
    echo -e "${RED}❌ Login failed for manager_user${NC}"
else
    echo -e "${GREEN}✅ Login successful for manager_user${NC}"
    
    # Get user info
    echo ""
    echo "📋 User Info:"
    curl $CURL_OPTS -H "Authorization: Bearer $MANAGER_TOKEN" "$API_URL/auth/me" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20
    
    echo ""
    echo "🔍 Testing Endpoints:"
    
    manager_passed=0
    manager_total=0
    
    # Manager should NOT have access to admin endpoints
    test_endpoint "$MANAGER_TOKEN" "/admin/users" "denied" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/admin/roles" "denied" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/admin/permissions" "denied" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/admin/settings" "denied" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/admin/database/stats" "denied" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/admin/system/health" "denied" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/admin/audit-logs" "denied" && ((manager_passed++)); ((manager_total++))
    
    # Manager should have access to VM and dashboard
    test_endpoint "$MANAGER_TOKEN" "/vms" "allowed" && ((manager_passed++)); ((manager_total++))
    test_endpoint "$MANAGER_TOKEN" "/dashboard/summary" "allowed" && ((manager_passed++)); ((manager_total++))
    
    echo ""
    echo "   📊 Manager tests: $manager_passed/$manager_total passed"
fi

echo ""
echo "============================================================"
echo "🔑 Test 3: viewer_user (Viewer Role)"
echo "============================================================"

VIEWER_TOKEN=$(login_user "viewer_user" "Viewer@2026!")
if [[ -z "$VIEWER_TOKEN" ]]; then
    echo -e "${RED}❌ Login failed for viewer_user${NC}"
else
    echo -e "${GREEN}✅ Login successful for viewer_user${NC}"
    
    # Get user info
    echo ""
    echo "📋 User Info:"
    curl $CURL_OPTS -H "Authorization: Bearer $VIEWER_TOKEN" "$API_URL/auth/me" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20
    
    echo ""
    echo "🔍 Testing Endpoints:"
    
    viewer_passed=0
    viewer_total=0
    
    # Viewer should NOT have access to admin endpoints
    test_endpoint "$VIEWER_TOKEN" "/admin/users" "denied" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/admin/roles" "denied" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/admin/permissions" "denied" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/admin/settings" "denied" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/admin/database/stats" "denied" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/admin/system/health" "denied" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/admin/audit-logs" "denied" && ((viewer_passed++)); ((viewer_total++))
    
    # Viewer should have access to VM and dashboard (read-only)
    test_endpoint "$VIEWER_TOKEN" "/vms" "allowed" && ((viewer_passed++)); ((viewer_total++))
    test_endpoint "$VIEWER_TOKEN" "/dashboard/summary" "allowed" && ((viewer_passed++)); ((viewer_total++))
    
    echo ""
    echo "   📊 Viewer tests: $viewer_passed/$viewer_total passed"
fi

echo ""
echo "============================================================"
echo "🔑 Test 4: Invalid Credentials"
echo "============================================================"

# Test wrong password
wrong_token=$(login_user "admin_user" "wrong_password")
if [[ -z "$wrong_token" ]]; then
    echo -e "${GREEN}✅ Wrong password correctly rejected${NC}"
else
    echo -e "${RED}❌ Wrong password was incorrectly accepted!${NC}"
fi

# Test non-existent user
nonexistent_token=$(login_user "nonexistent_user" "password123")
if [[ -z "$nonexistent_token" ]]; then
    echo -e "${GREEN}✅ Non-existent user correctly rejected${NC}"
else
    echo -e "${RED}❌ Non-existent user was incorrectly accepted!${NC}"
fi

echo ""
echo "============================================================"
echo "🔑 Test 5: Token Validation"
echo "============================================================"

# Test with invalid token
invalid_status=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer invalid_token_here" \
    "$API_URL/auth/me")

if [[ "$invalid_status" == "401" ]]; then
    echo -e "${GREEN}✅ Invalid token correctly rejected (401)${NC}"
else
    echo -e "${RED}❌ Invalid token not properly handled (status: $invalid_status)${NC}"
fi

# Test without token
no_token_status=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$API_URL/auth/me")
if [[ "$no_token_status" == "401" || "$no_token_status" == "403" ]]; then
    echo -e "${GREEN}✅ Missing token correctly rejected ($no_token_status)${NC}"
else
    echo -e "${RED}❌ Missing token not properly handled (status: $no_token_status)${NC}"
fi

echo ""
echo "============================================================"
echo "📊 TEST SUMMARY"
echo "============================================================"

total_passed=$((admin_passed + manager_passed + viewer_passed))
total_tests=$((admin_total + manager_total + viewer_total))

echo "   Admin tests:   $admin_passed/$admin_total"
echo "   Manager tests: $manager_passed/$manager_total"
echo "   Viewer tests:  $viewer_passed/$viewer_total"
echo "   ─────────────────────"
echo "   Total:         $total_passed/$total_tests"

if [[ "$total_passed" == "$total_tests" ]]; then
    echo ""
    echo -e "${GREEN}🎉 All RBAC tests passed!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️ Some tests failed. Check the output above.${NC}"
fi

echo ""
echo "============================================================"
echo "📋 User Credentials Summary"
echo "============================================================"
echo "   admin_user   / Admin@2026!   (Full admin access)"
echo "   manager_user / Manager@2026! (VM management access)"
echo "   viewer_user  / Viewer@2026!  (Read-only access)"
echo ""
