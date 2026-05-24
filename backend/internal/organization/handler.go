package organization

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes folder, tag, and search REST endpoints.
type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// ─── Folders ─────────────────────────────────────────────────────────────────

// GET /folders
func (h *Handler) ListFolders(c *gin.Context) {
	userID := c.GetString("user_id")
	folders, err := h.repo.GetFolders(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if folders == nil {
		folders = []Folder{}
	}
	c.JSON(http.StatusOK, folders)
}

// POST /folders
func (h *Handler) CreateFolder(c *gin.Context) {
	userID := c.GetString("user_id")
	var f Folder
	if err := c.ShouldBindJSON(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f.UserID = userID
	if f.Color == "" {
		f.Color = "#6366f1"
	}
	if err := h.repo.CreateFolder(c.Request.Context(), &f); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, f)
}

// PUT /folders/:id
func (h *Handler) UpdateFolder(c *gin.Context) {
	userID := c.GetString("user_id")
	var f Folder
	if err := c.ShouldBindJSON(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f.ID = c.Param("id")
	f.UserID = userID
	if err := h.repo.UpdateFolder(c.Request.Context(), &f); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, f)
}

// DELETE /folders/:id
func (h *Handler) DeleteFolder(c *gin.Context) {
	if err := h.repo.DeleteFolder(c.Request.Context(), c.Param("id"), c.GetString("user_id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// POST /folders/:id/meetings
func (h *Handler) AddMeetingToFolder(c *gin.Context) {
	var body struct {
		MeetingID string `json:"meeting_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.repo.AddMeetingToFolder(c.Request.Context(), body.MeetingID, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "added"})
}

// DELETE /folders/:id/meetings/:meetingId
func (h *Handler) RemoveMeetingFromFolder(c *gin.Context) {
	if err := h.repo.RemoveMeetingFromFolder(c.Request.Context(), c.Param("meetingId"), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

// GET /tags
func (h *Handler) ListTags(c *gin.Context) {
	userID := c.GetString("user_id")
	tags, err := h.repo.GetTags(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tags == nil {
		tags = []Tag{}
	}
	c.JSON(http.StatusOK, tags)
}

// POST /tags
func (h *Handler) CreateTag(c *gin.Context) {
	userID := c.GetString("user_id")
	var t Tag
	if err := c.ShouldBindJSON(&t); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t.UserID = userID
	if t.Color == "" {
		t.Color = "#6366f1"
	}
	if err := h.repo.CreateTag(c.Request.Context(), &t); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

// DELETE /tags/:id
func (h *Handler) DeleteTag(c *gin.Context) {
	if err := h.repo.DeleteTag(c.Request.Context(), c.Param("id"), c.GetString("user_id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// POST /meetings/:id/tags
func (h *Handler) AddTagToMeeting(c *gin.Context) {
	var body struct {
		TagID string `json:"tag_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.repo.AddTagToMeeting(c.Request.Context(), c.Param("id"), body.TagID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "tagged"})
}

// DELETE /meetings/:id/tags/:tagId
func (h *Handler) RemoveTagFromMeeting(c *gin.Context) {
	if err := h.repo.RemoveTagFromMeeting(c.Request.Context(), c.Param("id"), c.Param("tagId")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

// ─── Search ───────────────────────────────────────────────────────────────────

// GET /search?q=&provider=&from=&to=&tag=&folder=
func (h *Handler) Search(c *gin.Context) {
	userID := c.GetString("user_id")
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "q parameter required"})
		return
	}

	filters := SearchFilters{
		Provider: c.Query("provider"),
		TagID:    c.Query("tag"),
		FolderID: c.Query("folder"),
		FromDate: c.Query("from"),
		ToDate:   c.Query("to"),
	}

	results, err := h.repo.Search(c.Request.Context(), userID, q, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if results == nil {
		results = []SearchResult{}
	}
	c.JSON(http.StatusOK, SearchResponse{Results: results, Total: len(results), Query: q})
}
