-- Migration 005: Batch License Tracking
-- Adds batch license generation tracking and bulk operations
-- Status: Batch Operations (required for bulk license management)

-- Batch operations tracking table
CREATE TABLE IF NOT EXISTS license_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_id VARCHAR(255) NOT NULL UNIQUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    total_licenses INTEGER NOT NULL,
    generated_count INTEGER NOT NULL DEFAULT 0,
    revoked_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL,  -- pending, processing, completed, failed
    product_id VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_license_batches_batch_id ON license_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_license_batches_status ON license_batches(status);
CREATE INDEX IF NOT EXISTS idx_license_batches_created_by ON license_batches(created_by);

-- Bulk operations audit log
CREATE TABLE IF NOT EXISTS bulk_operations (
    id BIGSERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,  -- generate, revoke, export
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id VARCHAR(255),
    records_affected INTEGER,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_bulk_operations_user_id ON bulk_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_operation_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_at ON bulk_operations(created_at);
