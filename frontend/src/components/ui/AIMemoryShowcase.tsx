'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, ChevronRight } from 'lucide-react';

// ─── timing (ms per step) — total ≈ 11 s ─────────────────────────────────────
const DURATIONS = [1800, 1800, 2000, 1500, 1600, 2500] as const;

// ─── data ─────────────────────────────────────────────────────────────────────

const MEETINGS = [
  { title: 'Weekly Sync',      meta: 'Mon · 9:00 AM',   color: '#3b82f6', tag: 'recurring' },
  { title: 'Sales Call',       meta: 'Yesterday · 3pm', color: '#8b5cf6', tag: 'external'  },
  { title: '1:1 with Manager', meta: 'Tue · 10:00 AM',  color: '#10b981', tag: '1:1'       },
  { title: 'Product Review',   meta: 'Mon · 2:00 PM',   color: '#f59e0b', tag: 'planning'  },
  { title: 'Board Meeting',    meta: 'Last Wed · 1pm',  color: '#ef4444', tag: 'exec'      },
];

const SNIPPETS = [
  { text: 'Finish pricing rollout',   from: 'Weekly Sync',     color: '#3b82f6' },
  { text: 'Review onboarding copy',   from: 'Sales Call',      color: '#8b5cf6' },
  { text: 'Launch referral program',  from: 'Product Review',  color: '#f59e0b' },
  { text: 'Update dashboard metrics', from: '1:1 with Manager',color: '#10b981' },
];

const INDEX_TAGS = ['People', 'Projects', 'Decisions', 'Action Items', 'Deadlines', 'Summaries'];

const AI_ANSWERS = [
  { text: 'Finish pricing rollout',   detail: 'Due Friday',          src: 'Weekly Sync'     },
  { text: 'Review onboarding copy',   detail: 'Mentioned in 1:1',    src: 'Manager 1:1'     },
  { text: 'Update dashboard metrics', detail: 'Mentioned in review', src: 'Product Review'  },
];

// ─── motion helpers ───────────────────────────────────────────────────────────
const spr  = { type: 'spring' as const, stiffness: 290, damping: 25 };
const ease = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

// ─── step 0: meeting history ──────────────────────────────────────────────────
function StepMeetings() {
  return (
    <motion.div
      key="meetings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/22 mb-1">
        Meeting History
      </p>

      {MEETINGS.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -18, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spr, delay: i * 0.1 }}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            willChange: 'transform, opacity',
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: m.color, boxShadow: `0 0 8px ${m.color}55` }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white/82 truncate">{m.title}</p>
            <p className="text-[10px] text-white/30">{m.meta}</p>
          </div>
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: `${m.color}16`, color: m.color, border: `1px solid ${m.color}28` }}
          >
            {m.tag}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── step 1: snippet extraction ───────────────────────────────────────────────
function StepSnippets() {
  return (
    <motion.div
      key="snippets"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col gap-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/22 mb-1">
        Extracting Key Moments
      </p>

      {SNIPPETS.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 18, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spr, delay: i * 0.2 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: `${s.color}10`,
            border: `1px solid ${s.color}28`,
            willChange: 'transform, opacity',
          }}
        >
          <div className="w-1 h-8 rounded-full shrink-0" style={{ background: s.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/86 truncate">{s.text}</p>
            <p className="text-[10px] mt-0.5" style={{ color: s.color }}>from {s.from}</p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spr, delay: i * 0.2 + 0.28 }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: `${s.color}20`, border: `1px solid ${s.color}40` }}
            >
              <Check size={9} style={{ color: s.color }} strokeWidth={3} />
            </div>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── step 2: flow to memory ───────────────────────────────────────────────────
function StepFlow() {
  return (
    <motion.div
      key="flow"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ease}
      className="absolute inset-0 flex items-center justify-between px-4"
    >
      {/* Left: meeting dots */}
      <motion.div className="flex flex-col gap-2.5 shrink-0">
        {MEETINGS.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: [1, 1, 0.3, 0], x: [0, 0, 24, 70] }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease: 'easeIn' }}
            className="flex items-center gap-2"
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: m.color, boxShadow: `0 0 6px ${m.color}60` }}
            />
            <span className="text-[11px] text-white/48 font-medium">{m.title}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Center: animated particles */}
      <div className="relative flex-1 mx-2" style={{ height: 180 }}>
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: '#1C80F2',
              top: `${10 + i * 11}%`,
              left: '0%',
              willChange: 'transform, opacity',
            }}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: [0, 35, 75], opacity: [0, 0.9, 0] }}
            transition={{
              delay: 0.35 + i * 0.13,
              duration: 0.72,
              ease: 'easeIn',
              repeat: Infinity,
              repeatDelay: 0.55,
            }}
          />
        ))}
      </div>

      {/* Right: memory orb */}
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spr, delay: 0.45 }}
        className="flex flex-col items-center gap-2.5 shrink-0"
      >
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          <motion.div
            className="absolute rounded-full"
            style={{ width: 96, height: 96, border: '1px solid rgba(28,128,242,0.15)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.08, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ width: 72, height: 72, border: '1px solid rgba(28,128,242,0.25)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0.15, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
          {/* Core */}
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(28,128,242,0.28) 0%, rgba(8,14,26,0.97) 100%)',
              border: '1px solid rgba(28,128,242,0.45)',
              boxShadow: '0 0 36px rgba(28,128,242,0.32), 0 0 72px rgba(28,128,242,0.12)',
            }}
          >
            <Brain size={22} className="text-blue-300" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[12px] font-bold text-white/75">Notemind Memory</p>
          <p className="text-[10px] text-white/30 mt-0.5">Absorbing…</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── step 3: indexing ─────────────────────────────────────────────────────────
function StepIndex() {
  return (
    <motion.div
      key="index"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ease}
      className="absolute inset-0 flex flex-col items-center justify-center gap-5"
    >
      {/* Orb */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute rounded-full"
          style={{ width: 88, height: 88, border: '1px solid rgba(28,128,242,0.15)' }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.08, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(28,128,242,0.26) 0%, rgba(8,14,26,0.96) 100%)',
            border: '1px solid rgba(28,128,242,0.42)',
            boxShadow: '0 0 32px rgba(28,128,242,0.28)',
          }}
        >
          <Brain size={22} className="text-blue-300" />
        </div>
      </div>

      <p className="text-[13px] font-semibold text-white/55">Indexing knowledge…</p>

      {/* Tags */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[260px]">
        {INDEX_TAGS.map((tag, i) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.65, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spr, delay: i * 0.1 }}
            className="px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(28,128,242,0.12)',
              border: '1px solid rgba(28,128,242,0.26)',
              color: '#93c5fd',
              willChange: 'transform, opacity',
            }}
          >
            {tag}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── step 4: chat question ────────────────────────────────────────────────────
const QUESTION = "What did my manager ask me to finish this week?";
const Q_WORDS  = QUESTION.split(' ');

function StepChat() {
  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col"
    >
      {/* Chat header */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl shrink-0"
        style={{ background: 'rgba(28,128,242,0.10)', border: '1px solid rgba(28,128,242,0.22)', borderBottom: 'none' }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(28,128,242,0.25)' }}
        >
          <Brain size={11} className="text-blue-400" />
        </div>
        <span className="text-[12px] font-semibold text-white/68">AI Memory</span>
        <div className="ml-auto flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
          />
          <span className="text-[10px] text-blue-400 font-semibold">Online</span>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 rounded-b-xl px-4 py-4 flex flex-col justify-between"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* User bubble */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...ease }}
          className="flex justify-end"
        >
          <div
            className="px-3.5 py-2.5 rounded-xl rounded-br-sm max-w-[88%]"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="text-[13px] text-white/80 leading-relaxed">
              {Q_WORDS.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28 + i * 0.065, duration: 0.14 }}
                >
                  {w}{' '}
                </motion.span>
              ))}
              <motion.span
                className="inline-block w-0.5 h-[13px] bg-white/50 align-text-bottom rounded-sm"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </p>
          </div>
        </motion.div>

        {/* Thinking dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.9, duration: 0.7, times: [0, 0.18, 0.72, 1] }}
          className="flex justify-start"
        >
          <div
            className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl rounded-bl-sm"
            style={{ background: 'rgba(28,128,242,0.10)', border: '1px solid rgba(28,128,242,0.20)' }}
          >
            {[0, 0.18, 0.36].map((d, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                animate={{ y: [0, -4, 0] }}
                transition={{ delay: d, duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── step 5: ai answer ────────────────────────────────────────────────────────
function StepAnswer() {
  return (
    <motion.div
      key="answer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ease}
      className="absolute inset-0 p-5 flex flex-col"
    >
      {/* Chat header */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl shrink-0"
        style={{ background: 'rgba(28,128,242,0.10)', border: '1px solid rgba(28,128,242,0.22)', borderBottom: 'none' }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(28,128,242,0.25)' }}
        >
          <Brain size={11} className="text-blue-400" />
        </div>
        <span className="text-[12px] font-semibold text-white/68">AI Memory</span>
      </div>

      {/* Body */}
      <div
        className="flex-1 rounded-b-xl px-4 py-3 flex flex-col gap-2.5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Condensed user Q */}
        <div className="flex justify-end">
          <div
            className="px-3 py-1.5 rounded-xl rounded-br-sm"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-[11px] text-white/45">{QUESTION}</p>
          </div>
        </div>

        {/* AI answer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, ...ease }}
          className="flex-1"
        >
          <div
            className="px-3.5 py-3 rounded-xl rounded-bl-sm h-full flex flex-col justify-between"
            style={{ background: 'rgba(28,128,242,0.10)', border: '1px solid rgba(28,128,242,0.22)' }}
          >
            <div>
              <p className="text-[11px] text-white/40 mb-2.5">Based on recent meetings:</p>

              <div className="space-y-2 mb-3">
                {AI_ANSWERS.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.2, ...ease }}
                    className="flex items-start gap-2"
                  >
                    <ChevronRight size={11} className="text-blue-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <div className="min-w-0">
                      <span className="text-[12px] font-semibold text-white/86">{a.text}</span>
                      <span className="text-[11px] text-white/38 ml-2">— {a.detail}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Source citations */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="flex flex-wrap gap-1.5 pt-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              {[...new Set(AI_ANSWERS.map(a => a.src))].map(src => (
                <span
                  key={src}
                  className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(28,128,242,0.14)',
                    border: '1px solid rgba(28,128,242,0.24)',
                    color: '#93c5fd',
                  }}
                >
                  ↗ {src}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* End caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-center text-[12px] font-medium"
        >
          <span className="text-white/32">Ask your meetings </span>
          <span style={{ color: '#60a5fa' }}>anything.</span>
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── step registry ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'meetings',  label: 'History', Panel: StepMeetings },
  { key: 'snippets',  label: 'Extract', Panel: StepSnippets },
  { key: 'flow',      label: 'Flow',    Panel: StepFlow     },
  { key: 'index',     label: 'Index',   Panel: StepIndex    },
  { key: 'chat',      label: 'Query',   Panel: StepChat     },
  { key: 'answer',    label: 'Answer',  Panel: StepAnswer   },
];

// ─── export ───────────────────────────────────────────────────────────────────
export function AIMemoryShowcase() {
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
          <div className="flex-1 flex items-center justify-center gap-1.5 pr-10">
            <Brain size={11} className="text-blue-400/60" />
            <span className="text-[12px] font-medium text-white/38">Notemind Memory</span>
          </div>
          {/* Live badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(28,128,242,0.10)', border: '1px solid rgba(28,128,242,0.20)' }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ opacity: [1, 0.28, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">Live</span>
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
