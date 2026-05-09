# Transcriber Agent

## Purpose
The Transcriber Agent processes raw audio streams and converts them into accurate text transcripts with speaker diarization (identifying who is speaking). It operates in near real-time to power the live dashboard and saves the final transcript for post-meeting processing.

## Inputs
- `audio_stream` (buffer): Incoming audio chunks from the Meeting Joiner.
- `language_hints` (array): Expected languages or specialized vocabulary for better accuracy.

## Outputs
- `transcript_chunk` (object): Incremental text, speaker ID, and timestamp.
- `full_transcript` (document): The complete compiled transcript upon meeting conclusion.

## Tools & Integrations
- **Speech-to-Text Engine:** Deepgram (for ultra-fast streaming capabilities) or Whisper (for highly accurate asynchronous processing).
- **Diarization Module:** Built-in to Deepgram/Whisper to separate speakers (e.g., Speaker A, Speaker B).
- **Queue/Stream:** Kafka / WebSockets to stream `transcript_chunk` to the frontend and backend.

## Interaction with Other Agents
- **Meeting Joiner:** Consumes audio directly from this agent.
- **Summarizer & Action Item Extractor:** Once the meeting ends, the `full_transcript` is passed to these agents.
- **Frontend UI:** Streams `transcript_chunk` via WebSockets for real-time live captions.
