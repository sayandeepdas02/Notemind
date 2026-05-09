package meeting

import (
	"encoding/json"
	"fmt"
	"sync"
)

// SSEEvent is sent over the wire to browser clients.
type SSEEvent struct {
	ID   string      `json:"-"`    // Added for SSE id: field
	Type string      `json:"type"` // "segments" | "status"
	Data interface{} `json:"data"`
}

// subscriber holds a single browser SSE connection's channel.
type subscriber struct {
	ch chan SSEEvent
}

// Hub is an in-memory pub/sub bus that fans out new transcript segments
// and status changes to all active SSE connections for a given meeting.
// It is safe for concurrent use.
type Hub struct {
	mu   sync.RWMutex
	subs map[string][]*subscriber // meetingID → []subscriber
}

// NewHub creates the global SSE hub.
func NewHub() *Hub {
	return &Hub{
		subs: make(map[string][]*subscriber),
	}
}

// Subscribe registers a new SSE subscriber for the given meeting ID.
// Returns a channel that receives SSEEvents and a cancel function to
// unsubscribe. The caller must call cancel() when the HTTP connection closes.
func (h *Hub) Subscribe(meetingID string) (<-chan SSEEvent, func()) {
	sub := &subscriber{ch: make(chan SSEEvent, 64)}

	h.mu.Lock()
	h.subs[meetingID] = append(h.subs[meetingID], sub)
	h.mu.Unlock()

	cancel := func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		list := h.subs[meetingID]
		for i, s := range list {
			if s == sub {
				h.subs[meetingID] = append(list[:i], list[i+1:]...)
				break
			}
		}
		close(sub.ch)
	}

	return sub.ch, cancel
}

// PublishSegments fans out new transcript segments to all subscribers.
func (h *Hub) PublishSegments(meetingID string, segments []TranscriptSegment) {
	if len(segments) == 0 {
		return
	}
	// Use the highest sequence ID as the event ID
	highestSeq := segments[len(segments)-1].SequenceID
	h.publish(meetingID, SSEEvent{
		ID:   fmt.Sprintf("%d", highestSeq),
		Type: "segments",
		Data: segments,
	})
}

// PublishStatus fans out a status change (e.g. "live", "ended", "failed").
func (h *Hub) PublishStatus(meetingID string, status string) {
	h.publish(meetingID, SSEEvent{Type: "status", Data: map[string]string{"status": status}})
}

func (h *Hub) publish(meetingID string, evt SSEEvent) {
	h.mu.RLock()
	subs := h.subs[meetingID]
	h.mu.RUnlock()

	for _, sub := range subs {
		// Non-blocking send — drop if the channel buffer is full
		select {
		case sub.ch <- evt:
		default:
		}
	}
}

// MarshalSSE serialises an SSEEvent to Server-Sent Events wire format.
func MarshalSSE(evt SSEEvent) ([]byte, error) {
	data, err := json.Marshal(evt)
	if err != nil {
		return nil, err
	}
	
	var out []byte
	if evt.ID != "" {
		out = append(out, []byte("id: "+evt.ID+"\n")...)
	}
	out = append(out, []byte("data: ")...)
	out = append(out, data...)
	out = append(out, '\n', '\n')
	return out, nil
}
