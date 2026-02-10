-- ============================================================
-- Migration: Remove legacy RBAC tables
-- ============================================================
-- Purpose: Clean up old Role-Based Access Control tables that are
-- no longer used. Tier-based authorization is the sole permission
-- system. Team-level organization_role enum is PRESERVED.
-- ============================================================

-- Drop legacy RBAC tables (order matters for FK constraints)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
