package meeting

import "testing"

func TestCanTransition(t *testing.T) {
	cases := []struct {
		from MeetingState
		to   MeetingState
		want bool
	}{
		// Phase 2 (live meeting) happy-path lifecycle
		{StateCreated, StateJoining, true},
		{StateJoining, StateWaitingForAdmission, true},
		{StateJoining, StateAdmitted, true},
		{StateAdmitted, StateRecording, true},
		{StateRecording, StateTranscribing, true},
		{StateTranscribing, StateEnded, true},
		{StateRecording, StateEnded, true},

		// Phase 1 (audio upload) happy-path lifecycle
		{StateCreated, StateTranscribing, true},

		// Failure paths
		{StateCreated, StateFailed, true},
		{StateJoining, StateFailed, true},
		{StateRecording, StateFailed, true},

		// Terminal states must reject further transitions
		{StateEnded, StateCreated, false},
		{StateEnded, StateRecording, false},
		{StateFailed, StateRecording, false},
		{StateFailed, StateEnded, false},

		// Reconnection loop
		{StateRecording, StateReconnecting, true},
		{StateReconnecting, StateRecording, true},
		{StateReconnecting, StateFailed, true},

		// Denial
		{StateJoining, StateDenied, true},
		{StateDenied, StateReconnecting, true},

		// No-op (same→same) is always valid
		{StateRecording, StateRecording, true},
		{StateEnded, StateEnded, true},

		// Legacy lowercase strings must NOT be accepted as valid states
		{MeetingState("pending"), StateCreated, false},
		{MeetingState("live"), StateEnded, false},
		{MeetingState("ended"), StateFailed, false},
	}

	for _, tc := range cases {
		got := CanTransition(tc.from, tc.to)
		if got != tc.want {
			t.Errorf("CanTransition(%q → %q) = %v, want %v", tc.from, tc.to, got, tc.want)
		}
	}
}

func TestAllStateConstantsAreUppercase(t *testing.T) {
	states := []MeetingState{
		StateCreated, StateScheduled, StateJoining, StateWaitingForAdmission,
		StateAdmitted, StateRecording, StateTranscribing, StateReconnecting,
		StateDisconnected, StateDenied, StateFailed, StateEnded,
	}
	for _, s := range states {
		for _, ch := range string(s) {
			if ch >= 'a' && ch <= 'z' {
				t.Errorf("state constant %q contains lowercase character %q — DB enum requires uppercase", s, ch)
			}
		}
	}
}
