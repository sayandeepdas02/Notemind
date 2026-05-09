package share

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/ai"
	"notemind/internal/db"
	"notemind/pkg/logger"
)

type Handler struct {
	db *sql.DB
}

func NewHandler() *Handler {
	return &Handler{db: db.DB}
}

// CreateShare generates a share token for a meeting.
// POST /meetings/:id/share
func (h *Handler) CreateShare(c *gin.Context) {
	meetingID := c.Param("id")
	userID := c.GetString("user_id")

	// Verify ownership
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM meetings WHERE id = $1 AND user_id = $2)", meetingID, userID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "meeting not found or unauthorized"})
		return
	}

	// Create share token
	token := uuid.New().String()
	_, err = h.db.Exec(`
		INSERT INTO meeting_shares (id, meeting_id, share_token)
		VALUES ($1, $2, $3)`,
		uuid.New().String(), meetingID, token)

	if err != nil {
		logger.L.Error("failed to create share", zap.String("meeting_id", meetingID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate share link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"share_token": token})
}

// GetSharedIntelligence returns the meeting intelligence for a public share token.
// GET /share/:token
func (h *Handler) GetSharedIntelligence(c *gin.Context) {
	token := c.Param("token")

	var meetingID string
	err := h.db.QueryRow("SELECT meeting_id FROM meeting_shares WHERE share_token = $1 AND is_public = true", token).Scan(&meetingID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "invalid or private share link"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify share token"})
		return
	}

	// Fetch intelligence manually to avoid circular deps with meeting repo, or reuse it.
	// For simplicity, we just duplicate the fetch logic or we could inject meeting.Repository here.
	
	var result ai.MeetingSummary
	var summaryText sql.NullString
	err = h.db.QueryRow("SELECT summary_text FROM summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1", meetingID).Scan(&summaryText)
	if err == nil && summaryText.Valid {
		result.Summary = summaryText.String
	}

	rows, err := h.db.Query("SELECT task, COALESCE(owner,'') FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var ai ai.ActionItem
			if rows.Scan(&ai.Task, &ai.Owner) == nil {
				result.ActionItems = append(result.ActionItems, ai)
			}
		}
		rows.Close()
	}

	rows, err = h.db.Query("SELECT decision_text FROM decisions WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var d string
			if rows.Scan(&d) == nil {
				result.Decisions = append(result.Decisions, d)
			}
		}
		rows.Close()
	}

	rows, err = h.db.Query("SELECT point_text FROM key_points WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var kp string
			if rows.Scan(&kp) == nil {
				result.KeyPoints = append(result.KeyPoints, kp)
			}
		}
		rows.Close()
	}

	c.JSON(http.StatusOK, result)
}
