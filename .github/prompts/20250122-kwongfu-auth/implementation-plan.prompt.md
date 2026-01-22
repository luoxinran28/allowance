# Allowance Configuration for KwongFu Integration - Implementation Plan

**Created**: 2026-01-22  
**Status**: Approved for Implementation  
**Blocks**: KwongFu auth implementation (see `kwongfu/.github/prompt/20260122-auth-account/`)

---

## 1. Overview

Configure Allowance to serve as the Identity Provider (IdP) for KwongFu, enabling:
- Cross-origin authentication from KwongFu frontend
- Product registration for KwongFu (UPID: `UKWONGFU0001`)
- Tier information in login response for feature gating

### Key Requirements

| Requirement | Description |
|-------------|-------------|
| CORS | Allow KwongFu origins to call `/auth/*` endpoints |
| Product Registration | Register `UKWONGFU0001` in products table |
| JWT Secret Sharing | Document/verify the shared secret for KwongFu backend |
| Login Response | Ensure `tier` is included in response for KwongFu to cache |

### Backward Compatibility (Critical)

The changes **MUST NOT** break Allowance's own frontend login. Key constraints:

| Aspect | Requirement |
|--------|-------------|
| `source_upid` in login | **OPTIONAL** parameter - Allowance frontend doesn't send it |
| Tier when no `source_upid` | Map from user's global role (see below) |
| Response format | Additive only - don't remove/rename existing fields |
| Allowance frontend | Must continue working without any changes |

**Tier Mapping When `source_upid` is Missing** (Allowance's own login):

| User Role | Tier Returned | Rationale |
|-----------|---------------|-----------|
| `admin` | `"allstar"` | Full system access |
| `org_boss` | `"premium"` | Organization management |
| `team_leader` | `"standard"` | Team management |
| `standard_employee` | `"standard"` | Standard features |
| `free_user` | `"free"` | Limited access |

**Tier Mapping When `source_upid` is Provided** (KwongFu login):

| License Status | Tier Returned |
|----------------|---------------|
| Has premium license for UPID | `"premium"` |
| Has standard license for UPID | `"standard"` |
| No license for UPID | `"free"` |

---

## 2. Implementation Phases

### Phase 1: CORS Configuration (30 min)

**Objective**: Allow KwongFu frontend to make direct API calls to Allowance.

#### 1.1 Update CORS Settings

The Allowance server needs to accept requests from KwongFu origins.

**File**: `server/src/main.rs` or CORS configuration location

Add allowed origins:
```rust
// KwongFu Development
"http://localhost:3060"    // Next.js dev server

// KwongFu Docker/Production  
"http://localhost:4060"    // Docker frontend (if proxied)

// Future: KwongFu Production URL (TBD)
```

**Allowed Methods**: `POST`, `OPTIONS`  
**Allowed Headers**: `Content-Type`, `Authorization`  
**Endpoints**: `/auth/login`, `/auth/register`, `/auth/me`

#### Alternative: Environment Variable Approach

Update `.env`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3030,http://localhost:3060,http://localhost:4060
```

Update server to parse comma-separated origins.

#### Tasks:
- [ ] Identify current CORS configuration location in Allowance server
- [ ] Add KwongFu origins (localhost:3060, localhost:4060)
- [ ] Test CORS preflight from KwongFu frontend
- [ ] Document the configuration for future KwongFu production URL

---

### Phase 2: Product Registration (15 min)

**Objective**: Register KwongFu as a valid product in Allowance.

#### 2.1 Insert Product Record

Execute SQL (via admin interface or direct DB):

```sql
-- Register KwongFu product
INSERT INTO products (upid, name, description, created_at, updated_at)
VALUES (
    'UKWONGFU0001',
    'KwongFu Trading System',
    'Automated Crypto Trading Platform for Binance.US Spot',
    NOW(),
    NOW()
)
ON CONFLICT (upid) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify insertion
SELECT * FROM products WHERE upid = 'UKWONGFU0001';
```

#### 2.2 Product Tiers (Optional)

If Allowance tracks tiers per product, ensure KwongFu has:
- `free` tier (default for new registrations)
- `standard` tier (assigned by admin)
- `premium` tier (assigned by admin)

```sql
-- If product_tiers table exists
INSERT INTO product_tiers (product_id, tier_name, description)
SELECT id, 'free', 'Dashboard view only, no trading' FROM products WHERE upid = 'UKWONGFU0001'
UNION ALL
SELECT id, 'standard', 'Full trading features, no Validation Lab' FROM products WHERE upid = 'UKWONGFU0001'
UNION ALL
SELECT id, 'premium', 'All features including Validation Lab' FROM products WHERE upid = 'UKWONGFU0001';
```

#### Tasks:
- [ ] Insert `UKWONGFU0001` product record
- [ ] Verify product appears in Allowance admin dashboard
- [ ] (Optional) Add tier definitions if applicable

---

### Phase 3: JWT Secret Documentation (15 min)

**Objective**: Ensure KwongFu can validate Allowance-issued JWTs.

#### 3.1 Verify JWT Algorithm

Confirm Allowance uses **HS256** (symmetric HMAC-SHA256):

```rust
// In server/src/utils/jwt.rs
let token = encode(
    &Header::new(Algorithm::HS256),  // <-- Must be HS256
    &claims,
    &EncodingKey::from_secret(secret.as_bytes()),
)?;
```

#### 3.2 Document Secret Location

The `JWT_SECRET` is typically in:
- `.env` file: `JWT_SECRET=your-32-char-minimum-secret`
- Or `config.toml`: `jwt_secret = "..."`

**Action**: Copy this exact value to KwongFu's `config.toml`:
```toml
[auth]
jwt_secret = "SAME_VALUE_AS_ALLOWANCE"
```

#### 3.3 Security Considerations

- ⚠️ **Never commit secrets to Git**
- ⚠️ **Use environment variables in production**
- ⚠️ **Rotate secret if compromised (invalidates all tokens)**

#### Tasks:
- [ ] Verify Allowance uses HS256 algorithm
- [ ] Document `JWT_SECRET` location for KwongFu developer
- [ ] Add placeholder in KwongFu's `config.toml.example`

---

### Phase 4: Login Response Enhancement (30 min)

**Objective**: Ensure login/register responses include user tier for KwongFu feature gating.

#### 4.1 Current Response Format

Check current `/auth/login` response in `server/src/handlers/auth.rs`:

```json
{
  "token": "eyJ...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "uid": "U12AB34CD56EF789",
    "status": "active"
  }
}
```

#### 4.2 Required Enhancement

Add `tier` field to user object:

```json
{
  "token": "eyJ...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "uid": "U12AB34CD56EF789",
    "status": "active",
    "tier": "free"  // <-- ADD THIS
  }
}
```

#### 4.3 Tier Determination Logic

The tier should be determined by **two different paths**:

**Path A: With `source_upid` (External product like KwongFu)**
```rust
// When source_upid is provided, check product-specific license
async fn get_tier_for_product(
    pool: &PgPool,
    user_id: i64,
    source_upid: &str,
) -> String {
    // Check if user has an active license for this product
    if let Some(license) = get_active_license(pool, user_id, source_upid).await {
        return license.tier; // "standard" or "premium"
    }
    // No license = free tier for this product
    "free".to_string()
}
```

**Path B: Without `source_upid` (Allowance's own frontend)**
```rust
// When no source_upid, map from user's global role
fn get_tier_from_role(user: &User) -> String {
    match user.role.as_str() {
        "admin" => "allstar",
        "org_boss" => "premium", 
        "team_leader" | "standard_employee" => "standard",
        _ => "free",  // free_user or unknown
    }.to_string()
}
```

**Combined Logic:**
```rust
async fn determine_user_tier(
    pool: &PgPool,
    user: &User,
    source_upid: Option<&str>,
) -> String {
    match source_upid {
        Some(upid) => get_tier_for_product(pool, user.id, upid).await,
        None => get_tier_from_role(user),
    }
}
```

#### 4.4 Update Login Endpoint

Modify `POST /auth/login` to:
1. Accept optional `source_upid` in request body
2. Look up tier for that product
3. Include tier in response

**Request**:
```json
{
  "email": "user@example.com",
  "password": "secret",
  "source_upid": "UKWONGFU0001"  // Optional, KwongFu will send this
}
```

**Response**:
```json
{
  "token": "eyJ...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "tier": "standard"  // Based on UKWONGFU0001 license
  }
}
```

#### Tasks:
- [ ] Review current login response format
- [ ] Add `tier` field to `AuthResponse` struct
- [ ] Implement `get_tier_from_role()` for Allowance frontend (Path B)
- [ ] Implement `get_tier_for_product()` for external products (Path A)
- [ ] Implement `determine_user_tier()` that combines both paths
- [ ] Update `/auth/login` handler to include tier (source_upid OPTIONAL)
- [ ] Update `/auth/register` handler to include tier (default: "free")
- [ ] Update `/auth/me` endpoint to include tier
- [ ] **Test Allowance frontend login FIRST** (ensure no regression)
- [ ] Test with existing Allowance frontend E2E tests
- [ ] Test KwongFu login flow with source_upid

---

### Phase 5: Admin Tier Management (Optional, 1 hour)

**Objective**: Allow Allowance admins to upgrade KwongFu users.

This may already exist in Allowance's license management. Verify:

1. Admin can view users registered via `UKWONGFU0001`
2. Admin can assign `standard` or `premium` tier to users
3. Tier changes take effect on next login (or immediately if using /auth/me refresh)

#### Tasks:
- [ ] Verify admin can filter users by `source_upid = UKWONGFU0001`
- [ ] Verify admin can assign/change user license tier
- [ ] Document admin workflow for upgrading KwongFu users

---

## 3. Testing Checklist

### Backward Compatibility Testing (CRITICAL - Do First)
```bash
# Test Allowance frontend login (NO source_upid)
curl -X POST http://localhost:4040/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Expected: Response includes tier based on role (e.g., "allstar" for admin)
# Expected: NO breaking changes to existing response structure
```

```bash
# Test Allowance frontend registration (NO source_upid)
curl -X POST http://localhost:4040/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test123!",
    "source_upid": "UALLOWANCE0001"
  }'

# Expected: Response includes tier: "free" (default for new users)
```

### CORS Testing
```bash
# From KwongFu frontend origin
curl -X OPTIONS http://47.79.78.229/auth/login \
  -H "Origin: http://localhost:3060" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return:
# Access-Control-Allow-Origin: http://localhost:3060
# Access-Control-Allow-Methods: POST
```

### Registration Testing
```bash
# Register new KwongFu user
curl -X POST http://47.79.78.229/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kwongfu-test@example.com",
    "password": "Test123!",
    "source_upid": "UKWONGFU0001"
  }'

# Expected response includes tier: "free"
```

### Login Testing
```bash
# Login with source_upid
curl -X POST http://47.79.78.229/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kwongfu-test@example.com",
    "password": "Test123!",
    "source_upid": "UKWONGFU0001"
  }'

# Expected response includes tier
```

### JWT Validation Testing
```bash
# Decode JWT (in KwongFu backend) - should succeed with shared secret
# Token from login response should be valid
```

---

## 4. File Changes Summary

| File | Change |
|------|--------|
| `server/src/main.rs` or CORS config | Add KwongFu origins |
| `database/seed_data.sql` | Add UKWONGFU0001 product |
| `server/src/handlers/auth.rs` | Add tier to login/register response |
| `server/src/services/auth_service.rs` | Add tier lookup logic |
| `server/src/models/auth.rs` | Add tier field to response struct |
| `.env` or config | Document JWT_SECRET for sharing |

---

## 5. Milestone Checklist

- [ ] **M1**: CORS configured, preflight requests succeed
- [ ] **M2**: UKWONGFU0001 product registered
- [ ] **M3**: JWT secret documented for KwongFu
- [ ] **M4**: Login response includes tier field
- [ ] **M5**: Registration defaults to "free" tier
- [ ] **M6**: Admin can upgrade KwongFu users
- [ ] **M7**: All tests passing

---

## 6. Dependencies

### Allowance Side
- No new Rust dependencies required
- SQL migration for product (if not using direct INSERT)

### KwongFu Side (Blocked Until Allowance Ready)
- Needs JWT_SECRET value
- Needs CORS approval for origins
- Needs tier in login response

---

## 7. Rollback Plan

If issues arise:
1. **CORS**: Remove KwongFu origins from allowed list
2. **Product**: `DELETE FROM products WHERE upid = 'UKWONGFU0001'`
3. **Tier field**: Allowance frontend doesn't use tier, so it's backward compatible

---

## 8. Iteration History

| Date | Change |
|------|--------|
| 2026-01-22 | Initial plan created based on allowance-requirements.prompt.md |
| 2026-01-22 | **Implementation Complete**: Phase 1-4 implemented |

### Implementation Details (2026-01-22)

**Phase 1: CORS** - No changes needed. Already configured with `CorsLayer::permissive().allow_origin(Any)`.

**Phase 2: Product Registration** - Added to `database/seed_data.sql`:
- Product: `UKWONGFU0001` (KwongFu Trading System)
- Product versions: free, standard, premium with feature flags

**Phase 3: JWT** - Documented. Uses HS256, secret from `JWT_SECRET` env var.

**Phase 4: Login Response Enhancement** - Key changes:
1. `models/user.rs`:
   - Added `effective_tier` field to `UserResponse` (optional, for product-specific tier)
   - Added `#[serde(alias = "source_upid")]` to `LoginRequest.upid` for compatibility

2. `services/auth_service.rs`:
   - Added `determine_user_tier()` - main tier determination function
   - Added `get_tier_for_product()` - checks team_member_license_assignments and free_user_licenses
   - Added `get_tier_from_roles()` - maps user roles to tier for Allowance frontend

3. `handlers/auth.rs`:
   - Updated `login()` to call `determine_user_tier()` and set `effective_tier`
   - Updated `register()` to set `effective_tier = "free"` for new users

4. `handlers/user.rs`:
   - Updated `get_profile()` to include `effective_tier` based on roles

**Backward Compatibility**: 
- Allowance frontend continues to work (no source_upid → tier from roles)
- `effective_tier` is additive field (won't break existing clients)
- `upid` field accepts both "upid" and "source_upid" JSON keys

