'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  User as UserIcon, Building, Plug, Bell, CreditCard, AlertTriangle,
  Save, Check, CalendarDays, Video, Trash2, X, ChevronRight,
  UserPlus, Key, Copy, Plus, Eye, EyeOff,
} from 'lucide-react';
import { api, APIError, getStoredUser } from '@/lib/api';
import type { User, Workspace, APIKey, CreateAPIKeyResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

type Tab = 'profile' | 'workspace' | 'integrations' | 'api_keys' | 'notifications' | 'billing' | 'danger';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',       icon: UserIcon },
  { id: 'workspace',     label: 'Workspace',      icon: Building },
  { id: 'integrations',  label: 'Integrations',   icon: Plug },
  { id: 'api_keys',      label: 'API Keys',       icon: Key },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'danger',        label: 'Danger Zone',    icon: AlertTriangle },
];

// ── Toggle ────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20',
        checked ? 'bg-brand' : 'bg-gray-200'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
      )} />
    </button>
  );
}

// ── Role badge ────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner:  'bg-brand-light text-brand',
    admin:  'bg-brand/10 text-brand',
    member: 'bg-gray-100 text-ink-4',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[role] ?? styles.member)}>
      {role}
    </span>
  );
}

// ── Delete Modal ──────────────────────────────────────────────

function DeleteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      localStorage.clear();
      router.push('/');
    } catch {
      // Account deletion coming soon — show a proper message
      alert('Account deletion is not yet available. Please contact support at hello@notemind.ai.');
    } finally {
      setDeleting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 id="delete-modal-title" className="text-[15px] font-semibold text-ink">Delete account</h3>
            <p className="text-[13px] text-ink-4">This action is irreversible</p>
          </div>
        </div>
        <p className="text-[13px] text-ink-3 mb-5 leading-relaxed">
          Deleting your account will permanently remove all your meetings, transcripts, and AI memory.
          Type <strong className="text-ink">DELETE</strong> to confirm.
        </p>
        <input
          type="text"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Type DELETE to confirm"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-ink mb-5
                     focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 text-ink-2 rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirm !== 'DELETE'}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-[13px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────

function ProfileSection({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

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
        <h2 className="text-[17px] font-semibold text-ink mb-1">Profile</h2>
        <p className="text-[13px] text-ink-4">Manage your personal information</p>
      </div>

      <div className="flex items-center gap-4">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-xl font-bold text-white shrink-0">
            {initials || 'U'}
          </div>
        )}
        <div>
          <p className="text-[14px] font-medium text-ink">{user.name}</p>
          <p className="text-[12px] text-ink-4">{user.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2">Display name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white border border-gray-200 text-ink px-4 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-[14px]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-2">Email</label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full bg-gray-50 border border-gray-200 text-ink-4 px-4 py-3 rounded-xl opacity-70 cursor-not-allowed text-[14px]"
          />
        </div>
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || name === user.name}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50"
      >
        {saved ? <Check size={15} /> : <Save size={15} />}
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ── Workspace ─────────────────────────────────────────────────

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
        api.get<{ id: string; name: string; email: string; role: string }[]>(`/workspaces/${ws.id}/members`)
          .then(data => setMembers(data ?? []))
          .catch(() => {})
          .finally(() => setLoading(false));
      } catch { setLoading(false); }
    } else { setLoading(false); }
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
    } catch { /* silent */ } finally { setSaving(false); }
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
    } finally { setInviting(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-ink mb-1">Workspace</h2>
        <p className="text-[13px] text-ink-4">Manage your workspace and team</p>
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink-2 mb-2">Workspace name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={wsName}
            onChange={e => setWsName(e.target.value)}
            className="flex-1 bg-white border border-gray-200 text-ink px-4 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-[14px]"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || wsName === workspace?.name}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-3">Members</h3>
        {members.length === 0 ? (
          <p className="text-[13px] text-ink-4">No members found.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4">Name</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4">Email</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-ink font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-ink-4">{m.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-3">Invite member</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 bg-white border border-gray-200 text-ink placeholder:text-ink-5 px-4 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-[14px]"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            <UserPlus size={15} />
            Invite
          </button>
        </div>
        {inviteError && <p className="text-[12px] text-red-600 mt-2">{inviteError}</p>}
      </div>
    </div>
  );
}

// ── Integrations ──────────────────────────────────────────────

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
    } finally { setSyncing(false); }
  };

  const integrations = [
    {
      icon: CalendarDays,
      iconBg: 'bg-brand-light',
      iconColor: 'text-brand',
      name: 'Google Calendar',
      desc: 'Auto-join scheduled meetings',
      connected: calStatus?.connected ?? null,
      onConnect: () => { window.location.href = `${API_BASE}/auth/google-calendar`; },
      onAction: handleCalendarSync,
      actionLabel: syncMsg || (syncing ? 'Syncing…' : 'Sync now'),
      syncing,
    },
    {
      icon: Video,
      iconBg: 'bg-brand-light',
      iconColor: 'text-brand',
      name: 'Zoom',
      desc: 'Join Zoom meetings automatically',
      connected: false as boolean,
      onConnect: async () => {
        try {
          const { url } = await api.post<{ url: string }>('/auth/zoom/initiate', {});
          window.location.href = url;
        } catch { /* user will see nothing happen — acceptable for a connect button */ }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-ink mb-1">Integrations</h2>
        <p className="text-[13px] text-ink-4">Connect your tools to Notemind</p>
      </div>
      {integrations.map(int => {
        const Icon = int.icon;
        return (
          <Panel key={int.name} padding="md" className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${int.iconBg} flex items-center justify-center shrink-0`}>
              <Icon size={20} className={int.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink">{int.name}</p>
              <p className="text-[12px] text-ink-4 mt-0.5">{int.desc}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {int.connected === null ? (
                <Skeleton className="h-6 w-20" />
              ) : int.connected ? (
                <>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-light text-brand">Connected</span>
                  {int.onAction && (
                    <button
                      onClick={int.onAction}
                      disabled={int.syncing}
                      className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-ink-2 rounded-lg text-[12px] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {int.actionLabel}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">Not connected</span>
                  <button
                    onClick={int.onConnect}
                    className="px-3 py-1.5 bg-brand hover:bg-brand-mid text-white rounded-lg text-[12px] font-semibold transition-colors"
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────

function NotificationsSection() {
  const [emailSummary, setEmailSummary] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-ink mb-1">Notifications</h2>
        <p className="text-[13px] text-ink-4">Choose what you want to be notified about</p>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Email me when summary is ready', value: emailSummary, onChange: setEmailSummary },
          { label: 'Meeting reminders 5 min before', value: meetingReminders, onChange: setMeetingReminders },
          { label: 'Weekly digest', value: weeklyDigest, onChange: setWeeklyDigest },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <span className="text-[14px] text-ink">{item.label}</span>
            <Toggle checked={item.value} onChange={item.onChange} />
          </div>
        ))}
      </div>
      {saved && (
        <div className="flex items-center gap-2 text-brand text-[13px]">
          <Check size={15} /> Preferences saved!
        </div>
      )}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors"
      >
        <Save size={15} /> Save preferences
      </button>
    </div>
  );
}

// ── Billing ───────────────────────────────────────────────────

function BillingSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-ink mb-1">Billing</h2>
        <p className="text-[13px] text-ink-4">Manage your subscription</p>
      </div>

      <Panel padding="md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">Current plan</p>
            <p className="text-[28px] font-serif text-ink mt-1">Free</p>
          </div>
          <span className="px-3 py-1 rounded-full text-[12px] font-semibold bg-brand-light text-brand">Active</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-[12px] text-ink-4 mb-2">
            <span>Meetings used this month</span>
            <span>0 / 5</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: '0%' }} />
          </div>
          <p className="text-[11px] text-ink-5 mt-1.5">5 meetings per month on the free plan</p>
        </div>
      </Panel>

      <div className="p-5 bg-navy rounded-2xl">
        <p className="text-[15px] font-semibold text-white mb-1">Upgrade to Pro</p>
        <p className="text-[13px] text-white/60 mb-4">Unlimited meetings, AI Memory, and more — $18/seat/month</p>
        <button
          disabled
          title="Pro billing coming soon"
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-[13px] font-semibold opacity-60 cursor-not-allowed"
        >
          <CreditCard size={15} />
          Coming soon
        </button>
      </div>
    </div>
  );
}

// ── Danger ────────────────────────────────────────────────────

function DangerSection() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-[13px] text-ink-4">These actions are irreversible. Proceed with caution.</p>
      </div>
      <div className="border border-red-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Delete my account</p>
            <p className="text-[12px] text-ink-4 mt-1">
              Permanently delete your account and all data, including meetings, transcripts, and AI memory.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[13px] font-semibold hover:bg-red-100 transition-colors shrink-0"
          >
            <Trash2 size={13} /> Delete account
          </button>
        </div>
      </div>
      {modalOpen && <DeleteModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ── API Keys ──────────────────────────────────────────────────

const AVAILABLE_SCOPES = [
  { value: 'meetings:read',    label: 'Read meetings' },
  { value: 'meetings:write',   label: 'Create meetings' },
  { value: 'transcripts:read', label: 'Read transcripts' },
  { value: 'intelligence:read',label: 'Read AI insights' },
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
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleGenerate = async () => {
    if (!newKeyName.trim()) { setGenError('Name is required'); return; }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.post<CreateAPIKeyResponse>('/api-keys', { name: newKeyName.trim(), scopes: newKeyScopes });
      setCreatedKey(res.raw_key);
      setKeys(prev => [res.key, ...prev]);
    } catch (err) {
      setGenError(err instanceof APIError ? err.message : 'Failed to generate key');
    } finally { setGenerating(false); }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch { /* silent */ }
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

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-semibold text-ink mb-1">API Keys</h2>
          <p className="text-[13px] text-ink-4">Authenticate programmatic access</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors shrink-0"
        >
          <Plus size={14} /> New key
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-[11px] text-ink-4 mb-2 font-medium uppercase tracking-wider">Usage example</p>
        <code className="text-[12px] text-ink-3 font-mono break-all">
          curl -H &quot;Authorization: Bearer nm_your_key_here&quot; https://api.notemind.ai/meetings
        </code>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : keys.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <Key size={24} className="text-ink-5 mx-auto mb-3" />
          <p className="text-[13px] text-ink-4">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4">Prefix</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4 hidden sm:table-cell">Created</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-ink-4 hidden md:table-cell">Last used</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-ink font-medium truncate max-w-[140px]">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-4">{k.key_prefix}…</td>
                  <td className="px-4 py-3 text-[12px] text-ink-4 hidden sm:table-cell">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-4 hidden md:table-cell">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRevoke(k.id)}
                      className="text-[12px] text-red-600 hover:text-red-700 transition-colors font-medium">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {createdKey ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                    <Check size={20} className="text-brand" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">Key created</h3>
                    <p className="text-[12px] text-ink-4">Copy it now — it won&apos;t be shown again</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-[12px] text-ink overflow-hidden">
                    {keyVisible ? createdKey : createdKey.slice(0, 8) + '•'.repeat(24)}
                  </div>
                  <button onClick={() => setKeyVisible(v => !v)}
                    className="p-2 bg-gray-100 border border-gray-200 rounded-lg text-ink-4 hover:text-ink-2 transition-colors shrink-0"
                    aria-label={keyVisible ? 'Hide key' : 'Show key'}
                  >
                    {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-[12px] font-semibold hover:bg-brand-mid transition-colors shrink-0"
                  >
                    <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
                  Store this key securely. You won&apos;t be able to retrieve it after closing this dialog.
                </p>
                <button onClick={closeModal}
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 text-ink rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors">
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[15px] font-semibold text-ink">Generate API key</h3>
                  <button aria-label="Close" onClick={closeModal} className="text-ink-4 hover:text-ink-2 transition-colors">
                    <X size={17} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-ink-2 mb-2">Key name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={e => { setNewKeyName(e.target.value); setGenError(null); }}
                      placeholder="e.g. CI pipeline, personal"
                      className="w-full bg-white border border-gray-200 text-ink placeholder:text-ink-5 px-4 py-3 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-ink-2 mb-2">Scopes</label>
                    <div className="space-y-2">
                      {AVAILABLE_SCOPES.map(s => (
                        <label key={s.value}
                          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-brand/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={newKeyScopes.includes(s.value)}
                            onChange={() => setNewKeyScopes(prev =>
                              prev.includes(s.value) ? prev.filter(x => x !== s.value) : [...prev, s.value]
                            )}
                            className="accent-brand w-4 h-4"
                          />
                          <span className="text-[13px] text-ink flex-1">{s.label}</span>
                          <code className="text-[10px] text-ink-5 font-mono">{s.value}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {genError && <p className="mt-3 text-[13px] text-red-600">{genError}</p>}
                <div className="flex gap-3 mt-6">
                  <button onClick={closeModal}
                    className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 text-ink rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || newKeyScopes.length === 0}
                    className="flex-1 px-4 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50"
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

  const setTab = (tab: Tab) => router.push(`/dashboard/settings?tab=${tab}`, { scroll: false });

  if (!user) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-[20px] font-semibold text-ink mb-6">Settings</h1>

      {/* Mobile scrollable chip row */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors shrink-0',
                activeTab === t.id
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-ink-3 hover:bg-gray-200',
                t.id === 'danger' && activeTab !== t.id && 'hover:text-red-600'
              )}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left w-full transition-colors',
                  active
                    ? 'bg-brand-light text-brand'
                    : 'text-ink-4 hover:text-ink hover:bg-off-white',
                  t.id === 'danger' && !active && 'hover:text-red-600'
                )}
              >
                <Icon size={14} />
                {t.label}
                {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          <Panel padding="lg">
            {activeTab === 'profile'       ? <ProfileSection user={user} />
            : activeTab === 'workspace'    ? <WorkspaceSection />
            : activeTab === 'integrations' ? <IntegrationsSection />
            : activeTab === 'api_keys'     ? <APIKeysSection />
            : activeTab === 'notifications'? <NotificationsSection />
            : activeTab === 'billing'      ? <BillingSection />
            : <DangerSection />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
