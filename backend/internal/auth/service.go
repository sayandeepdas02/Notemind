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
