'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Send, Square, Link as LinkIcon, Plus, Trash2, Clock, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api, streamAsk } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Citation { meeting_id: string; snippet: string; }

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
}

const SUGGESTIONS = [
  'What were the blockers for the Apollo release?',
  'Summarize the last All Hands meeting',
  'What action items are assigned to me?',
  'What decisions were made about pricing?',
];

function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3.5 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-4 mb-2 flex items-center gap-1">
        <LinkIcon size={10} className="text-brand" /> Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <Link
            key={i}
            href={`/dashboard/meetings/${c.meeting_id}`}
            title={c.snippet}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-light border border-brand/10 hover:border-brand text-brand transition-all truncate max-w-[160px] inline-flex items-center gap-1"
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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-float-up`}>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm transition-all",
          isUser
            ? "bg-gradient-to-r from-brand to-brand-mid text-white rounded-br-sm"
            : "bg-white border border-gray-200 text-ink rounded-bl-sm"
        )}
      >
        <p className="whitespace-pre-wrap">
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand animate-blink align-text-bottom" />
          )}
        </p>
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <CitationChips citations={msg.citations} />
        )}
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex justify-start w-full animate-pulse">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[70%] w-64 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded-full w-full" />
        <div className="h-3.5 bg-gray-200 rounded-full w-5/6" />
        <div className="h-3.5 bg-gray-200 rounded-full w-2/3" />
      </div>
    </div>
  );
}

export default function AIMemoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const stopRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notemind_memory_sessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatSession[];
        setSessions(parsed.sort((a, b) => b.timestamp - a.timestamp));
      } catch { /* ignored */ }
    }

    const currentSessionId = sessionStorage.getItem('notemind_memory_session');
    if (currentSessionId) {
      setActiveSessionId(currentSessionId);
      loadSessionHistory(currentSessionId);
    }
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streaming, loadingHistory]);

  const loadSessionHistory = async (sessionId: string) => {
    setLoadingHistory(true);
    setError(null);
    try {
      const data = await api.get<{ id: string; role: string; content: string; sources?: Citation[] }[]>(
        `/memory/chat/history?session_id=${sessionId}`
      );
      if (Array.isArray(data)) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'ai',
          content: m.content,
          citations: m.sources
        })));
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load conversation history.');
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    if (streaming) handleStop();
    sessionStorage.setItem('notemind_memory_session', sessionId);
    setActiveSessionId(sessionId);
    loadSessionHistory(sessionId);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (streaming && activeSessionId === sessionId) handleStop();

    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    localStorage.setItem('notemind_memory_sessions', JSON.stringify(updated));

    if (activeSessionId === sessionId) {
      startNewConversation();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    const maxH = 120; // Maximum text area height
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
    setActiveSessionId(null);
    sessionStorage.removeItem('notemind_memory_session');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSubmit = useCallback((queryToSubmit?: string) => {
    const query = (queryToSubmit ?? input).trim();
    if (!query || streaming) return;
    setInput('');
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let sessionId = activeSessionId;
    const isNewSession = !sessionId;

    if (isNewSession) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('notemind_memory_session', sessionId);
      setActiveSessionId(sessionId);

      // Create new session metadata
      const newSession: ChatSession = {
        id: sessionId,
        title: query.length > 35 ? query.substring(0, 35) + '...' : query,
        timestamp: Date.now()
      };
      const updated = [newSession, ...sessions];
      setSessions(updated);
      localStorage.setItem('notemind_memory_sessions', JSON.stringify(updated));
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
    }, undefined); // global meeting search scope

    stopRef.current = stop;
  }, [input, streaming, activeSessionId, sessions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      
      {/* Left: sessions history */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-gray-100 bg-white">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm"
          >
            <Plus size={14} />
            New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-5 flex items-center gap-1.5">
              <Clock size={11} /> Past Chats
            </span>
          </div>
          
          {sessions.length > 0 ? (
            sessions.map(s => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer group transition-all",
                    isActive
                      ? "bg-brand-light text-brand"
                      : "hover:bg-off-white text-ink-3 hover:text-ink"
                  )}
                >
                  <p className={cn("text-[13px] truncate flex-1 pr-2", isActive ? "font-semibold" : "font-medium")}>
                    {s.title}
                  </p>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-ink-5 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-[12px] text-ink-5 px-3 py-4 text-center">No past conversations</p>
          )}
        </div>
      </aside>

      {/* Right: chat window */}
      <div className="flex-1 flex flex-col min-w-0 bg-off-white">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
              <Brain size={16} className="text-brand animate-pulse" />
            </div>
            <div>
              <h1 className="text-[14px] font-bold text-ink flex items-center gap-1.5">
                AI Memory
                <span className="text-[10px] font-medium bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">Beta</span>
              </h1>
              <p className="text-[11px] text-ink-5">Semantics search & reasoning across all workspace intelligence</p>
            </div>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Loading history spinner */}
          {loadingHistory && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          )}

          {/* Empty state: welcome & suggestions */}
          {!loadingHistory && messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center text-center text-ink-4 max-w-lg mx-auto py-10">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-6 shadow-sm">
                <Brain size={28} className="text-brand" />
              </div>
              <h3 className="text-[16px] font-bold text-ink mb-2">Recall decisions & action items</h3>
              <p className="text-[14px] text-ink-4 leading-relaxed mb-8 max-w-sm">
                Notemind synthesizes summaries, action details, and timeline logs across all your uploaded meeting recordings.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-left bg-white hover:bg-brand-pale border border-gray-200 hover:border-brand-mid/30 rounded-xl p-3.5 text-[12px] font-medium text-ink-2 hover:text-brand transition-all shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat bubbles */}
          {!loadingHistory && messages.map((msg, i) => {
            // If the last message is AI and streaming and empty content, show skeleton loading
            if (msg.role === 'ai' && msg.streaming && !msg.content) {
              return <MessageSkeleton key={msg.id} />;
            }
            return <MessageBubble key={msg.id} msg={msg} />;
          })}
          
          <div ref={bottomRef} className="h-1" />
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="shrink-0 px-5 py-3.5 bg-red-50 border-t border-red-200 text-red-700 text-[13px] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
            {error}
          </div>
        )}

        {/* Input box */}
        <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
          <div className="flex items-end gap-2.5 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Query your workspace knowledge..."
              disabled={streaming || loadingHistory}
              rows={1}
              className="flex-1 bg-off-white border border-gray-200 text-ink placeholder:text-ink-5 px-4 py-3 rounded-xl text-[14px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none overflow-hidden disabled:opacity-60"
              style={{ maxHeight: `120px` }}
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
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loadingHistory}
                aria-label="Send message"
                className="p-3 bg-brand hover:bg-brand-mid disabled:bg-gray-100 disabled:text-ink-5 text-white rounded-xl transition-colors shrink-0 shadow-sm"
              >
                <Send size={15} />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-ink-5 mt-2.5 flex items-center justify-center gap-1.5">
            <Sparkles size={10} className="text-brand" />
            Notemind AI accesses transcripts and notes from all your recordings to answer.
          </p>
        </div>
      </div>
    </div>
  );
}
