'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, Mic, ArrowLeft } from 'lucide-react';
import { api, APIError, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const IS_DEV = process.env.NODE_ENV === 'development';

type Mode = 'signin' | 'signup';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Left brand panel ──────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-brand" style={{ minHeight: '100vh' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand to-navy/80" />
      {/* Glow */}
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(28,128,242,0.5), transparent 70%)', transform: 'translate(30%, 30%)' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Mic size={15} className="text-white" />
          </div>
          <span className="font-serif text-white text-[20px]">Notemind</span>
        </div>
      </div>

      <div className="relative z-10 max-w-sm">
        <h2 className="font-serif text-[44px] text-white leading-tight mb-4 tracking-tight">
          Never miss what matters.
        </h2>
        <p className="text-white/70 text-[16px] leading-relaxed mb-10">
          AI-powered meeting notes for teams that move fast.
        </p>

        <ul className="space-y-4 mb-12">
          {['Real-time transcription', 'AI summaries & action items', 'Works with Google Meet & Zoom'].map(f => (
            <li key={f} className="flex items-center gap-3 text-white/90">
              <CheckCircle size={17} className="text-white/70 shrink-0" />
              <span className="text-[15px]">{f}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/15 pt-8">
          <p className="text-white/55 text-[13px] leading-relaxed italic font-light">
            &ldquo;Notemind turned our weekly syncs from 45 minutes of back-and-forth into
            5 minutes of reviewing the AI summary.&rdquo;
          </p>
          <p className="text-white/40 text-[13px] mt-3">— Sarah Chen, Head of Product at Vercel</p>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {['#1C80F2', '#0d1f2d', '#4B94F5'].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: c }}>
                {['S', 'J', 'A'][i]}
              </div>
            ))}
          </div>
          <p className="text-[13px] text-white/50">+2,400 teams use Notemind</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOpen, setDevOpen] = useState(false);

  const searchError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error')
    : null;

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google/initiate`;
  };

  // "Continue with email" — triggers email-based auth flow (magic link / OTP)
  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return; }
    setError(null);
    setIsLoading(true);
    try {
      // Email magic-link / OTP flow — POST to /auth/email
      await api.post('/auth/email', { email: email.trim(), name: name.trim() || undefined, mode });
      router.push(`/auth/callback?email=${encodeURIComponent(email.trim())}&sent=1`);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Could not send sign-in email. Try Google instead.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const loginEmail = email || 'demo@notemind.ai';
    const loginName = loginEmail.split('@')[0];
    try {
      const data = await api.post<AuthResponse>('/auth/google', {
        email: loginEmail,
        name: loginName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginName}`,
      });
      storeSession(data.token, data.user);
      if (data.workspaces && data.workspaces.length > 0) {
        localStorage.setItem('notemind_workspace', JSON.stringify(data.workspaces[0]));
        router.push('/dashboard');
      } else {
        router.push('/onboarding/workspace');
      }
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessage = searchError === 'access_denied'
    ? 'Google sign-in was cancelled. Please try again.'
    : searchError ? 'Sign-in failed. Please try again.' : null;

  const displayError = error || errorMessage;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="lg:w-[48%] flex-shrink-0">
        <LeftPanel />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <Mic size={13} className="text-white" />
          </div>
          <span className="font-serif text-ink text-[18px]">Notemind</span>
        </Link>

        <div className="w-full max-w-[400px]">
          {/* Heading — adjusts based on mode */}
          <div className="mb-8">
            <h1 className="font-serif text-[32px] text-ink tracking-tight mb-1.5">
              {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
            </h1>
            <p className="text-[15px] text-ink-4">
              {mode === 'signin'
                ? 'Sign in to your workspace'
                : 'Start your free 14-day trial — no credit card needed'}
            </p>
          </div>

          {/* Error */}
          {displayError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-xl" role="alert">
              {displayError}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-ink-5 hover:border-ink-4 hover:bg-off-white text-ink-2 font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 shadow-sm text-[15px] mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-ink-6" />
            <span className="text-[12px] text-ink-5 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-ink-6" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailContinue} className="space-y-3 mb-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[13px] font-medium text-ink-2 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(null); }}
                  placeholder="Your name"
                  className="w-full border border-ink-6 rounded-xl px-4 py-3 text-ink placeholder:text-ink-5 text-[14px]
                             focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-[13px] font-medium text-ink-2 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                placeholder="you@company.com"
                className="w-full border border-ink-6 rounded-xl px-4 py-3 text-ink placeholder:text-ink-5 text-[14px]
                           focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-brand hover:bg-brand-mid text-white font-semibold py-3 rounded-xl transition-colors text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'signin' ? 'Sign in with email →' : 'Create account →'}
            </button>
          </form>

          {/* Fine print */}
          <p className="text-[12px] text-center text-ink-5 mb-7">
            By continuing, you agree to our{' '}
            <a href="#" className="underline underline-offset-2 hover:text-ink-3 transition-colors">Terms</a>
            {' '}and{' '}
            <a href="#" className="underline underline-offset-2 hover:text-ink-3 transition-colors">Privacy Policy</a>.
          </p>

          {/* Mode toggle */}
          <p className="text-[14px] text-center text-ink-4">
            {mode === 'signin' ? (
              <>Don&apos;t have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); }}
                  className="text-brand font-semibold hover:underline">
                  Sign up free
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null); }}
                  className="text-brand font-semibold hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Dev login */}
          {IS_DEV && (
            <div className="mt-8 border border-ink-6 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setDevOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-medium text-ink-4 hover:text-ink-3 bg-off-white transition-colors"
              >
                Dev login (development only)
                <span className="text-ink-5">{devOpen ? '▲' : '▼'}</span>
              </button>
              {devOpen && (
                <form onSubmit={handleDevLogin} className="p-4 space-y-3 bg-white">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com (blank = demo)"
                    className="w-full border border-ink-6 text-ink placeholder:text-ink-5 px-4 py-2.5 rounded-lg text-[13px]
                               focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/10 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-ink-6 hover:bg-ink-5/40 text-ink-2 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-[13px]"
                  >
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : 'Sign in (dev)'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-7 text-center">
            <Link href="/" className="text-[13px] text-ink-5 hover:text-ink-3 transition-colors flex items-center justify-center gap-1.5">
              <ArrowLeft size={13} /> Back to Notemind.ai
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
