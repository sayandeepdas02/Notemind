"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, StopCircle, Share2, ArrowLeft, Video, CheckCircle2, FileText, AlignLeft, Target, Users, Clock } from "lucide-react";

type Meeting = {
  id: string;
  status: string;
  meeting_url: string;
};

type Segment = {
  id: string;
  speaker: string;
  text: string;
  absolute_start_time: string;
  sequence_id?: number;
};

type ActionItem = { task: string; owner: string; deadline?: string };
type TimelineEvent = { time: string; event: string };

type MeetingIntelligence = {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  participants: string[];
  timeline: TimelineEvent[];
};

const LIVE = new Set(["JOINING", "WAITING_FOR_ADMISSION", "ADMITTED", "RECORDING", "RECONNECTING"]);
const ENDED = new Set(["ENDED", "FAILED", "DENIED", "DISCONNECTED"]);

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } 
  catch { return ""; }
}

function mergeSegments(existing: Segment[], incoming: Segment[]): Segment[] {
  const map = new Map(existing.map(s => [s.id, s]));
  for (const s of incoming) map.set(s.id, s);
  return [...map.values()].sort(
    (a, b) => new Date(a.absolute_start_time).getTime() - new Date(b.absolute_start_time).getTime()
  );
}

export default function MeetingDetailSplitView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [intel, setIntel] = useState<MeetingIntelligence | null>(null);
  
  const [activeTab, setActiveTab] = useState<"summary" | "actions" | "decisions">("summary");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const lastSeqRef = useRef<number>(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [segments.length]);

  const fetchMeetingAndIntel = useCallback(async () => {
    try {
      const token = localStorage.getItem("notemind_token");
      const headers = { "Authorization": `Bearer ${token}` };
      const [mRes, iRes] = await Promise.all([
        fetch(`http://localhost:8080/meetings/${id}`, { headers }),
        fetch(`http://localhost:8080/meetings/${id}/summary`, { headers }).catch(() => null)
      ]);
      
      if (!mRes.ok) throw new Error("Meeting not found");
      const m = await mRes.json();
      setMeeting(m);
      setStatus(m.status);

      if (iRes && iRes.ok) {
        setIntel(await iRes.json());
      }
    } catch {
      setError("Could not load meeting details.");
    }
  }, [id]);

  useEffect(() => {
    fetchMeetingAndIntel();

    const token = localStorage.getItem("notemind_token");
    const sse = new EventSource(`http://localhost:8080/meetings/${id}/stream?token=${token}`);
    sseRef.current = sse;

    sse.onmessage = (e) => {
      try {
        // SSE standard gives us e.lastEventId
        if (e.lastEventId) {
          lastSeqRef.current = parseInt(e.lastEventId, 10) || lastSeqRef.current;
        }

        const evt = JSON.parse(e.data);
        if (evt.type === "segments") {
          setSegments(prev => mergeSegments(prev, evt.data));
        }
        if (evt.type === "status") {
          const newStatus = evt.data.status;
          setStatus(newStatus);
          if (ENDED.has(newStatus)) {
            sse.close();
            // Fetch the compiled AI summary once ended
            setTimeout(fetchMeetingAndIntel, 2000); 
          }
        }
      } catch { /* ignore */ }
    };
    sse.onerror = () => sse.close();
    return () => sse.close();
  }, [id, fetchMeetingAndIntel]);

  const stopBot = async () => {
    const token = localStorage.getItem("notemind_token");
    await fetch(`http://localhost:8080/meetings/${id}/bot`, { 
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    setStatus("ended");
    sseRef.current?.close();
  };

  const generateShareLink = async () => {
    const token = localStorage.getItem("notemind_token");
    try {
      const res = await fetch(`http://localhost:8080/meetings/${id}/share`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.share_token) {
        setShareLink(`${window.location.origin}/share/${data.share_token}`);
        setShowShareModal(true);
      }
    } catch (e) {
      alert("Failed to generate share link");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-[#2d0a0a] text-[#ef4444] rounded-full flex items-center justify-center mb-4">
          <StopCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#f8f8fa] mb-2">Meeting Not Found</h2>
        <p className="text-[#8b8b9f] mb-6">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-[#222230] text-[#f8f8fa] rounded-lg font-medium hover:bg-[#3b3b4f] transition-colors">
          Go back to Dashboard
        </button>
      </div>
    );
  }

  if (status === "DENIED") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-[#2d0a0a] text-[#ef4444] rounded-full flex items-center justify-center mb-4">
          <StopCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#f8f8fa] mb-2">Admission Denied</h2>
        <p className="text-[#8b8b9f] mb-6">The host denied entry to the NoteMind bot, or a CAPTCHA prevented joining.</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-[#222230] text-[#f8f8fa] rounded-lg font-medium hover:bg-[#3b3b4f] transition-colors">
          Go back to Dashboard
        </button>
      </div>
    );
  }

  const isLive = LIVE.has(status);

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 bg-[#050508]">
      
      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-[#0a0a0f] p-4 lg:px-6 rounded-2xl border border-[#222230]">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-[#8b8b9f] hover:text-[#f8f8fa] p-2 bg-[#121218] rounded-lg border border-[#222230] transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-bold text-[#f8f8fa]">
                {meeting?.meeting_url ? "Video Meeting" : "Meeting Recording"}
              </h1>
              {isLive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(16,185,129,0.1)] text-[#34d399]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-[pulse-ring_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" /> Live
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1a1a24] text-[#8b8b9f]">Ended</span>
              )}
            </div>
            <a href={meeting?.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6366f1] hover:underline font-medium">
              {meeting?.meeting_url}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLive && (
            <button onClick={stopBot} className="flex items-center gap-2 px-4 py-2 bg-[#2d0a0a] text-[#f87171] border border-[#5a1a1a] rounded-lg text-sm font-semibold hover:bg-[#4a0f0f] transition-colors">
              <StopCircle size={16} /> Stop Bot
            </button>
          )}
          <button onClick={generateShareLink} className="flex items-center gap-2 px-4 py-2 bg-[#121218] text-[#f8f8fa] border border-[#222230] rounded-lg text-sm font-medium hover:bg-[#222230] transition-colors">
            <Share2 size={16} /> Share Insights
          </button>
        </div>
      </header>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#121218] border border-[#222230] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-[#f8f8fa] mb-2">Share Insights</h3>
            <p className="text-sm text-[#8b8b9f] mb-6">Anyone with this link can view the meeting summary, key points, and action items. The raw transcript will remain private.</p>
            <div className="flex items-center gap-2 mb-6">
              <input 
                type="text" 
                readOnly 
                value={shareLink} 
                className="flex-1 bg-[#0a0a0f] border border-[#222230] text-[#f8f8fa] px-3 py-2 rounded-lg text-sm outline-none"
              />
              <button 
                onClick={() => { navigator.clipboard.writeText(shareLink); alert("Copied to clipboard!"); }}
                className="px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#818cf8]"
              >
                Copy
              </button>
            </div>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2 bg-[#222230] text-[#f8f8fa] rounded-lg text-sm font-medium hover:bg-[#3b3b4f]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Split View Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Panel: Transcript Stream */}
        <div className="flex-1 flex flex-col bg-[#0a0a0f] border border-[#222230] rounded-2xl overflow-hidden shadow-sm relative">
          
          {status === "RECONNECTING" && (
            <div className="absolute top-0 left-0 right-0 bg-[#eab308]/10 text-[#eab308] border-b border-[#eab308]/20 px-4 py-2 text-sm flex items-center justify-center gap-2 z-10 animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              Connection lost. Reconnecting to the meeting...
            </div>
          )}

          <div className="p-4 border-b border-[#222230] bg-[#121218] flex items-center justify-between">
            <h2 className="font-semibold text-[#f8f8fa] flex items-center gap-2">
              <AlignLeft size={16} className="text-[#6366f1]" />
              Live Transcript
            </h2>
            <span className="text-xs text-[#8b8b9f] font-mono">{segments.length} segments</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {status === "JOINING" && (
              <div className="h-full flex flex-col items-center justify-center text-[#8b8b9f]">
                <div className="w-10 h-10 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-medium">Connecting to meeting...</p>
              </div>
            )}

            {status === "WAITING_FOR_ADMISSION" && (
              <div className="h-full flex flex-col items-center justify-center text-[#8b8b9f]">
                <div className="w-10 h-10 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-medium">Waiting for the host to let NoteMind in...</p>
              </div>
            )}
            
            {segments.length === 0 && (status === "RECORDING" || status === "ADMITTED") && (
              <div className="h-full flex flex-col items-center justify-center text-[#8b8b9f]">
                <Video size={32} className="mb-4 opacity-50" />
                <p className="font-medium">Listening for speech...</p>
              </div>
            )}

            {segments.map((seg, i) => {
              const showSpeaker = i === 0 || segments[i - 1].speaker !== seg.speaker;
              return (
                <div key={seg.id} className={showSpeaker ? "mt-6" : "mt-1"}>
                  {showSpeaker && (
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                        {(seg.speaker || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-[#f8f8fa]">{seg.speaker || "Unknown"}</span>
                      <span className="text-xs text-[#8b8b9f]">{formatTime(seg.absolute_start_time)}</span>
                    </div>
                  )}
                  <p className="text-sm text-[#d4d4d8] leading-relaxed pl-10">
                    {seg.text}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Right Panel: AI Insights */}
        <div className="w-full lg:w-[400px] xl:w-[480px] flex flex-col bg-[#0a0a0f] border border-[#222230] rounded-2xl overflow-hidden shadow-sm shrink-0">
          
          {/* Tabs */}
          <div className="flex border-b border-[#222230] bg-[#121218] p-2 gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "summary", icon: FileText, label: "Summary" },
              { id: "actions", icon: CheckCircle2, label: "Action Items" },
              { id: "decisions", icon: Target, label: "Decisions" }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                    ${active ? "bg-[#222230] text-[#f8f8fa]" : "text-[#8b8b9f] hover:text-[#f8f8fa] hover:bg-[#1a1a24]"}
                  `}
                >
                  <Icon size={14} className={active ? "text-[#6366f1]" : ""} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!intel ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#8b8b9f] p-8">
                {isLive ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#121218] flex items-center justify-center mb-4 border border-[#222230]">
                      <FileText size={20} className="text-[#6366f1] animate-pulse" />
                    </div>
                    <p className="font-medium text-[#f8f8fa] mb-2">Analyzing meeting...</p>
                    <p className="text-sm">Structured insights will appear here automatically once the meeting ends.</p>
                  </>
                ) : (
                  <p>AI Intelligence not available yet.</p>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Summary Tab */}
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b8b9f] mb-3">Executive Summary</h3>
                      <div className="bg-[#121218] border border-[#222230] rounded-xl p-4 text-sm text-[#d4d4d8] leading-relaxed">
                        {intel.summary || "No summary available."}
                      </div>
                    </div>

                    {intel.key_points?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b8b9f] mb-3">Key Points</h3>
                        <ul className="space-y-3">
                          {intel.key_points.map((kp, i) => (
                            <li key={i} className="flex gap-3 text-sm text-[#d4d4d8]">
                              <span className="text-[#6366f1] shrink-0 mt-0.5">•</span>
                              <span>{kp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Tab */}
                {activeTab === "actions" && (
                  <div>
                    {(!intel.action_items || intel.action_items.length === 0) ? (
                      <p className="text-sm text-[#8b8b9f] text-center py-10">No action items detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {intel.action_items.map((item, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-xl border border-[#222230] bg-[#121218] group hover:border-[#3b3b4f] transition-colors">
                            <div className="w-5 h-5 rounded border-2 border-[#3b3b4f] shrink-0 mt-0.5 group-hover:border-[#6366f1] transition-colors" />
                            <div>
                              <p className="text-sm font-medium text-[#f8f8fa]">{item.task}</p>
                              {item.owner && (
                                <p className="text-xs text-[#8b8b9f] mt-1.5 flex items-center gap-1.5">
                                  <Users size={12} /> {item.owner}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Decisions Tab */}
                {activeTab === "decisions" && (
                  <div>
                    {(!intel.decisions || intel.decisions.length === 0) ? (
                      <p className="text-sm text-[#8b8b9f] text-center py-10">No clear decisions detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {intel.decisions.map((dec, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-[#10b981]/20 bg-[#10b981]/5">
                            <Target size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                            <p className="text-sm text-[#f8f8fa]">{dec}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
