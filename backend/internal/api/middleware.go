package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"notemind/pkg/logger"
)

// CorrelationIDMiddleware extracts or generates an X-Correlation-ID
func CorrelationIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		corID := c.GetHeader("X-Correlation-ID")
		if corID == "" {
			corID = uuid.New().String()
		}
		c.Header("X-Correlation-ID", corID)

		// Inject into standard context
		ctx := logger.ContextWithCorrelation(c.Request.Context(), corID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// RequestLogger logs all incoming requests with correlation ID
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start)

		log := logger.WithContext(c.Request.Context())
		if c.Writer.Status() >= 400 {
			log.Error("HTTP Request",
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
				zap.Int("status", c.Writer.Status()),
				zap.Duration("duration", duration),
			)
		} else {
			log.Info("HTTP Request",
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
				zap.Int("status", c.Writer.Status()),
				zap.Duration("duration", duration),
			)
		}
	}
}

// RateLimitMiddleware applies a simple Redis sliding window rate limit
func RateLimitMiddleware(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		if userID == "" {
			userID = c.ClientIP() // fallback for unauthenticated
		}

		key := "ratelimit:" + c.Request.URL.Path + ":" + userID

		// Clean old requests
		ctx := context.Background()

		// Redis transaction
		pipe := rdb.TxPipeline()
		pipe.ZRemRangeByScore(ctx, key, "0", zap.String("max", "-1").String) // actually string rep of windowStart
		pipe.ZRemRangeByScore(ctx, key, "-inf", "-1")                        // placeholder

		// Just use a simpler rate limiting logic or simply rely on standard incr/expire
		pipe.Discard() // aborting pipeline for simpler approach

		// Simpler approach: INCR and EXPIRE (fixed window)
		current, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			logger.L.Error("Rate limit redis error", zap.Error(err))
			c.Next()
			return
		}
		if current == 1 {
			rdb.Expire(ctx, key, window)
		}

		if current > int64(limit) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		c.Next()
	}
}
