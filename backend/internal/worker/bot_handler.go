package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"notemind/internal/meeting"
	"notemind/internal/queue"
	"notemind/internal/vexa"
	"notemind/pkg/logger"
)

// BotHandler dispatches Vexa bots to join live meetings.
// It handles the "bot:join" job type.
//
// NOTE: In the current architecture the bot is dispatched synchronously from
// the API handler (meeting.Service.JoinMeeting). This handler is registered
// for the "bot:join" queue so that future flows can optionally defer bot
// dispatch (e.g. for rate-limiting) without changing the API contract.
type BotHandler struct {
	repo       *meeting.Repository
	vexaClient *vexa.Client
	hub        *meeting.Hub
}

// NewBotHandler constructs a BotHandler.
func NewBotHandler(repo *meeting.Repository, vexaClient *vexa.Client, hub *meeting.Hub) *BotHandler {
	return &BotHandler{
		repo:       repo,
		vexaClient: vexaClient,
		hub:        hub,
	}
}

// Handle is the Asynq task handler for TypeBotJoinJob.
// It is idempotent: if a native_meeting_id is already set, the bot was already dispatched.
func (h *BotHandler) Handle(ctx context.Context, t *asynq.Task) error {
	var payload queue.BotJoinPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("invalid payload for bot join job: %v: %w", err, asynq.SkipRetry)
	}

	log := logger.With(
		zap.String("job_type", queue.TypeBotJoinJob),
		zap.String("meeting_id", payload.MeetingID),
		zap.String("meeting_url", payload.MeetingURL),
	)

	log.Info("bot join job started")

	// ── Guard: idempotency — skip if bot already dispatched ──────────────────
	m, err := h.repo.GetMeeting(payload.MeetingID, payload.UserID)
	if err != nil {
		log.Error("failed to fetch meeting for bot join", zap.Error(err))
		return err // transient
	}
	if m == nil {
		log.Error("meeting not found", zap.String("meeting_id", payload.MeetingID))
		return fmt.Errorf("meeting %s not found: %w", payload.MeetingID, asynq.SkipRetry)
	}
	if m.NativeMeetingID != "" {
		log.Info("bot already dispatched for meeting, skipping")
		return nil
	}

	// ── Dispatch bot via Vexa ─────────────────────────────────────────────────
	nativeID, err := h.vexaClient.StartBot(payload.MeetingURL)
	if err != nil {
		log.Error("Vexa StartBot failed", zap.Error(err))
		if markErr := h.repo.UpdateMeetingStatus(payload.MeetingID, string(meeting.StateFailed)); markErr != nil {
			log.Error("additionally failed to mark meeting as failed", zap.Error(markErr))
		}
		h.hub.PublishStatus(payload.MeetingID, string(meeting.StateFailed))
		return fmt.Errorf("vexa start bot failed: %w", err)
	}

	// ── Persist native ID and status ──────────────────────────────────────────
	if err := h.repo.UpdateMeetingNativeID(payload.MeetingID, nativeID); err != nil {
		log.Error("failed to store native_meeting_id", zap.Error(err))
		// Non-fatal: bot is running, just persistence failed. Will retry.
		return fmt.Errorf("store native_meeting_id failed: %w", err)
	}

	if err := h.repo.UpdateMeetingStatus(payload.MeetingID, string(meeting.StateRecording)); err != nil {
		log.Error("failed to update meeting status to RECORDING", zap.Error(err))
	}

	h.hub.PublishStatus(payload.MeetingID, string(meeting.StateRecording))
	log.Info("bot join job completed", zap.String("native_meeting_id", nativeID))
	return nil
}
