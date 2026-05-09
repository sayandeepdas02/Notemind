-- Migration 0007: Provider Abstraction
-- Adds multi-provider support: Google Meet, Zoom, Teams, WebEx

-- 1. Provider enum
CREATE TYPE meeting_provider AS ENUM (
    'google_meet',
    'zoom',
    'teams',
    'webex',
    'unknown'
);

-- 2. Add provider columns to meetings
ALTER TABLE meetings ADD COLUMN provider meeting_provider NOT NULL DEFAULT 'google_meet';
ALTER TABLE meetings ADD COLUMN provider_meeting_id TEXT;  -- native meeting ID per provider

-- Backfill existing meetings
UPDATE meetings SET provider = 'google_meet' WHERE native_meeting_id IS NOT NULL;

-- 3. OAuth token storage (multi-provider)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    provider        TEXT NOT NULL,               -- 'zoom', 'google_calendar', 'outlook', etc.
    access_token    TEXT NOT NULL,
    refresh_token   TEXT,
    token_type      TEXT DEFAULT 'Bearer',
    scopes          TEXT[],
    expires_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);

-- 4. Zoom-specific meeting metadata
CREATE TABLE IF NOT EXISTS zoom_meetings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id      UUID REFERENCES meetings(id) ON DELETE CASCADE,
    zoom_meeting_id TEXT NOT NULL,               -- Zoom's numeric meeting ID
    zoom_uuid       TEXT,                        -- Zoom's UUID (changes per occurrence)
    host_id         TEXT,
    password        TEXT,                        -- encrypted at app layer
    join_url        TEXT,
    start_url       TEXT,
    meeting_type    INT DEFAULT 2,               -- 1=instant, 2=scheduled, 3=recurring no fixed time, 8=recurring fixed time
    occurrences     JSONB,                       -- for recurring meetings
    settings        JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_zoom_meetings_meeting_id ON zoom_meetings(meeting_id);
CREATE UNIQUE INDEX idx_zoom_meetings_zoom_id ON zoom_meetings(zoom_meeting_id);
