"use client";

import Link from "next/link";
import { CalendarDays, ArrowRight, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function CalendarOnboarding() {
  const handleConnect = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("notemind_token") : null;
    window.location.href = `${API_BASE}/auth/google-calendar${token ? `?token=${token}` : ""}`;
  };

  return (
    <div className="relative z-10">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[11px] font-medium text-ink-4">Step 2 of 2</span>
        <div className="flex gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-brand/40" />
          <div className="w-6 h-1.5 rounded-full bg-brand" />
        </div>
      </div>

      <div className="mb-7">
        <h1 className="font-serif text-[30px] text-ink mb-2 tracking-tight">Connect your calendar</h1>
        <p className="text-[14px] text-ink-4">
          Notemind can automatically join your scheduled meetings.
        </p>
      </div>

      {/* Calendar icon */}
      <div className="w-16 h-16 rounded-2xl bg-brand-light border border-brand/20 flex items-center justify-center mb-8">
        <CalendarDays size={30} className="text-brand" />
      </div>

      {/* Benefits */}
      <ul className="space-y-3 mb-8">
        {[
          "Auto-join meetings from your Google Calendar",
          "Get notified 5 minutes before each meeting",
          "Summaries delivered straight to your inbox",
        ].map((benefit) => (
          <li key={benefit} className="flex items-center gap-3 text-[14px] text-ink-3">
            <CheckCircle size={16} className="text-brand shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>

      {/* Connect button */}
      <button
        onClick={handleConnect}
        className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-[15px]"
      >
        <CalendarDays size={18} />
        Connect Google Calendar
      </button>

      {/* Skip */}
      <div className="text-center mt-5">
        <Link
          href="/dashboard"
          className="text-[13px] text-ink-5 hover:text-ink-3 transition-colors inline-flex items-center gap-1.5"
        >
          Skip for now <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
