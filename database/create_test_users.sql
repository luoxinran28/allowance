-- Create test user accounts for development
-- Run this script with: docker-compose exec postgres psql -U postgres -d allowance -f /path/to/this/file.sql

-- Note: Password hashes below are for "TestPass123"
-- In a real scenario, you'd generate these with the actual Argon2 hashing

-- Create admin test user
INSERT INTO users (
    uid,
    email,
    password_hash,
    tier,
    status,
    profile_data,
    created_at,
    updated_at
) VALUES (
    'UTESTADMIN12345',
    'admin@test.com',
    '$argon2id$v=19$m=19456,t=2,p=1$dGVzdHNhbHQ$U2FtcGxlSGFzaA', -- Placeholder hash for "TestPass123"
    'premium',
    'active',
    '{"first_name": "Test", "last_name": "Admin", "department": "IT", "role": "Administrator"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Create standard user test account
INSERT INTO users (
    uid,
    email,
    password_hash,
    tier,
    status,
    profile_data,
    created_at,
    updated_at
) VALUES (
    'UTESTUSER123456',
    'user@test.com',
    '$argon2id$v=19$m=19456,t=2,p=1$dGVzdHNhbHQ$U2FtcGxlSGFzaA', -- Same placeholder hash
    'standard',
    'active',
    '{"first_name": "Test", "last_name": "User", "department": "Engineering", "role": "Developer"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Create free tier test user
INSERT INTO users (
    uid,
    email,
    password_hash,
    tier,
    status,
    profile_data,
    created_at,
    updated_at
) VALUES (
    'UTESTFREE123456',
    'free@test.com',
    '$argon2id$v=19$m=19456,t=2,p=1$dGVzdHNhbHQ$U2FtcGxlSGFzaA', -- Same placeholder hash
    'free',
    'active',
    '{"first_name": "Free", "last_name": "User", "department": "Marketing"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Assign roles to test users
-- Admin user gets admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@test.com' AND r.code = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Standard user gets standard_employee role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'user@test.com' AND r.code = 'standard_employee'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Free user gets free_user role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'free@test.com' AND r.code = 'free_user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Display created test users
SELECT
    'Test users created:' as info,
    u.id,
    u.uid,
    u.email,
    u.tier,
    u.status,
    COALESCE(r.code, 'no role') as role_code,
    COALESCE(r.name, 'No Role Assigned') as role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email IN ('admin@test.com', 'user@test.com', 'free@test.com')
ORDER BY u.email;