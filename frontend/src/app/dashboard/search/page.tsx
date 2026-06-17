'use client';

import { useState } from 'react';
import { Search as SearchIcon, Video, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api, APIError } from '@/lib/api';
import type { SearchResult, SearchResponse } from '@/types/api';
import { Panel } from '@/components/ui/panel';
import { SearchResultSkeleton } from '@/components/ui/skeleton';
import { DashboardPage, PageHeader, SectionLabel } from '@/components/dashboard/page';

// ── Result Card ───────────────────────────────────────────────

const RESULT_ICONS: Record<SearchResult['type'], React.ElementType> = {
  meeting:     Video,
  action_item: CheckCircle2,
  topic:       FileText,
  decision:    CheckCircle2,
};

function ResultCard({ result }: { result: SearchResult }) {
  const Icon = RESULT_ICONS[result.type];

  return (
    <Link href={`/dashboard/meetings/${result.meeting_id}`} className="block group">
      <Panel
        variant="default"
        padding="none"
        className="px-4 py-3.5 hover:border-accent/40 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={14} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
              {result.title}
            </p>
            {result.snippet && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                &quot;{result.snippet}&quot;
              </p>
            )}
            <p className="text-[10px] text-muted-foreground font-mono mt-1.5">
              Meeting {result.meeting_id.slice(0, 8)}
            </p>
          </div>
        </div>
      </Panel>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────

function ResultSection({
  type,
  results,
}: {
  type: SearchResult['type'];
  results: SearchResult[];
}) {
  const Icon = RESULT_ICONS[type];
  const labels: Record<SearchResult['type'], string> = {
    meeting:     'Meetings',
    action_item: 'Action Items',
    topic:       'Topics',
    decision:    'Decisions',
  };

  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
        <Icon size={12} />
        {labels[type]}
        <span className="ml-auto font-normal normal-case tracking-normal">{results.length}</span>
      </h3>
      <div className="space-y-2">
        {results.map(r => <ResultCard key={r.id} result={r} />)}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setHasSearched(true);
    setError(null);
    setLastQuery(q);

    try {
      const data = await api.get<SearchResponse>(`/search?q=${encodeURIComponent(q)}`);
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  const orderedSections = (['meeting', 'decision', 'action_item', 'topic'] as const).filter(
    t => (grouped[t]?.length ?? 0) > 0
  );

  return (
    <DashboardPage className="flex min-h-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Knowledge"
        title={
          <span className="flex items-center gap-2.5">
            <SearchIcon size={24} className="text-accent" />
            Global Search
          </span>
        }
        description="Search across meetings, decisions, and action items with a calmer, more readable results layout."
      />

      {/* Search Input */}
      <Panel padding="lg" className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <SectionLabel>Ask naturally</SectionLabel>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Query what was decided, which action items were assigned, or where a topic came up.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm text-ink-4">
            Try: <span className="text-ink-2">&quot;What did we decide about pricing?&quot;</span>
          </div>
        </div>
        <form onSubmit={handleSearch}>
          <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon size={18} className="text-muted-foreground" />
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Try "What did we decide about pricing?" or "Action items for Q2"`}
            className="w-full rounded-[22px] border border-border bg-white pl-11 pr-28 py-4 text-sm text-foreground shadow-[0_16px_35px_rgba(15,23,42,0.05)] transition-all placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute bottom-2 right-2 top-2 flex items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>
        </form>
      </Panel>

      {/* Results area */}
      <div className="flex-1">

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SearchResultSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p className="text-sm text-red-400 text-center py-8">{error}</p>
        )}

        {/* Empty state */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="rounded-[26px] border border-dashed border-border bg-white/76 py-16 text-center">
            <SearchIcon size={32} className="text-muted-foreground opacity-20 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">No results for &quot;{lastQuery}&quot;</p>
            <p className="text-xs text-muted-foreground">Try different keywords or a broader topic.</p>
          </div>
        )}

        {/* Pre-search idle state */}
        {!hasSearched && (
          <div className="rounded-[26px] border border-dashed border-border bg-white/76 py-16 text-center">
            <SearchIcon size={32} className="text-muted-foreground opacity-20 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">Search your organization&apos;s memory</p>
            <p className="text-xs text-muted-foreground">Every meeting, decision, and action item is searchable.</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-8 pb-12">
            {orderedSections.map(type => (
              <ResultSection key={type} type={type} results={grouped[type]} />
            ))}
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
