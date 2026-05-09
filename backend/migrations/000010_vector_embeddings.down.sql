-- Migration 0010 DOWN

DROP INDEX IF EXISTS idx_action_items_owner;
DROP INDEX IF EXISTS idx_action_items_meeting;
DROP INDEX IF EXISTS idx_action_items_user;
DROP TABLE IF EXISTS action_item_tracking;

DROP INDEX IF EXISTS idx_relationships_to;
DROP INDEX IF EXISTS idx_relationships_from;
DROP TABLE IF EXISTS entity_relationships;

DROP INDEX IF EXISTS idx_entities_type;
DROP INDEX IF EXISTS idx_entities_meeting;
DROP TABLE IF EXISTS meeting_entities;

DROP INDEX IF EXISTS idx_topics_last_seen;
DROP INDEX IF EXISTS idx_topics_user;
DROP TABLE IF EXISTS cross_meeting_topics;

DROP INDEX IF EXISTS idx_chat_messages_meeting;
DROP INDEX IF EXISTS idx_chat_messages_user;
DROP INDEX IF EXISTS idx_chat_messages_session;
DROP TABLE IF EXISTS ai_chat_messages;

DROP INDEX IF EXISTS idx_embedding_chunks_created;
DROP INDEX IF EXISTS idx_embedding_chunks_meeting;
DROP INDEX IF EXISTS idx_embedding_chunks_hnsw;
DROP TABLE IF EXISTS embedding_chunks;

DROP EXTENSION IF EXISTS vector;
