package billing

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"notemind/internal/db"
)

// planCreditLimits maps plan_id → monthly AI credit cap. -1 means unlimited.
var planCreditLimits = map[string]int{
	"free":       10_000,
	"pro":        100_000,
	"enterprise": -1,
}

type Meter struct {
	redis *redis.Client
}

func NewMeter(r *redis.Client) *Meter {
	return &Meter{redis: r}
}

// TrackAICredits increments the AI token usage for the given workspace.
// This is typically called asynchronously from the AI pipeline.
func (m *Meter) TrackAICredits(ctx context.Context, workspaceID string, tokens int) error {
	credits := tokens / 1000
	if credits <= 0 {
		credits = 1
	}

	monthKey := fmt.Sprintf("meter:%s:%s:ai_credits", workspaceID, time.Now().Format("2006-01"))

	_, err := m.redis.IncrBy(ctx, monthKey, int64(credits)).Result()
	if err != nil {
		return fmt.Errorf("failed to meter ai usage: %w", err)
	}

	m.redis.Expire(ctx, monthKey, 60*24*time.Hour)
	return nil
}

// CheckAICreditLimit returns true if the workspace is within its plan's monthly AI credit limit.
// The limit is determined by the workspace's persisted plan_id in workspace_billing.
func (m *Meter) CheckAICreditLimit(ctx context.Context, workspaceID string) (bool, error) {
	var planID string
	err := db.DB.QueryRowContext(ctx, `
		SELECT COALESCE(plan_id, 'free') FROM workspace_billing WHERE workspace_id = $1
	`, workspaceID).Scan(&planID)
	if err == sql.ErrNoRows {
		planID = "free"
	} else if err != nil {
		return false, fmt.Errorf("lookup plan for workspace: %w", err)
	}

	limit, ok := planCreditLimits[planID]
	if !ok {
		limit = planCreditLimits["free"]
	}
	if limit < 0 {
		return true, nil // unlimited plan
	}

	monthKey := fmt.Sprintf("meter:%s:%s:ai_credits", workspaceID, time.Now().Format("2006-01"))
	val, err := m.redis.Get(ctx, monthKey).Int()
	if err == redis.Nil {
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("read credit usage: %w", err)
	}

	return val <= limit, nil
}
