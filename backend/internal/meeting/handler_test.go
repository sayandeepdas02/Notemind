package meeting

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"notemind/internal/ai"
)

// mockMeetingService implements meetingService for tests.
type mockMeetingService struct {
	meeting  *Meeting
	meetErr  error
	segs     []TranscriptSegment
	segsErr  error
	intel    *ai.MeetingSummary
	intelErr error
}

func (m *mockMeetingService) UploadMeeting(filePath, userID string) (string, error) { return "", nil }
func (m *mockMeetingService) JoinMeeting(url, userID, meetingType string) (*Meeting, error) {
	return nil, nil
}
func (m *mockMeetingService) StopMeeting(meetingID, userID string) error { return nil }
func (m *mockMeetingService) GetMeetings(userID string) ([]Meeting, error) {
	return nil, nil
}
func (m *mockMeetingService) GetMeeting(id, userID string) (*Meeting, error) {
	return m.meeting, m.meetErr
}
func (m *mockMeetingService) GetSegments(meetingID string) ([]TranscriptSegment, error) {
	return m.segs, m.segsErr
}
func (m *mockMeetingService) GetSegmentsAfter(meetingID string, lastSeq int) ([]TranscriptSegment, error) {
	return m.segs, m.segsErr
}
func (m *mockMeetingService) GetMeetingIntelligence(meetingID string) (*ai.MeetingSummary, error) {
	return m.intel, m.intelErr
}

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestRouter(userID string, svc meetingService, endpoint string, handlerFn gin.HandlerFunc) *gin.Engine {
	r := gin.New()
	r.GET(endpoint, func(c *gin.Context) {
		c.Set("user_id", userID)
		handlerFn(c)
	})
	return r
}

// ─── GetTranscripts ───────────────────────────────────────────────────────────

func TestGetTranscripts_UnauthorizedReturns404(t *testing.T) {
	svc := &mockMeetingService{meeting: nil} // GetMeeting returns nil → caller doesn't own it
	h := NewHandler(svc, NewHub())

	r := newTestRouter("attacker", svc, "/meetings/:id/transcripts", h.GetTranscripts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/meetings/victim-meeting-id/transcripts", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unauthorized caller, got %d", w.Code)
	}
}

func TestGetTranscripts_AuthorizedReturns200(t *testing.T) {
	svc := &mockMeetingService{
		meeting: &Meeting{ID: "m1", Status: "completed"},
		segs:    []TranscriptSegment{{ID: "s1", Speaker: "Alice", Text: "hello"}},
	}
	h := NewHandler(svc, NewHub())

	r := newTestRouter("owner", svc, "/meetings/:id/transcripts", h.GetTranscripts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/meetings/m1/transcripts", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for authorized caller, got %d", w.Code)
	}
}

// ─── GetSummary ───────────────────────────────────────────────────────────────

func TestGetSummary_UnauthorizedReturns404(t *testing.T) {
	svc := &mockMeetingService{meeting: nil}
	h := NewHandler(svc, NewHub())

	r := newTestRouter("attacker", svc, "/meetings/:id/summary", h.GetSummary)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/meetings/victim-meeting-id/summary", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unauthorized caller, got %d", w.Code)
	}
}

func TestGetSummary_AuthorizedReturns200(t *testing.T) {
	svc := &mockMeetingService{
		meeting: &Meeting{ID: "m1", Status: "completed"},
		intel:   &ai.MeetingSummary{Summary: "Great meeting"},
	}
	h := NewHandler(svc, NewHub())

	r := newTestRouter("owner", svc, "/meetings/:id/summary", h.GetSummary)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/meetings/m1/summary", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for authorized caller, got %d", w.Code)
	}
}

// ─── StreamTranscripts ────────────────────────────────────────────────────────

func TestStreamTranscripts_UnauthorizedReturns404(t *testing.T) {
	svc := &mockMeetingService{meeting: nil}
	h := NewHandler(svc, NewHub())

	r := newTestRouter("attacker", svc, "/meetings/:id/stream", h.StreamTranscripts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/meetings/victim-meeting-id/stream", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unauthorized SSE caller, got %d", w.Code)
	}
}
