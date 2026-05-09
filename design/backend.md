# Backend Service Design

The Notemind backend is built using Golang, following a microservices architecture to isolate compute-heavy AI tasks from general API traffic. Services communicate via a mix of gRPC (for high-speed internal comms) and Kafka/Redis Streams (for async event processing).

## Core Microservices

### 1. API Gateway / Meeting Service
- **Responsibilities:** User authentication, meeting CRUD operations, fetching meeting history. Acts as the main REST/GraphQL endpoint for the Next.js frontend.
- **Scaling:** High request volume, scales horizontally. Stateless.

### 2. Recording Service
- **Responsibilities:** Manages the lifecycle of the Meeting Joiner Agent. Initiates the bot instances, monitors their health, and acts as the entry point for the audio stream.
- **Scaling:** CPU-intensive if running headless browsers. Usually deployed on specialized worker nodes.

### 3. Transcription Service
- **Responsibilities:** Interfaces with Deepgram/Whisper. Receives the stream from the Recording Service, processes diarization, and broadcasts transcript chunks.
- **Communication:** Sends real-time text to the WebSocket Service and stores the final transcript in Postgres.

### 4. Intelligence Service (Summarization & Extraction)
- **Responsibilities:** Orchestrates the LLM calls for the Summarizer and Action Item Extractor agents. Triggered by a `meeting_ended` event.
- **Communication:** Consumes from the event queue to prevent dropping requests during traffic spikes.

### 5. Memory & Search Service
- **Responsibilities:** Handles document chunking and interfaces with the Vector DB (pgvector). Exposes a RAG (Retrieval-Augmented Generation) endpoint for querying past meetings.

### 6. WebSocket / Notification Service
- **Responsibilities:** Maintains persistent connections with the Next.js frontend. Pushes live transcript chunks and notification events ("Summary is ready").

## Communication Pattern
- **Synchronous:** Next.js UI -> API Gateway (REST/HTTP).
- **Asynchronous/Events:** Services -> Kafka -> Intelligence Service.
- **Streaming:** Recording Service -> Transcription Service -> WebSocket Service (gRPC streams).
