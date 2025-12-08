-- Migration: Rename groups and user_groups tables to teams and user_teams
-- Purpose: Align database naming with frontend terminology and system architecture
-- Created: 2025-12-03

-- ============================================================
-- Step 1: Create new tables with renamed structure
-- ============================================================

-- Create new teams table (replacing groups)
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    team_id VARCHAR(8) UNIQUE NOT NULL,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_team_id ON teams(team_id);
CREATE INDEX idx_teams_organization_id ON teams(organization_id);

-- Create new user_teams table (replacing user_groups)
CREATE TABLE user_teams (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role organization_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, team_id)
);

CREATE INDEX idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX idx_user_teams_team_id ON user_teams(team_id);

-- ============================================================
-- Step 2: Copy data from old tables to new tables
-- ============================================================

INSERT INTO teams (id, team_id, organization_id, name, description, created_by, created_at, updated_at)
SELECT id, group_id, organization_id, name, description, created_by, created_at, updated_at
FROM groups
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_teams (id, user_id, team_id, role, created_at)
SELECT id, user_id, group_id, role, created_at
FROM user_groups
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Step 3: Update foreign keys and constraints
-- ============================================================

-- First, remove FK constraints that reference the old tables
-- Do this BEFORE dropping the old tables
ALTER TABLE IF EXISTS team_product_quotas 
    DROP CONSTRAINT IF EXISTS team_product_quotas_team_id_fkey;

-- Update team_product_quotas to use new teams table
ALTER TABLE team_product_quotas
    ADD CONSTRAINT team_product_quotas_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================
-- Step 4: Drop old tables
-- ============================================================

-- Drop old user_groups table first (it references groups)
DROP TABLE IF EXISTS user_groups CASCADE;

-- Drop old groups table
DROP TABLE IF EXISTS groups CASCADE;

-- ============================================================
-- Step 7: Verify data integrity
-- ============================================================

-- Verify all data was migrated correctly
-- SELECT COUNT(*) as teams_count FROM teams;
-- SELECT COUNT(*) as user_teams_count FROM user_teams;
-- SELECT COUNT(*) as team_quotas_count FROM team_product_quotas;

