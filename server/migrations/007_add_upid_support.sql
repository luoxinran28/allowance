-- Migration 007: Add UPID columns to products and licenses
-- This migration adds UPID (Unique Product ID) support for the authorization system
-- UPID format: U + 15 uppercase alphanumeric characters

-- Add UPID column to products table (only if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'upid'
    ) THEN
        ALTER TABLE products ADD COLUMN upid VARCHAR(16) UNIQUE;
    END IF;
END $$;

-- Add tier_required column (only if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'tier_required'
    ) THEN
        ALTER TABLE products ADD COLUMN tier_required user_tier DEFAULT 'free';
    END IF;
END $$;

-- Add daily_limit column (only if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'daily_limit'
    ) THEN
        ALTER TABLE products ADD COLUMN daily_limit INT;
    END IF;
END $$;

-- Add monthly_limit column (only if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'monthly_limit'
    ) THEN
        ALTER TABLE products ADD COLUMN monthly_limit INT;
    END IF;
END $$;

-- Create index for UPID lookups (if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'products' AND indexname = 'idx_products_upid'
    ) THEN
        CREATE INDEX idx_products_upid ON products(upid);
    END IF;
END $$;

-- Add UPID column to licenses table for reference (only if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_licenses' AND column_name = 'upid'
    ) THEN
        ALTER TABLE user_licenses ADD COLUMN upid VARCHAR(16);
    END IF;
END $$;

-- Create index for UPID lookups in licenses (if it doesn't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_licenses' AND indexname = 'idx_user_licenses_upid'
    ) THEN
        CREATE INDEX idx_user_licenses_upid ON user_licenses(upid);
    END IF;
END $$;

-- Create additional indexes (if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'products' AND indexname = 'idx_products_tier_required'
    ) THEN
        CREATE INDEX idx_products_tier_required ON products(tier_required) WHERE tier_required IS NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'products' AND indexname = 'idx_products_daily_limit'
    ) THEN
        CREATE INDEX idx_products_daily_limit ON products(daily_limit) WHERE daily_limit IS NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'products' AND indexname = 'idx_products_monthly_limit'
    ) THEN
        CREATE INDEX idx_products_monthly_limit ON products(monthly_limit) WHERE monthly_limit IS NOT NULL;
    END IF;
END $$;
