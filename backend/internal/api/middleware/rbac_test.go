package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"notemind/internal/api/middleware"
	"notemind/internal/workspace"
)

// mockRoleGetter implements RoleGetter for tests without hitting a database.
type mockRoleGetter struct {
	role string
	err  error
}

func (m *mockRoleGetter) GetRole(_ context.Context, _, _ string) (string, error) {
	return m.role, m.err
}

func setupRouter(getter middleware.RoleGetter, minRole string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/workspaces/:workspace_id/members",
		func(c *gin.Context) { c.Set("user_id", "user-1") },
		middleware.RequireWorkspaceRole(getter, minRole),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) },
	)
	r.POST("/workspaces/:workspace_id/members",
		func(c *gin.Context) { c.Set("user_id", "user-1") },
		middleware.RequireWorkspaceRole(getter, minRole),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) },
	)
	return r
}

func do(r *gin.Engine, method, path string) int {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(method, path, nil)
	r.ServeHTTP(w, req)
	return w.Code
}

func TestListMembers_NonMember_Returns403(t *testing.T) {
	r := setupRouter(&mockRoleGetter{err: workspace.ErrUserNotInWorkspace}, "member")
	if got := do(r, http.MethodGet, "/workspaces/ws-1/members"); got != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", got)
	}
}

func TestListMembers_Member_Passes(t *testing.T) {
	r := setupRouter(&mockRoleGetter{role: "member"}, "member")
	if got := do(r, http.MethodGet, "/workspaces/ws-1/members"); got != http.StatusOK {
		t.Fatalf("expected 200, got %d", got)
	}
}

func TestAddMember_MemberRole_Returns403(t *testing.T) {
	r := setupRouter(&mockRoleGetter{role: "member"}, "admin")
	if got := do(r, http.MethodPost, "/workspaces/ws-1/members"); got != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", got)
	}
}

func TestAddMember_Admin_Passes(t *testing.T) {
	r := setupRouter(&mockRoleGetter{role: "admin"}, "admin")
	if got := do(r, http.MethodPost, "/workspaces/ws-1/members"); got != http.StatusOK {
		t.Fatalf("expected 200, got %d", got)
	}
}

func TestAddMember_Owner_Passes(t *testing.T) {
	r := setupRouter(&mockRoleGetter{role: "owner"}, "admin")
	if got := do(r, http.MethodPost, "/workspaces/ws-1/members"); got != http.StatusOK {
		t.Fatalf("expected 200, got %d", got)
	}
}

func TestListMembers_NoUserID_Returns401(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Deliberately do NOT set user_id in context
	r.GET("/workspaces/:workspace_id/members",
		middleware.RequireWorkspaceRole(&mockRoleGetter{role: "member"}, "member"),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) },
	)
	if got := do(r, http.MethodGet, "/workspaces/ws-1/members"); got != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", got)
	}
}

func TestListMembers_NoWorkspaceID_Returns400(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/members",
		func(c *gin.Context) { c.Set("user_id", "user-1") },
		middleware.RequireWorkspaceRole(&mockRoleGetter{role: "member"}, "member"),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) },
	)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/members", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
