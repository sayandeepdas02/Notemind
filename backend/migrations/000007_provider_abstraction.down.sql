-- Migration 0007 DOWN: Provider Abstraction rollback

DROP TABLE IF EXISTS zoom_meetings;
DROP TABLE IF EXISTS oauth_tokens;
ALTER TABLE meetings DROP COLUMN IF EXISTS provider_meeting_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS provider;
DROP TYPE IF EXISTS meeting_provider;
