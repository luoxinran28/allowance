-- Migration: Extend UPID field length and simplify format
-- Date: 2026-01-30
-- Purpose: Change UPID from VARCHAR(16) to VARCHAR(64) and remove UPID- prefix requirement
-- New format: lowercase product identifiers like 'kwongfu-trading', 'allowance-pro'

-- Extend UPID field length from 16 to 64 characters
ALTER TABLE products ALTER COLUMN upid TYPE VARCHAR(64);

-- Update indexes if needed (should be automatic)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_upid_new ON products(upid);