'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight, Sparkles, CheckCircle, Menu, X,
  ChevronDown, Mic, Brain, Zap, Lock, Calendar, MessageSquare,
} from 'lucide-react';

// ── Navbar ────────────────────────────────────────────────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 lg:px-12 justify-between"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
            <Mic size={14} className="text-white" />
          </div>
          <span className="text-gray-900 font-bold text-lg tracking-tight">Notemind</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-gray-600">
          <Link href="#features" className="hover:text-gray-900 transition-colors">Features</Link>
          <Link href="#why" className="hover:text-gray-900 transition-colors">Why Notemind</Link>
          <Link href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/auth" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <Link href="/auth"
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-[15px] font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm">
            Get started free <ArrowRight size={15} />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <span className="text-gray-900 font-bold text-lg">Notemind</span>
            <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-600">
              <X size={22} />
            </button>
          </div>
          <nav className="flex flex-col gap-4 text-lg font-medium text-gray-700">
            <Link href="#features" onClick={() => setMobileOpen(false)} className="py-2 border-b border-gray-100">Features</Link>
            <Link href="#why" onClick={() => setMobileOpen(false)} className="py-2 border-b border-gray-100">Why Notemind</Link>
            <Link href="#pricing" onClick={() => setMobileOpen(false)} className="py-2 border-b border-gray-100">Pricing</Link>
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Link href="/auth" onClick={() => setMobileOpen(false)}
              className="w-full text-center py-3 border border-gray-200 rounded-xl text-gray-700 font-medium">
              Sign in
            </Link>
            <Link href="/auth" onClick={() => setMobileOpen(false)}
              className="w-full text-center py-3 bg-green-600 text-white rounded-xl font-semibold">
              Get started free
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-landscape.png')" }}
      />
      {/* Fallback gradient (shown if image not loaded) */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-teal-900" />
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.55) 100%)'
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto pt-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-white mb-8"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
        >
          <Sparkles size={14} className="text-green-300" />
          Now with Google Calendar sync
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[44px] md:text-[68px] font-extrabold text-white leading-[1.08] tracking-tight mb-6"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
        >
          Every meeting,<br />
          <span className="text-green-300">perfectly captured.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[20px] font-normal max-w-[560px] leading-relaxed mb-10"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          Notemind joins your calls, transcribes every word, and delivers AI-powered
          summaries so your team can focus on the conversation.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link href="/auth"
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold text-base px-8 py-4 rounded-full transition-all shadow-lg w-full sm:w-auto"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
          >
            Start for free <ArrowRight size={18} />
          </Link>
          <Link href="#features"
            className="flex items-center justify-center gap-2 font-semibold text-base px-8 py-4 rounded-full transition-all w-full sm:w-auto"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
          >
            See how it works
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-5 text-sm"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          Free forever plan · No credit card · Works with Google Meet &amp; Zoom
        </motion.p>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <ChevronDown size={22} className="animate-bounce" />
      </motion.div>
    </section>
  );
}

// ── Logo Strip ────────────────────────────────────────────────

const LOGOS = ['Intercom', 'Notion', 'Linear', 'Vercel', 'Figma', 'ActiveCampaign', 'Intercom', 'Notion', 'Linear', 'Vercel', 'Figma', 'ActiveCampaign'];

function LogoStrip() {
  return (
    <section className="py-14 bg-white border-b border-gray-100 overflow-hidden">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
        Trusted by teams at
      </p>
      <div className="relative">
        <div className="flex gap-16 animate-marquee whitespace-nowrap">
          {LOGOS.map((name, i) => (
            <span key={i} className="text-lg font-bold text-gray-300 shrink-0 tracking-tight">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────

const FEATURES = [
  {
    bg: '#fefce8',
    iconBg: '#fef08a',
    icon: Mic,
    iconColor: '#854d0e',
    title: 'Capture every word, live.',
    body: "Notemind's bot joins your Google Meet or Zoom and transcribes in real-time with speaker identification — no installs for attendees.",
  },
  {
    bg: '#f0fdfa',
    iconBg: '#99f6e4',
    icon: Brain,
    iconColor: '#0f766e',
    title: 'AI summaries in seconds.',
    body: 'Key decisions, action items, and next steps — automatically extracted and delivered the moment your meeting ends.',
  },
  {
    bg: '#f0fdf4',
    iconBg: '#bbf7d0',
    icon: MessageSquare,
    iconColor: '#15803d',
    title: 'Ask anything about your meetings.',
    body: 'Search across every meeting you\'ve ever had. Ask questions in plain English and get cited answers instantly.',
  },
];

function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" ref={ref} className="py-24 px-6 lg:px-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Label */}
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-full">
            <Sparkles size={13} /> AI-Powered · Real-time · Private
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-[48px] font-bold text-gray-900 tracking-tight mb-4">
            Close the loop from meeting to action
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Everything your team needs from the moment a meeting starts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
                style={{ background: f.bg }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm" style={{ background: f.iconBg }}>
                  <Icon size={22} style={{ color: f.iconColor }} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Testimonial ───────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: 'Notemind turned our weekly syncs from 45 minutes of back-and-forth into 5 minutes of reviewing the AI summary. We never miss an action item.',
    name: 'Sarah Chen',
    role: 'Head of Product at Vercel',
    initials: 'SC',
  },
  {
    quote: "We've tried every meeting tool. Notemind is the only one that actually works — the AI summaries are accurate and the action items are automatically assigned.",
    name: 'James Rivera',
    role: 'Engineering Manager at Linear',
    initials: 'JR',
  },
];

function Testimonial() {
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const t = TESTIMONIALS[idx];

  return (
    <section ref={ref} className="px-6 lg:px-8 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto rounded-3xl overflow-hidden"
        style={{ background: '#ccfbf1' }}
      >
        <div className="flex flex-col lg:flex-row">
          {/* Left visual */}
          <div className="lg:w-2/5 bg-gradient-to-br from-teal-600 to-green-700 flex items-center justify-center p-12 min-h-[280px]">
            <div className="text-center text-white">
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-4xl font-bold">3×</p>
                  <p className="text-sm text-teal-100 mt-1">faster meeting follow-up</p>
                </div>
                <div>
                  <p className="text-4xl font-bold">100%</p>
                  <p className="text-sm text-teal-100 mt-1">action item capture</p>
                </div>
              </div>
              <p className="text-teal-100 text-sm mt-4">Average across Notemind teams</p>
            </div>
          </div>

          {/* Right quote */}
          <div className="lg:w-3/5 p-10 lg:p-14 flex flex-col justify-center">
            <p className="text-6xl text-teal-600 font-serif leading-none opacity-30 mb-2">&ldquo;</p>
            <p className="text-xl text-gray-800 leading-relaxed font-medium mb-8 -mt-4">
              {t.quote}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setIdx((idx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 flex items-center justify-center font-bold transition-colors shadow-sm text-lg"
              >
                ←
              </button>
              <button
                onClick={() => setIdx((idx + 1) % TESTIMONIALS.length)}
                className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 flex items-center justify-center font-bold transition-colors shadow-sm text-lg"
              >
                →
              </button>
              <span className="text-sm text-gray-400 ml-2">{idx + 1} / {TESTIMONIALS.length}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ── Statement ─────────────────────────────────────────────────

function Statement() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-24 px-6 lg:px-12 bg-white">
      <motion.div
        initial={{ opacity: 0.2, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        className="max-w-[900px] mx-auto text-center"
      >
        <p className="text-[28px] md:text-[38px] text-gray-900 font-medium leading-[1.4] tracking-tight">
          Notemind helps engineering, product, and sales teams{' '}
          <span className="text-green-600">capture every meeting insight</span>,
          connect the dots across conversations, and move faster — with total
          confidence nothing was missed.
        </p>
      </motion.div>
    </section>
  );
}

// ── Photo Mosaic ──────────────────────────────────────────────

const MOSAIC = [
  { rotate: '-1deg', h: 'h-52', label: 'Team standup' },
  { rotate: '0.8deg', h: 'h-64', label: 'Product review' },
  { rotate: '-0.5deg', h: 'h-56', label: 'Client call' },
  { rotate: '1.2deg', h: 'h-60', label: 'Design sync' },
  { rotate: '-0.7deg', h: 'h-48', label: 'All-hands' },
];

function PhotoMosaic() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-16 px-6 lg:px-12 bg-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-center gap-4 md:gap-6">
          {MOSAIC.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`flex-1 min-w-0 max-w-[200px] ${m.h} rounded-xl bg-gray-200 overflow-hidden shadow-md`}
              style={{ transform: `rotate(${m.rotate})` }}
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-end p-3">
                <span className="text-xs text-gray-500 font-medium">{m.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Bento Grid ────────────────────────────────────────────────

function BentoGrid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="why" ref={ref} className="py-24 px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-[46px] font-bold text-gray-900 tracking-tight mb-4">Why Notemind?</h2>
          <p className="text-gray-500 text-lg">Built for the way modern teams actually work.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card A */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
              <Zap size={26} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Built for real meetings</h3>
            <p className="text-gray-500 leading-relaxed text-base">
              Works with Google Meet and Zoom out of the box. Join with one click — no installs
              required for attendees. Your bot shows up, your team doesn't have to think about it.
            </p>
          </motion.div>

          {/* Card B — visual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-2xl overflow-hidden min-h-[240px] bg-gradient-to-br from-green-800 to-teal-900 flex items-center justify-center shadow-md"
          >
            <div className="text-center px-8">
              <p className="text-6xl mb-3">🌿</p>
              <p className="text-white/80 text-sm font-medium">Nature-inspired. Human-first.</p>
            </div>
          </motion.div>

          {/* Card C */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl p-8 shadow-sm"
            style={{ background: '#fef9c3' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-yellow-200 flex items-center justify-center mb-6">
              <Lock size={26} className="text-yellow-800" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Enterprise-grade security</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              SOC 2 compliant. Your transcripts are encrypted at rest and in transit.
              Never used to train AI models. Your conversations stay yours.
            </p>
          </motion.div>

          {/* Card D */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
              <Calendar size={26} className="text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Connects to your stack</h3>
            <p className="text-gray-500 leading-relaxed text-base mb-6">
              Integrates with Notion, Slack, and your calendar for a seamless workflow.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Notion', 'Slack', 'Google Calendar', 'Zoom', 'Meet'].map(name => (
                <span key={name} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────

function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const FREE_FEATURES = ['5 meetings per month', 'Live transcription', 'Basic AI summaries', 'Google Meet & Zoom'];
  const PRO_FEATURES = ['Unlimited meetings', 'Multi-stage AI pipeline', 'Action item tracking', 'AI Memory & Search', 'Calendar integration', 'Priority support'];

  return (
    <section id="pricing" ref={ref} className="py-24 px-6 lg:px-12 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-[46px] font-bold text-gray-900 tracking-tight mb-4">Simple, honest pricing</h2>
          <p className="text-gray-500 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Free</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-extrabold text-gray-900">$0</span>
              <span className="text-gray-400 font-medium">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckCircle size={16} className="text-green-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth"
              className="block w-full text-center py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-green-600 rounded-2xl p-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-green-500 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2" />
            <p className="text-sm font-semibold text-green-200 uppercase tracking-wider mb-4 relative z-10">Pro</p>
            <div className="flex items-baseline gap-1 mb-6 relative z-10">
              <span className="text-5xl font-extrabold text-white">$15</span>
              <span className="text-green-200 font-medium">/month</span>
            </div>
            <ul className="space-y-3 mb-8 relative z-10">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-green-50">
                  <CheckCircle size={16} className="text-green-300 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth"
              className="relative z-10 block w-full text-center py-3 rounded-xl bg-white text-green-700 font-semibold hover:bg-green-50 transition-colors">
              Start Pro trial
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────

function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="px-6 lg:px-8 py-20 bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto rounded-3xl bg-green-900 px-8 py-16 text-center overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/hero-landscape.png')" }} />
        <div className="relative z-10">
          <h2 className="text-4xl md:text-[52px] font-bold text-white tracking-tight mb-4 leading-tight">
            Start capturing your<br />meetings today.
          </h2>
          <p className="text-green-200 text-lg mb-10">Free forever. No credit card required.</p>
          <Link href="/auth"
            className="inline-flex items-center gap-2 bg-green-400 hover:bg-green-300 text-green-950 font-semibold text-base px-8 py-4 rounded-full transition-colors">
            Get started free <ArrowRight size={18} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────

const FOOTER_LINKS = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Docs', 'API', 'Status', 'Security'],
  Social: ['Twitter / X', 'LinkedIn', 'GitHub', 'Discord'],
};

function Footer() {
  return (
    <footer className="bg-[#052e16] text-white px-6 lg:px-12 pt-16 pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <Mic size={14} className="text-white" />
          </div>
          <span className="font-bold text-lg">Notemind</span>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col}>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-4">{col}</p>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/50 hover:text-white/80 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">© 2026 Notemind Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/70 transition-colors">Cookies</a>
          </div>
        </div>
      </div>

      {/* Mobile floating CTA */}
      <div className="fixed bottom-4 inset-x-4 z-40 md:hidden">
        <Link href="/auth"
          className="block w-full text-center py-4 bg-green-600 text-white font-semibold rounded-2xl shadow-xl">
          Get started free →
        </Link>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-green-100">
      <Navbar />
      <Hero />
      <LogoStrip />
      <Features />
      <Testimonial />
      <Statement />
      <PhotoMosaic />
      <BentoGrid />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
