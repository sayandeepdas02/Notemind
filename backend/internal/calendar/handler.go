package calendar

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/auth"
	"notemind/internal/db"
	"notemind/pkg/logger"
)

// Handler wires Google Calendar OAuth and sync into the HTTP layer.
type Handler struct {
	syncSvc     *SyncService
	client      *GoogleCalendarClient
	frontendURL string
}

// NewHandler creates a CalendarHandler.
func NewHandler(syncSvc *SyncService, frontendURL string) *Handler {
	return &Handler{
		syncSvc:     syncSvc,
		client:      syncSvc.google,
		frontendURL: frontendURL,
	}
}

// GET /auth/google-calendar
// Protected — user_id comes from auth middleware.
// Redirects the browser to Google's OAuth consent page.
// State is a signed JWT so the callback can verify it wasn't forged.
func (h *Handler) InitiateOAuth(c *gin.Context) {
	userID := c.GetString("user_id")
	stateToken, err := auth.GenerateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
		return
	}
	c.Redirect(http.StatusFound, h.client.AuthorizationURL(stateToken))
}

// GET /auth/google-calendar/callback
// Public — receives the authorization code from Google.
// Validates the signed state token to recover user_id.
func (h *Handler) OAuthCallback(c *gin.Context) {
	code := c.Query("code")
	stateToken := c.Query("state")

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing authorization code"})
		return
	}
	if stateToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing state parameter"})
		return
	}

	userID, err := auth.ValidateToken(stateToken)
	if err != nil || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired state"})
		return
	}

	ctx := c.Request.Context()

	if err := h.client.ExchangeCode(ctx, userID, code); err != nil {
		logger.L.Error("google calendar code exchange failed", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to connect Google Calendar"})
		return
	}

	// Create or re-enable the calendar_connections record for "primary" calendar.
	connID := uuid.New().String()
	if _, err := db.DB.ExecContext(ctx, `
		INSERT INTO calendar_connections (id, user_id, provider, calendar_id, enabled, updated_at)
		VALUES ($1, $2, 'google', 'primary', true, NOW())
		ON CONFLICT (user_id, provider, calendar_id) DO UPDATE
		SET enabled = true, updated_at = NOW()
	`, connID, userID); err != nil {
		logger.L.Warn("failed to upsert calendar connection", zap.String("user_id", userID), zap.Error(err))
	}

	// Kick off the first sync in a background goroutine so the redirect is instant.
	go func() {
		bgCtx := WithUserID(context.Background(), userID)
		if err := h.syncSvc.SyncUser(bgCtx, userID); err != nil {
			logger.L.Error("initial google calendar sync failed",
				zap.String("user_id", userID), zap.Error(err))
		}
	}()

	c.Redirect(http.StatusFound, h.frontendURL+"/dashboard/settings?calendar=connected")
}

// POST /calendar/sync
// Protected — manually triggers an incremental calendar sync for the authenticated user.
func (h *Handler) SyncCalendar(c *gin.Context) {
	userID := c.GetString("user_id")
	ctx := WithUserID(c.Request.Context(), userID)
	if err := h.syncSvc.SyncUser(ctx, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "synced"})
}

// GET /calendar/events
// Protected — returns upcoming calendar events that contain a meeting URL.
func (h *Handler) ListEvents(c *gin.Context) {
	userID := c.GetString("user_id")
	events, err := h.syncSvc.repo.GetUpcomingWithMeetingURL(c.Request.Context(), userID, 7*24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if events == nil {
		events = []CalendarEvent{}
	}
	c.JSON(http.StatusOK, events)
}

// GET /calendar/status
// Protected — returns the connection status and upcoming meeting count.
func (h *Handler) GetStatus(c *gin.Context) {
	userID := c.GetString("user_id")
	ctx := c.Request.Context()

	conns, err := h.syncSvc.repo.GetConnections(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	connected := len(conns) > 0
	upcomingCount := 0
	if connected {
		events, _ := h.syncSvc.repo.GetUpcomingWithMeetingURL(ctx, userID, 24*time.Hour)
		upcomingCount = len(events)
	}

	c.JSON(http.StatusOK, gin.H{
		"connected":      connected,
		"upcoming_count": upcomingCount,
	})
}
