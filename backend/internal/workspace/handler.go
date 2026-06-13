package workspace

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// GET /workspaces
func (h *Handler) List(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	workspaces, err := h.svc.GetUserWorkspaces(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	if workspaces == nil {
		workspaces = []Workspace{}
	}
	c.JSON(http.StatusOK, workspaces)
}

// POST /workspaces
func (h *Handler) Create(c *gin.Context) {
	userID := c.GetString("user_id")
	
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	w, err := h.svc.CreateWorkspace(c.Request.Context(), userID, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, w)
}

// GET /workspaces/:workspace_id/members
func (h *Handler) ListMembers(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	members, err := h.svc.ListMembers(c.Request.Context(), workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	if members == nil {
		members = []WorkspaceMember{}
	}
	c.JSON(http.StatusOK, members)
}

// POST /workspaces/:workspace_id/members
func (h *Handler) AddMember(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Role   string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Basic role validation could happen here or in service layer
	err := h.svc.AddMember(c.Request.Context(), workspaceID, req.UserID, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "member added"})
}
