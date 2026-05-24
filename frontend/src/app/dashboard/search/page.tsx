'use client';

import { useState } from 'react';
import { Search as SearchIcon, Video, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api, APIError } from '@/lib/api';
import type { SearchResult, SearchResponse } from '@/types/api';
import { Panel } from '@/components/ui/panel';
import { SearchResultSkeleton } from '@/components/ui/skeleton';

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
    <div className="p-5 lg:p-8 max-w-4xl mx-auto flex flex-col gap-8 min-h-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2.5">
          <SearchIcon size={22} className="text-accent" />
          Global Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Semantic search across all meetings, decisions, and action items.
        </p>
      </div>

      {/* Search Input */}
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
            className="w-full bg-surface-2 border border-border text-foreground rounded-xl pl-11 pr-28 py-3.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-muted-foreground shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 bg-accent hover:bg-accent-hover text-white px-5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

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
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <SearchIcon size={32} className="text-muted-foreground opacity-20 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">No results for &quot;{lastQuery}&quot;</p>
            <p className="text-xs text-muted-foreground">Try different keywords or a broader topic.</p>
          </div>
        )}

        {/* Pre-search idle state */}
        {!hasSearched && (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
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
    </div>
  );
}
