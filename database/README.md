# Database Setup Files

This folder contains database configuration and setup scripts for the Allowance project.

## Files

### Configuration
- **`.env`** - Database credentials and connection settings (development)
- **`.env.example`** - Template for environment variables

### Seed Data
- **`seed_data.sql`** - Test data for the four-tier authorization system
  - Creates 4 test users (free, standard, premium, allstar)
  - Creates 1 test organization
  - Creates 3 test teams
  - Used by `database/setup_db_v3.sh` for development

### Production Bootstrap
- **`bootstrap_admin.sql`** - Minimal production setup
  - Creates single admin user
  - Use for first-time production deployment only
  - Separate from development test data

## Database Migrations

Schema migrations are located in `server/migrations/` and are automatically executed by SQLx when the server starts.

Current migrations:
- `20251208000000_four_tier_authorization_system.sql` - Main schema
- `20260126000001_organization_bosses.sql` - Organization boss relationships
- `20260130000001_extend_upid_length.sql` - Extend UPID field
- `20260130000002_product_slug_length.sql` - Product slug length

## Usage

### Development Setup

To reset and seed the database for development:

```bash
bash database/setup_db_v3.sh
```

This script:
1. Stops Docker services and clears PostgreSQL volume
2. Starts PostgreSQL container
3. Starts server (migrations auto-run via SQLx)
4. Loads seed data from `database/seed_data.sql`
5. Displays database summary

### Starting Development Environment

To start all services with hot-reload:

```bash
bash docker-run.sh
```

### Production Setup

For first-time production deployment:

```bash
psql -U postgres -d allowance -f database/bootstrap_admin.sql
```

## Test Accounts

After running `database/setup_db_v3.sh`, these test accounts are available:

| Email | Tier | Org | Teams |
|-------|------|-----|-------|
| free_user@test.com | free | - | - |
| standard_user@test.com | standard | Test Organization | Development, Marketing |
| premium_user@test.com | premium | Test Organization | All teams |
| admin_user@test.com | allstar | - | - |

Password: See `seed_data.sql` for password hashes

## Permission Matrix

| Operation | Free | Standard | Premium | Allstar |
|-----------|------|----------|---------|---------|
| Create Team | ✗ | ✗ | ✓ | ✓ |
| Delete Team | ✗ | ✗ | ✓ | ✓ |
| Add Members | ✗ | ✓* | ✓ | ✓ |
| Admin Operations | ✗ | ✗ | ✗ | ✓ |

*Standard users can only add to their own teams
