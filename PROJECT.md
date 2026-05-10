# Notemind Project Documentation

This is a living engineering document detailing the architecture, flows, and implementation status of Notemind, an enterprise-grade AI meeting SaaS platform.

## 1. Product Vision & Execution Standards

Notemind is designed as a complete connected operating system for meetings, memory, and collaboration. It is not just a tool; it is an intelligent extension of the user's workflow.

### UX/UI Standards
The UI must feel intentionally designed, competing with **Linear, Vercel, Granola, and Raycast**.
*   **Visual Aesthetics**: Premium dark mode, strict typography hierarchy, intentional spacing systems, and high panel density.
*   **Interaction Design**: Keyboard-first UX, command-palette navigation, smooth micro-interactions via Framer Motion, and optimistic UX where safe.
*   **Perceived Performance**: Skeleton loading, streaming UI updates, and instant feedback.

### Engineering Discipline
*   **Strict Typing**: Zero `any` types. Strict TypeScript configuration.
*   **Code Quality**: Zero console errors, warnings, or dead code. No duplicated logic.
*   **Architectural Purity**: Shared abstractions, domain-driven folder structures, reusable primitives, and typed contracts.

## 2. Architecture Overview

Notemind consists of two primary layers:
1.  **Frontend**: Next.js 16+ (App Router), React 19, TailwindCSS v4, shadcn/ui, Framer Motion.
2.  **Backend**: Go (Gin API), PostgreSQL (Primary Data), Redis (State & Pub/Sub), Asynq (Task Queue), Vexa (Headless Meeting Bot Provider).

## 3. Database Relationships & State Machines

### Core Entities
*   **Users**: Global identities mapped via Google OAuth.
*   **Workspaces**: Multi-tenant boundary. Users hold roles (`admin`, `member`) via `workspace_memberships`.
*   **Meetings**: The central state machine.
    *   *States*: `pending` -> `joining` -> `admitted` -> `recording` -> `processing` -> `completed` (or `failed` / `denied`).
*   **Transcripts**: Append-only streams tied to a meeting.
*   **Summaries**: Structured AI outputs (Key Points, Decisions, Action Items) linked to completed meetings.
*   **Embeddings**: Vector representations stored in pgvector for semantic RAG search across the workspace.

## 4. AI Orchestration Flow & Queue Orchestration

The AI pipeline is heavily asynchronous to ensure responsiveness.
1.  **Ingestion**: Vexa bots capture audio and emit chunks to the Go backend.
2.  **Queueing**: Go enqueues transcription tasks via Redis/Asynq.
3.  **Transcription**: Whisper models process audio chunks. Results are broadcasted via SSE back to the active meeting room clients.
4.  **Summarization Pipeline**: Upon meeting end, a multi-stage LLM pipeline kicks off:
    *   *Stage 1*: Full Transcript compilation.
    *   *Stage 2*: Executive Summary generation.
    *   *Stage 3*: Action Item & Decision extraction.
    *   *Stage 4*: Vector Embedding generation.
5.  **Persistence**: Final results are written to PostgreSQL and broadcasted to clients to hydrate the UI seamlessly.

## 5. Frontend Strategy: Domain-Driven Architecture

To prevent bloated pages and duplicated logic, the frontend adheres to a feature-sliced/domain-driven structure:
*   `src/features/meetings`: Live meeting view, SSE hooks, transcript renderers.
*   `src/features/memory`: AI Chat UI, citation links, history context.
*   `src/features/auth`: OAuth logic, workspace creation wizards.
*   `src/components/ui`: Highly polished, generic primitives (shadcn/ui + custom variants).
*   `src/lib/api`: Centralized, strongly-typed fetchers with automatic error mapping.

## 6. Deployment Topology & Scaling Assumptions

*   **Frontend**: Vercel Edge Network (optimizing for static delivery and low-latency API proxying).
*   **Backend API**: Scalable Go containers (Docker/K8s) handling stateless HTTP requests.
*   **Workers**: Dedicated Asynq worker pools processing intensive LLM/Audio tasks.
*   **Database**: Managed PostgreSQL with connection pooling (e.g., PgBouncer) to handle concurrent SSE/Bot writes.

## 7. Retry & Recovery Systems

*   **Frontend**: Automatic SSE reconnection with exponential backoff. Optimistic UI rollbacks on mutation failures.
*   **Backend**: Asynq provides automatic task retries for AI generation failures. Webhook idempotency ensures duplicate bot events are ignored.

## 8. Technical Debt & Audit Tracking

*   **Current State**: Foundation built (Phases 1-4 completed in prototype architecture).
*   **Immediate Tech Debt**: 
    *   *Refactor*: Move from monolithic Next.js pages to `src/features/` domain structure.
    *   *Type Safety*: Ensure `api.ts` return types strictly match Go struct definitions without loose casts.
    *   *UX Polish*: Implement skeleton loaders for dashboard and search lists.
