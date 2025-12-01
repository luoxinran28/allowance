#!/bin/bash

# Seed Data Loading Script for Allowance System
# Purpose: Loads test data into the database after migrations complete
# 
# Usage: ./database/setup_db_v2.sh
# 
# This script:
# 1. Checks if database is ready
# 2. Loads seed data with test users and sample organizations
# 3. Displays summary statistics
#
# Prerequisites:
# - PostgreSQL container running (docker compose up postgres)
# - Migrations completed (migrations run automatically on server startup)
# - Database 'allowance' exists

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-allowance}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="$SCRIPT_DIR/seed_data.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

log_header "ALLOWANCE SYSTEM - SEED DATA LOADER"

# Check if database connection is available
log_info "Checking database connection..."
MAX_ATTEMPTS=30
ATTEMPT=1
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if docker exec allowance-postgres pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
        log_info "✓ Database is ready"
        break
    fi
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        log_error "Database connection failed after $MAX_ATTEMPTS attempts"
        log_error "Make sure PostgreSQL is running: docker compose up -d postgres"
        exit 1
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

# Verify database exists
log_info "Verifying database '$DB_NAME' exists..."
if ! docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_error "Database '$DB_NAME' not found"
    log_error "Create it with: docker exec allowance-postgres psql -U $DB_USER -c 'CREATE DATABASE $DB_NAME;'"
    exit 1
fi

log_info "✓ Database '$DB_NAME' exists"

# Check if migrations have been applied
log_info "Checking if migrations are complete..."
MIGRATIONS_COUNT=$(docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users';" 2>/dev/null || echo "0")

if [ "$MIGRATIONS_COUNT" -eq 0 ]; then
    log_error "Migrations have not been applied yet"
    log_error "Run migrations first with: docker compose up server"
    exit 1
fi

log_info "✓ Migrations are complete"

# Load seed data
log_info "Loading test data from $SEED_FILE..."
if [ ! -f "$SEED_FILE" ]; then
    log_error "Seed file not found: $SEED_FILE"
    exit 1
fi

if docker exec -i allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$SEED_FILE" >/dev/null 2>&1; then
    log_info "✓ Seed data loaded successfully"
else
    log_warn "Seed data loading encountered issues (may be duplicate data)"
fi

# Display summary statistics
log_header "DATABASE SETUP SUMMARY"

echo ""
docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        email,
        tier,
        status,
        CASE 
            WHEN email = 'admin@allowance.test' THEN 'System Admin'
            WHEN email LIKE 'leader%@allowance.test' THEN 'Team Leader'
            WHEN email LIKE 'member%@allowance.test' THEN 'Team Member'
            WHEN email = 'free@allowance.test' THEN 'Free User'
        END as role
    FROM users 
    WHERE email LIKE '%@allowance.test%'
    ORDER BY tier DESC, email;" 2>/dev/null || true

echo ""
log_info "Organizations Created"
docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT name, org_id FROM organizations ORDER BY name;" 2>/dev/null || true

echo ""
log_info "Teams Created"
docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT g.name, o.name as organization FROM groups g
    JOIN organizations o ON g.organization_id = o.id
    ORDER BY o.name, g.name;" 2>/dev/null || true

echo ""
log_info "Product License Pools (Org Licenses)"
docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        o.name,
        p.name,
        opl.total_count,
        opl.assigned_count,
        (opl.total_count - opl.assigned_count) as available
    FROM org_product_licenses opl
    JOIN organizations o ON opl.organization_id = o.id
    JOIN products p ON opl.product_id = p.id
    ORDER BY o.name, p.name;" 2>/dev/null || true

echo ""
log_info "Database Statistics"
docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'Users' as entity,
        COUNT(*) as count
    FROM users
    UNION ALL
    SELECT 'Organizations', COUNT(*) FROM organizations
    UNION ALL
    SELECT 'Teams', COUNT(*) FROM groups
    UNION ALL
    SELECT 'Products', COUNT(*) FROM products
    UNION ALL
    SELECT 'Roles', COUNT(*) FROM roles
    UNION ALL
    SELECT 'Org Licenses', COUNT(*) FROM org_product_licenses
    UNION ALL
    SELECT 'Team Quotas', COUNT(*) FROM team_product_quotas
    ORDER BY entity;" 2>/dev/null || true

echo ""
log_header "SEED DATA LOADED SUCCESSFULLY"
echo ""
echo "Next Steps:"
echo "1. Access frontend:  http://localhost:3030"
echo "2. Access API:       http://localhost:4040"
echo ""
