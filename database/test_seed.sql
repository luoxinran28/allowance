-- Quick test to verify organizations insert
\echo 'Testing organization creation...'

-- Check if user exists
SELECT COUNT(*) as admin_user_count FROM users WHERE email = 'admin@allowance.test';

-- Try insert
INSERT INTO organizations (org_id, name, description, created_by) 
VALUES ('ACME001', 'ACME Corporation', 'Main test organization', 
        (SELECT id FROM users WHERE email = 'admin@allowance.test'));

-- Verify
SELECT * FROM organizations WHERE org_id IN ('ACME001', 'STARTUP01');
