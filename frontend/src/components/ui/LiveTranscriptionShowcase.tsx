'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, BarChart3, FileText, List } from 'lucide-react';

// ─── timing (ms per step) — total ≈ 11 s ─────────────────────────────────────
const DURATIONS = [1800, 3200, 2000, 1800, 2200] as const;

// ─── data ─────────────────────────────────────────────────────────────────────

const PARTICIPANTS = [
  { i: 'M', name: 'Marcus', bg: '#3b82f6' },
  { i: 'S', name: 'Sarah',  bg: '#8b5cf6' },
  { i: 'R', name: 'Raj',    bg: '#10b981' },
  { i: 'A', name: 'Alicia', bg: '#f59e0b' },
  { i: 'J', name: 'James',  bg: '#64748b' },
];

const LINES = [
  { i: 'M', speaker: 'Marcus', c: '#60a5fa', words: ["Let's", 'launch', 'pricing', 'changes', 'next', 'Friday.'] },
  { i: 'S', speaker: 'Sarah',  c: '#c4b5fd', words: ["I'll", 'update', 'the', 'landing', 'page', 'copy.']        },
  { i: 'R', speaker: 'Raj',    c: '#6ee7b7', words: ["I'll", 'handle', 'analytics', 'tracking.']                 },
];

const DETECTIONS = [
  { type: 'Decision',    text: 'Pricing changes next Friday', owner: null,    ac: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  br: 'rgba(251,191,36,0.20)'  },
  { type: 'Action Item', text: 'Update landing page copy',    owner: 'Sarah', ac: '#60a5fa', bg: 'rgba(96,165,250,0.08)', br: 'rgba(96,165,250,0.20)'  },
  { type: 'Action Item', text: 'Handle analytics tracking',   owner: 'Raj',   ac: '#60a5fa', bg: 'rgba(96,165,250,0.08)', br: 'rgba(96,165,250,0.20)'  },
];

const CHECKLIST = ['Transcript complete', 'Decisions extracted', 'Action items assigned', 'Summary generated'];

const DASH_CARDS = [
  { Icon: FileText,  label: 'Summary',      lines: ['"Team agreed: pricing changes launch Friday."', 'Q3 Product Planning · 45 min'] },
  { Icon: List,      label: 'Actions (2)',   lines: ['→ Update LP copy  Sarah',    '→ Analytics  Raj']                                },
  { Icon: BarChart3, label: 'Insights',      lines: ['1 decision · 2 actions',     '45 min · 3 speakers']                             },
];

// ─── motion helpers ───────────────────────────────────────────────────────────
const spr  = { type: 'spring' as const, stiffness: 300, damping: 26 };
const ease = { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const };

// ─── step 0: meeting card ─────────────────────────────────────────────────────
function StepMeeting() {
  return (
    <motion.div
      key="meeting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4"
    >
      {/* Avatars */}
      <div className="flex items-end gap-3 flex-wrap justify-center">
        {PARTICIPANTS.map((p, i) => (
          <motion.div
            key={p.i}
            initial={{ opacity: 0, scale: 0.5, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spr, delay: i * 0.1 }}
            className="flex flex-col items-center gap-1.5"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="relative">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ background: p.bg }}
              >
                {p.i}
              </div>
              {i === 0 && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: p.bg }}
                  animate={{ scale: [1, 1.55, 1.55], opacity: [0.7, 0, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </div>
            <span className="text-[10px] text-white/38">{p.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spr, delay: 0.68 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium"
        style={{
          background: 'rgba(28,128,242,0.10)',
          border: '1px solid rgba(28,128,242,0.28)',
          color: '#93c5fd',
        }}
      >
        <Brain size={13} />
        Notemind joined the meeting
      </motion.div>

      {/* Waveform */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.05 }}
        className="flex items-center gap-1"
      >
        {[4, 9, 6, 13, 8, 5, 11, 7, 3, 9, 6, 12, 8, 4, 10].map((h, idx) => (
          <motion.div
            key={idx}
            className="w-[3px] rounded-full"
            style={{ height: h, background: '#1C80F2', willChange: 'height' }}
            animate={{ height: [h, h + 5, h - 1, h + 4, h] }}
            transition={{ duration: 0.55 + idx * 0.03, delay: idx * 0.04, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <span className="ml-2.5 text-[11px] text-white/32">Listening…</span>
      </motion.div>
    </motion.div>
  );
}

// ─── step 1: live transcript ──────────────────────────────────────────────────
function StepTranscript() {
  return (
    <motion.div
      key="transcript"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/22 mb-1">
        Live Transcript
      </p>

      {LINES.map((line, li) => (
        <motion.div
          key={li}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: li * 1.0, ...ease }}
          className="flex gap-3 px-3.5 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Avatar */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
            style={{ background: line.c + '22', border: `1px solid ${line.c}40`, color: line.c }}
          >
            {line.i}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: line.c }}>{line.speaker}</p>
            <p className="text-[13px] text-white/78 leading-relaxed">
              {line.words.map((word, wi) => (
                <motion.span
                  key={wi}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: li * 1.0 + 0.28 + wi * 0.08, duration: 0.14 }}
                >
                  {word}{' '}
                </motion.span>
              ))}
              {li === LINES.length - 1 && (
                <motion.span
                  className="inline-block w-0.5 h-[13px] bg-blue-400 align-text-bottom rounded-sm"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.85, repeat: Infinity }}
                />
              )}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── step 2: ai detections ────────────────────────────────────────────────────
function StepHighlights() {
  return (
    <motion.div
      key="highlights"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/22 mb-0.5">
        AI Detected
      </p>

      {DETECTIONS.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spr, delay: i * 0.28 }}
          className="flex items-start gap-3 p-3.5 rounded-xl"
          style={{ background: d.bg, border: `1px solid ${d.br}`, willChange: 'transform, opacity' }}
        >
          {/* badge */}
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide mt-0.5"
            style={{ background: d.bg, border: `1px solid ${d.br}`, color: d.ac }}
          >
            {d.type}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white/86 leading-snug">{d.text}</p>
            {d.owner && (
              <p className="text-[11px] mt-0.5 font-semibold" style={{ color: d.ac }}>
                Owner: {d.owner}
              </p>
            )}
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spr, delay: i * 0.28 + 0.18 }}
          >
            <Check size={12} style={{ color: d.ac }} strokeWidth={3} />
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── step 3: ai processing ────────────────────────────────────────────────────
function StepProcessing() {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6"
    >
      {/* Glowing brain orb */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: 92, height: 92, border: '1px solid rgba(28,128,242,0.15)' }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.05, 0.55] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Mid ring */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: 70, height: 70, border: '1px solid rgba(28,128,242,0.25)' }}
          animate={{ scale: [1, 1.11, 1], opacity: [0.65, 0.12, 0.65] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', delay: 0.38 }}
        />
        {/* Core */}
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(28,128,242,0.22) 0%, rgba(8,14,26,0.96) 100%)',
            border: '1px solid rgba(28,128,242,0.42)',
            boxShadow: '0 0 30px rgba(28,128,242,0.28), 0 0 60px rgba(28,128,242,0.10)',
          }}
        >
          <Brain size={22} className="text-blue-400" />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2.5">
        {CHECKLIST.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3, ...ease }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.3 + 0.15, ...spr }}
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#1C80F2', boxShadow: '0 0 10px rgba(28,128,242,0.45)' }}
            >
              <Check size={10} className="text-white" strokeWidth={3} />
            </motion.div>
            <span className="text-[13px] text-white/68 font-medium">{item}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── step 4: dashboard ────────────────────────────────────────────────────────
function StepDashboard() {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ease}
      className="absolute inset-0 p-4 flex flex-col gap-3"
    >
      <div className="grid grid-cols-3 gap-2 flex-1">
        {DASH_CARDS.map(({ Icon, label, lines }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spr, delay: i * 0.14 }}
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              willChange: 'transform, opacity',
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: 'rgba(28,128,242,0.18)' }}
              >
                <Icon size={10} className="text-blue-400" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/42">{label}</span>
            </div>
            <div className="space-y-1.5">
              {lines.map((ln, j) => (
                <motion.p
                  key={j}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.14 + j * 0.1 + 0.35 }}
                  className={j === 0 ? 'text-[11px] text-white/72 leading-snug' : 'text-[10px] text-white/30'}
                >
                  {ln}
                </motion.p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* End caption */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.62 }}
        className="text-center text-[12px] font-medium pb-0.5"
      >
        <span className="text-white/38">Meeting finished. </span>
        <span style={{ color: '#60a5fa' }}>Work already organized.</span>
      </motion.p>
    </motion.div>
  );
}

// ─── step registry ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'meeting',    label: 'Meeting',    Panel: StepMeeting    },
  { key: 'transcript', label: 'Transcript', Panel: StepTranscript },
  { key: 'detection',  label: 'Detection',  Panel: StepHighlights },
  { key: 'processing', label: 'Processing', Panel: StepProcessing },
  { key: 'complete',   label: 'Complete',   Panel: StepDashboard  },
];

// ─── export ───────────────────────────────────────────────────────────────────
export function LiveTranscriptionShowcase() {
  const [step, setStep]     = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(
      () => setStep(s => (s + 1) % STEPS.length),
      DURATIONS[step],
    );
    return () => clearTimeout(t);
  }, [step, paused]);

  const { key, Panel } = STEPS[step];

  return (
    <div
      className="select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Card shell */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#070d1a',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow:
            '0 0 0 1px rgba(28,128,242,0.06), 0 24px 64px rgba(0,0,0,0.55), 0 0 80px rgba(28,128,242,0.04)',
        }}
      >
        {/* macOS chrome */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-1.5">
            {(['#ff5f57', '#febc2e', '#28c840'] as const).map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.82 }} />
            ))}
          </div>
          <span className="flex-1 text-center text-[12px] font-medium text-white/38 pr-10">
            Q3 Product Planning
          </span>
          {/* REC badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.28, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Rec</span>
          </div>
        </div>

        {/* Animated content — fixed height prevents layout shift */}
        <div className="relative" style={{ height: 356 }}>
          <AnimatePresence mode="wait">
            <Panel key={key} />
          </AnimatePresence>
        </div>

        {/* Step progress pills */}
        <div
          className="relative flex items-center justify-center gap-2 py-3.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={s.label}
              aria-label={`Step ${i + 1}: ${s.label}`}
              className="flex items-center"
            >
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === step ? 20 : 6,
                  background: i === step ? '#1C80F2' : 'rgba(255,255,255,0.18)',
                }}
                style={{ height: 5 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          ))}
          <AnimatePresence>
            {paused && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-4 text-[10px] text-white/22"
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
