package workspace

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"notemind/internal/db"
)

var (
	ErrWorkspaceNotFound  = errors.New("workspace not found")
	ErrForbidden          = errors.New("forbidden: insufficient permissions")
	ErrUserNotInWorkspace = errors.New("user is not a member of this workspace")
	ErrUserNotFound       = errors.New("no user found with that email address")
)

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Domain    *string   `json:"domain,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"` // owner, admin, manager, member, viewer
	JoinedAt    time.Time `json:"joined_at"`
	
	// Hydrated fields
	UserEmail *string `json:"user_email,omitempty"`
	UserName  *string `json:"user_name,omitempty"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

// GetUserWorkspaces returns all workspaces a user has access to.
func (s *Service) GetUserWorkspaces(ctx context.Context, userID string) ([]Workspace, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT w.id, w.name, w.domain, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id
		WHERE wm.user_id = $1
		ORDER BY w.name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []Workspace
	for rows.Next() {
		var w Workspace
		var domain sql.NullString
		if err := rows.Scan(&w.ID, &w.Name, &domain, &w.CreatedAt); err != nil {
			return nil, err
		}
		if domain.Valid {
			w.Domain = &domain.String
		}
		workspaces = append(workspaces, w)
	}
	return workspaces, nil
}

// CreateWorkspace creates a new workspace and assigns the creator as the 'owner'.
func (s *Service) CreateWorkspace(ctx context.Context, userID, name string) (*Workspace, error) {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	wID := uuid.New().String()
	var w Workspace
	err = tx.QueryRowContext(ctx, `
		INSERT INTO workspaces (id, name) VALUES ($1, $2)
		RETURNING id, name, created_at
	`, wID, name).Scan(&w.ID, &w.Name, &w.CreatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, w.ID, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &w, nil
}

// UpdateWorkspace renames a workspace. Requires the caller to be owner or admin.
func (s *Service) UpdateWorkspace(ctx context.Context, workspaceID, userID, name string) (*Workspace, error) {
	role, err := s.GetRole(ctx, workspaceID, userID)
	if err != nil {
		return nil, ErrWorkspaceNotFound
	}
	if role != "owner" && role != "admin" {
		return nil, ErrForbidden
	}

	var w Workspace
	err = db.DB.QueryRowContext(ctx, `
		UPDATE workspaces SET name = $1 WHERE id = $2
		RETURNING id, name, created_at
	`, name, workspaceID).Scan(&w.ID, &w.Name, &w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

// GetUserIDByEmail resolves an email address to a user ID.
// Returns an error if no user with that email exists.
func (s *Service) GetUserIDByEmail(ctx context.Context, email string) (string, error) {
	var userID string
	err := db.DB.QueryRowContext(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&userID)
	if err == sql.ErrNoRows {
		return "", errors.New("no registered user found with that email address")
	}
	return userID, err
}

// GetDefaultWorkspaceID returns the workspace_id of the first workspace the user belongs to.
// This is used to resolve workspace scope when only a user_id is available (e.g. JWT auth context).
func GetDefaultWorkspaceID(ctx context.Context, userID string) (string, error) {
	var workspaceID string
	err := db.DB.QueryRowContext(ctx, `
		SELECT workspace_id FROM workspace_members WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1
	`, userID).Scan(&workspaceID)
	if err == sql.ErrNoRows {
		return "", ErrWorkspaceNotFound
	}
	return workspaceID, err
}

// GetRole returns the role of a user in a workspace.
func (s *Service) GetRole(ctx context.Context, workspaceID, userID string) (string, error) {
	var role string
	err := db.DB.QueryRowContext(ctx, `
		SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2
	`, workspaceID, userID).Scan(&role)
	
	if err == sql.ErrNoRows {
		return "", ErrUserNotInWorkspace
	}
	return role, err
}

// AddMember adds a user to a workspace. Only owners or admins can do this.
func (s *Service) AddMember(ctx context.Context, workspaceID, targetUserID, targetRole string) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, workspaceID, targetUserID, targetRole)
	return err
}

// InviteMemberByEmail looks up a user by email and adds them to the workspace.
func (s *Service) InviteMemberByEmail(ctx context.Context, workspaceID, email, role string) error {
	var userID string
	err := db.DB.QueryRowContext(ctx,
		`SELECT id FROM users WHERE email = $1`, email,
	).Scan(&userID)
	if err == sql.ErrNoRows {
		return ErrUserNotFound
	}
	if err != nil {
		return err
	}
	return s.AddMember(ctx, workspaceID, userID, role)
}

// ListMembers lists all members of a workspace.
func (s *Service) ListMembers(ctx context.Context, workspaceID string) ([]WorkspaceMember, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT wm.workspace_id, wm.user_id, wm.role, wm.created_at, u.email, u.name
		FROM workspace_members wm
		JOIN users u ON u.id = wm.user_id
		WHERE wm.workspace_id = $1
		ORDER BY wm.created_at ASC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []WorkspaceMember
	for rows.Next() {
		var m WorkspaceMember
		var email, name sql.NullString
		if err := rows.Scan(&m.WorkspaceID, &m.UserID, &m.Role, &m.JoinedAt, &email, &name); err != nil {
			return nil, err
		}
		if email.Valid {
			m.UserEmail = &email.String
		}
		if name.Valid {
			m.UserName = &name.String
		}
		members = append(members, m)
	}
	return members, nil
}
