-- Migration: 006_optimize_queries.sql
-- Add indexes for common query patterns to improve performance

-- User queries optimization
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_status_tier ON users(status, tier);

-- Subscription queries optimization
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_renew ON subscriptions(auto_renew) WHERE status = 'active';

-- License queries optimization
CREATE INDEX IF NOT EXISTS idx_licenses_status_expires_at ON licenses(status, expires_at) WHERE status != 'revoked';
CREATE INDEX IF NOT EXISTS idx_licenses_user_id_status ON licenses(user_id, status);

-- Payment intent optimization
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_status ON payment_intents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);

-- Invoice optimization
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_status ON invoices(user_id, status);

-- RBAC optimization
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON role_permissions(role_id, permission_id);

-- Team optimization
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id_status ON team_members(team_id, status);

-- Organization optimization
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
