package worker

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/internal/meeting"
	"notemind/internal/queue"
	"notemind/pkg/logger"
)

// Watchdog monitors live meetings and triggers recovery if bots stall or crash.
type Watchdog struct {
	repo        *meeting.Repository
	queueClient *queue.Client
}

func NewWatchdog(repo *meeting.Repository, queueClient *queue.Client) *Watchdog {
	return &Watchdog{
		repo:        repo,
		queueClient: queueClient,
	}
}

// Start begins the watchdog polling loop.
func (w *Watchdog) Start(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	logger.L.Info("Watchdog started")

	for {
		select {
		case <-ctx.Done():
			logger.L.Info("Watchdog stopped")
			return
		case <-ticker.C:
			w.checkStalledMeetings(ctx)
		}
	}
}

func (w *Watchdog) checkStalledMeetings(ctx context.Context) {
	// Simple distributed lock mechanism via DB (or Redis if preferred)
	// We use Postgres SKIP LOCKED to only grab meetings nobody else is currently checking
	
	// Criteria for stalled meeting:
	// 1. Status is RECORDING
	// 2. last_heartbeat_at is older than 60 seconds OR 
	//    no new transcripts in 3 minutes (inferred by last_heartbeat_at if heartbeat is emitted alongside transcripts or independently)
	
	query := `
		SELECT id, status, meeting_url 
		FROM meetings 
		WHERE status IN ('JOINING', 'WAITING_FOR_ADMISSION', 'ADMITTED', 'RECORDING')
		  AND (last_heartbeat_at < NOW() - INTERVAL '90 seconds' OR last_heartbeat_at IS NULL AND updated_at < NOW() - INTERVAL '3 minutes')
		FOR UPDATE SKIP LOCKED
		LIMIT 10
	`

	rows, err := db.DB.QueryContext(ctx, query)
	if err != nil {
		logger.L.Error("watchdog: failed to query stalled meetings", zap.Error(err))
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, status, meetingURL string
		if err := rows.Scan(&id, &status, &meetingURL); err != nil {
			continue
		}

		logger.L.Warn("watchdog: detected stalled meeting, initiating recovery",
			zap.String("meeting_id", id),
			zap.String("status", status))

		// 1. Transition state to RECONNECTING
		err = meeting.TransitionState(ctx, id, meeting.StateReconnecting, "Watchdog detected timeout")
		if err != nil {
			logger.L.Error("watchdog: state transition failed", zap.String("meeting_id", id), zap.Error(err))
			continue
		}

		// 2. Enqueue bot:join job with exponential backoff / retry context
		// Note: Enqueueing normally will run immediately
		err = w.queueClient.EnqueueBotJoin(id, meetingURL, uuid.New().String()) // using dummy user_id for system task, or we should fetch actual user_id
		if err != nil {
			logger.L.Error("watchdog: failed to enqueue recovery job", zap.String("meeting_id", id), zap.Error(err))
			continue
		}
	}
}
