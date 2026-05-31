'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Menu, X, ChevronDown,
  Mic, Brain, Zap, Lock, Calendar, MessageSquare,
  CheckCircle, CheckSquare, Users, Grid3X3, Clock,
  Play, Plus, Minus,
} from 'lucide-react';

// ── Reusable primitives ───────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
      <span className="w-3 h-px bg-brand" />
      {text}
    </span>
  );
}

function RevealWrapper({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-3">
      <span className="w-5 h-5 rounded-full bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle size={12} className="text-brand" />
      </span>
      {text}
    </li>
  );
}

// ── Navbar ────────────────────────────────────────────────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 lg:px-12 justify-between"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,107,60,0.10)' }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-sm">
            <Mic size={13} className="text-white" />
          </div>
          <span className="font-serif text-ink text-[18px] tracking-tight">Notemind</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[14px] font-medium text-ink-3">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/auth" className="text-[14px] font-medium text-ink-3 hover:text-ink transition-colors">
            Sign in
          </Link>
          <Link
            href="/auth"
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-mid text-white text-[14px] font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm"
          >
            Start for free <ArrowRight size={14} />
          </Link>
        </div>

        <button
          aria-label="Open menu"
          className="md:hidden p-2 text-ink-3"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col p-6"
          >
            <div className="flex items-center justify-between mb-10">
              <span className="font-serif text-ink text-lg">Notemind</span>
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 text-ink-3">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              {['#features', '#how', '#pricing', '#faq'].map((href, i) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 border-b border-ink-6 text-lg font-medium text-ink-2"
                >
                  {['Features', 'How it works', 'Pricing', 'FAQ'][i]}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Link href="/auth" onClick={() => setMobileOpen(false)}
                className="w-full text-center py-3.5 border border-ink-6 rounded-xl text-ink-2 font-medium">
                Sign in
              </Link>
              <Link href="/auth" onClick={() => setMobileOpen(false)}
                className="w-full text-center py-3.5 bg-brand text-white rounded-xl font-semibold">
                Start for free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden bg-navy">
      {/* Radial green glow */}
      <div className="absolute inset-0 hero-glow" />
      {/* Bottom fade into off-white */}
      <div className="absolute bottom-0 inset-x-0 h-40 hero-fade-bottom" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto pt-20">
        {/* Animated badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5 glass px-4 py-2 rounded-full text-sm text-white/80 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          AI-powered meeting intelligence
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[56px] md:text-[88px] text-white leading-[1.0] tracking-tight mb-6"
          style={{ textShadow: '0 2px 32px rgba(0,0,0,0.2)' }}
        >
          Never miss<br />
          what <em className="not-italic" style={{ color: '#7de0a4' }}>matters.</em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[18px] font-light text-white/60 max-w-[520px] leading-[1.7] mb-10"
        >
          Notemind joins your calls, transcribes every word, and delivers sharp AI summaries,
          action items, and insights — automatically.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
        >
          <Link
            href="/auth"
            className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold text-[15px] px-8 py-4 rounded-full transition-all w-full sm:w-auto shadow-lg shadow-brand/30"
          >
            Start for free <ArrowRight size={16} />
          </Link>
          <a
            href="#how"
            className="flex items-center justify-center gap-2 glass text-white font-medium text-[15px] px-8 py-4 rounded-full transition-all w-full sm:w-auto hover:bg-white/10"
          >
            <Play size={14} fill="currentColor" /> Watch demo
          </a>
        </motion.div>

        {/* Proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 text-[13px] text-white/35"
        >
          No credit card required · Free 14-day trial
        </motion.p>
      </div>
    </section>
  );
}

// ── Logo Strip ────────────────────────────────────────────────

const LOGOS = ['Intercom', 'Linear', 'Notion', 'Vercel', 'Loom', 'Figma', 'Intercom', 'Linear', 'Notion', 'Vercel', 'Loom', 'Figma'];

function LogoStrip() {
  return (
    <section className="bg-off-white section-divider py-10 overflow-hidden">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4 mb-7">
        Trusted by teams at
      </p>
      <div className="relative">
        <div className="flex gap-16 animate-marquee whitespace-nowrap items-center">
          {LOGOS.map((name, i) => (
            <span key={i} className="font-serif text-xl text-ink-5 shrink-0 tracking-tight">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Dashboard Preview (mock UI) ───────────────────────────────

const MOCK_MEETINGS = [
  {
    title: 'Q3 Product Review',
    status: 'live' as const,
    time: 'Today · 2:00 PM',
    participants: 4,
    summary: 'Discussing Q4 roadmap and mobile app timeline adjustments...',
    tags: ['3 action items', 'Live transcript'],
  },
  {
    title: 'Design Sync — Mobile',
    status: 'done' as const,
    time: 'Today · 10:00 AM',
    participants: 5,
    summary: 'Reviewed onboarding flow, aligned on new typography system...',
    tags: ['5 action items', 'Summary ready'],
  },
  {
    title: 'Investor Update Call',
    status: 'done' as const,
    time: 'Yesterday · 3:30 PM',
    participants: 7,
    summary: 'Series A progress update and Q4 revenue projections...',
    tags: ['2 action items', 'Summary ready'],
  },
  {
    title: 'Customer Onboarding — Acme',
    status: 'done' as const,
    time: 'Yesterday · 11:00 AM',
    participants: 3,
    summary: 'Walked through API setup and integration checklist...',
    tags: ['4 action items', 'Summary ready'],
  },
];

function MockMeetingCard({ m }: { m: typeof MOCK_MEETINGS[0] }) {
  return (
    <div
      className="bg-white rounded-xl p-4 border-l-[3px] border-t border-r border-b"
      style={{
        borderLeftColor: m.status === 'live' ? '#dc2626' : '#1a6b3c',
        borderTopColor: '#f3f4f6',
        borderRightColor: '#f3f4f6',
        borderBottomColor: '#f3f4f6',
        boxShadow: '0 4px 20px rgba(15,26,20,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <p className="text-[13px] font-semibold text-ink truncate">{m.title}</p>
        {m.status === 'live' ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-green-700 bg-brand-light px-2 py-0.5 rounded-full shrink-0">
            Done
          </span>
        )}
      </div>
      <p className="text-[11px] text-ink-4 mb-2">{m.time} · {m.participants} people</p>
      <p className="text-[12px] text-ink-3 leading-relaxed line-clamp-2 mb-3">{m.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {m.tags.map(tag => (
          <span key={tag} className="text-[10px] font-medium text-ink-3 bg-ink-6/60 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <section className="bg-off-white pb-20 section-divider pt-4">
      <div className="max-w-5xl mx-auto px-6">
        <RevealWrapper>
          {/* Browser chrome */}
          <div className="rounded-2xl overflow-hidden border border-ink-6" style={{ boxShadow: '0 24px 80px rgba(15,26,20,0.10)' }}>
            {/* Chrome bar */}
            <div className="bg-ink-6/50 px-4 py-3 flex items-center gap-3 border-b border-ink-6">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-md px-4 py-1 text-[12px] text-ink-4 border border-ink-6 flex items-center gap-1.5">
                  <Lock size={10} />
                  app.notemind.ai/dashboard
                </div>
              </div>
              <div className="w-16" />
            </div>

            {/* App content */}
            <div className="flex bg-white min-h-[420px]">
              {/* Sidebar */}
              <div className="w-[200px] shrink-0 bg-off-white border-r border-ink-6 p-3 flex flex-col gap-1 hidden sm:flex">
                <div className="flex items-center gap-2 px-3 py-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-brand flex items-center justify-center">
                    <Mic size={10} className="text-white" />
                  </div>
                  <span className="font-serif text-[14px] text-ink">Notemind</span>
                </div>
                {[
                  { label: 'All meetings', active: true },
                  { label: 'Upcoming', active: false },
                  { label: 'Action items', active: false },
                  { label: 'AI Memory', active: false },
                  { label: 'Upload', active: false },
                ].map(item => (
                  <div key={item.label} className={`px-3 py-2 rounded-lg text-[12px] font-medium cursor-default ${
                    item.active ? 'bg-brand-light text-brand border-l-2 border-brand pl-[10px]' : 'text-ink-3'
                  }`}>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[14px] text-ink">All meetings</h3>
                  <div className="flex gap-1">
                    {['All', 'Live', 'Completed'].map((f, i) => (
                      <span key={f} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        i === 0 ? 'bg-ink text-white' : 'text-ink-3 bg-ink-6/60'
                      }`}>{f}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MOCK_MEETINGS.map(m => (
                    <MockMeetingCard key={m.title} m={m} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ── Features Grid ─────────────────────────────────────────────

const FEATURES_DATA = [
  { icon: Mic,          title: 'Real-time transcription',  desc: 'Live, speaker-identified transcripts with 98%+ accuracy across 30+ languages.' },
  { icon: Clock,        title: 'Instant AI summaries',     desc: 'Crisp summaries seconds after the call ends — no waiting, no manual review.' },
  { icon: CheckSquare,  title: 'Action item tracking',     desc: 'AI extracts commitments and routes them to the right people automatically.' },
  { icon: MessageSquare,title: 'Ask your meetings',        desc: 'Chat with your entire meeting history in plain English. Cited answers, instantly.' },
  { icon: Users,        title: 'Team intelligence',        desc: 'Shared workspace with role-based access and collaborative summaries.' },
  { icon: Grid3X3,      title: 'Deep integrations',        desc: 'Syncs with 60+ tools including Slack, Notion, Jira, and your calendar.' },
];

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: React.ElementType; title: string; desc: string; delay: number }) {
  return (
    <RevealWrapper delay={delay}>
      <div className="bg-white border border-ink-6 rounded-2xl p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
        <div className="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center mb-5">
          <Icon size={20} className="text-brand" />
        </div>
        <h3 className="text-[16px] font-semibold text-ink mb-2">{title}</h3>
        <p className="text-[14px] text-ink-3 leading-relaxed">{desc}</p>
      </div>
    </RevealWrapper>
  );
}

function FeaturesGrid() {
  return (
    <section id="features" className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <RevealWrapper>
            <SectionLabel text="Built different" />
            <h2 className="font-serif text-[44px] md:text-[56px] text-ink mt-4 mb-4 leading-tight tracking-tight">
              Everything your meetings deserve
            </h2>
            <p className="text-[16px] text-ink-3 max-w-lg mx-auto">
              One tool that handles everything from the moment you join to the last action item.
            </p>
          </RevealWrapper>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES_DATA.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 0.07} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── AI Chat Split ─────────────────────────────────────────────

const CHAT_BUBBLES = [
  { role: 'user', text: 'What did we decide about pricing in last month\'s board meeting?' },
  { role: 'ai', text: 'In the Board Meeting — Sep 12, the team agreed to move to a per-seat pricing model at $18/user/mo, effective Q4. Marcus and Sara were assigned to update the pricing page.', source: 'Board Meeting · Sep 12' },
  { role: 'user', text: 'Did Marcus complete that task?' },
  { role: 'ai', text: 'Based on the Design Review — Sep 19, Marcus confirmed the pricing page was updated and live. He shared the link in the meeting.', source: 'Design Review · Sep 19' },
];

function AIChatSplit() {
  return (
    <section className="bg-off-white section-divider py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
        {/* Text left */}
        <div>
          <RevealWrapper>
            <SectionLabel text="AI Memory" />
            <h2 className="font-serif text-[40px] md:text-[52px] text-ink mt-4 mb-5 leading-tight tracking-tight">
              Your meetings,<br />finally searchable.
            </h2>
            <p className="text-[16px] text-ink-3 leading-relaxed mb-8">
              Ask any question across your entire meeting history. Notemind surfaces the exact moment
              it was discussed, with full context and citations.
            </p>
            <ul className="space-y-3">
              <CheckItem text="Natural language search across all meetings" />
              <CheckItem text="Cited answers with meeting + timestamp" />
              <CheckItem text="Cross-references decisions, action items, and people" />
            </ul>
          </RevealWrapper>
        </div>

        {/* Visual right */}
        <RevealWrapper delay={0.15}>
          <div className="relative rounded-2xl overflow-hidden p-1" style={{
            background: 'linear-gradient(135deg, rgba(26,107,60,0.15), rgba(13,31,45,0.8))',
            boxShadow: '0 32px 80px rgba(13,31,45,0.3)',
          }}>
            <div className="bg-navy rounded-xl p-5 relative overflow-hidden" style={{ aspectRatio: '1.1/1' }}>
              {/* Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #1a6b3c, transparent 70%)', transform: 'translate(30%, -30%)' }} />

              {/* Chat header */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                  <Brain size={13} className="text-white" />
                </div>
                <span className="text-white/80 text-[13px] font-medium">AI Memory</span>
                <span className="ml-auto text-[10px] text-green-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              </div>

              {/* Bubbles */}
              <div className="space-y-3">
                {CHAT_BUBBLES.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.3, duration: 0.4 }}
                    className={`flex ${b.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                      b.role === 'user'
                        ? 'bg-white/10 text-white/80'
                        : 'bg-brand/20 border border-brand/30 text-white/90'
                    }`}>
                      {b.text}
                      {b.source && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] text-green-300/70">
                          ↗ {b.source}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ── Transcript Split ──────────────────────────────────────────

function TranscriptSplit() {
  const TRANSCRIPT_LINES = [
    { speaker: 'Sarah', text: 'I think we should move the mobile timeline to Q1 next year.' },
    { speaker: 'Marcus', text: 'Agreed — the API integration is the main blocker right now.' },
    { speaker: 'You', text: 'Can we get an estimate on the API work by Friday?' },
    { speaker: 'Marcus', text: 'Sure, I\'ll have a breakdown ready by end of week.', active: true },
  ];

  const SPEAKER_COLORS: Record<string, string> = { Sarah: 'bg-teal-500', Marcus: 'bg-blue-500', You: 'bg-brand' };

  return (
    <section className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
        {/* Visual left */}
        <RevealWrapper delay={0.1}>
          <div className="bg-white border border-ink-6 rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 60px rgba(15,26,20,0.08)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-6 bg-off-white">
              <span className="text-[13px] font-semibold text-ink">Q3 Product Review</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Recording
              </span>
            </div>
            {/* AI strip */}
            <div className="px-5 py-3 bg-brand-pale border-b border-brand-light">
              <p className="text-[11px] font-medium text-brand flex items-center gap-1.5">
                <Brain size={11} />
                AI: Team reviewing mobile app timeline adjustments and API blockers...
              </p>
            </div>
            {/* Transcript */}
            <div className="p-5 space-y-4">
              {TRANSCRIPT_LINES.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${SPEAKER_COLORS[line.speaker] ?? 'bg-ink-3'}`}>
                    {line.speaker[0]}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-ink-2 block mb-1">{line.speaker}</span>
                    <p className="text-[13px] text-ink-3 leading-relaxed">
                      {line.text.split(' ').map((word, wi) =>
                        ['API', 'mobile', 'timeline', 'Friday'].includes(word.replace(/[.,?]/g, '')) ? (
                          <mark key={wi} className="bg-brand-light text-brand rounded px-0.5 mx-0.5 not-italic">{word} </mark>
                        ) : (
                          <span key={wi}>{word} </span>
                        )
                      )}
                      {'active' in line && line.active && (
                        <span className="inline-block w-0.5 h-3.5 bg-brand animate-blink ml-0.5 align-text-bottom" />
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealWrapper>

        {/* Text right */}
        <div>
          <RevealWrapper>
            <SectionLabel text="Live Transcription" />
            <h2 className="font-serif text-[40px] md:text-[52px] text-ink mt-4 mb-5 leading-tight tracking-tight">
              Every word,<br /><em style={{ color: '#1a6b3c' }}>perfectly captured.</em>
            </h2>
            <p className="text-[16px] text-ink-3 leading-relaxed mb-10">
              Speaker-identified transcription in real-time. Our AI highlights key decisions and
              action items as they happen, not after.
            </p>
            <div className="grid grid-cols-3 gap-5">
              {[
                { stat: '30+', label: 'Languages' },
                { stat: '98.4%', label: 'Accuracy' },
                { stat: '<500ms', label: 'Latency' },
              ].map(s => (
                <div key={s.stat} className="text-center p-4 bg-brand-pale rounded-xl border border-brand-light">
                  <p className="font-serif text-[28px] text-brand">{s.stat}</p>
                  <p className="text-[12px] text-ink-3 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────

const STEPS = [
  { num: '01', title: 'Connect your calendar', desc: 'Link Google Calendar in one click. Notemind detects all upcoming video meetings automatically.' },
  { num: '02', title: 'Notemind joins the call', desc: 'Your AI notetaker joins as a participant — no app installs needed for attendees.' },
  { num: '03', title: 'Review and act', desc: 'Instant summaries, action items, and searchable transcripts hit your dashboard the moment the call ends.' },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-off-white section-divider py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <RevealWrapper>
            <SectionLabel text="How it works" />
            <h2 className="font-serif text-[40px] md:text-[52px] text-ink mt-4 mb-4 leading-tight tracking-tight">
              Set up in 2 minutes,<br />value from day one.
            </h2>
          </RevealWrapper>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed border-ink-6 z-0" />

          {STEPS.map((step, i) => (
            <RevealWrapper key={step.num} delay={i * 0.1}>
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand/20">
                  <span className="font-serif text-white text-[20px]">{i + 1}</span>
                </div>
                <h3 className="text-[17px] font-semibold text-ink mb-2">{step.title}</h3>
                <p className="text-[14px] text-ink-3 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: 'Notemind turned our weekly syncs from 45 minutes of back-and-forth into 5 minutes of reviewing the AI summary. We never miss an action item.',
    name: 'Sarah Chen', role: 'Head of Product at Vercel', initials: 'SC',
  },
  {
    quote: "The AI memory is genuinely impressive. I asked it about a decision from three months ago and got the exact quote with a timestamp. Game changer.",
    name: 'James Rivera', role: 'Engineering Manager at Linear', initials: 'JR',
  },
  {
    quote: "We've tried every meeting tool. Notemind is the only one that actually works — the action items are automatically assigned and followed up.",
    name: 'Priya Mehta', role: 'Founder at Loom', initials: 'PM',
  },
];

function Testimonials() {
  return (
    <section className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <RevealWrapper>
          <div className="text-center mb-14">
            <SectionLabel text="What teams say" />
            <h2 className="font-serif text-[40px] md:text-[52px] text-ink mt-4 leading-tight tracking-tight">
              Built for teams that move fast.
            </h2>
          </div>
        </RevealWrapper>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <RevealWrapper key={t.name} delay={i * 0.1}>
              <div className="bg-white border border-ink-6 rounded-2xl p-7 h-full flex flex-col" style={{ boxShadow: '0 4px 24px rgba(15,26,20,0.05)' }}>
                <p className="font-serif text-[48px] text-brand/20 leading-none mb-2">&ldquo;</p>
                <p className="text-[15px] text-ink-2 leading-[1.65] font-light flex-1 -mt-3 italic">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-ink-6">
                  <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                    <p className="text-[12px] text-ink-4">{t.role}</p>
                  </div>
                </div>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const proPrice = annual ? 14 : 18;

  return (
    <section id="pricing" className="bg-off-white section-divider py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <RevealWrapper>
          <div className="text-center mb-12">
            <SectionLabel text="Pricing" />
            <h2 className="font-serif text-[40px] md:text-[52px] text-ink mt-4 mb-4 leading-tight tracking-tight">
              Simple, honest pricing.
            </h2>
            <p className="text-[16px] text-ink-3 mb-7">Start free. Upgrade when you need more.</p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-3 bg-white border border-ink-6 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${!annual ? 'bg-ink text-white shadow-sm' : 'text-ink-3'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 ${annual ? 'bg-ink text-white shadow-sm' : 'text-ink-3'}`}
              >
                Annual
                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>
        </RevealWrapper>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Starter */}
          <RevealWrapper delay={0.0}>
            <div className="bg-white border border-ink-6 rounded-2xl p-7 h-full flex flex-col">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-4 mb-4">Starter</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-serif text-[48px] text-ink">$0</span>
                <span className="text-ink-4 text-[14px]">/month</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['5 meetings per month', 'Live transcription', 'Basic AI summaries', 'Google Meet & Zoom', '7-day history'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink-3">
                    <CheckCircle size={14} className="text-brand shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="block w-full text-center py-3 rounded-xl border border-ink-5 text-ink-2 font-semibold text-[14px] hover:bg-ink-6/50 transition-colors">
                Get started free
              </Link>
            </div>
          </RevealWrapper>

          {/* Pro - featured */}
          <RevealWrapper delay={0.08}>
            <div className="bg-navy rounded-2xl p-7 h-full flex flex-col relative overflow-hidden shadow-2xl shadow-navy/40">
              <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 bg-brand text-white text-[11px] font-bold rounded-b-xl tracking-wider">
                MOST POPULAR
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
                style={{ background: 'radial-gradient(circle, #1a6b3c, transparent 70%)', transform: 'translate(30%, -30%)' }} />

              <p className="text-[12px] font-semibold uppercase tracking-wider text-green-400/80 mb-4 relative z-10">Pro</p>
              <div className="flex items-baseline gap-1 mb-1 relative z-10">
                <span className="font-serif text-[48px] text-white">${proPrice}</span>
                <span className="text-green-300/60 text-[14px]">/seat/month</span>
              </div>
              {annual && <p className="text-[12px] text-green-300/60 mb-5 relative z-10">Billed annually</p>}
              {!annual && <div className="mb-5" />}
              <ul className="space-y-2.5 mb-8 flex-1 relative z-10">
                {['Unlimited meetings', 'Multi-stage AI pipeline', 'Action item tracking', 'AI Memory & Search', 'Calendar integration', 'Team workspace', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-green-100/90">
                    <CheckCircle size={14} className="text-green-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="relative z-10 block w-full text-center py-3 rounded-xl bg-brand hover:bg-brand-mid text-white font-semibold text-[14px] transition-colors">
                Start Pro trial
              </Link>
            </div>
          </RevealWrapper>

          {/* Enterprise */}
          <RevealWrapper delay={0.16}>
            <div className="bg-white border border-ink-6 rounded-2xl p-7 h-full flex flex-col">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-4 mb-4">Enterprise</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-serif text-[48px] text-ink">Custom</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['Everything in Pro', 'SSO / SAML', 'SOC 2 compliance', 'Dedicated manager', 'Custom data retention', 'SLA guarantee'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink-3">
                    <CheckCircle size={14} className="text-brand shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@notemind.ai" className="block w-full text-center py-3 rounded-xl border border-ink-5 text-ink-2 font-semibold text-[14px] hover:bg-ink-6/50 transition-colors">
                Contact sales
              </a>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────

const FAQS = [
  { q: 'How does the bot join my meetings?', a: 'Notemind uses a virtual meeting participant that joins your Google Meet or Zoom session as a regular attendee. No app installs are required for other participants — they\'ll simply see "Notemind Bot" in the participant list.' },
  { q: 'Is my meeting data private and secure?', a: 'Yes. All transcripts and recordings are encrypted at rest (AES-256) and in transit (TLS 1.3). Your data is never used to train AI models and is never shared with third parties. We\'re SOC 2 compliant.' },
  { q: 'Can I upload recordings instead of joining live?', a: 'Absolutely. Navigate to the Upload page in your dashboard and drop in an audio or video file (MP3, MP4, WAV, M4A, WebM — up to 500 MB). Transcription and AI analysis happen automatically.' },
  { q: 'Which platforms are supported?', a: 'Notemind currently supports Google Meet and Zoom. Microsoft Teams and Webex support are on the roadmap for Q1.' },
  { q: 'How many languages does transcription support?', a: 'We support 30+ languages including English, Spanish, French, German, Portuguese, Japanese, Mandarin, Hindi, and more. Language is detected automatically.' },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-2xl mx-auto">
        <RevealWrapper>
          <div className="text-center mb-12">
            <SectionLabel text="FAQ" />
            <h2 className="font-serif text-[40px] md:text-[48px] text-ink mt-4 leading-tight tracking-tight">
              Common questions.
            </h2>
          </div>
        </RevealWrapper>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <RevealWrapper key={i} delay={i * 0.05}>
              <div className="border border-ink-6 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-off-white transition-colors"
                  aria-expanded={open === i}
                >
                  <span className="text-[15px] font-medium text-ink">{faq.q}</span>
                  {open === i ? (
                    <Minus size={16} className="text-ink-4 shrink-0 ml-4" />
                  ) : (
                    <Plus size={16} className="text-ink-4 shrink-0 ml-4" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[14px] text-ink-3 leading-relaxed border-t border-ink-6 pt-4">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────

function CTASection() {
  return (
    <section className="px-6 lg:px-8 py-20 bg-off-white section-divider">
      <RevealWrapper>
        <div className="max-w-5xl mx-auto rounded-3xl bg-navy px-8 py-20 text-center overflow-hidden relative">
          {/* Bottom glow */}
          <div className="absolute bottom-0 inset-x-0 h-64 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 110%, rgba(26,107,60,0.5), transparent 70%)' }} />

          <div className="relative z-10">
            <h2 className="font-serif text-[44px] md:text-[64px] text-white tracking-tight mb-4 leading-tight">
              Stop losing what matters.
            </h2>
            <p className="text-green-200/60 text-[18px] mb-10 font-light">
              Every decision, every action item, every insight — captured automatically.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold text-[16px] px-10 py-4 rounded-full transition-colors shadow-lg shadow-brand/30"
            >
              Get started free <ArrowRight size={18} />
            </Link>
            <p className="text-white/25 text-[13px] mt-5">No credit card required · Cancel anytime</p>
          </div>
        </div>
      </RevealWrapper>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────

const FOOTER_COLS = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Developers: ['Docs', 'API Reference', 'Status', 'Security'],
};

function Footer() {
  return (
    <footer className="bg-ink text-white/40 px-6 lg:px-12 pt-16 pb-10 relative overflow-hidden">
      {/* Giant watermark */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 select-none pointer-events-none whitespace-nowrap font-serif leading-none"
        style={{ fontSize: '180px', color: 'rgba(255,255,255,0.025)', bottom: '-20px' }}
      >
        Notemind
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <Mic size={13} className="text-white" />
          </div>
          <span className="font-serif text-white/80 text-[18px]">Notemind</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Description column */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-[13px] text-white/30 leading-relaxed max-w-[200px]">
              AI-powered meeting intelligence for teams that move fast.
            </p>
          </div>

          {Object.entries(FOOTER_COLS).map(([col, links]) => (
            <div key={col}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-400/60 mb-4">{col}</p>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-white/35 hover:text-white/60 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/25">© 2026 Notemind Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-[12px] text-white/25">
            <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/50 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/50 transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-white text-ink selection:bg-brand-light">
      <Navbar />
      <Hero />
      <LogoStrip />
      <DashboardPreview />
      <FeaturesGrid />
      <AIChatSplit />
      <TranscriptSplit />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTASection />
      <Footer />
    </div>
  );
}
