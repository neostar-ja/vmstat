#!/bin/bash
# Test admin user operations

echo "==============================================="
echo "🧪 Testing Admin User Operations"
echo "==============================================="

# Login
echo "1. Logging in as admin_user..."
LOGIN_RESPONSE=$(curl -k -X POST https://10.251.150.222:3345/vmstat/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_user","password":"Admin@2026!"}' -s)

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi
echo "✅ Login successful"

# Create user
echo ""
echo "2. Creating test user..."
CREATE_RESPONSE=$(curl -k -X POST https://10.251.150.222:3345/vmstat/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_'$(date +%s)'",
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "full_name": "Test User",
    "role": "viewer"
  }' -s -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | grep -v "HTTP_CODE:")

echo "Response code: $HTTP_CODE"
if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ User created successfully"
    USER_ID=$(echo $RESPONSE_BODY | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
    echo "   User ID: $USER_ID"
    
    # Update user
    echo ""
    echo "3. Updating test user..."
    UPDATE_RESPONSE=$(curl -k -X PUT https://10.251.150.222:3345/vmstat/api/admin/users/$USER_ID \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"full_name": "Updated Test User"}' \
      -s -w "\nHTTP_CODE:%{http_code}")
    
    UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    echo "Response code: $UPDATE_HTTP_CODE"
    if [ "$UPDATE_HTTP_CODE" = "200" ]; then
        echo "✅ User updated successfully"
    else
        echo "❌ User update failed"
        echo "$UPDATE_RESPONSE" | grep -v "HTTP_CODE:"
    fi
    
    # Delete user
    echo ""
    echo "4. Deleting test user..."
    DELETE_RESPONSE=$(curl -k -X DELETE https://10.251.150.222:3345/vmstat/api/admin/users/$USER_ID \
      -H "Authorization: Bearer $TOKEN" \
      -s -w "\nHTTP_CODE:%{http_code}")
    
    DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    echo "Response code: $DELETE_HTTP_CODE"
    if [ "$DELETE_HTTP_CODE" = "204" ]; then
        echo "✅ User deleted successfully"
    else
        echo "❌ User delete failed"
        echo "$DELETE_RESPONSE" | grep -v "HTTP_CODE:"
    fi
else
    echo "❌ User creation failed"
    echo "$RESPONSE_BODY"
fi

echo ""
echo "==============================================="
echo "✅ Test completed"
echo "==============================================="
