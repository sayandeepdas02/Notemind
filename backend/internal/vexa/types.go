package vexa

import "time"

// Platform supported by Vexa
const PlatformGoogleMeet = "google_meet"

// StartBotRequest is sent to POST /bots
type StartBotRequest struct {
	Platform            string `json:"platform"`
	NativeMeetingID     string `json:"native_meeting_id"`
	TranscribeEnabled   bool   `json:"transcribe_enabled"`
	TranscriptionTier   string `json:"transcription_tier"` // "realtime"
	RecordingEnabled    bool   `json:"recording_enabled"`
}

// BotResponse is returned from POST /bots and GET /bots/status
type BotResponse struct {
	ID              int    `json:"id"`
	Status          string `json:"status"`
	Platform        string `json:"platform"`
	NativeMeetingID string `json:"native_meeting_id"`
}

// TranscriptSegment is a single utterance from the Vexa REST transcript endpoint
type TranscriptSegment struct {
	Text              string `json:"text"`
	Speaker           string `json:"speaker"`
	Language          string `json:"language"`
	AbsoluteStartTime string `json:"absolute_start_time"`
	AbsoluteEndTime   string `json:"absolute_end_time"`
	UpdatedAt         string `json:"updated_at"`
}

// TranscriptResponse wraps GET /transcripts/{platform}/{native_id}
type TranscriptResponse struct {
	Notes    string              `json:"notes"`
	Segments []TranscriptSegment `json:"segments"`
}

// ---- WebSocket Message Types ----

// WSSubscribeMsg is sent by the client to subscribe to a meeting stream
type WSSubscribeMsg struct {
	Action   string        `json:"action"`
	Meetings []WSMeetingID `json:"meetings"`
}

// WSPingMsg keeps the connection alive
type WSPingMsg struct {
	Action string `json:"action"`
}

// WSMeetingID identifies a meeting in subscribe/unsubscribe messages
type WSMeetingID struct {
	Platform string `json:"platform"`
	NativeID string `json:"native_id"`
}

// WSIncomingMessage is the generic wrapper for all incoming WebSocket frames
type WSIncomingMessage struct {
	Type    string          `json:"type"`
	Meeting WSMeetingRef    `json:"meeting"`
	Payload WSPayload       `json:"payload"`
	Ts      time.Time       `json:"ts"`
	Error   string          `json:"error"`
}

// WSMeetingRef is the meeting reference inside incoming messages
type WSMeetingRef struct {
	ID       int    `json:"id"`
	Platform string `json:"platform"`
	NativeID string `json:"native_id"`
}

// WSPayload wraps a list of transcript segments
type WSPayload struct {
	Segments []TranscriptSegment `json:"segments"`
	Status   string              `json:"status"`
}
