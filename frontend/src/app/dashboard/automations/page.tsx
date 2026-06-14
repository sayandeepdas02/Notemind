'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Zap, Plus, Trash2, Edit2, X, ChevronDown, ChevronUp,
  Check, AlertCircle, Loader2, Play, Activity, Info, ArrowRight, History
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

interface MockScenario {
  id: string;
  name: string;
  title: string;
  provider: string;
  meeting_url: string;
  attendees: string[];
}

interface SimulationStep {
  name: string;
  detail: string;
  status: 'match' | 'nomatch' | 'info';
}

interface SimulationResult {
  id: string;
  ruleName: string;
  scenarioName: string;
  matched: boolean;
  steps: SimulationStep[];
  actionsExecuted: string[];
  timestamp: string;
}

// ── Constants ─────────────────────────────────────────────────

const TRIGGER_LABELS: Record<TriggerEvent, { label: string; color: string }> = {
  when_meeting_scheduled: { label: 'Meeting scheduled', color: 'bg-brand/10 text-brand'    },
  when_meeting_starts:    { label: 'Meeting starts',    color: 'bg-brand-mid/10 text-brand' },
  when_meeting_ends:      { label: 'Meeting ends',      color: 'bg-gray-100 text-ink-3'     },
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

const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'sc-1',
    name: 'Weekly Engineering Standup (Meet)',
    title: 'Weekly Engineering Standup',
    provider: 'google_meet',
    meeting_url: 'https://meet.google.com/abc-defg-hij',
    attendees: ['developer-1@mycompany.com', 'designer@mycompany.com', 'manager@mycompany.com']
  },
  {
    id: 'sc-2',
    name: 'Sales Pitch with Acme Corp (Zoom)',
    title: 'Notemind <> Acme Corp Demo',
    provider: 'zoom',
    meeting_url: 'https://zoom.us/j/987654321',
    attendees: ['rep@mycompany.com', 'buyer@acme.com', 'admin@acme.com']
  },
  {
    id: 'sc-3',
    name: 'External Vendor Sync (Zoom)',
    title: 'Vendor Billing Review',
    provider: 'zoom',
    meeting_url: 'https://zoom.us/j/123456789',
    attendees: ['accounting@mycompany.com', 'sales@external-vendor.com']
  },
  {
    id: 'sc-4',
    name: 'General Internal Meeting (Meet)',
    title: 'Design brainstorm',
    provider: 'google_meet',
    meeting_url: 'https://meet.google.com/xyz-qpr-stu',
    attendees: ['designer@mycompany.com', 'pm@mycompany.com']
  }
];

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
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-all mt-0.5',
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
  const trigger = TRIGGER_LABELS[rule.trigger] ?? { label: rule.trigger, color: 'bg-off-white text-ink-4' };

  return (
    <div className={cn(
      'p-5 bg-white border rounded-xl transition-all shadow-sm',
      rule.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', trigger.color)}>
              {trigger.label}
            </span>
            {rule.name && (
              <span className="text-sm font-semibold text-ink">{rule.name}</span>
            )}
          </div>
          <p className="text-xs text-ink-4 mb-1 leading-relaxed">
            <span className="font-semibold text-ink-3">If: </span>{summariseConditions(rule.conditions)}
          </p>
          <p className="text-xs text-ink-4 leading-relaxed">
            <span className="font-semibold text-ink-3">Then: </span>{summariseActions(rule.actions)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Toggle checked={rule.enabled} onChange={v => onToggle(rule.id, v)} />
          <button
            onClick={() => onEdit(rule)}
            className="p-1.5 text-ink-4 hover:text-ink hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => onDelete(rule.id)}
                className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-semibold text-ink-4 hover:text-ink hover:bg-gray-50 rounded transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-ink-4 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <h2 className="text-sm font-bold text-ink">
            {initial ? 'Edit rule' : 'Create rule'}
          </h2>
          <button onClick={onClose} className="text-ink-4 hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1 — Trigger */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-4 mb-3">
              1 · Trigger Event
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
                      ? 'border-brand bg-brand-light/45 ring-1 ring-brand/10'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <p className="text-sm font-semibold text-ink">{t.label}</p>
                  <p className="text-xs text-ink-4 mt-0.5 leading-normal">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-4">
                2 · Filter Conditions (optional)
              </p>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-brand hover:text-brand-mid font-semibold transition-colors"
              >
                <Plus size={12} /> Add condition
              </button>
            </div>
            {!form.conditions?.length && (
              <p className="text-xs text-ink-5 italic">No conditions — rule applies to all calendar/meeting inputs.</p>
            )}
            <div className="space-y-2.5">
              {form.conditions?.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-off-white p-2.5 rounded-xl border border-gray-100 animate-float-up">
                  <select
                    value={c.field}
                    onChange={e => updateCondition(i, { field: e.target.value })}
                    className="flex-1 bg-white border border-gray-200 text-ink text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand"
                  >
                    {Object.entries(FIELD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <select
                    value={c.op}
                    onChange={e => updateCondition(i, { op: e.target.value as ConditionOp })}
                    className="flex-1 bg-white border border-gray-200 text-ink text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand"
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
                    className="flex-1 bg-white border border-gray-200 text-ink placeholder:text-ink-5 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(i)}
                    className="text-ink-4 hover:text-red-600 transition-colors shrink-0 p-1 rounded hover:bg-gray-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 — Actions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-4 mb-3">
              3 · Workflow Actions (choose at least one)
            </p>
            <div className="space-y-2">
              {(['auto_join', 'skip', 'add_tag', 'send_notification'] as ActionType[]).map(type => {
                const active = hasAction(type);
                const action = getAction(type);
                return (
                  <div key={type} className={cn(
                    'rounded-xl border transition-all',
                    active ? 'border-brand/30 bg-brand-pale/50' : 'border-gray-200 bg-white'
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleAction(type)}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      <div className={cn(
                        'w-4.5 h-4.5 rounded flex items-center justify-center border-2 shrink-0 transition-colors',
                        active ? 'bg-brand border-brand' : 'border-gray-300'
                      )}>
                        {active && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm font-semibold text-ink">{ACTION_LABELS[type]}</span>
                    </button>

                    {active && type === 'add_tag' && (
                      <div className="px-4 pb-3 animate-float-up">
                        <input
                          type="text"
                          value={action?.params?.tag ?? ''}
                          onChange={e => updateActionParam(type, 'tag', e.target.value)}
                          placeholder="Tag name, e.g. standup"
                          className="w-full bg-white border border-gray-200 text-ink placeholder:text-ink-5 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
                        />
                      </div>
                    )}

                    {active && type === 'send_notification' && (
                      <div className="px-4 pb-3 animate-float-up">
                        <input
                          type="email"
                          value={action?.params?.email ?? ''}
                          onChange={e => updateActionParam(type, 'email', e.target.value)}
                          placeholder="email@example.com"
                          className="w-full bg-white border border-gray-200 text-ink placeholder:text-ink-5 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
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
            <p className="text-xs font-bold uppercase tracking-wider text-ink-4 mb-3">
              4 · Rule name (optional)
            </p>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g. Auto-join standups"
              className="w-full bg-white border border-gray-200 text-ink placeholder:text-ink-5 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/10 transition-all"
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

  // Tab State
  const [activeTab, setActiveTab] = useState<'rules' | 'simulator'>('rules');

  // Simulation States
  const [simSelectedRuleId, setSimSelectedRuleId] = useState<string>('');
  const [simSelectedScenarioId, setSimSelectedScenarioId] = useState<string>(MOCK_SCENARIOS[0].id);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLogs, setSimLogs] = useState<SimulationResult[]>([]);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Rule[]>('/automation/rules');
      setRules(data ?? []);
      if (data && data.length > 0 && !simSelectedRuleId) {
        setSimSelectedRuleId(data[0].id);
      }
    } catch (e) {
      setError(e instanceof APIError ? e.message : 'Failed to load rules.');
    } finally {
      setLoading(false);
    }
  }, [simSelectedRuleId]);

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
      if (!simSelectedRuleId) setSimSelectedRuleId(created.id);
    }
    setBuilderOpen(false);
    setEditing(undefined);
  };

  const openNew = () => { setEditing(undefined); setBuilderOpen(true); };
  const openEdit = (rule: Rule) => { setEditing(rule); setBuilderOpen(true); };

  // Rule Simulation Engine
  const runSimulation = () => {
    const rule = rules.find(r => r.id === simSelectedRuleId);
    const scenario = MOCK_SCENARIOS.find(s => s.id === simSelectedScenarioId);

    if (!rule || !scenario) return;

    const steps: SimulationStep[] = [];
    const actionsExecuted: string[] = [];
    let ruleMatched = true;

    // Trigger Match check
    steps.push({
      name: '1 · Trigger Match Check',
      detail: `Evaluating event type. Rule trigger is "${TRIGGER_LABELS[rule.trigger]?.label ?? rule.trigger}". Scenario inputs trigger evaluation.`,
      status: 'info'
    });

    // Condition evaluations
    if (rule.conditions.length === 0) {
      steps.push({
        name: '2 · Condition Check',
        detail: 'No conditions defined. Rule applies to all meetings.',
        status: 'match'
      });
    } else {
      for (const cond of rule.conditions) {
        let fieldVal = '';
        if (cond.field === 'title') fieldVal = scenario.title;
        else if (cond.field === 'provider') fieldVal = scenario.provider;
        else if (cond.field === 'meeting_url') fieldVal = scenario.meeting_url;

        let matched = false;
        let displayDetail = '';

        if (cond.field === 'attendee_domain') {
          const matchingAttendees = scenario.attendees.filter(email => {
            const parts = email.split('@');
            return parts.length === 2 && parts[1].toLowerCase() === cond.value.toLowerCase();
          });
          
          if (cond.op === 'contains' || cond.op === 'eq') {
            matched = matchingAttendees.length > 0;
            displayDetail = matched
              ? `Attendee with domain "${cond.value}" found: ${matchingAttendees.join(', ')}`
              : `No attendee found with domain "${cond.value}"`;
          } else if (cond.op === 'not_contains') {
            matched = matchingAttendees.length === 0;
            displayDetail = matched
              ? `No attendees have domain "${cond.value}" (Matches constraint)`
              : `Found attendees with domain "${cond.value}": ${matchingAttendees.join(', ')}`;
          }
        } else {
          const valLower = cond.value.toLowerCase();
          const fieldLower = fieldVal.toLowerCase();

          switch (cond.op) {
            case 'eq':
              matched = fieldLower === valLower;
              displayDetail = `Field: "${fieldVal}" equals "${cond.value}"`;
              break;
            case 'contains':
              matched = fieldLower.includes(valLower);
              displayDetail = `Field: "${fieldVal}" contains "${cond.value}"`;
              break;
            case 'not_contains':
              matched = !fieldLower.includes(valLower);
              displayDetail = `Field: "${fieldVal}" does not contain "${cond.value}"`;
              break;
            case 'starts_with':
              matched = fieldLower.startsWith(valLower);
              displayDetail = `Field: "${fieldVal}" starts with "${cond.value}"`;
              break;
          }
        }

        steps.push({
          name: `Condition check: ${FIELD_LABELS[cond.field] ?? cond.field} ${OP_LABELS[cond.op] ?? cond.op} "${cond.value}"`,
          detail: `${displayDetail} -> ${matched ? 'MATCH' : 'NO MATCH'}`,
          status: matched ? 'match' : 'nomatch'
        });

        if (!matched) {
          ruleMatched = false;
        }
      }
    }

    // Actions executions
    if (ruleMatched) {
      for (const act of rule.actions) {
        const desc = summariseActions([act]);
        actionsExecuted.push(desc);
      }
      steps.push({
        name: '3 · Evaluation Result',
        detail: `All conditions satisfied! Fired ${rule.actions.length} action(s).`,
        status: 'match'
      });
    } else {
      steps.push({
        name: '3 · Evaluation Result',
        detail: `One or more conditions failed. Actions skipped.`,
        status: 'nomatch'
      });
    }

    const result: SimulationResult = {
      id: crypto.randomUUID(),
      ruleName: rule.name || 'Untitled Rule',
      scenarioName: scenario.name,
      matched: ruleMatched,
      steps,
      actionsExecuted,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setSimResult(result);
    setSimLogs(prev => [result, ...prev]);
  };

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Zap size={20} className="text-brand animate-pulse" />
            Automations
          </h1>
          <p className="text-sm text-ink-4 mt-1">
            Rules that run automatically when meetings match your conditions.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-mid text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> New rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('rules')}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === 'rules'
              ? "border-brand text-brand"
              : "border-transparent text-ink-4 hover:text-ink-2"
          )}
        >
          Active Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'simulator'
              ? "border-brand text-brand"
              : "border-transparent text-ink-4 hover:text-ink-2"
          )}
        >
          <Play size={13} className="text-brand" />
          Rule Simulator & Logs
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
          <Loader2 size={24} className="animate-spin text-ink-5" />
        </div>
      )}

      {/* TAB 1: ACTIVE RULES LIST */}
      {!loading && activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length > 0 ? (
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
          ) : (
            <Panel padding="lg" className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-5">
                <Zap size={24} className="text-brand" />
              </div>
              <h3 className="text-base font-bold text-ink mb-2">Automate your meetings</h3>
              <p className="text-sm text-ink-4 max-w-xs mx-auto mb-7">
                Setup rules that auto-join Whisper bots, add search tags, or email notes when triggers match.
              </p>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                <Plus size={16} /> Create your first rule
              </button>
            </Panel>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE SIMULATOR */}
      {!loading && activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-float-up">
          
          {/* Controls Column */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                <Activity size={13} className="text-brand" /> Simulation Setup
              </h3>
              
              {/* Select Rule */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">Select Rule</label>
                {rules.length > 0 ? (
                  <select
                    value={simSelectedRuleId}
                    onChange={e => setSimSelectedRuleId(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-ink text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand"
                  >
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>{r.name || 'Untitled rule'}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-red-500 italic">Please create at least one rule first.</p>
                )}
              </div>

              {/* Select Scenario */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">Mock Meeting Input</label>
                <select
                  value={simSelectedScenarioId}
                  onChange={e => setSimSelectedScenarioId(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-ink text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand"
                >
                  {MOCK_SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Run Trigger */}
              <button
                onClick={runSimulation}
                disabled={rules.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-mid text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-40"
              >
                <Play size={13} />
                Run Simulation
              </button>
            </div>
            
            {/* Display Scenario Details */}
            {simSelectedScenarioId && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs space-y-2.5">
                <h4 className="font-semibold text-ink-3 uppercase tracking-wider text-[10px]">Active Scenario State</h4>
                <div className="space-y-1">
                  <p className="text-ink-4"><span className="font-medium text-ink-3">Title:</span> {MOCK_SCENARIOS.find(s=>s.id===simSelectedScenarioId)?.title}</p>
                  <p className="text-ink-4"><span className="font-medium text-ink-3">Provider:</span> {MOCK_SCENARIOS.find(s=>s.id===simSelectedScenarioId)?.provider}</p>
                  <p className="text-ink-4 truncate"><span className="font-medium text-ink-3">URL:</span> {MOCK_SCENARIOS.find(s=>s.id===simSelectedScenarioId)?.meeting_url}</p>
                  <p className="text-ink-4"><span className="font-medium text-ink-3">People:</span> {MOCK_SCENARIOS.find(s=>s.id===simSelectedScenarioId)?.attendees.length} attendees</p>
                </div>
              </div>
            )}
          </div>

          {/* Results/Traces Column */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Active Trace */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm min-h-[220px] flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-4 flex items-center gap-1.5">
                <Info size={13} className="text-brand" /> Dry-Run Execution Trace
              </h3>

              {simResult ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-brand-pale border border-brand/10 p-2.5 rounded-lg text-xs text-ink-2">
                      <Zap size={13} className="text-brand" />
                      Evaluating rule <span className="font-semibold text-brand">{simResult.ruleName}</span> against mock input <span className="font-semibold">{simResult.scenarioName}</span>
                    </div>

                    <div className="space-y-2.5 pl-1.5">
                      {simResult.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 text-xs leading-normal">
                          <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white",
                            step.status === 'match' && "bg-green-500",
                            step.status === 'nomatch' && "bg-red-500",
                            step.status === 'info' && "bg-brand"
                          )}>
                            {step.status === 'match' && "✓"}
                            {step.status === 'nomatch' && "✗"}
                            {step.status === 'info' && "i"}
                          </div>
                          <div>
                            <p className="font-semibold text-ink-2">{step.name}</p>
                            <p className="text-ink-4 text-[11px] mt-0.5 leading-relaxed">{step.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overall matching result status banner */}
                  <div className={cn(
                    "mt-5 p-4 rounded-xl border flex items-center justify-between flex-wrap gap-2.5",
                    simResult.matched 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : "bg-red-50/50 border-red-150 text-ink-3"
                  )}>
                    <div>
                      <p className="text-xs font-bold">
                        {simResult.matched ? "✓ Automation Matched & Fired" : "✗ Automation Ignored"}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {simResult.matched 
                          ? `Fired: ${simResult.actionsExecuted.join(' and ')}` 
                          : "Filters skipped this meeting event because conditions did not match."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-4 gap-2">
                  <Play size={24} className="opacity-20 text-ink-5" />
                  <p className="text-xs font-semibold text-ink-3">No simulation run yet</p>
                  <p className="text-[11px] text-ink-5 max-w-xs">Select a rule and a mock meeting trigger, then click Run Simulation to dry-run condition parsing.</p>
                </div>
              )}
            </div>

            {/* Simulated History logs */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-4.5 flex items-center gap-1.5">
                <History size={13} className="text-brand" /> Dry-Run Logs
              </h3>

              {simLogs.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto pr-1">
                  {simLogs.map(log => (
                    <div key={log.id} className="py-3 flex items-center justify-between text-xs gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-2">{log.ruleName}</span>
                          <ArrowRight size={10} className="text-ink-5" />
                          <span className="text-ink-4">{log.scenarioName}</span>
                        </div>
                        <p className="text-[10px] text-ink-5 mt-0.5">
                          {log.matched 
                            ? `Status: Triggered actions (${log.actionsExecuted.join(', ')})` 
                            : "Status: Skipped (Conditions did not match)"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mr-2",
                          log.matched ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                        )}>
                          {log.matched ? "Fired" : "Skipped"}
                        </span>
                        <span className="text-[10px] text-ink-5 font-mono">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-5 italic text-center py-6">Logs will appear as you trigger simulations.</p>
              )}
            </div>

          </div>

        </div>
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
