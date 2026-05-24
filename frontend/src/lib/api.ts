// ============================================================
// Notemind Centralized API Client
// Handles: token injection, error normalization, typed responses
// ============================================================

import type { APIError as APIErrorType } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Error Class ───────────────────────────────────────────────

export class APIError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  toAPIErrorType(): APIErrorType {
    return { status: this.status, message: this.message };
  }
}

// ── Token Management ──────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('notemind_token');
}

// ── Core Fetcher ──────────────────────────────────────────────

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new APIError(0, 'Network error — check your connection');
  }

  // Handle 401 globally: clear stale session and redirect
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('notemind_token');
    localStorage.removeItem('notemind_user');
    window.location.href = '/auth';
    throw new APIError(401, 'Session expired. Please sign in again.');
  }

  if (response.status === 204) {
    return null as T;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new APIError(response.status, response.statusText);
    }
    return null as T;
  }

  if (!response.ok) {
    const err = body as Record<string, unknown>;
    const message =
      (typeof err?.error === 'string' ? err.error : null) ??
      (typeof err?.message === 'string' ? err.message : null) ??
      response.statusText;
    const code = typeof err?.code === 'string' ? err.code : undefined;
    throw new APIError(response.status, message, code);
  }

  return body as T;
}

// ── Typed API Client ──────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string): Promise<T> =>
    fetchWithAuth<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, body: unknown): Promise<T> =>
    fetchWithAuth<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown): Promise<T> =>
    fetchWithAuth<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown): Promise<T> =>
    fetchWithAuth<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string): Promise<T> =>
    fetchWithAuth<T>(endpoint, { method: 'DELETE' }),
};

// ── SSE Connection Helper ─────────────────────────────────────

export function createSSEConnection(meetingId: string): EventSource {
  const token = getToken();
  const url = `${API_BASE_URL}/meetings/${meetingId}/stream${token ? `?token=${token}` : ''}`;
  return new EventSource(url);
}

// ── AI Memory SSE Streaming ───────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID();
  const key = 'notemind_memory_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export type StreamAskCallbacks = {
  onToken: (token: string) => void;
  onCitations?: (citations: { meeting_id: string; snippet: string }[]) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
};

export function streamAsk(
  query: string,
  callbacks: StreamAskCallbacks,
  meetingId?: string
): () => void {
  const token = getToken();
  const sessionId = getOrCreateSessionId();

  const params = new URLSearchParams({ q: query, session_id: sessionId });
  if (meetingId) params.set('meeting_id', meetingId);
  if (token) params.set('token', token);

  const url = `${API_BASE_URL}/memory/ask?${params.toString()}`;
  const es = new EventSource(url);
  let completed = false;

  es.addEventListener('citations', (e) => {
    try {
      const citations = JSON.parse((e as MessageEvent).data);
      callbacks.onCitations?.(citations);
    } catch { /* non-fatal */ }
  });

  es.addEventListener('token', (e) => {
    callbacks.onToken((e as MessageEvent).data);
  });

  es.addEventListener('done', () => {
    completed = true;
    callbacks.onDone?.();
    es.close();
  });

  es.addEventListener('error', (e) => {
    if (!completed) {
      const msg = (e as MessageEvent).data ?? 'AI Memory connection error';
      callbacks.onError?.(msg);
    }
    es.close();
  });

  es.onerror = () => {
    if (!completed) {
      callbacks.onError?.('Lost connection to AI Memory');
    }
    es.close();
  };

  return () => es.close();
}

// ── Session Helpers ───────────────────────────────────────────

export function getStoredUser(): import('@/types/api').User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('notemind_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as import('@/types/api').User;
  } catch {
    return null;
  }
}

export function storeSession(
  token: string,
  user: import('@/types/api').User
): void {
  localStorage.setItem('notemind_token', token);
  localStorage.setItem('notemind_user', JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem('notemind_token');
  localStorage.removeItem('notemind_user');
  localStorage.removeItem('notemind_workspace');
}
