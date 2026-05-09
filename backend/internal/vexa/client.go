package vexa

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.uber.org/zap"

	"notemind/pkg/logger"
)

// Client handles all HTTP communication with the Vexa API Gateway.
// Vexa is treated as an external microservice — this client never imports Vexa code.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a Vexa HTTP client. baseURL is the Vexa API Gateway base (e.g. http://localhost:8056).
func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// BaseURL returns the Vexa gateway base URL (used by the WebSocket streamer).
func (c *Client) BaseURL() string { return c.baseURL }

// APIKey returns the Vexa API key (used by the WebSocket streamer).
func (c *Client) APIKey() string { return c.apiKey }

// ExtractNativeID parses a Google Meet URL and returns the meeting code.
// e.g. https://meet.google.com/abc-defg-hij  →  "abc-defg-hij"
func ExtractNativeID(meetingURL string) (string, error) {
	u, err := url.Parse(meetingURL)
	if err != nil {
		return "", fmt.Errorf("invalid meeting URL: %w", err)
	}
	// Path is like /abc-defg-hij
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return "", fmt.Errorf("could not extract meeting ID from URL: %s", meetingURL)
	}
	return parts[0], nil
}

// StartBot sends a bot to a Google Meet meeting and returns the native meeting ID.
func (c *Client) StartBot(meetingURL string) (string, error) {
	nativeID, err := ExtractNativeID(meetingURL)
	if err != nil {
		return "", err
	}

	reqBody := StartBotRequest{
		Platform:          PlatformGoogleMeet,
		NativeMeetingID:   nativeID,
		TranscribeEnabled: true,
		TranscriptionTier: "realtime",
		RecordingEnabled:  false,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal bot request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, c.baseURL+"/bots", bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)

	logger.L.Info("starting Vexa bot",
		zap.String("meeting_url", meetingURL),
		zap.String("native_id", nativeID),
	)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("vexa API unreachable: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("vexa API error %d: %s", resp.StatusCode, string(body))
	}

	var botResp BotResponse
	if err := json.Unmarshal(body, &botResp); err != nil {
		return "", fmt.Errorf("failed to parse bot response: %w", err)
	}

	logger.L.Info("Vexa bot started",
		zap.String("native_id", nativeID),
		zap.String("status", botResp.Status),
	)
	return nativeID, nil
}

// StopBot tells Vexa to stop the bot in the given meeting.
func (c *Client) StopBot(nativeMeetingID string) error {
	endpoint := fmt.Sprintf("%s/bots/%s/%s", c.baseURL, PlatformGoogleMeet, nativeMeetingID)
	req, err := http.NewRequest(http.MethodDelete, endpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to build stop request: %w", err)
	}
	req.Header.Set("X-API-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("vexa API unreachable on stop: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("vexa stop error %d: %s", resp.StatusCode, string(body))
	}

	logger.L.Info("Vexa bot stopped", zap.String("native_meeting_id", nativeMeetingID))
	return nil
}

// GetTranscriptSnapshot fetches the full current transcript via REST (for bootstrapping).
func (c *Client) GetTranscriptSnapshot(nativeMeetingID string) ([]TranscriptSegment, error) {
	endpoint := fmt.Sprintf("%s/transcripts/%s/%s", c.baseURL, PlatformGoogleMeet, nativeMeetingID)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("vexa transcript fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, nil // Not available yet
	}

	var t TranscriptResponse
	if err := json.NewDecoder(resp.Body).Decode(&t); err != nil {
		return nil, fmt.Errorf("failed to parse transcript response: %w", err)
	}
	return t.Segments, nil
}
