package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
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

func extractToken(c *gin.Context) string {
	// Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}
	// Query parameter (SSE connections)
	return c.Query("token")
}
