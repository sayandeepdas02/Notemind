-- Migration 0008 DOWN

DROP TABLE IF EXISTS recording_chunks;
DROP TABLE IF EXISTS recordings;
DROP TABLE IF EXISTS speaker_identities;
DROP TABLE IF EXISTS speaker_profiles;
DROP TABLE IF EXISTS calendar_events;
DROP TABLE IF EXISTS calendar_connections;
DROP TYPE IF EXISTS calendar_provider;
