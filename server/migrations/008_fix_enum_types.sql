-- Migration 008: Fix Enum Types
-- Convert VARCHAR columns to proper enum types
-- Status: Required fix for data type compatibility

-- Drop defaults, change type, then restore defaults
ALTER TABLE users ALTER COLUMN tier DROP DEFAULT;
ALTER TABLE users ALTER COLUMN tier TYPE user_tier USING tier::user_tier;
ALTER TABLE users ALTER COLUMN tier SET DEFAULT 'free'::user_tier;

ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
ALTER TABLE users ALTER COLUMN status TYPE user_status USING status::user_status;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'::user_status;