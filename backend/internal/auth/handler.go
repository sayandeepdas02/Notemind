package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"notemind/internal/notifications"
	"notemind/pkg/config"
	"notemind/pkg/logger"
)

type Handler struct {
	service  *Service
	redis    *redis.Client
	cfg      *config.Config
	emailSvc *notifications.EmailService
}

func NewHandler(service *Service, redisClient *redis.Client, cfg *config.Config, emailSvc *notifications.EmailService) *Handler {
	return &Handler{service: service, redis: redisClient, cfg: cfg, emailSvc: emailSvc}
}

// ── Real Google OAuth ─────────────────────────────────────────────────────────

// InitiateGoogleOAuth builds a Google consent URL, stores an anti-CSRF nonce in
// Redis (TTL 10 min), and redirects the browser to Google.
// GET /auth/google/initiate
func (h *Handler) InitiateGoogleOAuth(c *gin.Context) {
	if h.cfg.GoogleAuthClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google OAuth not configured"})
		return
	}

	nonce, err := generateNonce()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
		return
	}

	if err := h.redis.Set(c.Request.Context(), "oauth_nonce:"+nonce, "1", 10*time.Minute).Err(); err != nil {
		logger.L.Error("failed to store OAuth nonce", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to initiate OAuth"})
		return
	}

	params := url.Values{
		"client_id":     {h.cfg.GoogleAuthClientID},
		"redirect_uri":  {h.cfg.GoogleAuthRedirectURI},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"state":         {nonce},
		"access_type":   {"online"},
	}
	c.Redirect(http.StatusFound, "https://accounts.google.com/o/oauth2/v2/auth?"+params.Encode())
}

// GoogleOAuthCallback exchanges the authorization code, verifies the nonce, fetches
// the Google userinfo, upserts the user, issues a JWT, and redirects to the frontend.
// GET /auth/google/callback
func (h *Handler) GoogleOAuthCallback(c *gin.Context) {
	// Handle user-denied permission
	if c.Query("error") != "" {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=access_denied")
		return
	}

	state := c.Query("state")
	code := c.Query("code")
	if state == "" || code == "" {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=invalid_request")
		return
	}

	// Verify nonce
	ctx := c.Request.Context()
	nonceKey := "oauth_nonce:" + state
	val, err := h.redis.GetDel(ctx, nonceKey).Result()
	if err != nil || val != "1" {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=invalid_state")
		return
	}

	// Exchange code for tokens
	accessToken, err := h.exchangeCode(ctx, code)
	if err != nil {
		logger.L.Error("OAuth code exchange failed", zap.Error(err))
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=exchange_failed")
		return
	}

	// Fetch userinfo
	userInfo, err := h.fetchUserInfo(ctx, accessToken)
	if err != nil {
		logger.L.Error("failed to fetch Google userinfo", zap.Error(err))
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=userinfo_failed")
		return
	}

	// Upsert user in DB
	user, err := h.service.UpsertUserByGoogle(*userInfo)
	if err != nil {
		logger.L.Error("failed to upsert user from Google", zap.Error(err))
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=db_error")
		return
	}

	// Issue JWT
	token, err := GenerateToken(user.ID)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=token_failed")
		return
	}

	// Store the JWT behind a short-lived, single-use exchange code so the JWT
	// never appears in the browser URL (history, logs, referrers).
	code, err := generateNonce()
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=token_failed")
		return
	}
	if err := h.redis.Set(c.Request.Context(), "auth_code:"+code, token, 60*time.Second).Err(); err != nil {
		logger.L.Error("failed to store auth code", zap.Error(err))
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=token_failed")
		return
	}
	c.Redirect(http.StatusFound, fmt.Sprintf("%s/auth/callback?code=%s", h.cfg.FrontendURL, code))
}

// ExchangeCode trades a one-time auth code (from the OAuth redirect) for the
// actual JWT. The code is stored in Redis with a 60-second TTL and deleted on
// first use, so the long-lived JWT is never placed in a browser-visible URL.
// POST /auth/exchange
func (h *Handler) ExchangeCode(c *gin.Context) {
	var req struct {
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code required"})
		return
	}
	token, err := h.redis.GetDel(c.Request.Context(), "auth_code:"+req.Code).Result()
	if err != nil || token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired code"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// IssueStreamToken issues a short-lived (60 s), single-use token that browser
// clients can place in the ?stream_token= query parameter of an EventSource URL.
// This avoids exposing the long-lived JWT in SSE URLs.
// POST /auth/stream-token  (requires valid JWT via auth.Middleware)
func (h *Handler) IssueStreamToken(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	tok, err := generateNonce()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate stream token"})
		return
	}
	if err := h.redis.Set(c.Request.Context(), "stream_token:"+tok, userID, 60*time.Second).Err(); err != nil {
		logger.L.Error("failed to store stream token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue stream token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"stream_token": tok})
}

// ── Dev-only: fake email login ────────────────────────────────────────────────

// GoogleLogin handles the fake email-based login.
// POST /auth/google  — only available when APP_ENV != "production"
func (h *Handler) GoogleLogin(c *gin.Context) {
	if h.cfg.IsProduction() {
		c.JSON(http.StatusForbidden, gin.H{"error": "not available in production"})
		return
	}

	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	user, err := h.service.UpsertUser(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to authenticate user"})
		return
	}

	token, err := GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	workspaces, err := h.service.GetUserWorkspaces(user.ID)
	if err != nil {
		workspaces = []WorkspaceSummary{}
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token:      token,
		User:       *user,
		Workspaces: workspaces,
	})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func generateNonce() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (h *Handler) exchangeCode(ctx context.Context, code string) (string, error) {
	params := url.Values{
		"code":          {code},
		"client_id":     {h.cfg.GoogleAuthClientID},
		"client_secret": {h.cfg.GoogleAuthClientSecret},
		"redirect_uri":  {h.cfg.GoogleAuthRedirectURI},
		"grant_type":    {"authorization_code"},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://oauth2.googleapis.com/token",
		strings.NewReader(params.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token exchange failed (%d): %s", resp.StatusCode, body)
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("empty access_token in response")
	}
	return result.AccessToken, nil
}

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// ── Email magic-link auth ─────────────────────────────────────────────────────

// EmailAuth issues a magic-link and sends it to the provided email address.
// POST /auth/email
func (h *Handler) EmailAuth(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required"`
		Name  string `json:"name"`
		Mode  string `json:"mode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email is required"})
		return
	}

	otp, err := generateNonce()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	payload, _ := json.Marshal(map[string]string{"email": req.Email, "name": req.Name})
	if err := h.redis.Set(c.Request.Context(), "email_otp:"+otp, payload, 15*time.Minute).Err(); err != nil {
		logger.L.Error("failed to store email OTP", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send magic link"})
		return
	}

	magicLink := fmt.Sprintf("%s/auth/email/verify?token=%s", h.cfg.APIBaseURL, otp)

	if h.emailSvc != nil {
		if err := h.emailSvc.SendMagicLink(c.Request.Context(), req.Email, req.Name, magicLink); err != nil {
			logger.L.Error("failed to send magic link email", zap.String("email", req.Email), zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send sign-in email"})
			return
		}
	} else {
		// Dev fallback: log the magic link so developers can sign in without Resend configured.
		logger.L.Info("magic link (email service not configured)", zap.String("link", magicLink))
	}

	c.JSON(http.StatusOK, gin.H{"message": "check your email for a sign-in link"})
}

// VerifyEmailToken validates the OTP from a magic-link email and redirects to the frontend.
// GET /auth/email/verify
func (h *Handler) VerifyEmailToken(c *gin.Context) {
	otp := c.Query("token")
	if otp == "" {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=invalid_token")
		return
	}

	key := "email_otp:" + otp
	raw, err := h.redis.GetDel(c.Request.Context(), key).Result()
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=invalid_or_expired_token")
		return
	}

	var payload struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil || payload.Email == "" {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=invalid_token")
		return
	}

	user, err := h.service.GetOrCreateUserByEmail(payload.Email, payload.Name)
	if err != nil {
		logger.L.Error("failed to get/create user for email auth", zap.Error(err))
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=db_error")
		return
	}

	token, err := GenerateToken(user.ID)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=token_failed")
		return
	}

	// Use the same single-use code pattern as Google OAuth so the JWT never
	// appears in the browser URL bar.
	code, err := generateNonce()
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=token_failed")
		return
	}
	if err := h.redis.Set(c.Request.Context(), "auth_code:"+code, token, 60*time.Second).Err(); err != nil {
		logger.L.Error("failed to store auth code for email verify", zap.Error(err))
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth?error=token_failed")
		return
	}
	c.Redirect(http.StatusFound, fmt.Sprintf("%s/auth/callback?code=%s", h.cfg.FrontendURL, code))
}

// ── User profile endpoints ─────────────────────────────────────────────────────

// GetMe returns the authenticated user's profile.
// GET /users/me
func (h *Handler) GetMe(c *gin.Context) {
	userID := c.GetString("user_id")
	user, err := h.service.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateMe updates the authenticated user's display name.
// PUT /users/me
func (h *Handler) UpdateMe(c *gin.Context) {
	userID := c.GetString("user_id")

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	user, err := h.service.UpdateUserName(userID, strings.TrimSpace(req.Name))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// DeleteMe permanently deletes the authenticated user's account.
// DELETE /users/me
func (h *Handler) DeleteMe(c *gin.Context) {
	userID := c.GetString("user_id")
	if err := h.service.DeleteUser(userID); err != nil {
		logger.L.Error("failed to delete user", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete account"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "account deleted"})
}

func (h *Handler) fetchUserInfo(ctx context.Context, accessToken string) (*googleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo fetch failed (%d): %s", resp.StatusCode, body)
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("failed to parse userinfo: %w", err)
	}
	return &info, nil
}
