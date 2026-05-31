'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Menu, X,
  Mic, Brain, Search,
  CheckCircle, CheckSquare, Users, Grid3X3, Clock,
  Plus, Minus,
} from 'lucide-react';

// ── Social icon SVGs (lucide-react v1.x dropped brand icons) ──

function IconTwitterX({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconLinkedin({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconGithub({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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

// ── Navbar — Kernel style (transparent on photo bg) ──────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Transparent nav floating over the hero photo */}
      <nav className="fixed top-0 inset-x-0 z-50 h-[68px] flex items-center px-6 lg:px-12">
        {/* Logo — left */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="font-serif text-white text-[22px] tracking-tight">Notemind</span>
        </Link>

        {/* Nav links — absolute center */}
        <div className="hidden md:flex items-center gap-8 text-[14px] font-normal text-white/70 absolute left-1/2 -translate-x-1/2">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq"      className="hover:text-white transition-colors">About</a>
        </div>

        {/* CTA — right (white pill, dark text — exactly Kernel) */}
        <div className="hidden md:flex ml-auto">
          <Link href="/auth"
            className="flex items-center gap-1.5 bg-white hover:bg-white/90 text-[#0d1520] text-[14px] font-semibold px-5 py-2.5 rounded-full transition-all shadow-sm">
            Start for free
          </Link>
        </div>

        <button
          aria-label="Open menu"
          className="md:hidden p-2 text-white ml-auto"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col p-6"
            style={{ background: '#0d1520' }}
          >
            <div className="flex items-center justify-between mb-10">
              <span className="font-serif text-white text-[20px]">Notemind</span>
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 text-white/60">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {[['#features','Features'],['#pricing','Pricing'],['#faq','About']].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="py-4 border-b border-white/10 text-[18px] font-medium text-white/80">
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-auto">
              <Link href="/auth" onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-3.5 bg-white text-[#0d1520] rounded-full font-semibold">
                Start for free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Hero — Kernel style (sky photo + dark overlay) ───────────

const HERO_BG = `
  linear-gradient(to bottom,
    rgba(13,21,32,0.72) 0%,
    rgba(13,21,32,0.45) 45%,
    rgba(13,21,32,0.30) 100%
  ),
  url('/hero-landscape.png') center/cover no-repeat
`;

const HERO_BG_FALLBACK = `
  linear-gradient(170deg,
    #0d1520 0%,
    #0d2035 30%,
    #0e3050 60%,
    #1a4a70 80%,
    #2d6a8a 100%
  )
`;

function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: HERO_BG_FALLBACK }}
    >
      {/* Real photo layer — shows when hero-landscape.png exists */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/hero-landscape.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Dark overlay — matches Kernel's deep navy top */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(13,21,32,0.72) 0%, rgba(13,21,32,0.48) 50%, rgba(13,21,32,0.55) 100%)',
        }}
      />

      {/* Content — vertically centered in upper ~65% */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto w-full pt-44 pb-16">

        {/* Small label — matches Kernel exactly */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[13px] text-white/70 tracking-wide mb-5"
        >
          AI-powered meeting intelligence
        </motion.p>

        {/* Headline — Kernel scale: ~88px desktop, pure white, serif */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[60px] md:text-[88px] text-white leading-[1.05] tracking-tight mb-6"
        >
          The AI Notetaker<br />
          for Modern Teams
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="text-[16px] font-light text-white/60 max-w-[500px] leading-[1.75] mb-10"
        >
          Notemind joins your calls, transcribes every word, and delivers AI summaries,
          action items, and insights — automatically.
        </motion.p>

        {/* Buttons — Kernel layout: ghost left, white-filled right */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.26 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <a
            href="#how"
            className="flex items-center justify-center gap-2 border border-white/30 text-white text-[15px] font-medium px-7 py-3 rounded-full transition-all hover:bg-white/10 w-full sm:w-auto"
          >
            About us
          </a>
          <Link
            href="/auth"
            className="flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-[#0d1520] text-[15px] font-semibold px-7 py-3 rounded-full transition-all w-full sm:w-auto"
          >
            Start for free <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>

      {/* Logo strip — floats on the photo, dark translucent band */}
      <div className="relative z-10 mt-auto">
        <div className="py-5 border-t border-white/10" style={{ background: 'rgba(13,21,32,0.55)', backdropFilter: 'blur(4px)' }}>
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/40 mb-5">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 max-w-3xl mx-auto">
            {['Nietzsche', 'FeatherDev', 'Spherule', 'GlobalBank', 'Linear', 'Notion'].map((name, i) => (
              <span key={i} className="font-serif text-[17px] text-white/50 tracking-tight select-none">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── (LogoStrip removed — integrated into Hero above) ─────────

function LogoStrip() { return null; }

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

// ── CTA Section — Kernel "Get Started" style ─────────────────

function CTASection() {
  return (
    <section
      className="relative overflow-hidden py-28 px-6"
      style={{
        backgroundImage: "url('/hero-landscape.png'), linear-gradient(170deg, #0d1520 0%, #0d2035 40%, #1a4a70 100%)",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Same dark overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(13,21,32,0.65)' }} />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <RevealWrapper>
          <p className="text-[13px] text-white/60 tracking-wide mb-5">Get Started</p>
          <h2 className="font-serif text-[48px] md:text-[64px] text-white leading-[1.05] tracking-tight mb-5">
            Start Automating<br />
            Your Workflows Today
          </h2>
          <p className="text-[16px] font-light text-white/55 max-w-md mx-auto leading-relaxed mb-10">
            Join teams using Notemind to capture every meeting, eliminate manual notes,
            and act faster with AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#how"
              className="border border-white/30 text-white text-[15px] font-medium px-7 py-3 rounded-full hover:bg-white/10 transition-all w-full sm:w-auto text-center">
              About us
            </a>
            <Link href="/auth"
              className="bg-white hover:bg-white/90 text-[#0d1520] text-[15px] font-semibold px-7 py-3 rounded-full transition-all w-full sm:w-auto text-center flex items-center justify-center gap-1.5">
              Start for free <ArrowRight size={15} />
            </Link>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ── Footer — Kernel style (sky bg + large watermark) ─────────

function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{
        backgroundImage: "url('/hero-landscape.png'), linear-gradient(170deg, #0d1520 0%, #0d2035 40%, #1a4a70 100%)",
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(13,21,32,0.78)' }} />

      {/* Giant "Notemind" watermark — Kernel exact position */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 select-none pointer-events-none whitespace-nowrap font-serif leading-none"
        style={{ fontSize: 'clamp(100px, 14vw, 200px)', color: 'rgba(255,255,255,0.07)', lineHeight: 0.85 }}
      >
        Notemind
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pt-16 pb-10">
        {/* Top row: logo+desc+socials | nav columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Logo + description + social icons */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Mic size={16} className="text-white shrink-0" />
              <span className="font-serif text-white text-[20px] leading-tight">Notemind</span>
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed mb-5 max-w-[200px]">
              Notemind helps teams capture every meeting, manage action items, and
              build AI-powered workflows that scale.
            </p>
            {/* Social icons — exactly like Kernel row */}
            <div className="flex items-center gap-3">
              <a href="https://youtube.com" aria-label="YouTube"
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="https://instagram.com" aria-label="Instagram"
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn"
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                <IconLinkedin size={14} />
              </a>
              <a href="https://twitter.com" aria-label="Twitter / X"
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                <IconTwitterX size={14} />
              </a>
            </div>
          </div>

          {/* Nav columns — Kernel has 2 columns */}
          <div className="md:col-span-1 md:col-start-2">
            <ul className="space-y-3">
              {['Home', 'Features', 'Pricing'].map(l => (
                <li key={l}><a href="#" className="text-[14px] text-white/55 hover:text-white/85 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-1">
            <ul className="space-y-3">
              {['About', 'Contact'].map(l => (
                <li key={l}><a href="#" className="text-[14px] text-white/55 hover:text-white/85 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[13px] text-white/30">Copyright © 2026 Notemind</p>
          <div className="flex items-center gap-5 text-[13px] text-white/30">
            <a href="#" className="hover:text-white/55 transition-colors">Privacy policy</a>
            <a href="#" className="hover:text-white/55 transition-colors">Terms of service</a>
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
