-- Migration 0017 rollback
DROP INDEX IF EXISTS idx_meetings_meeting_type;
ALTER TABLE meetings DROP COLUMN IF EXISTS meeting_type;
