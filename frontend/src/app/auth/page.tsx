'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api, APIError, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/types/api';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <Link
        href="/"
        className="absolute top-8 left-8 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="w-full max-w-md bg-surface-2 border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent opacity-[0.12] blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center text-lg font-bold mb-4 shadow-lg shadow-accent/20">
            ◈
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Notemind</h1>
          <p className="text-muted-foreground text-sm mt-2 text-center">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {/* Google OAuth Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 hover:bg-gray-50 font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center py-3">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase font-medium tracking-wider">
              or
            </span>
            <div className="flex-grow border-t border-border" />
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-50"
              required
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-surface-3 hover:bg-border text-foreground font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Continue with Email'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 relative z-10">
          By continuing, you agree to our{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
