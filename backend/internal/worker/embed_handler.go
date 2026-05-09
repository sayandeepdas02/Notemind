package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"notemind/internal/meeting"
	"notemind/internal/memory"
	"notemind/internal/queue"
	"notemind/pkg/logger"
)

// HandleEmbedJob processes vector embedding jobs for meetings.
func HandleEmbedJob(pipeline *memory.Pipeline, meetingRepo *meeting.Repository) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload queue.AISummaryPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("failed to parse embed payload: %v: %w", err, asynq.SkipRetry)
		}

		meetingID := payload.MeetingID
		log := logger.With(zap.String("meeting_id", meetingID), zap.String("job", "memory:embed"))
		log.Info("processing memory embed job")

		if err := pipeline.EmbedMeeting(ctx, meetingID, meetingRepo); err != nil {
			log.Error("memory embed pipeline failed", zap.Error(err))
			return err
		}

		log.Info("successfully processed memory embed job")
		return nil
	}
}
