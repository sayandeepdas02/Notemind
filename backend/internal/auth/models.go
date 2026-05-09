package auth

import "time"

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

type GoogleLoginRequest struct {
	Email     string `json:"email" binding:"required"`
	Name      string `json:"name" binding:"required"`
	AvatarURL string `json:"avatar_url"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
