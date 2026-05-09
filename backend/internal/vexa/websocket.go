package vexa

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"notemind/pkg/logger"
)

const (
	pingInterval    = 25 * time.Second
	reconnectDelay  = 5 * time.Second
	maxReconnects   = 10
	batchFlushEvery = 2 * time.Second
)

// SegmentHandler is the callback fired when new transcript segments arrive.
// The caller (meeting service) is responsible for persisting segments to DB.
type SegmentHandler func(segments []TranscriptSegment)

// StatusHandler is the callback fired when meeting status changes.
type StatusHandler func(status string)

// Streamer manages the WebSocket connection to Vexa's /ws endpoint.
type Streamer struct {
	wsURL           string
	apiKey          string
	nativeMeetingID string
	platform        string
}

// NewStreamer creates a Streamer for a given meeting.
// wsURL is derived from the API base: http://localhost:8056 → ws://localhost:8056/ws
func NewStreamer(apiBaseURL, apiKey, nativeMeetingID string) *Streamer {
	// Convert http(s) → ws(s)
	wsURL := strings.Replace(apiBaseURL, "https://", "wss://", 1)
	wsURL = strings.Replace(wsURL, "http://", "ws://", 1)
	wsURL = strings.TrimRight(wsURL, "/") + "/ws"

	return &Streamer{
		wsURL:           wsURL,
		apiKey:          apiKey,
		nativeMeetingID: nativeMeetingID,
		platform:        PlatformGoogleMeet,
	}
}

// ConnectAndStream connects to Vexa WebSocket, subscribes to the meeting,
// and calls onSegment whenever new transcript segments arrive.
// It runs until ctx is cancelled, reconnecting automatically on disconnects.
func (s *Streamer) ConnectAndStream(ctx context.Context, onSegment SegmentHandler, onStatus StatusHandler) {
	attempts := 0

	for {
		select {
		case <-ctx.Done():
			logger.L.Info("Vexa WS context cancelled, stopping stream",
				zap.String("native_meeting_id", s.nativeMeetingID))
			return
		default:
		}

		if attempts >= maxReconnects {
			logger.L.Error("Vexa WS max reconnects reached",
				zap.String("native_meeting_id", s.nativeMeetingID),
				zap.Int("max_reconnects", maxReconnects))
			return
		}

		if attempts > 0 {
			delay := time.Duration(attempts) * reconnectDelay
			logger.L.Info("Vexa WS reconnecting",
				zap.String("native_meeting_id", s.nativeMeetingID),
				zap.Int("attempt", attempts),
				zap.Duration("delay", delay),
			)
			select {
			case <-ctx.Done():
				return
			case <-time.After(delay):
			}
		}

		err := s.runSession(ctx, onSegment, onStatus)
		if err != nil {
			logger.L.Error("Vexa WS session error",
				zap.String("native_meeting_id", s.nativeMeetingID),
				zap.Error(err))
		}
		attempts++
	}
}

// runSession opens one WebSocket session, subscribes, and reads messages until error or ctx cancel.
func (s *Streamer) runSession(ctx context.Context, onSegment SegmentHandler, onStatus StatusHandler) error {
	headers := map[string][]string{
		"X-API-Key": {s.apiKey},
	}

	dialer := websocket.Dialer{}
	conn, _, err := dialer.DialContext(ctx, s.wsURL, headers)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}
	defer conn.Close()

	logger.L.Info("Vexa WS connected", zap.String("ws_url", s.wsURL))

	// Send subscription message
	subMsg := WSSubscribeMsg{
		Action: "subscribe",
		Meetings: []WSMeetingID{
			{Platform: s.platform, NativeID: s.nativeMeetingID},
		},
	}
	if err := conn.WriteJSON(subMsg); err != nil {
		return fmt.Errorf("subscribe write failed: %w", err)
	}
	logger.L.Info("Vexa WS subscribed", zap.String("native_meeting_id", s.nativeMeetingID))

	// Ping ticker to keep connection alive
	pingTicker := time.NewTicker(pingInterval)
	defer pingTicker.Stop()

	// Batch buffer: collect segments and flush periodically
	var batch []TranscriptSegment
	flushTicker := time.NewTicker(batchFlushEvery)
	defer flushTicker.Stop()

	// Run reader in a separate goroutine
	msgCh := make(chan WSIncomingMessage, 64)
	errCh := make(chan error, 1)
	go func() {
		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				errCh <- err
				return
			}
			var msg WSIncomingMessage
			if err := json.Unmarshal(raw, &msg); err != nil {
				logger.L.Error("Vexa WS failed to parse message", zap.Error(err))
				continue
			}
			msgCh <- msg
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return nil

		case err := <-errCh:
			return fmt.Errorf("websocket read error: %w", err)

		case <-pingTicker.C:
			if err := conn.WriteJSON(WSPingMsg{Action: "ping"}); err != nil {
				return fmt.Errorf("ping failed: %w", err)
			}

		case <-flushTicker.C:
			if len(batch) > 0 {
				toFlush := batch
				batch = nil
				onSegment(toFlush)
			}

		case msg := <-msgCh:
			switch msg.Type {
			case "subscribed":
				logger.L.Info("Vexa WS subscription confirmed", zap.Any("meetings", msg.Meeting))

			case "transcript.mutable":
				// Buffer valid, non-empty segments
				for _, seg := range msg.Payload.Segments {
					if strings.TrimSpace(seg.Text) != "" && seg.AbsoluteStartTime != "" {
						batch = append(batch, seg)
					}
				}

			case "meeting.status":
				logger.L.Info("Vexa WS meeting status update",
					zap.String("native_meeting_id", s.nativeMeetingID),
					zap.String("status", msg.Payload.Status))
				if onStatus != nil {
					onStatus(msg.Payload.Status)
				}

			case "pong":
				// keepalive acknowledged, use as heartbeat
				if onStatus != nil {
					onStatus("heartbeat")
				}

			case "error":
				logger.L.Error("Vexa WS server error", zap.String("error", msg.Error))
			}
		}
	}
}
