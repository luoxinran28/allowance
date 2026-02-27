-- ============================================================
-- Migration: Add KwongFu product
-- ============================================================
-- Purpose: KwongFu needs a product row in Allowance so that:
--   1. Users can login with product_slug = 'kwongfu'
--   2. KwongFu backend can fetch its JWT signing key via
--      GET /products/kwongfu/auth-key
--
-- The jwt_signing_key column has a DEFAULT that auto-generates
-- a random 64-char hex key via gen_random_bytes(32).
-- ============================================================

INSERT INTO products (upid, product_slug, name, description)
VALUES (
    'UKWONGFU0001',
    'kwongfu',
    'KwongFu Trading',
    'Headless automated crypto trading platform'
)
ON CONFLICT (product_slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Create product versions for KwongFu
INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit) VALUES
    ((SELECT id FROM products WHERE product_slug = 'kwongfu'), 'basic', 'Basic trading features', '{"paper_trading": true, "max_symbols": 1}'::jsonb, 'free'::user_tier, 10, 1000),
    ((SELECT id FROM products WHERE product_slug = 'kwongfu'), 'standard', 'Standard trading features', '{"paper_trading": true, "live_trading": true, "max_symbols": 5}'::jsonb, 'standard'::user_tier, 100, 10000),
    ((SELECT id FROM products WHERE product_slug = 'kwongfu'), 'premium', 'Premium trading features', '{"paper_trading": true, "live_trading": true, "max_symbols": "unlimited", "backtesting": true}'::jsonb, 'premium'::user_tier, NULL, NULL)
ON CONFLICT (product_id, version_name) DO NOTHING;
