# Frontend Design

The Notemind frontend is a modern web application built with Next.js (App Router) and styled with TailwindCSS, focusing on real-time interactivity and a clean, Notion-like text reading experience.

## Core Pages & Views

### 1. Dashboard (Meeting Hub)
- **Layout:** Sidebar navigation (Upcoming, Past, Settings, Chat/Search). Main area displays a chronological list or grid of past meetings with brief summary snippets.
- **Actions:** "Add Meeting Link", "Connect Calendar" buttons.
- **Features:** Global semantic search bar powered by the Memory Agent.

### 2. Live Meeting View
- **Layout:** Split view.
- **Left Panel:** Live transcription scrolling as people speak. Speakers are color-coded.
- **Right Panel:** Live Action Items/Notes (populated as the intelligence service detects them, or manually jotted by the user).
- **Interactivity:** WebSockets connection to receive text incrementally.

### 3. Post-Meeting Detail Page
- **Layout:** Document-style view.
- **Header:** Title, Date, Attendees, Duration.
- **Top Section:** Executive Summary and key insights.
- **Middle Section:** Action Items (with checkboxes to mark as done, assignees, and due dates).
- **Bottom Section:** The full searchable, speaker-diarized transcript. Clicking a timestamp plays the audio from that point.

## State Management & Real-time
- Use React Server Components for initial fast loads (e.g., dashboard lists).
- Use client-side state (Zustand or React Context) and WebSocket hooks for the Live Meeting View.
- Optimistic UI updates when marking action items as complete.
