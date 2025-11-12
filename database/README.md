# Database Schema

PostgreSQL database schema for the allowance authorization management system.

## Overview

The database consists of several core domains:
- **Users**: User accounts with email and tier system
- **Authentication**: Email tokens for activation/password reset
- **RBAC**: Role-based access control with permissions
- **Organizations**: Company/organizational hierarchy
- **Products**: Product catalog with versioning and licensing
- **Approvals**: Request approval workflows
- **Audit**: Simple operation logging

## Quick Setup

For a complete database setup with schema and test data:

```bash
# Using the setup script (recommended)
cd database
./setup_db.sh

# Or manually:
# Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Ubuntu: apt-get install postgresql
# Windows: https://www.postgresql.org/download/windows/

# Create database
createdb allowance

# Run schema and test data
psql allowance < schema.sql
psql allowance < test_data.sql
```

## Files

- `schema.sql` - Complete database schema (merged from all migrations)
- `test_data.sql` - Comprehensive test data for development
- `setup_db.sh` - Automated setup script
- `migrations/` - Individual migration files (legacy)
- `create_test_users.sql` - Legacy test user creation (superseded by test_data.sql)

## Test Data

The test data includes:
- **10+ test users** across all tiers (free, standard, premium)
- **3 organizations** with departments/groups
- **5 products** with multiple versions each
- **User licenses** and subscriptions
- **Approval requests** and audit logs
- **Payment intents** and invoices

### Test User Credentials

| Email | Password | Tier | Role |
|-------|----------|------|------|
| admin@test.com | TestPass123 | premium | admin |
| superadmin@test.com | TestPass123 | premium | admin |
| user@test.com | TestPass123 | standard | standard_employee |
| jane.smith@test.com | TestPass123 | standard | standard_employee |
| sarah.johnson@test.com | TestPass123 | premium | team_leader |
| free@test.com | TestPass123 | free | free_user |

## Manual Setup (Legacy)

If you prefer to run migrations individually:

```bash
# Create database
createdb allowance

# Run migrations in order
psql allowance < migrations/001_initial_schema.sql
psql allowance < migrations/002_add_license_table.sql
psql allowance < migrations/003_add_payment_tables.sql
psql allowance < migrations/004_add_stripe_integration.sql
psql allowance < migrations/005_add_batch_license_tracking.sql
psql allowance < migrations/006_optimize_queries.sql

# Add test users
psql allowance < create_test_users.sql
```
