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

// WorkspaceSummary is the minimal workspace shape returned at login.
type WorkspaceSummary struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type AuthResponse struct {
	Token      string             `json:"token"`
	User       User               `json:"user"`
	Workspaces []WorkspaceSummary `json:"workspaces"`
}
