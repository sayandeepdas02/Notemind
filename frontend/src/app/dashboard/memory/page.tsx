'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Send,
  Square,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { api, streamAsk } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────

interface Citation {
  meeting_id: string;
  snippet: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

const SUGGESTIONS = [
  'What were the blockers for the Apollo release?',
  'Summarize the last All Hands',
  'What action items are assigned to me?',
  'What decisions were made about pricing?',
];

// ── Citation chips ────────────────────────────────────────────

function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
        <LinkIcon size={10} /> Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <Link
            key={i}
            href={`/dashboard/meetings/${c.meeting_id}`}
            title={c.snippet}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-3 border border-border hover:border-accent/60 hover:text-accent text-muted-foreground transition-colors truncate max-w-[160px]"
          >
            Meeting {c.meeting_id.slice(0, 6)}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[#6366f1] text-white'
            : 'bg-surface-2 border border-border text-foreground'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-text-bottom">▋</span>
          )}
        </p>
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <CitationChips citations={msg.citations} />
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AIMemoryPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const sessionId = sessionStorage.getItem('notemind_memory_session');
        if (!sessionId) return;
        const data = await api.get<{ id: string; role: string; content: string; sources?: Citation[] }[]>(
          `/memory/chat/history?session_id=${sessionId}`
        );
        if (Array.isArray(data)) {
          setMessages(
            data.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'ai',
              content: m.content,
              citations: m.sources,
            }))
          );
        }
      } catch {
        // silent — history is optional
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming]);

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    const maxH = parseInt(getComputedStyle(el).lineHeight) * 4;
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  };

  const handleStop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setStreaming(false);
    // Mark last AI message as no longer streaming
    setMessages(prev =>
      prev.map((m, i) => (i === prev.length - 1 && m.role === 'ai' ? { ...m, streaming: false } : m))
    );
  };

  const handleSubmit = useCallback(() => {
    const query = input.trim();
    if (!query || streaming) return;

    setInput('');
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userId = crypto.randomUUID();
    const aiId = crypto.randomUUID();

    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', content: query },
      { id: aiId, role: 'ai', content: '', streaming: true },
    ]);
    setStreaming(true);

    let accumulated = '';

    const stop = streamAsk(query, {
      onToken: token => {
        accumulated += token;
        setMessages(prev =>
          prev.map(m => (m.id === aiId ? { ...m, content: accumulated } : m))
        );
      },
      onCitations: citations => {
        setMessages(prev =>
          prev.map(m => (m.id === aiId ? { ...m, citations } : m))
        );
      },
      onDone: () => {
        setMessages(prev =>
          prev.map(m => (m.id === aiId ? { ...m, streaming: false } : m))
        );
        setStreaming(false);
        stopRef.current = null;
      },
      onError: msg => {
        setError(msg || 'Failed to get response from AI Memory.');
        setMessages(prev => prev.filter(m => m.id !== aiId));
        setStreaming(false);
        stopRef.current = null;
      },
    });

    stopRef.current = stop;
  }, [input, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sessionPreview = messages.find(m => m.role === 'user')?.content ?? 'New conversation';

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── Left panel (sessions) ─────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-surface-2/40">
        <div className="p-3 border-b border-border">
          <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} />
            New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {messages.length > 0 ? (
            <div className="px-3 py-2 rounded-lg bg-accent/10 cursor-pointer">
              <p className="text-xs font-medium text-accent truncate">{sessionPreview}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Current session</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-3 py-2">No conversations yet</p>
          )}
        </div>
      </aside>

      {/* ── Right panel (chat) ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-border">
          <Brain size={20} className="text-[#a855f7]" />
          <div>
            <h1 className="text-sm font-bold text-foreground">AI Memory</h1>
            <p className="text-[11px] text-muted-foreground">Ask questions spanning all your meetings</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-border flex items-center justify-center mb-5">
                <Brain size={28} className="text-[#a855f7] opacity-60" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">How can I help?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-7">
                Ask Notemind to summarize your meetings, find action items, or recall key decisions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="bg-surface-3 hover:bg-border border border-border rounded-full px-4 py-2 text-xs font-medium text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          <div ref={bottomRef} className="h-1" />
        </div>

        {/* Error */}
        {error && (
          <div className="shrink-0 px-5 py-2.5 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-border p-4 bg-background">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI Memory…"
              disabled={streaming}
              rows={1}
              className="flex-1 bg-surface-2 border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all resize-none overflow-hidden disabled:opacity-60"
              style={{ maxHeight: `${4 * 24}px` }}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors shrink-0"
                title="Stop"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="p-3 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl transition-colors disabled:opacity-40 shrink-0"
                title="Send"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            AI Memory can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
