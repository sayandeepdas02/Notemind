package memory

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Handler provides REST endpoints for AI memory.
type Handler struct {
	searchSvc *SearchService
	rag       *RAGEngine
	repo      *Repository
}

func NewHandler(searchSvc *SearchService, rag *RAGEngine, repo *Repository) *Handler {
	return &Handler{
		searchSvc: searchSvc,
		rag:       rag,
		repo:      repo,
	}
}

// GET /memory/search?q=&meeting_id=&participant=&from=&to=&limit=
func (h *Handler) Search(c *gin.Context) {
	userID := c.GetString("user_id")
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing query parameter 'q'"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	filters := SearchFilters{
		MeetingID:   c.Query("meeting_id"),
		Participant: c.Query("participant"),
	}

	if from := c.Query("from"); from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			filters.FromDate = t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			filters.ToDate = t
		}
	}

	results, err := h.searchSvc.Search(c.Request.Context(), userID, q, filters, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if results == nil {
		results = []SearchResult{}
	}
	c.JSON(http.StatusOK, results)
}

// GET /memory/ask?q=&meeting_id=&session_id=
// Uses Server-Sent Events (SSE) to stream the LLM response.
func (h *Handler) Ask(c *gin.Context) {
	userID := c.GetString("user_id")
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing query parameter 'q'"})
		return
	}

	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing session_id"})
		return
	}

	filters := SearchFilters{
		MeetingID: c.Query("meeting_id"),
	}

	// Set headers for SSE
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	// Flush headers to establish stream
	c.Writer.Flush()

	// Notify client client disconnected
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	streamCh, citations, err := h.rag.Ask(ctx, userID, q, filters, sessionID)
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", err.Error())
		c.Writer.Flush()
		return
	}

	// Send citations first
	if len(citations) > 0 {
		c.SSEvent("citations", citations)
		c.Writer.Flush()
	}

	// Stream tokens
	for token := range streamCh {
		c.SSEvent("token", token)
		c.Writer.Flush()
	}

	// Send done signal
	c.SSEvent("done", "[DONE]")
	c.Writer.Flush()
}

// GET /memory/chat/history?session_id=&limit=
func (h *Handler) GetHistory(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing session_id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	history, err := h.repo.GetChatHistory(c.Request.Context(), sessionID, userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if history == nil {
		history = []ChatMessage{}
	}
	c.JSON(http.StatusOK, history)
}
