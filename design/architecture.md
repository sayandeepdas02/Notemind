# System Architecture

## Overview
Notemind relies on an asynchronous event-driven architecture to ingest meeting audio in real time, transcribe it, and subsequently process the transcript for summaries and action items.

## High-Level Pipeline

1. **Scheduling & Trigger:** User schedules a meeting on the dashboard or provides a link.
2. **Ingestion:** The **Meeting Joiner Agent** joins the call via headless bot/SDK and begins streaming raw audio.
3. **Real-time Transcription:** The **Transcriber Agent** receives the audio buffer, converts it to text, and streams it to the frontend via WebSockets for live captions.
4. **Post-Processing (Async):**
   - Once the meeting concludes, a `meeting_ended` event is published to Kafka/Redis.
   - The **Summarizer Agent** and **Action Item Extractor** consume the final transcript in parallel.
5. **Storage & Embedding:** Outputs are saved to a primary relational database (Postgres) and embedded into a Vector DB for semantic search by the **Memory Agent**.
6. **Delivery:** The Next.js UI queries the backend to display the final processed meeting page.

## Infrastructure Stack
- **Frontend:** Next.js (App Router), TailwindCSS, WebSockets.
- **Backend:** Golang microservices.
- **Message Broker:** Kafka or Redis Streams (handles high-throughput audio and event pub/sub).
- **Primary DB:** PostgreSQL (stores meeting metadata, transcripts, users).
- **Vector DB:** pgvector (co-located with Postgres for simplicity) or Pinecone.
- **AI Models:** Deepgram/Whisper (Audio), OpenAI/Claude (Text Generation).
