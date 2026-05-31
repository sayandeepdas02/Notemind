'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FolderOpen, Pencil, Check, X, Link as LinkIcon } from 'lucide-react';
import { api, APIError } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ─────────────────────────────────────────────────────

interface Folder {
  id: string;
  name: string;
  workspace_id?: string;
  created_at?: string;
}

// ── Page ──────────────────────────────────────────────────────

export default function FolderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const folders = await api.get<Folder[]>('/folders');
        const found = (folders ?? []).find(f => f.id === id);
        if (!found) {
          setError('Folder not found.');
        } else {
          setFolder(found);
          setEditName(found.name);
        }
      } catch (err) {
        setError(err instanceof APIError ? err.message : 'Failed to load folder.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setEditName(folder?.name ?? '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(folder?.name ?? '');
  };

  const handleSave = async () => {
    if (!folder || !editName.trim()) return;
    setSaving(true);
    try {
      await api.put<Folder>(`/folders/${id}`, { name: editName.trim() });
      setFolder(prev => prev ? { ...prev, name: editName.trim() } : prev);
      setEditing(false);
    } catch {
      // silent — keep editing open
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') cancelEdit();
  };

  // ── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-5 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────

  if (error || !folder) {
    return (
      <div className="p-5 lg:p-8 max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <Panel padding="lg" className="text-center">
          <FolderOpen size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">{error ?? 'Folder not found.'}</p>
        </Panel>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Back to dashboard
      </button>

      {/* Folder header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
          <FolderOpen size={20} className="text-accent" />
        </div>

        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-background border border-border text-foreground px-3 py-1.5 rounded-lg text-xl font-bold focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 text-brand hover:bg-brand/10 rounded-lg transition-colors"
              title="Save"
            >
              <Check size={16} />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{folder.name}</h1>
            <button
              onClick={startEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Edit name"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      <Panel padding="lg" className="text-center">
        <div className="w-14 h-14 rounded-full bg-surface-3 flex items-center justify-center mx-auto mb-4">
          <LinkIcon size={20} className="text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">No meetings in this folder</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Assign meetings to this folder from the meetings dashboard.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Go to dashboard
        </button>
      </Panel>
    </div>
  );
}
