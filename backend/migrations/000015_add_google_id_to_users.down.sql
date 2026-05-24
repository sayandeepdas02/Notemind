-- Migration 0015 rollback
DROP INDEX IF EXISTS idx_api_keys_user_id;
DROP INDEX IF EXISTS users_google_id_unique;
ALTER TABLE api_keys DROP COLUMN IF EXISTS scopes;
ALTER TABLE api_keys DROP COLUMN IF EXISTS key_prefix;
ALTER TABLE api_keys DROP COLUMN IF EXISTS user_id;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
