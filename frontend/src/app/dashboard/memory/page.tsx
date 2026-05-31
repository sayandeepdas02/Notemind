'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Send, Square, Link as LinkIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { api, streamAsk } from '@/lib/api';

interface Citation { meeting_id: string; snippet: string; }

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

function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-5 mb-2 flex items-center gap-1">
        <LinkIcon size={10} /> Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <Link
            key={i}
            href={`/dashboard/meetings/${c.meeting_id}`}
            title={c.snippet}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-light border border-brand/20 hover:border-brand text-brand transition-colors truncate max-w-[160px]"
          >
            Meeting {c.meeting_id.slice(0, 6)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? 'bg-brand text-white'
            : 'bg-white border border-gray-200 text-ink shadow-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-current animate-blink align-text-bottom" />
          )}
        </p>
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <CitationChips citations={msg.citations} />
        )}
      </div>
    </div>
  );
}

export default function AIMemoryPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const sessionId = sessionStorage.getItem('notemind_memory_session');
        if (!sessionId) return;
        const data = await api.get<{ id: string; role: string; content: string; sources?: Citation[] }[]>(
          `/memory/chat/history?session_id=${sessionId}`
        );
        if (Array.isArray(data)) {
          setMessages(data.map(m => ({ id: m.id, role: m.role as 'user' | 'ai', content: m.content, citations: m.sources })));
        }
      } catch { /* history is optional */ }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming]);

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
    setMessages(prev => prev.map((m, i) => (i === prev.length - 1 && m.role === 'ai' ? { ...m, streaming: false } : m)));
  };

  const startNewConversation = () => {
    handleStop();
    setMessages([]);
    setInput('');
    setError(null);
    sessionStorage.removeItem('notemind_memory_session');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSubmit = useCallback(() => {
    const query = input.trim();
    if (!query || streaming) return;
    setInput('');
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

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
        setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, content: accumulated } : m)));
      },
      onCitations: citations => {
        setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, citations } : m)));
      },
      onDone: () => {
        setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, streaming: false } : m)));
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const sessionPreview = messages.find(m => m.role === 'user')?.content ?? 'New conversation';

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left: sessions */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-gray-100 bg-white">
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-brand hover:bg-brand-mid text-white rounded-lg text-[13px] font-medium transition-colors"
          >
            <Plus size={13} />
            New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {messages.length > 0 ? (
            <div className="px-3 py-2 rounded-lg bg-brand-light cursor-pointer">
              <p className="text-[12px] font-medium text-brand truncate">{sessionPreview}</p>
              <p className="text-[11px] text-ink-5 mt-0.5">Current session</p>
            </div>
          ) : (
            <p className="text-[12px] text-ink-5 px-3 py-2">No conversations yet</p>
          )}
        </div>
      </aside>

      {/* Right: chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white">
          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center">
            <Brain size={16} className="text-brand" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-ink">AI Memory</h1>
            <p className="text-[11px] text-ink-5">Ask questions spanning all your meetings</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-off-white">
          {messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center text-center text-ink-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                <Brain size={28} className="text-brand opacity-70" />
              </div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">How can I help?</h3>
              <p className="text-[14px] text-ink-4 leading-relaxed mb-7">
                Ask Notemind to summarize your meetings, find action items, or recall key decisions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="bg-white hover:bg-off-white border border-gray-200 rounded-full px-4 py-2 text-[12px] font-medium text-ink-3 transition-colors"
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
          <div className="shrink-0 px-5 py-3 bg-red-50 border-t border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI Memory…"
              disabled={streaming}
              rows={1}
              className="flex-1 bg-off-white border border-gray-200 text-ink placeholder:text-ink-5 px-4 py-3 rounded-xl text-[14px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none overflow-hidden disabled:opacity-60"
              style={{ maxHeight: `${4 * 24}px` }}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                aria-label="Stop generating"
                className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors shrink-0"
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                aria-label="Send message"
                className="p-3 bg-brand hover:bg-brand-mid text-white rounded-xl transition-colors disabled:opacity-40 shrink-0"
              >
                <Send size={15} />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-ink-5 mt-2">
            AI Memory can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
