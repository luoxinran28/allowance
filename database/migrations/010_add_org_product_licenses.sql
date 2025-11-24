-- Migration 010: Organization Product Licenses
-- Tracks licenses assigned to organizations and team member assignments
-- Status: Feature (for admin product/license and team lead management)

-- Organization product licenses
CREATE TABLE org_product_licenses (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    total_count INT NOT NULL DEFAULT 1,
    assigned_count INT NOT NULL DEFAULT 0,
    available_count INT NOT NULL DEFAULT 1,
    expires_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, product_id)
);

CREATE INDEX idx_org_product_licenses_org_id ON org_product_licenses(organization_id);
CREATE INDEX idx_org_product_licenses_product_id ON org_product_licenses(product_id);
CREATE INDEX idx_org_product_licenses_expires_at ON org_product_licenses(expires_at);

-- Team member license assignments (tracks which team member has which license from org pool)
CREATE TABLE team_member_license_assignments (
    id BIGSERIAL PRIMARY KEY,
    org_license_id BIGINT NOT NULL REFERENCES org_product_licenses(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_key VARCHAR(500) UNIQUE NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_member_license_assignments_org_license ON team_member_license_assignments(org_license_id);
CREATE INDEX idx_team_member_license_assignments_group_id ON team_member_license_assignments(group_id);
CREATE INDEX idx_team_member_license_assignments_user_id ON team_member_license_assignments(user_id);
CREATE INDEX idx_team_member_license_assignments_revoked_at ON team_member_license_assignments(revoked_at);
