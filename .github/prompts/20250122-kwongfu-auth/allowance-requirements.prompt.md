# Allowance Improvement Requirements for KwongFu Integration

**Context**: 
Allowance is serving as the centralized Authentication and Authorization (AuthN/AuthZ) provider for a new client application called **KwongFu** (a crypto trading platform).

**Objective**:
Update the Allowance server configuration and database to support KwongFu's external authentication needs, specifically enabling remote login, token validation, and product-specific tier management.

## Requirements

### 1. CORS Configuration
**Goal**: Allow the KwongFu frontend to make direct API calls to Allowance.
- **Action**: Update the `cors` configuration in the Allowance server.
- **Allowed Origin**: Add `http://localhost:3060` (KwongFu Dev) and `http://localhost:4060` (KwongFu Docker/Prod). *Note: Verify exact KwongFu frontend ports.*
- **Methods**: Allow `POST` for `/auth/login`, `/auth/register`.
- **Headers**: Allow `Content-Type`, `Authorization`.

### 2. JWT Verification Strategy (Shared Secret)
**Goal**: Enable KwongFu's Rust backend to validate JWT tokens offline (without calling Allowance for every request).
- **Strategy**: "Shared Secret" (Symmetric HS256).
- **Action**: 
    - Ensure the `JWT_SECRET` used in Allowance is documented or configurable so it can be securely shared with the KwongFu backend configuration.
    - Confirm the algorithm is `HS256` (standard for `jsonwebtoken` and Rust `jsonwebtoken` crate compatibility).
    - Ensure the token payload includes `tier` or that `tier` can be reliably fetched/inferred. *Clarification: Allowance currently puts `user_id` in token. We might need to stick to fetching profile or add `tier` to claims if performance is critical. For now, Shared Secret is for signature validation.*

### 3. Product Registration (UPID)
**Goal**: Register KwongFu as a valid product within Allowance.
- **Action**: Insert a new record into the `products` table.
    - **UPID**: `UKWONGFU0001` (Universal Product ID for KwongFu).
    - **Name**: "KwongFu Trading System".
    - **Description**: "Automated Crypto Trading Platform".

### 4. Auth Response Enhancement (Tier Info)
**Goal**: Ensure the client receives the user's specific tier immediately upon login to control UI rendering.
- **Action**: Verify or Update the `POST /auth/login` and `POST /auth/register` responses.
- **Requirement**: The JSON response MUST include a `tier` field at the top level or within the `user` object.
    - Example: `{"user": {"email": "...", "tier": "premium"}, "token": "..."}`.
    - If `tier` is determined by a specific license for the `UPID` (KwongFu) rather than the user's global tier, the logic must return the *effective* tier for KwongFu.
    - *Note*: If the user has no specific license, return `free`.

### 5. Admin Workflows
**Goal**: Allow User Registration but centralized Permission Management.
- **Registration**: Keep `/auth/register` open. KwongFu users will create accounts there (or via KwongFu frontend proxying to this endpoint).
- **Default Tier**: Ensure new users registered via `UKWONGFU0001` default to the `Free` tier.
- **Tier Management**: Administrators will use the existing Allowance Admin Dashboard to manually upgrade KwongFu users to `Standard` or `Premium` based on external payment/approval.

## Implementation Steps for User
1. Pull the latest `allowance` repo.
2. Add necessary CORS params to `.env` or `config`.
3. execute SQL insert for the KwongFu product.
4. Verify `JWT_SECRET` is accessible for copying to KwongFu's `config.toml`.
