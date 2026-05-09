"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, FileText, CheckCircle2, Target, Users } from "lucide-react";
import Link from "next/link";

type ActionItem = { task: string; owner: string };
type MeetingIntelligence = {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
};

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [intel, setIntel] = useState<MeetingIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8080/share/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("Insights not found or meeting still processing"))
      .then(data => { setIntel(data); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-[#8b8b9f]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !intel) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-[#f8f8fa] p-6">
        <div className="max-w-md w-full bg-[#121218] border border-[#222230] rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-[#2d0a0a] text-[#ef4444] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Unavailable</h2>
          <p className="text-[#8b8b9f] text-sm mb-6">{error}</p>
          <Link href="/" className="inline-block px-6 py-2 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#818cf8] transition-colors">
            Go to Notemind
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-[#f8f8fa] selection:bg-[#6366f1]/30 pb-20">
      
      <nav className="h-16 border-b border-[#222230] bg-[#0a0a0f] flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-[#f8f8fa] font-bold text-lg tracking-tight">
          <div className="w-5 h-5 rounded bg-[#6366f1] text-white flex items-center justify-center text-[8px]">◈</div>
          Notemind <span className="text-[#8b8b9f] font-normal text-sm ml-2 px-2 py-0.5 bg-[#121218] rounded border border-[#222230]">Shared Insight</span>
        </Link>
        <Link href="/auth" className="text-sm font-semibold bg-[#f8f8fa] text-[#050508] px-4 py-2 rounded-lg hover:bg-[#d4d4d8] transition-colors">
          Start for Free
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto mt-12 px-6">
        <div className="bg-[#121218] border border-[#222230] rounded-2xl shadow-xl overflow-hidden">
          
          <div className="p-8 border-b border-[#222230] bg-gradient-to-b from-[#1a1a24] to-[#121218]">
            <h1 className="text-2xl md:text-3xl font-bold text-[#f8f8fa] mb-4">Meeting Intelligence</h1>
            <p className="text-[#8b8b9f] leading-relaxed text-sm md:text-base">
              {intel.summary || "No executive summary provided."}
            </p>
          </div>

          <div className="p-8 space-y-12 bg-[#0a0a0f]">
            {/* Key Points */}
            {intel.key_points && intel.key_points.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#8b8b9f] mb-4 flex items-center gap-2">
                  <FileText size={16} /> Key Points
                </h2>
                <ul className="space-y-4">
                  {intel.key_points.map((kp, i) => (
                    <li key={i} className="flex gap-4 text-[#d4d4d8] bg-[#121218] p-4 rounded-xl border border-[#222230]">
                      <span className="text-[#6366f1] shrink-0 mt-1">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Decisions */}
            {intel.decisions && intel.decisions.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#8b8b9f] mb-4 flex items-center gap-2">
                  <Target size={16} /> Decisions Made
                </h2>
                <div className="grid gap-3">
                  {intel.decisions.map((dec, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-[#10b981]/20 bg-[#10b981]/5">
                      <Target size={18} className="text-[#10b981] shrink-0 mt-0.5" />
                      <p className="text-[#f8f8fa]">{dec}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action Items */}
            {intel.action_items && intel.action_items.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#8b8b9f] mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Action Items
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {intel.action_items.map((item, i) => (
                    <div key={i} className="flex flex-col p-5 rounded-xl border border-[#222230] bg-[#121218]">
                      <p className="text-sm font-semibold text-[#f8f8fa] mb-3">{item.task}</p>
                      {item.owner && (
                        <div className="mt-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222230] text-xs font-medium text-[#8b8b9f] w-max">
                          <Users size={12} /> {item.owner}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-[#8b8b9f] text-sm mb-4">Want automated insights for your own meetings?</p>
          <Link href="/auth" className="inline-flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#818cf8] text-white px-6 py-3 rounded-xl font-semibold transition-all">
            Try Notemind Free
          </Link>
        </div>
      </main>
    </div>
  );
}
