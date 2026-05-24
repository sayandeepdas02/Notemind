package meeting

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
	hub     *Hub
}

func NewHandler(service *Service, hub *Hub) *Handler {
	return &Handler{service: service, hub: hub}
}

// ─── Phase 1: File Upload ─────────────────────────────────────────────────────

func (h *Handler) UploadAudio(c *gin.Context) {
	file, err := c.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "audio file is required"})
		return
	}
	uploadDir := "uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create upload directory"})
		return
	}
	filename := fmt.Sprintf("%s_%s", uuid.New().String(), file.Filename)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	userID := c.GetString("user_id")
	meetingID, err := h.service.UploadMeeting(savePath, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process meeting"})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"message": "Meeting uploaded", "meeting_id": meetingID})
}

// ─── Phase 2: Vexa Live Join ──────────────────────────────────────────────────

type joinRequest struct {
	MeetingURL  string `json:"meeting_url" binding:"required"`
	MeetingType string `json:"meeting_type"` // optional: general, standup, interview, sales, planning
}

// JoinMeeting dispatches a Vexa bot.
// POST /meetings/join
func (h *Handler) JoinMeeting(c *gin.Context) {
	var req joinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "meeting_url is required"})
		return
	}
	if req.MeetingType == "" {
		req.MeetingType = "general"
	}

	userID := c.GetString("user_id")
	meeting, err := h.service.JoinMeeting(req.MeetingURL, userID, req.MeetingType)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":  "failed to start bot",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"meeting_id":   meeting.ID,
		"status":       meeting.Status,
		"meeting_type": meeting.MeetingType,
	})
}

// StopMeeting removes the Vexa bot.
// DELETE /meetings/:id/bot
func (h *Handler) StopMeeting(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	if err := h.service.StopMeeting(id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "bot stopped"})
}

// ─── SSE Real-time Stream ─────────────────────────────────────────────────────

// StreamTranscripts opens an SSE connection and pushes new transcript segments
// and status changes to the browser as they arrive.
// GET /meetings/:id/stream
func (h *Handler) StreamTranscripts(c *gin.Context) {
	meetingID := c.Param("id")
	userID := c.GetString("user_id")

	// Verify meeting exists
	m, err := h.service.GetMeeting(meetingID, userID)
	if err != nil || m == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "meeting not found"})
		return
	}

	// Subscribe to the hub
	ch, cancel := h.hub.Subscribe(meetingID)
	defer cancel()

	// Set SSE headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering

	// Send initial meeting status event
	initialEvt := SSEEvent{Type: "status", Data: map[string]string{"status": m.Status}}
	if wire, err := MarshalSSE(initialEvt); err == nil {
		c.Writer.Write(wire)
		c.Writer.Flush()
	}

	// Bootstrap: send segments
	lastEventID := c.GetHeader("Last-Event-ID")
	var existing []TranscriptSegment
	if lastEventID != "" {
		var lastSeq int
		fmt.Sscanf(lastEventID, "%d", &lastSeq)
		existing, _ = h.service.GetSegmentsAfter(meetingID, lastSeq)
	} else {
		existing, _ = h.service.GetSegments(meetingID)
	}

	if len(existing) > 0 {
		highestSeq := existing[len(existing)-1].SequenceID
		existingEvt := SSEEvent{
			ID:   fmt.Sprintf("%d", highestSeq),
			Type: "segments",
			Data: existing,
		}
		if wire, err := MarshalSSE(existingEvt); err == nil {
			c.Writer.Write(wire)
			c.Writer.Flush()
		}
	}

	// Heartbeat ticker to keep the connection alive through proxies
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	// Stream events until client disconnects or meeting ends
	for {
		select {
		case <-c.Request.Context().Done():
			return

		case <-heartbeat.C:
			c.Writer.Write([]byte(": heartbeat\n\n"))
			c.Writer.Flush()

		case evt, ok := <-ch:
			if !ok {
				return
			}
			wire, err := MarshalSSE(evt)
			if err != nil {
				continue
			}
			c.Writer.Write(wire)
			c.Writer.Flush()

			// If the meeting ended, close the stream gracefully
			if evt.Type == "status" {
				if d, ok := evt.Data.(map[string]string); ok {
					if s := d["status"]; s == "ended" || s == "failed" {
						return
					}
				}
			}
		}
	}
}

// ─── Read Endpoints ───────────────────────────────────────────────────────────

func (h *Handler) GetMeetings(c *gin.Context) {
	userID := c.GetString("user_id")
	meetings, err := h.service.GetMeetings(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch meetings"})
		return
	}
	if meetings == nil {
		meetings = []Meeting{}
	}
	c.JSON(http.StatusOK, meetings)
}

func (h *Handler) GetMeeting(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	m, err := h.service.GetMeeting(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch meeting"})
		return
	}
	if m == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "meeting not found"})
		return
	}
	c.JSON(http.StatusOK, m)
}

// GetTranscripts returns per-speaker segments (Phase 2) or blob (Phase 1 fallback).
// GET /meetings/:id/transcripts
func (h *Handler) GetTranscripts(c *gin.Context) {
	id := c.Param("id")
	segs, err := h.service.GetSegments(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch transcripts"})
		return
	}
	if segs == nil {
		segs = []TranscriptSegment{}
	}
	c.JSON(http.StatusOK, segs)
}

// GetTranscript is the Phase 1 alias, kept for backward compatibility.
func (h *Handler) GetTranscript(c *gin.Context) {
	h.GetTranscripts(c)
}

func (h *Handler) GetSummary(c *gin.Context) {
	id := c.Param("id")
	intel, err := h.service.GetMeetingIntelligence(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch meeting intelligence"})
		return
	}
	if intel == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "summary not found or not ready"})
		return
	}
	c.JSON(http.StatusOK, intel)
}
