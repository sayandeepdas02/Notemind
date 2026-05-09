package zoom

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

const (
	zoomAuthURL  = "https://zoom.us/oauth/authorize"
	zoomTokenURL = "https://zoom.us/oauth/token"
)

// OAuthConfig holds Zoom OAuth app credentials.
type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

// TokenStore defines the interface for persisting Zoom OAuth tokens.
// The concrete implementation reads/writes the oauth_tokens table.
type TokenStore interface {
	GetToken(ctx context.Context, userID string) (*OAuthToken, error)
	SaveToken(ctx context.Context, userID string, tok *OAuthToken) error
	DeleteToken(ctx context.Context, userID string) error
}

// OAuthToken holds a Zoom OAuth token pair.
type OAuthToken struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresAt    time.Time `json:"expires_at"`
	Scopes       []string  `json:"scopes"`
}

// IsExpired returns true if the access token has expired (with 60s buffer).
func (t *OAuthToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt.Add(-60 * time.Second))
}

// ── DB-backed TokenStore ──────────────────────────────────────────────────────

// DBTokenStore persists tokens in the oauth_tokens table.
type DBTokenStore struct{}

func NewDBTokenStore() *DBTokenStore { return &DBTokenStore{} }

func (s *DBTokenStore) GetToken(ctx context.Context, userID string) (*OAuthToken, error) {
	row := db.DB.QueryRowContext(ctx, `
		SELECT access_token, refresh_token, token_type, expires_at, scopes
		FROM oauth_tokens
		WHERE user_id = $1 AND provider = 'zoom'
	`, userID)

	var tok OAuthToken
	var scopes []string
	var expiresAt sql.NullTime
	var refreshToken sql.NullString

	if err := row.Scan(&tok.AccessToken, &refreshToken, &tok.TokenType, &expiresAt, &scopes); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No token stored
		}
		return nil, err
	}
	if refreshToken.Valid {
		tok.RefreshToken = refreshToken.String
	}
	if expiresAt.Valid {
		tok.ExpiresAt = expiresAt.Time
	}
	tok.Scopes = scopes
	return &tok, nil
}

func (s *DBTokenStore) SaveToken(ctx context.Context, userID string, tok *OAuthToken) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_type, expires_at, scopes, updated_at)
		VALUES ($1, 'zoom', $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id, provider) DO UPDATE
		SET access_token = EXCLUDED.access_token,
		    refresh_token = EXCLUDED.refresh_token,
		    token_type = EXCLUDED.token_type,
		    expires_at = EXCLUDED.expires_at,
		    scopes = EXCLUDED.scopes,
		    updated_at = NOW()
	`, userID, tok.AccessToken, tok.RefreshToken, tok.TokenType, tok.ExpiresAt, tok.Scopes)
	return err
}

func (s *DBTokenStore) DeleteToken(ctx context.Context, userID string) error {
	_, err := db.DB.ExecContext(ctx, `
		DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = 'zoom'
	`, userID)
	return err
}

// ── OAuth Flow ────────────────────────────────────────────────────────────────

// OAuthService handles the Zoom authorization code flow.
type OAuthService struct {
	cfg        OAuthConfig
	tokenStore TokenStore
	httpClient *http.Client
}

// NewOAuthService creates a Zoom OAuth service.
func NewOAuthService(cfg OAuthConfig, tokenStore TokenStore) *OAuthService {
	return &OAuthService{
		cfg:        cfg,
		tokenStore: tokenStore,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// AuthorizationURL builds the Zoom OAuth authorization URL for the user to visit.
func (s *OAuthService) AuthorizationURL(state string) string {
	params := url.Values{
		"response_type": {"code"},
		"client_id":     {s.cfg.ClientID},
		"redirect_uri":  {s.cfg.RedirectURI},
		"state":         {state},
	}
	return zoomAuthURL + "?" + params.Encode()
}

// zoomTokenResponse is the JSON payload from Zoom's token endpoint.
type zoomTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

// ExchangeCode exchanges an authorization code for an OAuth token pair and persists it.
func (s *OAuthService) ExchangeCode(ctx context.Context, userID, code string) (*OAuthToken, error) {
	body := url.Values{
		"grant_type":   {"authorization_code"},
		"code":         {code},
		"redirect_uri": {s.cfg.RedirectURI},
	}

	tok, err := s.doTokenRequest(ctx, body)
	if err != nil {
		return nil, fmt.Errorf("zoom token exchange: %w", err)
	}

	if err := s.tokenStore.SaveToken(ctx, userID, tok); err != nil {
		logger.L.Error("failed to persist Zoom token", zap.String("user_id", userID), zap.Error(err))
	}
	return tok, nil
}

// GetValidToken returns a valid access token for the user, refreshing if necessary.
func (s *OAuthService) GetValidToken(ctx context.Context, userID string) (*OAuthToken, error) {
	tok, err := s.tokenStore.GetToken(ctx, userID)
	if err != nil {
		return nil, err
	}
	if tok == nil {
		return nil, fmt.Errorf("zoom: no token for user %s — please connect Zoom first", userID)
	}

	if tok.IsExpired() {
		tok, err = s.refreshToken(ctx, userID, tok.RefreshToken)
		if err != nil {
			return nil, fmt.Errorf("zoom token refresh failed: %w", err)
		}
	}
	return tok, nil
}

func (s *OAuthService) refreshToken(ctx context.Context, userID, refreshToken string) (*OAuthToken, error) {
	body := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
	}
	tok, err := s.doTokenRequest(ctx, body)
	if err != nil {
		return nil, err
	}
	if err := s.tokenStore.SaveToken(ctx, userID, tok); err != nil {
		logger.L.Warn("failed to persist refreshed Zoom token", zap.Error(err))
	}
	return tok, nil
}

func (s *OAuthService) doTokenRequest(ctx context.Context, body url.Values) (*OAuthToken, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, zoomTokenURL, bytes.NewBufferString(body.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.cfg.ClientID, s.cfg.ClientSecret)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("zoom token endpoint error %d: %s", resp.StatusCode, string(raw))
	}

	var tr zoomTokenResponse
	if err := json.Unmarshal(raw, &tr); err != nil {
		return nil, fmt.Errorf("failed to parse zoom token response: %w", err)
	}

	return &OAuthToken{
		AccessToken:  tr.AccessToken,
		RefreshToken: tr.RefreshToken,
		TokenType:    tr.TokenType,
		ExpiresAt:    time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second),
		Scopes:       strings.Split(tr.Scope, " "),
	}, nil
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────

// OAuthHandler provides Gin-compatible handlers for the Zoom OAuth flow.
type OAuthHandler struct {
	oauthSvc *OAuthService
}

// NewOAuthHandler creates a handler for Zoom OAuth routes.
func NewOAuthHandler(oauthSvc *OAuthService) *OAuthHandler {
	return &OAuthHandler{oauthSvc: oauthSvc}
}
