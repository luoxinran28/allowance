-- Migration: Expand team_id column sizes
-- Purpose: Allow longer team identifiers like 'STARTUP-DEV'
-- Created: 2025-12-04

-- Expand teams.team_id from VARCHAR(8) to VARCHAR(20)
ALTER TABLE teams ALTER COLUMN team_id TYPE VARCHAR(20);
