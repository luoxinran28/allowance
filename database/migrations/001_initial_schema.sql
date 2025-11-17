-- Migration 001: Initial Schema
-- Creates core tables for user management, RBAC, and organization structure
-- Status: Foundation (required for all other migrations)

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
