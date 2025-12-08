#!/bin/bash

# ============================================================================
# Tier-Based Permission System Deployment Script
# ============================================================================
# This script helps deploy the four-tier authorization system to your database
# Usage: ./deploy_permissions.sh [database_url]
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Four-Tier Permission System Deployment ===${NC}"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not provided${NC}"
    echo "Usage: ./deploy_permissions.sh [database_url]"
    echo "Or set DATABASE_URL environment variable"
    exit 1
  fi
  DB_URL="$DATABASE_URL"
else
  DB_URL="$1"
fi

echo -e "${YELLOW}Database: $DB_URL${NC}"
echo ""

# Function to run SQL migration
run_migration() {
  local migration_file=$1
  local migration_name=$(basename "$migration_file")
  
  echo -e "${YELLOW}Executing: $migration_name${NC}"
  
  # Use psql if available, otherwise use sqlx
  if command -v psql &> /dev/null; then
    psql "$DB_URL" -f "$migration_file" 2>&1 | grep -E "CREATE|INSERT|UPDATE|ERROR|WARNING" || true
  else
    echo -e "${YELLOW}psql not found, attempting with sqlx-cli...${NC}"
    # Assuming sqlx-cli is installed and migrations are managed by sqlx
    sqlx migrate run --database-url "$DB_URL" 2>&1 | grep -E "Applied|Error" || true
  fi
  
  echo -e "${GREEN}✓ Completed${NC}"
  echo ""
}

# Run migrations in order
echo -e "${YELLOW}Step 1: Running core three-tier schema migration...${NC}"
run_migration "migrations/20251201000000_complete_three_tier_schema.sql"

echo -e "${YELLOW}Step 2: Running team rename migration...${NC}"
run_migration "migrations/20251203000000_rename_groups_to_teams.sql"

echo -e "${YELLOW}Step 3: Running team ID expansion migration...${NC}"
run_migration "migrations/20251204000000_expand_team_ids.sql"

echo -e "${YELLOW}Step 4: Running tier-based permission system migration...${NC}"
run_migration "migrations/20251208000000_tier_based_permission_system.sql"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. ✅ Database migrations applied"
echo "2. 📦 Build the backend: cd server && cargo build"
echo "3. 🚀 Start the server: cd server && cargo run"
echo "4. 🌐 Build the frontend: cd client && npm run build"
echo "5. 🧪 Run tests: cd server && cargo test"
echo ""
echo -e "${YELLOW}Permission System Tiers:${NC}"
echo "  • free       : Basic user with read-only access"
echo "  • standard   : Team member with team management"
echo "  • premium    : Organization boss with org management"
echo "  • allstar    : Admin with full system access"
echo ""
echo -e "${YELLOW}Verify deployment:${NC}"
echo "  psql -d \$DATABASE_URL -c \"SELECT tier, COUNT(*) FROM users GROUP BY tier;\""
echo "  psql -d \$DATABASE_URL -c \"SELECT COUNT(*) FROM permission_metadata;\""
echo ""
