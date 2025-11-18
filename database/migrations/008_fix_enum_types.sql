-- Migration 008: Fix Enum Types
-- Convert VARCHAR columns to proper enum types
-- Status: Required fix for data type compatibility

ALTER TABLE users ALTER COLUMN tier TYPE user_tier USING tier::user_tier;
ALTER TABLE users ALTER COLUMN status TYPE user_status USING status::user_status;