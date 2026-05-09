package memory

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"notemind/internal/meeting"
)

// SemanticChunker groups transcript segments into sliding windows.
type SemanticChunker struct {
	MaxTokens int // e.g. 300
	Overlap   int // e.g. 50
}

func NewSemanticChunker(maxTokens, overlap int) *SemanticChunker {
	return &SemanticChunker{
		MaxTokens: maxTokens,
		Overlap:   overlap,
	}
}

// roughTokenCount estimates tokens by dividing character count by 4.
func roughTokenCount(s string) int {
	return len(s) / 4
}

// Chunk builds overlapping windows of segments for embedding.
func (c *SemanticChunker) Chunk(meetingID string, segments []meeting.TranscriptSegment) []EmbeddingChunk {
	if len(segments) == 0 {
		return nil
	}

	var chunks []EmbeddingChunk
	var currentWindow []meeting.TranscriptSegment
	currentTokens := 0

	flush := func() {
		if len(currentWindow) == 0 {
			return
		}

		var sb strings.Builder
		var segIDs []string
		speakers := make(map[string]int)

		for _, s := range currentWindow {
			segIDs = append(segIDs, s.ID)
			speakers[s.Speaker]++
			if !s.AbsoluteStartTime.IsZero() {
				sb.WriteString(fmt.Sprintf("[%s] %s: %s\n", s.AbsoluteStartTime.Format("15:04:05"), s.Speaker, s.Text))
			} else {
				sb.WriteString(fmt.Sprintf("%s: %s\n", s.Speaker, s.Text))
			}
		}

		content := strings.TrimSpace(sb.String())
		if content == "" {
			return
		}

		// Determine dominant speaker
		maxCount := 0
		dominantSpeaker := "Unknown"
		for spk, count := range speakers {
			if count > maxCount {
				maxCount = count
				dominantSpeaker = spk
			}
		}

		// Calculate checksum for idempotency
		hash := sha256.Sum256([]byte(content))
		checksum := hex.EncodeToString(hash[:])

		chunks = append(chunks, EmbeddingChunk{
			MeetingID:  meetingID,
			SegmentIDs: segIDs,
			Content:    content,
			Speaker:    dominantSpeaker,
			StartTime:  currentWindow[0].AbsoluteStartTime,
			EndTime:    currentWindow[len(currentWindow)-1].AbsoluteEndTime,
			Checksum:   checksum,
		})

		// Slide window: keep the last N segments that fit within Overlap tokens
		var nextWindow []meeting.TranscriptSegment
		nextTokens := 0
		for i := len(currentWindow) - 1; i >= 0; i-- {
			toks := roughTokenCount(currentWindow[i].Text)
			if nextTokens+toks > c.Overlap {
				break
			}
			// Prepend
			nextWindow = append([]meeting.TranscriptSegment{currentWindow[i]}, nextWindow...)
			nextTokens += toks
		}

		currentWindow = nextWindow
		currentTokens = nextTokens
	}

	for _, seg := range segments {
		toks := roughTokenCount(seg.Text)
		
		// If adding this segment exceeds MaxTokens, flush the current window
		if currentTokens+toks > c.MaxTokens && len(currentWindow) > 0 {
			flush()
		}
		
		currentWindow = append(currentWindow, seg)
		currentTokens += toks
	}

	// Flush whatever is left
	if len(currentWindow) > 0 {
		flush()
	}

	return chunks
}
