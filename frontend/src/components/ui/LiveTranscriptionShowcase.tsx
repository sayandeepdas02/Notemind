'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, BarChart3, ListChecks } from 'lucide-react';

// ─── timing ──────────────────────────────────────────────────────────────────
const STEP_DURATIONS = [1800, 3000, 2000, 1800, 2200]; // 10.8 s total

// ─── data ─────────────────────────────────────────────────────────────────────
const PARTICIPANTS = [
  { i: 'M', name: 'Marcus', color: '#1C80F2' },
  { i: 'S', name: 'Sarah',  color: '#8b5cf6' },
  { i: 'R', name: 'Raj',    color: '#10b981' },
  { i: 'A', name: 'Alicia', color: '#f59e0b' },
  { i: 'J', name: 'James',  color: '#64748b' },
];

const TRANSCRIPT = [
  { i: 'M', speaker: 'Marcus', color: '#60a5fa', words: ["Let's", 'launch', 'pricing', 'changes', 'next', 'Friday.'] },
  { i: 'S', speaker: 'Sarah',  color: '#c4b5fd', words: ["I'll", 'update', 'the', 'landing', 'page', 'copy.'] },
  { i: 'R', speaker: 'Raj',    color: '#6ee7b7', words: ["I'll", 'handle', 'analytics', 'tracking.'] },
];

const HIGHLIGHTS = [
  { type: 'Decision', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',  text: 'Pricing changes next Friday',  owner: null    },
  { type: 'Action',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',  text: 'Update landing page copy',     owner: 'Sarah' },
  { type: 'Action',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',  text: 'Handle analytics tracking',    owner: 'Raj'   },
];

const CHECKLIST = ['Transcript complete', 'Decisions extracted', 'Action items assigned', 'Summary generated'];

const DASHBOARD = [
  {
    icon: ListChecks,
    title: 'Summary',
    lines: ['"Team agreed: pricing changes launch Friday."', 'Q3 Product Planning · 45 min'],
  },
  {
    icon: Check,
    title: 'Actions (2)',
    lines: ['→ Update LP copy  Sarah', '→ Analytics tracking  Raj'],
  },
  {
    icon: BarChart3,
    title: 'Insights',
    lines: ['1 Decision  ·  2 Actions', '45 min  ·  3 speakers'],
  },
];

// ─── spring / easing helpers ──────────────────────────────────────────────────
const spring = { type: 'spring' as const, stiffness: 300, damping: 26 };
const ease   = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

// ─── step panels ─────────────────────────────────────────────────────────────

function StepMeeting() {
  return (
    <motion.div
      key="meeting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6"
      style={{ willChange: 'opacity, transform' }}
    >
      {/* participants */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {PARTICIPANTS.map((p, i) => (
          <motion.div
            key={p.i}
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, delay: i * 0.1 }}
            className="flex flex-col items-center gap-1.5"
            style={{ willChange: 'transform, opacity' }}
          >
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ background: p.color, boxShadow: `0 0 0 3px rgba(255,255,255,0.06)` }}
            >
              {p.i}
              {i === 0 && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-current"
                  style={{ color: p.color }}
                  animate={{ scale: [1, 1.45, 1.45], opacity: [0.7, 0, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </div>
            <span className="text-[10px] text-white/40 font-medium">{p.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Notemind badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...spring, delay: 0.65 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
        style={{
          background: 'rgba(28,128,242,0.12)',
          border: '1px solid rgba(28,128,242,0.28)',
          color: '#93c5fd',
        }}
      >
        <Brain size={13} />
        Notemind joined the meeting
      </motion.div>

      {/* waveform */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex items-center gap-1"
        style={{ willChange: 'opacity' }}
      >
        {[3, 7, 5, 11, 8, 5, 9, 6, 3, 8, 5, 10, 7, 4, 9].map((h, idx) => (
          <motion.div
            key={idx}
            className="w-[3px] rounded-full"
            style={{ height: h, background: '#1C80F2' }}
            animate={{ height: [h, h + 5, h - 1, h + 3, h] }}
            transition={{ duration: 0.55 + idx * 0.03, delay: idx * 0.04, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <span className="ml-2 text-[11px] text-white/40">Recording…</span>
      </motion.div>
    </motion.div>
  );
}

function StepTranscript() {
  return (
    <motion.div
      key="transcript"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-1 overflow-hidden"
      style={{ willChange: 'opacity, transform' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-2">Live Transcript</p>

      {TRANSCRIPT.map((line, li) => (
        <motion.div
          key={li}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: li * 0.9, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="flex gap-3 py-2 px-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
            style={{ background: line.color }}
          >
            {line.i}
          </div>
          <div>
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: line.color }}>{line.speaker}</p>
            <p className="text-[13px] text-white/80 leading-relaxed">
              {line.words.map((word, wi) => (
                <motion.span
                  key={wi}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: li * 0.9 + 0.28 + wi * 0.07, duration: 0.14 }}
                >
                  {word}{' '}
                </motion.span>
              ))}
              {li === TRANSCRIPT.length - 1 && (
                <motion.span
                  className="inline-block w-0.5 h-[13px] bg-blue-400 align-text-bottom rounded-sm"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function StepHighlights() {
  return (
    <motion.div
      key="highlights"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-3"
      style={{ willChange: 'opacity, transform' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-1">AI Detected</p>

      {HIGHLIGHTS.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 18, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spring, delay: i * 0.28 }}
          className="flex items-start gap-3 p-3.5 rounded-xl"
          style={{ background: h.bg, border: `1px solid ${h.border}`, willChange: 'transform, opacity' }}
        >
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide mt-0.5"
            style={{ background: h.bg, border: `1px solid ${h.border}`, color: h.color }}
          >
            {h.type}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-white/88 font-medium leading-snug">{h.text}</p>
            {h.owner && (
              <p className="text-[11px] mt-0.5 font-semibold" style={{ color: h.color }}>
                Owner: {h.owner}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function StepProcessing() {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8"
      style={{ willChange: 'opacity, transform' }}
    >
      {/* pulsing brain */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(28,128,242,0.15)' }}
          animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(28,128,242,0.12)' }}
          animate={{ scale: [1, 1.28, 1.28], opacity: [0.5, 0, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
        />
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(28,128,242,0.18)',
            border: '1px solid rgba(28,128,242,0.38)',
            boxShadow: '0 0 32px rgba(28,128,242,0.22)',
          }}
        >
          <Brain size={24} className="text-blue-400" />
        </div>
      </div>

      {/* checklist */}
      <div className="space-y-2.5 w-full max-w-[220px]">
        {CHECKLIST.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.32, ...ease }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.32 + 0.16, ...spring }}
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#1C80F2', boxShadow: '0 0 8px rgba(28,128,242,0.4)' }}
            >
              <Check size={10} className="text-white" strokeWidth={3} />
            </motion.div>
            <span className="text-[13px] text-white/72 font-medium">{item}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function StepDashboard() {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ease}
      className="absolute inset-0 p-4 flex flex-col gap-3"
      style={{ willChange: 'opacity' }}
    >
      <div className="grid grid-cols-3 gap-2 flex-1">
        {DASHBOARD.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.14 }}
              className="rounded-xl p-3 flex flex-col gap-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                willChange: 'transform, opacity',
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(28,128,242,0.2)' }}
                >
                  <Icon size={10} className="text-blue-400" />
                </div>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wide">{card.title}</span>
              </div>
              <div className="space-y-1.5">
                {card.lines.map((ln, j) => (
                  <motion.p
                    key={j}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.14 + j * 0.12 + 0.35 }}
                    className={`leading-snug ${j === 0 ? 'text-[11px] text-white/72' : 'text-[10px] text-white/35'}`}
                  >
                    {ln}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="text-center text-[12px] font-medium pb-0.5"
      >
        <span className="text-white/40">Meeting finished. </span>
        <span className="text-blue-400">Work already organized.</span>
      </motion.p>
    </motion.div>
  );
}

// ─── step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Meeting',    panel: <StepMeeting />     },
  { label: 'Transcript', panel: <StepTranscript />  },
  { label: 'Detection',  panel: <StepHighlights />  },
  { label: 'Processing', panel: <StepProcessing />  },
  { label: 'Complete',   panel: <StepDashboard />   },
];

// ─── main export ──────────────────────────────────────────────────────────────
export function LiveTranscriptionShowcase() {
  const [step, setStep]   = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setStep(s => (s + 1) % STEPS.length), STEP_DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, paused]);

  return (
    <div
      className="w-full max-w-2xl mx-auto select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: '#0a0f1a',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 0 1px rgba(28,128,242,0.08), 0 32px 72px rgba(0,0,0,0.45), 0 0 60px rgba(28,128,242,0.06)',
        }}
      >
        {/* ── window chrome ── */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-1.5">
            {['#ff5f57', '#ffbc2e', '#28c840'].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
            ))}
          </div>
          <span className="text-[12px] font-medium text-white/45 flex-1 text-center pr-10">
            Q3 Product Planning
          </span>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Rec</span>
          </div>
        </div>

        {/* ── content area (fixed height to prevent layout shift) ── */}
        <div className="relative" style={{ height: 320 }}>
          <AnimatePresence mode="wait">
            {STEPS[step].panel}
          </AnimatePresence>
        </div>

        {/* ── progress dots ── */}
        <div
          className="flex items-center justify-center gap-2 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={s.label}
              className="flex items-center"
              aria-label={`Go to step ${i + 1}: ${s.label}`}
            >
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === step ? 20 : 6,
                  opacity: i === step ? 1 : 0.28,
                  background: '#1C80F2',
                }}
                style={{ height: 5 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          ))}
          <AnimatePresence>
            {paused && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-4 text-[10px] text-white/25"
              >
                Paused
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
