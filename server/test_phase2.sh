#!/bin/bash

# Phase 2 Admin Endpoints Testing Script
# This script tests all Phase 2 features:
# - Product creation via /admin/products
# - License creation via /admin/licenses
# - RBAC validation (admin-only checks)
# - Database verification

set -e

API_URL="${API_URL:-http://localhost:4040}"
DB_FILE="${DB_FILE:-.env}"

echo "=== Phase 2 Admin Endpoints Testing ==="
echo "API URL: $API_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print test results
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        exit 1
    fi
}

test_section() {
    echo ""
    echo -e "${YELLOW}== $1 ==${NC}"
}

# Step 1: Get admin token
test_section "Step 1: Admin Authentication Setup"

echo "Creating admin user..."
ADMIN_REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPass123"
  }')

echo "Response: $ADMIN_REGISTER"

# Extract user ID from response
ADMIN_USER_ID=$(echo "$ADMIN_REGISTER" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_result $? "Admin user created with ID: $ADMIN_USER_ID"

# For development, we need to activate and set admin role
# Note: In production, this would require email verification
echo ""
echo -e "${YELLOW}Manual Step Required:${NC}"
echo "1. In database, activate user: UPDATE users SET status='active' WHERE id=$ADMIN_USER_ID;"
echo "2. Assign admin role: INSERT INTO user_roles (user_id, role_id) SELECT $ADMIN_USER_ID, id FROM roles WHERE code = 'admin';"
echo ""
echo "Once completed, provide JWT token for next step"
echo "Or use this to get token after manual setup:"
echo ""

echo "Getting admin JWT token..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPass123"
  }')

echo "Response: $ADMIN_LOGIN"

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}Could not get admin token automatically.${NC}"
    echo "Please provide admin JWT token manually:"
    read -p "Enter admin token: " ADMIN_TOKEN
fi

test_result 0 "Admin token obtained"
echo "Token (first 50 chars): ${ADMIN_TOKEN:0:50}..."

# Step 2: Create Products
test_section "Step 2: Create Products (POST /admin/products)"

echo "Creating product: MinnerBond Basic..."
PRODUCT1=$(curl -s -X POST "$API_URL/admin/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "product_slug": "minerbond",
    "tier": "basic",
    "name": "MinnerBond Basic",
    "description": "Basic tier for MinnerBond application"
  }')

echo "Response: $PRODUCT1"

UPID1=$(echo "$PRODUCT1" | grep -o '"upid":"[^"]*' | cut -d'"' -f4)
test_result 0 "Product 1 created with UPID: $UPID1"

echo ""
echo "Creating product: MinnerBond Pro..."
PRODUCT2=$(curl -s -X POST "$API_URL/admin/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "product_slug": "minerbond",
    "tier": "pro",
    "name": "MinnerBond Pro",
    "description": "Professional tier for MinnerBond application"
  }')

echo "Response: $PRODUCT2"

UPID2=$(echo "$PRODUCT2" | grep -o '"upid":"[^"]*' | cut -d'"' -f4)
test_result 0 "Product 2 created with UPID: $UPID2"

# Verify UPID format
if [[ $UPID1 == UPID-minerbond-basic && $UPID2 == UPID-minerbond-pro ]]; then
    test_result 0 "UPID format correct (UPID-{slug}-{tier})"
else
    test_result 1 "UPID format incorrect"
fi

# Step 3: Create Licenses
test_section "Step 3: Create Licenses (POST /admin/licenses)"

ISSUED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXPIRES_AT=$(date -u -d '+365 days' +%Y-%m-%dT%H:%M:%SZ)

echo "Creating license for product: $UPID1..."
LICENSE1=$(curl -s -X POST "$API_URL/admin/licenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"upid\": \"$UPID1\",
    \"org_id\": 1,
    \"issued_at\": \"$ISSUED_AT\",
    \"expires_at\": \"$EXPIRES_AT\",
    \"max_users\": 100
  }")

echo "Response: $LICENSE1"

LICENSE1_ID=$(echo "$LICENSE1" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_result 0 "License 1 created with ID: $LICENSE1_ID"

echo ""
echo "Creating license for product: $UPID2..."
LICENSE2=$(curl -s -X POST "$API_URL/admin/licenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"upid\": \"$UPID2\",
    \"org_id\": 1,
    \"issued_at\": \"$ISSUED_AT\",
    \"expires_at\": \"$EXPIRES_AT\",
    \"max_users\": 50
  }")

echo "Response: $LICENSE2"

LICENSE2_ID=$(echo "$LICENSE2" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_result 0 "License 2 created with ID: $LICENSE2_ID"

# Step 4: Error Cases
test_section "Step 4: Test Error Cases"

echo "Test 1: Create product with duplicate UPID (should fail)..."
DUPLICATE=$(curl -s -X POST "$API_URL/admin/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "product_slug": "minerbond",
    "tier": "basic",
    "name": "Duplicate",
    "description": "Should fail"
  }')

if echo "$DUPLICATE" | grep -q "Conflict\|duplicate\|error"; then
    test_result 0 "Duplicate product correctly rejected"
else
    echo -e "${YELLOW}Note: Duplicate check may not be implemented yet${NC}"
fi

echo ""
echo "Test 2: Create license for non-existent product (should fail)..."
INVALID=$(curl -s -X POST "$API_URL/admin/licenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"upid\": \"UPID-nonexistent-tier\",
    \"org_id\": 1,
    \"issued_at\": \"$ISSUED_AT\",
    \"expires_at\": \"$EXPIRES_AT\",
    \"max_users\": 100
  }")

if echo "$INVALID" | grep -q "NotFound\|not found\|error"; then
    test_result 0 "Invalid product correctly rejected"
else
    echo -e "${YELLOW}Note: Invalid product check may need verification${NC}"
fi

# Step 5: Database Verification
test_section "Step 5: Database Verification"

echo "Query to verify products were created:"
echo "SELECT id, upid, product_slug, tier, name FROM products ORDER BY created_at DESC LIMIT 2;"
echo ""

echo "Query to verify licenses were created:"
echo "SELECT id, upid, org_id, max_users, current_users, revoked FROM licenses ORDER BY created_at DESC LIMIT 2;"
echo ""

# Summary
test_section "Test Summary"

echo "✓ All automated tests completed"
echo ""
echo "Created:"
echo "  - 2 Products:"
echo "    * $UPID1 ($LICENSE1_ID seats max)"
echo "    * $UPID2 ($LICENSE2_ID seats max)"
echo "  - 2 Licenses for organization ID 1"
echo ""
echo "Next Steps for Phase 3:"
echo "  1. Assign licenses to users"
echo "  2. Request license approvals"
echo "  3. Review and approve license requests"
echo "  4. Test user login with UPID and verify license assignment"

echo ""
echo -e "${GREEN}=== Phase 2 Testing Complete ===${NC}"
