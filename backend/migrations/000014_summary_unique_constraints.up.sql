-- Migration 0014: Add unique constraint on summaries.meeting_id for upsert support.
-- Remove any duplicate rows first (keep the most recently created one).

DELETE FROM summaries s1
USING summaries s2
WHERE s1.meeting_id = s2.meeting_id
  AND s1.created_at < s2.created_at;

ALTER TABLE summaries ADD CONSTRAINT IF NOT EXISTS summaries_meeting_id_unique UNIQUE (meeting_id);
