package keys

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/google/uuid"

	"notemind/internal/db"
)

// APIKey represents a programmatic access key for a workspace.
type APIKey struct {
	ID          string
	WorkspaceID string
	Name        string
	KeyHash     string
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

// GenerateKey creates a new API key for a workspace.
// Returns the raw unhashed key (which is only shown once) and the saved record.
func (s *Service) GenerateKey(ctx context.Context, workspaceID, name string) (string, *APIKey, error) {
	// Generate 32 bytes of secure random data
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", nil, fmt.Errorf("failed to generate random bytes: %w", err)
	}
	
	rawKey := "nm_" + hex.EncodeToString(b)
	
	// Hash the key using SHA256 before storing
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	apiKey := &APIKey{
		ID:          uuid.New().String(),
		WorkspaceID: workspaceID,
		Name:        name,
		KeyHash:     keyHash,
	}

	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO api_keys (id, workspace_id, name, key_hash)
		VALUES ($1, $2, $3, $4)
	`, apiKey.ID, apiKey.WorkspaceID, apiKey.Name, apiKey.KeyHash)

	if err != nil {
		return "", nil, fmt.Errorf("failed to insert API key: %w", err)
	}

	return rawKey, apiKey, nil
}

// ValidateKey checks an incoming raw API key and returns the associated workspace ID if valid.
func (s *Service) ValidateKey(ctx context.Context, rawKey string) (string, error) {
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	var workspaceID string
	err := db.DB.QueryRowContext(ctx, `
		UPDATE api_keys 
		SET last_used_at = NOW() 
		WHERE key_hash = $1 
		RETURNING workspace_id
	`, keyHash).Scan(&workspaceID)

	if err != nil {
		return "", fmt.Errorf("invalid api key")
	}

	return workspaceID, nil
}
