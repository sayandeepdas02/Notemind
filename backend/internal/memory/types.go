package memory

import (
	"time"
)

// EmbeddingChunk is a semantic window of transcript text, vectorized for search.
type EmbeddingChunk struct {
	ID         string
	MeetingID  string
	SegmentIDs []string  // References to the source transcript segments
	Content    string    // The exact text that was embedded
	Speaker    string
	StartTime  time.Time
	EndTime    time.Time
	Embedding  []float32 // 1536-dimensional vector for text-embedding-3-small
	Model      string    // The model used to generate the embedding
	Checksum   string    // SHA256 of the content to prevent duplicate embeddings
}

// SearchFilters restricts semantic search results.
type SearchFilters struct {
	MeetingID   string
	Participant string
	FromDate    time.Time
	ToDate      time.Time
}

// SearchResult is a chunk matched via vector similarity.
type SearchResult struct {
	Chunk      EmbeddingChunk
	Score      float64   // Cosine similarity (0 to 1, higher is better)
	MeetingID  string
	MeetingURL string
	CreatedAt  time.Time
}

// Citation links an LLM response to a specific source transcript chunk.
type Citation struct {
	MeetingID string  `json:"meeting_id"`
	StartTime string  `json:"start_time"`
	Speaker   string  `json:"speaker"`
	Text      string  `json:"text"`
	Score     float64 `json:"score"`
}

// ChatMessage represents a single turn in an AI chat session.
type ChatMessage struct {
	ID           string     `json:"id"`
	UserID       string     `json:"user_id"`
	SessionID    string     `json:"session_id"`
	MeetingID    *string    `json:"meeting_id,omitempty"` // nil means workspace-wide scope
	Role         string     `json:"role"`                 // 'user' or 'assistant'
	Content      string     `json:"content"`
	Citations    []Citation `json:"citations,omitempty"`
	InputTokens  int        `json:"input_tokens,omitempty"`
	OutputTokens int        `json:"output_tokens,omitempty"`
	Model        string     `json:"model,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}
