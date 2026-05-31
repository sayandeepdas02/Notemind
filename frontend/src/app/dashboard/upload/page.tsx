'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload as UploadIcon,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  X,
} from 'lucide-react';
import { Panel } from '@/components/ui/panel';
import { StatusBadge } from '@/components/ui/status-badge';
import type { MeetingStatus } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const ACCEPT = '.mp3,.mp4,.wav,.m4a,.webm';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number; message: string }
  | { kind: 'polling'; meetingId: string; status: MeetingStatus }
  | { kind: 'done'; meetingId: string }
  | { kind: 'error'; message: string };

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const pickFile = (f: File) => {
    if (f.size > MAX_BYTES) {
      setSizeError(`File too large (${formatBytes(f.size)}). Maximum is 500 MB.`);
      setFile(null);
      return;
    }
    setSizeError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const pollStatus = useCallback((meetingId: string) => {
    const token = localStorage.getItem('notemind_token');
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/meetings/${meetingId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Poll failed');
        const data = await res.json() as { status: MeetingStatus };
        if (data.status === 'completed') {
          setState({ kind: 'done', meetingId });
          return;
        }
        if (data.status === 'failed') {
          setState({ kind: 'error', message: 'Transcription failed. Please try again.' });
          return;
        }
        setState({ kind: 'polling', meetingId, status: data.status });
        pollRef.current = setTimeout(poll, 3000);
      } catch {
        pollRef.current = setTimeout(poll, 3000);
      }
    };
    poll();
  }, []);

  const handleUpload = () => {
    if (!file) return;
    const token = localStorage.getItem('notemind_token');

    const form = new FormData();
    form.append('file', file);
    form.append('title', title || file.name);
    form.append('date', date);

    setState({ kind: 'uploading', progress: 0, message: 'Uploading… 0%' });

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setState({ kind: 'uploading', progress: pct, message: `Uploading… ${pct}%` });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { id?: string; meeting_id?: string };
          const meetingId = data.meeting_id ?? data.id ?? '';
          setState({ kind: 'polling', meetingId, status: 'processing' });
          pollStatus(meetingId);
        } catch {
          setState({ kind: 'error', message: 'Upload succeeded but response was unexpected.' });
        }
      } else {
        let msg = 'Upload failed.';
        try {
          const err = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          msg = err.message ?? err.error ?? msg;
        } catch { /* ignore */ }
        setState({ kind: 'error', message: msg });
      }
    };

    xhr.onerror = () => {
      setState({ kind: 'error', message: 'Network error during upload.' });
    };

    xhr.open('POST', `${API_BASE}/meetings/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(form);
  };

  const handleRetry = () => {
    setState({ kind: 'idle' });
  };

  const handleRemoveFile = () => {
    setFile(null);
    setTitle('');
    setSizeError(null);
    setState({ kind: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isUploading = state.kind === 'uploading' || state.kind === 'polling';

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Upload recording</h1>
        <p className="text-sm text-muted-foreground">Upload an audio or video file to transcribe and analyze</p>
      </div>

      {/* Done state */}
      {state.kind === 'done' && (
        <Panel padding="lg" className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Transcription complete!</h2>
          <p className="text-sm text-muted-foreground mb-5">Your meeting has been transcribed and analyzed.</p>
          <button
            onClick={() => router.push(`/dashboard/meetings/${state.meetingId}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl font-semibold text-sm transition-colors"
          >
            View meeting <ArrowRight size={16} />
          </button>
        </Panel>
      )}

      {state.kind !== 'done' && (
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`
              relative border-2 rounded-2xl p-10 text-center transition-all cursor-pointer
              ${dragOver
                ? 'border-brand bg-brand-pale'
                : file
                ? 'border-border bg-surface-2 cursor-default'
                : 'border-dashed border-border hover:border-accent/60 hover:bg-surface-3/40'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />

            {file ? (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <UploadIcon size={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
                </div>
                {!isUploading && (
                  <button
                    onClick={e => { e.stopPropagation(); handleRemoveFile(); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-3 border border-border flex items-center justify-center">
                  <UploadIcon size={22} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Drop audio file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  MP3, MP4, WAV, M4A, WEBM — max 500 MB
                </p>
              </div>
            )}
          </div>

          {sizeError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {sizeError}
            </div>
          )}

          {/* Form fields (shown after file selected) */}
          {file && state.kind === 'idle' && (
            <Panel padding="md" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Meeting title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Q2 Planning Call"
                  className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Meeting date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-background border border-border text-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                />
              </div>
            </Panel>
          )}

          {/* Progress / status */}
          {state.kind === 'uploading' && (
            <Panel padding="md" className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{state.message}</span>
                <span className="text-muted-foreground">{state.progress}%</span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </Panel>
          )}

          {state.kind === 'polling' && (
            <Panel padding="md" className="flex items-center gap-3">
              <StatusBadge status={state.status} />
              <span className="text-sm text-muted-foreground">Processing your audio…</span>
            </Panel>
          )}

          {/* Error */}
          {state.kind === 'error' && (
            <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} />
                {state.message}
              </div>
              <button
                onClick={handleRetry}
                className="text-xs font-semibold text-red-600 underline underline-offset-2 shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Upload button */}
          {file && state.kind === 'idle' && (
            <button
              onClick={handleUpload}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand hover:bg-brand-mid text-white font-bold rounded-xl transition-colors"
            >
              <UploadIcon size={18} />
              Upload &amp; Transcribe
            </button>
          )}
        </div>
      )}
    </div>
  );
}
