-- Migration 0005: Performance indexes
-- Adds indexes on all foreign keys and frequently-queried columns.

-- meetings
CREATE INDEX IF NOT EXISTS idx_meetings_user_id    ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status     ON meetings(status);

-- transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON transcripts(meeting_id);

-- transcript_segments (meeting_id already covered by the unique index in 0002, add created_at for range queries)
CREATE INDEX IF NOT EXISTS idx_segments_meeting_id   ON transcript_segments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_segments_created_at   ON transcript_segments(created_at DESC);

-- summaries
CREATE INDEX IF NOT EXISTS idx_summaries_meeting_id ON summaries(meeting_id);

-- action_items
CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status     ON action_items(status);

-- decisions
CREATE INDEX IF NOT EXISTS idx_decisions_meeting_id ON decisions(meeting_id);

-- key_points
CREATE INDEX IF NOT EXISTS idx_key_points_meeting_id ON key_points(meeting_id);

-- meeting_shares
CREATE INDEX IF NOT EXISTS idx_meeting_shares_token      ON meeting_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_meeting_id ON meeting_shares(meeting_id);
