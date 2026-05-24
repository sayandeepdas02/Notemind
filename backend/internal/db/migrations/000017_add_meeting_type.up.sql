-- Migration 0017: Add meeting_type to meetings table
-- Up

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(20) NOT NULL DEFAULT 'general';
-- Valid values: general, standup, interview, sales, planning
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_type ON meetings(meeting_type);
