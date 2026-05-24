// Package calendar provides Google Calendar and Outlook sync functionality.
// It auto-detects meeting links in calendar events and optionally triggers
// automatic bot joins via automation rules.
package calendar

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"time"

	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// ── Types ─────────────────────────────────────────────────────────────────────

type Provider string

const (
	ProviderGoogle  Provider = "google"
	ProviderOutlook Provider = "outlook"
)

// CalendarEvent is the normalized calendar event across all providers.
type CalendarEvent struct {
	ID              string
	UserID          string
	ConnectionID    string
	ProviderEventID string
	Provider        Provider
	Title           string
	Description     string
	Location        string
	StartAt         time.Time
	EndAt           time.Time
	MeetingURL      string    // detected Google Meet / Zoom URL
	Attendees       []Attendee
	IsRecurring     bool
	RecurrenceRule  string
}

// Attendee is a meeting participant from the calendar event.
type Attendee struct {
	Email          string `json:"email"`
	Name           string `json:"name"`
	ResponseStatus string `json:"response_status"` // accepted, declined, tentative, needsAction
}

// CalendarConnection represents an authorized calendar for a user.
type CalendarConnection struct {
	ID             string
	UserID         string
	Provider       Provider
	CalendarID     string
	SyncToken      string
	WebhookID      string
	WebhookExpires time.Time
	Enabled        bool
}

// ── URL detection ─────────────────────────────────────────────────────────────

var (
	googleMeetPattern = regexp.MustCompile(`https://meet\.google\.com/[a-z\-]+`)
	zoomPattern       = regexp.MustCompile(`https://[a-z0-9.]*zoom\.us/j/\d+[^\s"<]*`)
	teamsPattern      = regexp.MustCompile(`https://teams\.microsoft\.com/l/meetup-join/[^\s"<]+`)
)

// DetectMeetingURL scans event text fields for a supported meeting URL.
// Returns the first match found, or empty string if none.
func DetectMeetingURL(title, description, location string) string {
	combined := title + " " + description + " " + location

	if m := googleMeetPattern.FindString(combined); m != "" {
		return m
	}
	if m := zoomPattern.FindString(combined); m != "" {
		return m
	}
	if m := teamsPattern.FindString(combined); m != "" {
		return m
	}
	return ""
}

// ── Repository ────────────────────────────────────────────────────────────────

// Repository handles DB persistence for calendar data.
type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

// UpsertEvent inserts or updates a calendar event record.
func (r *Repository) UpsertEvent(ctx context.Context, evt *CalendarEvent) error {
	attendeesJSON := attendeesToJSON(evt.Attendees)
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO calendar_events
			(id, user_id, connection_id, provider_event_id, provider, title, description, location,
			 start_at, end_at, meeting_url, attendees, is_recurring, recurrence,
			 updated_at)
		VALUES
			(gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
			 $8, $9, $10, $11, $12, $13,
			 NOW())
		ON CONFLICT (user_id, provider, provider_event_id) DO UPDATE
		SET title        = EXCLUDED.title,
		    description  = EXCLUDED.description,
		    location     = EXCLUDED.location,
		    start_at     = EXCLUDED.start_at,
		    end_at       = EXCLUDED.end_at,
		    meeting_url  = EXCLUDED.meeting_url,
		    attendees    = EXCLUDED.attendees,
		    is_recurring = EXCLUDED.is_recurring,
		    recurrence   = EXCLUDED.recurrence,
		    updated_at   = NOW()
	`,
		evt.UserID, evt.ConnectionID, evt.ProviderEventID, string(evt.Provider),
		evt.Title, evt.Description, evt.Location,
		evt.StartAt, evt.EndAt, nullStr(evt.MeetingURL), attendeesJSON, evt.IsRecurring, evt.RecurrenceRule,
	)
	return err
}

// GetUpcomingWithMeetingURL returns events in the next window that have a meeting URL and no bot yet.
func (r *Repository) GetUpcomingWithMeetingURL(ctx context.Context, userID string, within time.Duration) ([]CalendarEvent, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, user_id, connection_id, provider_event_id, provider,
		       title, description, location, start_at, end_at, meeting_url,
		       is_recurring, COALESCE(recurrence, '')
		FROM calendar_events
		WHERE user_id = $1
		  AND meeting_url IS NOT NULL AND meeting_url != ''
		  AND notemind_meeting_id IS NULL
		  AND start_at BETWEEN NOW() AND NOW() + $2::interval
		ORDER BY start_at
	`, userID, fmt.Sprintf("%d seconds", int(within.Seconds())))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var e CalendarEvent
		var meetingURL sql.NullString
		if err := rows.Scan(
			&e.ID, &e.UserID, &e.ConnectionID, &e.ProviderEventID, &e.Provider,
			&e.Title, &e.Description, &e.Location, &e.StartAt, &e.EndAt,
			&meetingURL, &e.IsRecurring, &e.RecurrenceRule,
		); err != nil {
			return nil, err
		}
		if meetingURL.Valid {
			e.MeetingURL = meetingURL.String
		}
		events = append(events, e)
	}
	return events, nil
}

// MarkEventJoined links a calendar event to the Notemind meeting that was auto-joined.
func (r *Repository) MarkEventJoined(ctx context.Context, calendarEventID, meetingID string) error {
	_, err := db.DB.ExecContext(ctx,
		"UPDATE calendar_events SET notemind_meeting_id = $1 WHERE id = $2",
		meetingID, calendarEventID)
	return err
}

// GetConnections returns all active calendar connections for a user.
func (r *Repository) GetConnections(ctx context.Context, userID string) ([]CalendarConnection, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, user_id, provider, calendar_id, COALESCE(sync_token,''),
		       COALESCE(webhook_id,''), enabled
		FROM calendar_connections
		WHERE user_id = $1 AND enabled = true
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conns []CalendarConnection
	for rows.Next() {
		var c CalendarConnection
		if err := rows.Scan(&c.ID, &c.UserID, &c.Provider, &c.CalendarID,
			&c.SyncToken, &c.WebhookID, &c.Enabled); err != nil {
			return nil, err
		}
		conns = append(conns, c)
	}
	return conns, nil
}

// SaveSyncToken persists the incremental sync token for a calendar connection.
func (r *Repository) SaveSyncToken(ctx context.Context, connectionID, token string) error {
	_, err := db.DB.ExecContext(ctx,
		"UPDATE calendar_connections SET sync_token = $1, updated_at = NOW() WHERE id = $2",
		token, connectionID)
	return err
}

// ── Service ───────────────────────────────────────────────────────────────────

// SyncService orchestrates calendar syncing across providers.
type SyncService struct {
	repo   *Repository
	google *GoogleCalendarClient
}

func NewSyncService(repo *Repository, googleCfg GoogleConfig) *SyncService {
	return &SyncService{
		repo:   repo,
		google: NewGoogleCalendarClient(googleCfg),
	}
}

// SyncUser runs a full incremental sync for all of a user's connected calendars.
func (s *SyncService) SyncUser(ctx context.Context, userID string) error {
	connections, err := s.repo.GetConnections(ctx, userID)
	if err != nil {
		return fmt.Errorf("calendar sync: failed to get connections: %w", err)
	}

	for _, conn := range connections {
		switch conn.Provider {
		case ProviderGoogle:
			if err := s.syncGoogleCalendar(ctx, conn); err != nil {
				logger.L.Error("google calendar sync failed",
					zap.String("user_id", userID),
					zap.String("connection_id", conn.ID),
					zap.Error(err))
			}
		case ProviderOutlook:
			logger.L.Info("outlook calendar sync not yet implemented", zap.String("connection_id", conn.ID))
		}
	}
	return nil
}

func (s *SyncService) syncGoogleCalendar(ctx context.Context, conn CalendarConnection) error {
	ctx = WithUserID(ctx, conn.UserID)
	events, nextSyncToken, err := s.google.ListEventsDelta(ctx, conn.CalendarID, conn.SyncToken)
	if err != nil {
		return err
	}

	for i := range events {
		events[i].UserID = conn.UserID
		events[i].ConnectionID = conn.ID
		events[i].MeetingURL = DetectMeetingURL(events[i].Title, events[i].Description, events[i].Location)
		if err := s.repo.UpsertEvent(ctx, &events[i]); err != nil {
			logger.L.Error("failed to upsert calendar event",
				zap.String("provider_event_id", events[i].ProviderEventID),
				zap.Error(err))
		}
	}

	if nextSyncToken != "" {
		if err := s.repo.SaveSyncToken(ctx, conn.ID, nextSyncToken); err != nil {
			logger.L.Warn("failed to save sync token", zap.Error(err))
		}
	}

	logger.L.Info("google calendar sync complete",
		zap.String("connection_id", conn.ID),
		zap.Int("events_synced", len(events)))
	return nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func attendeesToJSON(attendees []Attendee) []byte {
	if len(attendees) == 0 {
		return []byte("[]")
	}
	buf := make([]byte, 0, 256)
	buf = append(buf, '[')
	for i, a := range attendees {
		if i > 0 {
			buf = append(buf, ',')
		}
		buf = append(buf, []byte(
			fmt.Sprintf(`{"email":%q,"name":%q,"response_status":%q}`, a.Email, a.Name, a.ResponseStatus),
		)...)
	}
	buf = append(buf, ']')
	return buf
}
