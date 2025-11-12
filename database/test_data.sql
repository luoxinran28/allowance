-- Comprehensive Test Data for Allowance Database
-- This file creates extensive test data for development and testing purposes
-- Run this script after running schema.sql

-- Note: Password hashes below are for "TestPass123"
-- In a real scenario, you'd generate these with the actual Argon2 hashing

-- Create additional test users with different tiers and roles
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

-- Create additional test products
INSERT INTO products (product_id, name, description, owner_id) VALUES
    ('survey-001', 'Survey Builder', 'Advanced survey creation and analytics platform',
     (SELECT id FROM users WHERE email = 'admin@test.com')),
    ('doc-001', 'Document Generator', 'AI-powered document generation tool',
     (SELECT id FROM users WHERE email = 'superadmin@test.com')),
    ('analytics-001', 'Business Analytics', 'Comprehensive business intelligence dashboard',
     (SELECT id FROM users WHERE email = 'sarah.johnson@test.com')),
    ('crm-001', 'Customer Relationship Manager', 'Complete CRM solution for businesses',
     (SELECT id FROM users WHERE email = 'mike.davis@test.com'))
ON CONFLICT (product_id) DO NOTHING;

-- Create product versions for the new products
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
SELECT p.id, 'starter', 'Entry-level features',
    '{"responses": 100, "questions": 10, "themes": 3}'::jsonb, 'free'::user_tier, 10, 500
FROM products p WHERE p.product_id = 'survey-001'
UNION ALL
SELECT p.id, 'professional', 'Professional survey tools',
    '{"responses": 1000, "questions": 50, "themes": 10, "analytics": true}'::jsonb, 'standard'::user_tier, 100, 5000
FROM products p WHERE p.product_id = 'survey-001'
UNION ALL
SELECT p.id, 'enterprise', 'Enterprise survey platform',
    '{"responses": -1, "questions": -1, "themes": -1, "analytics": true, "api": true, "white_label": true}'::jsonb, 'premium'::user_tier, NULL, NULL
FROM products p WHERE p.product_id = 'survey-001'

UNION ALL
SELECT p.id, 'basic', 'Basic document generation',
    '{"templates": 5, "documents": 50}'::jsonb, 'free'::user_tier, 5, 100
FROM products p WHERE p.product_id = 'doc-001'
UNION ALL
SELECT p.id, 'premium', 'Advanced document generation with AI',
    '{"templates": 50, "documents": 1000, "ai_assistant": true}'::jsonb, 'premium'::user_tier, 50, 2000
FROM products p WHERE p.product_id = 'doc-001'

UNION ALL
SELECT p.id, 'standard', 'Standard analytics dashboard',
    '{"dashboards": 5, "data_sources": 3, "users": 10}'::jsonb, 'standard'::user_tier, 100, 3000
FROM products p WHERE p.product_id = 'analytics-001'
UNION ALL
SELECT p.id, 'enterprise', 'Enterprise analytics platform',
    '{"dashboards": -1, "data_sources": -1, "users": -1, "advanced_analytics": true}'::jsonb, 'premium'::user_tier, NULL, NULL
FROM products p WHERE p.product_id = 'analytics-001'

UNION ALL
SELECT p.id, 'small_business', 'CRM for small businesses',
    '{"contacts": 500, "deals": 100, "email_integration": true}'::jsonb, 'standard'::user_tier, 50, 1500
FROM products p WHERE p.product_id = 'crm-001'
UNION ALL
SELECT p.id, 'enterprise_crm', 'Enterprise CRM solution',
    '{"contacts": -1, "deals": -1, "email_integration": true, "api": true, "custom_fields": true}'::jsonb, 'premium'::user_tier, NULL, NULL
FROM products p WHERE p.product_id = 'crm-001'
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
    '{"auto_renew": true, "source": "test_data"}'::jsonb
FROM users u
CROSS JOIN product_versions pv
WHERE u.tier::text = pv.tier_required::text
  AND u.status = 'active'
  AND RANDOM() < 0.7  -- 70% chance of having a license
ON CONFLICT (license_key) DO NOTHING;

-- Create test subscriptions
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end, auto_renew, stripe_subscription_id)
SELECT
    u.id,
    u.tier,
    CASE
        WHEN u.status = 'active' THEN 'active'
        WHEN u.status = 'suspended' THEN 'canceled'
        ELSE 'active'
    END,
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP + INTERVAL '335 days', -- ~11 months from now
    true,
    CASE WHEN u.tier != 'free' THEN CONCAT('sub_test_', u.uid) ELSE NULL END
FROM users u
WHERE u.tier != 'free'
ON CONFLICT (user_id) DO NOTHING;

-- Create test payment intents
INSERT INTO payment_intents (id, user_id, amount, currency, status, product_tier, billing_period_months, stripe_intent_id, created_at, updated_at)
SELECT
    CONCAT('pi_test_', u.uid, '_', EXTRACT(epoch FROM CURRENT_TIMESTAMP)::text),
    u.id,
    CASE
        WHEN u.tier = 'standard' THEN 99900  -- $999
        WHEN u.tier = 'premium' THEN 199900  -- $1999
        ELSE 0
    END,
    'USD',
    'succeeded',
    u.tier,
    12,
    CONCAT('pi_stripe_', u.uid),
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '29 days'
FROM users u
WHERE u.tier != 'free'
ON CONFLICT (id) DO NOTHING;

-- Create test invoices
INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, paid_date, stripe_invoice_id, created_at)
SELECT
    s.user_id,
    s.id,
    CASE
        WHEN s.tier = 'standard' THEN 99900
        WHEN s.tier = 'premium' THEN 199900
        ELSE 0
    END,
    'paid',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '29 days',
    CONCAT('inv_stripe_', u.uid),
    CURRENT_TIMESTAMP - INTERVAL '30 days'
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.tier != 'free'
ON CONFLICT DO NOTHING;

-- Create test approval requests
INSERT INTO approval_requests (request_type, requester_id, target_id, target_data, status, approved_by, created_at, expires_at)
SELECT
    'org_binding',
    u.id,
    o.id,
    jsonb_build_object('reason', 'Requesting access to organization resources', 'department', 'Engineering'),
    CASE
        WHEN RANDOM() < 0.7 THEN 'approved'
        WHEN RANDOM() < 0.8 THEN 'pending'
        ELSE 'rejected'
    END,
    CASE WHEN RANDOM() < 0.7 THEN (SELECT id FROM users WHERE email = 'admin@test.com') ELSE NULL END,
    CURRENT_TIMESTAMP - INTERVAL '10 days' + (RANDOM() * INTERVAL '20 days'),
    CURRENT_TIMESTAMP - INTERVAL '10 days' + (RANDOM() * INTERVAL '20 days') + INTERVAL '30 days'
FROM users u
CROSS JOIN organizations o
WHERE u.tier != 'free'
  AND RANDOM() < 0.4  -- 40% chance of having approval requests
ON CONFLICT DO NOTHING;

-- Create test audit logs
INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, created_at)
SELECT
    u.id,
    CASE
        WHEN RANDOM() < 0.3 THEN 'login'
        WHEN RANDOM() < 0.5 THEN 'license_generated'
        WHEN RANDOM() < 0.7 THEN 'profile_updated'
        WHEN RANDOM() < 0.9 THEN 'password_changed'
        ELSE 'license_used'
    END,
    CASE
        WHEN RANDOM() < 0.4 THEN 'user'
        WHEN RANDOM() < 0.7 THEN 'license'
        ELSE 'product'
    END,
    CASE WHEN RANDOM() < 0.5 THEN u.id ELSE NULL END,
    jsonb_build_object('user_agent', 'Mozilla/5.0 (Test Browser)', 'action_details', 'Test audit log entry'),
    CONCAT('192.168.1.', (RANDOM() * 255)::int),
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days')
FROM users u
WHERE RANDOM() < 0.8  -- 80% chance of having audit logs
ORDER BY RANDOM()
LIMIT 50;

-- Create test license usage history
INSERT INTO license_usage_history (license_id, action, usage_count, metadata, created_at)
SELECT
    ul.id,
    CASE
        WHEN RANDOM() < 0.6 THEN 'used'
        WHEN RANDOM() < 0.8 THEN 'reset_daily'
        ELSE 'reset_monthly'
    END,
    CASE
        WHEN RANDOM() < 0.7 THEN FLOOR(RANDOM() * 10) + 1
        ELSE NULL
    END,
    jsonb_build_object('ip_address', CONCAT('192.168.1.', (RANDOM() * 255)::int), 'user_agent', 'Test Client'),
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days')
FROM user_licenses ul
WHERE RANDOM() < 0.6  -- 60% chance of having usage history
ORDER BY RANDOM()
LIMIT 100;

-- Create test bulk operations
INSERT INTO bulk_operations (operation_type, user_id, batch_id, records_affected, status, error_message, created_at, completed_at)
SELECT
    CASE WHEN RANDOM() < 0.7 THEN 'generate' ELSE 'revoke' END,
    u.id,
    CONCAT('batch_', u.uid, '_', EXTRACT(epoch FROM CURRENT_TIMESTAMP)::text),
    FLOOR(RANDOM() * 50) + 1,
    CASE WHEN RANDOM() < 0.9 THEN 'completed' ELSE 'failed' END,
    CASE WHEN RANDOM() < 0.1 THEN 'Test error message' ELSE NULL END,
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'),
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days') + INTERVAL '5 minutes'
FROM users u
WHERE u.tier IN ('standard', 'premium')
  AND RANDOM() < 0.5  -- 50% chance of having bulk operations
ORDER BY RANDOM()
LIMIT 20;

-- Create corresponding license batches
INSERT INTO license_batches (batch_id, created_by, total_licenses, generated_count, revoked_count, status, product_id, tier, created_at, completed_at)
SELECT
    bo.batch_id,
    bo.user_id,
    bo.records_affected,
    CASE WHEN bo.operation_type = 'generate' THEN bo.records_affected ELSE 0 END,
    CASE WHEN bo.operation_type = 'revoke' THEN bo.records_affected ELSE 0 END,
    bo.status,
    'form-001',
    'standard',
    bo.created_at,
    bo.completed_at
FROM bulk_operations bo
WHERE bo.operation_type IN ('generate', 'revoke')
ON CONFLICT (batch_id) DO NOTHING;

-- Display summary of created test data
SELECT
    'Test Data Summary:' as info,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM organizations) as total_organizations,
    (SELECT COUNT(*) FROM groups) as total_groups,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM product_versions) as total_product_versions,
    (SELECT COUNT(*) FROM user_licenses) as total_licenses,
    (SELECT COUNT(*) FROM subscriptions WHERE tier != 'free') as total_subscriptions,
    (SELECT COUNT(*) FROM approval_requests) as total_approval_requests,
    (SELECT COUNT(*) FROM audit_logs) as total_audit_logs;

-- Display test user credentials
SELECT
    'Test User Credentials:' as info,
    u.email,
    'TestPass123' as password,
    u.tier,
    u.status,
    COALESCE(r.code, 'no role') as role_code,
    COALESCE(o.org_id, 'no org') as organization
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN user_groups ug ON u.id = ug.user_id
LEFT JOIN groups g ON ug.group_id = g.id
LEFT JOIN organizations o ON g.organization_id = o.id
WHERE u.email LIKE '%@test.com'
ORDER BY u.tier DESC, u.email;