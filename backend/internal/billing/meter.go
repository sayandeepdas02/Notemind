package billing

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Meter struct {
	redis *redis.Client
}

func NewMeter(r *redis.Client) *Meter {
	return &Meter{redis: r}
}

// TrackAICredits increments the AI token usage for the given workspace.
// This is typically called asynchronously from the AI pipeline.
func (m *Meter) TrackAICredits(ctx context.Context, workspaceID string, tokens int) error {
	// Abstracting tokens to "credits" (e.g., 1000 tokens = 1 credit)
	credits := tokens / 1000
	if credits <= 0 {
		credits = 1 // Minimum 1 credit per operation
	}

	monthKey := fmt.Sprintf("meter:%s:%s:ai_credits", workspaceID, time.Now().Format("2006-01"))
	
	// Increment usage in Redis
	_, err := m.redis.IncrBy(ctx, monthKey, int64(credits)).Result()
	if err != nil {
		return fmt.Errorf("failed to meter ai usage: %w", err)
	}

	// Set expiry if new key (2 months is safe)
	m.redis.Expire(ctx, monthKey, 60*24*time.Hour)

	return nil
}

// CheckAICreditLimit ensures a workspace hasn't exceeded its plan limit.
func (m *Meter) CheckAICreditLimit(ctx context.Context, workspaceID string) (bool, error) {
	// In a real implementation, you'd fetch the workspace plan limits from `workspace_billing`.
	// For this demo, let's assume a hardcoded limit of 10,000 credits for free tier.
	
	monthKey := fmt.Sprintf("meter:%s:%s:ai_credits", workspaceID, time.Now().Format("2006-01"))
	val, err := m.redis.Get(ctx, monthKey).Int()
	if err == redis.Nil {
		return true, nil // No usage yet
	} else if err != nil {
		return false, err
	}

	if val > 10000 {
		return false, nil // Limit exceeded
	}
	return true, nil
}
