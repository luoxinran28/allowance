-- Seed Allowance Product with UPID for Testing
-- This script creates the "allowance" product itself as a UPID product
-- allowing test accounts to login and verify the system
-- NOTE: This assumes migration 007_add_upid_support.sql has been applied

-- Insert the allowance product
INSERT INTO products (product_id, name, description, owner_id, upid, tier_required, daily_limit, monthly_limit, created_at, updated_at)
SELECT
    'allowance-001',
    'Allowance System',
    'Core allowance authorization management system',
    u.id,
    'UALLOWANCE0001',
    'free'::user_tier,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.email = 'admin@test.com'
ON CONFLICT (product_id) DO NOTHING;

-- Insert product tiers/versions for allowance
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit, created_at)
SELECT
    p.id,
    'free',
    'Free tier - Basic allowance features',
    '{"licenses": 5, "users": 3, "reports": false, "api_access": false}'::jsonb,
    'free'::user_tier,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
FROM products p
WHERE p.product_id = 'allowance-001'
ON CONFLICT (product_id, version_name) DO NOTHING;

INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit, created_at)
SELECT
    p.id,
    'standard',
    'Standard tier - Professional allowance management',
    '{"licenses": 50, "users": 20, "reports": true, "api_access": true}'::jsonb,
    'standard'::user_tier,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
FROM products p
WHERE p.product_id = 'allowance-001'
ON CONFLICT (product_id, version_name) DO NOTHING;

INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit, created_at)
SELECT
    p.id,
    'premium',
    'Premium tier - Enterprise allowance system',
    '{"licenses": -1, "users": -1, "reports": true, "api_access": true, "white_label": true, "webhooks": true}'::jsonb,
    'premium'::user_tier,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
FROM products p
WHERE p.product_id = 'allowance-001'
ON CONFLICT (product_id, version_name) DO NOTHING;

-- Assign allowance licenses to all test users
INSERT INTO user_licenses (user_id, product_version_id, license_key, starts_at, expires_at, daily_usage, monthly_usage, metadata, created_at)
SELECT
    u.id,
    pv.id,
    CONCAT('allowance-license-', u.uid, '-', pv.version_name, '-', EXTRACT(epoch FROM CURRENT_TIMESTAMP)::text),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    0,
    0,
    jsonb_build_object(
        'auto_renew', true,
        'source', 'allowance_system',
        'product_upid', 'UALLOWANCE0001'
    ),
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN product_versions pv
WHERE pv.product_id = (SELECT id FROM products WHERE product_id = 'allowance-001')
  AND u.tier::text = pv.version_name::text
  AND u.status = 'active'
ON CONFLICT (license_key) DO NOTHING;

-- Display confirmation
SELECT 'Allowance Product Setup Complete' as status;
SELECT COUNT(*) as allowance_product_count FROM products WHERE product_id = 'allowance-001';
SELECT COUNT(*) as allowance_version_count FROM product_versions 
WHERE product_id = (SELECT id FROM products WHERE product_id = 'allowance-001');
SELECT COUNT(*) as allowance_license_count FROM user_licenses
WHERE product_version_id IN (SELECT id FROM product_versions 
  WHERE product_id = (SELECT id FROM products WHERE product_id = 'allowance-001'));

-- Display UPID and test credentials
SELECT 
    'Test Credentials with Allowance UPID:' as info,
    u.email,
    'TestPass123' as password,
    u.tier,
    'UALLOWANCE0001' as allowance_upid
FROM users u
WHERE u.email IN ('admin@test.com', 'user@test.com', 'free@test.com')
ORDER BY u.tier DESC;
