// Package worker contains the Asynq task handler implementations for the Notemind worker service.
// Each handler is stateless, idempotent, and responsible for exactly one job type.
package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"notemind/internal/ai"
	"notemind/internal/meeting"
	"notemind/internal/queue"
	"notemind/pkg/logger"

	"github.com/google/uuid"
)

// TranscriptionHandler processes audio files into transcripts and enqueues AI summarisation.
// It handles the "transcription:process" job type.
type TranscriptionHandler struct {
	repo        *meeting.Repository
	transcriber *ai.Transcriber
	queueClient *queue.Client
}

// NewTranscriptionHandler constructs a TranscriptionHandler.
func NewTranscriptionHandler(repo *meeting.Repository, transcriber *ai.Transcriber, queueClient *queue.Client) *TranscriptionHandler {
	return &TranscriptionHandler{
		repo:        repo,
		transcriber: transcriber,
		queueClient: queueClient,
	}
}

// Handle is the Asynq task handler for TypeTranscriptionJob.
// It is idempotent: if the meeting already has a transcript it skips re-transcription.
func (h *TranscriptionHandler) Handle(ctx context.Context, t *asynq.Task) error {
	var payload queue.TranscriptionPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		// Bad payload — never retry, send straight to dead-letter archive.
		return fmt.Errorf("invalid payload for transcription job: %v: %w", err, asynq.SkipRetry)
	}

	log := logger.With(
		zap.String("job_type", queue.TypeTranscriptionJob),
		zap.String("meeting_id", payload.MeetingID),
		zap.String("file_path", payload.FilePath),
	)

	log.Info("transcription job started")

	// ── Guard: skip if already transcribed (idempotency) ─────────────────────
	existing, err := h.repo.GetTranscript(payload.MeetingID)
	if err != nil {
		log.Error("failed to check existing transcript", zap.Error(err))
		return err // transient — Asynq will retry
	}
	if existing != nil {
		log.Info("transcript already exists, skipping re-transcription")
		return nil
	}

	// ── Mark meeting as processing ────────────────────────────────────────────
	if err := h.repo.UpdateMeetingStatus(payload.MeetingID, "processing"); err != nil {
		log.Error("failed to update meeting status to processing", zap.Error(err))
		return err // transient
	}

	// ── Transcribe audio file ──────────────────────────────────────────────────
	transcriptText, err := h.transcriber.TranscribeAudio(ctx, payload.FilePath)
	if err != nil {
		log.Error("audio transcription failed", zap.Error(err))
		if markErr := h.repo.UpdateMeetingStatus(payload.MeetingID, "failed"); markErr != nil {
			log.Error("additionally failed to mark meeting as failed", zap.Error(markErr))
		}
		// OpenAI errors are typically transient; allow retry.
		return fmt.Errorf("transcription failed: %w", err)
	}

	// ── Persist transcript ────────────────────────────────────────────────────
	transcript := &meeting.Transcript{
		ID:        uuid.New().String(),
		MeetingID: payload.MeetingID,
		Content:   transcriptText,
	}
	if err := h.repo.CreateTranscript(transcript); err != nil {
		log.Error("failed to save transcript", zap.Error(err))
		if markErr := h.repo.UpdateMeetingStatus(payload.MeetingID, "failed"); markErr != nil {
			log.Error("additionally failed to mark meeting as failed", zap.Error(markErr))
		}
		return fmt.Errorf("save transcript failed: %w", err)
	}

	// ── Enqueue AI summarisation as a separate job ────────────────────────────
	if err := h.queueClient.EnqueueAISummary(payload.MeetingID); err != nil {
		// Log the failure but don't fail the transcription job itself.
		// The meeting is already transcribed; a retry of this job would re-transcribe needlessly.
		log.Error("failed to enqueue AI summary job (transcript saved, summary will be missing)", zap.Error(err))
	}

	log.Info("transcription job completed successfully")
	return nil
}

// ── Sentinel errors for caller use ────────────────────────────────────────────

// ErrInvalidPayload signals that a job payload is malformed and should not be retried.
var ErrInvalidPayload = errors.New("invalid job payload")
