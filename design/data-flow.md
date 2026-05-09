# Data Flow & Memory Architecture

## Real-time Flow
1. **Audio Byte Stream:** Captured at 16kHz/16-bit PCM.
2. **Transcript Chunks:** Converted to text strings + metadata (timestamp, speaker) every few hundred milliseconds.

## Async Data Flow
1. **Transcript Compilation:** Once the stream ends, the Transcription Service compiles all chunks into a unified JSON document.
2. **LLM Processing:** 
   - `full_transcript` -> Prompt Template -> LLM API -> JSON Output.
   - JSON is parsed to extract `summary`, `action_items`, and `decisions`.

## Memory & Embeddings Strategy
To enable RAG (Retrieval-Augmented Generation) and semantic search:

### Chunking Strategy
- Transcripts are too long to embed directly. They are chunked semantically.
- **Strategy:** Chunk by speaker turns or fixed token limits (e.g., 512 tokens) with a 50-token overlap to preserve context boundaries.

### Embedding Storage
- Each chunk is passed to an embedding model (e.g., OpenAI `text-embedding-3-small`).
- The resulting vector (e.g., 1536 dimensions) is stored in the Vector DB.
- **Metadata attached to vector:** `meeting_id`, `speaker`, `timestamp_start`, `timestamp_end`.

### Retrieval Flow
1. User searches: *"What did Sarah say about the Q3 marketing budget?"*
2. Search query is embedded into a vector.
3. Vector DB performs a cosine similarity search against stored transcript chunks.
4. Top K matching chunks are retrieved.
5. Chunks are passed to an LLM as context to answer the user's question, citing the specific meeting and timestamp.
