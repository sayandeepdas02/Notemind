package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"notemind/internal/db"
)

// Repository handles database operations for memory vectors and chat.
type Repository struct{}

func NewRepository() *Repository {
	return &Repository{}
}

// float32SliceToVectorFormat converts a float32 slice into a string format required by pgvector
// e.g. [1.1, 2.2] -> "[1.1,2.2]"
func float32SliceToVectorFormat(vec []float32) string {
	b := strings.Builder{}
	b.WriteString("[")
	for i, v := range vec {
		if i > 0 {
			b.WriteString(",")
		}
		b.WriteString(fmt.Sprintf("%f", v))
	}
	b.WriteString("]")
	return b.String()
}

// UpsertChunks inserts a batch of embedding chunks. Skips existing ones based on checksum.
func (r *Repository) UpsertChunks(ctx context.Context, chunks []EmbeddingChunk) error {
	if len(chunks) == 0 {
		return nil
	}

	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO embedding_chunks (
			id, meeting_id, segment_ids, content, speaker, start_time, end_time, embedding, model, checksum
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::vector, $8, $9
		) ON CONFLICT (meeting_id, checksum) DO NOTHING
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, c := range chunks {
		vecStr := float32SliceToVectorFormat(c.Embedding)
		var startTime, endTime interface{}
		if !c.StartTime.IsZero() {
			startTime = c.StartTime
		}
		if !c.EndTime.IsZero() {
			endTime = c.EndTime
		}

		_, err := stmt.ExecContext(ctx,
			c.MeetingID, pq.Array(c.SegmentIDs), c.Content, c.Speaker,
			startTime, endTime, vecStr, c.Model, c.Checksum,
		)
		if err != nil {
			return fmt.Errorf("failed to insert chunk: %w", err)
		}
	}

	return tx.Commit()
}

// SimilaritySearch performs a vector similarity search using cosine distance.
// Higher score = more similar.
func (r *Repository) SimilaritySearch(ctx context.Context, userID string, embedding []float32, limit int, filters SearchFilters) ([]SearchResult, error) {
	vecStr := float32SliceToVectorFormat(embedding)

	// Build dynamic query
	baseQ := `
		SELECT 
			c.id, c.meeting_id, c.segment_ids, c.content, c.speaker, 
			c.start_time, c.end_time, c.model, c.checksum,
			1 - (c.embedding <=> $1::vector) AS score,
			m.id, COALESCE(m.meeting_url,''), c.created_at
		FROM embedding_chunks c
		JOIN meetings m ON m.id = c.meeting_id
		WHERE m.user_id = $2
	`
	args := []interface{}{vecStr, userID}
	argIdx := 3

	if filters.MeetingID != "" {
		baseQ += " AND c.meeting_id = $" + itoa(argIdx)
		args = append(args, filters.MeetingID)
		argIdx++
	}
	if filters.Participant != "" {
		// Could join with speaker_profiles or just filter on c.speaker
		baseQ += " AND c.speaker ILIKE $" + itoa(argIdx)
		args = append(args, "%"+filters.Participant+"%")
		argIdx++
	}
	if !filters.FromDate.IsZero() {
		baseQ += " AND m.created_at >= $" + itoa(argIdx)
		args = append(args, filters.FromDate)
		argIdx++
	}
	if !filters.ToDate.IsZero() {
		baseQ += " AND m.created_at <= $" + itoa(argIdx)
		args = append(args, filters.ToDate)
		argIdx++
	}

	// Order by closest distance (smallest <=> value), meaning highest similarity
	baseQ += " ORDER BY c.embedding <=> $1::vector LIMIT $" + itoa(argIdx)
	args = append(args, limit)

	rows, err := db.DB.QueryContext(ctx, baseQ, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		var c EmbeddingChunk
		var startTime, endTime sql.NullTime
		var segIDs []string

		if err := rows.Scan(
			&c.ID, &c.MeetingID, pq.Array(&segIDs), &c.Content, &c.Speaker,
			&startTime, &endTime, &c.Model, &c.Checksum,
			&r.Score, &r.MeetingID, &r.MeetingURL, &r.CreatedAt,
		); err != nil {
			return nil, err
		}

		c.SegmentIDs = segIDs
		if startTime.Valid {
			c.StartTime = startTime.Time
		}
		if endTime.Valid {
			c.EndTime = endTime.Time
		}
		r.Chunk = c
		results = append(results, r)
	}
	return results, nil
}

// SaveChatMessage saves a single chat turn to the database.
func (r *Repository) SaveChatMessage(ctx context.Context, msg ChatMessage) error {
	var citationsJSON []byte
	if len(msg.Citations) > 0 {
		var err error
		citationsJSON, err = json.Marshal(msg.Citations)
		if err != nil {
			return err
		}
	} else {
		citationsJSON = []byte("[]")
	}

	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO ai_chat_messages (
			id, user_id, session_id, meeting_id, role, content, citations, input_tokens, output_tokens, model
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`, msg.UserID, msg.SessionID, msg.MeetingID, msg.Role, msg.Content, string(citationsJSON), msg.InputTokens, msg.OutputTokens, msg.Model)

	return err
}

// GetChatHistory fetches chat history for a session.
func (r *Repository) GetChatHistory(ctx context.Context, sessionID, userID string, limit int) ([]ChatMessage, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, user_id, session_id, meeting_id, role, content, citations, input_tokens, output_tokens, model, created_at
		FROM ai_chat_messages
		WHERE session_id = $1 AND user_id = $2
		ORDER BY created_at ASC
		LIMIT $3
	`, sessionID, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []ChatMessage
	for rows.Next() {
		var m ChatMessage
		var citationsJSON []byte
		var meetingID sql.NullString
		var model sql.NullString

		if err := rows.Scan(
			&m.ID, &m.UserID, &m.SessionID, &meetingID, &m.Role, &m.Content, &citationsJSON,
			&m.InputTokens, &m.OutputTokens, &model, &m.CreatedAt,
		); err != nil {
			return nil, err
		}

		if meetingID.Valid {
			m.MeetingID = &meetingID.String
		}
		if model.Valid {
			m.Model = model.String
		}
		if len(citationsJSON) > 0 && string(citationsJSON) != "null" {
			_ = json.Unmarshal(citationsJSON, &m.Citations)
		}

		messages = append(messages, m)
	}
	return messages, nil
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}
