-- Migration 0008: Calendar connections, speaker profiles, recordings

-- 1. Calendar provider enum
CREATE TYPE calendar_provider AS ENUM ('google', 'outlook');

-- 2. Calendar connections (OAuth'd calendar per user)
CREATE TABLE IF NOT EXISTS calendar_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    provider        calendar_provider NOT NULL,
    calendar_id     TEXT NOT NULL,               -- Google: email, Outlook: calendar ID
    sync_token      TEXT,                        -- for incremental sync
    webhook_id      TEXT,                        -- Google: channel ID / Outlook: subscription ID
    webhook_expires TIMESTAMP WITH TIME ZONE,
    enabled         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, provider, calendar_id)
);

CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);

-- 3. Calendar events cache
CREATE TABLE IF NOT EXISTS calendar_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    connection_id       UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    provider_event_id   TEXT NOT NULL,
    provider            calendar_provider NOT NULL,
    title               TEXT,
    description         TEXT,
    location            TEXT,
    start_at            TIMESTAMP WITH TIME ZONE,
    end_at              TIMESTAMP WITH TIME ZONE,
    meeting_url         TEXT,                    -- extracted Google Meet / Zoom link
    attendees           JSONB DEFAULT '[]',      -- [{email, name, response_status}]
    recurrence          TEXT,                    -- iCal RRULE string
    is_recurring        BOOLEAN DEFAULT FALSE,
    notemind_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    auto_join_enabled   BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, provider, provider_event_id)
);

CREATE INDEX idx_calendar_events_user        ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start       ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_meeting_url ON calendar_events(meeting_url) WHERE meeting_url IS NOT NULL;

-- 4. Speaker profiles — persistent identity across meetings
CREATE TABLE IF NOT EXISTS speaker_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,               -- workspace owner
    name            TEXT NOT NULL,
    email           TEXT,
    avatar_url      TEXT,
    voice_embedding BYTEA,                       -- future: voice-print embedding
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, email)
);

CREATE INDEX idx_speaker_profiles_user ON speaker_profiles(user_id);

-- 5. Per-meeting speaker identity resolution
CREATE TABLE IF NOT EXISTS speaker_identities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id          UUID REFERENCES meetings(id) ON DELETE CASCADE,
    speaker_label       TEXT NOT NULL,           -- raw label from Vexa ("Speaker 1")
    speaker_profile_id  UUID REFERENCES speaker_profiles(id) ON DELETE SET NULL,
    confidence          REAL DEFAULT 1.0,        -- 0.0-1.0 match confidence
    resolved_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (meeting_id, speaker_label)
);

CREATE INDEX idx_speaker_identities_meeting ON speaker_identities(meeting_id);

-- 6. Recordings
CREATE TABLE IF NOT EXISTS recordings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id          UUID REFERENCES meetings(id) ON DELETE CASCADE UNIQUE,
    storage_provider    TEXT NOT NULL DEFAULT 's3',
    storage_key         TEXT NOT NULL,           -- object key in bucket
    bucket              TEXT NOT NULL,
    duration_sec        INT,
    size_bytes          BIGINT,
    mime_type           TEXT DEFAULT 'audio/webm',
    status              TEXT NOT NULL DEFAULT 'uploading',  -- uploading, processing, ready, failed
    signed_url          TEXT,
    signed_url_expires  TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Recording chunks (for chunked upload)
CREATE TABLE IF NOT EXISTS recording_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id    UUID REFERENCES recordings(id) ON DELETE CASCADE,
    chunk_index     INT NOT NULL,
    storage_key     TEXT NOT NULL,
    start_sec       REAL,
    end_sec         REAL,
    size_bytes      INT,
    uploaded_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (recording_id, chunk_index)
);

CREATE INDEX idx_recording_chunks_recording ON recording_chunks(recording_id);
