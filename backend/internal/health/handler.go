// Package health provides the GET /health endpoint for the Notemind API.
// It checks the liveness of all critical downstream dependencies (DB, Redis)
// and returns HTTP 200 when healthy, 503 when degraded.
package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// Status is the JSON response body for GET /health.
type Status struct {
	Status  string            `json:"status"`  // "ok" or "degraded"
	Checks  map[string]string `json:"checks"`  // per-dependency status
	Uptime  string            `json:"uptime"`  // human-readable uptime
	Version string            `json:"version"` // build version (injected at build time)
}

var (
	startTime = time.Now()
	// Version can be overridden via ldflags: -ldflags "-X notemind/internal/health.Version=v1.2.3"
	Version = "dev"
)

// NewHandler returns a Gin handler that runs the health checks.
// redisAddr is the address of the Redis instance (e.g. "localhost:6379").
func NewHandler(redisAddr string) gin.HandlerFunc {
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})

	return func(c *gin.Context) {
		ctx := c.Request.Context()
		checks := map[string]string{}
		overall := "ok"

		// ── DB check ──────────────────────────────────────────────────────────
		if err := db.Ping(ctx); err != nil {
			logger.L.Warn("health: DB ping failed", zap.Error(err))
			checks["db"] = "degraded: " + err.Error()
			overall = "degraded"
		} else {
			checks["db"] = "ok"
		}

		// ── Redis check ───────────────────────────────────────────────────────
		redisCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		if err := rdb.Ping(redisCtx).Err(); err != nil {
			logger.L.Warn("health: Redis ping failed", zap.Error(err))
			checks["redis"] = "degraded: " + err.Error()
			overall = "degraded"
		} else {
			checks["redis"] = "ok"
		}

		// ── Response ──────────────────────────────────────────────────────────
		status := Status{
			Status:  overall,
			Checks:  checks,
			Uptime:  time.Since(startTime).Round(time.Second).String(),
			Version: Version,
		}

		httpCode := http.StatusOK
		if overall == "degraded" {
			httpCode = http.StatusServiceUnavailable
		}

		c.JSON(httpCode, status)
	}
}
