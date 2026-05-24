"use client";

import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function CalendarOnboarding() {
  const handleConnect = () => {
    window.location.href = `${API_BASE}/auth/google-calendar`;
  };

  return (
    <div className="relative z-10">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-medium text-[#8b8b9f]">Step 2 of 2</span>
        <div className="flex gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-[#6366f1]/40" />
          <div className="w-6 h-1.5 rounded-full bg-[#6366f1]" />
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#f8f8fa] mb-2">Connect your calendar</h1>
        <p className="text-[#8b8b9f]">
          Notemind can automatically join your scheduled meetings.
        </p>
      </div>

      {/* Calendar illustration */}
      <div className="w-16 h-16 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center mb-8">
        <CalendarDays size={32} className="text-[#6366f1]" />
      </div>

      {/* Benefits */}
      <ul className="space-y-3 mb-8">
        {[
          "Auto-join meetings from your Google Calendar",
          "Get notified 5 minutes before each meeting",
          "Summaries delivered straight to your inbox",
        ].map((benefit) => (
          <li key={benefit} className="flex items-center gap-3 text-sm text-[#8b8b9f]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>

      {/* Connect button */}
      <button
        onClick={handleConnect}
        className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#818cf8] text-white font-bold py-3 px-4 rounded-xl transition-colors"
      >
        <CalendarDays size={18} />
        Connect Google Calendar
      </button>

      {/* Skip */}
      <div className="text-center mt-5">
        <Link
          href="/dashboard"
          className="text-sm text-[#8b8b9f] hover:text-[#f8f8fa] transition-colors inline-flex items-center gap-1"
        >
          Skip for now <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
