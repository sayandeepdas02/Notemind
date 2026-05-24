-- Migration 0016: Add email notification preferences to users
-- Up

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;
