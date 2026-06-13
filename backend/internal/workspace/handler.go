package workspace

import (
	"errors"
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

// PUT /workspaces/:workspace_id
func (h *Handler) Update(c *gin.Context) {
	userID := c.GetString("user_id")
	workspaceID := c.Param("workspace_id")

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	w, err := h.svc.UpdateWorkspace(c.Request.Context(), workspaceID, userID, req.Name)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		if errors.Is(err, ErrWorkspaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "workspace not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

// memberView is the API response shape for a workspace member.
// It flattens the user fields so clients receive { id, name, email, role }.
type memberView struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// GET /workspaces/:workspace_id/members
func (h *Handler) ListMembers(c *gin.Context) {
	workspaceID := c.Param("workspace_id")
	members, err := h.svc.ListMembers(c.Request.Context(), workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	views := make([]memberView, 0, len(members))
	for _, m := range members {
		v := memberView{ID: m.UserID, Role: m.Role}
		if m.UserName != nil {
			v.Name = *m.UserName
		}
		if m.UserEmail != nil {
			v.Email = *m.UserEmail
		}
		views = append(views, v)
	}
	c.JSON(http.StatusOK, views)
}

// POST /workspaces/:workspace_id/members
// Accepts { email, role } and resolves the user by email before inserting.
func (h *Handler) AddMember(c *gin.Context) {
	workspaceID := c.Param("workspace_id")

	var req struct {
		Email string `json:"email" binding:"required"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.svc.InviteMemberByEmail(c.Request.Context(), workspaceID, req.Email, req.Role)
	if err == ErrUserNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "no Notemind account found for " + req.Email})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "member added"})
}
