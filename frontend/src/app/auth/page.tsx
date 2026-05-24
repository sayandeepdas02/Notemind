'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronDown, CheckCircle, Mic } from 'lucide-react';
import { api, APIError, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const IS_DEV = process.env.NODE_ENV === 'development';

// ── Google G SVG ──────────────────────────────────────────────

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

// ── Left panel ────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-center p-14 overflow-hidden"
      style={{ minHeight: '100vh' }}>
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-landscape.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/80 to-teal-900/70" />

      {/* Content */}
      <div className="relative z-10 max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Mic size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">Notemind</span>
        </div>

        <h2 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
          Never miss what<br />matters.
        </h2>
        <p className="text-white/75 text-lg leading-relaxed mb-10">
          AI-powered meeting notes for teams that move fast.
        </p>

        {/* Feature bullets */}
        <ul className="space-y-4 mb-12">
          {[
            'Real-time transcription',
            'AI summaries & action items',
            'Works with Google Meet & Zoom',
          ].map(f => (
            <li key={f} className="flex items-center gap-3 text-white/90">
              <CheckCircle size={18} className="text-green-400 shrink-0" />
              <span className="text-base">{f}</span>
            </li>
          ))}
        </ul>

        {/* Testimonial */}
        <div className="border-t border-white/15 pt-8">
          <p className="text-white/65 text-sm leading-relaxed italic">
            &ldquo;Notemind turned our weekly syncs from 45 minutes of back-and-forth
            into 5 minutes of reviewing the AI summary.&rdquo;
          </p>
          <p className="text-white/50 text-sm mt-3">— Sarah Chen, Head of Product at Vercel</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOpen, setDevOpen] = useState(false);

  const searchError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error')
    : null;

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google/initiate`;
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const loginEmail = email || 'demo@notemind.ai';
    const name = loginEmail.split('@')[0];

    try {
      const data = await api.post<AuthResponse>('/auth/google', {
        email: loginEmail,
        name,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
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
    : searchError
      ? 'Sign-in failed. Please try again.'
      : null;

  const displayError = error || errorMessage;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — landscape + copy */}
      <div className="lg:w-[55%] flex-shrink-0">
        <LeftPanel />
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
            <Mic size={14} className="text-white" />
          </div>
          <span className="text-gray-900 font-bold text-lg">Notemind</span>
        </Link>

        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your workspace</p>
          </div>

          {/* Error */}
          {displayError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {displayError}
            </div>
          )}

          {/* Google button — primary action */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-[1.5px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 shadow-sm text-base mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Work email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="you@company.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 text-sm
                         focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>

          {/* Continue with email */}
          <button
            onClick={() => {
              if (email.trim()) handleGoogleLogin();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-base mb-5"
          >
            Continue with email →
          </button>

          {/* Fine print */}
          <p className="text-xs text-center text-gray-400 mb-8">
            By continuing, you agree to our{' '}
            <a href="#" className="underline underline-offset-2 hover:text-gray-600">Terms</a>
            {' '}and{' '}
            <a href="#" className="underline underline-offset-2 hover:text-gray-600">Privacy Policy</a>.
          </p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex -space-x-2">
              {['#16a34a', '#0d9488', '#2563eb'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: c }}>
                  {['S', 'J', 'A'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">+2,400 teams use Notemind</p>
          </div>

          {/* Dev-only login */}
          {IS_DEV && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setDevOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-400 hover:text-gray-600 bg-gray-50 transition-colors"
              >
                Dev login (development only)
                <ChevronDown size={14} className={`transition-transform ${devOpen ? 'rotate-180' : ''}`} />
              </button>

              {devOpen && (
                <form onSubmit={handleDevLogin} className="p-4 space-y-3 bg-white">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com (leave blank for demo)"
                    className="w-full border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 py-2.5 rounded-lg text-sm
                               focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Sign in (dev)'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to Notemind.ai
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
