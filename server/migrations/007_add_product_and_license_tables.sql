-- Products table: Store product UPID configurations
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    upid VARCHAR(255) UNIQUE NOT NULL,  -- Format: UPID-{product_slug}-{tier}
    product_slug VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,           -- basic|pro|enterprise
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Licenses table: Store authorization codes
CREATE TABLE IF NOT EXISTS licenses (
    id BIGSERIAL PRIMARY KEY,
    upid VARCHAR(255) NOT NULL,
    org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    max_users INT NOT NULL,
    current_users INT DEFAULT 0,
    revoked BOOLEAN DEFAULT FALSE,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upid) REFERENCES products(upid) ON DELETE CASCADE,
    CHECK (current_users <= max_users)
);

-- UserLicense table: Association between users and licenses
CREATE TABLE IF NOT EXISTS user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_id BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL,
    assigned_by BIGINT NOT NULL REFERENCES users(id),
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, license_id),
    CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

-- LicenseApproval table: License approval workflow
CREATE TABLE IF NOT EXISTS license_approvals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_id BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
    requested_at TIMESTAMP NOT NULL,
    approver_id BIGINT REFERENCES users(id),
    approved_at TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('pending', 'approved', 'rejected')),
    CHECK ((status = 'pending' AND approver_id IS NULL AND approved_at IS NULL)
        OR (status IN ('approved', 'rejected') AND approver_id IS NOT NULL AND approved_at IS NOT NULL))
);

-- Indexes for performance optimization
CREATE INDEX idx_products_upid ON products(upid);
CREATE INDEX idx_licenses_org_id ON licenses(org_id);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX idx_user_licenses_license_id ON user_licenses(license_id);
CREATE INDEX idx_license_approvals_user_id ON license_approvals(user_id);
CREATE INDEX idx_license_approvals_license_id ON license_approvals(license_id);
CREATE INDEX idx_license_approvals_status ON license_approvals(status);
