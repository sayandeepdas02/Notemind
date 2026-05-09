-- Migration 0010: AI Memory Layer — pgvector embeddings + chat + intelligence tables

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Embedding chunks — the core vectorised transcript windows
CREATE TABLE IF NOT EXISTS embedding_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id      UUID REFERENCES meetings(id) ON DELETE CASCADE,
    segment_ids     TEXT[],                           -- source transcript_segment IDs
    content         TEXT NOT NULL,                    -- the text that was embedded
    speaker         TEXT,                             -- dominant speaker in this chunk
    start_time      TIMESTAMP WITH TIME ZONE,
    end_time        TIMESTAMP WITH TIME ZONE,
    embedding       vector(1536),                     -- text-embedding-3-small output
    model           TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    checksum        TEXT NOT NULL,                    -- SHA256(content) for dedup
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (meeting_id, checksum)
);

-- HNSW index for fast cosine similarity search (approximate nearest neighbour)
CREATE INDEX IF NOT EXISTS idx_embedding_chunks_hnsw
    ON embedding_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Covering index for filtered searches
CREATE INDEX IF NOT EXISTS idx_embedding_chunks_meeting ON embedding_chunks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_embedding_chunks_created ON embedding_chunks(created_at DESC);

-- 3. AI chat messages — persisted per user / optionally scoped to a meeting
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    session_id  UUID NOT NULL,                        -- groups messages into a conversation
    meeting_id  UUID REFERENCES meetings(id) ON DELETE SET NULL,  -- null = workspace-wide
    role        TEXT NOT NULL,                        -- 'user' | 'assistant' | 'system'
    content     TEXT NOT NULL,
    citations   JSONB DEFAULT '[]',                   -- [{meeting_id, start_time, speaker, text, score}]
    input_tokens  INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    model       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session  ON ai_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user     ON ai_chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting  ON ai_chat_messages(meeting_id) WHERE meeting_id IS NOT NULL;

-- 4. Cross-meeting topic clusters
CREATE TABLE IF NOT EXISTS cross_meeting_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    topic           TEXT NOT NULL,
    summary         TEXT,
    centroid        vector(1536),                     -- mean embedding of cluster
    meeting_ids     UUID[],
    mention_count   INT DEFAULT 1,
    first_seen_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_topics_user       ON cross_meeting_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_last_seen  ON cross_meeting_topics(last_seen_at DESC);

-- 5. Meeting entities — people, projects, decisions, topics extracted per meeting
CREATE TABLE IF NOT EXISTS meeting_entities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id  UUID REFERENCES meetings(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,   -- 'person' | 'project' | 'decision' | 'action_item' | 'topic' | 'product'
    name        TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (meeting_id, entity_type, name)
);

CREATE INDEX IF NOT EXISTS idx_entities_meeting ON meeting_entities(meeting_id);
CREATE INDEX IF NOT EXISTS idx_entities_type    ON meeting_entities(entity_type, name);

-- 6. Entity relationships — knowledge graph edges
CREATE TABLE IF NOT EXISTS entity_relationships (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id    UUID REFERENCES meeting_entities(id) ON DELETE CASCADE,
    to_entity_id      UUID REFERENCES meeting_entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,   -- 'owns', 'mentioned_with', 'decided_by', 'blocked_by'
    weight            REAL DEFAULT 1.0,
    meeting_id        UUID REFERENCES meetings(id) ON DELETE CASCADE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (from_entity_id, to_entity_id, relationship_type, meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_from ON entity_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to   ON entity_relationships(to_entity_id);

-- 7. Action item lifecycle tracking
CREATE TABLE IF NOT EXISTS action_item_tracking (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    meeting_id              UUID REFERENCES meetings(id) ON DELETE CASCADE,
    task                    TEXT NOT NULL,
    owner                   TEXT,
    due_date                DATE,
    status                  TEXT NOT NULL DEFAULT 'open',  -- open | resolved | overdue
    resolution_notes        TEXT,
    resolution_meeting_id   UUID REFERENCES meetings(id) ON DELETE SET NULL,
    resolved_at             TIMESTAMP WITH TIME ZONE,
    embedding               vector(1536),                  -- for similarity dedup
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_items_user    ON action_item_tracking(user_id, status);
CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_item_tracking(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_owner   ON action_item_tracking(owner) WHERE owner IS NOT NULL;
