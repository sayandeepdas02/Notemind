// Package zoom implements the MeetingProvider interface for Zoom meetings,
// using the same Vexa browser bot approach as Google Meet.
package zoom

import (
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"go.uber.org/zap"

	"notemind/internal/provider"
	"notemind/internal/vexa"
	"notemind/pkg/logger"
)

const ProviderName = "zoom"

// zoomURLPattern matches standard Zoom meeting URLs:
//   - https://zoom.us/j/123456789
//   - https://us02web.zoom.us/j/123456789?pwd=...
//   - https://company.zoom.us/j/123456789
var zoomURLPattern = regexp.MustCompile(`(?i)(zoom\.us|zoomgov\.com)/j/(\d+)`)

// Provider implements provider.MeetingProvider for Zoom via Vexa browser bot.
// The Vexa bot joins Zoom via browser automation — no SDK approval required.
type Provider struct {
	vexaClient  *vexa.Client
	tokenStore  TokenStore
}

// New creates a Zoom provider. tokenStore handles OAuth token persistence.
func New(vexaClient *vexa.Client, tokenStore TokenStore) *Provider {
	return &Provider{
		vexaClient: vexaClient,
		tokenStore: tokenStore,
	}
}

func (p *Provider) Name() string { return ProviderName }

// DetectMeetingURL returns true for Zoom meeting URLs.
func (p *Provider) DetectMeetingURL(rawURL string) bool {
	return zoomURLPattern.MatchString(rawURL)
}

// ExtractNativeID extracts the Zoom meeting ID from a URL.
// e.g. https://zoom.us/j/123456789?pwd=abc → "123456789"
func (p *Provider) ExtractNativeID(meetingURL string) (string, error) {
	m := zoomURLPattern.FindStringSubmatch(meetingURL)
	if len(m) < 3 {
		return "", fmt.Errorf("could not extract Zoom meeting ID from URL: %s", meetingURL)
	}
	return m[2], nil
}

// extractPassword parses the ?pwd= query parameter from a Zoom URL.
func extractPassword(meetingURL string) string {
	u, err := url.Parse(meetingURL)
	if err != nil {
		return ""
	}
	return u.Query().Get("pwd")
}

// buildVexaZoomURL constructs the Zoom URL Vexa will navigate to.
// Vexa's Playwright bot handles Zoom browser joining at zoom.us/wc/<id>/join
func buildVexaZoomURL(meetingURL string) string {
	// Normalize to standard zoom.us domain for Vexa compatibility
	normalized := strings.ToLower(meetingURL)
	if !strings.HasPrefix(normalized, "http") {
		normalized = "https://" + normalized
	}
	return normalized
}

// StartBot dispatches the Vexa bot to the Zoom meeting using browser automation.
func (p *Provider) StartBot(ctx context.Context, meetingURL string, opts provider.BotOptions) (provider.BotHandle, error) {
	nativeID, err := p.ExtractNativeID(meetingURL)
	if err != nil {
		return provider.BotHandle{}, err
	}

	logger.L.Info("starting Zoom bot via Vexa",
		zap.String("zoom_meeting_id", nativeID),
		zap.String("user_id", opts.UserID),
	)

	// Construct a clean Zoom join URL for Vexa
	joinURL := buildVexaZoomURL(meetingURL)

	// Vexa's StartBot accepts the URL directly; Playwright handles the browser join flow
	containerNativeID, err := p.vexaClient.StartBot(joinURL)
	if err != nil {
		return provider.BotHandle{}, fmt.Errorf("zoom start bot failed: %w", err)
	}

	return provider.BotHandle{
		NativeID:    nativeID,
		ContainerID: containerNativeID,
	}, nil
}

// StopBot removes the Vexa bot from the Zoom meeting.
func (p *Provider) StopBot(ctx context.Context, nativeID string) error {
	return p.vexaClient.StopBot(nativeID)
}

// ConnectAndStream subscribes to the Vexa WebSocket transcript stream for this Zoom meeting.
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
