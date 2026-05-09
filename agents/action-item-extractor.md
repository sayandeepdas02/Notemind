# Action Item Extractor Agent

## Purpose
This agent specializes in identifying commitments, tasks, and follow-ups discussed during the meeting. It parses the transcript to pull out actionable items, assignees, and implicit or explicit deadlines.

## Inputs
- `full_transcript` (document): The diarized text of the meeting.
- `meeting_attendees` (list): Known participants to aid in name matching for assignees.

## Outputs
- `action_items` (list of objects): Each item contains `description`, `assignee`, `due_date`, and `context_snippet` (the exact quote from the meeting).

## Tools & Integrations
- **LLM Provider:** Fine-tuned or heavily prompted models (like Claude 3.5 Sonnet) specifically designed for extraction tasks over generation.
- **Date Parser:** A utility to convert relative dates spoken in the meeting ("next Tuesday") into absolute dates.

## Interaction with Other Agents
- **Transcriber Agent:** Receives the transcript in parallel with the Summarizer Agent.
- **Notification Service:** Can trigger alerts or sync with external task managers (e.g., Jira, Notion, Linear) via the backend once action items are approved.
- **Memory Agent:** Action items are embedded and stored alongside the meeting record.
