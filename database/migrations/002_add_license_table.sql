-- Migration 002: Products and Licenses
-- Creates product catalog, versions, and user licensing system for Allowance
-- Status: Core (required for license management)

-- Products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    upid VARCHAR(16) UNIQUE NOT NULL,
    product_slug VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_upid ON products(upid);
CREATE INDEX idx_products_slug ON products(product_slug);

-- Product versions
CREATE TABLE product_versions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version_name VARCHAR(50) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '{}',
    tier_required user_tier NOT NULL,
    daily_limit INT,
    monthly_limit INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, version_name)
);

CREATE INDEX idx_product_versions_product_id ON product_versions(product_id);

-- User licenses
CREATE TABLE user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_version_id BIGINT NOT NULL REFERENCES product_versions(id) ON DELETE CASCADE,
    license_key VARCHAR(500) UNIQUE NOT NULL,
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    daily_usage INT DEFAULT 0,
    monthly_usage INT DEFAULT 0,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX idx_user_licenses_license_key ON user_licenses(license_key);
CREATE INDEX idx_user_licenses_expires_at ON user_licenses(expires_at);

-- License usage history
CREATE TABLE license_usage_history (
    id BIGSERIAL PRIMARY KEY,
    license_id BIGINT NOT NULL REFERENCES user_licenses(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    usage_count INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_usage_history_license_id ON license_usage_history(license_id);
CREATE INDEX idx_license_usage_history_created_at ON license_usage_history(created_at);

-- Insert Allowance product with three versions
INSERT INTO products (upid, product_slug, name, description) VALUES
    ('UALLOWANCE0001', 'allowance', 'Allowance System', 'Core allowance authorization management system')
ON CONFLICT (upid) DO NOTHING;

INSERT INTO product_versions (product_id, version_name, description, features, tier_required, daily_limit, monthly_limit)
SELECT p.id, 'basic', 'Basic allowance features',
    '{"max_recipients": 10, "reporting": false, "automation": false}'::jsonb,
    'free'::user_tier, 10, 1000
FROM products p WHERE p.upid = 'UALLOWANCE0001'
UNION ALL
SELECT p.id, 'standard', 'Standard allowance with reporting',
    '{"max_recipients": 100, "reporting": true, "automation": false}'::jsonb,
    'standard'::user_tier, 100, 10000
FROM products p WHERE p.upid = 'UALLOWANCE0001'
UNION ALL
SELECT p.id, 'premium', 'Premium allowance with full features',
    '{"max_recipients": 1000, "reporting": true, "automation": true, "api_access": true}'::jsonb,
    'premium'::user_tier, NULL, NULL
FROM products p WHERE p.upid = 'UALLOWANCE0001'
ON CONFLICT (product_id, version_name) DO NOTHING;
