'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, BarChart3, FileText, List, Users } from 'lucide-react';

// ─── timing ──────────────────────────────────────────────────────────────────
const DURATIONS = [2000, 3200, 2200, 2000, 2400] as const;

// ─── data ─────────────────────────────────────────────────────────────────────
const PARTICIPANTS = [
  { i: 'M', name: 'Marcus' },
  { i: 'S', name: 'Sarah'  },
  { i: 'R', name: 'Raj'    },
  { i: 'A', name: 'Alicia' },
  { i: 'J', name: 'James'  },
];

const LINES = [
  { i: 'M', speaker: 'Marcus', words: ["Let's", 'launch', 'pricing', 'changes', 'next', 'Friday.']       },
  { i: 'S', speaker: 'Sarah',  words: ["I'll",  'update', 'the',     'landing', 'page',  'copy.']        },
  { i: 'R', speaker: 'Raj',    words: ["I'll",  'handle', 'analytics', 'tracking.']                      },
];

const DETECTIONS = [
  { type: 'Decision',    text: 'Pricing changes next Friday', owner: null    },
  { type: 'Action Item', text: 'Update landing page copy',    owner: 'Sarah' },
  { type: 'Action Item', text: 'Handle analytics tracking',   owner: 'Raj'   },
];

const CHECKLIST = ['Transcript complete', 'Decisions extracted', 'Action items assigned', 'Summary generated'];

const DASH_CARDS = [
  { Icon: FileText,  label: 'Summary',    lines: ['"Pricing changes launch Friday."', 'Q3 Planning · 45 min']  },
  { Icon: List,      label: 'Actions (2)',lines: ['Update LP copy — Sarah',            'Analytics — Raj']       },
  { Icon: BarChart3, label: 'Insights',   lines: ['1 decision · 2 actions',            '45 min · 3 speakers']  },
];

// ─── avatar blue palette ──────────────────────────────────────────────────────
const AV = ['#1C80F2', '#2563eb', '#3b82f6', '#1d4ed8', '#60a5fa'];

// ─── motion presets ───────────────────────────────────────────────────────────
const spr  = { type: 'spring' as const, stiffness: 320, damping: 28 };
const ease = { duration: 0.44, ease: [0.22, 1, 0.36, 1] as const };

// ─── glass card style ─────────────────────────────────────────────────────────
const glass = {
  background:     'rgba(255,255,255,0.04)',
  border:         '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(10px)',
  boxShadow:      'inset 0 1px 0 rgba(255,255,255,0.05)',
} as const;

const glassBlue = {
  background:     'rgba(28,128,242,0.09)',
  border:         '1px solid rgba(28,128,242,0.24)',
  backdropFilter: 'blur(10px)',
} as const;

// ─── step 0: meeting card ─────────────────────────────────────────────────────
function StepMeeting() {
  return (
    <motion.div
      key="meeting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6"
    >
      {/* Meeting meta */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...ease, delay: 0.1 }}
        className="text-center"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400/55 mb-2">In Progress</p>
        <h3 className="text-[20px] font-bold text-white/90 tracking-tight">Q3 Product Planning</h3>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <Users size={10} className="text-white/28" />
          <span className="text-[11px] text-white/28">5 participants</span>
        </div>
      </motion.div>

      {/* Avatars */}
      <div className="flex items-end gap-3">
        {PARTICIPANTS.map((p, i) => (
          <motion.div
            key={p.i}
            initial={{ opacity: 0, scale: 0.4, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spr, delay: 0.2 + i * 0.09 }}
            className="flex flex-col items-center gap-1.5"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="relative">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-[13px]"
                style={{
                  background: `linear-gradient(145deg, ${AV[i]}, ${AV[i]}99)`,
                  boxShadow: `0 0 0 2px rgba(5,11,24,0.9), 0 0 18px ${AV[i]}33`,
                }}
              >
                {p.i}
              </div>
              {i === 0 && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-blue-400"
                  animate={{ scale: [1, 1.65, 1.65], opacity: [0.55, 0, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </div>
            <span className="text-[10px] text-white/26 font-medium">{p.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Notemind joined badge */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spr, delay: 0.75 }}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-full"
        style={{
          ...glassBlue,
          boxShadow: '0 4px 20px rgba(28,128,242,0.16), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.3, repeat: Infinity }}
        />
        <Brain size={12} className="text-blue-400" />
        <span className="text-[12px] font-semibold text-blue-200/80">Notemind joined the meeting</span>
      </motion.div>

      {/* Waveform */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex items-center gap-[3px]"
      >
        {[4, 10, 7, 14, 9, 5, 12, 8, 4, 10, 6, 13, 8, 5, 10].map((h, idx) => (
          <motion.div
            key={idx}
            className="w-[3px] rounded-full"
            style={{
              height: h,
              background: `rgba(28,128,242,${0.38 + (idx % 3) * 0.18})`,
              willChange: 'height',
            }}
            animate={{ height: [h, h + 7, h - 1, h + 5, h] }}
            transition={{ duration: 0.52 + idx * 0.03, delay: idx * 0.04, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <span className="ml-3 text-[11px] text-white/25 font-medium">Listening…</span>
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
      exit={{ opacity: 0, y: -8 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-2.5"
    >
      <div className="flex items-center gap-2 mb-1">
        <motion.div
          className="w-2 h-2 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.05, repeat: Infinity }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/20">Live Transcript</p>
      </div>

      {LINES.map((line, li) => (
        <motion.div
          key={li}
          initial={{ opacity: 0, x: -16, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: li * 1.02, ...ease }}
          className="flex gap-3 px-4 py-3 rounded-2xl"
          style={{ ...glass, willChange: 'transform, opacity' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
            style={{
              background: 'rgba(28,128,242,0.18)',
              border: '1px solid rgba(28,128,242,0.32)',
              color: '#93c5fd',
            }}
          >
            {line.i}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold mb-1 text-blue-300/70 uppercase tracking-widest">{line.speaker}</p>
            <p className="text-[13px] text-white/78 leading-relaxed">
              {line.words.map((word, wi) => (
                <motion.span
                  key={wi}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: li * 1.02 + 0.22 + wi * 0.09, duration: 0.15 }}
                >
                  {word}{' '}
                </motion.span>
              ))}
              {li === LINES.length - 1 && (
                <motion.span
                  className="inline-block w-[2px] h-[14px] bg-blue-400 align-text-bottom rounded-sm"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.82, repeat: Infinity }}
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
      exit={{ opacity: 0, y: -8 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 mb-0.5">
        <motion.div
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(28,128,242,0.20)', border: '1px solid rgba(28,128,242,0.35)' }}
          animate={{ boxShadow: ['0 0 0px rgba(28,128,242,0)', '0 0 12px rgba(28,128,242,0.4)', '0 0 0px rgba(28,128,242,0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain size={8} className="text-blue-300" />
        </motion.div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/20">AI Detected</p>
      </div>

      {DETECTIONS.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 24, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spr, delay: i * 0.30 }}
          className="flex items-start gap-3.5 p-4 rounded-2xl"
          style={{ ...glassBlue, willChange: 'transform, opacity' }}
        >
          <span
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-0.5"
            style={{
              background: 'rgba(28,128,242,0.16)',
              border: '1px solid rgba(28,128,242,0.32)',
              color: '#93c5fd',
            }}
          >
            {d.type}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/88 leading-snug">{d.text}</p>
            {d.owner && (
              <p className="text-[11px] mt-1 font-medium" style={{ color: '#60a5fa' }}>
                Owner: <span className="font-bold">{d.owner}</span>
              </p>
            )}
          </div>

          <motion.div
            initial={{ scale: 0, rotate: -120 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spr, delay: i * 0.30 + 0.22 }}
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(28,128,242,0.20)',
              border: '1px solid rgba(28,128,242,0.38)',
              boxShadow: '0 0 10px rgba(28,128,242,0.28)',
            }}
          >
            <Check size={9} className="text-blue-300" strokeWidth={3} />
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
      exit={{ opacity: 0, y: -8 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-7"
    >
      {/* Glowing orb */}
      <div className="relative flex items-center justify-center">
        {[118, 90, 66].map((sz, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: sz, height: sz, border: `1px solid rgba(28,128,242,${0.10 + i * 0.08})` }}
            animate={{ scale: [1, 1.14 - i * 0.04, 1], opacity: [0.5 - i * 0.1, 0.05, 0.5 - i * 0.1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.38 }}
          />
        ))}
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, rgba(28,128,242,0.28) 0%, rgba(5,11,24,0.98) 100%)',
            border: '1px solid rgba(28,128,242,0.45)',
            boxShadow: '0 0 44px rgba(28,128,242,0.32), 0 0 88px rgba(28,128,242,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Brain size={24} className="text-blue-300" />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {CHECKLIST.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.32, ...ease }}
            className="flex items-center gap-3"
            style={{ willChange: 'transform, opacity' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.32 + 0.16, ...spr }}
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(28,128,242,0.18)',
                border: '1px solid rgba(28,128,242,0.38)',
                boxShadow: '0 0 12px rgba(28,128,242,0.30)',
              }}
            >
              <Check size={9} className="text-blue-300" strokeWidth={3} />
            </motion.div>
            <span className="text-[13px] text-white/62 font-medium">{item}</span>
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
      <div className="grid grid-cols-3 gap-2.5 flex-1">
        {DASH_CARDS.map(({ Icon, label, lines }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 22, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spr, delay: i * 0.15 }}
            className="rounded-2xl p-3.5 flex flex-col gap-2.5"
            style={{ ...glass, willChange: 'transform, opacity' }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(28,128,242,0.18)', border: '1px solid rgba(28,128,242,0.28)' }}
            >
              <Icon size={11} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/28 mb-2">{label}</p>
              {lines.map((ln, j) => (
                <motion.p
                  key={j}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.15 + j * 0.12 + 0.42 }}
                  className={j === 0 ? 'text-[11px] text-white/72 leading-snug font-medium' : 'text-[10px] text-white/26 mt-1'}
                >
                  {ln}
                </motion.p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Caption */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.68, ...ease }}
        className="text-center text-[12px] pb-0.5"
      >
        <span className="text-white/30">Meeting finished. </span>
        <span className="font-semibold" style={{ color: '#60a5fa' }}>Work already organized.</span>
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
  const [step,   setStep]   = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setStep(s => (s + 1) % STEPS.length), DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, paused]);

  const { key, Panel } = STEPS[step];

  return (
    <div
      className="select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#050b18',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 1px rgba(28,128,242,0.06), 0 32px 80px rgba(0,0,0,0.65), 0 0 100px rgba(28,128,242,0.05)',
        }}
      >
        {/* macOS titlebar */}
        <div
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-1.5">
            {(['#ff5f57', '#febc2e', '#28c840'] as const).map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.72 }} />
            ))}
          </div>
          <span className="flex-1 text-center text-[12px] font-medium text-white/28 pr-12">
            Q3 Product Planning
          </span>
          {/* REC badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Rec</span>
          </div>
        </div>

        {/* Content — fixed height prevents layout shift */}
        <div className="relative" style={{ height: 362 }}>
          <AnimatePresence mode="wait">
            <Panel key={key} />
          </AnimatePresence>
        </div>

        {/* Progress pills */}
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
              className="flex items-center p-1"
            >
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === step ? 22 : 6,
                  background: i === step ? '#1C80F2' : 'rgba(255,255,255,0.16)',
                }}
                style={{ height: 5 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          ))}
          <AnimatePresence>
            {paused && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-4 text-[10px] text-white/18"
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
