-- Seed Data: Test Users and Allowance Product Data
-- Simplified test data for Allowance System testing
-- Password hash for: P*s8*9* (IT IS A HINT)

-- Create core test users
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
    -- Admin user
    ('UADMIN0001', 'admin@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$ut4E+1Moschkt+mbTccjnw$trAVdBm/i2qA3FAOlv+hUvcm9LIRUKbW5prLafzjj/I', 'premium', 'active',
     '{"first_name": "Admin", "last_name": "User", "role": "Administrator"}',
     CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP),

    -- Standard tier users
    ('USTD00001', 'standard@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$ut4E+1Moschkt+mbTccjnw$trAVdBm/i2qA3FAOlv+hUvcm9LIRUKbW5prLafzjj/I', 'standard', 'active',
     '{"first_name": "Standard", "last_name": "User"}',
     CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP),

    -- Premium tier user
    ('UPRM00001', 'premium@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$ut4E+1Moschkt+mbTccjnw$trAVdBm/i2qA3FAOlv+hUvcm9LIRUKbW5prLafzjj/I', 'premium', 'active',
     '{"first_name": "Premium", "last_name": "User"}',
     CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP),

    -- Free tier user
    ('UFREE0001', 'free@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$ut4E+1Moschkt+mbTccjnw$trAVdBm/i2qA3FAOlv+hUvcm9LIRUKbW5prLafzjj/I', 'free', 'active',
     '{"first_name": "Free", "last_name": "User"}',
     CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to test users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@allowance.test' AND r.code = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('standard@allowance.test', 'premium@allowance.test') AND r.code = 'standard_employee'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'free@allowance.test' AND r.code = 'free_user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Create one test organization
INSERT INTO organizations (org_id, name, description, created_by) VALUES
    ('ALLOWANCE', 'Allowance Test Org', 'Test organization for Allowance System', (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (org_id) DO NOTHING;

-- Create one test group
INSERT INTO groups (group_id, organization_id, name, description, created_by) VALUES
    ('ALLOW-TEAM', (SELECT id FROM organizations WHERE org_id = 'ALLOWANCE'), 'Allowance Team', 'Main allowance team',
     (SELECT id FROM users WHERE email = 'admin@allowance.test'))
ON CONFLICT (group_id) DO NOTHING;

-- Assign test users to group
INSERT INTO user_groups (user_id, group_id, role) VALUES
    ((SELECT id FROM users WHERE email = 'admin@allowance.test'), (SELECT id FROM groups WHERE group_id = 'ALLOW-TEAM'), 'leader'),
    ((SELECT id FROM users WHERE email = 'standard@allowance.test'), (SELECT id FROM groups WHERE group_id = 'ALLOW-TEAM'), 'member'),
    ((SELECT id FROM users WHERE email = 'premium@allowance.test'), (SELECT id FROM groups WHERE group_id = 'ALLOW-TEAM'), 'member'),
    ((SELECT id FROM users WHERE email = 'free@allowance.test'), (SELECT id FROM groups WHERE group_id = 'ALLOW-TEAM'), 'member')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Create licenses for test users based on their tier
INSERT INTO user_licenses (user_id, product_version_id, license_key, starts_at, expires_at, daily_usage, monthly_usage, metadata)
SELECT
    u.id,
    pv.id,
    CONCAT('allowance-', u.uid, '-', pv.version_name),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    0,
    0,
    '{"tier_matched": true}'::jsonb
FROM users u
CROSS JOIN product_versions pv
WHERE pv.product_id = (SELECT id FROM products WHERE upid = 'UALLOWANCE0001')
  AND u.tier::text = pv.tier_required::text
  AND u.status = 'active'
ON CONFLICT (license_key) DO NOTHING;

-- Create subscriptions for paid tier users
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end, auto_renew, created_at, updated_at)
SELECT
    u.id,
    u.tier,
    'active',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP + INTERVAL '335 days',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.tier IN ('standard', 'premium')
  AND u.status = 'active'
ON CONFLICT (user_id) DO NOTHING;

-- Summary: Show test setup
SELECT 
    'Test Users Created' as description,
    COUNT(*) as count
FROM users WHERE email LIKE '%@allowance.test%'
UNION ALL
SELECT 'Organizations', COUNT(*) FROM organizations WHERE org_id LIKE 'ALLOWANCE%'
UNION ALL
SELECT 'Groups', COUNT(*) FROM groups WHERE group_id LIKE 'ALLOW%'
UNION ALL
SELECT 'Licenses', COUNT(*) FROM user_licenses
UNION ALL
SELECT 'Subscriptions', COUNT(*) FROM subscriptions;
