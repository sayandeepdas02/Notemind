# Meeting Joiner Agent

## Purpose
The Meeting Joiner Agent acts as the entry point for real-time meeting ingestion. It connects to virtual meeting platforms (Google Meet, Zoom, Microsoft Teams) either through calendar integration or manual link submission, records the raw audio, and securely pipes the audio stream to the transcription service.

## Inputs
- `meeting_url` (string): The URL of the meeting.
- `platform` (string): The detected platform (e.g., `zoom`, `meet`).
- `schedule_time` (datetime): When the bot should join.
- `metadata` (object): Meeting title, participants list from calendar.

## Outputs
- `audio_stream` (WebRTC / gRPC stream): The live audio buffer being captured.
- `meeting_status` (event): Status updates (e.g., `joined`, `waiting_in_lobby`, `recording`, `ended`).

## Tools & Integrations
- **Headless Browser / Bot Framework:** Playwright or Puppeteer for navigating web-based clients (if not using an official API like Zoom SDK or Recall.ai).
- **Audio Capture:** Virtual audio drivers or WebRTC interception.
- **Message Broker:** Kafka / Redis Streams to publish `audio_stream` chunks.

## Interaction with Other Agents
- **Transcriber Agent:** Pipes the `audio_stream` directly to the Transcriber Agent for real-time speech-to-text.
- **Notification Service:** Emits `meeting_status` events to alert the user via the frontend (e.g., "Bot is waiting in lobby").
