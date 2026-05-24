package keys

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes REST endpoints for managing user API keys.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api-keys
func (h *Handler) ListKeys(c *gin.Context) {
	userID := c.GetString("user_id")
	keys, err := h.svc.ListUserKeys(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, keys)
}

type createKeyRequest struct {
	Name   string   `json:"name" binding:"required"`
	Scopes []string `json:"scopes"`
}

// POST /api-keys
// Returns the full raw key ONCE in the response — it is never stored plaintext.
func (h *Handler) CreateKey(c *gin.Context) {
	var req createKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	rawKey, key, err := h.svc.GenerateUserKey(c.Request.Context(), userID, req.Name, req.Scopes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"key":        rawKey,
		"id":         key.ID,
		"name":       key.Name,
		"key_prefix": key.KeyPrefix,
		"scopes":     key.Scopes,
		"created_at": key.CreatedAt,
	})
}

type updateKeyRequest struct {
	Name string `json:"name" binding:"required"`
}

// PUT /api-keys/:id
func (h *Handler) UpdateKey(c *gin.Context) {
	var req updateKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	keyID := c.Param("id")
	if err := h.svc.UpdateKeyName(c.Request.Context(), keyID, userID, req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// DELETE /api-keys/:id
func (h *Handler) RevokeKey(c *gin.Context) {
	userID := c.GetString("user_id")
	keyID := c.Param("id")
	if err := h.svc.RevokeKey(c.Request.Context(), keyID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "revoked"})
}
