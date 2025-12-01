-- Migration 011: Refactor to Three-Tier Authorization Architecture
-- Date: 2025-11-29
-- Purpose: Remove approval system, add team quota layer, free user licenses, and history tracking

-- ============================================================
-- Step 1: Add source_upid to users table
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS source_upid VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_users_source_upid ON users(source_upid);
CREATE INDEX IF NOT EXISTS idx_users_tier_status ON users(tier, status);

-- ============================================================
-- Step 2: Create free_user_licenses table
-- ============================================================
CREATE TABLE IF NOT EXISTS free_user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upid VARCHAR(50) NOT NULL,
    license_key TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_free_user_licenses_upid ON free_user_licenses(upid);
CREATE INDEX IF NOT EXISTS idx_free_user_licenses_user ON free_user_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_free_user_licenses_product ON free_user_licenses(product_id);

-- ============================================================
-- Step 3: Create team_product_quotas table
-- ============================================================
CREATE TABLE IF NOT EXISTS team_product_quotas (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upid VARCHAR(50) NOT NULL,
    allocated_count INT NOT NULL DEFAULT 10,
    used_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, product_id),
    CONSTRAINT allocated_ge_used CHECK (allocated_count >= used_count)
);

CREATE INDEX IF NOT EXISTS idx_team_quotas_team_id ON team_product_quotas(team_id);
CREATE INDEX IF NOT EXISTS idx_team_quotas_org_id ON team_product_quotas(org_id);
CREATE INDEX IF NOT EXISTS idx_team_quotas_product_id ON team_product_quotas(product_id);
CREATE INDEX IF NOT EXISTS idx_team_quotas_upid ON team_product_quotas(upid);

-- ============================================================
-- Step 4: Create user_license_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_license_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    team_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    old_tier VARCHAR(20),
    new_tier VARCHAR(20),
    old_count INT,
    new_count INT,
    reason VARCHAR(255),
    changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_license_history_user ON user_license_history(user_id);
CREATE INDEX IF NOT EXISTS idx_license_history_action ON user_license_history(action);
CREATE INDEX IF NOT EXISTS idx_license_history_changed_at ON user_license_history(changed_at);

-- ============================================================
-- Step 5: Modify org_product_licenses table
-- ============================================================
ALTER TABLE org_product_licenses 
ADD COLUMN IF NOT EXISTS assigned_count INT DEFAULT 0;

ALTER TABLE org_product_licenses 
ADD COLUMN IF NOT EXISTS available_count INT GENERATED ALWAYS AS (total_count - assigned_count) STORED;

CREATE INDEX IF NOT EXISTS idx_org_licenses_assigned ON org_product_licenses(assigned_count);

-- ============================================================
-- Step 6: Clean up deprecated permissions
-- ============================================================
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code = 'admin:approval_process'
);
DELETE FROM permissions WHERE code = 'admin:approval_process';
