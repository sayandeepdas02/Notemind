package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// KeyValidator is implemented by the API keys service to validate nm_xxx tokens.
type KeyValidator interface {
	ValidateKeyForUser(ctx context.Context, rawKey string) (string, error)
}

// GlobalKeyValidator is set at startup in main.go so the middleware can
// validate API keys without a circular import.
var GlobalKeyValidator KeyValidator

func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := extractToken(c)

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}

		// API key path: starts with "nm_"
		if strings.HasPrefix(tokenStr, "nm_") {
			if GlobalKeyValidator != nil {
				userID, err := GlobalKeyValidator.ValidateKeyForUser(c.Request.Context(), tokenStr)
				if err == nil && userID != "" {
					c.Set("user_id", userID)
					c.Next()
					return
				}
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
			return
		}

		// JWT path
		userID, err := ValidateToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}

// StreamTokenMiddleware authenticates SSE endpoints. It accepts:
//   - A standard Bearer JWT/API key in the Authorization header (API clients, tests), OR
//   - A short-lived, single-use ?stream_token= query parameter validated via Redis
//     (browsers using EventSource, which cannot set request headers).
//
// Long-lived tokens are never accepted in query parameters.
func StreamTokenMiddleware(redisClient *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Standard header path first — covers API clients and tests.
		if tokenStr := extractToken(c); tokenStr != "" {
			if strings.HasPrefix(tokenStr, "nm_") {
				if GlobalKeyValidator != nil {
					userID, err := GlobalKeyValidator.ValidateKeyForUser(c.Request.Context(), tokenStr)
					if err == nil && userID != "" {
						c.Set("user_id", userID)
						c.Next()
						return
					}
				}
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
				return
			}
			userID, err := ValidateToken(tokenStr)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
				return
			}
			c.Set("user_id", userID)
			c.Next()
			return
		}

		// Short-lived stream token path — browser EventSource clients.
		streamTok := c.Query("stream_token")
		if streamTok == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}
		// GetDel is atomic: validates and invalidates in one round-trip (single-use).
		userID, err := redisClient.GetDel(c.Request.Context(), "stream_token:"+streamTok).Result()
		if err != nil || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired stream token"})
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}
	return ""
}
