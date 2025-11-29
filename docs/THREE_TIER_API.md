# Three-Tier Authorization API Guide

## Overview

The Allowance system implements a three-tier authorization model:
1. **Organization** → Purchases licenses in bulk
2. **Team** → Allocated quota from organization pool
3. **User** → Receives licenses from team quota

## Key Changes from Previous Architecture

### Removed Features
- ❌ Subscription system (endpoints return 501 Not Implemented)
- ❌ Approval workflows (direct quota allocation)
- ❌ License renewal endpoints

### New Features
- ✅ Organization product licenses with UPSERT
- ✅ Team quota management
- ✅ Free user licenses (auto-provisioned)
- ✅ Pessimistic locking for quota operations
- ✅ CHECK constraints for data integrity

## API Endpoints

### 1. Organization License Management

#### Allocate Licenses to Organization
```http
POST /api/products/{product_id}/org-licenses
Authorization: Bearer <admin_token>

Request:
{
  "organization_id": 123,
  "count": 1000,
  "expires_in_days": 365
}

Response:
{
  "id": 1,
  "organization_id": 123,
  "product_id": 1,
  "total_count": 1000,
  "assigned_count": 0,
  "available_count": 1000,
  "expires_at": "2025-11-29T00:00:00",
  "created_by": 1,
  "created_at": "2024-11-29T00:00:00",
  "updated_at": "2024-11-29T00:00:00"
}
```

**Notes:**
- Uses UPSERT (ON CONFLICT DO UPDATE) - idempotent
- Multiple allocations accumulate: 1000 + 500 = 1500 total_count
- Extends expiry date if new date > existing date
- Admin permission required

#### Get Organization Licenses
```http
GET /api/products/org-licenses?organization_id=123
Authorization: Bearer <admin_token>

Response:
[
  {
    "id": 1,
    "organization_id": 123,
    "product_id": 1,
    "total_count": 1000,
    "assigned_count": 250,
    "available_count": 750,
    "expires_at": "2025-11-29T00:00:00"
  }
]
```

### 2. Team Quota Management

#### Allocate Quota to Team
```http
POST /api/teams/{team_id}/quotas
Authorization: Bearer <admin_token>

Request:
{
  "product_id": 1,
  "upid": "UPID-prod1-basic",
  "allocated_count": 100
}

Response:
{
  "id": 1,
  "team_id": 10,
  "org_id": 123,
  "product_id": 1,
  "upid": "UPID-prod1-basic",
  "allocated_count": 100,
  "used_count": 0,
  "created_at": "2024-11-29T00:00:00",
  "updated_at": "2024-11-29T00:00:00"
}
```

**Notes:**
- Team must belong to organization
- Quota is per (team_id, product_id) pair
- Uses UPSERT - replaces existing quota
- Team leader or admin permission required

#### Get Team Quotas
```http
GET /api/teams/{team_id}/quotas
Authorization: Bearer <team_member_token>

Response:
[
  {
    "id": 1,
    "team_id": 10,
    "team_name": "Engineering",
    "org_id": 123,
    "product_id": 1,
    "product_name": "Allowance Pro",
    "upid": "UPID-prod1-basic",
    "allocated_count": 100,
    "used_count": 35,
    "available_count": 65
  }
]
```

### 3. Team Member Management

#### Add Member to Team (Consumes Quota)
```http
POST /api/teams/{team_id}/members
Authorization: Bearer <team_leader_token>

Request:
{
  "user_id": 456,
  "role": "member",
  "product_upids": ["UPID-prod1-basic", "UPID-prod2-basic"]
}

Response:
{
  "message": "Member added successfully",
  "tier_upgraded": true,
  "free_licenses_revoked": ["UPID-prod1-basic"]
}
```

**Business Logic:**
1. Validates team has available quota for products
2. Consumes quota (used_count += product count)
3. Upgrades user tier: free → standard
4. Revokes free user licenses for same products
5. Records history in user_license_history

**Quota Validation:**
- Uses pessimistic locking (SELECT FOR UPDATE)
- Ensures quota not exceeded
- Atomic transaction

#### Remove Member from Team (Releases Quota)
```http
DELETE /api/teams/{team_id}/members/{user_id}
Authorization: Bearer <team_leader_token>

Response:
{
  "message": "Member removed successfully",
  "tier_downgraded": true,
  "free_licenses_restored": ["UPID-prod1-basic"]
}
```

**Business Logic:**
1. Releases quota (used_count -= product count)
2. Checks if user in other teams
3. If no other teams: Downgrades tier (standard → free)
4. Restores free user licenses
5. Records history

### 4. Free User Licenses

#### Auto-Provisioned on Registration
```http
POST /api/auth/register

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "product_upid": "UPID-prod1-free"
}

Response:
{
  "user": {
    "id": 456,
    "uid": "U12AB34CD56EF78",
    "email": "user@example.com",
    "tier": "free"
  },
  "token": "eyJhbGciOiJIUzI1...",
  "free_license": {
    "id": 1,
    "user_id": 456,
    "product_id": 1,
    "upid": "UPID-prod1-free",
    "license_key": "FREE-U12AB34CD56EF78-PROD1"
  }
}
```

**Notes:**
- Automatically creates free_user_licenses record
- License key format: FREE-{UID}-{PRODUCT}
- Tied to source_upid (product that triggered registration)

### 5. Team Creation (Requires org_id)

#### Create Team
```http
POST /api/teams
Authorization: Bearer <user_token>

Request:
{
  "name": "Engineering Team",
  "description": "Software development team",
  "org_id": 123
}

Response:
{
  "id": 10,
  "group_id": "GRP12AB3",
  "organization_id": 123,
  "name": "Engineering Team",
  "description": "Software development team",
  "created_by": 1,
  "created_at": "2024-11-29T00:00:00",
  "updated_at": "2024-11-29T00:00:00"
}
```

**Validation:**
- Checks organization exists (org_id validation)
- Creator automatically becomes team admin
- Fails with 404 if organization not found

## Data Consistency

### CHECK Constraints

```sql
-- Org product licenses
CHECK (
    total_count >= 0 
    AND assigned_count >= 0 
    AND available_count >= 0
    AND assigned_count <= total_count
    AND available_count = total_count - assigned_count
)

-- Team quotas
CHECK (
    allocated_count >= 0 
    AND used_count >= 0 
    AND used_count <= allocated_count
)
```

### Pessimistic Locking

```rust
// Quota consumption with row-level lock
UPDATE team_product_quotas 
SET used_count = used_count + 1 
WHERE id = (
    SELECT id FROM team_product_quotas 
    WHERE team_id = $1 AND product_id = $2 
    FOR UPDATE  -- Locks row until transaction commits
) AND used_count < allocated_count
```

## Migration Path

### From Old System to Three-Tier

1. **Organizations**: Create via `POST /api/organizations`
2. **Org Licenses**: Allocate via `POST /api/products/{id}/org-licenses`
3. **Teams**: Create with `org_id` via `POST /api/teams`
4. **Team Quotas**: Allocate via `POST /api/teams/{id}/quotas`
5. **Members**: Add via `POST /api/teams/{id}/members`

### Deprecated Endpoints (Return 501)

- `POST /api/payment/confirm` - Use org license allocation
- `GET /api/subscription/:user_id` - No direct replacement
- `POST /api/subscription/upgrade` - Use team member addition
- `POST /api/subscription/downgrade` - Use team member removal
- `DELETE /api/subscription/:user_id` - Use team member removal
- `PUT /api/subscription/auto-renew` - Feature removed

## Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Quota exceeded | Allocate more quota to team |
| 404 | Organization not found | Create organization first |
| 409 | Duplicate UPID | Product already exists |
| 501 | Not implemented | Use three-tier endpoints |

## Example Workflow

### 1. Admin Allocates Licenses
```bash
# Admin allocates 1000 licenses to organization
curl -X POST http://localhost:4040/api/products/1/org-licenses \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"organization_id": 123, "count": 1000, "expires_in_days": 365}'
```

### 2. Admin Allocates Quota to Team
```bash
# Admin gives team 100 license quota
curl -X POST http://localhost:4040/api/teams/10/quotas \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"product_id": 1, "upid": "UPID-prod1-basic", "allocated_count": 100}'
```

### 3. Team Leader Adds Member
```bash
# Team leader adds user (consumes 1 quota)
curl -X POST http://localhost:4040/api/teams/10/members \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -d '{"user_id": 456, "role": "member", "product_upids": ["UPID-prod1-basic"]}'

# Quota: used_count 0 → 1, available 100 → 99
# User tier: free → standard
# Free license: revoked
```

### 4. Check Quota Status
```bash
# Team leader checks remaining quota
curl http://localhost:4040/api/teams/10/quotas \
  -H "Authorization: Bearer $LEADER_TOKEN"

# Response: {"allocated_count": 100, "used_count": 1, "available_count": 99}
```

## Testing

Run three-tier E2E tests:
```bash
cd server
cargo test three_tier --test three_tier_tests
```

Tests cover:
- ✅ Org license UPSERT idempotency
- ✅ Team creation with org_id validation
- ✅ Quota consumption with pessimistic locking
- ✅ Quota constraint validation

## Database Schema

### New Tables
- `org_product_licenses` - Organization license pool
- `team_product_quotas` - Team quota allocation
- `free_user_licenses` - Free tier licenses
- `user_license_history` - Audit trail

### Key Indexes
- `idx_team_product_quotas_product_upid` - Fast quota lookups
- `idx_free_user_licenses_user_product` - User license queries
- `idx_org_product_licenses_expires_at` - Expiry checks

---

**Version**: 1.0  
**Last Updated**: 2024-11-29  
**Refactor**: Phases 0-4 Complete
