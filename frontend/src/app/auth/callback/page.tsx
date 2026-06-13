'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { api, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/types/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(
        errorParam === 'access_denied'
          ? 'Google sign-in was cancelled.'
          : 'Authentication failed. Please try again.'
      );
      return;
    }

    if (!code) {
      setError('No authentication code received. Please try signing in again.');
      return;
    }

    const finish = async () => {
      try {
        // Exchange the one-time code for the JWT — the token never touches the URL.
        const { token } = await api.post<{ token: string }>('/auth/exchange', { code });
        localStorage.setItem('notemind_token', token);

        const data = await api.get<AuthResponse['user']>('/users/me');
        storeSession(token, data);

        const workspaces = await api.get<AuthResponse['workspaces']>('/workspaces').catch(() => []);

        if (workspaces && workspaces.length > 0) {
          localStorage.setItem('notemind_workspace', JSON.stringify(workspaces[0]));
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding/workspace');
        }
      } catch {
        setError('Failed to complete sign-in. Please try again.');
        localStorage.removeItem('notemind_token');
      }
    };

    finish();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Sign-in failed</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-brand mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}

const fallback = (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="text-center">
      <Loader2 size={32} className="animate-spin text-brand mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  </div>
);

export default function AuthCallbackPage() {
  return <Suspense fallback={fallback}><CallbackContent /></Suspense>;
}
