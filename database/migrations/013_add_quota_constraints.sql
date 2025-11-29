-- Migration 013: Add quota validation constraints
-- Ensures data consistency for three-tier license allocation
-- Status: Data Integrity

-- Add CHECK constraints to org_product_licenses
ALTER TABLE org_product_licenses 
ADD CONSTRAINT chk_org_license_counts CHECK (
    total_count >= 0 
    AND assigned_count >= 0 
    AND available_count >= 0
    AND assigned_count <= total_count
    AND available_count = total_count - assigned_count
);

-- Add CHECK constraints to team_product_quotas
ALTER TABLE team_product_quotas 
ADD CONSTRAINT chk_team_quota_counts CHECK (
    allocated_count >= 0 
    AND used_count >= 0 
    AND used_count <= allocated_count
);

-- Add index for better concurrent quota checking
CREATE INDEX IF NOT EXISTS idx_team_product_quotas_product_upid ON team_product_quotas(product_id, upid);
CREATE INDEX IF NOT EXISTS idx_free_user_licenses_user_product ON free_user_licenses(user_id, product_id);
