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

## Setup

```bash
# Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Ubuntu: apt-get install postgresql
# Windows: https://www.postgresql.org/download/windows/

# Create database
createdb allowance

# Connect and run migrations
psql allowance < migrations/001_initial_schema.sql
psql allowance < migrations/002_add_license_table.sql
```

## Schema Files

- `migrations/001_initial_schema.sql` - Core tables setup
- `migrations/002_add_license_table.sql` - License/token tables

## Key Tables

### users
- Stores user account information
- Columns: uid, email, password_hash, tier, status, created_at, updated_at, last_login

### roles & permissions
- Implements RBAC system
- Supports multiple roles per user
- Permissions: user:read, user:write, team:create, team:approve, admin:*

### organizations
- Top-level organizational unit
- Can have multiple groups/departments

### groups
- Department/team container
- Belongs to organization
- Can have multiple members

### user_licenses
- Product authorization for users
- Includes license token (JWT format)
- Has expiration date

### email_tokens
- One-time tokens for email activation/password reset
- Auto-expires after configured time

### approval_requests
- Workflow for user/team approvals
- Status: pending, approved, rejected

## Performance Considerations

- Indexed: users.email, users.uid, user_roles.user_id, user_licenses.user_id
- Foreign keys for referential integrity
- JSON support for flexible license data
