-- Seed Data: Complete Test Data for Allowance System
-- Includes users with different roles, organizations, teams, products, and licenses
-- All test users use the same hashed password (for security, plain text is not stored)
-- Password hash is Argon2id with version 19, 19456 memory, 2 time cost, 1 parallelism

-- ============================================================
-- 1. CREATE TEST USERS WITH DIFFERENT ROLES
-- ============================================================

-- Admin user (full system access)
-- Password hash for Pass888999 (Argon2id: m=19456, t=2, p=1)
INSERT INTO users (
    uid, email, password_hash, tier, status, source_upid, profile_data, created_at, updated_at
) VALUES
    ('UADMIN0001', 'admin@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'premium', 'active', NULL,
     '{"first_name": "System", "last_name": "Admin", "role": "Administrator"}',
     CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Team Leader users (can manage teams and see team members)
INSERT INTO users (
    uid, email, password_hash, tier, status, source_upid, profile_data, created_at, updated_at
) VALUES
    ('ULEAD0001', 'leader1@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'standard', 'active', 'UALLOWANCE0001',
     '{"first_name": "Alice", "last_name": "Leader", "department": "Engineering"}',
     CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP),
    ('ULEAD0002', 'leader2@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'standard', 'active', 'UALLOWANCE0001',
     '{"first_name": "Bob", "last_name": "Manager", "department": "Sales"}',
     CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Regular team members (standard employees)
INSERT INTO users (
    uid, email, password_hash, tier, status, source_upid, profile_data, created_at, updated_at
) VALUES
    ('UMEM00001', 'member1@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'standard', 'active', 'UALLOWANCE0001',
     '{"first_name": "Charlie", "last_name": "Developer"}',
     CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP),
    ('UMEM00002', 'member2@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'standard', 'active', 'UPROD000001',
     '{"first_name": "Diana", "last_name": "Designer"}',
     CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_TIMESTAMP),
    ('UMEM00003', 'member3@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'standard', 'active', 'UPROD000002',
     '{"first_name": "Eve", "last_name": "Engineer"}',
     CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP),
    ('UMEM00004', 'member4@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'standard', 'active', 'UALLOWANCE0001',
     '{"first_name": "Frank", "last_name": "Analyst"}',
     CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Free tier user (limited access)
INSERT INTO users (
    uid, email, password_hash, tier, status, source_upid, profile_data, created_at, updated_at
) VALUES
    ('UFREE0001', 'free@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$PHa9Z7qkDXpEggftF04cQQ$l+6pK2zQUge9eD9wXb2oJi7w7JFSpDAZ94I+sbavkgk', 'free', 'active', 'UALLOWANCE0001',
     '{"first_name": "Grace", "last_name": "Trial"}',
     CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. ASSIGN ROLES TO USERS
-- ============================================================

-- Admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@allowance.test' AND r.code = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Team leader role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('leader1@allowance.test', 'leader2@allowance.test') AND r.code = 'team_leader'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Standard employee role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('member1@allowance.test', 'member2@allowance.test', 'member3@allowance.test', 'member4@allowance.test') 
  AND r.code = 'standard_employee'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Free user role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'free@allowance.test' AND r.code = 'free_user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================
-- 3. CREATE ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (org_id, name, description, created_by) VALUES
    ('ACME001', 'ACME Corporation', 'Main test organization for Allowance System', 
     (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('STARTUP01', 'StartupX', 'Second test organization',
     (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================
-- 4. CREATE TEAMS (GROUPS)
-- ============================================================

INSERT INTO groups (group_id, organization_id, name, description, created_by) VALUES
    ('ENGTEAM', (SELECT id FROM organizations WHERE org_id = 'ACME001'), 
     'Engineering Team', 'Main engineering team', 
     (SELECT id FROM users WHERE email = 'leader1@allowance.test')),
    ('SALES', (SELECT id FROM organizations WHERE org_id = 'ACME001'), 
     'Sales Team', 'Sales and marketing team',
     (SELECT id FROM users WHERE email = 'leader2@allowance.test')),
    ('STARTUP-DEV', (SELECT id FROM organizations WHERE org_id = 'STARTUP01'),
     'Development Team', 'StartupX development team',
     (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (group_id) DO NOTHING;

-- ============================================================
-- 5. ASSIGN USERS TO TEAMS
-- ============================================================

-- Engineering Team: leader1 as leader, member1, member2, member3 as members
INSERT INTO user_groups (user_id, group_id, role) VALUES
    ((SELECT id FROM users WHERE email = 'leader1@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'ENGTEAM'), 'leader'),
    ((SELECT id FROM users WHERE email = 'member1@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'ENGTEAM'), 'member'),
    ((SELECT id FROM users WHERE email = 'member2@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'ENGTEAM'), 'member'),
    ((SELECT id FROM users WHERE email = 'member3@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'ENGTEAM'), 'member')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Sales Team: leader2 as leader, member4 as member
INSERT INTO user_groups (user_id, group_id, role) VALUES
    ((SELECT id FROM users WHERE email = 'leader2@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'SALES'), 'leader'),
    ((SELECT id FROM users WHERE email = 'member4@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'SALES'), 'member')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- StartupX Team: admin as leader, free user as member (for testing mixed tiers)
INSERT INTO user_groups (user_id, group_id, role) VALUES
    ((SELECT id FROM users WHERE email = 'admin@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'STARTUP-DEV'), 'leader'),
    ((SELECT id FROM users WHERE email = 'free@allowance.test'), 
     (SELECT id FROM groups WHERE group_id = 'STARTUP-DEV'), 'member')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- ============================================================
-- 6. CREATE PRODUCTS (INCLUDING ALLOWANCE SYSTEM)
-- ============================================================

-- Allowance System product (the main product being tested)
INSERT INTO products (upid, product_slug, name, description, owner_id)
VALUES (
    'UALLOWANCE0001',
    'allowance',
    'Allowance System',
    'Core allowance authorization management system',
    (SELECT id FROM users WHERE email = 'admin@allowance.test')
)
ON CONFLICT (upid) DO NOTHING;

-- Additional test products
INSERT INTO products (upid, product_slug, name, description, owner_id)
VALUES 
    ('UPROD000001', 'analytics-pro', 'Analytics Pro', 'Advanced analytics and reporting tool',
     (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('UPROD000002', 'crm-suite', 'CRM Suite', 'Customer relationship management platform',
     (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (upid) DO NOTHING;

-- ============================================================
-- 7. CREATE PRODUCT VERSIONS
-- ============================================================

-- Allowance System versions
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

-- Analytics Pro versions
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
SELECT p.id, 'basic', 'Basic analytics',
    '{"dashboards": 5, "exports": "csv"}'::jsonb,
    'free'::user_tier, 50, 5000
FROM products p WHERE p.upid = 'UPROD000001'
UNION ALL
SELECT p.id, 'pro', 'Professional analytics',
    '{"dashboards": 50, "exports": "csv,excel,pdf", "custom_reports": true}'::jsonb,
    'standard'::user_tier, 500, 50000
FROM products p WHERE p.upid = 'UPROD000001'
ON CONFLICT (product_id, version_name) DO NOTHING;

-- CRM Suite versions
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
SELECT p.id, 'starter', 'CRM Starter',
    '{"contacts": 100, "pipelines": 2}'::jsonb,
    'free'::user_tier, 20, 2000
FROM products p WHERE p.upid = 'UPROD000002'
UNION ALL
SELECT p.id, 'business', 'CRM Business',
    '{"contacts": 10000, "pipelines": 20, "automation": true}'::jsonb,
    'standard'::user_tier, 1000, 100000
FROM products p WHERE p.upid = 'UPROD000002'
ON CONFLICT (product_id, version_name) DO NOTHING;

-- ============================================================
-- 8. GENERATE ORG PRODUCT LICENSES (LICENSE POOLS)
-- ============================================================

-- ACME Corp gets Allowance System licenses (50 total)
INSERT INTO org_product_licenses (
    organization_id, product_id, total_count, assigned_count, 
    expires_at, created_by, created_at, updated_at
)
SELECT 
    o.id,
    p.id,
    50,
    0,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    (SELECT id FROM users WHERE email = 'admin@allowance.test'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM organizations o, products p
WHERE o.org_id = 'ACME001' AND p.upid = 'UALLOWANCE0001'
ON CONFLICT (organization_id, product_id) DO UPDATE 
SET total_count = EXCLUDED.total_count;

-- ACME Corp gets Analytics Pro licenses (30 total)
INSERT INTO org_product_licenses (
    organization_id, product_id, total_count, assigned_count,
    expires_at, created_by, created_at, updated_at
)
SELECT 
    o.id,
    p.id,
    30,
    0,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    (SELECT id FROM users WHERE email = 'admin@allowance.test'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM organizations o, products p
WHERE o.org_id = 'ACME001' AND p.upid = 'UPROD000001'
ON CONFLICT (organization_id, product_id) DO UPDATE 
SET total_count = EXCLUDED.total_count;

-- StartupX gets Allowance System licenses (10 total)
INSERT INTO org_product_licenses (
    organization_id, product_id, total_count, assigned_count,
    expires_at, created_by, created_at, updated_at
)
SELECT 
    o.id,
    p.id,
    10,
    0,
    CURRENT_TIMESTAMP + INTERVAL '6 months',
    (SELECT id FROM users WHERE email = 'admin@allowance.test'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM organizations o, products p
WHERE o.org_id = 'STARTUP01' AND p.upid = 'UALLOWANCE0001'
ON CONFLICT (organization_id, product_id) DO UPDATE 
SET total_count = EXCLUDED.total_count;

-- ============================================================
-- 9. CREATE FREE USER LICENSES
-- ============================================================

INSERT INTO free_user_licenses (user_id, product_id, upid, license_key, created_at)
SELECT 
    u.id,
    p.id,
    p.upid,
    CONCAT('free-', u.uid, '-', p.upid, '-', EXTRACT(epoch FROM CURRENT_TIMESTAMP)::text),
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN products p
WHERE u.tier = 'free'
  AND u.status = 'active'
  AND u.email LIKE '%@allowance.test%'
  AND p.upid = u.source_upid
ON CONFLICT (user_id, product_id) DO NOTHING;

-- ============================================================
-- 10. CREATE TEAM PRODUCT QUOTAS
-- ============================================================

INSERT INTO team_product_quotas (team_id, org_id, product_id, upid, allocated_count, used_count, created_at, updated_at)
SELECT 
    g.id,
    g.organization_id,
    p.id,
    p.upid,
    10,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM groups g
CROSS JOIN products p
WHERE EXISTS (
    SELECT 1 FROM org_product_licenses opl
    WHERE opl.organization_id = g.organization_id
    AND opl.product_id = p.id
)
ON CONFLICT (team_id, product_id) DO NOTHING;

-- ============================================================
-- SUMMARY: DISPLAY TEST DATA SETUP
-- ============================================================

\echo '=========================================='
\echo 'ALLOWANCE SYSTEM - SEED DATA LOADED'
\echo '=========================================='
\echo ''
\echo 'TEST CREDENTIALS (All users use the same hashed password)'
\echo '------------------------------------------'

SELECT 
    email,
    tier,
    status,
    CASE 
        WHEN email = 'admin@allowance.test' THEN 'System Admin (sees all users)'
        WHEN email LIKE 'leader%@allowance.test' THEN 'Team Leader (sees team members)'
        WHEN email LIKE 'member%@allowance.test' THEN 'Team Member (no user access)'
        WHEN email = 'free@allowance.test' THEN 'Free User (limited access)'
    END as description
FROM users 
WHERE email LIKE '%@allowance.test%'
ORDER BY 
    CASE 
        WHEN email = 'admin@allowance.test' THEN 1
        WHEN email LIKE 'leader%@allowance.test' THEN 2
        WHEN email LIKE 'member%@allowance.test' THEN 3
        ELSE 4
    END,
    email;

\echo ''
\echo 'ORGANIZATIONS AND TEAMS'
\echo '------------------------------------------'

SELECT 
    o.name as organization,
    g.name as team,
    (SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) as member_count
FROM organizations o
JOIN groups g ON o.id = g.organization_id
ORDER BY o.name, g.name;

\echo ''
\echo 'PRODUCT LICENSE POOLS (ORG LICENSES)'
\echo '------------------------------------------'

SELECT 
    o.name as organization,
    p.name as product,
    opl.total_count,
    opl.assigned_count,
    opl.total_count - opl.assigned_count as available_count
FROM org_product_licenses opl
JOIN organizations o ON opl.organization_id = o.id
JOIN products p ON opl.product_id = p.id
ORDER BY o.name, p.name;

\echo ''
\echo 'DATA SUMMARY'
\echo '------------------------------------------'

SELECT 
    'Test Users' as category,
    COUNT(*) as count
FROM users WHERE email LIKE '%@allowance.test%'
UNION ALL
SELECT 'Organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'Teams', COUNT(*) FROM groups
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Product Versions', COUNT(*) FROM product_versions
UNION ALL
SELECT 'Org License Pools', COUNT(*) FROM org_product_licenses
UNION ALL
SELECT 'Free User Licenses', COUNT(*) FROM free_user_licenses
UNION ALL
SELECT 'Team Quotas', COUNT(*) FROM team_product_quotas;

\echo ''
\echo '=========================================='
\echo 'SETUP COMPLETE - READY FOR TESTING'
\echo '=========================================='
