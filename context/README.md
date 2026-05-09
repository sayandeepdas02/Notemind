# Context Directory

This directory is reserved for local testing and schema definitions related to the Memory Agent and Vector Database.

## Usage
- **Mocks:** Store mock transcripts or JSON responses here to test the intelligence services locally without hitting external APIs.
- **Schemas:** Define the JSON schemas for the structured outputs (e.g., `action_item_schema.json`, `summary_schema.json`).
- **Prompts:** Store the master prompt templates used by the LLM agents if they are not hardcoded into the Go binaries.
