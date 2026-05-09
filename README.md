# Notemind

An AI-powered Meeting Notetaker.

Notemind joins your virtual meetings, transcribes audio in real-time, generates structured summaries, extracts actionable items, and remembers past contexts using a semantic vector database.

## Project Structure

This repository acts as the monorepo or central design hub for the Notemind architecture.

```text
Notemind/
├── agents/                  # AI agent definitions and specs
│   ├── action-item-extractor.md
│   ├── meeting-joiner.md
│   ├── memory-agent.md
│   ├── summarizer.md
│   └── transcriber.md
├── backend/                 # Golang microservices (Source code)
├── context/                 # Prompt templates, mock data, schemas
│   └── README.md
├── design/                  # Architecture and UI/UX design blueprints
│   ├── architecture.md
│   ├── backend.md
│   ├── data-flow.md
│   └── frontend.md
├── frontend/                # Next.js Application (Source code)
└── infra/                   # Deployment, CI/CD, Docker configurations
    └── README.md
```

## Tech Stack
- **Frontend:** Next.js, TailwindCSS
- **Backend:** Golang Microservices
- **Message Broker:** Kafka / Redis
- **Database:** PostgreSQL + pgvector
- **AI/ML:** Whisper / Deepgram (Audio), OpenAI / Anthropic (LLMs)

## Getting Started
Please refer to the `design/` folder for architectural blueprints and system diagrams before beginning implementation.
