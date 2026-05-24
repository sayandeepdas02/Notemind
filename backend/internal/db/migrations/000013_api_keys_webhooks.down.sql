-- Migration 0013: API Keys and Webhooks
-- Down

DROP TABLE IF EXISTS retention_policies;
DROP INDEX IF EXISTS idx_webhook_deliveries_endpoint;
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhook_endpoints;
DROP INDEX IF EXISTS idx_api_keys_workspace_id;
DROP TABLE IF EXISTS api_keys;
