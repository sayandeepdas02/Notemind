package meeting

import "time"

type Meeting struct {
	ID              string     `json:"id"`
	AudioURL        string     `json:"audio_url,omitempty"`
	MeetingURL      string     `json:"meeting_url,omitempty"`
	NativeMeetingID string     `json:"native_meeting_id,omitempty"`
	VexaBotID       string     `json:"vexa_bot_id,omitempty"`
	Status          string     `json:"status"`
	MeetingType     string     `json:"meeting_type,omitempty"`
	StateReason     string     `json:"state_reason,omitempty"`
	RetryCount      int        `json:"retry_count"`
	LastHeartbeatAt *time.Time `json:"last_heartbeat_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Transcript struct {
	ID        string    `json:"id"`
	MeetingID string    `json:"meeting_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// TranscriptSegment is a single speaker utterance from Vexa's real-time stream
type TranscriptSegment struct {
	ID                string    `json:"id"`
	MeetingID         string    `json:"meeting_id"`
	Speaker           string    `json:"speaker"`
	Text              string    `json:"text"`
	AbsoluteStartTime time.Time `json:"absolute_start_time"`
	AbsoluteEndTime   time.Time `json:"absolute_end_time"`
	SequenceID        int       `json:"sequence_id"`
	Checksum          string    `json:"checksum"`
	CreatedAt         time.Time `json:"created_at"`
}

type Summary struct {
	ID          string    `json:"id"`
	MeetingID   string    `json:"meeting_id"`
	SummaryJSON string    `json:"summary_json,omitempty"` // Legacy Phase 1
	SummaryText string    `json:"summary_text,omitempty"` // Phase 3
	CreatedAt   time.Time `json:"created_at"`
}

type ActionItemDB struct {
	ID        string    `json:"id"`
	MeetingID string    `json:"meeting_id"`
	Task      string    `json:"task"`
	Owner     string    `json:"owner"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type DecisionDB struct {
	ID           string    `json:"id"`
	MeetingID    string    `json:"meeting_id"`
	DecisionText string    `json:"decision_text"`
	CreatedAt    time.Time `json:"created_at"`
}

type KeyPointDB struct {
	ID        string    `json:"id"`
	MeetingID string    `json:"meeting_id"`
	PointText string    `json:"point_text"`
	CreatedAt time.Time `json:"created_at"`
}

