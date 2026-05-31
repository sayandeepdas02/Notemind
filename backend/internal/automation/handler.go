package automation

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler provides REST endpoints for managing automation rules.
type Handler struct {
	engine *Engine
	repo   *Repository
}

func NewHandler(engine *Engine, repo *Repository) *Handler {
	return &Handler{engine: engine, repo: repo}
}

// GET /automation/rules
func (h *Handler) ListRules(c *gin.Context) {
	userID := c.GetString("user_id")
	rules, err := h.repo.ListRules(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if rules == nil {
		rules = []Rule{}
	}
	c.JSON(http.StatusOK, rules)
}

// POST /automation/rules
func (h *Handler) CreateRule(c *gin.Context) {
	userID := c.GetString("user_id")
	var rule Rule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rule.UserID = userID
	if !rule.Enabled && rule.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and trigger are required"})
		return
	}
	if err := h.repo.CreateRule(c.Request.Context(), &rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rule)
}

// PUT /automation/rules/:id
func (h *Handler) UpdateRule(c *gin.Context) {
	userID := c.GetString("user_id")
	ruleID := c.Param("id")

	var rule Rule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rule.ID = ruleID
	rule.UserID = userID

	if err := h.repo.UpdateRule(c.Request.Context(), &rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rule)
}

// DELETE /automation/rules/:id
func (h *Handler) DeleteRule(c *gin.Context) {
	userID := c.GetString("user_id")
	ruleID := c.Param("id")

	if err := h.repo.DeleteRule(c.Request.Context(), ruleID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
