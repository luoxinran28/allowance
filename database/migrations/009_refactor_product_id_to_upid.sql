-- Migration 009: Refactor Product ID Strategy
-- Status: Schema Cleanup
-- Purpose: Remove redundant product_id column, use UPID as primary lookup identifier
-- This simplifies the system for single-product or UPID-based multi-product approach

-- ============= Products Table =============
-- Rename product_id to product_slug (URL-friendly), keep UPID as the primary lookup

-- Create new column for product_slug
ALTER TABLE products ADD COLUMN product_slug VARCHAR(50) UNIQUE;

-- Migrate data: generate product_slug from UPID (lowercase, dash-separated)
UPDATE products 
SET product_slug = LOWER(
    REGEXP_REPLACE(upid, '(.{1,4})(.{1,4})(.{1,4})', '\1-\2-\3', 'g')
);

-- Make product_slug NOT NULL
ALTER TABLE products ALTER COLUMN product_slug SET NOT NULL;

-- Drop old product_id column
ALTER TABLE products DROP COLUMN product_id;

-- Add index on UPID for fast lookups
CREATE UNIQUE INDEX idx_products_upid ON products(upid);
CREATE INDEX idx_products_slug ON products(product_slug);

-- ============= Verification =============
-- Verify products table structure
SELECT 'Products table refactored successfully' as status;
SELECT id, upid, product_slug, name FROM products;
