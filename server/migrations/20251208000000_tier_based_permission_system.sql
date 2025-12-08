-- Migration: Tier-Based Permission System Implementation
-- Date: 2025-12-08
-- Description: Implements four-tier authorization system (free < standard < premium < allstar)
--              with tier-based permission checks across all API endpoints

-- ============================================================================
-- 1. Verify and enhance user_tier enum
-- ============================================================================

-- Check if tier column exists and is correct type
-- If needed, add new tier values (this is idempotent in PostgreSQL 12+)
DO $$
BEGIN
  -- Attempt to add allstar if it doesn't exist
  ALTER TYPE user_tier ADD VALUE 'allstar' AFTER 'premium';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

-- ============================================================================
-- 2. Add permission metadata table for documentation
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_metadata (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  required_tier user_tier NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'user', 'team', 'org', 'product', 'license'
  action VARCHAR(50) NOT NULL, -- 'read', 'create', 'update', 'delete', 'manage'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permission_metadata_tier ON permission_metadata(required_tier);
CREATE INDEX idx_permission_metadata_resource ON permission_metadata(resource_type);

-- Insert permission definitions for documentation purposes
INSERT INTO permission_metadata (code, description, required_tier, resource_type, action) VALUES
  -- Free tier permissions
  ('user:read_self', 'Read own user profile', 'free', 'user', 'read'),
  ('product:read', 'Read product information', 'free', 'product', 'read'),
  ('team:read', 'Read team information', 'free', 'team', 'read'),

  -- Standard tier permissions (cumulative with free)
  ('user:read_team', 'Read team member profiles', 'standard', 'user', 'read'),
  ('team:manage_members', 'Manage team members (add/remove)', 'standard', 'team', 'manage'),

  -- Premium tier permissions (cumulative with standard)
  ('user:read_org', 'Read organization members', 'premium', 'user', 'read'),
  ('product:assign', 'Assign products to teams', 'premium', 'product', 'assign'),
  ('team:create', 'Create new teams', 'premium', 'team', 'create'),
  ('team:update', 'Update team information', 'premium', 'team', 'update'),
  ('team:delete', 'Delete teams', 'premium', 'team', 'delete'),
  ('org:read', 'Read organization information', 'premium', 'org', 'read'),
  ('org:manage', 'Manage organization', 'premium', 'org', 'manage'),
  ('license:read', 'Read license information', 'premium', 'license', 'read'),
  ('license:manage', 'Manage licenses (batch operations)', 'premium', 'license', 'manage'),

  -- Allstar (admin) tier permissions
  ('admin:*', 'Full administrative access', 'allstar', 'admin', 'manage')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. Optimize existing indexes for tier-based queries
-- ============================================================================

-- Ensure efficient tier-based lookups
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_status_tier ON users(status, tier);

-- Optimize team queries by tier
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_role ON user_teams(role);

-- Optimize organization queries
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);

-- Optimize license queries for quota checking
CREATE INDEX IF NOT EXISTS idx_team_product_quotas_team_id ON team_product_quotas(team_id);
CREATE INDEX IF NOT EXISTS idx_free_user_licenses_user_id ON free_user_licenses(user_id);

-- ============================================================================
-- 4. Add audit logging for permission-related operations (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  action VARCHAR(100) NOT NULL, -- 'TIER_UPGRADE', 'TIER_DOWNGRADE', 'PERMISSION_DENIED', 'PERMISSION_GRANTED'
  resource_type VARCHAR(50),
  resource_id BIGINT,
  old_tier user_tier,
  new_tier user_tier,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_permission_audit_log_user ON permission_audit_log(user_id);
CREATE INDEX idx_permission_audit_log_action ON permission_audit_log(action);
CREATE INDEX idx_permission_audit_log_created_at ON permission_audit_log(created_at);

-- ============================================================================
-- 5. Add tier-based rate limiting configuration (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  tier user_tier NOT NULL UNIQUE,
  requests_per_minute INT NOT NULL DEFAULT 60,
  requests_per_hour INT NOT NULL DEFAULT 3600,
  requests_per_day INT NOT NULL DEFAULT 86400,
  concurrent_requests INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tier_rate_limits (tier, requests_per_minute, requests_per_hour, requests_per_day, concurrent_requests) VALUES
  ('free', 10, 300, 3000, 2),
  ('standard', 30, 1800, 43200, 5),
  ('premium', 60, 3600, 86400, 20),
  ('allstar', 120, 7200, 172800, 50)
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- 6. Verify critical data integrity
-- ============================================================================

-- Ensure all users have a valid tier
DO $$
BEGIN
  UPDATE users SET tier = 'free' WHERE tier IS NULL;
  RAISE NOTICE 'Verified user tier assignments';
END
$$;

-- Log migration completion
INSERT INTO permission_metadata (code, description, required_tier, resource_type, action) VALUES
  ('system:migration_complete', 'Tier-based permission system migration completed', 'free', 'system', 'manage')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Summary of Changes:
-- ============================================================================
-- 1. ✅ Four-tier authorization: free < standard < premium < allstar
-- 2. ✅ Permission metadata table for documentation
-- 3. ✅ Optimized indexes for tier-based queries and lookups
-- 4. ✅ Permission audit logging for compliance tracking
-- 5. ✅ Tier-based rate limiting configuration
-- 6. ✅ Data integrity verification
-- ============================================================================
