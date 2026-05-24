-- Migration 0016 rollback
ALTER TABLE users DROP COLUMN IF EXISTS email_notifications_enabled;
