package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// JWTSecret is the HMAC signing key for user tokens.
// Set this at startup via auth.JWTSecret = []byte(cfg.JWTSecret).
// The placeholder is intentionally weak to cause obvious failures if not overridden.
var JWTSecret = []byte("CHANGE_ME_SET_JWT_SECRET_ENV_VAR")

type Service struct {
	db *sql.DB
}

func NewService() *Service {
	return &Service{db: db.DB}
}

func (s *Service) UpsertUser(req GoogleLoginRequest) (*User, error) {
	var user User
	err := s.db.QueryRow(`
		INSERT INTO users (id, email, name, avatar_url)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (email) DO UPDATE
		SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
		RETURNING id, email, name, avatar_url, created_at
	`, uuid.New().String(), req.Email, req.Name, req.AvatarURL).
		Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.CreatedAt)

	if err != nil {
		logger.L.Error("failed to upsert user", zap.String("email", req.Email), zap.Error(err))
		return nil, fmt.Errorf("could not save user: %w", err)
	}

	return &user, nil
}

// UpsertUserByGoogle upserts a user identified by their Google account.
// If the email already exists it links the google_id and updates name/avatar.
func (s *Service) UpsertUserByGoogle(info googleUserInfo) (*User, error) {
	var user User
	err := s.db.QueryRow(`
		INSERT INTO users (id, email, name, avatar_url, google_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (email) DO UPDATE
		SET name        = EXCLUDED.name,
		    avatar_url  = EXCLUDED.avatar_url,
		    google_id   = EXCLUDED.google_id
		RETURNING id, email, name, avatar_url, created_at
	`, uuid.New().String(), info.Email, info.Name, info.Picture, info.ID).
		Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.CreatedAt)

	if err != nil {
		logger.L.Error("failed to upsert user by Google", zap.String("email", info.Email), zap.Error(err))
		return nil, fmt.Errorf("could not save user: %w", err)
	}
	return &user, nil
}

// GetUserWorkspaces returns all workspaces the user belongs to, with their role in each.
func (s *Service) GetUserWorkspaces(userID string) ([]WorkspaceSummary, error) {
	rows, err := s.db.Query(`
		SELECT w.id, w.name, wm.role
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id
		WHERE wm.user_id = $1
		ORDER BY w.name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	workspaces := []WorkspaceSummary{}
	for rows.Next() {
		var ws WorkspaceSummary
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.Role); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, nil
}

// GetUserByID returns a user by their primary key.
func (s *Service) GetUserByID(id string) (*User, error) {
	var user User
	err := s.db.QueryRow(`
		SELECT id, email, name, avatar_url, created_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &user, nil
}

// UpdateUserName sets a new display name for the user.
func (s *Service) UpdateUserName(id, name string) (*User, error) {
	var user User
	err := s.db.QueryRow(`
		UPDATE users SET name = $1 WHERE id = $2
		RETURNING id, email, name, avatar_url, created_at
	`, name, id).Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return &user, nil
}

// DeleteUser permanently removes a user record.
func (s *Service) DeleteUser(id string) error {
	_, err := s.db.Exec(`DELETE FROM users WHERE id = $1`, id)
	return err
}

// GetOrCreateUserByEmail finds or creates a user identified by email.
// Used for the email magic-link sign-up/sign-in flow.
func (s *Service) GetOrCreateUserByEmail(email, name string) (*User, error) {
	if name == "" {
		parts := strings.SplitN(email, "@", 2)
		name = parts[0]
	}
	var user User
	err := s.db.QueryRow(`
		INSERT INTO users (id, email, name)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO UPDATE
		  SET name = CASE WHEN users.name = '' THEN EXCLUDED.name ELSE users.name END
		RETURNING id, email, name, avatar_url, created_at
	`, uuid.New().String(), email, name).
		Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.CreatedAt)
	if err != nil {
		logger.L.Error("failed to get-or-create user by email", zap.String("email", email), zap.Error(err))
		return nil, fmt.Errorf("could not find or create user: %w", err)
	}
	return &user, nil
}

func GenerateToken(userID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	})
	return token.SignedString(JWTSecret)
}

func ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return JWTSecret, nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid claims")
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", errors.New("invalid user_id claim")
	}

	return userID, nil
}
