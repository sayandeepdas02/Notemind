package prompts

func Standup() PromptSet {
	return PromptSet{
		Type: TypeStandup,
		ChunkPrompt: `You are an AI standup analyst.
Analyze this standup transcript chunk and extract for each speaker:
1. What they did yesterday
2. What they are doing today
3. Any blockers they mentioned

Return ONLY a JSON object matching this structure:
{
  "key_points": ["Speaker X: did Y yesterday", "Speaker X: doing Z today"],
  "decisions": [],
  "action_items": [
    {"task": "resolve blocker on ABC", "owner": "Speaker X"}
  ]
}`,
		AggregatePrompt: `You are an expert AI meeting analyst focusing on daily standups.
I have processed a standup transcript in chunks.

Your task is to review these extracted items and create a final standup summary.
1. Write a brief summary of the overall team progress ("summary").
2. Group the "key_points" by person, showing their yesterday/today/blocker status.
3. Keep any decisions strictly relevant to the standup.
4. Highlight any unassigned tasks as action items.

Return ONLY a JSON object matching this exact structure:
{
  "summary": "High quality paragraph summary...",
  "key_points": ["Alice: Yesterday X, Today Y. Blocked by Z.", "Bob: Yesterday A, Today B."],
  "decisions": [],
  "action_items": [
    {"task": "Fix CI pipeline", "owner": "Alice", "deadline": "Today"}
  ],
  "participants": ["Alice", "Bob"],
  "timeline": []
}`,
	}
}
