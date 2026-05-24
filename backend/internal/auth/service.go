package auth

import (
	"database/sql"
	"errors"
	"fmt"
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
