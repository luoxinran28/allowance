-- Complete Three-Tier Authorization Schema
-- Consolidated migration for Allowance System
-- Created: 2025-12-01
-- Architecture: Organization → Team → User quota-based license allocation

-- ============================================================
-- ENUM Types
-- ============================================================
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE user_tier AS ENUM ('free', 'standard', 'premium');
CREATE TYPE organization_role AS ENUM ('member', 'leader', 'admin');

-- ============================================================
-- Core Tables: Users, Roles, Permissions
-- ============================================================

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    uid VARCHAR(16) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tier user_tier NOT NULL DEFAULT 'free',
    status user_status NOT NULL DEFAULT 'active',
    source_upid VARCHAR(50),
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_source_upid ON users(source_upid);
CREATE INDEX idx_users_tier_status ON users(tier, status);

-- Roles table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    resource VARCHAR(50),
    action VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission association
CREATE TABLE role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- User-Role association
CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Email tokens table
CREATE TABLE email_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_tokens_token ON email_tokens(token);
CREATE INDEX idx_email_tokens_expires_at ON email_tokens(expires_at);

-- ============================================================
-- Organization & Team Structure
-- ============================================================

-- Organizations table
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    org_id VARCHAR(8) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_org_id ON organizations(org_id);

-- Groups/Teams table
CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    group_id VARCHAR(8) UNIQUE NOT NULL,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_group_id ON groups(group_id);
CREATE INDEX idx_groups_organization_id ON groups(organization_id);

-- User-Group membership
CREATE TABLE user_groups (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role organization_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);

-- ============================================================
-- Product Catalog
-- ============================================================

-- Products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    upid VARCHAR(16) UNIQUE NOT NULL,
    product_slug VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_upid ON products(upid);
CREATE INDEX idx_products_slug ON products(product_slug);

-- Product versions
CREATE TABLE product_versions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version_name VARCHAR(50) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '{}',
    tier_required user_tier NOT NULL,
    daily_limit INT,
    monthly_limit INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, version_name)
);

CREATE INDEX idx_product_versions_product_id ON product_versions(product_id);

-- ============================================================
-- Three-Tier License Architecture
-- ============================================================

-- Organization product licenses (Tier 1: Organization pool)
CREATE TABLE org_product_licenses (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    total_count INT NOT NULL DEFAULT 1,
    assigned_count INT NOT NULL DEFAULT 0,
    available_count INT GENERATED ALWAYS AS (total_count - assigned_count) STORED,
    expires_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, product_id),
    CONSTRAINT chk_org_license_counts CHECK (
        total_count >= 0 
        AND assigned_count >= 0 
        AND available_count >= 0
        AND assigned_count <= total_count
        AND available_count = total_count - assigned_count
    )
);

CREATE INDEX idx_org_product_licenses_org_id ON org_product_licenses(organization_id);
CREATE INDEX idx_org_product_licenses_product_id ON org_product_licenses(product_id);
CREATE INDEX idx_org_product_licenses_expires_at ON org_product_licenses(expires_at);
CREATE INDEX idx_org_licenses_assigned ON org_product_licenses(assigned_count);

-- Team product quotas (Tier 2: Team allocation from org pool)
CREATE TABLE team_product_quotas (
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
    CONSTRAINT chk_team_quota_counts CHECK (
        allocated_count >= 0 
        AND used_count >= 0 
        AND used_count <= allocated_count
    )
);

CREATE INDEX idx_team_quotas_team_id ON team_product_quotas(team_id);
CREATE INDEX idx_team_quotas_org_id ON team_product_quotas(org_id);
CREATE INDEX idx_team_quotas_product_id ON team_product_quotas(product_id);
CREATE INDEX idx_team_quotas_upid ON team_product_quotas(upid);
CREATE INDEX idx_team_product_quotas_product_upid ON team_product_quotas(product_id, upid);

-- Free user licenses (Tier 3: Individual free tier)
CREATE TABLE free_user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upid VARCHAR(50) NOT NULL,
    license_key TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_free_user_licenses_upid ON free_user_licenses(upid);
CREATE INDEX idx_free_user_licenses_user ON free_user_licenses(user_id);
CREATE INDEX idx_free_user_licenses_product ON free_user_licenses(product_id);
CREATE INDEX idx_free_user_licenses_user_product ON free_user_licenses(user_id, product_id);

-- User license history (Audit trail)
CREATE TABLE user_license_history (
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

CREATE INDEX idx_license_history_user ON user_license_history(user_id);
CREATE INDEX idx_license_history_action ON user_license_history(action);
CREATE INDEX idx_license_history_changed_at ON user_license_history(changed_at);

-- ============================================================
-- Payment & Subscription Tables
-- ============================================================

-- Payment intents
CREATE TABLE payment_intents (
    id VARCHAR(50) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    product_tier VARCHAR(50) NOT NULL,
    billing_period_months INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);

-- Subscriptions
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_auto_renew ON subscriptions(auto_renew) WHERE status = 'active';
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Invoices
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_intent_id VARCHAR(50) REFERENCES payment_intents(id) ON DELETE SET NULL,
    subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_payment_intent_id ON invoices(payment_intent_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================================
-- Batch Operations Tracking
-- ============================================================

CREATE TABLE batch_license_operations (
    id BIGSERIAL PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    initiated_by BIGINT NOT NULL REFERENCES users(id),
    total_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_batch_ops_batch_id ON batch_license_operations(batch_id);
CREATE INDEX idx_batch_ops_initiated_by ON batch_license_operations(initiated_by);
CREATE INDEX idx_batch_ops_status ON batch_license_operations(status);

-- ============================================================
-- Audit Logs
-- ============================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(50),
    resource_id BIGINT,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- Seed Data: Roles & Permissions
-- ============================================================

-- Insert default roles
INSERT INTO roles (code, name, description) VALUES
    ('free_user', 'Free Trial User', 'User with free tier access'),
    ('standard_employee', 'Standard Employee', 'Paid user with standard permissions'),
    ('team_leader', 'Team Leader', 'Employee with team management permissions'),
    ('admin', 'System Administrator', 'Full system access');

-- Insert default permissions
INSERT INTO permissions (code, name, description, resource, action) VALUES
    ('user:read', 'Read User Profile', 'Can read own profile', 'user', 'read'),
    ('user:update', 'Update User Profile', 'Can update own profile', 'user', 'update'),
    ('product:list', 'List Products', 'Can view available products', 'product', 'list'),
    ('product:license_generate', 'Generate License', 'Can generate product license', 'product', 'license_generate'),
    ('team:create', 'Create Team', 'Can create a new team', 'team', 'create'),
    ('team:list', 'List Teams', 'Can list teams', 'team', 'list'),
    ('team:approve_join', 'Approve Team Join', 'Can approve team join requests', 'team', 'approve'),
    ('team:approve_license', 'Approve Team License', 'Can approve license requests for team', 'team', 'approve_license'),
    ('org:list', 'List Organizations', 'Can list organizations', 'org', 'list'),
    ('org:join', 'Join Organization', 'Can request to join organization', 'org', 'join'),
    ('admin:user_manage', 'Manage Users', 'Can manage all users', 'admin', 'user_manage'),
    ('admin:role_assign', 'Assign Roles', 'Can assign roles to users', 'admin', 'role_assign'),
    ('admin:system_config', 'System Configuration', 'Can configure system settings', 'admin', 'system_config');

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'free_user' AND p.code IN ('user:read', 'product:list', 'org:list');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'standard_employee' AND p.code IN ('user:read', 'user:update', 'product:list', 'product:license_generate', 'team:list', 'org:list');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'team_leader' AND p.code IN ('user:read', 'user:update', 'product:list', 'product:license_generate', 'team:create', 'team:list', 'team:approve_join', 'team:approve_license', 'org:list');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'admin';

-- ============================================================
-- Seed Data: Default Product
-- ============================================================

INSERT INTO products (upid, product_slug, name, description) VALUES
    ('UALLOWANCE0001', 'allowance', 'Allowance System', 'Core allowance authorization management system')
ON CONFLICT (upid) DO NOTHING;

INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
SELECT p.id, 'basic', 'Basic allowance features',
    '{"max_recipients": 10, "reporting": false, "automation": false}'::jsonb,
    'free'::user_tier, 10, 1000
FROM products p WHERE p.upid = 'UALLOWANCE0001'
UNION ALL
SELECT p.id, 'standard', 'Standard allowance with reporting',
    '{"max_recipients": 100, "reporting": true, "automation": false}'::jsonb,
    'standard'::user_tier, 100, 10000
FROM products p WHERE p.upid = 'UALLOWANCE0001'
UNION ALL
SELECT p.id, 'premium', 'Premium allowance with full features',
    '{"max_recipients": 1000, "reporting": true, "automation": true, "api_access": true}'::jsonb,
    'premium'::user_tier, NULL, NULL
FROM products p WHERE p.upid = 'UALLOWANCE0001'
ON CONFLICT (product_id, version_name) DO NOTHING;
