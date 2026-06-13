package meeting

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/ai"
	"notemind/internal/db"
	"notemind/internal/workspace"
	"notemind/pkg/logger"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: db.DB}
}

// ─── Meetings ────────────────────────────────────────────────────────────────

func (r *Repository) CreateMeeting(m *Meeting, userID string) error {
	mt := m.MeetingType
	if mt == "" {
		mt = "general"
	}
	workspaceID, err := workspace.GetDefaultWorkspaceID(context.Background(), userID)
	if err != nil {
		return fmt.Errorf("failed to resolve workspace: %w", err)
	}
	query := `INSERT INTO meetings (id, workspace_id, audio_url, meeting_url, native_meeting_id, status, meeting_type, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`
	_, err = r.db.Exec(query, m.ID, workspaceID, m.AudioURL, m.MeetingURL, m.NativeMeetingID, m.Status, mt)
	if err != nil {
		logger.L.Error("failed to insert meeting", zap.String("meeting_id", m.ID), zap.Error(err))
		return err
	}
	return nil
}

func (r *Repository) UpdateMeetingStatus(id string, status string) error {
	return TransitionState(context.Background(), id, MeetingState(status), "Status update")
}

func (r *Repository) UpdateMeetingNativeID(id, nativeID string) error {
	_, err := r.db.Exec("UPDATE meetings SET native_meeting_id = $1 WHERE id = $2", nativeID, id)
	return err
}

func (r *Repository) UpdateMeetingProvider(id, providerName string) error {
	_, err := r.db.Exec("UPDATE meetings SET provider = $1::meeting_provider WHERE id = $2", providerName, id)
	return err
}

func (r *Repository) GetMeetings(userID string) ([]Meeting, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(context.Background(), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := r.db.Query(`
		SELECT id, COALESCE(audio_url,''), COALESCE(meeting_url,''),
		       COALESCE(native_meeting_id,''), status,
		       COALESCE(meeting_type,'general'), created_at,
		       COALESCE(updated_at, created_at)
		FROM meetings WHERE workspace_id = $1 ORDER BY created_at DESC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var meetings []Meeting
	for rows.Next() {
		var m Meeting
		if err := rows.Scan(&m.ID, &m.AudioURL, &m.MeetingURL, &m.NativeMeetingID, &m.Status, &m.MeetingType, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		meetings = append(meetings, m)
	}
	return meetings, nil
}

func (r *Repository) GetMeeting(id string, userID string) (*Meeting, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(context.Background(), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	var m Meeting
	err = r.db.QueryRow(`
		SELECT id, COALESCE(audio_url,''), COALESCE(meeting_url,''),
		       COALESCE(native_meeting_id,''), status,
		       COALESCE(meeting_type,'general'), created_at,
		       COALESCE(updated_at, created_at)
		FROM meetings WHERE id = $1 AND workspace_id = $2`, id, workspaceID).
		Scan(&m.ID, &m.AudioURL, &m.MeetingURL, &m.NativeMeetingID, &m.Status, &m.MeetingType, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// ─── Phase 1 transcript (file-based, single blob) ────────────────────────────

func (r *Repository) CreateTranscript(t *Transcript) error {
	query := "INSERT INTO transcripts (id, meeting_id, content) VALUES ($1, $2, $3)"
	_, err := r.db.Exec(query, t.ID, t.MeetingID, t.Content)
	if err != nil {
		logger.L.Error("failed to insert transcript", zap.String("transcript_id", t.ID), zap.String("meeting_id", t.MeetingID), zap.Error(err))
		return err
	}
	return nil
}

func (r *Repository) GetTranscript(meetingID string) (*Transcript, error) {
	var t Transcript
	err := r.db.QueryRow("SELECT id, meeting_id, content, created_at FROM transcripts WHERE meeting_id = $1", meetingID).
		Scan(&t.ID, &t.MeetingID, &t.Content, &t.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

// ─── Phase 2 transcript segments (Vexa real-time, per-speaker) ───────────────

// BulkInsertSegments inserts a batch of transcript segments.
// Segments are keyed by (meeting_id, absolute_start_time) — duplicates are ignored.
func (r *Repository) BulkInsertSegments(meetingID string, segments []TranscriptSegment) error {
	if len(segments) == 0 {
		return nil
	}

	// Get the max sequence_id for this meeting to ensure sequence integrity
	var currentSeq int
	err := r.db.QueryRow("SELECT COALESCE(MAX(sequence_id), 0) FROM transcript_segments WHERE meeting_id = $1", meetingID).Scan(&currentSeq)
	if err != nil && err != sql.ErrNoRows {
		logger.L.Error("failed to get max sequence_id", zap.Error(err))
	}

	// Build a single multi-row INSERT with ON CONFLICT DO NOTHING
	vals := make([]string, 0, len(segments))
	args := make([]interface{}, 0, len(segments)*8)
	i := 1
	for _, seg := range segments {
		currentSeq++
		seg.SequenceID = currentSeq

		// Deterministic Checksum: text + start_time
		hashInput := fmt.Sprintf("%s|%d", seg.Text, seg.AbsoluteStartTime.UnixNano())
		hash := sha256.Sum256([]byte(hashInput))
		seg.Checksum = hex.EncodeToString(hash[:])

		vals = append(vals, fmt.Sprintf("($%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d)", i, i+1, i+2, i+3, i+4, i+5, i+6, i+7))
		args = append(args,
			seg.ID, meetingID, seg.Speaker, seg.Text,
			seg.AbsoluteStartTime, seg.AbsoluteEndTime,
			seg.SequenceID, seg.Checksum,
		)
		i += 8
	}

	query := fmt.Sprintf(`
		INSERT INTO transcript_segments
			(id, meeting_id, speaker, text, absolute_start_time, absolute_end_time, sequence_id, checksum)
		VALUES %s
		ON CONFLICT (meeting_id, sequence_id) DO NOTHING`,
		strings.Join(vals, ","))

	_, err = r.db.Exec(query, args...)
	if err != nil {
		logger.L.Error("bulk insert segments failed", zap.String("meeting_id", meetingID), zap.Error(err))
	}
	return err
}

// GetSegments returns all transcript segments for a meeting ordered by start time.
func (r *Repository) GetSegments(meetingID string) ([]TranscriptSegment, error) {
	rows, err := r.db.Query(`
		SELECT id, meeting_id, COALESCE(speaker,'Unknown'), text,
		       absolute_start_time, absolute_end_time, sequence_id, checksum, created_at
		FROM transcript_segments
		WHERE meeting_id = $1
		ORDER BY sequence_id ASC`, meetingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var segs []TranscriptSegment
	for rows.Next() {
		var s TranscriptSegment
		var start, end sql.NullTime
		if err := rows.Scan(&s.ID, &s.MeetingID, &s.Speaker, &s.Text, &start, &end, &s.SequenceID, &s.Checksum, &s.CreatedAt); err != nil {
			return nil, err
		}
		if start.Valid {
			s.AbsoluteStartTime = start.Time
		}
		if end.Valid {
			s.AbsoluteEndTime = end.Time
		}
		segs = append(segs, s)
	}
	return segs, nil
}

// GetSegmentsAfter returns transcript segments for a meeting with a sequence_id greater than lastSeq.
func (r *Repository) GetSegmentsAfter(meetingID string, lastSeq int) ([]TranscriptSegment, error) {
	rows, err := r.db.Query(`
		SELECT id, meeting_id, COALESCE(speaker,'Unknown'), text,
		       absolute_start_time, absolute_end_time, sequence_id, checksum, created_at
		FROM transcript_segments
		WHERE meeting_id = $1 AND sequence_id > $2
		ORDER BY sequence_id ASC`, meetingID, lastSeq)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var segs []TranscriptSegment
	for rows.Next() {
		var s TranscriptSegment
		var start, end sql.NullTime
		if err := rows.Scan(&s.ID, &s.MeetingID, &s.Speaker, &s.Text, &start, &end, &s.SequenceID, &s.Checksum, &s.CreatedAt); err != nil {
			return nil, err
		}
		if start.Valid {
			s.AbsoluteStartTime = start.Time
		}
		if end.Valid {
			s.AbsoluteEndTime = end.Time
		}
		segs = append(segs, s)
	}
	return segs, nil
}

func (r *Repository) CreateSummary(s *Summary) error {
	query := "INSERT INTO summaries (id, meeting_id, summary_json) VALUES ($1, $2, $3)"
	_, err := r.db.Exec(query, s.ID, s.MeetingID, s.SummaryJSON)
	if err != nil {
		logger.L.Error("failed to insert summary", zap.String("summary_id", s.ID), zap.String("meeting_id", s.MeetingID), zap.Error(err))
		return err
	}
	return nil
}

func (r *Repository) GetSummary(meetingID string) (*Summary, error) {
	var s Summary
	err := r.db.QueryRow("SELECT id, meeting_id, summary_json, created_at FROM summaries WHERE meeting_id = $1", meetingID).
		Scan(&s.ID, &s.MeetingID, &s.SummaryJSON, &s.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *Repository) SaveMeetingIntelligence(meetingID string, summary *ai.MeetingSummary) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Upsert summary text — unique constraint on meeting_id prevents duplicates
	_, err = tx.Exec(`
		INSERT INTO summaries (id, meeting_id, summary_text)
		VALUES ($1, $2, $3)
		ON CONFLICT (meeting_id) DO UPDATE SET summary_text = EXCLUDED.summary_text`,
		uuid.New().String(), meetingID, summary.Summary)
	if err != nil {
		return err
	}

	// 2. Replace action items (delete + re-insert to avoid stale rows on re-run)
	if _, err = tx.Exec(`DELETE FROM action_items WHERE meeting_id = $1`, meetingID); err != nil {
		return err
	}
	for _, item := range summary.ActionItems {
		if _, err = tx.Exec(`
			INSERT INTO action_items (id, meeting_id, task, owner) VALUES ($1, $2, $3, $4)`,
			uuid.New().String(), meetingID, item.Task, item.Owner); err != nil {
			return err
		}
	}

	// 3. Replace decisions
	if _, err = tx.Exec(`DELETE FROM decisions WHERE meeting_id = $1`, meetingID); err != nil {
		return err
	}
	for _, dec := range summary.Decisions {
		if _, err = tx.Exec(`
			INSERT INTO decisions (id, meeting_id, decision_text) VALUES ($1, $2, $3)`,
			uuid.New().String(), meetingID, dec); err != nil {
			return err
		}
	}

	// 4. Replace key points
	if _, err = tx.Exec(`DELETE FROM key_points WHERE meeting_id = $1`, meetingID); err != nil {
		return err
	}
	for _, kp := range summary.KeyPoints {
		if _, err = tx.Exec(`
			INSERT INTO key_points (id, meeting_id, point_text) VALUES ($1, $2, $3)`,
			uuid.New().String(), meetingID, kp); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *Repository) GetMeetingIntelligence(meetingID string) (*ai.MeetingSummary, error) {
	var result ai.MeetingSummary

	// 1. Get summary text (or fallback to legacy summary_json)
	var summaryText sql.NullString
	var summaryJSON sql.NullString
	err := r.db.QueryRow("SELECT summary_text, summary_json FROM summaries WHERE meeting_id = $1 ORDER BY created_at DESC LIMIT 1", meetingID).
		Scan(&summaryText, &summaryJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not ready yet
		}
		return nil, err
	}

	if summaryText.Valid && summaryText.String != "" {
		result.Summary = summaryText.String
	} else if summaryJSON.Valid && summaryJSON.String != "" {
		// Legacy phase 1 parsing (just fill the summary field)
		var legacy map[string]interface{}
		if err := json.Unmarshal([]byte(summaryJSON.String), &legacy); err == nil {
			if overview, ok := legacy["overview"].(string); ok {
				result.Summary = overview
			}
		}
	}

	// 2. Get action items
	rows, err := r.db.Query("SELECT task, COALESCE(owner,'') FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var ai ai.ActionItem
			if err := rows.Scan(&ai.Task, &ai.Owner); err == nil {
				result.ActionItems = append(result.ActionItems, ai)
			}
		}
		rows.Close()
	}

	// 3. Get decisions
	rows, err = r.db.Query("SELECT decision_text FROM decisions WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var d string
			if err := rows.Scan(&d); err == nil {
				result.Decisions = append(result.Decisions, d)
			}
		}
		rows.Close()
	}

	// 4. Get key points
	rows, err = r.db.Query("SELECT point_text FROM key_points WHERE meeting_id = $1 ORDER BY created_at ASC", meetingID)
	if err == nil {
		for rows.Next() {
			var kp string
			if err := rows.Scan(&kp); err == nil {
				result.KeyPoints = append(result.KeyPoints, kp)
			}
		}
		rows.Close()
	}

	// 5. Participants — distinct speakers from transcript segments
	pRows, err := r.db.Query(`
		SELECT DISTINCT COALESCE(speaker, 'Unknown')
		FROM transcript_segments
		WHERE meeting_id = $1
		ORDER BY 1`, meetingID)
	if err == nil {
		for pRows.Next() {
			var speaker string
			if err := pRows.Scan(&speaker); err == nil {
				result.Participants = append(result.Participants, speaker)
			}
		}
		pRows.Close()
	}

	// 6. Timeline — first 20 segments as a lightweight event log
	tRows, err := r.db.Query(`
		SELECT COALESCE(speaker, 'Unknown'), text, absolute_start_time
		FROM transcript_segments
		WHERE meeting_id = $1
		ORDER BY sequence_id ASC
		LIMIT 20`, meetingID)
	if err == nil {
		for tRows.Next() {
			var speaker, text string
			var startTime sql.NullTime
			if err := tRows.Scan(&speaker, &text, &startTime); err == nil {
				snippet := text
				if len(snippet) > 80 {
					snippet = snippet[:80]
				}
				timeStr := ""
				if startTime.Valid {
					timeStr = startTime.Time.Format("15:04:05")
				}
				result.Timeline = append(result.Timeline, ai.TimelineEvent{
					Time:  timeStr,
					Event: speaker + ": " + snippet,
				})
			}
		}
		tRows.Close()
	}

	return &result, nil
}

// DB exposes the underlying connection pool for internal (worker) use only.
func (r *Repository) DB() *sql.DB { return r.db }

// GetMeetingByID returns a meeting by ID without requiring a user_id check.
// Intended for internal/worker usage where ownership is already established.
func (r *Repository) GetMeetingByID(id string) (*Meeting, error) {
	var m Meeting
	err := r.db.QueryRow(`
		SELECT id, COALESCE(audio_url,''), COALESCE(meeting_url,''),
		       COALESCE(native_meeting_id,''), status,
		       COALESCE(meeting_type,'general'), created_at,
		       COALESCE(updated_at, created_at)
		FROM meetings WHERE id = $1`, id).
		Scan(&m.ID, &m.AudioURL, &m.MeetingURL, &m.NativeMeetingID, &m.Status,
			&m.MeetingType, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// NullTime helper for nullable timestamp scans
type NullTime struct {
	Time  time.Time
	Valid bool
}
