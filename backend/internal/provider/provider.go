// Package provider defines the MeetingProvider interface and shared types
// used across all meeting platform integrations (Google Meet, Zoom, Teams, etc.).
// Each provider implements MeetingProvider and registers itself with the Registry.
package provider

import (
	"context"
	"time"
)

// ── Core types ────────────────────────────────────────────────────────────────

// SegmentHandler is called when new transcript segments arrive from the provider.
type SegmentHandler func(segments []TranscriptSegment)

// StatusHandler is called when the meeting bot status changes.
type StatusHandler func(status string)

// TranscriptSegment is the normalized transcript unit across all providers.
type TranscriptSegment struct {
	Speaker           string
	Text              string
	AbsoluteStartTime time.Time
	AbsoluteEndTime   time.Time
}

// BotOptions carries per-join configuration.
type BotOptions struct {
	DisplayName string
	Password    string // Zoom meeting password, Teams lobby code, etc.
	UserID      string // Notemind user ID (for token lookup)
}

// BotHandle identifies a running bot instance.
type BotHandle struct {
	NativeID    string // Provider's meeting ID (e.g., Zoom meeting ID, GMeet code)
	ContainerID string // Vexa container/bot ID if applicable
}

// ── Provider interface ────────────────────────────────────────────────────────

// MeetingProvider is the single interface every meeting platform must implement.
// New providers (Teams, WebEx, etc.) only need to satisfy this contract.
type MeetingProvider interface {
	// Name returns the unique provider identifier string.
	Name() string

	// DetectMeetingURL returns true if this provider can handle the given URL.
	DetectMeetingURL(url string) bool

	// ExtractNativeID parses a meeting URL and returns the platform-specific meeting ID.
	ExtractNativeID(meetingURL string) (string, error)

	// StartBot dispatches a bot to the meeting and returns a BotHandle.
	StartBot(ctx context.Context, meetingURL string, opts BotOptions) (BotHandle, error)

	// StopBot removes the bot from the meeting identified by nativeID.
	StopBot(ctx context.Context, nativeID string) error

	// ConnectAndStream connects to the provider's transcript stream and invokes
	// onSegment for each batch of segments and onStatus for each status change.
	// Runs until ctx is cancelled.
	ConnectAndStream(ctx context.Context, nativeID string, onSegment SegmentHandler, onStatus StatusHandler)
}
