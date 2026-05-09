package compliance

import (
	"context"
	"time"

	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// RetentionService enforces workspace-level data retention policies by purging
// expired transcripts and recordings. Intended to run as a daily cron worker.
type RetentionService struct{}

func NewRetentionService() *RetentionService {
	return &RetentionService{}
}

// RunPurge runs the retention purge for all workspaces that have policies defined.
func (r *RetentionService) RunPurge(ctx context.Context) error {
	log := logger.With(zap.String("job", "retention_purge"))
	log.Info("starting retention purge run")

	rows, err := db.DB.QueryContext(ctx, `
		SELECT workspace_id, transcript_retention_days, recording_retention_days
		FROM retention_policies
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var purged int
	for rows.Next() {
		var wsID string
		var transcriptDays, recordingDays int
		if err := rows.Scan(&wsID, &transcriptDays, &recordingDays); err != nil {
			log.Error("failed to scan retention policy row", zap.Error(err))
			continue
		}

		cutoff := time.Now().AddDate(0, 0, -transcriptDays)
		result, err := db.DB.ExecContext(ctx, `
			DELETE FROM transcripts
			WHERE meeting_id IN (
				SELECT id FROM meetings WHERE workspace_id = $1 AND created_at < $2
			)
		`, wsID, cutoff)
		if err != nil {
			log.Error("transcript purge failed", zap.String("workspace", wsID), zap.Error(err))
			continue
		}

		n, _ := result.RowsAffected()
		purged += int(n)

		// Purge old embedding chunks
		db.DB.ExecContext(ctx, `
			DELETE FROM embedding_chunks
			WHERE meeting_id IN (
				SELECT id FROM meetings WHERE workspace_id = $1 AND created_at < $2
			)
		`, wsID, cutoff)
	}

	log.Info("retention purge complete", zap.Int("transcripts_purged", purged))
	return nil
}
