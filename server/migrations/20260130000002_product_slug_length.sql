-- Migration: Set product_slug max length to 16
-- Date: 2026-01-30
-- Purpose: Ensure product_slug fits 16-char requirement used by UI/identifiers

ALTER TABLE products ALTER COLUMN product_slug TYPE VARCHAR(16);

-- If you need to enforce lowercase, consider a trigger or application-side enforcement.
