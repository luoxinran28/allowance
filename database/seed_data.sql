-- Seed Data: Four-Tier Authorization System (free/standard/premium/allstar)
-- Password: Pass88899
-- Argon2id: $argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc

-- ============================================================
-- CREATE TEST USERS
-- ============================================================

-- Admin (allstar tier)
INSERT INTO users (uid, email, password_hash, tier, status, organization_id, team_ids, source_upid, profile_data, license_status, created_at, updated_at) VALUES
    ('UADMIN0001', 'admin@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'allstar', 'active', NULL, '[]'::jsonb, NULL, '{"first_name": "System", "last_name": "Admin"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Org Bosses (premium tier)
INSERT INTO users (uid, email, password_hash, tier, status, organization_id, team_ids, source_upid, profile_data, license_status, created_at, updated_at) VALUES
    ('UBOSS0001', 'boss1@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'premium', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Alice", "last_name": "Boss"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP),
    ('UBOSS0002', 'boss2@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'premium', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Bob", "last_name": "Manager"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '55 days', CURRENT_TIMESTAMP),
    ('UPREM0001', 'premium@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'premium', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Premium", "last_name": "User"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '52 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Standard users (team members)
INSERT INTO users (uid, email, password_hash, tier, status, organization_id, team_ids, source_upid, profile_data, license_status, created_at, updated_at) VALUES
    ('USTD00001', 'standard@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'standard', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Standard", "last_name": "User"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '55 days', CURRENT_TIMESTAMP),
    ('ULEAD0001', 'leader1@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'standard', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Charlie", "last_name": "Leader"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_TIMESTAMP),
    ('ULEAD0002', 'leader2@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'standard', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Diana", "last_name": "Team Leader"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP),
    ('UMEM00001', 'member1@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'standard', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Eve", "last_name": "Developer"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP),
    ('UMEM00002', 'member2@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'standard', 'active', NULL, '[]'::jsonb, 'UPROD000001', '{"first_name": "Frank", "last_name": "Designer"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_TIMESTAMP),
    ('UMEM00003', 'member3@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'standard', 'active', NULL, '[]'::jsonb, 'UPROD000002', '{"first_name": "Grace", "last_name": "Engineer"}', 'valid', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Free user
INSERT INTO users (uid, email, password_hash, tier, status, organization_id, team_ids, source_upid, profile_data, license_status, created_at, updated_at) VALUES
    ('UFREE0001', 'free@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'free', 'active', NULL, '[]'::jsonb, 'UALLOWANCE0001', '{"first_name": "Henry", "last_name": "Trial"}', 'not_assigned', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- CREATE ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (org_id, name, description, created_by) VALUES
    ('ACME01', 'ACME Corporation', 'Main test organization', (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('STARTUP1', 'StartupX Inc.', 'Second test organization', (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (org_id) DO NOTHING;

-- Update organization_id for org bosses
UPDATE users SET organization_id = (SELECT id FROM organizations WHERE org_id = 'ACME01') WHERE email = 'boss1@allowance.test';
UPDATE users SET organization_id = (SELECT id FROM organizations WHERE org_id = 'STARTUP1') WHERE email = 'boss2@allowance.test';

-- ============================================================
-- CREATE TEAMS
-- ============================================================

INSERT INTO teams (team_id, organization_id, name, description, is_default, created_by) VALUES
    ('DEFAULT-ACME', (SELECT id FROM organizations WHERE org_id = 'ACME01'), 'Default Team', 'Default', TRUE, (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('ENG-TEAM', (SELECT id FROM organizations WHERE org_id = 'ACME01'), 'Engineering Team', 'Engineering', FALSE, (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('SALES-TEAM', (SELECT id FROM organizations WHERE org_id = 'ACME01'), 'Sales Team', 'Sales', FALSE, (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('DEFAULT-STARTUP', (SELECT id FROM organizations WHERE org_id = 'STARTUP1'), 'Default Team', 'Default', TRUE, (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ('DEV-TEAM', (SELECT id FROM organizations WHERE org_id = 'STARTUP1'), 'Development Team', 'Development', FALSE, (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (team_id) DO NOTHING;

-- ============================================================
-- CREATE PRODUCTS
-- ============================================================

INSERT INTO products (upid, product_slug, name, description) VALUES
    ('UALLOWANCE0001', 'allowance', 'Allowance System', 'Core allowance authorization management system'),
    ('UPROD000001', 'analytics-pro', 'Analytics Pro', 'Advanced analytics and reporting platform'),
    ('UPROD000002', 'crm-suite', 'CRM Suite', 'Customer relationship management solution'),
    ('UPID-kwongfu-basic', 'kwongfu', 'KwongFu Trading System', 'Automated Crypto Trading Platform for Binance.US Spot')
ON CONFLICT (upid) DO NOTHING;

-- ============================================================
-- CREATE PRODUCT VERSIONS
-- ============================================================

-- Allowance versions
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit) VALUES
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'basic', 'Basic features', '{"max_recipients": 10, "reporting": false}'::jsonb, 'free'::user_tier, 10, 1000),
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'standard', 'Standard features', '{"max_recipients": 100, "reporting": true}'::jsonb, 'standard'::user_tier, 100, 10000),
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'premium', 'Premium features', '{"max_recipients": 1000, "api_access": true}'::jsonb, 'premium'::user_tier, NULL, NULL),
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'allstar', 'AllStar - Full access', '{"max_recipients": "unlimited"}'::jsonb, 'allstar'::user_tier, NULL, NULL)
ON CONFLICT (product_id, version_name) DO NOTHING;

-- Analytics Pro versions
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit) VALUES
    ((SELECT id FROM products WHERE upid = 'UPROD000001'), 'basic', 'Basic', '{"dashboards": 5}'::jsonb, 'free'::user_tier, 50, 5000),
    ((SELECT id FROM products WHERE upid = 'UPROD000001'), 'pro', 'Professional', '{"dashboards": 50}'::jsonb, 'standard'::user_tier, 500, 50000),
    ((SELECT id FROM products WHERE upid = 'UPROD000001'), 'enterprise', 'Enterprise', '{"dashboards": "unlimited"}'::jsonb, 'premium'::user_tier, NULL, NULL)
ON CONFLICT (product_id, version_name) DO NOTHING;

-- CRM Suite versions
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit) VALUES
    ((SELECT id FROM products WHERE upid = 'UPROD000002'), 'starter', 'Starter', '{"contacts": 100}'::jsonb, 'free'::user_tier, 20, 2000),
    ((SELECT id FROM products WHERE upid = 'UPROD000002'), 'business', 'Business', '{"contacts": 10000}'::jsonb, 'standard'::user_tier, 1000, 100000),
    ((SELECT id FROM products WHERE upid = 'UPROD000002'), 'enterprise', 'Enterprise', '{"contacts": "unlimited"}'::jsonb, 'premium'::user_tier, NULL, NULL)
ON CONFLICT (product_id, version_name) DO NOTHING;

-- KwongFu Trading System versions
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit) VALUES
    ((SELECT id FROM products WHERE upid = 'UKWONGFU0001'), 'free', 'Free Tier - Dashboard Only', '{"dashboard": true, "trading": false, "validation_lab": false}'::jsonb, 'free'::user_tier, 10, 100),
    ((SELECT id FROM products WHERE upid = 'UKWONGFU0001'), 'standard', 'Standard Tier - Full Trading', '{"dashboard": true, "trading": true, "validation_lab": false}'::jsonb, 'standard'::user_tier, 1000, 100000),
    ((SELECT id FROM products WHERE upid = 'UKWONGFU0001'), 'premium', 'Premium Tier - All Features', '{"dashboard": true, "trading": true, "validation_lab": true}'::jsonb, 'premium'::user_tier, NULL, NULL)
ON CONFLICT (product_id, version_name) DO NOTHING;

-- ============================================================
-- CREATE ORG LICENSES
-- ============================================================

INSERT INTO org_product_licenses (organization_id, product_id, total_count, assigned_count, expires_at, created_by) VALUES
    ((SELECT id FROM organizations WHERE org_id = 'ACME01'), (SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 50, 0, CURRENT_TIMESTAMP + INTERVAL '1 year', (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ((SELECT id FROM organizations WHERE org_id = 'ACME01'), (SELECT id FROM products WHERE upid = 'UPROD000001'), 30, 0, CURRENT_TIMESTAMP + INTERVAL '1 year', (SELECT id FROM users WHERE email = 'admin@allowance.test')),
    ((SELECT id FROM organizations WHERE org_id = 'STARTUP1'), (SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 20, 0, CURRENT_TIMESTAMP + INTERVAL '1 year', (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (organization_id, product_id) DO NOTHING;

-- ============================================================
-- DISPLAY SUMMARY
-- ============================================================

\echo ''
\echo '=========================================='
\echo 'FOUR-TIER SYSTEM SETUP COMPLETE'
\echo '=========================================='
\echo ''
\echo 'Test Users Created:'
SELECT email, tier, 'Status: ' || status as info FROM users WHERE email LIKE '%@allowance.test%' ORDER BY tier, email;

\echo ''
\echo 'Organizations:'
SELECT org_id, name FROM organizations ORDER BY org_id;

\echo ''
\echo 'Products:'
SELECT upid, name FROM products ORDER BY upid;

\echo ''
\echo '=========================================='
