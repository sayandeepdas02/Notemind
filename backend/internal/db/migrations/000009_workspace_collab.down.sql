-- Migration 0009 DOWN
DROP TRIGGER IF EXISTS segments_search_vector_trigger ON transcript_segments;
DROP FUNCTION IF EXISTS segments_search_vector_update();
DROP TRIGGER IF EXISTS meetings_search_vector_trigger ON meetings;
DROP FUNCTION IF EXISTS meetings_search_vector_update();
ALTER TABLE transcript_segments DROP COLUMN IF EXISTS search_vector;
ALTER TABLE meetings DROP COLUMN IF EXISTS search_vector;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS integration_connections;
DROP TABLE IF EXISTS automation_rules;
DROP TABLE IF EXISTS highlights;
DROP TABLE IF EXISTS comment_mentions;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS meeting_folder_memberships;
DROP TABLE IF EXISTS meeting_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS folders;
