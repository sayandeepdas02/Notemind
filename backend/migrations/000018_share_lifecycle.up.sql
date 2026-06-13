-- Migration 0018: Share lifecycle — revocation, expiry, and audit trail

ALTER TABLE meeting_shares
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS expires_at          TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS revoked_at          TIMESTAMP WITH TIME ZONE;

-- Partial index speeds up the hot path: token lookups for active shares only.
CREATE INDEX IF NOT EXISTS idx_meeting_shares_active_token
    ON meeting_shares(share_token)
    WHERE revoked_at IS NULL;
