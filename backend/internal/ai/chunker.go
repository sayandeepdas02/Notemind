package ai

import (
	"fmt"
	"strings"
	"time"
)

// ── Types shared across the AI package ──────────────────────────────────────

// RawSegment is the input the chunker works with.
// Defined here to avoid importing internal/meeting (would create a cycle).
type RawSegment struct {
	Speaker           string
	Text              string
	AbsoluteStartTime time.Time
}

// TranscriptChunk is a window of cleaned transcript lines ready for LLM processing.
type TranscriptChunk struct {
	ChunkID  int
	Content  string
	Speakers []string
}

// ChunkAnalysis is the per-chunk LLM output.
type ChunkAnalysis struct {
	KeyPoints   []string     `json:"key_points"`
	Decisions   []string     `json:"decisions"`
	ActionItems []ActionItem `json:"action_items"`
}

// ActionItem is a task extracted from the transcript.
type ActionItem struct {
	Task     string `json:"task"`
	Owner    string `json:"owner"`
	Deadline string `json:"deadline,omitempty"`
}

// TimelineEvent marks a moment in the meeting.
type TimelineEvent struct {
	Time  string `json:"time"`
	Event string `json:"event"`
}

// MeetingSummary is the final structured output stored in the DB.
type MeetingSummary struct {
	Summary      string          `json:"summary"`
	KeyPoints    []string        `json:"key_points"`
	Decisions    []string        `json:"decisions"`
	ActionItems  []ActionItem    `json:"action_items"`
	Participants []string        `json:"participants"`
	Timeline     []TimelineEvent `json:"timeline"`
}

// ── Chunker ──────────────────────────────────────────────────────────────────

const (
	maxTokensPerChunk  = 1400 // ~5600 chars
	shortMergeThreshold = 80  // chars; merge consecutive short lines from same speaker
)

var fillerWords = map[string]bool{
	"uh": true, "um": true, "umm": true, "uhh": true,
	"hmm": true, "er": true, "erm": true,
}

type cleanedLine struct {
	speaker   string
	text      string
	timestamp string
}

// CleanAndChunk cleans transcript segments and splits them into token-bounded chunks.
func CleanAndChunk(segs []RawSegment) []TranscriptChunk {
	return chunkLines(cleanSegments(segs))
}

func cleanSegments(segs []RawSegment) []cleanedLine {
	var lines []cleanedLine
	for _, seg := range segs {
		text := removeFillers(seg.Text)
		if strings.TrimSpace(text) == "" {
			continue
		}
		spk := normalizeSpeaker(seg.Speaker)
		ts := ""
		if !seg.AbsoluteStartTime.IsZero() {
			ts = seg.AbsoluteStartTime.Format("15:04")
		}
		// Merge short consecutive same-speaker lines
		if len(lines) > 0 &&
			lines[len(lines)-1].speaker == spk &&
			len(lines[len(lines)-1].text) < shortMergeThreshold &&
			len(text) < shortMergeThreshold {
			lines[len(lines)-1].text += " " + text
			continue
		}
		lines = append(lines, cleanedLine{speaker: spk, text: text, timestamp: ts})
	}
	return lines
}

func removeFillers(text string) string {
	words := strings.Fields(text)
	out := make([]string, 0, len(words))
	for _, w := range words {
		stripped := strings.ToLower(strings.Trim(w, ".,!?;:"))
		if !fillerWords[stripped] {
			out = append(out, w)
		}
	}
	return strings.TrimSpace(strings.Join(out, " "))
}

func normalizeSpeaker(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "Unknown"
	}
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

func chunkLines(lines []cleanedLine) []TranscriptChunk {
	var chunks []TranscriptChunk
	var cur []cleanedLine
	curTok := 0

	flush := func() {
		if len(cur) == 0 {
			return
		}
		chunks = append(chunks, buildChunk(len(chunks), cur))
		cur = nil
		curTok = 0
	}

	for _, l := range lines {
		tok := len(l.text) / 4
		if curTok+tok > maxTokensPerChunk {
			flush()
		}
		cur = append(cur, l)
		curTok += tok
	}
	flush()
	return chunks
}

func buildChunk(id int, lines []cleanedLine) TranscriptChunk {
	spkSet := map[string]bool{}
	var sb strings.Builder
	for _, l := range lines {
		if l.timestamp != "" {
			sb.WriteString(fmt.Sprintf("[%s] %s: %s\n", l.timestamp, l.speaker, l.text))
		} else {
			sb.WriteString(fmt.Sprintf("%s: %s\n", l.speaker, l.text))
		}
		spkSet[l.speaker] = true
	}
	speakers := make([]string, 0, len(spkSet))
	for s := range spkSet {
		speakers = append(speakers, s)
	}
	return TranscriptChunk{ChunkID: id, Content: sb.String(), Speakers: speakers}
}
