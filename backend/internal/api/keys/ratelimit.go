package keys

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"notemind/pkg/logger"
)

// RateLimiter uses Redis to implement a sliding window rate limit.
type RateLimiter struct {
	redis  *redis.Client
	limit  int64
	window time.Duration
}

func NewRateLimiter(r *redis.Client, limit int64, window time.Duration) *RateLimiter {
	return &RateLimiter{
		redis:  r,
		limit:  limit,
		window: window,
	}
}

// Middleware returns a Gin middleware that enforces the rate limit.
// It assumes the workspace_id has already been set in the context by the auth middleware.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		workspaceID := c.GetString("workspace_id")
		if workspaceID == "" {
			// If no workspace_id is set (e.g. public endpoint or bad auth), fallback to IP
			workspaceID = c.ClientIP()
		}

		key := fmt.Sprintf("ratelimit:%s", workspaceID)
		now := time.Now().UnixNano()
		windowStart := now - rl.window.Nanoseconds()

		ctx := c.Request.Context()

		// Redis Pipeline: ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE
		pipe := rl.redis.TxPipeline()
		
		// Remove hits older than the window
		pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", windowStart))
		
		// Add current hit
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
		
		// Count hits in window
		countCmd := pipe.ZCard(ctx, key)
		
		// Set expiry on the set to clean up inactive keys
		pipe.Expire(ctx, key, rl.window)

		_, err := pipe.Exec(ctx)
		if err != nil {
			logger.L.Error("redis pipeline failed during rate limiting", zap.Error(err))
			// Fail open if Redis is down
			c.Next()
			return
		}

		count := countCmd.Val()
		if count > rl.limit {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		// Set headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", rl.limit-count))

		c.Next()
	}
}
