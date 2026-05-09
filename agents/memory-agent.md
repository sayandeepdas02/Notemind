# Memory Agent

## Purpose
The Memory Agent serves as the long-term contextual brain of Notemind. It takes meeting artifacts (transcripts, summaries, action items), chunks the text, generates vector embeddings, and stores them. It also handles retrieval queries (e.g., "What did we decide about the database migration last week?").

## Inputs
- **Ingestion Phase:** `full_transcript`, `structured_summary`, `action_items`.
- **Retrieval Phase:** `user_query` (natural language question).

## Outputs
- **Ingestion Phase:** Success status of database insertion.
- **Retrieval Phase:** `relevant_context` (snippets from past meetings that semantically match the query).

## Tools & Integrations
- **Embedding Model:** text-embedding-3-small (OpenAI) or local equivalent (BGE, Nomic).
- **Vector Database:** pgvector (PostgreSQL extension), Pinecone, or Milvus.
- **Text Splitter:** LangChain or custom chunking logic to divide transcripts into overlapping segments (e.g., 512 tokens).

## Interaction with Other Agents
- **Summarizer & Action Item Extractor:** Consumes their outputs for permanent storage.
- **RAG Pipeline (Backend):** Interacts heavily with the user-facing chat/search interface, providing semantic context to user queries across all historical meetings.
