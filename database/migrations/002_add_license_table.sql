-- Migration 002: Products and Licenses
-- Creates product catalog, versions, and user licensing system
-- Status: Core (required for license management)

-- Products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_product_id ON products(product_id);

-- Product versions (Basic, Pro, Enterprise, etc.)
CREATE TABLE product_versions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version_name VARCHAR(50) NOT NULL,  -- 'basic', 'pro', 'enterprise'
    description TEXT,
    features JSONB DEFAULT '{}',  -- Features and quotas: {"max_forms": 100, "ai_enabled": true}
    tier_required user_tier NOT NULL,  -- Minimum tier to use this version
    daily_limit INT,  -- Daily usage limit (NULL = unlimited)
    monthly_limit INT,  -- Monthly usage limit (NULL = unlimited)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, version_name)
);

CREATE INDEX idx_product_versions_product_id ON product_versions(product_id);

-- User licenses (authorization for a user to use a product version)
CREATE TABLE user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_version_id BIGINT NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
    license_key VARCHAR(500) UNIQUE NOT NULL,  -- JWT-formatted license key
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    daily_usage INT DEFAULT 0,  -- Current day usage count
    monthly_usage INT DEFAULT 0,  -- Current month usage count
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',  -- Additional license data
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX idx_user_licenses_license_key ON user_licenses(license_key);
CREATE INDEX idx_user_licenses_expires_at ON user_licenses(expires_at);

-- License usage history (optional: for audit trail)
CREATE TABLE license_usage_history (
    id BIGSERIAL PRIMARY KEY,
    license_id BIGINT NOT NULL REFERENCES user_licenses(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,  -- 'used', 'reset_daily', 'reset_monthly'
    usage_count INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_usage_history_license_id ON license_usage_history(license_id);
CREATE INDEX idx_license_usage_history_created_at ON license_usage_history(created_at);

-- Insert sample products and versions for Form Builder
-- UPID Format: UPID + 12 characters
INSERT INTO products (product_id, name, description, upid) VALUES
    ('form-001', 'Form Builder', 'Online form creation and management tool', 'UPIDFORM0001');

INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
        SELECT p.id, 'basic', 'Basic form building',
            '{"max_forms": 10, "ai_enabled": false, "storage_gb": 1}'::jsonb,
            'free'::user_tier, 3, 100
        FROM products p WHERE p.product_id = 'form-001'

        UNION ALL

        SELECT p.id, 'pro', 'Professional form building with AI',
            '{"max_forms": 100, "ai_enabled": true, "storage_gb": 50}'::jsonb,
            'standard'::user_tier, 100, 10000
        FROM products p WHERE p.product_id = 'form-001'

        UNION ALL

        SELECT p.id, 'enterprise', 'Enterprise form solution',
            '{"max_forms": 1000, "ai_enabled": true, "storage_gb": 500, "api_access": true}'::jsonb,
            'premium'::user_tier, NULL, NULL
        FROM products p WHERE p.product_id = 'form-001';
