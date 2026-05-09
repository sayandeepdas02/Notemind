package calendar

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

const (
	googleCalendarAPIBase = "https://www.googleapis.com/calendar/v3"
	googleTokenURL        = "https://oauth2.googleapis.com/token"
	googleAuthURL         = "https://accounts.google.com/o/oauth2/v2/auth"
)

// GoogleConfig holds Google OAuth credentials for Calendar access.
type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

// GoogleCalendarClient handles Google Calendar API interactions.
type GoogleCalendarClient struct {
	cfg        GoogleConfig
	httpClient *http.Client
}

func NewGoogleCalendarClient(cfg GoogleConfig) *GoogleCalendarClient {
	return &GoogleCalendarClient{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 20 * time.Second},
	}
}

// AuthorizationURL builds the Google OAuth consent URL for calendar access.
func (g *GoogleCalendarClient) AuthorizationURL(state string) string {
	scopes := []string{
		"https://www.googleapis.com/auth/calendar.readonly",
		"https://www.googleapis.com/auth/calendar.events.readonly",
	}
	params := url.Values{
		"client_id":     {g.cfg.ClientID},
		"redirect_uri":  {g.cfg.RedirectURI},
		"response_type": {"code"},
		"scope":         {strings.Join(scopes, " ")},
		"access_type":   {"offline"},
		"prompt":        {"consent"},
		"state":         {state},
	}
	return googleAuthURL + "?" + params.Encode()
}

// googleTokenResponse is the JSON response from Google's token endpoint.
type googleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// ExchangeCode exchanges an authorization code for access + refresh tokens,
// then persists them in the oauth_tokens table.
func (g *GoogleCalendarClient) ExchangeCode(ctx context.Context, userID, code string) error {
	body := url.Values{
		"code":          {code},
		"client_id":     {g.cfg.ClientID},
		"client_secret": {g.cfg.ClientSecret},
		"redirect_uri":  {g.cfg.RedirectURI},
		"grant_type":    {"authorization_code"},
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, googleTokenURL,
		strings.NewReader(body.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("google token exchange: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("google token endpoint %d: %s", resp.StatusCode, raw)
	}

	var tr googleTokenResponse
	if err := json.Unmarshal(raw, &tr); err != nil {
		return err
	}

	expiresAt := time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)
	_, err = db.DB.ExecContext(ctx, `
		INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_type, expires_at, scopes, updated_at)
		VALUES ($1, 'google_calendar', $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id, provider) DO UPDATE
		SET access_token  = EXCLUDED.access_token,
		    refresh_token  = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
		    expires_at    = EXCLUDED.expires_at,
		    updated_at    = NOW()
	`, userID, tr.AccessToken, tr.RefreshToken, tr.TokenType, expiresAt,
		[]string{"calendar.readonly", "calendar.events.readonly"})
	return err
}

// getValidToken returns a valid access token for the user, refreshing if needed.
func (g *GoogleCalendarClient) getValidToken(ctx context.Context, userID string) (string, error) {
	var accessToken, refreshToken string
	var expiresAt time.Time
	err := db.DB.QueryRowContext(ctx, `
		SELECT access_token, COALESCE(refresh_token,''), expires_at
		FROM oauth_tokens WHERE user_id = $1 AND provider = 'google_calendar'
	`, userID).Scan(&accessToken, &refreshToken, &expiresAt)
	if err != nil {
		return "", fmt.Errorf("google calendar token not found for user %s", userID)
	}

	if time.Now().Before(expiresAt.Add(-60 * time.Second)) {
		return accessToken, nil
	}

	// Refresh
	if refreshToken == "" {
		return "", fmt.Errorf("google calendar token expired and no refresh_token stored")
	}
	body := url.Values{
		"client_id":     {g.cfg.ClientID},
		"client_secret": {g.cfg.ClientSecret},
		"refresh_token": {refreshToken},
		"grant_type":    {"refresh_token"},
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, googleTokenURL,
		strings.NewReader(body.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("google token refresh: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var tr googleTokenResponse
	if err := json.Unmarshal(raw, &tr); err != nil {
		return "", err
	}

	newExpiry := time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)
	_, _ = db.DB.ExecContext(ctx, `
		UPDATE oauth_tokens SET access_token = $1, expires_at = $2, updated_at = NOW()
		WHERE user_id = $3 AND provider = 'google_calendar'
	`, tr.AccessToken, newExpiry, userID)

	return tr.AccessToken, nil
}

// googleEventListResponse is the shape of the Calendar API events.list response.
type googleEventListResponse struct {
	Items         []googleEvent `json:"items"`
	NextSyncToken string        `json:"nextSyncToken"`
	NextPageToken string        `json:"nextPageToken"`
}

type googleEvent struct {
	ID          string              `json:"id"`
	Summary     string              `json:"summary"`
	Description string              `json:"description"`
	Location    string              `json:"location"`
	Start       googleEventDateTime `json:"start"`
	End         googleEventDateTime `json:"end"`
	Attendees   []googleAttendee    `json:"attendees"`
	Recurrence  []string            `json:"recurrence"`
	Status      string              `json:"status"` // confirmed, tentative, cancelled
}

type googleEventDateTime struct {
	DateTime string `json:"dateTime"`
	Date     string `json:"date"` // all-day events
}

type googleAttendee struct {
	Email          string `json:"email"`
	DisplayName    string `json:"displayName"`
	ResponseStatus string `json:"responseStatus"`
}

// ListEventsDelta fetches events since the last sync token using incremental sync.
// Returns the events, the next sync token, and any error.
func (g *GoogleCalendarClient) ListEventsDelta(ctx context.Context, calendarID, syncToken string) ([]CalendarEvent, string, error) {
	// Get user's token — we need the userID. For simplicity, pass it as part of calendarID context.
	// In production, CalendarConnection would carry the userID.
	// Here we'll pass userID via context value.
	userID, _ := ctx.Value(calendarUserIDKey{}).(string)
	if userID == "" {
		return nil, "", fmt.Errorf("no user_id in context for google calendar sync")
	}

	accessToken, err := g.getValidToken(ctx, userID)
	if err != nil {
		return nil, "", err
	}

	params := url.Values{
		"maxResults":   {"250"},
		"singleEvents": {"true"},
	}
	if syncToken != "" {
		params.Set("syncToken", syncToken)
	} else {
		// Full sync: last 30 days + next 60 days
		params.Set("timeMin", time.Now().AddDate(0, 0, -30).UTC().Format(time.RFC3339))
		params.Set("timeMax", time.Now().AddDate(0, 0, 60).UTC().Format(time.RFC3339))
	}

	var allEvents []CalendarEvent
	var nextSync string

	for {
		endpoint := fmt.Sprintf("%s/calendars/%s/events?%s",
			googleCalendarAPIBase, url.PathEscape(calendarID), params.Encode())

		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)

		resp, err := g.httpClient.Do(req)
		if err != nil {
			return nil, "", fmt.Errorf("google calendar events fetch: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == 410 {
			// Sync token invalid — fall back to full sync
			logger.L.Warn("google calendar sync token expired, performing full sync")
			return g.ListEventsDelta(ctx, calendarID, "")
		}

		if resp.StatusCode >= 400 {
			body, _ := io.ReadAll(resp.Body)
			return nil, "", fmt.Errorf("google calendar API %d: %s", resp.StatusCode, body)
		}

		var result googleEventListResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, "", err
		}

		for _, ge := range result.Items {
			if ge.Status == "cancelled" {
				continue
			}
			evt := googleEventToCalendarEvent(ge)
			allEvents = append(allEvents, evt)
		}

		nextSync = result.NextSyncToken
		if result.NextPageToken == "" {
			break
		}
		params.Set("pageToken", result.NextPageToken)
		params.Del("syncToken")
	}

	return allEvents, nextSync, nil
}

type calendarUserIDKey struct{}

// WithUserID injects a user ID into the context for Google Calendar API calls.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, calendarUserIDKey{}, userID)
}

func googleEventToCalendarEvent(ge googleEvent) CalendarEvent {
	start := parseGoogleDateTime(ge.Start)
	end := parseGoogleDateTime(ge.End)

	var attendees []Attendee
	for _, a := range ge.Attendees {
		attendees = append(attendees, Attendee{
			Email:          a.Email,
			Name:           a.DisplayName,
			ResponseStatus: a.ResponseStatus,
		})
	}

	recurrence := ""
	if len(ge.Recurrence) > 0 {
		recurrence = strings.Join(ge.Recurrence, "\n")
	}

	return CalendarEvent{
		ProviderEventID: ge.ID,
		Provider:        ProviderGoogle,
		Title:           ge.Summary,
		Description:     ge.Description,
		Location:        ge.Location,
		StartAt:         start,
		EndAt:           end,
		Attendees:       attendees,
		IsRecurring:     len(ge.Recurrence) > 0,
		RecurrenceRule:  recurrence,
	}
}

func parseGoogleDateTime(dt googleEventDateTime) time.Time {
	if dt.DateTime != "" {
		t, _ := time.Parse(time.RFC3339, dt.DateTime)
		return t
	}
	if dt.Date != "" {
		t, _ := time.Parse("2006-01-02", dt.Date)
		return t
	}
	return time.Time{}
}

// CreateWebhookSubscription registers a Google Calendar push notification channel.
func (g *GoogleCalendarClient) CreateWebhookSubscription(ctx context.Context, userID, calendarID, webhookURL, channelID string) error {
	accessToken, err := g.getValidToken(ctx, userID)
	if err != nil {
		return err
	}

	payload := map[string]interface{}{
		"id":      channelID,
		"type":    "web_hook",
		"address": webhookURL,
	}
	data, _ := json.Marshal(payload)

	endpoint := fmt.Sprintf("%s/calendars/%s/events/watch", googleCalendarAPIBase, url.PathEscape(calendarID))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(data)))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("google calendar webhook creation failed %d: %s", resp.StatusCode, body)
	}

	logger.L.Info("google calendar webhook created",
		zap.String("user_id", userID),
		zap.String("channel_id", channelID))
	return nil
}
