-- Migration: Organization Bosses Join Table
-- Date: 2026-01-26
-- Purpose: Explicit tracking of organization boss relationships
-- Requirement: An organization can have multiple bosses, a boss can only belong to one organization

-- ============================================================
-- Organization Bosses Table
-- ============================================================
-- This table explicitly tracks the relationship between organizations and their bosses (premium tier users)
-- It serves as a join table to enable:
-- 1. Query all bosses for an organization
-- 2. Ensure a user can only be boss of ONE organization
-- 3. Audit trail of boss assignments

CREATE TABLE IF NOT EXISTS organization_bosses (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- Who assigned this boss (admin)
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,  -- Optional notes about the assignment
    
    -- A user can only be boss of ONE organization (enforced by unique constraint)
    CONSTRAINT unique_user_boss UNIQUE(user_id),
    -- But an organization can have multiple bosses (no unique constraint on organization_id alone)
    CONSTRAINT unique_org_user_boss UNIQUE(organization_id, user_id)
);

-- Index for fast lookup of bosses by organization
CREATE INDEX idx_org_bosses_org_id ON organization_bosses(organization_id);
CREATE INDEX idx_org_bosses_user_id ON organization_bosses(user_id);

-- ============================================================
-- Migrate existing premium users to organization_bosses table
-- ============================================================
-- Insert existing premium users who have organization_id set
INSERT INTO organization_bosses (organization_id, user_id, assigned_at, notes)
SELECT 
    u.organization_id,
    u.id,
    u.created_at,
    'Auto-migrated from existing premium user'
FROM users u
WHERE u.tier = 'premium' 
  AND u.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_bosses ob WHERE ob.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE organization_bosses IS 'Tracks which users are bosses (premium tier) of which organizations. A user can only be boss of one organization.';
COMMENT ON COLUMN organization_bosses.organization_id IS 'The organization this boss belongs to';
COMMENT ON COLUMN organization_bosses.user_id IS 'The user who is the boss (must be premium tier)';
COMMENT ON COLUMN organization_bosses.assigned_by IS 'The admin who assigned this user as boss';
COMMENT ON COLUMN organization_bosses.notes IS 'Optional notes about why this user was made boss';
