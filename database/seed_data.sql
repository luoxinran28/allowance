-- Seed Data: Test Users and Initial Data
-- Comprehensive test data for development and testing purposes
-- Run after all migrations have been applied

-- Note: Password hashes are for "TestPass123"
-- In production, use actual Argon2 hashing

-- Create test users with different tiers and roles
INSERT INTO users (
    uid,
    email,
    password_hash,
    tier,
    status,
    profile_data,
    created_at,
    updated_at
) VALUES
    -- Admin users
    ('UTESTADM001', 'admin@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'premium', 'active',
     '{"first_name": "System", "last_name": "Admin", "department": "IT", "role": "Administrator", "phone": "+1-555-0100"}',
     CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP),

    ('UTESTADM002', 'superadmin@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'premium', 'active',
     '{"first_name": "Super", "last_name": "Admin", "department": "IT", "role": "Super Administrator", "phone": "+1-555-0101"}',
     CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP),

    -- Standard tier users
    ('UTESTSTD001', 'user@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'standard', 'active',
     '{"first_name": "John", "last_name": "Doe", "department": "Engineering", "role": "Software Engineer", "phone": "+1-555-0200"}',
     CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP),

    ('UTESTSTD002', 'jane.smith@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'standard', 'active',
     '{"first_name": "Jane", "last_name": "Smith", "department": "Marketing", "role": "Marketing Manager", "phone": "+1-555-0201"}',
     CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP),

    ('UTESTSTD003', 'bob.wilson@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'standard', 'active',
     '{"first_name": "Bob", "last_name": "Wilson", "department": "Sales", "role": "Sales Representative", "phone": "+1-555-0202"}',
     CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP),

    -- Premium tier users
    ('UTESTPRM001', 'sarah.johnson@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'premium', 'active',
     '{"first_name": "Sarah", "last_name": "Johnson", "department": "Product", "role": "Product Manager", "phone": "+1-555-0300"}',
     CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP),

    ('UTESTPRM002', 'mike.davis@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'premium', 'active',
     '{"first_name": "Mike", "last_name": "Davis", "department": "Engineering", "role": "Tech Lead", "phone": "+1-555-0301"}',
     CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP),

    -- Free tier users
    ('UTESTFRE001', 'free@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'free', 'active',
     '{"first_name": "Free", "last_name": "User", "department": "Trial", "role": "Trial User", "phone": "+1-555-0400"}',
     CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP),

    ('UTESTFRE002', 'trial.user@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'free', 'active',
     '{"first_name": "Trial", "last_name": "User", "department": "Trial", "role": "Trial User", "phone": "+1-555-0401"}',
     CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP),

    -- Suspended user
    ('UTESTSUS001', 'suspended@test.com', '$argon2id$v=19$m=19456,t=2,p=1$eVEBPWjt24iWOXM+W/2JNA$po+YfCHkCkZAaUx9jrCx8Nj8WOwym3KB0xY+YB3q9Q0', 'free', 'suspended',
     '{"first_name": "Suspended", "last_name": "User", "department": "Suspended", "role": "Suspended User"}',
     CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to test users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email IN ('admin@test.com', 'superadmin@test.com') AND r.code = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email IN ('user@test.com', 'jane.smith@test.com', 'bob.wilson@test.com') AND r.code = 'standard_employee'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email IN ('sarah.johnson@test.com', 'mike.davis@test.com') AND r.code = 'team_leader'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email IN ('free@test.com', 'trial.user@test.com', 'suspended@test.com') AND r.code = 'free_user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Create test organizations
INSERT INTO organizations (org_id, name, description, created_by) VALUES
    ('TECHCORP', 'TechCorp Inc.', 'Leading technology solutions provider', (SELECT id FROM users WHERE email = 'admin@test.com')),
    ('DIGITAL', 'Digital Solutions LLC', 'Digital transformation experts', (SELECT id FROM users WHERE email = 'superadmin@test.com')),
    ('STARTUP', 'StartupXYZ', 'Innovative startup company', (SELECT id FROM users WHERE email = 'sarah.johnson@test.com'))
ON CONFLICT (org_id) DO NOTHING;

-- Create test groups/departments
INSERT INTO groups (group_id, organization_id, name, description, created_by) VALUES
    ('TECH-ENG', (SELECT id FROM organizations WHERE org_id = 'TECHCORP'), 'Engineering', 'Software development team',
     (SELECT id FROM users WHERE email = 'admin@test.com')),
    ('TECH-MKT', (SELECT id FROM organizations WHERE org_id = 'TECHCORP'), 'Marketing', 'Marketing and sales team',
     (SELECT id FROM users WHERE email = 'admin@test.com')),
    ('DIGITAL-PD', (SELECT id FROM organizations WHERE org_id = 'DIGITAL'), 'Product', 'Product management team',
     (SELECT id FROM users WHERE email = 'superadmin@test.com')),
    ('STARTUP-ALL', (SELECT id FROM organizations WHERE org_id = 'STARTUP'), 'All Hands', 'Full company team',
     (SELECT id FROM users WHERE email = 'sarah.johnson@test.com'))
ON CONFLICT (group_id) DO NOTHING;

-- Assign users to groups
INSERT INTO user_groups (user_id, group_id, role) VALUES
    ((SELECT id FROM users WHERE email = 'user@test.com'), (SELECT id FROM groups WHERE group_id = 'TECH-ENG'), 'member'),
    ((SELECT id FROM users WHERE email = 'jane.smith@test.com'), (SELECT id FROM groups WHERE group_id = 'TECH-MKT'), 'leader'),
    ((SELECT id FROM users WHERE email = 'bob.wilson@test.com'), (SELECT id FROM groups WHERE group_id = 'TECH-MKT'), 'member'),
    ((SELECT id FROM users WHERE email = 'sarah.johnson@test.com'), (SELECT id FROM groups WHERE group_id = 'DIGITAL-PD'), 'leader'),
    ((SELECT id FROM users WHERE email = 'mike.davis@test.com'), (SELECT id FROM groups WHERE group_id = 'DIGITAL-PD'), 'member'),
    ((SELECT id FROM users WHERE email = 'free@test.com'), (SELECT id FROM groups WHERE group_id = 'STARTUP-ALL'), 'member')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Create additional test products with UPID support
-- UPID Format: U + 13-character code (14 chars total)
-- Products are only identified by UPID, no internal product_id
INSERT INTO products (name, description, owner_id, upid) VALUES
    ('Allowance System', 'Core allowance authorization management system',
     (SELECT id FROM users WHERE email = 'admin@test.com'), 'UALLOWANCE0001')
ON CONFLICT (upid) DO NOTHING;

-- Create product versions for all products
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
SELECT p.id, 'basic', 'Basic form building',
    '{"max_forms": 10, "ai_enabled": false, "storage_gb": 1}'::jsonb, 'free'::user_tier, 3, 100
FROM products p WHERE p.upid = 'UALLOWANCE0001'
UNION ALL
SELECT p.id, 'pro', 'Professional form building with AI',
    '{"max_forms": 100, "ai_enabled": true, "storage_gb": 50}'::jsonb, 'standard'::user_tier, 100, 10000
FROM products p WHERE p.upid = 'UALLOWANCE0001'
UNION ALL
SELECT p.id, 'enterprise', 'Enterprise form solution',
    '{"max_forms": 1000, "ai_enabled": true, "storage_gb": 500, "api_access": true}'::jsonb, 'premium'::user_tier, NULL, NULL
FROM products p WHERE p.upid = 'UALLOWANCE0001'
ON CONFLICT (product_id, version_name) DO NOTHING;

-- Create test licenses for users
INSERT INTO user_licenses (user_id, product_version_id, license_key, starts_at, expires_at, daily_usage, monthly_usage, metadata)
SELECT
    u.id,
    pv.id,
    CONCAT('license-', u.uid, '-', pv.version_name, '-', EXTRACT(epoch FROM CURRENT_TIMESTAMP)::text),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    CASE WHEN pv.daily_limit IS NOT NULL THEN FLOOR(RANDOM() * pv.daily_limit / 2) ELSE 0 END,
    CASE WHEN pv.monthly_limit IS NOT NULL THEN FLOOR(RANDOM() * pv.monthly_limit / 2) ELSE 0 END,
    '{"auto_renew": true, "source": "seed_data"}'::jsonb
FROM users u
CROSS JOIN product_versions pv
WHERE u.tier::text = pv.tier_required::text
  AND u.status = 'active'
  AND RANDOM() < 0.7
ON CONFLICT (license_key) DO NOTHING;

-- Create test subscriptions for paid users
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end, auto_renew, created_at, updated_at)
SELECT
    u.id,
    u.tier,
    CASE
        WHEN u.status = 'active' THEN 'active'
        WHEN u.status = 'suspended' THEN 'canceled'
        ELSE 'active'
    END,
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP + INTERVAL '335 days',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.tier != 'free'
ON CONFLICT (user_id) DO NOTHING;

-- Summary information
SELECT 
    COUNT(DISTINCT CASE WHEN tier='admin' THEN 1 END) as admin_users,
    COUNT(DISTINCT CASE WHEN tier='premium' THEN 1 END) as premium_users,
    COUNT(DISTINCT CASE WHEN tier='standard' THEN 1 END) as standard_users,
    COUNT(DISTINCT CASE WHEN tier='free' THEN 1 END) as free_users,
    COUNT(DISTINCT CASE WHEN status='active' THEN 1 END) as active_users,
    COUNT(*) as total_users
FROM users
WHERE email LIKE '%@test.com';
