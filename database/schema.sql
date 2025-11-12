-- Allowance Database Schema
-- Complete database schema for the allowance authorization management system
-- This file combines all migrations into a single comprehensive schema

-- Create ENUM types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE user_tier AS ENUM ('free', 'standard', 'premium');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE organization_role AS ENUM ('member', 'leader', 'admin');

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    uid VARCHAR(16) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_status ON users(status);

-- Roles table (predefined roles: free_user, standard_employee, team_leader, admin)
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
    resource VARCHAR(50),  -- e.g., 'user', 'team', 'product', 'admin'
    action VARCHAR(50),    -- e.g., 'read', 'create', 'approve'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission association (many-to-many)
CREATE TABLE role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- User-Role association (supports multiple roles per user)
CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope JSONB DEFAULT '{}',  -- Additional scope info (e.g., team_id, org_id)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Email tokens table (for activation, password reset)
CREATE TABLE email_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL,  -- 'activation', 'password_reset'
    email VARCHAR(255),  -- Target email (may differ from user's current email)
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_tokens_token ON email_tokens(token);
CREATE INDEX idx_email_tokens_expires_at ON email_tokens(expires_at);

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

-- Groups/Departments table
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

-- Approval requests table
CREATE TABLE approval_requests (
    id BIGSERIAL PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,  -- 'org_binding', 'team_join', 'template_approval', etc.
    requester_id BIGINT NOT NULL REFERENCES users(id),
    target_id BIGINT,  -- organization/group/etc. ID
    target_data JSONB DEFAULT '{}',  -- Additional request data
    status approval_status NOT NULL DEFAULT 'pending',
    approved_by BIGINT REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_approval_requests_requester_id ON approval_requests(requester_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_created_at ON approval_requests(created_at);

-- Audit logs table (lightweight logging)
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

-- Products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_product_id ON products(product_id);

-- Product versions (Basic, Pro, Enterprise, etc.)
CREATE TABLE product_versions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version_name VARCHAR(50) NOT NULL,  -- 'basic', 'pro', 'enterprise'
    description TEXT,
    features JSONB DEFAULT '{}',  -- Features and quotas: {"max_forms": 100, "ai_enabled": true}
    tier_required user_tier NOT NULL,  -- Minimum tier to use this version
    daily_limit INT,  -- Daily usage limit (NULL = unlimited)
    monthly_limit INT,  -- Monthly usage limit (NULL = unlimited)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, version_name)
);

CREATE INDEX idx_product_versions_product_id ON product_versions(product_id);

-- User licenses (authorization for a user to use a product version)
CREATE TABLE user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_version_id BIGINT NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
    license_key VARCHAR(500) UNIQUE NOT NULL,  -- JWT-formatted license key
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    daily_usage INT DEFAULT 0,  -- Current day usage count
    monthly_usage INT DEFAULT 0,  -- Current month usage count
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',  -- Additional license data
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX idx_user_licenses_license_key ON user_licenses(license_key);
CREATE INDEX idx_user_licenses_expires_at ON user_licenses(expires_at);

-- License usage history (optional: for audit trail)
CREATE TABLE license_usage_history (
    id BIGSERIAL PRIMARY KEY,
    license_id BIGINT NOT NULL REFERENCES user_licenses(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,  -- 'used', 'reset_daily', 'reset_monthly'
    usage_count INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_usage_history_license_id ON license_usage_history(license_id);
CREATE INDEX idx_license_usage_history_created_at ON license_usage_history(created_at);

-- Payment intents table
CREATE TABLE payment_intents (
    id VARCHAR(50) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,  -- in cents (e.g., 999 = $9.99)
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,  -- pending, succeeded, failed
    product_tier VARCHAR(50) NOT NULL,
    billing_period_months INTEGER NOT NULL DEFAULT 1,
    stripe_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_stripe_intent_id ON payment_intents(stripe_intent_id);

-- Subscriptions table
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,  -- free, pro, enterprise
    status VARCHAR(20) NOT NULL,  -- active, canceled, suspended
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Invoices table
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,  -- in cents
    status VARCHAR(20) NOT NULL,  -- draft, sent, paid, failed
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    stripe_invoice_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

-- Stripe webhook events table for tracking
CREATE TABLE stripe_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_user_id ON stripe_webhook_events(user_id);
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);

-- Batch operations tracking table
CREATE TABLE license_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_id VARCHAR(255) NOT NULL UNIQUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    total_licenses INTEGER NOT NULL,
    generated_count INTEGER NOT NULL DEFAULT 0,
    revoked_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL,  -- pending, processing, completed, failed
    product_id VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_license_batches_batch_id ON license_batches(batch_id);
CREATE INDEX idx_license_batches_status ON license_batches(status);
CREATE INDEX idx_license_batches_created_by ON license_batches(created_by);

-- Bulk operations audit log
CREATE TABLE bulk_operations (
    id BIGSERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,  -- generate, revoke, export
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id VARCHAR(255),
    records_affected INTEGER,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bulk_operations_user_id ON bulk_operations(user_id);
CREATE INDEX idx_bulk_operations_operation_type ON bulk_operations(operation_type);
CREATE INDEX idx_bulk_operations_created_at ON bulk_operations(created_at);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_users_status_tier ON users(status, tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_renew ON subscriptions(auto_renew) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_licenses_status_expires_at ON user_licenses(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_licenses_user_id_status ON user_licenses(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_status ON payment_intents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON role_permissions(role_id, permission_id);

-- Insert default roles
INSERT INTO roles (code, name, description) VALUES
    ('free_user', 'Free Trial User', 'User with free tier access'),
    ('standard_employee', 'Standard Employee', 'Paid user with standard permissions'),
    ('team_leader', 'Team Leader', 'Employee with team management permissions'),
    ('admin', 'System Administrator', 'Full system access');

-- Insert default permissions
INSERT INTO permissions (code, name, description, resource, action) VALUES
    -- User permissions
    ('user:read', 'Read User Profile', 'Can read own profile', 'user', 'read'),
    ('user:update', 'Update User Profile', 'Can update own profile', 'user', 'update'),

    -- Product permissions
    ('product:list', 'List Products', 'Can view available products', 'product', 'list'),
    ('product:license_generate', 'Generate License', 'Can generate product license', 'product', 'license_generate'),

    -- Team permissions
    ('team:create', 'Create Team', 'Can create a new team', 'team', 'create'),
    ('team:list', 'List Teams', 'Can list teams', 'team', 'list'),
    ('team:approve_join', 'Approve Team Join', 'Can approve team join requests', 'team', 'approve'),
    ('team:approve_license', 'Approve Team License', 'Can approve license requests for team', 'team', 'approve_license'),

    -- Organization permissions
    ('org:list', 'List Organizations', 'Can list organizations', 'org', 'list'),
    ('org:join', 'Join Organization', 'Can request to join organization', 'org', 'join'),

    -- Admin permissions
    ('admin:user_manage', 'Manage Users', 'Can manage all users', 'admin', 'user_manage'),
    ('admin:role_assign', 'Assign Roles', 'Can assign roles to users', 'admin', 'role_assign'),
    ('admin:approval_process', 'Process Approvals', 'Can approve/reject requests', 'admin', 'approval_process'),
    ('admin:system_config', 'System Configuration', 'Can configure system settings', 'admin', 'system_config');

-- Assign permissions to roles
-- Free user
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'free_user' AND p.code IN ('user:read', 'product:list', 'org:list');

-- Standard employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'standard_employee' AND p.code IN ('user:read', 'user:update', 'product:list', 'product:license_generate', 'team:list', 'org:list');

-- Team leader
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'team_leader' AND p.code IN ('user:read', 'user:update', 'product:list', 'product:license_generate', 'team:create', 'team:list', 'team:approve_join', 'team:approve_license', 'org:list');

-- Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'admin';

-- Insert sample products and versions
INSERT INTO products (product_id, name, description) VALUES
    ('form-001', 'Form Builder', 'Online form creation and management tool');

INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
        SELECT p.id, 'basic', 'Basic form building',
            '{"max_forms": 10, "ai_enabled": false, "storage_gb": 1}'::jsonb,
            'free'::user_tier, 3, 100
        FROM products p WHERE p.product_id = 'form-001'

        UNION ALL

        SELECT p.id, 'pro', 'Professional form building with AI',
            '{"max_forms": 100, "ai_enabled": true, "storage_gb": 50}'::jsonb,
            'standard'::user_tier, 100, 10000
        FROM products p WHERE p.product_id = 'form-001'

        UNION ALL

        SELECT p.id, 'enterprise', 'Enterprise form solution',
            '{"max_forms": 1000, "ai_enabled": true, "storage_gb": 500, "api_access": true}'::jsonb,
            'premium'::user_tier, NULL, NULL
        FROM products p WHERE p.product_id = 'form-001';