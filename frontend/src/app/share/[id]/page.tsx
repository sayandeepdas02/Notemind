"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, FileText, CheckCircle2, Target, Users, Mic, Brain } from "lucide-react";
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
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    fetch(`${apiBase}/share/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("Insights not found or meeting still processing"))
      .then(data => { setIntel(data); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center text-ink-4">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (error || !intel) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center text-ink p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-[20px] font-semibold text-ink mb-2">Unavailable</h2>
          <p className="text-[14px] text-ink-4 mb-6">{error}</p>
          <Link href="/"
            className="inline-block px-6 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[14px] font-semibold transition-colors">
            Go to Notemind
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white pb-20">
      {/* Nav */}
      <nav className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <Mic size={13} className="text-white" />
          </div>
          <span className="font-serif text-ink text-[18px]">Notemind</span>
          <span className="text-[11px] text-ink-4 font-medium ml-2 px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
            Shared Insight
          </span>
        </Link>
        <Link href="/auth"
          className="text-[13px] font-semibold bg-brand hover:bg-brand-mid text-white px-4 py-2 rounded-lg transition-colors">
          Start for Free
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto mt-10 px-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="p-8 border-b border-gray-100 bg-brand-pale">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center">
                <Brain size={12} className="text-white" />
              </div>
              <span className="text-[12px] font-semibold text-brand uppercase tracking-wider">Meeting Intelligence</span>
            </div>
            <p className="text-[15px] text-ink-2 leading-relaxed">
              {intel.summary || "No executive summary provided."}
            </p>
          </div>

          <div className="p-8 space-y-10">
            {intel.key_points && intel.key_points.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-4 mb-4 flex items-center gap-2">
                  <FileText size={14} /> Key Points
                </h2>
                <ul className="space-y-3">
                  {intel.key_points.map((kp, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-ink-2 bg-off-white p-4 rounded-xl border border-gray-100">
                      <span className="text-brand shrink-0 mt-0.5">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {intel.decisions && intel.decisions.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-4 mb-4 flex items-center gap-2">
                  <Target size={14} /> Decisions Made
                </h2>
                <div className="grid gap-3">
                  {intel.decisions.map((dec, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-brand-light bg-brand-pale">
                      <Target size={16} className="text-brand shrink-0 mt-0.5" />
                      <p className="text-[14px] text-ink">{dec}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {intel.action_items && intel.action_items.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-4 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Action Items
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {intel.action_items.map((item, i) => (
                    <div key={i} className="flex flex-col p-5 rounded-xl border border-gray-200 bg-white">
                      <p className="text-[14px] font-semibold text-ink mb-3">{item.task}</p>
                      {item.owner && (
                        <div className="mt-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 text-[12px] font-medium text-ink-4 w-max">
                          <Users size={11} /> {item.owner}
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
          <p className="text-[14px] text-ink-4 mb-4">Want automated insights for your own meetings?</p>
          <Link href="/auth"
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] transition-colors">
            Try Notemind Free
          </Link>
        </div>
      </main>
    </div>
  );
}

