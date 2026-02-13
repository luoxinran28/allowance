-- ============================================================
-- Migration: Add JWT signing key to products table
-- ============================================================
-- Purpose: Each product gets its own JWT signing key for token issuance.
--          Allowance (IdP) signs tokens per-product; consumer products
--          (e.g., KwongFu) fetch their key via API to verify tokens.
--
-- Architecture:
--   products.jwt_signing_key  → Per-product HS256 secret (64 hex chars)
--   products.key_version      → Tracks key rotation (monotonically increasing)
--   products.key_rotated_at   → Audit: when was the key last rotated
--
-- Why on products table (not a separate table):
--   - 1:1 relationship: each product has exactly one active signing key
--   - Simpler queries: no extra JOINs for the hot path (login)
--   - Atomic: product creation always includes a key
-- ============================================================

-- Enable pgcrypto for random bytes generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add JWT signing key columns to products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS jwt_signing_key TEXT,
    ADD COLUMN IF NOT EXISTS key_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS key_rotated_at TIMESTAMP;

-- Generate signing keys for existing products that don't have one
-- Uses gen_random_bytes(32) → 64-char hex string
UPDATE products 
SET jwt_signing_key = encode(gen_random_bytes(32), 'hex')
WHERE jwt_signing_key IS NULL;

-- Now make it NOT NULL with a DEFAULT for future inserts
-- gen_random_bytes(32) → 64-char hex string, evaluated per INSERT
ALTER TABLE products 
    ALTER COLUMN jwt_signing_key SET NOT NULL,
    ALTER COLUMN jwt_signing_key SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- Index for fast key lookup by product_slug (used in login hot path)
CREATE INDEX IF NOT EXISTS idx_products_slug_key 
    ON products(product_slug) 
    INCLUDE (jwt_signing_key, key_version);
