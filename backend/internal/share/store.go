package share

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"

	"notemind/internal/ai"
)

// Store is the data layer the share handlers depend on.
// Keeping it as an interface lets tests inject a mock without a real database.
type Store interface {
	// CanWriteShare reports whether userID has at least 'member' role in the
	// workspace that owns meetingID. Viewers cannot create or revoke shares.
	CanWriteShare(ctx context.Context, meetingID, userID string) (bool, error)

	// InsertShare persists a new share row and returns the generated token.
	InsertShare(ctx context.Context, meetingID, createdByUserID string, isPublic bool, expiresAt *time.Time) (token string, err error)

	// RevokeShare sets revoked_at on an active share. Returns (false, nil) when
	// the token was not found or was already revoked.
	RevokeShare(ctx context.Context, meetingID, token string) (found bool, err error)

	// LookupShare resolves an active (not revoked, not expired) public token to
	// its meeting ID. Returns sql.ErrNoRows when no matching share exists.
	LookupShare(ctx context.Context, token string) (meetingID string, err error)

	// GetIntelligence returns AI-generated meeting intelligence.
	GetIntelligence(ctx context.Context, meetingID string) (*ai.MeetingSummary, error)
}

// sqlStore is the production Store backed by a *sql.DB.
type sqlStore struct{ db *sql.DB }

func (s *sqlStore) CanWriteShare(ctx context.Context, meetingID, userID string) (bool, error) {
	var ok bool
	err := s.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM meetings m
			JOIN workspace_members wm ON wm.workspace_id = m.workspace_id
			WHERE m.id    = $1
			  AND wm.user_id = $2
			  AND wm.role IN ('owner','admin','manager','member')
		)`, meetingID, userID).Scan(&ok)
	return ok, err
}

func (s *sqlStore) InsertShare(ctx context.Context, meetingID, createdByUserID string, isPublic bool, expiresAt *time.Time) (string, error) {
	token := uuid.New().String()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO meeting_shares (id, meeting_id, share_token, is_public, created_by_user_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		uuid.New().String(), meetingID, token, isPublic, createdByUserID, expiresAt)
	if err != nil {
		return "", err
	}
	return token, nil
}

func (s *sqlStore) RevokeShare(ctx context.Context, meetingID, token string) (bool, error) {
	res, err := s.db.ExecContext(ctx, `
		UPDATE meeting_shares
		SET    revoked_at = NOW()
		WHERE  meeting_id  = $1
		  AND  share_token = $2
		  AND  revoked_at IS NULL`,
		meetingID, token)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (s *sqlStore) LookupShare(ctx context.Context, token string) (string, error) {
	var meetingID string
	err := s.db.QueryRowContext(ctx, `
		SELECT meeting_id
		FROM   meeting_shares
		WHERE  share_token = $1
		  AND  is_public   = true
		  AND  revoked_at IS NULL
		  AND  (expires_at IS NULL OR expires_at > NOW())`,
		token).Scan(&meetingID)
	return meetingID, err
}

func (s *sqlStore) GetIntelligence(ctx context.Context, meetingID string) (*ai.MeetingSummary, error) {
	var result ai.MeetingSummary

	var summaryText sql.NullString
	_ = s.db.QueryRowContext(ctx,
		"SELECT summary_text FROM summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1",
		meetingID).Scan(&summaryText)
	if summaryText.Valid {
		result.Summary = summaryText.String
	}

	rows, err := s.db.QueryContext(ctx,
		"SELECT task, COALESCE(owner,'') FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var item ai.ActionItem
			if rows.Scan(&item.Task, &item.Owner) == nil {
				result.ActionItems = append(result.ActionItems, item)
			}
		}
		rows.Close()
	}

	rows, err = s.db.QueryContext(ctx,
		"SELECT decision_text FROM decisions WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var d string
			if rows.Scan(&d) == nil {
				result.Decisions = append(result.Decisions, d)
			}
		}
		rows.Close()
	}

	rows, err = s.db.QueryContext(ctx,
		"SELECT point_text FROM key_points WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var kp string
			if rows.Scan(&kp) == nil {
				result.KeyPoints = append(result.KeyPoints, kp)
			}
		}
		rows.Close()
	}

	return &result, nil
}
