package intelligence

import (
	"context"
	"fmt"
	"time"

	"notemind/internal/db"
	"notemind/internal/workspace"
)

type ActionItem struct {
	ID                  string
	WorkspaceID         string
	MeetingID           string
	Task                string
	Owner               string
	Status              string
	DueDate             *time.Time
	ResolutionNotes     string
	ResolutionMeetingID *string
	CreatedAt           time.Time
}

type ActionService struct{}

func NewActionService() *ActionService {
	return &ActionService{}
}

// TrackActionItem inserts a new action item found during meeting summarization.
func (s *ActionService) TrackActionItem(ctx context.Context, item ActionItem) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO action_item_tracking (workspace_id, meeting_id, task, owner, status)
		VALUES ($1, $2, $3, NULLIF($4, ''), 'open')
	`, item.WorkspaceID, item.MeetingID, item.Task, item.Owner)
	return err
}

// ResolveActionItem marks an item as complete. This might happen manually via UI
// or automatically if a future meeting discussion confirms it's done.
func (s *ActionService) ResolveActionItem(ctx context.Context, itemID, resolutionMeetingID, notes string) error {
	var resMeeting interface{}
	if resolutionMeetingID != "" {
		resMeeting = resolutionMeetingID
	}
	_, err := db.DB.ExecContext(ctx, `
		UPDATE action_item_tracking
		SET status = 'resolved',
		    resolution_notes = $1,
		    resolution_meeting_id = $2,
		    resolved_at = NOW(),
		    updated_at = NOW()
		WHERE id = $3
	`, notes, resMeeting, itemID)
	return err
}

// GetUserActionItems returns open action items for a workspace.
func (s *ActionService) GetUserActionItems(ctx context.Context, userID string) ([]ActionItem, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, meeting_id, task, COALESCE(owner, ''), status, created_at
		FROM action_item_tracking
		WHERE workspace_id = $1 AND status = 'open'
		ORDER BY created_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ActionItem
	for rows.Next() {
		var i ActionItem
		if err := rows.Scan(&i.ID, &i.MeetingID, &i.Task, &i.Owner, &i.Status, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, nil
}
