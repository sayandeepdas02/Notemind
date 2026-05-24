package keys

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"notemind/internal/db"
)

// APIKey represents a programmatic access key.
type APIKey struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	WorkspaceID string    `json:"workspace_id,omitempty"`
	Name        string    `json:"name"`
	KeyPrefix   string    `json:"key_prefix"`
	Scopes      []string  `json:"scopes"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

// GenerateUserKey creates a new API key scoped to a user.
// Returns the raw unhashed key (shown only once) and the saved record.
func (s *Service) GenerateUserKey(ctx context.Context, userID, name string, scopes []string) (string, *APIKey, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", nil, fmt.Errorf("failed to generate random bytes: %w", err)
	}

	rawKey := "nm_" + hex.EncodeToString(b)
	prefix := rawKey[:10] // "nm_" + 7 hex chars

	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	if scopes == nil {
		scopes = []string{}
	}

	apiKey := &APIKey{
		ID:        uuid.New().String(),
		UserID:    userID,
		Name:      name,
		KeyPrefix: prefix,
		Scopes:    scopes,
	}

	err := db.DB.QueryRowContext(ctx, `
		INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`, apiKey.ID, userID, name, keyHash, prefix, scopesToPgArray(scopes)).
		Scan(&apiKey.CreatedAt)

	if err != nil {
		return "", nil, fmt.Errorf("failed to insert API key: %w", err)
	}

	return rawKey, apiKey, nil
}

// ListUserKeys returns all API keys for a user (prefix only, never hash).
func (s *Service) ListUserKeys(ctx context.Context, userID string) ([]APIKey, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, COALESCE(user_id::text,''), name, key_prefix, COALESCE(scopes, '{}'), last_used_at, created_at
		FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []APIKey
	for rows.Next() {
		var k APIKey
		var scopesArr []byte
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, &scopesArr, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		k.Scopes = pgArrayToScopes(scopesArr)
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []APIKey{}
	}
	return keys, nil
}

// UpdateKeyName updates the display name of an API key owned by userID.
func (s *Service) UpdateKeyName(ctx context.Context, keyID, userID, name string) error {
	res, err := db.DB.ExecContext(ctx,
		`UPDATE api_keys SET name = $1 WHERE id = $2 AND user_id = $3`,
		name, keyID, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("key not found")
	}
	return nil
}

// RevokeKey deletes an API key owned by userID.
func (s *Service) RevokeKey(ctx context.Context, keyID, userID string) error {
	_, err := db.DB.ExecContext(ctx,
		`DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, keyID, userID)
	return err
}

// ValidateKey checks an incoming raw key and returns the workspaceID (legacy path).
func (s *Service) ValidateKey(ctx context.Context, rawKey string) (string, error) {
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	var workspaceID string
	err := db.DB.QueryRowContext(ctx, `
		UPDATE api_keys SET last_used_at = NOW()
		WHERE key_hash = $1
		RETURNING COALESCE(workspace_id::text, '')
	`, keyHash).Scan(&workspaceID)
	if err != nil {
		return "", fmt.Errorf("invalid api key")
	}
	return workspaceID, nil
}

// ValidateKeyForUser validates a raw key and returns the associated user_id.
// Implements auth.KeyValidator.
func (s *Service) ValidateKeyForUser(ctx context.Context, rawKey string) (string, error) {
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	var userID string
	err := db.DB.QueryRowContext(ctx, `
		UPDATE api_keys SET last_used_at = NOW()
		WHERE key_hash = $1 AND user_id IS NOT NULL
		RETURNING user_id::text
	`, keyHash).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("invalid api key")
	}
	return userID, nil
}

// scopesToPgArray converts a Go string slice to PostgreSQL TEXT[] literal.
func scopesToPgArray(ss []string) string {
	if len(ss) == 0 {
		return "{}"
	}
	result := "{"
	for i, s := range ss {
		if i > 0 {
			result += ","
		}
		result += `"` + s + `"`
	}
	return result + "}"
}

// pgArrayToScopes parses a PostgreSQL array byte representation.
func pgArrayToScopes(raw []byte) []string {
	s := string(raw)
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.Trim(p, `"`)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
