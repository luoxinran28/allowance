-- Migration 012: Cleanup Redundant Tables
-- Date: 2025-11-29
-- Purpose: Remove unused/redundant tables identified during architecture review

BEGIN;

-- Remove redundant license tracking tables
DROP TABLE IF EXISTS license_usage_history CASCADE;
DROP TABLE IF EXISTS bulk_operations CASCADE;
DROP TABLE IF EXISTS license_batches CASCADE;

-- Remove old license table (replaced by team_member_license_assignments + free_user_licenses)
DROP TABLE IF EXISTS user_licenses CASCADE;

-- Remove subscriptions table (tier management moved to users.tier field)
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Remove any remaining approval tables (backup in case Migration 011 didn't execute)
DROP TABLE IF EXISTS license_approvals CASCADE;

COMMIT;
