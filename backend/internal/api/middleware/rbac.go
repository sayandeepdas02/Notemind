package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"notemind/internal/workspace"
)

// RoleGetter is the subset of workspace.Service the RBAC middleware needs.
type RoleGetter interface {
	GetRole(ctx context.Context, workspaceID, userID string) (string, error)
}

// WorkspaceRole defines RBAC levels
var roleHierarchy = map[string]int{
	"viewer":  1,
	"member":  2,
	"manager": 3,
	"admin":   4,
	"owner":   5,
}

// RequireWorkspaceRole is a Gin middleware that extracts a workspace_id from the URL params or headers,
// verifies the user belongs to the workspace, and checks if they meet the minimum required role.
func RequireWorkspaceRole(workspaceSvc RoleGetter, minRequiredRole string) gin.HandlerFunc {
	minLevel, exists := roleHierarchy[minRequiredRole]
	if !exists {
		panic("invalid minRequiredRole passed to middleware: " + minRequiredRole)
	}

	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		// Look for workspace_id in URL params (e.g. /workspaces/:workspace_id/...)
		workspaceID := c.Param("workspace_id")
		if workspaceID == "" {
			// Fallback to header if not in URL route
			workspaceID = c.GetHeader("X-Workspace-ID")
		}

		if workspaceID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "missing workspace_id in path or header"})
			return
		}

		userRole, err := workspaceSvc.GetRole(c.Request.Context(), workspaceID, userID)
		if err != nil {
			if err == workspace.ErrUserNotInWorkspace {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden: not a member of this workspace"})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to verify workspace role"})
			return
		}

		userLevel, exists := roleHierarchy[userRole]
		if !exists || userLevel < minLevel {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient workspace permissions"})
			return
		}

		// Store workspace context for downstream handlers
		c.Set("workspace_id", workspaceID)
		c.Set("workspace_role", userRole)
		c.Next()
	}
}
