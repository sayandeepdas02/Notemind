'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Building,
  Plug,
  Bell,
  CreditCard,
  AlertTriangle,
  Save,
  Check,
  CalendarDays,
  Video,
  Trash2,
  X,
  ChevronRight,
  UserPlus,
  Key,
  Copy,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api, APIError, getStoredUser } from '@/lib/api';
import type { User, Workspace, APIKey, CreateAPIKeyResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Tab definitions ───────────────────────────────────────────

type Tab = 'profile' | 'workspace' | 'integrations' | 'api_keys' | 'notifications' | 'billing' | 'danger';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'workspace', label: 'Workspace', icon: Building },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'api_keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

// ── Toggle switch ─────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none',
        checked ? 'bg-[#6366f1]' : 'bg-border'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// ── Role badge ────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-purple-500/10 text-purple-400',
    admin: 'bg-blue-500/10 text-blue-400',
    member: 'bg-white/5 text-zinc-400',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[role] ?? styles.member)}>
      {role}
    </span>
  );
}

// ── Delete account modal ──────────────────────────────────────

function DeleteModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-2 border border-border rounded-2xl p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Delete account</h3>
            <p className="text-sm text-muted-foreground">This action is irreversible</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Deleting your account will permanently remove all your meetings, transcripts, and AI memory. Your workspace members will lose access.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-surface-3 border border-border text-foreground rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // TODO: implement account deletion via api.delete('/users/me')
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile section ───────────────────────────────────────────

function ProfileSection({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<User>('/users/me', { name });
      localStorage.setItem('notemind_user', JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal information</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
          {initials || 'U'}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Display name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full bg-background border border-border text-muted-foreground px-4 py-3 rounded-xl opacity-60 cursor-not-allowed"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || name === user.name}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ── Workspace section ─────────────────────────────────────────

function WorkspaceSection() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [wsName, setWsName] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('notemind_workspace');
    if (raw) {
      try {
        const ws: Workspace = JSON.parse(raw);
        setWorkspace(ws);
        setWsName(ws.name);
        // Load members
        api.get<{ id: string; name: string; email: string; role: string }[]>(`/workspaces/${ws.id}/members`)
          .then(data => setMembers(data ?? []))
          .catch(() => {})
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleSaveName = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      await api.put(`/workspaces/${workspace.id}`, { name: wsName });
      const updated = { ...workspace, name: wsName };
      setWorkspace(updated);
      localStorage.setItem('notemind_workspace', JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!workspace || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await api.post(`/workspaces/${workspace.id}/members`, { email: inviteEmail.trim(), role: 'member' });
      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof APIError ? err.message : 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Workspace</h2>
        <p className="text-sm text-muted-foreground">Manage your workspace and team</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Workspace name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={wsName}
            onChange={e => setWsName(e.target.value)}
            className="flex-1 bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || wsName === workspace?.name}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Members</h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members found.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-3 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-foreground font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Invite member</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            <UserPlus size={16} />
            Invite
          </button>
        </div>
        {inviteError && <p className="text-xs text-red-400 mt-2">{inviteError}</p>}
      </div>
    </div>
  );
}

// ── Integrations section ──────────────────────────────────────

function IntegrationsSection() {
  const [calStatus, setCalStatus] = useState<{ connected: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    api.get<{ connected: boolean }>('/calendar/status')
      .then(d => setCalStatus(d))
      .catch(() => setCalStatus({ connected: false }));
  }, []);

  const handleCalendarSync = async () => {
    setSyncing(true);
    try {
      await api.post('/calendar/sync', {});
      setSyncMsg('Synced!');
      setTimeout(() => setSyncMsg(''), 2000);
    } catch {
      setSyncMsg('Sync failed');
      setTimeout(() => setSyncMsg(''), 2000);
    } finally {
      setSyncing(false);
    }
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('notemind_token') : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground">Connect your tools to Notemind</p>
      </div>

      {/* Google Calendar */}
      <Panel padding="md" className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <CalendarDays size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Google Calendar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-join scheduled meetings</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {calStatus === null ? (
            <Skeleton className="h-6 w-20" />
          ) : calStatus.connected ? (
            <>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400">Connected</span>
              <button
                onClick={handleCalendarSync}
                disabled={syncing}
                className="px-3 py-1.5 bg-surface-3 border border-border text-foreground rounded-lg text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {syncMsg || (syncing ? 'Syncing…' : 'Sync now')}
              </button>
            </>
          ) : (
            <>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-zinc-400">Not connected</span>
              <button
                onClick={() => { window.location.href = `${API_BASE}/auth/google-calendar`; }}
                className="px-3 py-1.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Connect
              </button>
            </>
          )}
        </div>
      </Panel>

      {/* Zoom */}
      <Panel padding="md" className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Video size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Zoom</p>
          <p className="text-xs text-muted-foreground mt-0.5">Join Zoom meetings automatically</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-zinc-400">Not connected</span>
          <button
            onClick={() => {
              window.location.href = `${API_BASE}/auth/zoom${token ? `?token=${token}` : ''}`;
            }}
            className="px-3 py-1.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Connect
          </button>
        </div>
      </Panel>
    </div>
  );
}

// ── Notifications section ─────────────────────────────────────

function NotificationsSection() {
  const [emailSummary, setEmailSummary] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">Choose what you want to be notified about</p>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Email me when summary is ready', value: emailSummary, onChange: setEmailSummary },
          { label: 'Meeting reminders 5 min before', value: meetingReminders, onChange: setMeetingReminders },
          { label: 'Weekly digest', value: weeklyDigest, onChange: setWeeklyDigest },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between p-4 bg-surface-3 border border-border rounded-xl">
            <span className="text-sm text-foreground">{item.label}</span>
            <Toggle checked={item.value} onChange={item.onChange} />
          </div>
        ))}
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Check size={16} />
          Preferences saved!
        </div>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors"
      >
        <Save size={16} />
        Save preferences
      </button>
    </div>
  );
}

// ── Billing section ───────────────────────────────────────────

function BillingSection() {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    try {
      const raw = localStorage.getItem('notemind_workspace');
      const workspace = raw ? JSON.parse(raw) as Workspace : null;
      // TODO: wire up real price_id when billing is ready
      const res = await api.post<{ url?: string }>('/billing/checkout', {
        workspace_id: workspace?.id ?? '',
        price_id: 'pro',
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      // TODO: surface billing errors properly when endpoint is implemented
      setError('Billing is not yet available. Please try again later.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Billing</h2>
        <p className="text-sm text-muted-foreground">Manage your subscription</p>
      </div>

      <Panel padding="md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Current plan</p>
            <p className="text-2xl font-bold text-foreground mt-1">Free</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-zinc-400">Active</span>
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Meetings used</span>
            <span>0 / 10</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#6366f1] rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </Panel>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleUpgrade}
        disabled={upgrading}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
      >
        <CreditCard size={16} />
        {upgrading ? 'Redirecting…' : 'Upgrade to Pro'}
      </button>
    </div>
  );
}

// ── Danger zone section ───────────────────────────────────────

function DangerSection() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">These actions are irreversible. Proceed with caution.</p>
      </div>

      <div className="border border-red-500/30 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Delete my account</p>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently delete your account and all associated data, including meetings, transcripts, and AI memory.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors shrink-0"
          >
            <Trash2 size={14} />
            Delete account
          </button>
        </div>
      </div>

      {modalOpen && <DeleteModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ── API Keys section ──────────────────────────────────────────

const AVAILABLE_SCOPES = [
  { value: 'meetings:read', label: 'Read meetings' },
  { value: 'meetings:write', label: 'Create meetings' },
  { value: 'transcripts:read', label: 'Read transcripts' },
  { value: 'intelligence:read', label: 'Read AI insights' },
];

function APIKeysSection() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['meetings:read']);
  const [generating, setGenerating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.get<APIKey[]>('/api-keys');
      setKeys(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleGenerate = async () => {
    if (!newKeyName.trim()) { setGenError('Name is required'); return; }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.post<CreateAPIKeyResponse>('/api-keys', {
        name: newKeyName.trim(),
        scopes: newKeyScopes,
      });
      setCreatedKey(res.raw_key);
      setKeys(prev => [res.key, ...prev]);
    } catch (err) {
      setGenError(err instanceof APIError ? err.message : 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch {
      // silent
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewKeyName('');
    setNewKeyScopes(['meetings:read']);
    setCreatedKey(null);
    setCopied(false);
    setKeyVisible(false);
    setGenError(null);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">API Keys</h2>
          <p className="text-sm text-muted-foreground">Use API keys to authenticate programmatic access</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <Plus size={15} />
          New key
        </button>
      </div>

      {/* Usage example */}
      <div className="bg-background border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Usage example</p>
        <code className="text-xs text-foreground/80 font-mono break-all">
          curl -H &quot;Authorization: Bearer nm_your_key_here&quot; https://api.notemind.ai/meetings
        </code>
      </div>

      {/* Key table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Key size={24} className="text-muted-foreground opacity-30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Prefix</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Last used</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 text-foreground font-medium truncate max-w-[140px]">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}…</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md bg-surface-2 border border-border rounded-2xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {createdKey ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Check size={20} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Key created</h3>
                    <p className="text-xs text-muted-foreground">Copy it now — it won&apos;t be shown again</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground overflow-hidden">
                    {keyVisible ? createdKey : createdKey.slice(0, 8) + '•'.repeat(24)}
                  </div>
                  <button
                    onClick={() => setKeyVisible(v => !v)}
                    className="p-2 bg-surface-3 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {keyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#6366f1] text-white rounded-lg text-xs font-semibold hover:bg-[#818cf8] transition-colors shrink-0"
                  >
                    <Copy size={13} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3 mb-5">
                  Store this key securely. You won&apos;t be able to retrieve it after closing this dialog.
                </p>
                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2.5 bg-surface-3 border border-border text-foreground rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-foreground">Generate API key</h3>
                  <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Key name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={e => { setNewKeyName(e.target.value); setGenError(null); }}
                      placeholder="e.g. CI pipeline, personal"
                      className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Scopes</label>
                    <div className="space-y-2">
                      {AVAILABLE_SCOPES.map(s => (
                        <label key={s.value} className="flex items-center gap-3 p-3 bg-surface-3 border border-border rounded-lg cursor-pointer hover:border-accent/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={newKeyScopes.includes(s.value)}
                            onChange={() => toggleScope(s.value)}
                            className="accent-[#6366f1]"
                          />
                          <span className="text-sm text-foreground">{s.label}</span>
                          <code className="ml-auto text-[10px] text-muted-foreground font-mono">{s.value}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {genError && <p className="mt-3 text-sm text-red-400">{genError}</p>}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 bg-surface-3 border border-border text-foreground rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || newKeyScopes.length === 0}
                    className="flex-1 px-4 py-2.5 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {generating ? 'Generating…' : 'Generate key'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const activeTab = (searchParams.get('tab') as Tab) ?? 'profile';

  useEffect(() => {
    const u = getStoredUser();
    if (u) setUser(u);
  }, []);

  const setTab = (tab: Tab) => {
    router.push(`/dashboard/settings?tab=${tab}`, { scroll: false });
  };

  if (!user) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>

      {/* Mobile tab select */}
      <div className="block md:hidden mb-6">
        <select
          value={activeTab}
          onChange={e => setTab(e.target.value as Tab)}
          className="w-full bg-background border border-border text-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-[#6366f1] transition-all"
        >
          {TABS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* Left nav — desktop */}
        <nav className="hidden md:flex flex-col gap-0.5 w-48 shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left w-full transition-colors',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-3',
                  t.id === 'danger' && !active && 'hover:text-red-400'
                )}
              >
                <Icon size={15} />
                {t.label}
                {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Panel padding="lg">
            {activeTab === 'profile'
              ? <ProfileSection user={user} />
              : activeTab === 'workspace'
              ? <WorkspaceSection />
              : activeTab === 'integrations'
              ? <IntegrationsSection />
              : activeTab === 'api_keys'
              ? <APIKeysSection />
              : activeTab === 'notifications'
              ? <NotificationsSection />
              : activeTab === 'billing'
              ? <BillingSection />
              : <DangerSection />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
