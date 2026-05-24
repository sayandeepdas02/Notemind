// Package notifications provides email delivery via the Resend API.
package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"

	"notemind/internal/ai"
	"notemind/pkg/logger"
)

const resendAPIURL = "https://api.resend.com/emails"

// EmailService sends transactional emails via Resend.
type EmailService struct {
	apiKey  string
	from    string
	baseURL string // frontend URL for CTA links
}

// NewEmailService constructs a service. Returns nil if apiKey is empty.
func NewEmailService(apiKey, from, baseURL string) *EmailService {
	if apiKey == "" {
		return nil
	}
	return &EmailService{apiKey: apiKey, from: from, baseURL: baseURL}
}

// ── Public methods ────────────────────────────────────────────────────────────

// SendMeetingSummary sends the post-meeting summary email.
// Best-effort: logs but never returns fatal errors.
func (s *EmailService) SendMeetingSummary(
	ctx context.Context,
	to, userName, meetingTitle string,
	summary *ai.MeetingSummary,
	meetingID string,
) error {
	if s == nil {
		return nil
	}

	subject := fmt.Sprintf("Your meeting summary: %s", meetingTitle)
	html := s.buildSummaryHTML(userName, meetingTitle, summary, meetingID)

	if err := s.send(ctx, to, subject, html); err != nil {
		logger.L.Error("failed to send meeting summary email",
			zap.String("to", to),
			zap.String("meeting_id", meetingID),
			zap.Error(err),
		)
		return err
	}

	logger.L.Info("meeting summary email sent",
		zap.String("to", to),
		zap.String("meeting_id", meetingID),
	)
	return nil
}

// SendMeetingReminder sends a "starting in 5 minutes" reminder.
// Implemented but not yet wired to a trigger.
func (s *EmailService) SendMeetingReminder(
	ctx context.Context,
	to, userName, meetingTitle string,
	startTime time.Time,
	joinLink string,
) error {
	if s == nil {
		return nil
	}

	subject := fmt.Sprintf("Starting in 5 minutes: %s", meetingTitle)
	html := s.buildReminderHTML(userName, meetingTitle, startTime, joinLink)

	return s.send(ctx, to, subject, html)
}

// ── Email builder — summary ───────────────────────────────────────────────────

func (s *EmailService) buildSummaryHTML(
	userName, meetingTitle string,
	summary *ai.MeetingSummary,
	meetingID string,
) string {
	viewURL := fmt.Sprintf("%s/dashboard/meetings/%s", s.baseURL, meetingID)

	var sb strings.Builder
	sb.WriteString(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f8;margin:0;padding:24px}
.card{background:#fff;border-radius:12px;max-width:600px;margin:0 auto;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.header{background:#6366f1;padding:28px 32px;color:#fff}
.header h1{margin:0;font-size:22px;font-weight:700}
.header p{margin:6px 0 0;font-size:14px;opacity:.85}
.body{padding:28px 32px}
h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6366f1;margin:24px 0 10px}
p{font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px}
ul{padding-left:20px;margin:0 0 8px}
li{font-size:15px;color:#374151;line-height:1.7}
.action{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6}
.action:last-child{border-bottom:0}
.owner{font-size:12px;color:#6b7280;margin-top:2px}
.cta{display:block;background:#6366f1;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:8px;font-weight:700;font-size:15px;margin-top:24px}
.footer{padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6}
</style></head><body><div class="card">`)

	// Header
	fmt.Fprintf(&sb, `<div class="header"><h1>%s</h1><p>Hi %s, here's your meeting summary.</p></div>`,
		escapeHTML(meetingTitle), escapeHTML(userName))

	sb.WriteString(`<div class="body">`)

	// Summary paragraph
	if summary.Summary != "" {
		sb.WriteString(`<h2>Summary</h2>`)
		fmt.Fprintf(&sb, `<p>%s</p>`, escapeHTML(summary.Summary))
	}

	// Key points
	if len(summary.KeyPoints) > 0 {
		sb.WriteString(`<h2>Key Points</h2><ul>`)
		for _, kp := range summary.KeyPoints {
			fmt.Fprintf(&sb, `<li>%s</li>`, escapeHTML(kp))
		}
		sb.WriteString(`</ul>`)
	}

	// Action items
	if len(summary.ActionItems) > 0 {
		fmt.Fprintf(&sb, `<h2>Action Items (%d)</h2>`, len(summary.ActionItems))
		for _, item := range summary.ActionItems {
			fmt.Fprintf(&sb, `<div class="action"><div>
				<p>%s</p>
				<div class="owner">Owner: %s</div>
			</div></div>`, escapeHTML(item.Task), escapeHTML(item.Owner))
		}
	}

	// Decisions
	if len(summary.Decisions) > 0 {
		sb.WriteString(`<h2>Decisions</h2><ul>`)
		for _, d := range summary.Decisions {
			fmt.Fprintf(&sb, `<li>%s</li>`, escapeHTML(d))
		}
		sb.WriteString(`</ul>`)
	}

	// CTA
	fmt.Fprintf(&sb, `<a class="cta" href="%s">View full transcript →</a>`, viewURL)
	sb.WriteString(`</div>`)

	// Footer
	sb.WriteString(`<div class="footer">Sent by Notemind · <a href="` + s.baseURL + `">notemind.ai</a></div>`)
	sb.WriteString(`</div></body></html>`)

	return sb.String()
}

// ── Email builder — reminder ──────────────────────────────────────────────────

func (s *EmailService) buildReminderHTML(userName, meetingTitle string, startTime time.Time, joinLink string) string {
	timeStr := startTime.Format("Monday, January 2 at 3:04 PM")
	var sb strings.Builder
	fmt.Fprintf(&sb, `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body
	style="font-family:sans-serif;background:#f4f4f8;padding:24px">
	<div style="background:#fff;border-radius:12px;max-width:500px;margin:0 auto;padding:32px">
	<h2 style="color:#6366f1;margin-top:0">Starting in 5 minutes</h2>
	<p>Hi %s,</p>
	<p><strong>%s</strong> is starting at %s.</p>
	<p>Notemind will join automatically to take notes.</p>
	<a href="%s" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;
	border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px">Join meeting</a>
	</div></body></html>`,
		escapeHTML(userName), escapeHTML(meetingTitle), timeStr, joinLink)
	return sb.String()
}

// ── HTTP transport ────────────────────────────────────────────────────────────

func (s *EmailService) send(ctx context.Context, to, subject, html string) error {
	payload := map[string]interface{}{
		"from":    s.from,
		"to":      []string{to},
		"subject": subject,
		"html":    html,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to build Resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("Resend request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Resend API error %d: %s", resp.StatusCode, respBody)
	}
	return nil
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	return s
}
