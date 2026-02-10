-- ============================================================
-- Production Bootstrap: Create Initial Admin User
-- ============================================================
-- Purpose: Bootstrap script for production deployment
-- Usage: Run ONCE after fresh deployment to create admin user
-- Password: Pass88899 (change immediately after first login!)
-- Argon2id hash for "Pass88899"
-- ============================================================

-- Create admin user (allstar tier - full system access)
INSERT INTO users (uid, email, password_hash, tier, status, organization_id, team_ids, source_product_slug, profile_data, license_status, created_at, updated_at) VALUES
    ('UADMIN0001', 'admin@allowance.test', '$argon2id$v=19$m=19456,t=2,p=1$F20jUfqy4qy4/6z6tOLBhg$Gl8U55p400Q0AXdl2TAWiYGcEWgGs5+4DqvagDNvJrc', 'allstar', 'active', NULL, '[]'::jsonb, 'allowance', '{"first_name": "System", "last_name": "Admin"}', 'valid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    tier = 'allstar',
    status = 'active',
    license_status = 'valid',
    updated_at = CURRENT_TIMESTAMP;

-- Create default product (Allowance System)
INSERT INTO products (upid, product_slug, name, description) VALUES
    ('UALLOWANCE0001', 'allowance', 'Allowance System', 'Core allowance authorization management system')
ON CONFLICT (upid) DO NOTHING;

-- Create product versions for Allowance
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit) VALUES
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'basic', 'Basic features', '{"max_recipients": 10, "reporting": false}'::jsonb, 'free'::user_tier, 10, 1000),
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'standard', 'Standard features', '{"max_recipients": 100, "reporting": true}'::jsonb, 'standard'::user_tier, 100, 10000),
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'premium', 'Premium features', '{"max_recipients": 1000, "api_access": true}'::jsonb, 'premium'::user_tier, NULL, NULL),
    ((SELECT id FROM products WHERE upid = 'UALLOWANCE0001'), 'allstar', 'AllStar - Full access', '{"max_recipients": "unlimited"}'::jsonb, 'allstar'::user_tier, NULL, NULL)
ON CONFLICT (product_id, version_name) DO NOTHING;

-- ============================================================
-- Verification
-- ============================================================
SELECT 
    '✓ Admin user created' as status,
    email,
    tier,
    status as user_status,
    license_status
FROM users WHERE email = 'admin@allowance.test';

SELECT 
    '✓ Product created' as status,
    upid,
    name
FROM products WHERE upid = 'UALLOWANCE0001';

-- ============================================================
-- IMPORTANT: Post-deployment steps
-- ============================================================
-- 1. Login with: admin@allowance.test / Pass88899
-- 2. IMMEDIATELY change the password via the UI or API
-- 3. Create organization and additional users as needed
-- ============================================================
