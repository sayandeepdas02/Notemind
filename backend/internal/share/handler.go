package share

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// Handler serves all share-related HTTP endpoints.
type Handler struct {
	store Store
}

// NewHandler returns a Handler backed by the application database.
func NewHandler() *Handler {
	return NewHandlerWithStore(&sqlStore{db: db.DB})
}

// NewHandlerWithStore returns a Handler using the provided Store.
// Intended for unit tests that inject a mock Store.
func NewHandlerWithStore(s Store) *Handler {
	return &Handler{store: s}
}

type createShareRequest struct {
	ExpiresInHours *int  `json:"expires_in_hours"`
	IsPublic       *bool `json:"is_public"`
}

// CreateShare generates a share token for a meeting.
// POST /meetings/:id/share
func (h *Handler) CreateShare(c *gin.Context) {
	meetingID := c.Param("id")
	userID := c.GetString("user_id")

	ok, err := h.store.CanWriteShare(c.Request.Context(), meetingID, userID)
	if err != nil {
		logger.L.Error("share access check failed", zap.String("meeting_id", meetingID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "meeting not found or unauthorized"})
		return
	}

	var req createShareRequest
	_ = c.ShouldBindJSON(&req) // body is optional

	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	var expiresAt *time.Time
	if req.ExpiresInHours != nil && *req.ExpiresInHours > 0 {
		t := time.Now().UTC().Add(time.Duration(*req.ExpiresInHours) * time.Hour)
		expiresAt = &t
	}

	token, err := h.store.InsertShare(c.Request.Context(), meetingID, userID, isPublic, expiresAt)
	if err != nil {
		logger.L.Error("failed to create share", zap.String("meeting_id", meetingID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate share link"})
		return
	}

	resp := gin.H{"share_token": token}
	if expiresAt != nil {
		resp["expires_at"] = expiresAt.Format(time.RFC3339)
	}
	c.JSON(http.StatusOK, resp)
}

// RevokeShare marks a share token as revoked so it can no longer be used.
// DELETE /meetings/:id/share/:token
func (h *Handler) RevokeShare(c *gin.Context) {
	meetingID := c.Param("id")
	token := c.Param("token")
	userID := c.GetString("user_id")

	ok, err := h.store.CanWriteShare(c.Request.Context(), meetingID, userID)
	if err != nil {
		logger.L.Error("share access check failed", zap.String("meeting_id", meetingID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "meeting not found or unauthorized"})
		return
	}

	found, err := h.store.RevokeShare(c.Request.Context(), meetingID, token)
	if err != nil {
		logger.L.Error("failed to revoke share",
			zap.String("meeting_id", meetingID),
			zap.String("token", token),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke share"})
		return
	}
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "share not found or already revoked"})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetSharedIntelligence returns the meeting intelligence for a public, active share token.
// GET /share/:token
func (h *Handler) GetSharedIntelligence(c *gin.Context) {
	token := c.Param("token")

	meetingID, err := h.store.LookupShare(c.Request.Context(), token)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "invalid, revoked, or expired share link"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify share token"})
		return
	}

	result, err := h.store.GetIntelligence(c.Request.Context(), meetingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch meeting intelligence"})
		return
	}

	c.JSON(http.StatusOK, result)
}
