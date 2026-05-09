# Summarizer Agent

## Purpose
The Summarizer Agent takes the raw, completed transcript and generates structured, readable meeting summaries. It distills the core discussion points, decisions made, and overall context without losing important details.

## Inputs
- `full_transcript` (document): The entire diarized transcript of the meeting.
- `meeting_metadata` (object): Meeting title, attendees, date, and duration.
- `summary_template` (string): User preferences for summary style (e.g., bullet points, narrative, formal).

## Outputs
- `structured_summary` (object): Contains sections like "Executive Summary", "Key Discussion Points", and "Decisions".

## Tools & Integrations
- **LLM Provider:** OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), or local models (Llama 3).
- **Prompt Templates:** Structured system prompts designed to enforce specific output formats (JSON or Markdown).

## Interaction with Other Agents
- **Transcriber Agent:** Triggered immediately after the Transcriber outputs the `full_transcript`.
- **Memory Agent:** The generated `structured_summary` is passed to the Memory Agent for embedding and long-term storage.
- **Frontend API:** Exposes the summary to the user's dashboard via the Backend services.
