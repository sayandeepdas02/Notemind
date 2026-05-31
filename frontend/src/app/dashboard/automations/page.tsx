'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Zap, Plus, Trash2, Edit2, X, ChevronDown, ChevronUp,
  Check, AlertCircle, Loader2,
} from 'lucide-react';
import { api, APIError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/ui/panel';

// ── Types ─────────────────────────────────────────────────────

type TriggerEvent = 'when_meeting_scheduled' | 'when_meeting_starts' | 'when_meeting_ends';
type ConditionOp = 'eq' | 'contains' | 'not_contains' | 'starts_with';
type ActionType = 'auto_join' | 'skip' | 'add_tag' | 'send_notification';

interface Condition {
  field: string;
  op: ConditionOp;
  value: string;
}

interface RuleAction {
  type: ActionType;
  params?: Record<string, string>;
}

interface Rule {
  id: string;
  name: string;
  trigger: TriggerEvent;
  conditions: Condition[];
  actions: RuleAction[];
  enabled: boolean;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────

const TRIGGER_LABELS: Record<TriggerEvent, { label: string; color: string }> = {
  when_meeting_scheduled: { label: 'Meeting scheduled', color: 'bg-blue-500/10 text-blue-400' },
  when_meeting_starts:    { label: 'Meeting starts',    color: 'bg-orange-50 text-orange-600' },
  when_meeting_ends:      { label: 'Meeting ends',      color: 'bg-green-500/10 text-green-400' },
};

const TRIGGER_VALUES: { value: TriggerEvent; label: string; desc: string }[] = [
  { value: 'when_meeting_scheduled', label: 'A meeting is scheduled', desc: 'Triggers when a calendar event with a meeting link is detected' },
  { value: 'when_meeting_starts',    label: 'A meeting starts',       desc: 'Triggers when the bot joins the meeting' },
  { value: 'when_meeting_ends',      label: 'A meeting ends',         desc: 'Triggers when the meeting finishes' },
];

const FIELD_LABELS: Record<string, string> = {
  title: 'Meeting title', provider: 'Platform',
  meeting_url: 'Meeting URL', attendee_domain: 'Attendee domain',
};

const OP_LABELS: Record<ConditionOp, string> = {
  contains: 'contains', not_contains: "doesn't contain",
  eq: 'equals', starts_with: 'starts with',
};

const ACTION_LABELS: Record<ActionType, string> = {
  auto_join:         'Auto-join this meeting',
  skip:              'Skip this meeting',
  add_tag:           'Add a tag',
  send_notification: 'Send email notification',
};

// ── Helpers ───────────────────────────────────────────────────

function summariseConditions(conditions: Condition[]): string {
  if (!conditions.length) return 'All meetings';
  return conditions.map(c =>
    `${FIELD_LABELS[c.field] ?? c.field} ${OP_LABELS[c.op] ?? c.op} "${c.value}"`
  ).join(' AND ');
}

function summariseActions(actions: RuleAction[]): string {
  return actions.map(a => {
    const label = ACTION_LABELS[a.type] ?? a.type;
    if (a.type === 'add_tag' && a.params?.tag) return `Add tag "${a.params.tag}"`;
    if (a.type === 'send_notification' && a.params?.email) return `Notify ${a.params.email}`;
    return label;
  }).join(' · ');
}

// ── Toggle switch ─────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-border'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
      )} />
    </button>
  );
}

// ── Rule Card ─────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: Rule;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trigger = TRIGGER_LABELS[rule.trigger] ?? { label: rule.trigger, color: 'bg-surface-3 text-muted-foreground' };

  return (
    <div className={cn(
      'p-5 bg-surface-2 border rounded-xl transition-all',
      rule.enabled ? 'border-border' : 'border-border/50 opacity-60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', trigger.color)}>
              {trigger.label}
            </span>
            {rule.name && (
              <span className="text-sm font-semibold text-foreground">{rule.name}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-foreground/70">If: </span>{summariseConditions(rule.conditions)}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Then: </span>{summariseActions(rule.actions)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Toggle checked={rule.enabled} onChange={v => onToggle(rule.id, v)} />
          <button
            onClick={() => onEdit(rule)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            <Edit2 size={14} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(rule.id)}
                className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-300 transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Default form state ────────────────────────────────────────

function emptyForm(): Partial<Rule> {
  return {
    name: '',
    trigger: 'when_meeting_ends',
    conditions: [],
    actions: [],
    enabled: true,
  };
}

// ── Rule Builder Modal ────────────────────────────────────────

function RuleBuilder({
  initial,
  onSave,
  onClose,
}: {
  initial?: Rule;
  onSave: (rule: Partial<Rule>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Rule>>(initial ?? emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const updateField = <K extends keyof Rule>(k: K, v: Rule[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const addCondition = () =>
    setForm(prev => ({
      ...prev,
      conditions: [...(prev.conditions ?? []), { field: 'title', op: 'contains', value: '' }],
    }));

  const removeCondition = (i: number) =>
    setForm(prev => ({
      ...prev,
      conditions: (prev.conditions ?? []).filter((_, idx) => idx !== i),
    }));

  const updateCondition = (i: number, patch: Partial<Condition>) =>
    setForm(prev => ({
      ...prev,
      conditions: (prev.conditions ?? []).map((c, idx) => idx === i ? { ...c, ...patch } : c),
    }));

  const toggleAction = (type: ActionType) => {
    const current = form.actions ?? [];
    const has = current.some(a => a.type === type);
    if (has) {
      setForm(prev => ({ ...prev, actions: (prev.actions ?? []).filter(a => a.type !== type) }));
    } else {
      // auto_join and skip are mutually exclusive
      const filtered = (type === 'auto_join' || type === 'skip')
        ? current.filter(a => a.type !== 'auto_join' && a.type !== 'skip')
        : current;
      setForm(prev => ({ ...prev, actions: [...filtered, { type, params: {} }] }));
    }
  };

  const updateActionParam = (type: ActionType, key: string, value: string) =>
    setForm(prev => ({
      ...prev,
      actions: (prev.actions ?? []).map(a =>
        a.type === type ? { ...a, params: { ...(a.params ?? {}), [key]: value } } : a
      ),
    }));

  const handleSave = async () => {
    if (!form.actions?.length) { setErr('Add at least one action.'); return; }
    setSaving(true);
    setErr(null);
    try {
      await onSave(form);
    } catch (e) {
      setErr(e instanceof APIError ? e.message : 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const hasAction = (type: ActionType) => (form.actions ?? []).some(a => a.type === type);
  const getAction = (type: ActionType) => (form.actions ?? []).find(a => a.type === type);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-2 border border-border rounded-2xl shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2 z-10">
          <h2 className="text-sm font-bold text-foreground">
            {initial ? 'Edit rule' : 'Create rule'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1 — Trigger */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              1 · Trigger
            </p>
            <div className="space-y-2">
              {TRIGGER_VALUES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => updateField('trigger', t.value)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border transition-all',
                    form.trigger === t.value
                      ? 'border-brand bg-brand/10'
                      : 'border-border bg-surface-3 hover:border-border/60'
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2 · Conditions (optional)
              </p>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-brand hover:text-brand-mid transition-colors"
              >
                <Plus size={12} /> Add condition
              </button>
            </div>
            {!form.conditions?.length && (
              <p className="text-xs text-muted-foreground italic">No conditions — applies to all meetings</p>
            )}
            <div className="space-y-2">
              {form.conditions?.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={c.field}
                    onChange={e => updateCondition(i, { field: e.target.value })}
                    className="flex-1 bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                  >
                    {Object.entries(FIELD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <select
                    value={c.op}
                    onChange={e => updateCondition(i, { op: e.target.value as ConditionOp })}
                    className="flex-1 bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                  >
                    {Object.entries(OP_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={c.value}
                    onChange={e => updateCondition(i, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(i)}
                    className="text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 — Actions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              3 · Actions (choose at least one)
            </p>
            <div className="space-y-2">
              {(['auto_join', 'skip', 'add_tag', 'send_notification'] as ActionType[]).map(type => {
                const active = hasAction(type);
                const action = getAction(type);
                return (
                  <div key={type} className={cn(
                    'rounded-xl border transition-all',
                    active ? 'border-brand/40 bg-brand/5' : 'border-border'
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleAction(type)}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      <div className={cn(
                        'w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-colors',
                        active ? 'bg-brand border-brand' : 'border-border'
                      )}>
                        {active && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium text-foreground">{ACTION_LABELS[type]}</span>
                    </button>

                    {active && type === 'add_tag' && (
                      <div className="px-4 pb-3">
                        <input
                          type="text"
                          value={action?.params?.tag ?? ''}
                          onChange={e => updateActionParam(type, 'tag', e.target.value)}
                          placeholder="Tag name, e.g. standup"
                          className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                        />
                      </div>
                    )}

                    {active && type === 'send_notification' && (
                      <div className="px-4 pb-3">
                        <input
                          type="email"
                          value={action?.params?.email ?? ''}
                          onChange={e => updateActionParam(type, 'email', e.target.value)}
                          placeholder="email@example.com"
                          className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 4 — Name */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              4 · Rule name (optional)
            </p>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g. Auto-join standups"
              className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/10 transition-all"
            />
          </div>

          {err && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {err}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-mid text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | undefined>(undefined);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Rule[]>('/automation/rules');
      setRules(data ?? []);
    } catch (e) {
      setError(e instanceof APIError ? e.message : 'Failed to load rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleToggle = async (id: string, enabled: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    try {
      const rule = rules.find(r => r.id === id)!;
      await api.put(`/automation/rules/${id}`, { ...rule, enabled });
    } catch {
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !enabled } : r));
    }
  };

  const handleDelete = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await api.delete(`/automation/rules/${id}`);
    } catch {
      fetchRules();
    }
  };

  const handleSave = async (form: Partial<Rule>) => {
    if (editing?.id) {
      const updated = await api.put<Rule>(`/automation/rules/${editing.id}`, form);
      setRules(prev => prev.map(r => r.id === editing.id ? updated : r));
    } else {
      const created = await api.post<Rule>('/automation/rules', form);
      setRules(prev => [...prev, created]);
    }
    setBuilderOpen(false);
    setEditing(undefined);
  };

  const openNew = () => { setEditing(undefined); setBuilderOpen(true); };
  const openEdit = (rule: Rule) => { setEditing(rule); setBuilderOpen(true); };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap size={20} className="text-brand" />
            Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rules that run automatically when meetings match your conditions.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-mid text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> New rule
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Rules list */}
      {!loading && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && rules.length === 0 && (
        <Panel padding="lg" className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-surface-3 border border-border flex items-center justify-center mx-auto mb-5">
            <Zap size={24} className="text-brand opacity-60" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Automate your meetings</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-7">
            Rules run automatically when meetings match your conditions.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <Plus size={16} /> Create your first rule
          </button>
        </Panel>
      )}

      {/* Rule builder modal */}
      {builderOpen && (
        <RuleBuilder
          initial={editing}
          onSave={handleSave}
          onClose={() => { setBuilderOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
