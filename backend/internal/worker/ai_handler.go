package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"notemind/internal/ai"
	"notemind/internal/ai/prompts"
	"notemind/internal/meeting"
	"notemind/internal/notifications"
	"notemind/internal/queue"
	"notemind/pkg/logger"
)

// AIHandler runs the multi-stage LLM pipeline on completed meeting transcripts.
// It handles the "ai:summarize" job type.
type AIHandler struct {
	repo        *meeting.Repository
	aiPipeline  *ai.Pipeline
	queueClient *queue.Client
	email       *notifications.EmailService // nil when RESEND_API_KEY is not set
}

// NewAIHandler constructs an AIHandler.
func NewAIHandler(
	repo *meeting.Repository,
	aiPipeline *ai.Pipeline,
	queueClient *queue.Client,
	email *notifications.EmailService,
) *AIHandler {
	return &AIHandler{
		repo:        repo,
		aiPipeline:  aiPipeline,
		queueClient: queueClient,
		email:       email,
	}
}

// Handle is the Asynq task handler for TypeAISummaryJob.
// It is idempotent: if intelligence already exists for the meeting it exits early.
func (h *AIHandler) Handle(ctx context.Context, t *asynq.Task) error {
	var payload queue.AISummaryPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("invalid payload for AI summary job: %v: %w", err, asynq.SkipRetry)
	}

	log := logger.With(
		zap.String("job_type", queue.TypeAISummaryJob),
		zap.String("meeting_id", payload.MeetingID),
	)

	log.Info("AI summary job started")

	// ── Guard: idempotency — skip if summary already exists ──────────────────
	existing, err := h.repo.GetMeetingIntelligence(payload.MeetingID)
	if err != nil {
		log.Error("failed to check existing intelligence", zap.Error(err))
		return err
	}
	if existing != nil && existing.Summary != "" {
		log.Info("AI summary already exists, skipping")
		return nil
	}

	// ── Fetch transcript segments ─────────────────────────────────────────────
	segs, err := h.repo.GetSegments(payload.MeetingID)
	if err != nil {
		log.Error("failed to fetch transcript segments", zap.Error(err))
		return fmt.Errorf("fetch segments failed: %w", err)
	}

	if len(segs) == 0 {
		// Also check the legacy single-blob transcript table
		transcript, tErr := h.repo.GetTranscript(payload.MeetingID)
		if tErr != nil || transcript == nil {
			log.Warn("no transcript found for meeting, skipping AI summary",
				zap.String("meeting_id", payload.MeetingID),
			)
			return fmt.Errorf("no transcript data available: %w", asynq.SkipRetry)
		}

		segs = []meeting.TranscriptSegment{
			{MeetingID: payload.MeetingID, Speaker: "Unknown", Text: transcript.Content},
		}
	}

	// ── Resolve meeting type for prompt selection ─────────────────────────────
	meetingType := prompts.TypeGeneral
	if m, err := h.repo.GetMeetingByID(payload.MeetingID); err == nil && m != nil {
		if mt := prompts.MeetingType(m.MeetingType); mt != "" {
			meetingType = mt
		}
	}

	// ── Convert to AI module format ───────────────────────────────────────────
	rawSegs := make([]ai.RawSegment, 0, len(segs))
	for _, seg := range segs {
		rawSegs = append(rawSegs, ai.RawSegment{
			Speaker:           seg.Speaker,
			Text:              seg.Text,
			AbsoluteStartTime: seg.AbsoluteStartTime,
		})
	}

	// ── Run the LLM pipeline ──────────────────────────────────────────────────
	summary, err := h.aiPipeline.Run(ctx, rawSegs, meetingType)
	if err != nil {
		log.Error("LLM pipeline failed", zap.Error(err))
		return fmt.Errorf("AI pipeline failed: %w", err)
	}

	// ── Persist structured results ────────────────────────────────────────────
	if err := h.repo.SaveMeetingIntelligence(payload.MeetingID, summary); err != nil {
		log.Error("failed to save meeting intelligence", zap.Error(err))
		return fmt.Errorf("save intelligence failed: %w", err)
	}

	// ── Mark meeting completed ────────────────────────────────────────────────
	if err := h.repo.UpdateMeetingStatus(payload.MeetingID, string(meeting.StateEnded)); err != nil {
		log.Error("failed to mark meeting ended", zap.Error(err))
	}

	log.Info("AI summary job completed successfully",
		zap.Int("action_items", len(summary.ActionItems)),
		zap.Int("decisions", len(summary.Decisions)),
		zap.Int("key_points", len(summary.KeyPoints)),
	)

	// ── Enqueue the memory embedding job ──────────────────────────────────────
	if err := h.queueClient.EnqueueEmbed(payload.MeetingID); err != nil {
		log.Error("failed to enqueue memory embed job", zap.Error(err))
	}

	// ── Send summary email (best-effort — never fails the task) ──────────────
	if h.email != nil {
		go h.sendSummaryEmail(payload.MeetingID, summary)
	}

	return nil
}

// sendSummaryEmail fetches the meeting owner's email and sends a summary.
// Runs in a separate goroutine so it never blocks or fails the task.
func (h *AIHandler) sendSummaryEmail(meetingID string, summary *ai.MeetingSummary) {
	log := logger.With(zap.String("meeting_id", meetingID))

	type ownerRow struct {
		email   string
		name    string
		title   string
		enabled bool
	}

	var row ownerRow
	err := h.repo.DB().QueryRow(`
		SELECT u.email, u.name, COALESCE(m.title, m.meeting_url, 'Meeting'),
		       COALESCE(u.email_notifications_enabled, true)
		FROM meetings m
		JOIN users u ON u.id = m.user_id
		WHERE m.id = $1
	`, meetingID).Scan(&row.email, &row.name, &row.title, &row.enabled)
	if err != nil {
		log.Error("failed to fetch meeting owner for email", zap.Error(err))
		return
	}

	if !row.enabled {
		log.Info("email notifications disabled for user, skipping")
		return
	}

	if err := h.email.SendMeetingSummary(
		context.Background(),
		row.email, row.name, row.title,
		summary, meetingID,
	); err != nil {
		log.Error("failed to send summary email (best-effort)", zap.Error(err))
	}
}
