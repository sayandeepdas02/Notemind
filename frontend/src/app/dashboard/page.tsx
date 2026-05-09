"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Video, Calendar, Clock, Loader2, AlertCircle } from "lucide-react";

type Meeting = {
  id: string;
  status: string;
  meeting_url: string;
  audio_url: string;
  created_at: string;
};

const statusColor: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  joining:    { bg: "rgba(59, 130, 246, 0.1)", text: "#60a5fa", dot: "#3b82f6", label: "Joining" },
  live:       { bg: "rgba(16, 185, 129, 0.1)", text: "#34d399", dot: "#10b981", label: "Live" },
  ended:      { bg: "rgba(139, 139, 159, 0.1)", text: "#a1a1aa", dot: "#71717a", label: "Ended" },
  failed:     { bg: "rgba(239, 68, 68, 0.1)", text: "#f87171", dot: "#ef4444", label: "Failed" },
  completed:  { bg: "rgba(139, 139, 159, 0.1)", text: "#a1a1aa", dot: "#71717a", label: "Completed" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = statusColor[status] ?? statusColor.ended;
  const isLive = status === "live" || status === "joining";
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: colors.bg, color: colors.text }}>
      <span 
        className="w-1.5 h-1.5 rounded-full" 
        style={{ 
          background: colors.dot,
          animation: isLive ? "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
        }} 
      />
      {colors.label}
    </span>
  );
}

export default function DashboardHome() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Start Meeting State
  const [url, setUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("notemind_token");
    fetch("http://localhost:8080/meetings", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject("Failed to fetch"))
      .then(data => { setMeetings(data || []); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const handleStartMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith("https://meet.google.com/")) {
      setStartError("Please enter a valid Google Meet URL");
      return;
    }
    setStarting(true);
    setStartError("");
    try {
      const token = localStorage.getItem("notemind_token");
      const res = await fetch("http://localhost:8080/meetings/join", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ meeting_url: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to start bot");
      router.push(`/dashboard/meetings/${data.meeting_id}`);
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : "Unknown error");
      setStarting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      
      {/* Start Meeting Card */}
      <section>
        <div className="bg-[#121218] border border-[#222230] rounded-2xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
          {/* Background decorative blob */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#6366f1] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-bold text-[#f8f8fa] mb-2 flex items-center gap-2">
              <Video className="text-[#6366f1]" size={24} />
              Start a new meeting
            </h2>
            <p className="text-[#8b8b9f] mb-6 text-sm">
              Paste your Google Meet link below. Notemind AI will join automatically and start transcribing.
            </p>

            <form onSubmit={handleStartMeeting} className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="input-field flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                required
              />
              <button
                type="submit"
                disabled={starting || !url}
                className={`
                  px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                  ${starting || !url 
                    ? "bg-[#222230] text-[#8b8b9f] cursor-not-allowed" 
                    : "bg-[#6366f1] hover:bg-[#818cf8] text-white shadow-lg shadow-[#6366f1]/20"}
                `}
              >
                {starting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                {starting ? "Dispatching..." : "Start Notemind"}
              </button>
            </form>
            
            {startError && (
              <p className="mt-3 text-sm text-[#ef4444] flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} /> {startError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Recent Meetings */}
      <section id="meetings">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#f8f8fa]">Recent Meetings</h3>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-[#8b8b9f]">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading your meetings...</p>
          </div>
        )}

        {error && (
          <div className="bg-[#2d0a0a] border border-[#5a1a1a] rounded-xl p-4 text-[#f87171] flex items-center gap-3">
            <AlertCircle size={20} />
            <p>Could not load meetings: {error}</p>
          </div>
        )}

        {!loading && !error && meetings.length === 0 && (
          <div className="border border-dashed border-[#222230] rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#121218] flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-[#8b8b9f]" size={24} />
            </div>
            <h4 className="text-lg font-medium text-[#f8f8fa] mb-2">No meetings yet</h4>
            <p className="text-[#8b8b9f] text-sm max-w-sm mx-auto">
              You haven't recorded any meetings with Notemind yet. Paste a link above to get started.
            </p>
          </div>
        )}

        {meetings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetings.map(m => (
              <Link key={m.id} href={`/dashboard/meetings/${m.id}`} className="group block">
                <div className="bg-[#121218] border border-[#222230] rounded-xl p-5 hover:border-[#6366f1] hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#6366f1]/5">
                  <div className="flex justify-between items-start mb-4">
                    <StatusBadge status={m.status} />
                    <div className="flex items-center gap-1.5 text-xs text-[#8b8b9f] font-medium bg-[#0a0a0f] px-2 py-1 rounded-md border border-[#222230]">
                      <Clock size={12} />
                      {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  
                  <h4 className="text-[#f8f8fa] font-medium mb-1 truncate group-hover:text-[#6366f1] transition-colors">
                    {m.meeting_url ? m.meeting_url.replace("https://", "") : "Uploaded Audio Meeting"}
                  </h4>
                  <p className="text-[#8b8b9f] text-xs font-mono">ID: {m.id.slice(0, 8)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
