-- Migration 0012: Billing and Enterprise Security
-- Down

DROP TABLE IF EXISTS sso_users;
DROP TABLE IF EXISTS sso_connections;
DROP INDEX IF EXISTS idx_audit_logs_workspace_id;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS usage_meters;
DROP TABLE IF EXISTS workspace_billing;
