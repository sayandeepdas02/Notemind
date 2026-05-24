-- Migration 0009: Workspace organization, collaboration, automation, search

-- 1. Folders (nested tree structure)
CREATE TABLE IF NOT EXISTS folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    name            TEXT NOT NULL,
    parent_id       UUID REFERENCES folders(id) ON DELETE CASCADE,
    color           TEXT DEFAULT '#6366f1',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_folders_user    ON folders(user_id);
CREATE INDEX idx_folders_parent  ON folders(parent_id);

-- 2. Tags
CREATE TABLE IF NOT EXISTS tags (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID NOT NULL,
    name     TEXT NOT NULL,
    color    TEXT DEFAULT '#6366f1',
    UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_user ON tags(user_id);

-- 3. Meeting ↔ tag many-to-many
CREATE TABLE IF NOT EXISTS meeting_tags (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, tag_id)
);

-- 4. Meeting ↔ folder many-to-many (a meeting can appear in multiple folders)
CREATE TABLE IF NOT EXISTS meeting_folder_memberships (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    folder_id  UUID REFERENCES folders(id) ON DELETE CASCADE,
    added_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (meeting_id, folder_id)
);

-- 5. Comments (threaded, can anchor to a transcript segment)
CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id  UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    body        TEXT NOT NULL,
    segment_id  UUID REFERENCES transcript_segments(id) ON DELETE SET NULL,
    parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_meeting   ON comments(meeting_id);
CREATE INDEX idx_comments_parent    ON comments(parent_id);
CREATE INDEX idx_comments_segment   ON comments(segment_id);

-- 6. Comment mentions (@username notification)
CREATE TABLE IF NOT EXISTS comment_mentions (
    comment_id          UUID REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_id   UUID NOT NULL,
    PRIMARY KEY (comment_id, mentioned_user_id)
);

-- 7. Highlights (colour-coded transcript range annotations)
CREATE TABLE IF NOT EXISTS highlights (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id  UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    from_seq    INT NOT NULL,
    to_seq      INT NOT NULL,
    color       TEXT DEFAULT '#fbbf24',
    note        TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_highlights_meeting ON highlights(meeting_id);

-- 8. Automation rules (trigger→conditions→actions JSON policy)
CREATE TABLE IF NOT EXISTS automation_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    name        TEXT NOT NULL,
    trigger     JSONB NOT NULL DEFAULT '{}',    -- {"event": "meeting_detected"}
    conditions  JSONB NOT NULL DEFAULT '[]',    -- [{field, op, value}]
    actions     JSONB NOT NULL DEFAULT '[]',    -- [{type, params}]
    enabled     BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_user    ON automation_rules(user_id);
CREATE INDEX idx_automation_rules_enabled ON automation_rules(user_id, enabled);

-- 9. Third-party integration connections
CREATE TABLE IF NOT EXISTS integration_connections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    provider    TEXT NOT NULL,              -- 'slack', 'notion', 'jira', 'linear', 'hubspot'
    credentials JSONB NOT NULL DEFAULT '{}', -- encrypted at app layer
    settings    JSONB NOT NULL DEFAULT '{}', -- channel IDs, workspace IDs, etc.
    enabled     BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

-- 10. Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id     UUID NOT NULL,
    channel     TEXT NOT NULL,      -- 'email', 'slack', 'webhook'
    event_type  TEXT NOT NULL,      -- 'meeting_ended', 'daily_digest', 'comment_mention'
    enabled     BOOLEAN DEFAULT TRUE,
    settings    JSONB DEFAULT '{}', -- webhook URL, Slack channel, etc.
    PRIMARY KEY (user_id, channel, event_type)
);

-- 11. Full-text search support on meetings
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX idx_meetings_search ON meetings USING GIN(search_vector);

-- Function to update search_vector on meeting insert/update
CREATE OR REPLACE FUNCTION meetings_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.meeting_url, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.state_reason, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_search_vector_trigger
BEFORE INSERT OR UPDATE ON meetings
FOR EACH ROW EXECUTE FUNCTION meetings_search_vector_update();

-- 12. Full-text search on transcript_segments
ALTER TABLE transcript_segments ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX idx_segments_search ON transcript_segments USING GIN(search_vector);

CREATE OR REPLACE FUNCTION segments_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER segments_search_vector_trigger
BEFORE INSERT OR UPDATE ON transcript_segments
FOR EACH ROW EXECUTE FUNCTION segments_search_vector_update();
