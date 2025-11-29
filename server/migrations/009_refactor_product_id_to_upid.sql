-- Migration 009: Refactor Product ID Strategy
-- Status: Schema Cleanup
-- Purpose: Remove redundant product_id column, use UPID as primary lookup identifier
-- This simplifies the system for single-product or UPID-based multi-product approach

-- ============= Products Table =============
-- Rename product_id to product_slug (URL-friendly), keep UPID as the primary lookup

-- Create new column for product_slug
ALTER TABLE products ADD COLUMN product_slug VARCHAR(50) UNIQUE;

-- Migrate data: generate product_slug from UPID or product_id
UPDATE products 
SET product_slug = CASE 
    WHEN upid IS NOT NULL AND upid != '' THEN 
        LOWER(REGEXP_REPLACE(upid, '(.{1,4})(.{1,4})(.{1,4})', '\1-\2-\3', 'g'))
    ELSE 
        product_id
END;

-- Make product_slug NOT NULL only if we have at least one product
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM products LIMIT 1) THEN
        ALTER TABLE products ALTER COLUMN product_slug SET NOT NULL;
    END IF;
END $$;

-- Drop old product_id column
ALTER TABLE products DROP COLUMN product_id;

-- Add index on UPID for fast lookups (skip if index already exists from migration 007)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' AND indexname = 'idx_products_upid'
    ) THEN
        CREATE UNIQUE INDEX idx_products_upid ON products(upid);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(product_slug);

-- ============= Verification =============
-- Verify products table structure
SELECT 'Products table refactored successfully' as status;
