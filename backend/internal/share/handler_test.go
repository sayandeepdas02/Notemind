package share_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"notemind/internal/ai"
	"notemind/internal/share"
)

func init() { gin.SetMode(gin.TestMode) }

// mockStore is a controllable in-memory implementation of share.Store.
type mockStore struct {
	canWrite    bool
	canWriteErr error

	insertToken string
	insertErr   error

	revokeFound bool
	revokeErr   error

	lookupID  string
	lookupErr error

	intel    *ai.MeetingSummary
	intelErr error
}

func (m *mockStore) CanWriteShare(_ context.Context, _, _ string) (bool, error) {
	return m.canWrite, m.canWriteErr
}
func (m *mockStore) InsertShare(_ context.Context, _, _ string, _ bool, _ *time.Time) (string, error) {
	return m.insertToken, m.insertErr
}
func (m *mockStore) RevokeShare(_ context.Context, _, _ string) (bool, error) {
	return m.revokeFound, m.revokeErr
}
func (m *mockStore) LookupShare(_ context.Context, _ string) (string, error) {
	return m.lookupID, m.lookupErr
}
func (m *mockStore) GetIntelligence(_ context.Context, _ string) (*ai.MeetingSummary, error) {
	return m.intel, m.intelErr
}

// router wires up a Handler with the given mock store.
func router(s *mockStore) *gin.Engine {
	h := share.NewHandlerWithStore(s)
	r := gin.New()
	setUser := func(c *gin.Context) { c.Set("user_id", "user-1"); c.Next() }

	r.POST("/meetings/:id/share", setUser, h.CreateShare)
	r.DELETE("/meetings/:id/share/:token", setUser, h.RevokeShare)
	r.GET("/share/:token", h.GetSharedIntelligence)
	return r
}

func do(r *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	var b bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&b).Encode(body)
	}
	req, _ := http.NewRequest(method, path, &b)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ─── CreateShare ─────────────────────────────────────────────────────────────

func TestCreateShare_NotMember_Returns404(t *testing.T) {
	r := router(&mockStore{canWrite: false})
	w := do(r, http.MethodPost, "/meetings/mtg-1/share", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestCreateShare_ViewerRole_Returns404(t *testing.T) {
	// CanWriteShare returns false for viewers — same as non-member from the handler's perspective.
	r := router(&mockStore{canWrite: false})
	w := do(r, http.MethodPost, "/meetings/mtg-1/share", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestCreateShare_Member_Returns200WithToken(t *testing.T) {
	r := router(&mockStore{canWrite: true, insertToken: "tok-abc"})
	w := do(r, http.MethodPost, "/meetings/mtg-1/share", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]interface{}
	_ = json.NewDecoder(w.Body).Decode(&resp)
	if resp["share_token"] != "tok-abc" {
		t.Fatalf("unexpected token: %v", resp["share_token"])
	}
}

func TestCreateShare_WithExpiry_ResponseContainsExpiresAt(t *testing.T) {
	r := router(&mockStore{canWrite: true, insertToken: "tok-exp"})
	w := do(r, http.MethodPost, "/meetings/mtg-1/share", map[string]int{"expires_in_hours": 24})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]interface{}
	_ = json.NewDecoder(w.Body).Decode(&resp)
	if resp["expires_at"] == nil {
		t.Fatal("expected expires_at in response")
	}
}

func TestCreateShare_StoreError_Returns500(t *testing.T) {
	r := router(&mockStore{canWrite: true, insertErr: sql.ErrConnDone})
	w := do(r, http.MethodPost, "/meetings/mtg-1/share", nil)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// ─── RevokeShare ─────────────────────────────────────────────────────────────

func TestRevokeShare_NotMember_Returns404(t *testing.T) {
	r := router(&mockStore{canWrite: false})
	w := do(r, http.MethodDelete, "/meetings/mtg-1/share/tok-abc", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestRevokeShare_Member_ActiveToken_Returns204(t *testing.T) {
	r := router(&mockStore{canWrite: true, revokeFound: true})
	w := do(r, http.MethodDelete, "/meetings/mtg-1/share/tok-abc", nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
}

func TestRevokeShare_AlreadyRevoked_Returns404(t *testing.T) {
	r := router(&mockStore{canWrite: true, revokeFound: false})
	w := do(r, http.MethodDelete, "/meetings/mtg-1/share/tok-abc", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

// ─── GetSharedIntelligence ───────────────────────────────────────────────────

func TestGetSharedIntelligence_ValidToken_Returns200(t *testing.T) {
	ms := &mockStore{
		lookupID: "mtg-1",
		intel:    &ai.MeetingSummary{Summary: "great meeting"},
	}
	r := router(ms)
	w := do(r, http.MethodGet, "/share/tok-valid", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp ai.MeetingSummary
	_ = json.NewDecoder(w.Body).Decode(&resp)
	if resp.Summary != "great meeting" {
		t.Fatalf("unexpected summary: %q", resp.Summary)
	}
}

func TestGetSharedIntelligence_RevokedToken_Returns404(t *testing.T) {
	// LookupShare returns ErrNoRows for revoked/expired/invalid tokens.
	r := router(&mockStore{lookupErr: sql.ErrNoRows})
	w := do(r, http.MethodGet, "/share/tok-revoked", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestGetSharedIntelligence_ExpiredToken_Returns404(t *testing.T) {
	// Same code path as revoked — LookupShare filters out expired rows.
	r := router(&mockStore{lookupErr: sql.ErrNoRows})
	w := do(r, http.MethodGet, "/share/tok-expired", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestGetSharedIntelligence_UnknownToken_Returns404(t *testing.T) {
	r := router(&mockStore{lookupErr: sql.ErrNoRows})
	w := do(r, http.MethodGet, "/share/tok-unknown", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}
