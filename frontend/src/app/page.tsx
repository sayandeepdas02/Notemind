'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Menu, X,
  Mic, Brain, Search,
  CheckCircle, CheckSquare, Users, Grid3X3, Clock,
  Plus, Minus, Twitter, Linkedin, Github,
  Sparkles, Play, CheckCircle2,
} from 'lucide-react';

// ── Logo (shared) ─────────────────────────────────────────────

function Logo({ size = 'sm', invert = false }: { size?: 'sm' | 'md'; invert?: boolean }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <div className={`${dim} rounded-xl flex items-center justify-center shrink-0`}
      style={{ background: invert ? 'rgba(255,255,255,0.15)' : '#1a6b3c' }}>
      <Mic size={iconSize} className="text-white" />
    </div>
  );
}

// ── Reusable primitives ───────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
      <span className="w-4 h-px bg-brand" />
      {text}
      <span className="w-4 h-px bg-brand" />
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
    <li className="flex items-start gap-3 text-[15px] text-ink-3">
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
        className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 lg:px-12"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,107,60,0.10)' }}
      >
        {/* Logo — left */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size="sm" />
          <span className="font-serif text-ink text-[18px] tracking-tight">Notemind</span>
        </Link>

        {/* Nav links — true center */}
        <div className="hidden md:flex items-center gap-7 text-[14px] font-medium text-ink-4 absolute left-1/2 -translate-x-1/2">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
        </div>

        {/* CTAs — right */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          <Link href="/auth"
            className="text-[14px] font-medium text-ink-2 border border-ink-6 hover:border-ink-5 hover:text-ink px-4 py-2 rounded-xl transition-colors">
            Sign in
          </Link>
          <Link href="/auth"
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-mid text-white text-[14px] font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
            Start for free <ArrowRight size={14} />
          </Link>
        </div>

        <button
          aria-label="Open menu"
          className="md:hidden p-2 text-ink-3 ml-auto"
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
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col p-6"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2.5">
                <Logo size="sm" />
                <span className="font-serif text-ink text-lg">Notemind</span>
              </div>
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 text-ink-3">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {[['#features','Features'],['#how','How it works'],['#pricing','Pricing'],['#faq','FAQ']].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="py-3.5 border-b border-ink-6 text-[17px] font-medium text-ink-2">
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Link href="/auth" onClick={() => setMobileOpen(false)}
                className="w-full text-center py-3.5 border border-ink-5 rounded-xl text-ink-2 font-medium">
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
    <section className="relative min-h-[94vh] flex flex-col items-center justify-center overflow-hidden bg-navy pt-16">
      {/* Radial green glow */}
      <div className="absolute inset-0 hero-glow" />
      {/* Softer, taller bottom fade */}
      <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{
        height: '280px',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(248,250,249,0.6) 60%, #f8faf9 100%)',
      }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">

        {/* Social proof badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 glass px-4 py-2 rounded-full text-[13px] text-white/75 mb-8"
        >
          <Sparkles size={13} className="text-green-300 shrink-0" />
          10,000+ meetings transcribed this week
        </motion.div>

        {/* Headline — no trailing period */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[52px] md:text-[84px] text-white leading-[1.02] tracking-tight mb-6"
          style={{ textShadow: '0 2px 32px rgba(0,0,0,0.2)' }}
        >
          Never miss<br />
          what <em className="not-italic" style={{ color: '#7de0a4' }}>matters</em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[17px] font-light text-white/55 max-w-[500px] leading-[1.75] mb-10"
        >
          Notemind joins your calls, transcribes every word, and delivers sharp AI summaries,
          action items, and insights — automatically.
        </motion.p>

        {/* CTAs — clear primary/secondary hierarchy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-5 w-full sm:w-auto"
        >
          <Link href="/auth"
            className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold text-[16px] px-10 py-4 rounded-xl transition-all w-full sm:w-auto shadow-xl shadow-brand/30">
            Start for free <ArrowRight size={17} />
          </Link>
          <a href="#how"
            className="flex items-center justify-center gap-2 text-white/55 hover:text-white/80 font-medium text-[14px] transition-colors w-full sm:w-auto py-2">
            <Play size={13} fill="currentColor" className="text-white/40" />
            Watch 2-min demo
          </a>
        </motion.div>

        {/* Proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[12px] text-white/30 mb-12"
        >
          No credit card required · Free 14-day trial · Cancel anytime
        </motion.p>

        {/* Visual anchor — floating summary card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
          style={{ filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.35))' }}
        >
          <div className="glass rounded-2xl p-5 text-left" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[13px] font-semibold text-white/85">Q3 Product Review</span>
              </div>
              <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                AI Summary ready
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: CheckCircle2, label: '4 action items', color: '#7de0a4' },
                { icon: Brain,        label: 'AI summary generated', color: '#86efac' },
                { icon: Users,        label: '5 participants identified', color: '#6ee7b7' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon size={13} style={{ color }} />
                  <span className="text-[13px] text-white/60">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Logo Strip — static, no marquee ──────────────────────────

const LOGO_COMPANIES = ['Intercom', 'Linear', 'Notion', 'Vercel', 'Loom', 'Figma'];

function LogoStrip() {
  return (
    <section className="bg-off-white section-divider py-10">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-5 mb-8">
        Trusted by teams at
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 max-w-3xl mx-auto">
        {LOGO_COMPANIES.map((name, i) => (
          <span key={i} className="font-serif text-[20px] text-ink-5/60 tracking-tight select-none">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Dashboard Preview (mock UI) ───────────────────────────────

const MOCK_MEETINGS = [
  { title: 'Q3 Product Review', status: 'live' as const, time: 'Today · 2:00 PM', participants: 4, summary: 'Discussing Q4 roadmap and mobile app timeline adjustments...', tags: ['3 action items', 'Live transcript'] },
  { title: 'Design Sync — Mobile', status: 'done' as const, time: 'Today · 10:00 AM', participants: 5, summary: 'Reviewed onboarding flow, aligned on new typography system...', tags: ['5 action items', 'Summary ready'] },
  { title: 'Investor Update Call', status: 'done' as const, time: 'Yesterday · 3:30 PM', participants: 7, summary: 'Series A progress update and Q4 revenue projections...', tags: ['2 action items', 'Summary ready'] },
  { title: 'Customer Onboarding — Acme', status: 'done' as const, time: 'Yesterday · 11:00 AM', participants: 3, summary: 'Walked through API setup and integration checklist...', tags: ['4 action items', 'Summary ready'] },
];

function MockMeetingCard({ m }: { m: typeof MOCK_MEETINGS[0] }) {
  return (
    <div className="bg-white rounded-xl p-4 border-l-[3px]"
      style={{
        borderLeftColor: m.status === 'live' ? '#dc2626' : '#1a6b3c',
        border: '1px solid #f3f4f6',
        borderLeft: `3px solid ${m.status === 'live' ? '#dc2626' : '#1a6b3c'}`,
        boxShadow: '0 2px 12px rgba(15,26,20,0.05)',
      }}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <p className="text-[13px] font-semibold text-ink truncate">{m.title}</p>
        {m.status === 'live' ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-brand bg-brand-light px-2 py-0.5 rounded-full shrink-0">Done</span>
        )}
      </div>
      <p className="text-[11px] text-ink-5 mb-2">{m.time} · {m.participants} people</p>
      <p className="text-[12px] text-ink-3 leading-relaxed line-clamp-2 mb-3">{m.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {m.tags.map(tag => (
          <span key={tag} className="text-[10px] font-medium text-ink-4 bg-ink-6/50 px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <section className="bg-off-white pb-20 pt-4">
      <div className="max-w-5xl mx-auto px-6">
        <RevealWrapper>
          <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: '0 24px 80px rgba(15,26,20,0.10)' }}>
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-3 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-lg px-4 py-1 text-[12px] text-ink-4 border border-gray-200 flex items-center gap-1.5 max-w-[240px] w-full justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  app.notemind.ai/dashboard
                </div>
              </div>
              <div className="w-16" />
            </div>
            <div className="flex bg-white min-h-[400px]">
              <div className="w-[200px] shrink-0 bg-off-white border-r border-gray-100 p-3 flex-col gap-1 hidden sm:flex">
                <div className="flex items-center gap-2 px-3 py-2 mb-3">
                  <Logo size="sm" />
                  <span className="font-serif text-[14px] text-ink">Notemind</span>
                </div>
                {[{ label: 'All meetings', active: true }, { label: 'Upcoming', active: false }, { label: 'Action items', active: false }, { label: 'AI Memory', active: false }, { label: 'Upload', active: false }].map(item => (
                  <div key={item.label} className={`px-3 py-2 rounded-lg text-[12px] font-medium cursor-default ${item.active ? 'bg-brand-light text-brand border-l-2 border-brand pl-[10px]' : 'text-ink-3'}`}>{item.label}</div>
                ))}
              </div>
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[14px] text-ink">All meetings</h3>
                  <div className="flex gap-1">{['All', 'Live', 'Completed'].map((f, i) => (
                    <span key={f} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${i === 0 ? 'bg-ink text-white' : 'text-ink-3 bg-gray-100'}`}>{f}</span>
                  ))}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MOCK_MEETINGS.map(m => <MockMeetingCard key={m.title} m={m} />)}
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
  { icon: Mic,         title: 'Real-time transcription',  desc: 'Live, speaker-identified transcripts with 98%+ accuracy across 30+ languages.' },
  { icon: Clock,       title: 'Instant AI summaries',     desc: 'Crisp summaries seconds after the call ends — no waiting, no manual review.' },
  { icon: CheckSquare, title: 'Action item tracking',     desc: 'AI extracts commitments and routes them to the right people automatically.' },
  { icon: Search,      title: 'Ask your meetings',        desc: 'Search your entire history in plain English. Cited answers with timestamps.' },
  { icon: Users,       title: 'Team intelligence',        desc: 'Shared workspace with role-based access and collaborative summaries.' },
  { icon: Grid3X3,     title: 'Deep integrations',        desc: 'Syncs with 60+ tools including Slack, Notion, Jira, and your calendar.' },
];

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: React.ElementType; title: string; desc: string; delay: number }) {
  return (
    <RevealWrapper delay={delay}>
      <div className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 h-full">
        <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center mb-5">
          <Icon size={22} className="text-brand" />
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
            <h2 className="font-serif text-[44px] md:text-[56px] text-ink mt-5 mb-4 leading-[1.08] tracking-tight">
              Everything your meetings deserve
            </h2>
            <p className="text-[16px] text-ink-3 max-w-md mx-auto">
              One tool that handles everything from the moment you join to the last action item.
            </p>
          </RevealWrapper>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES_DATA.map((f, i) => <FeatureCard key={f.title} {...f} delay={i * 0.07} />)}
        </div>
      </div>
    </section>
  );
}

// ── AI Chat Split ─────────────────────────────────────────────

const CHAT_BUBBLES = [
  { role: 'user', text: 'What did we decide about pricing in the board meeting last month?' },
  { role: 'ai',   text: 'The team agreed to move to per-seat pricing at $18/user/mo, effective Q4. Marcus and Sara were assigned to update the pricing page.', source: 'Board Meeting · Sep 12' },
  { role: 'user', text: 'Did Marcus complete that task?' },
  { role: 'ai',   text: 'Yes — Marcus confirmed the pricing page was updated and live in the Design Review.', source: 'Design Review · Sep 19' },
];

function AIChatSplit() {
  return (
    <section className="bg-off-white section-divider py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <RevealWrapper>
            <SectionLabel text="AI Memory" />
            <h2 className="font-serif text-[44px] md:text-[56px] text-ink mt-5 mb-5 leading-[1.08] tracking-tight">
              Your meetings,<br />finally searchable
            </h2>
            <p className="text-[16px] text-ink-3 leading-relaxed mb-8">
              Ask any question across your entire meeting history. Notemind surfaces the exact moment
              it was discussed, with full context and cited sources.
            </p>
            <ul className="space-y-3.5">
              <CheckItem text="Natural language search across all meetings" />
              <CheckItem text="Cited answers with meeting name + timestamp" />
              <CheckItem text="Cross-references decisions, action items, and people" />
            </ul>
          </RevealWrapper>
        </div>

        <RevealWrapper delay={0.15}>
          <div className="rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(26,107,60,0.12), rgba(13,31,45,0.85))',
            padding: '1px',
            boxShadow: '0 32px 80px rgba(13,31,45,0.28)',
          }}>
            <div className="bg-navy rounded-[14px] p-5" style={{ aspectRatio: '1.1/1' }}>
              <div className="absolute-off top-0 right-0 w-60 h-60 rounded-full opacity-15 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #1a6b3c, transparent 70%)', position: 'absolute' }} />

              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                  <Brain size={13} className="text-white" />
                </div>
                <span className="text-white/75 text-[13px] font-medium">AI Memory</span>
                <span className="ml-auto text-[10px] text-green-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Online
                </span>
              </div>

              <div className="space-y-3">
                {CHAT_BUBBLES.map((b, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + i * 0.3, duration: 0.4 }}
                    className={`flex ${b.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                      b.role === 'user' ? 'bg-white/10 text-white/75' : 'bg-brand/20 border border-brand/30 text-white/90'
                    }`}>
                      {b.text}
                      {b.source && (
                        <div className="mt-2 pt-1.5 border-t border-white/10">
                          {/* Citation as a proper pill */}
                          <span className="inline-flex items-center gap-1 bg-green-400/15 border border-green-400/25 text-green-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            ↗ {b.source}
                          </span>
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
  const KEYWORDS = new Set(['API', 'mobile', 'timeline', 'Friday']);

  return (
    <section className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Visual */}
        <RevealWrapper delay={0.1}>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 60px rgba(15,26,20,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-off-white">
              <span className="text-[13px] font-semibold text-ink">Q3 Product Review</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Recording
              </span>
            </div>
            <div className="px-5 py-3 bg-brand-pale border-b border-brand-light">
              <p className="text-[11px] font-medium text-brand flex items-center gap-1.5">
                <Brain size={11} />AI: Team reviewing mobile app timeline adjustments and API blockers…
              </p>
            </div>
            <div className="p-5 space-y-5">
              {TRANSCRIPT_LINES.map((line, i) => (
                <div key={i} className="flex gap-3.5">
                  {/* Larger speaker avatar — 30px */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${SPEAKER_COLORS[line.speaker] ?? 'bg-ink-3'}`}>
                    {line.speaker[0]}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-ink-2 block mb-1">{line.speaker}</span>
                    <p className="text-[13px] text-ink-3 leading-relaxed">
                      {line.text.split(' ').map((word, wi) => {
                        const clean = word.replace(/[.,?]/g, '');
                        return KEYWORDS.has(clean) ? (
                          <mark key={wi} className="bg-green-100 text-green-800 rounded-md px-1.5 py-0.5 mx-0.5 not-italic font-medium text-[12px]">{word} </mark>
                        ) : <span key={wi}>{word} </span>;
                      })}
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

        {/* Text */}
        <div>
          <RevealWrapper>
            <SectionLabel text="Live Transcription" />
            <h2 className="font-serif text-[44px] md:text-[56px] text-ink mt-5 mb-5 leading-[1.08] tracking-tight">
              Every word,<br /><em className="not-italic" style={{ color: '#1a6b3c' }}>perfectly captured</em>
            </h2>
            <p className="text-[16px] text-ink-3 leading-relaxed mb-10">
              Speaker-identified transcription in real-time. Our AI highlights key decisions and
              action items as they happen, not after.
            </p>
            {/* Stats with dividers */}
            <div className="flex items-stretch gap-0 border border-gray-200 rounded-2xl overflow-hidden">
              {[
                { stat: '30+', label: 'Languages' },
                { stat: '98.4%', label: 'Accuracy' },
                { stat: '<500ms', label: 'Latency' },
              ].map((s, i) => (
                <div key={s.stat} className={`flex-1 text-center py-5 px-3 ${i < 2 ? 'border-r border-gray-200' : ''}`}>
                  <p className="font-serif text-[30px] text-brand leading-none">{s.stat}</p>
                  <p className="text-[12px] text-ink-4 mt-1.5">{s.label}</p>
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
  { num: 1, title: 'Connect your calendar', desc: 'Link Google Calendar in one click. Notemind detects all upcoming video meetings automatically.' },
  { num: 2, title: 'Notemind joins the call', desc: 'Your AI notetaker joins as a participant — no app installs needed for any attendees.' },
  { num: 3, title: 'Review and act', desc: 'Instant summaries, action items, and searchable transcripts the moment the call ends.' },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-off-white section-divider py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <RevealWrapper>
            <SectionLabel text="How it works" />
            <h2 className="font-serif text-[44px] md:text-[52px] text-ink mt-5 mb-4 leading-tight tracking-tight">
              Set up in 2 minutes,<br />value from day one
            </h2>
          </RevealWrapper>
        </div>

        <div className="relative">
          {/* Dashed connector — explicit inline styles to guarantee render */}
          <div className="hidden md:block absolute" style={{
            top: '20px',
            left: 'calc(16.67% + 32px)',
            right: 'calc(16.67% + 32px)',
            height: '2px',
            borderTop: '2px dashed #deeae2',
            zIndex: 0,
          }} />

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <RevealWrapper key={step.num} delay={i * 0.12}>
                <div className="relative z-10 text-center">
                  {/* Outlined circle, not filled */}
                  <div className="w-10 h-10 rounded-full border-2 border-brand bg-white flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <span className="font-semibold text-[15px] text-brand">{step.num}</span>
                  </div>
                  <h3 className="text-[17px] font-semibold text-ink mb-2">{step.title}</h3>
                  <p className="text-[14px] text-ink-3 leading-relaxed max-w-[240px] mx-auto">{step.desc}</p>
                </div>
              </RevealWrapper>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────

const TESTIMONIALS = [
  { quote: 'Notemind turned our weekly syncs from 45 minutes of back-and-forth into 5 minutes of reviewing the AI summary. We never miss an action item.', name: 'Sarah Chen', role: 'Head of Product at Vercel', initials: 'SC', avatarBg: 'bg-teal-600' },
  { quote: 'The AI memory is genuinely impressive. I asked about a decision from three months ago and got the exact quote with a timestamp. Game changer.', name: 'James Rivera', role: 'Engineering Manager at Linear', initials: 'JR', avatarBg: 'bg-brand' },
  { quote: "We've tried every meeting tool. Notemind is the only one that actually works — action items are assigned and followed up automatically.", name: 'Priya Mehta', role: 'Founder at Loom', initials: 'PM', avatarBg: 'bg-blue-600' },
];

function Testimonials() {
  return (
    <section className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <RevealWrapper>
          <div className="text-center mb-14">
            <SectionLabel text="What teams say" />
            <h2 className="font-serif text-[44px] md:text-[52px] text-ink mt-5 leading-tight tracking-tight">
              Built for teams that move fast
            </h2>
          </div>
        </RevealWrapper>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <RevealWrapper key={t.name} delay={i * 0.1}>
              <div className="bg-white border border-gray-200 rounded-2xl p-7 h-full flex flex-col" style={{ boxShadow: '0 4px 24px rgba(15,26,20,0.05)' }}>
                {/* Smaller, lighter decorative quote */}
                <p className="font-serif text-[28px] text-ink-5/40 leading-none mb-3 select-none">&ldquo;</p>
                <p className="text-[15px] text-ink-2 leading-[1.7] font-light flex-1 italic">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
                  {/* Varied avatar colors */}
                  <div className={`w-9 h-9 rounded-full ${t.avatarBg} flex items-center justify-center text-white text-[12px] font-bold shrink-0`}>
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
            <h2 className="font-serif text-[44px] md:text-[52px] text-ink mt-5 mb-4 leading-tight tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="text-[16px] text-ink-3 mb-8">Start free. Upgrade when you need more.</p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${!annual ? 'bg-ink text-white shadow-sm' : 'text-ink-3 hover:text-ink'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${annual ? 'bg-ink text-white shadow-sm' : 'text-ink-3 hover:text-ink'}`}
              >
                Annual
                {/* More prominent savings badge */}
                <span className="text-[11px] font-bold text-white bg-brand px-2 py-0.5 rounded-full">−20%</span>
              </button>
            </div>
          </div>
        </RevealWrapper>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {/* Starter */}
          <RevealWrapper delay={0.0}>
            <div className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4 mb-4">Starter</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-serif text-[52px] text-ink leading-none">$0</span>
                <span className="text-ink-4 text-[14px] self-end mb-1">/mo</span>
              </div>
              <p className="text-[12px] text-ink-5 mb-6">Free forever</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['5 meetings per month', 'Live transcription', 'Basic AI summaries', 'Google Meet & Zoom', '7-day history'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink-3">
                    <CheckCircle size={14} className="text-brand shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="block w-full text-center py-3 rounded-xl border border-gray-300 text-ink-2 font-semibold text-[14px] hover:bg-gray-50 transition-colors">
                Get started free
              </Link>
            </div>
          </RevealWrapper>

          {/* Pro — featured, more elevated */}
          <RevealWrapper delay={0.08}>
            <div className="rounded-2xl p-7 flex flex-col relative overflow-hidden" style={{
              background: '#0d1f2d',
              boxShadow: '0 0 0 1px rgba(26,107,60,0.3), 0 24px 60px rgba(13,31,45,0.4)',
            }}>
              <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 bg-brand text-white text-[11px] font-bold rounded-b-xl tracking-wider whitespace-nowrap">
                MOST POPULAR
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #1a6b3c, transparent 70%)', transform: 'translate(30%, -30%)' }} />

              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-400/70 mb-4 relative z-10">Pro</p>
              <div className="flex items-baseline gap-1 mb-1 relative z-10">
                <span className="font-serif text-[52px] text-white leading-none">${proPrice}</span>
                <span className="text-green-300/50 text-[14px] self-end mb-1">/seat/mo</span>
              </div>
              <p className="text-[12px] text-green-300/40 mb-6 relative z-10">
                {annual ? 'Billed annually' : 'Billed monthly'}
              </p>
              <ul className="space-y-2.5 mb-8 flex-1 relative z-10">
                {['Unlimited meetings', 'Multi-stage AI pipeline', 'Action item tracking', 'AI Memory & Search', 'Calendar integration', 'Team workspace', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-green-100/85">
                    {/* Brighter checks on dark bg */}
                    <CheckCircle size={14} className="shrink-0" style={{ color: '#4ade80' }} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="relative z-10 block w-full text-center py-3.5 rounded-xl bg-brand hover:bg-brand-mid text-white font-semibold text-[15px] transition-colors">
                Start Pro trial
              </Link>
            </div>
          </RevealWrapper>

          {/* Enterprise */}
          <RevealWrapper delay={0.16}>
            <div className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4 mb-4">Enterprise</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-serif text-[36px] text-ink leading-none">Custom</span>
              </div>
              <p className="text-[12px] text-ink-5 mb-6">Contact us for pricing</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {['Everything in Pro', 'SSO / SAML', 'SOC 2 compliance', 'Dedicated manager', 'Custom data retention', 'SLA guarantee'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink-3">
                    <CheckCircle size={14} className="text-brand shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@notemind.ai" className="block w-full text-center py-3 rounded-xl border border-gray-300 text-ink-2 font-semibold text-[14px] hover:bg-gray-50 transition-colors">
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
  { q: 'How does the bot join my meetings?', a: "Notemind uses a virtual meeting participant that joins your Google Meet or Zoom session as a regular attendee. No app installs are required — attendees simply see \"Notemind Bot\" in the participant list." },
  { q: 'Is my meeting data private and secure?', a: 'All transcripts are encrypted at rest (AES-256) and in transit (TLS 1.3). Your data is never used to train AI models and never shared with third parties. SOC 2 compliant.' },
  { q: 'Can I upload recordings instead of joining live?', a: 'Yes. Navigate to Upload in your dashboard and drop in an audio or video file (MP3, MP4, WAV, M4A, WebM — up to 500 MB). Transcription and analysis happen automatically.' },
  { q: 'Which platforms are supported?', a: 'Notemind currently supports Google Meet and Zoom. Microsoft Teams and Webex are on the roadmap for Q1.' },
  { q: 'How many languages are supported?', a: 'We support 30+ languages including English, Spanish, French, German, Portuguese, Japanese, Mandarin, Hindi, and more. Language is detected automatically.' },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-24 px-6 lg:px-12">
      <div className="max-w-2xl mx-auto">
        <RevealWrapper>
          <div className="text-center mb-12">
            <SectionLabel text="FAQ" />
            {/* No trailing period — consistent with other H2s */}
            <h2 className="font-serif text-[40px] md:text-[48px] text-ink mt-5 leading-tight tracking-tight">
              Common questions
            </h2>
          </div>
        </RevealWrapper>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <RevealWrapper key={i} delay={i * 0.04}>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                  aria-expanded={open === i}
                >
                  <span className="text-[15px] font-medium text-ink pr-4">{faq.q}</span>
                  {/* Larger, bolder expand icon */}
                  <div className="shrink-0 w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-ink-3">
                    {open === i ? <Minus size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                  </div>
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
                      <p className="px-6 pb-5 pt-1 text-[14px] text-ink-3 leading-relaxed border-t border-gray-100">
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
        <div className="max-w-5xl mx-auto rounded-3xl bg-navy px-12 py-24 text-center overflow-hidden relative">
          <div className="absolute bottom-0 inset-x-0 h-72 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 120%, rgba(26,107,60,0.55), transparent 70%)' }} />
          <div className="relative z-10">
            {/* Consistent no trailing period */}
            <h2 className="font-serif text-[44px] md:text-[64px] text-white tracking-tight mb-4 leading-[1.05]">
              Stop losing what matters
            </h2>
            <p className="text-green-200/55 text-[17px] mb-10 font-light max-w-md mx-auto leading-relaxed">
              Every decision, every action item, every insight — captured automatically from every call.
            </p>
            <Link href="/auth"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold text-[16px] px-12 py-4 rounded-xl transition-colors shadow-xl shadow-brand/30">
              Get started free <ArrowRight size={18} />
            </Link>
            {/* Secondary text CTA */}
            <p className="mt-5 text-white/25 text-[13px]">
              No credit card required ·{' '}
              <a href="#how" className="text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors">
                Watch 2-min demo →
              </a>
            </p>
          </div>
        </div>
      </RevealWrapper>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────

const FOOTER_COLS = {
  Product:    ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company:    ['About', 'Blog', 'Careers', 'Press'],
  Developers: ['Docs', 'API Reference', 'Status', 'Security'],
};

function Footer() {
  return (
    <footer className="bg-ink text-white/50 px-6 lg:px-12 pt-16 pb-10 relative overflow-hidden">
      {/* Giant watermark */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 select-none pointer-events-none whitespace-nowrap font-serif leading-none"
        style={{ fontSize: '180px', color: 'rgba(255,255,255,0.025)', bottom: '-20px' }}
      >
        Notemind
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Logo + description */}
        <div className="flex items-start gap-3 mb-12">
          <Logo size="sm" invert />
          <div>
            <span className="font-serif text-white/80 text-[18px] block leading-tight">Notemind</span>
            <p className="text-[13px] text-white/30 mt-1 max-w-[180px] leading-relaxed">
              AI-powered meeting intelligence for teams that move fast.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Spacer column on desktop to align with logo */}
          <div className="hidden md:block" />

          {Object.entries(FOOTER_COLS).map(([col, links]) => (
            <div key={col}>
              {/* Clearly differentiated column header */}
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 mb-4">{col}</p>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-white/55 hover:text-white/85 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* No "Inc." */}
          <p className="text-[12px] text-white/25">© 2026 Notemind. All rights reserved.</p>

          {/* Social icons */}
          <div className="flex items-center gap-4">
            <a href="https://twitter.com" aria-label="Twitter / X" className="text-white/30 hover:text-white/60 transition-colors">
              <Twitter size={16} />
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" className="text-white/30 hover:text-white/60 transition-colors">
              <Linkedin size={16} />
            </a>
            <a href="https://github.com" aria-label="GitHub" className="text-white/30 hover:text-white/60 transition-colors">
              <Github size={16} />
            </a>
          </div>

          <div className="flex items-center gap-5 text-[12px] text-white/25">
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
