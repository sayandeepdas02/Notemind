// Package organization manages folders, tags, and search for the Notemind platform.
package organization

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"notemind/internal/db"
	"notemind/internal/workspace"
)

// ── Folder types ──────────────────────────────────────────────────────────────

type Folder struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	Name        string    `json:"name"`
	ParentID    string    `json:"parent_id,omitempty"`
	Color       string    `json:"color"`
	CreatedAt   time.Time `json:"created_at"`
}

type Tag struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspace_id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
}

// ── Repository ─────────────────────────────────────────────────────────────────

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

// ─── Folders ────────────────────────────────────────────────────────────────

func (r *Repository) CreateFolder(ctx context.Context, f *Folder) error {
	return db.DB.QueryRowContext(ctx, `
		INSERT INTO folders (workspace_id, name, parent_id, color)
		VALUES ($1, $2, NULLIF($3,'')::uuid, $4)
		RETURNING id, created_at
	`, f.WorkspaceID, f.Name, f.ParentID, f.Color).Scan(&f.ID, &f.CreatedAt)
}

func (r *Repository) GetFolders(ctx context.Context, userID string) ([]Folder, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, workspace_id, name, COALESCE(parent_id::text,''), color, created_at
		FROM folders WHERE workspace_id = $1 ORDER BY name
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []Folder
	for rows.Next() {
		var f Folder
		if err := rows.Scan(&f.ID, &f.WorkspaceID, &f.Name, &f.ParentID, &f.Color, &f.CreatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, nil
}

func (r *Repository) UpdateFolder(ctx context.Context, f *Folder) error {
	_, err := db.DB.ExecContext(ctx, `
		UPDATE folders SET name=$1, color=$2, parent_id=NULLIF($3,'')::uuid, updated_at=NOW()
		WHERE id=$4 AND workspace_id=$5
	`, f.Name, f.Color, f.ParentID, f.ID, f.WorkspaceID)
	return err
}

func (r *Repository) DeleteFolder(ctx context.Context, folderID, userID string) error {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to resolve workspace: %w", err)
	}
	_, err = db.DB.ExecContext(ctx, "DELETE FROM folders WHERE id=$1 AND workspace_id=$2", folderID, workspaceID)
	return err
}

func (r *Repository) AddMeetingToFolder(ctx context.Context, meetingID, folderID string) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO meeting_folder_memberships (meeting_id, folder_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, meetingID, folderID)
	return err
}

func (r *Repository) RemoveMeetingFromFolder(ctx context.Context, meetingID, folderID string) error {
	_, err := db.DB.ExecContext(ctx, `
		DELETE FROM meeting_folder_memberships WHERE meeting_id=$1 AND folder_id=$2
	`, meetingID, folderID)
	return err
}

// ─── Tags ────────────────────────────────────────────────────────────────────

func (r *Repository) CreateTag(ctx context.Context, t *Tag) error {
	return db.DB.QueryRowContext(ctx, `
		INSERT INTO tags (workspace_id, name, color) VALUES ($1, $2, $3)
		ON CONFLICT (workspace_id, name) DO UPDATE SET color = EXCLUDED.color
		RETURNING id
	`, t.WorkspaceID, t.Name, t.Color).Scan(&t.ID)
}

func (r *Repository) GetTags(ctx context.Context, userID string) ([]Tag, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, workspace_id, name, color FROM tags WHERE workspace_id = $1 ORDER BY name
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.WorkspaceID, &t.Name, &t.Color); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, nil
}

func (r *Repository) DeleteTag(ctx context.Context, tagID, userID string) error {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to resolve workspace: %w", err)
	}
	_, err = db.DB.ExecContext(ctx, "DELETE FROM tags WHERE id=$1 AND workspace_id=$2", tagID, workspaceID)
	return err
}

func (r *Repository) AddTagToMeeting(ctx context.Context, meetingID, tagID string) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO meeting_tags (meeting_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, meetingID, tagID)
	return err
}

func (r *Repository) RemoveTagFromMeeting(ctx context.Context, meetingID, tagID string) error {
	_, err := db.DB.ExecContext(ctx, `
		DELETE FROM meeting_tags WHERE meeting_id=$1 AND tag_id=$2
	`, meetingID, tagID)
	return err
}

// ─── Search ────────────────────────────────────────────────────────────────

// SearchFilters restricts a search query.
type SearchFilters struct {
	Provider  string
	TagID     string
	FolderID  string
	FromDate  string // RFC3339
	ToDate    string
}

// SearchResult matches the frontend SearchResult contract exactly.
type SearchResult struct {
	ID        string  `json:"id"`
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	Snippet   string  `json:"snippet"`
	MeetingID string  `json:"meeting_id"`
	Timestamp *string `json:"timestamp,omitempty"`
	Score     float64 `json:"score"`
}

// SearchResponse wraps search results with metadata, matching the frontend contract.
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Total   int            `json:"total"`
	Query   string         `json:"query"`
}

// Search performs full-text search across meetings and transcripts for the user.
func (r *Repository) Search(ctx context.Context, userID, query string, filters SearchFilters) ([]SearchResult, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}

	baseQ := `
		SELECT DISTINCT m.id,
		       COALESCE(ce.title, m.meeting_url, 'Untitled Meeting') AS title,
		       ts_headline('english', COALESCE(s.text,''), q) AS snippet,
		       ts_rank(COALESCE(s.search_vector, m.search_vector), q) AS score,
		       m.created_at
		FROM meetings m
		LEFT JOIN transcript_segments s ON s.meeting_id = m.id
		  AND s.search_vector @@ q
		LEFT JOIN calendar_events ce ON ce.notemind_meeting_id = m.id
		, plainto_tsquery('english', $2) q
		WHERE m.workspace_id = $1
		  AND (m.search_vector @@ q OR s.search_vector @@ q)
	`
	args := []interface{}{workspaceID, query}
	argIdx := 3

	if filters.Provider != "" {
		baseQ += " AND m.provider::text = $" + itoa(argIdx)
		args = append(args, filters.Provider)
		argIdx++
	}
	if filters.FromDate != "" {
		baseQ += " AND m.created_at >= $" + itoa(argIdx) + "::timestamptz"
		args = append(args, filters.FromDate)
		argIdx++
	}
	if filters.ToDate != "" {
		baseQ += " AND m.created_at <= $" + itoa(argIdx) + "::timestamptz"
		args = append(args, filters.ToDate)
		argIdx++
	}
	if filters.TagID != "" {
		baseQ += " AND EXISTS (SELECT 1 FROM meeting_tags mt WHERE mt.meeting_id=m.id AND mt.tag_id=$" + itoa(argIdx) + ")"
		args = append(args, filters.TagID)
		argIdx++
	}
	if filters.FolderID != "" {
		baseQ += " AND EXISTS (SELECT 1 FROM meeting_folder_memberships mf WHERE mf.meeting_id=m.id AND mf.folder_id=$" + itoa(argIdx) + ")"
		args = append(args, filters.FolderID)
	}

	baseQ += " ORDER BY score DESC, m.created_at DESC LIMIT 50"

	rows, err := db.DB.QueryContext(ctx, baseQ, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var sr SearchResult
		var snippet sql.NullString
		var createdAt time.Time
		if err := rows.Scan(&sr.ID, &sr.Title, &snippet, &sr.Score, &createdAt); err != nil {
			return nil, err
		}
		if snippet.Valid {
			sr.Snippet = snippet.String
		}
		sr.Type = "meeting"
		sr.MeetingID = sr.ID
		ts := createdAt.UTC().Format(time.RFC3339)
		sr.Timestamp = &ts
		results = append(results, sr)
	}
	return results, nil
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}
