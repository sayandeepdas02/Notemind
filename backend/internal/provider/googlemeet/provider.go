// Package googlemeet implements the MeetingProvider interface for Google Meet,
// wrapping the existing Vexa bot client and WebSocket streamer.
package googlemeet

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"notemind/internal/provider"
	"notemind/internal/vexa"
)

const ProviderName = "google_meet"

// Provider implements provider.MeetingProvider for Google Meet via Vexa.
type Provider struct {
	vexaClient *vexa.Client
}

// New creates a Google Meet provider backed by the given Vexa client.
func New(vexaClient *vexa.Client) *Provider {
	return &Provider{vexaClient: vexaClient}
}

func (p *Provider) Name() string { return ProviderName }

// DetectMeetingURL returns true for Google Meet URLs.
func (p *Provider) DetectMeetingURL(rawURL string) bool {
	lower := strings.ToLower(rawURL)
	return strings.Contains(lower, "meet.google.com/")
}

// ExtractNativeID parses the meeting code from a Google Meet URL.
// e.g. https://meet.google.com/abc-defg-hij → "abc-defg-hij"
func (p *Provider) ExtractNativeID(meetingURL string) (string, error) {
	u, err := url.Parse(meetingURL)
	if err != nil {
		return "", fmt.Errorf("invalid meeting URL: %w", err)
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return "", fmt.Errorf("could not extract meeting ID from URL: %s", meetingURL)
	}
	return parts[0], nil
}

// StartBot dispatches the Vexa bot to the Google Meet meeting.
func (p *Provider) StartBot(ctx context.Context, meetingURL string, opts provider.BotOptions) (provider.BotHandle, error) {
	nativeID, err := p.vexaClient.StartBot(meetingURL)
	if err != nil {
		return provider.BotHandle{}, fmt.Errorf("google meet start bot failed: %w", err)
	}
	return provider.BotHandle{NativeID: nativeID}, nil
}

// StopBot tells Vexa to remove the bot from the Google Meet.
func (p *Provider) StopBot(ctx context.Context, nativeID string) error {
	return p.vexaClient.StopBot(nativeID)
}

// ConnectAndStream subscribes to the Vexa WebSocket stream for this meeting.
func (p *Provider) ConnectAndStream(ctx context.Context, nativeID string, onSegment provider.SegmentHandler, onStatus provider.StatusHandler) {
	streamer := vexa.NewStreamer(p.vexaClient.BaseURL(), p.vexaClient.APIKey(), nativeID)
	streamer.ConnectAndStream(ctx,
		func(segs []vexa.TranscriptSegment) {
			out := make([]provider.TranscriptSegment, 0, len(segs))
			for _, s := range segs {
				start, _ := time.Parse(time.RFC3339Nano, s.AbsoluteStartTime)
				end, _ := time.Parse(time.RFC3339Nano, s.AbsoluteEndTime)
				out = append(out, provider.TranscriptSegment{
					Speaker:           s.Speaker,
					Text:              s.Text,
					AbsoluteStartTime: start,
					AbsoluteEndTime:   end,
				})
			}
			onSegment(out)
		},
		vexa.StatusHandler(onStatus), // adapts provider.StatusHandler (same signature)
	)
}
