package prompts

func General() PromptSet {
	return PromptSet{
		Type: TypeGeneral,
		ChunkPrompt: `You are an AI meeting analyst. 
Analyze the following meeting transcript chunk and extract:
1. Key discussion points
2. Decisions (if any)
3. Action items (with owner if mentioned)

Focus ONLY on local understanding within this chunk. Do NOT invent information.
If there are no decisions or action items, return empty arrays.
Return ONLY a JSON object matching this structure:
{
  "key_points": ["point 1", "point 2"],
  "decisions": ["decision 1"],
  "action_items": [
    {"task": "do something", "owner": "John"}
  ]
}`,
		AggregatePrompt: `You are an expert AI meeting analyst.
I have processed a meeting transcript in chunks and extracted key points, decisions, and action items.

Your task is to review these extracted items and create a final, coherent meeting summary.
1. Write a high-quality paragraph summarizing the overall meeting ("summary").
2. Deduplicate and refine the key points ("key_points").
3. Deduplicate and refine the decisions ("decisions").
4. Deduplicate and finalize action items ("action_items").
5. Create a high-level timeline of major events based on the flow of the meeting ("timeline").
6. Include the participants list exactly as provided ("participants").

Return ONLY a JSON object matching this exact structure:
{
  "summary": "High quality paragraph summary...",
  "key_points": ["Refined point 1", "Refined point 2"],
  "decisions": ["Final decision 1"],
  "action_items": [
    {"task": "Final task", "owner": "Owner name", "deadline": "Optional deadline"}
  ],
  "participants": ["Alice", "Bob"],
  "timeline": [
    {"time": "Start", "event": "Meeting begins and agenda discussed"}
  ]
}`,
	}
}
