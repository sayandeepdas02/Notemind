package prompts

// MeetingType represents the classified purpose of the meeting.
type MeetingType string

const (
	TypeGeneral   MeetingType = "general"
	TypeStandup   MeetingType = "standup"
	TypeSales     MeetingType = "sales"
	TypeInterview MeetingType = "interview"
	TypePlanning  MeetingType = "planning"
)

// PromptSet holds the prompts required for the summarization pipeline.
type PromptSet struct {
	Type            MeetingType
	ChunkPrompt     string
	AggregatePrompt string
}

// Registry provides the correct PromptSet based on meeting type.
type Registry struct {
	prompts map[MeetingType]PromptSet
}

func NewRegistry() *Registry {
	r := &Registry{
		prompts: make(map[MeetingType]PromptSet),
	}
	r.register(General())
	r.register(Standup())
	// r.register(Sales())
	// r.register(Interview())
	return r
}

func (r *Registry) register(p PromptSet) {
	r.prompts[p.Type] = p
}

// Get returns the prompt set for the given type. Falls back to General.
func (r *Registry) Get(mt MeetingType) PromptSet {
	if p, ok := r.prompts[mt]; ok {
		return p
	}
	return r.prompts[TypeGeneral]
}
