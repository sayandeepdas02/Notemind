-- Migration 0006: State Machine and Reliability enhancements (Down)

-- 1. Revert transcript_segments
DROP INDEX IF EXISTS idx_segments_meeting_seq;
ALTER TABLE transcript_segments DROP COLUMN IF EXISTS sequence_id;
ALTER TABLE transcript_segments DROP COLUMN IF EXISTS checksum;

-- 2. Drop audit log
DROP TABLE IF EXISTS meeting_state_transitions;

-- 3. Revert meetings table changes
ALTER TABLE meetings DROP COLUMN IF EXISTS state_reason;
ALTER TABLE meetings DROP COLUMN IF EXISTS retry_count;
ALTER TABLE meetings DROP COLUMN IF EXISTS last_heartbeat_at;

-- Convert enum back to varchar
ALTER TABLE meetings ADD COLUMN old_status VARCHAR(50) DEFAULT 'pending';

UPDATE meetings SET old_status = CASE
    WHEN status = 'CREATED' THEN 'pending'
    WHEN status = 'SCHEDULED' THEN 'pending'
    WHEN status = 'JOINING' THEN 'joining'
    WHEN status = 'WAITING_FOR_ADMISSION' THEN 'joining'
    WHEN status = 'ADMITTED' THEN 'live'
    WHEN status = 'RECORDING' THEN 'live'
    WHEN status = 'TRANSCRIBING' THEN 'processing'
    WHEN status = 'RECONNECTING' THEN 'live'
    WHEN status = 'DISCONNECTED' THEN 'failed'
    WHEN status = 'DENIED' THEN 'failed'
    WHEN status = 'FAILED' THEN 'failed'
    WHEN status = 'ENDED' THEN 'completed'
    ELSE 'pending'
END;

ALTER TABLE meetings DROP COLUMN status;
ALTER TABLE meetings RENAME COLUMN old_status TO status;

-- 4. Drop ENUM type
DROP TYPE IF EXISTS meeting_state;
