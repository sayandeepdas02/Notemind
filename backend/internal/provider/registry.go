package provider

import (
	"fmt"
	"strings"
	"sync"
)

// Registry holds all registered MeetingProvider implementations
// and selects the right one for a given meeting URL.
type Registry struct {
	mu        sync.RWMutex
	providers []MeetingProvider
}

// NewRegistry creates an empty provider registry.
func NewRegistry() *Registry {
	return &Registry{}
}

// Register adds a provider to the registry.
// Providers are checked in registration order, so register more specific
// URL patterns first (e.g. Zoom before a generic fallback).
func (r *Registry) Register(p MeetingProvider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers = append(r.providers, p)
}

// Detect returns the first provider that claims the given meeting URL.
// Returns an error if no provider matches.
func (r *Registry) Detect(meetingURL string) (MeetingProvider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	lowerURL := strings.ToLower(meetingURL)
	for _, p := range r.providers {
		if p.DetectMeetingURL(lowerURL) {
			return p, nil
		}
	}
	return nil, fmt.Errorf("no meeting provider found for URL: %s", meetingURL)
}

// ByName returns a provider by its Name(). Used for explicit provider selection.
func (r *Registry) ByName(name string) (MeetingProvider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, p := range r.providers {
		if p.Name() == name {
			return p, nil
		}
	}
	return nil, fmt.Errorf("provider not registered: %s", name)
}

// All returns all registered providers.
func (r *Registry) All() []MeetingProvider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]MeetingProvider, len(r.providers))
	copy(out, r.providers)
	return out
}
