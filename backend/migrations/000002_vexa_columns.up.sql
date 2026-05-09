-- Migration 0002: Vexa integration columns
-- Adds live-meeting fields to meetings table and the per-speaker transcript_segments table.

-- Add Vexa columns to meetings (idempotent — safe to run on existing DBs)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS native_meeting_id TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS vexa_bot_id TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Per-speaker, per-timestamp transcript segments (streamed from Vexa WebSocket)
CREATE TABLE IF NOT EXISTS transcript_segments (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    speaker TEXT,
    text TEXT NOT NULL,
    absolute_start_time TIMESTAMP WITH TIME ZONE,
    absolute_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (meeting_id, absolute_start_time, speaker)
);

-- Ensure the unique index exists even if the table was pre-existing without the constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_segments_meeting_start_speaker
    ON transcript_segments (meeting_id, absolute_start_time, speaker);
