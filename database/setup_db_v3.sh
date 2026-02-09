#!/bin/bash

# Database Setup Script v3 for Allowance System
# Purpose: Reset database, run migrations, and load seed data
# 
# Usage: bash setup_db_v3.sh
# 
# This script:
# 1. Stops all Docker services
# 2. Clears PostgreSQL volume
# 3. Starts only PostgreSQL
# 4. Starts server to run migrations
# 5. Waits for migrations to complete
# 6. Loads seed data
# 7. Displays database summary
#
# Prerequisites:
# - Docker and Docker Compose installed
# - Running from project root directory

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

# Determine which compose command to use
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

log_header "ALLOWANCE SYSTEM - DATABASE SETUP v3"

# Step 1: Stop all services
log_info "Step 1/6: Stopping all services..."
$COMPOSE_CMD down -v 2>/dev/null || true
sleep 2

# Step 2: Prune unused volumes
log_info "Step 2/6: Pruning unused volumes..."
docker volume prune -f > /dev/null 2>&1 || true
sleep 1

# Step 3: Start PostgreSQL only
log_info "Step 3/6: Starting PostgreSQL..."
$COMPOSE_CMD up -d postgres
sleep 2

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker exec allowance-postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_info "✓ PostgreSQL is ready"
        break
    fi
    if [ $attempt -eq $max_attempts ]; then
        log_error "PostgreSQL failed to start after $max_attempts attempts"
        $COMPOSE_CMD down -v
        exit 1
    fi
    sleep 1
    ((attempt++))
done

# Step 4: Start server to run migrations
log_info "Step 4/6: Starting server to run migrations..."
$COMPOSE_CMD up -d --build server
sleep 3

# Wait for migrations to complete (by checking if tables exist)
log_info "Waiting for migrations to complete..."
max_attempts=60
attempt=1
while [ $attempt -le $max_attempts ]; do
    # Check if users table exists and has the new columns
    result=$(docker exec allowance-postgres psql -U postgres -d allowance -t -c \
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='tier';" 2>/dev/null || echo "0")
    
    # Trim whitespace from result
    result=$(echo "$result" | xargs)
    
    if [ "$result" = "1" ]; then
        log_info "✓ Migrations completed"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Migrations failed to complete after $max_attempts attempts"
        log_error "Check server logs: $COMPOSE_CMD logs server"
        exit 1
    fi
    
    sleep 1
    ((attempt++))
done

# Step 5: Load seed data
log_info "Step 5/6: Loading seed data..."
if [ ! -f "$SEED_FILE" ]; then
    log_error "Seed file not found: $SEED_FILE"
    exit 1
fi

if docker exec -i allowance-postgres psql -U postgres -d allowance < "$SEED_FILE" > /dev/null 2>&1; then
    log_info "✓ Seed data loaded successfully"
else
    log_warn "Seed data loading encountered issues (may contain expected warnings for duplicate data)"
fi

sleep 1

# Step 6: Display summary
log_info "Step 6/6: Database setup complete"
sleep 1

log_header "DATABASE SUMMARY"

echo ""
log_info "Test Users:"
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
    "SELECT email, tier, status FROM users WHERE email LIKE '%@test.com' ORDER BY tier, email;" 2>/dev/null || echo "  (no users found)"

echo ""
log_info "Organizations:"
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
    "SELECT id, name FROM organizations ORDER BY id;" 2>/dev/null || echo "  (no organizations found)"

echo ""
log_info "Teams:"
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
    "SELECT id, name FROM teams ORDER BY id;" 2>/dev/null || echo "  (no teams found)"

echo ""
log_info "Products:"
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
    "SELECT upid, name FROM products ORDER BY upid;" 2>/dev/null || echo "  (no products found)"

echo ""
log_header "SETUP COMPLETE"
echo ""
echo "Database is ready for development!"
echo "To start all services (with auto-reload): bash docker-run.sh"
echo ""
