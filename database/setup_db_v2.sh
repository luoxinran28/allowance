#!/bin/bash

# ⚠️ DEPRECATED: This script is no longer used.
# Migration management has been moved to Rust sqlx::migrate!()
# 
# To rebuild the database:
# 1. docker-compose down
# 2. docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS allowance;"
# 3. docker-compose exec postgres psql -U postgres -c "CREATE DATABASE allowance;"
# 4. docker-compose up -d  # sqlx::migrate!() will run automatically
# 5. docker-compose exec -T postgres psql -U postgres -d allowance < database/seed_data.sql

exit 1  # Prevent accidental execution

# Database Setup Script for Allowance Authorization System
# This script applies all migrations and loads test data into PostgreSQL

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-allowance}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
SEED_FILE="$SCRIPT_DIR/seed_data.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Check if database exists
log_info "Checking database connection..."
if ! docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
    log_warn "Database '$DB_NAME' does not exist. Creating it..."
    docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    log_info "Database created successfully."
fi

# Apply migrations in order
log_info "Applying database migrations..."
MIGRATION_FILES=(
    "001_initial_schema.sql"
    "002_add_license_table.sql"
    "003_add_payment_tables.sql"
    "004_add_stripe_integration.sql"
    "005_add_batch_license_tracking.sql"
    "006_optimize_queries.sql"
    "007_add_upid_support.sql"
    "008_fix_enum_types.sql"
    "009_refactor_product_id_to_upid.sql"
    "010_add_org_product_licenses.sql"
)

for migration_file in "${MIGRATION_FILES[@]}"; do
    migration_path="$MIGRATIONS_DIR/$migration_file"
    
    if [ ! -f "$migration_path" ]; then
        log_error "Migration file not found: $migration_path"
        exit 1
    fi
    
    log_info "Applying migration: $migration_file"
    docker exec -i allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$migration_path" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_info "✓ $migration_file applied successfully"
    else
        log_error "Failed to apply migration: $migration_file"
        exit 1
    fi
done

# Load seed data
log_info "Loading test data..."
if [ -f "$SEED_FILE" ]; then
    docker exec -i allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$SEED_FILE" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_info "✓ Seed data loaded successfully"
    else
        log_warn "Seed data loading completed with warnings (may be due to duplicate data)"
    fi
else
    log_warn "Seed file not found: $SEED_FILE"
fi

# Verify setup
log_info "Verifying database setup..."
RESULT=$(docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') as table_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM products) as product_count,
        (SELECT COUNT(*) FROM roles) as role_count;
")

log_info "Database setup complete!"
echo ""
echo "Database Statistics:"
echo "$RESULT"
echo ""
log_info "Test user credentials (password: TestPass123):"
docker exec allowance-postgres psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT email, tier, status FROM users 
    WHERE email LIKE '%@test.com' 
    ORDER BY tier DESC, email 
    LIMIT 5;
"

log_info "Setup completed successfully!"
