-- Migration: Rename source_upid to source_product_slug
-- Rationale: source_upid stored product slug values (e.g., 'allowance', 'kwongfu')
-- but the column name implied it stored UPID format. Rename for clarity.
-- UPID is an internal Allowance identifier; external systems use product_slug.

-- Step 1: Rename column
ALTER TABLE users RENAME COLUMN source_upid TO source_product_slug;

-- Step 2: Update index
DROP INDEX IF EXISTS idx_users_source_upid;
CREATE INDEX idx_users_source_product_slug ON users(source_product_slug);
