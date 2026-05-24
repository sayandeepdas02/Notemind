-- Migration 0006: State Machine and Reliability enhancements

-- 1. Create the state machine ENUM
CREATE TYPE meeting_state AS ENUM (
    'CREATED',
    'SCHEDULED',
    'JOINING',
    'WAITING_FOR_ADMISSION',
    'ADMITTED',
    'RECORDING',
    'TRANSCRIBING',
    'RECONNECTING',
    'DISCONNECTED',
    'DENIED',
    'FAILED',
    'ENDED'
);

-- 2. Modify meetings table to use the new state machine
-- Note: Postgres allows ALTER TABLE to change types. We will cast existing statuses if they match or default to ENDED.
ALTER TABLE meetings ADD COLUMN new_state meeting_state DEFAULT 'CREATED';

UPDATE meetings SET new_state = CASE
    WHEN status = 'pending' THEN 'CREATED'::meeting_state
    WHEN status = 'joining' THEN 'JOINING'::meeting_state
    WHEN status = 'live' THEN 'RECORDING'::meeting_state
    WHEN status = 'processing' THEN 'TRANSCRIBING'::meeting_state
    WHEN status = 'completed' THEN 'ENDED'::meeting_state
    WHEN status = 'ended' THEN 'ENDED'::meeting_state
    WHEN status = 'failed' THEN 'FAILED'::meeting_state
    ELSE 'ENDED'::meeting_state
END;

ALTER TABLE meetings DROP COLUMN status;
ALTER TABLE meetings RENAME COLUMN new_state TO status;

-- Add new tracking columns
ALTER TABLE meetings ADD COLUMN state_reason TEXT;
ALTER TABLE meetings ADD COLUMN retry_count INT DEFAULT 0;
ALTER TABLE meetings ADD COLUMN last_heartbeat_at TIMESTAMP WITH TIME ZONE;

-- 3. Create the audit log table for state transitions
CREATE TABLE IF NOT EXISTS meeting_state_transitions (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    from_state meeting_state,
    to_state meeting_state NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meeting_transitions_meeting_id ON meeting_state_transitions(meeting_id);
CREATE INDEX idx_meeting_transitions_created_at ON meeting_state_transitions(created_at DESC);

-- 4. Enhance transcript_segments for sequence and integrity
ALTER TABLE transcript_segments ADD COLUMN sequence_id INT DEFAULT 0;
ALTER TABLE transcript_segments ADD COLUMN checksum TEXT;

CREATE UNIQUE INDEX idx_segments_meeting_seq ON transcript_segments(meeting_id, sequence_id);
