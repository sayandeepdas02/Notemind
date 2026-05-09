DROP INDEX IF EXISTS idx_segments_meeting_start_speaker;
DROP TABLE IF EXISTS transcript_segments;
ALTER TABLE meetings DROP COLUMN IF EXISTS updated_at;
ALTER TABLE meetings DROP COLUMN IF EXISTS vexa_bot_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS native_meeting_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS meeting_url;
