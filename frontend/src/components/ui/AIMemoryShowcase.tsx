'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, ChevronRight, Sparkles } from 'lucide-react';

// ─── timing ──────────────────────────────────────────────────────────────────
const DURATIONS = [1800, 1800, 2200, 1600, 1800, 2600] as const;

// ─── data ─────────────────────────────────────────────────────────────────────
const MEETINGS = [
  { title: 'Weekly Sync',      meta: 'Mon · 9:00 AM'   },
  { title: 'Sales Call',       meta: 'Yesterday · 3pm' },
  { title: '1:1 with Manager', meta: 'Tue · 10:00 AM'  },
  { title: 'Product Review',   meta: 'Mon · 2:00 PM'   },
  { title: 'Board Meeting',    meta: 'Last Wed · 1pm'  },
];

const SNIPPETS = [
  { text: 'Finish pricing rollout',   from: 'Weekly Sync'     },
  { text: 'Review onboarding copy',   from: 'Sales Call'      },
  { text: 'Launch referral program',  from: 'Product Review'  },
  { text: 'Update dashboard metrics', from: '1:1 with Manager'},
];

const INDEX_TAGS = [
  'People', 'Projects', 'Decisions',
  'Action Items', 'Deadlines', 'Summaries',
];

const AI_ANSWERS = [
  { text: 'Finish pricing rollout',   detail: 'Due Friday',          src: 'Weekly Sync'    },
  { text: 'Review onboarding copy',   detail: 'Mentioned in 1:1',    src: 'Manager 1:1'    },
  { text: 'Update dashboard metrics', detail: 'Mentioned in review', src: 'Product Review' },
];

const QUESTION = "What did my manager ask me to finish this week?";
const Q_WORDS  = QUESTION.split(' ');

// ─── motion presets ───────────────────────────────────────────────────────────
const spr  = { type: 'spring' as const, stiffness: 290, damping: 26 };
const ease = { duration: 0.44, ease: [0.22, 1, 0.36, 1] as const };

// ─── glass presets ────────────────────────────────────────────────────────────
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

// ─── shared: brain orb ───────────────────────────────────────────────────────
function BrainOrb({ size = 56, glow = 0.32 }: { size?: number; glow?: number }) {
  return (
    <div className="relative flex items-center justify-center">
      {[size + 62, size + 38, size + 18].map((sz, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: sz, height: sz, border: `1px solid rgba(28,128,242,${0.10 + i * 0.07})` }}
          animate={{ scale: [1, 1.12 - i * 0.03, 1], opacity: [0.45 - i * 0.08, 0.04, 0.45 - i * 0.08] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.38 }}
        />
      ))}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size, height: size,
          background: 'linear-gradient(145deg, rgba(28,128,242,0.28) 0%, rgba(5,11,24,0.98) 100%)',
          border: '1px solid rgba(28,128,242,0.45)',
          boxShadow: `0 0 ${Math.round(size * 0.7)}px rgba(28,128,242,${glow}), 0 0 ${Math.round(size * 1.4)}px rgba(28,128,242,${glow * 0.4}), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        <Brain size={Math.round(size * 0.42)} className="text-blue-300" />
      </div>
    </div>
  );
}

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
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/20 mb-1">
        Meeting History
      </p>

      {MEETINGS.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -18, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spr, delay: i * 0.10 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ ...glass, willChange: 'transform, opacity' }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#1C80F2', boxShadow: '0 0 8px rgba(28,128,242,0.6)' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/82 truncate">{m.title}</p>
            <p className="text-[10px] text-white/28">{m.meta}</p>
          </div>
          <ChevronRight size={11} className="text-white/18 shrink-0" strokeWidth={2} />
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
      <div className="flex items-center gap-2 mb-0.5">
        <motion.div
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(28,128,242,0.18)', border: '1px solid rgba(28,128,242,0.32)' }}
          animate={{ boxShadow: ['0 0 0px rgba(28,128,242,0)', '0 0 10px rgba(28,128,242,0.4)', '0 0 0px rgba(28,128,242,0)'] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <Sparkles size={8} className="text-blue-300" />
        </motion.div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/20">
          Extracting Key Moments
        </p>
      </div>

      {SNIPPETS.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...spr, delay: i * 0.22 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ ...glassBlue, willChange: 'transform, opacity' }}
        >
          <div
            className="w-1 h-9 rounded-full shrink-0"
            style={{ background: 'linear-gradient(180deg, #1C80F2, #60a5fa)' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/86 truncate">{s.text}</p>
            <p className="text-[10px] mt-0.5 text-blue-300/65">from {s.from}</p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spr, delay: i * 0.22 + 0.28 }}
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(28,128,242,0.20)', border: '1px solid rgba(28,128,242,0.38)' }}
          >
            <Check size={9} className="text-blue-300" strokeWidth={3} />
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
      className="absolute inset-0 flex items-center justify-between px-5 gap-3"
    >
      {/* Left: meeting list collapsing */}
      <div className="flex flex-col gap-2 shrink-0 w-[130px]">
        {MEETINGS.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, scale: 1 }}
            animate={{ opacity: 0, x: 48, scale: 0.7 }}
            transition={{ delay: 0.18 + i * 0.12, duration: 0.55, ease: 'easeIn' }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ ...glass }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" style={{ boxShadow: '0 0 6px rgba(28,128,242,0.7)' }} />
            <p className="text-[11px] font-medium text-white/60 truncate">{m.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Center: particle streams */}
      <div className="relative flex-1" style={{ height: 200 }}>
        {/* Faint guide lines */}
        {MEETINGS.map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${14 + i * 16}%`,
              left: 0, right: 0,
              height: 1,
              background: 'rgba(28,128,242,0.12)',
              transformOrigin: 'left center',
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 0.5, 0] }}
            transition={{ delay: 0.22 + i * 0.12, duration: 0.9, times: [0, 0.5, 1] }}
          />
        ))}

        {/* Flowing particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4, height: 4,
              background: `rgba(28,128,242,${0.55 + (i % 3) * 0.15})`,
              top: `${12 + (i % 5) * 16}%`,
              left: 0,
              willChange: 'transform, opacity',
              boxShadow: '0 0 6px rgba(28,128,242,0.8)',
            }}
            animate={{ x: [0, 60, 130], opacity: [0, 1, 0] }}
            transition={{
              delay: 0.38 + i * 0.11,
              duration: 0.72,
              ease: [0.4, 0, 0.6, 1],
              repeat: Infinity,
              repeatDelay: 0.42,
            }}
          />
        ))}
      </div>

      {/* Right: memory orb growing */}
      <motion.div
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spr, delay: 0.38 }}
        className="flex flex-col items-center gap-3 shrink-0"
      >
        <BrainOrb size={52} glow={0.38} />
        <div className="text-center">
          <p className="text-[12px] font-bold text-white/72">Notemind Memory</p>
          <motion.p
            className="text-[10px] text-blue-400/60 mt-0.5"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Absorbing…
          </motion.p>
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
      <BrainOrb size={52} glow={0.28} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[12px] font-semibold text-white/45"
      >
        Indexing knowledge…
      </motion.p>

      <div className="flex flex-wrap justify-center gap-2 max-w-[280px]">
        {INDEX_TAGS.map((tag, i) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.55, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spr, delay: 0.26 + i * 0.12 }}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(28,128,242,0.12)',
              border: '1px solid rgba(28,128,242,0.28)',
              color: '#93c5fd',
              willChange: 'transform, opacity',
              boxShadow: '0 2px 8px rgba(28,128,242,0.12)',
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
      {/* Chat bar */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-2xl shrink-0"
        style={{ ...glassBlue, borderBottom: 'none' }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(28,128,242,0.25)' }}
        >
          <Brain size={11} className="text-blue-400" />
        </div>
        <span className="text-[12px] font-semibold text-white/65">AI Memory</span>
        <div className="ml-auto flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{ opacity: [1, 0.28, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
          />
          <span className="text-[10px] text-blue-400 font-semibold">Online</span>
        </div>
      </div>

      <div
        className="flex-1 rounded-b-2xl px-4 py-4 flex flex-col justify-between"
        style={{ ...glass, borderTop: 'none' }}
      >
        {/* User bubble */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, ...ease }}
          className="flex justify-end"
        >
          <div
            className="px-3.5 py-2.5 rounded-2xl rounded-br-sm max-w-[90%]"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="text-[13px] text-white/80 leading-relaxed">
              {Q_WORDS.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.26 + i * 0.07, duration: 0.14 }}
                >
                  {w}{' '}
                </motion.span>
              ))}
              <motion.span
                className="inline-block w-[2px] h-[14px] bg-white/45 align-text-bottom rounded-sm"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.85, repeat: Infinity }}
              />
            </p>
          </div>
        </motion.div>

        {/* Thinking dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.95, duration: 0.65, times: [0, 0.15, 0.75, 1] }}
          className="flex justify-start"
        >
          <div
            className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl rounded-bl-sm"
            style={{ ...glassBlue }}
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
      {/* Chat bar */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-2xl shrink-0"
        style={{ ...glassBlue, borderBottom: 'none' }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(28,128,242,0.25)' }}
        >
          <Brain size={11} className="text-blue-400" />
        </div>
        <span className="text-[12px] font-semibold text-white/65">AI Memory</span>
      </div>

      <div
        className="flex-1 rounded-b-2xl px-4 py-3 flex flex-col gap-2.5"
        style={{ ...glass, borderTop: 'none' }}
      >
        {/* Echo of user question */}
        <div className="flex justify-end">
          <div
            className="px-3 py-1.5 rounded-xl rounded-br-sm"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-[11px] text-white/38">{QUESTION}</p>
          </div>
        </div>

        {/* AI answer card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, ...ease }}
          className="flex-1"
        >
          <div
            className="px-4 py-3 rounded-2xl rounded-bl-sm h-full flex flex-col"
            style={{ ...glassBlue }}
          >
            <p className="text-[11px] text-white/38 mb-2.5">Based on recent meetings:</p>

            <div className="space-y-2.5 flex-1">
              {AI_ANSWERS.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.22, ...ease }}
                  className="flex items-start gap-2"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <ChevronRight size={11} className="text-blue-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div className="min-w-0">
                    <span className="text-[12px] font-semibold text-white/88">{a.text}</span>
                    <span className="text-[11px] text-white/35 ml-1.5">— {a.detail}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Source citations */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15 }}
              className="flex flex-wrap gap-1.5 pt-2.5 mt-auto"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[...new Set(AI_ANSWERS.map(a => a.src))].map(src => (
                <span
                  key={src}
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(28,128,242,0.14)',
                    border: '1px solid rgba(28,128,242,0.26)',
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
          transition={{ delay: 1.5 }}
          className="text-center text-[12px]"
        >
          <span className="text-white/28">Ask your meetings </span>
          <span className="font-semibold" style={{ color: '#60a5fa' }}>anything.</span>
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── step registry ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'meetings', label: 'History', Panel: StepMeetings },
  { key: 'snippets', label: 'Extract', Panel: StepSnippets },
  { key: 'flow',     label: 'Flow',    Panel: StepFlow     },
  { key: 'index',    label: 'Index',   Panel: StepIndex    },
  { key: 'chat',     label: 'Query',   Panel: StepChat     },
  { key: 'answer',   label: 'Answer',  Panel: StepAnswer   },
];

// ─── export ───────────────────────────────────────────────────────────────────
export function AIMemoryShowcase() {
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
          <div className="flex-1 flex items-center justify-center gap-1.5 pr-12">
            <Brain size={11} className="text-blue-400/55" />
            <span className="text-[12px] font-medium text-white/28">Notemind Memory</span>
          </div>
          {/* Live badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(28,128,242,0.10)', border: '1px solid rgba(28,128,242,0.22)' }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">Live</span>
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
