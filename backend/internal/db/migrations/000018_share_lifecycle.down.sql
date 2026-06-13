-- Migration 0018 rollback

DROP INDEX IF EXISTS idx_meeting_shares_active_token;

ALTER TABLE meeting_shares
    DROP COLUMN IF EXISTS created_by_user_id,
    DROP COLUMN IF EXISTS expires_at,
    DROP COLUMN IF EXISTS revoked_at;
