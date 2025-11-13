#!/bin/bash

# Phase 3 License Approval Workflow Testing Script
# Tests the complete approval flow: request → view → approve/reject

set -e

API_URL="${API_URL:-http://localhost:4040}"
ADMIN_EMAIL="phase3-admin@test.local"
LEADER_EMAIL="phase3-leader@test.local"
USER_EMAIL="phase3-user@test.local"
PASSWORD="SecurePass123!"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

log_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if server is running
check_server() {
    log_info "Checking server health..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    if [ "$response" != "200" ]; then
        log_error "Server not responding at $API_URL/health (got $response)"
    fi
    log_success "Server is running"
}

# Register a user
register_user() {
    local email=$1
    local password=$2
    
    log_info "Registering user: $email"
    response=$(curl -s -X POST "$API_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    status=$(echo "$response" | jq -r '.success')
    if [ "$status" != "true" ]; then
        # User might already exist, try to continue
        log_info "User registration result: $(echo $response | jq -r '.error // .data.email')"
    else
        log_success "Registered $email"
    fi
}

# Activate user in database
activate_user() {
    local email=$1
    
    log_info "Activating user: $email"
    psql allowance -c "UPDATE users SET status = 'active' WHERE email = '$email'" 2>/dev/null || log_error "Failed to activate user"
    log_success "Activated $email"
}

# Assign role to user
assign_role() {
    local email=$1
    local role=$2
    
    log_info "Assigning role '$role' to $email"
    psql allowance -c "
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id 
        FROM users u, roles r 
        WHERE u.email = '$email' AND r.code = '$role'
        ON CONFLICT DO NOTHING;
    " 2>/dev/null || log_error "Failed to assign role"
    log_success "Assigned role '$role' to $email"
}

# Login user and get token
login_user() {
    local email=$1
    local password=$2
    
    log_info "Logging in as: $email"
    response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    token=$(echo "$response" | jq -r '.data.token // empty')
    if [ -z "$token" ]; then
        log_error "Failed to get token for $email"
    fi
    
    log_success "Logged in $email"
    echo "$token"
}

# Create product as admin
create_product() {
    local token=$1
    local slug=$2
    
    log_info "Creating product: $slug"
    response=$(curl -s -X POST "$API_URL/admin/products" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{
            \"product_slug\":\"$slug\",
            \"tier\":\"basic\",
            \"name\":\"Test Product - Phase 3\",
            \"description\":\"Product for Phase 3 approval workflow testing\"
        }")
    
    success=$(echo "$response" | jq -r '.success')
    if [ "$success" != "true" ]; then
        # Product might already exist
        log_info "Product creation result: $(echo $response | jq -r '.error // .data.upid')"
    else
        log_success "Created product: $slug"
    fi
}

# Create license as admin
create_license() {
    local token=$1
    local slug=$2
    
    log_info "Creating license for product: $slug"
    response=$(curl -s -X POST "$API_URL/admin/licenses" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{
            \"product_slug\":\"$slug\",
            \"tier\":\"basic\",
            \"org_id\":1,
            \"max_users\":5,
            \"expires_at\":\"2025-12-31T23:59:59Z\"
        }")
    
    license_id=$(echo "$response" | jq -r '.data.id // empty')
    if [ -z "$license_id" ]; then
        log_error "Failed to create license: $(echo $response | jq -r '.error')"
    fi
    
    log_success "Created license with ID: $license_id"
    echo "$license_id"
}

# Request license approval as user
request_approval() {
    local token=$1
    local license_id=$2
    
    log_info "User requesting license approval for license ID: $license_id"
    response=$(curl -s -X POST "$API_URL/licenses/request" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{\"license_id\":$license_id}")
    
    approval_id=$(echo "$response" | jq -r '.data.id // empty')
    if [ -z "$approval_id" ]; then
        log_error "Failed to request approval: $(echo $response | jq -r '.error')"
    fi
    
    log_success "Approval request created with ID: $approval_id"
    echo "$approval_id"
}

# Get pending approvals as team leader
get_approvals() {
    local token=$1
    
    log_info "Team leader fetching pending approvals..."
    response=$(curl -s -X GET "$API_URL/approvals?status=pending" \
        -H "Authorization: Bearer $token")
    
    count=$(echo "$response" | jq '.data | length')
    log_success "Found $count pending approvals"
    echo "$response" | jq '.data'
}

# Review approval (approve)
approve_request() {
    local token=$1
    local approval_id=$2
    
    log_info "Team leader approving approval ID: $approval_id"
    response=$(curl -s -X POST "$API_URL/approvals/$approval_id/review" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{
            \"status\":\"approved\",
            \"remarks\":\"Approved for testing purposes\"
        }")
    
    status=$(echo "$response" | jq -r '.data.status // empty')
    if [ "$status" != "approved" ]; then
        log_error "Failed to approve: $(echo $response | jq -r '.error')"
    fi
    
    log_success "Approval approved successfully"
}

# Review approval (reject)
reject_request() {
    local token=$1
    local approval_id=$2
    
    log_info "Team leader rejecting approval ID: $approval_id"
    response=$(curl -s -X POST "$API_URL/approvals/$approval_id/review" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{
            \"status\":\"rejected\",
            \"remarks\":\"Rejected for testing purposes\"
        }")
    
    status=$(echo "$response" | jq -r '.data.status // empty')
    if [ "$status" != "rejected" ]; then
        log_error "Failed to reject: $(echo $response | jq -r '.error')"
    fi
    
    log_success "Approval rejected successfully"
}

# Verify in database
verify_database() {
    log_info "Verifying approvals in database..."
    
    result=$(psql allowance -c "
        SELECT 
            la.id,
            u.email as user_email,
            l.upid,
            la.status,
            la.created_at
        FROM license_approvals la
        JOIN users u ON la.user_id = u.id
        JOIN licenses l ON la.license_id = l.id
        WHERE la.created_at > now() - interval '5 minutes'
        ORDER BY la.created_at DESC
        LIMIT 5;" 2>/dev/null)
    
    log_success "Database verification:"
    echo "$result"
}

# Main test flow
main() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        Phase 3: License Approval Workflow Test             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # 1. Check server
    check_server
    echo ""
    
    # 2. Setup: Register and prepare users
    log_info "=== SETUP PHASE ==="
    register_user "$ADMIN_EMAIL" "$PASSWORD"
    register_user "$LEADER_EMAIL" "$PASSWORD"
    register_user "$USER_EMAIL" "$PASSWORD"
    echo ""
    
    activate_user "$ADMIN_EMAIL"
    activate_user "$LEADER_EMAIL"
    activate_user "$USER_EMAIL"
    echo ""
    
    assign_role "$ADMIN_EMAIL" "admin"
    assign_role "$LEADER_EMAIL" "team_leader"
    echo ""
    
    # 3. Login users
    log_info "=== LOGIN PHASE ==="
    ADMIN_TOKEN=$(login_user "$ADMIN_EMAIL" "$PASSWORD")
    LEADER_TOKEN=$(login_user "$LEADER_EMAIL" "$PASSWORD")
    USER_TOKEN=$(login_user "$USER_EMAIL" "$PASSWORD")
    echo ""
    
    # 4. Create test data
    log_info "=== CREATE TEST DATA ==="
    PRODUCT_SLUG="phase3-test-$(date +%s)"
    create_product "$ADMIN_TOKEN" "$PRODUCT_SLUG"
    echo ""
    
    LICENSE_ID=$(create_license "$ADMIN_TOKEN" "$PRODUCT_SLUG")
    echo ""
    
    # 5. Test approval workflow
    log_info "=== APPROVAL WORKFLOW TEST ==="
    
    # 5a. User requests approval
    APPROVAL_ID=$(request_approval "$USER_TOKEN" "$LICENSE_ID")
    echo ""
    
    # 5b. Team leader views pending approvals
    get_approvals "$LEADER_TOKEN"
    echo ""
    
    # 5c. Team leader approves first request
    approve_request "$LEADER_TOKEN" "$APPROVAL_ID"
    echo ""
    
    # 5d. Create another license and test reject flow
    LICENSE_ID_2=$(create_license "$ADMIN_TOKEN" "$PRODUCT_SLUG")
    APPROVAL_ID_2=$(request_approval "$USER_TOKEN" "$LICENSE_ID_2")
    reject_request "$LEADER_TOKEN" "$APPROVAL_ID_2"
    echo ""
    
    # 6. Verify database
    log_info "=== DATABASE VERIFICATION ==="
    verify_database
    echo ""
    
    # Summary
    echo "╔════════════════════════════════════════════════════════════╗"
    echo -e "║        ${GREEN}✓ Phase 3 Tests Completed Successfully${NC}        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Summary:"
    echo "  • Admin created product: $PRODUCT_SLUG"
    echo "  • Admin created 2 licenses"
    echo "  • User requested 2 approvals"
    echo "  • Team leader approved 1 request"
    echo "  • Team leader rejected 1 request"
    echo ""
    echo "Next Steps:"
    echo "  1. Test frontend components in browser at http://localhost:3000"
    echo "  2. Verify LicenseApprovalRequest component displays correctly"
    echo "  3. Verify PendingApprovalsList shows recent approvals"
    echo "  4. Verify ApprovalReviewDialog modal opens and submits correctly"
}

# Run main function
main
