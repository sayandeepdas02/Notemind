'use client';

// AIChatPanel — persistent meeting-scoped AI chat
// Follows strict UX rules: optimistic messages, typing indicator, citation links

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, APIError } from '@/lib/api';
import type { MemoryChatMessage, MemoryAskResponse } from '@/types/api';
import Link from 'next/link';

const SUGGESTIONS = [
  'What were the main decisions?',
  'List all action items',
  'Who owns the follow-ups?',
  'What blockers were raised?',
];

interface AIChatPanelProps {
  meetingId: string;
  className?: string;
}

export function AIChatPanel({ meetingId, className }: AIChatPanelProps) {
  const [messages, setMessages] = useState<MemoryChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const handleSubmit = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const tempId = `temp-${Date.now()}`;
    const userMessage: MemoryChatMessage = {
      id: tempId,
      role: 'user',
      content: trimmed,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<MemoryAskResponse>(
        `/memory/ask?q=${encodeURIComponent(trimmed)}&meeting_id=${meetingId}`
      );

      const aiMessage: MemoryChatMessage = {
        id: response.id ?? `ai-${Date.now()}`,
        role: 'ai',
        content: response.answer || 'I couldn\'t find an answer to that.',
        sources: response.sources ?? [],
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : 'Failed to connect to AI.';
      setError(msg);
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(trimmed);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(input);
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border flex items-center gap-2 bg-background/50">
        <MessageSquare size={15} className="text-accent" />
        <h2 className="text-sm font-semibold text-foreground">AI Chat</h2>
        <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
          Meeting scope
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-5 px-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <MessageSquare size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Ask anything about this meeting</p>
              <p className="text-xs leading-relaxed">Notemind can recall specific moments, decisions, and who said what.</p>
            </div>
            <div className="w-full space-y-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg bg-surface-3 border border-border hover:border-accent/40 hover:text-foreground text-muted-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-surface-3 border border-border text-foreground rounded-bl-md'
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <LinkIcon size={9} /> Sources
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <Link
                            key={i}
                            href={`/dashboard/meetings/${src.meeting_id}`}
                            title={src.snippet}
                            className="text-[11px] px-2 py-1 bg-background border border-border rounded-md text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors truncate max-w-[120px]"
                          >
                            Meeting {src.meeting_id.slice(0, 6)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-3 border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center px-2">{error}</p>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-border bg-background/50">
        <form onSubmit={handleFormSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this meeting…"
            className="w-full bg-surface-2 border border-border rounded-xl pl-4 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-1.5 text-muted-foreground hover:text-accent disabled:opacity-30 transition-colors"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
