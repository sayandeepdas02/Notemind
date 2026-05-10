"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, Send, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: { meeting_id: string; snippet: string }[];
};

export default function AIMemory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load history
    const loadHistory = async () => {
      try {
        const data = await api.get("/memory/chat/history");
        if (data && data.messages) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const query = input;
    setInput("");
    setError("");
    
    // Optimistic user message
    const tempId = Math.random().toString();
    setMessages(prev => [...prev, { id: tempId, role: "user", content: query }]);
    setLoading(true);

    try {
      const data = await api.get(`/memory/ask?q=${encodeURIComponent(query)}`);
      
      setMessages(prev => [
        ...prev,
        {
          id: data.id || Math.random().toString(),
          role: "ai",
          content: data.answer || "I couldn't find an answer.",
          sources: data.sources || []
        }
      ]);
    } catch (e: any) {
      setError("Failed to get response from AI Memory.");
      setMessages(prev => prev.filter(m => m.id !== tempId)); // remove optimistic
      setInput(query); // restore input
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Brain className="text-[#a855f7]" size={28} />
            AI Memory
          </h1>
          <p className="text-muted-foreground">Your company's intelligence. Ask questions spanning across all meetings.</p>
        </div>
      </div>

      <div className="flex-1 bg-surface-2 border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground max-w-md mx-auto">
               <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-6">
                 <Brain size={32} className="text-[#a855f7] opacity-50" />
               </div>
               <h3 className="text-lg font-medium text-foreground mb-2">How can I help?</h3>
               <p className="text-sm leading-relaxed mb-8">
                 Ask Notemind to summarize Q2 OKRs, list action items for a specific team member, or recall decisions made about the pricing model.
               </p>
               <div className="flex flex-wrap gap-2 justify-center">
                 {["What were the blockers for the Apollo release?", "Summarize the last All Hands", "Action items for John"].map(suggestion => (
                   <button 
                     key={suggestion}
                     onClick={() => setInput(suggestion)}
                     className="bg-surface-3 hover:bg-border border border-border rounded-full px-4 py-2 text-xs font-medium text-foreground transition-colors"
                   >
                     {suggestion}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === "user" ? "bg-accent text-white" : "bg-background border border-border text-foreground"}`}>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <LinkIcon size={12} /> Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, i) => (
                        <Link 
                          key={i} 
                          href={`/dashboard/meetings/${src.meeting_id}`}
                          className="bg-surface-3 border border-border hover:border-accent hover:text-accent rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors max-w-[200px] truncate"
                          title={src.snippet}
                        >
                          Meeting {src.meeting_id.slice(0,6)}
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
              <div className="bg-background border border-border text-foreground rounded-2xl px-5 py-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-75" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>

        {error && (
          <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="p-4 bg-background border-t border-border shrink-0">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI Memory..."
              className="w-full bg-surface-2 border border-border rounded-xl pl-5 pr-12 py-4 text-[15px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-muted-foreground shadow-sm"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading}
              className="absolute right-3 p-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent transition-colors"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-3">AI Memory can make mistakes. Check important information.</p>
        </div>

      </div>
    </div>
  );
}
