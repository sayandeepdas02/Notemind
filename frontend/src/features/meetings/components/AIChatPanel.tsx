'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Brain, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { streamAsk } from '@/lib/api';
import type { MemoryChatMessage } from '@/types/api';
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

  const handleSubmit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setError(null);

    const aiId = `ai-${Date.now()}`;
    let accumulated = '';

    streamAsk(trimmed, {
      onToken: (token) => {
        accumulated += token;
        setMessages(prev => {
          const exists = prev.find(m => m.id === aiId);
          if (exists) return prev.map(m => m.id === aiId ? { ...m, content: accumulated } : m);
          return [...prev, { id: aiId, role: 'ai' as const, content: accumulated }];
        });
      },
      onCitations: (citations) => {
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, sources: citations } : m));
      },
      onDone: () => {
        setLoading(false);
        inputRef.current?.focus();
      },
      onError: (msg) => {
        setError(msg || 'Failed to connect to AI.');
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setInput(trimmed);
        setLoading(false);
        inputRef.current?.focus();
      },
    }, meetingId);
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Brain size={15} className="text-green-600" />
        <h2 className="text-sm font-semibold text-gray-900">Ask Notemind</h2>
        <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wide font-medium">
          Meeting scope
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-5 px-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Brain size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Ask anything about this meeting</p>
              <p className="text-xs leading-relaxed text-gray-400">Notemind can recall specific moments, decisions, and who said what.</p>
            </div>
            <div className="w-full space-y-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[88%] rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-green-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                )}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                        <LinkIcon size={9} /> Sources
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <Link
                            key={i}
                            href={`/dashboard/meetings/${src.meeting_id}`}
                            title={src.snippet}
                            className="text-[11px] px-2 py-1 bg-green-50 border border-green-200 rounded-md text-green-700 hover:bg-green-100 transition-colors truncate max-w-[120px]"
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
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="text-xs text-red-500 text-center px-2">{error}</p>}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-gray-100">
        <form onSubmit={e => { e.preventDefault(); handleSubmit(input); }} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this meeting..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                       focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-30 transition-colors"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
