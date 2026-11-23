import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  Globe,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserProgress } from '../types';

interface GroundingSource {
  title: string;
  uri: string;
}

interface IntelLookupResult {
  id: string;
  query: string;
  answer: string;
  sources: GroundingSource[];
  searchQueries: string[];
  updatedAt: string;
}

interface LiveIntelPanelProps {
  progress: UserProgress;
  pendingQuery: string | null;
  pendingQueryNonce: number;
  onConsumePendingQuery: () => void;
}

function getHostname(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return uri;
  }
}

function renderInlineBold(text: string): ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return segments.map((seg, idx) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#F3F0FA]">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-[#1E1930] px-1.5 py-0.5 font-mono text-[11px] text-[#C084FC]"
        >
          {seg.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{seg}</span>;
  });
}

function renderGroundedMarkdown(markdown: string): ReactNode {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(keyPrefix: number) {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${keyPrefix}`} className="space-y-1.5 pl-4 list-disc marker:text-[#A855F7]">
        {listItems.map((item, i) => (
          <li key={i} className="text-sm text-[#DDD7EE] leading-relaxed">
            {renderInlineBold(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(idx);
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (bulletMatch || numberedMatch) {
      listItems.push((bulletMatch?.[1] ?? numberedMatch?.[1] ?? '').trim());
      return;
    }

    flushList(idx);

    const headingMatch = line.match(/^#{1,4}\s+(.*)$/);
    if (headingMatch) {
      blocks.push(
        <h3
          key={`h-${idx}`}
          className="font-display text-xs sm:text-sm font-bold tracking-wider text-[#F3F0FA] pt-2"
        >
          {headingMatch[1].replace(/\*\*/g, '')}
        </h3>
      );
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-sm text-[#DDD7EE] leading-relaxed">
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList(lines.length);
  return <div className="space-y-2.5">{blocks}</div>;
}

export function LiveIntelPanel({
  progress,
  pendingQuery,
  pendingQueryNonce,
  onConsumePendingQuery,
}: LiveIntelPanelProps) {
  const [queryInput, setQueryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<IntelLookupResult | null>(null);
  const [history, setHistory] = useState<IntelLookupResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const quickPrompts = [
    {
      label: `Path ${progress.activePath} · RB ${progress.currentRebirth} guide`,
      query: `What are the current Path ${progress.activePath} Rebirth ${progress.currentRebirth} droid and credit requirements in Star Wars Droid Tycoon?`,
    },
    {
      label: 'Latest updates & new droids',
      query: 'What are the latest updates, new droids, and rarities added to Star Wars Droid Tycoon in Fortnite?',
    },
    {
      label: 'Kyber & Scourge guide',
      query: 'How do Kyber rarity and Scourge droids work in Star Wars Droid Tycoon, and how do you unlock them?',
    },
    {
      label: 'Best income droids right now',
      query: 'Which droids have the highest credits per second income in Star Wars Droid Tycoon right now?',
    },
  ];

  async function executeSearch(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setQueryInput(trimmed);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/intel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: trimmed,
          context: {
            activePath: progress.activePath,
            activeCycle: progress.activeCycle,
            currentRebirth: progress.currentRebirth,
            srbRank: progress.srbRank,
          },
        }),
      });

      const rawText = await response.text();
      let payload: {
        answer?: string;
        sources?: GroundingSource[];
        searchQueries?: string[];
        updatedAt?: string;
        error?: string;
      } = {};
      if (rawText) {
        try {
          payload = JSON.parse(rawText) as typeof payload;
        } catch {
          if (!response.ok) {
            throw new Error(`Search failed with status ${response.status}.`);
          }
          throw new Error('Received an unexpected response format from the server.');
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || `Search failed with status ${response.status}.`);
      }

      const nextResult: IntelLookupResult = {
        id: `intel-${Date.now()}`,
        query: trimmed,
        answer: payload.answer || '',
        sources: Array.isArray(payload.sources) ? payload.sources : [],
        searchQueries: Array.isArray(payload.searchQueries) ? payload.searchQueries : [],
        updatedAt: payload.updatedAt || new Date().toISOString(),
      };

      setActiveResult(nextResult);
      setHistory((prev) => [
        nextResult,
        ...prev.filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 6));
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unable to reach Live Intel right now.');
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (pendingQuery && pendingQueryNonce > 0) {
      const q = pendingQuery;
      onConsumePendingQuery();
      void executeSearch(q);
    }
  }, [pendingQuery, pendingQueryNonce]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void executeSearch(queryInput);
  }

  return (
    <section
      aria-label="Live Game Intel with Google Search"
      className="panel-surface flex flex-col rounded-xl overflow-hidden"
    >
      {/* Header & Search Bar */}
      <div className="border-b border-[#2A2440] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="sw-title text-base sm:text-lg font-bold text-[#F3F0FA]">
              LIVE HOLONET INTEL
            </h2>
            <p className="text-xs text-[#A79EC0] mt-1">
              Look up up-to-date Star Wars Droid Tycoon patch notes, fusion recipes, Kyber & Scourge mechanics, and rebirth requirements grounded in live Google Search results.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#4ADE80] whitespace-nowrap">
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Google Search Grounded</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7E7499]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask anything about Star Wars Droid Tycoon (e.g. X-ONK fusion recipe, Path 2 requirements)..."
              aria-label="Search live Star Wars Droid Tycoon intel"
              className="w-full rounded-lg border border-[#322B4B] bg-[#0E0C17] py-2.5 pl-10 pr-9 text-sm text-[#F3F0FA] placeholder-[#7E7499] focus:border-[#A855F7] focus:outline-none transition-colors"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => setQueryInput('')}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E7499] hover:text-[#F3F0FA] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !queryInput.trim()}
            className="saber-purple-btn inline-flex items-center justify-center gap-2 rounded-lg bg-[#9333EA] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#A855F7] active:scale-[0.98] disabled:opacity-45 transition-all whitespace-nowrap shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span>Search Web</span>
              </>
            )}
          </button>
        </form>

        {/* Contextual Quick Lookups */}
        <div className="flex flex-wrap items-center gap-2">
          {quickPrompts.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isLoading}
              onClick={() => void executeSearch(item.query)}
              className="rounded-lg border border-[#2F2848] bg-[#100E1B] px-3 py-1.5 text-xs font-medium text-[#C8BFE0] hover:border-[#A855F7]/60 hover:bg-[#1B1630] hover:text-[#F3F0FA] active:scale-[0.98] disabled:opacity-45 transition-all whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results & Sources Viewport */}
      <div className="p-5 sm:p-6">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-[#F87171]/35 bg-[#231016] p-4 text-xs text-[#FECACA]"
          >
            <AlertCircle className="h-4 w-4 text-[#F87171] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-[#F3F0FA]">Live Search Error</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4 py-2" aria-busy="true" aria-label="Searching live web sources">
            <div className="flex items-center gap-2 text-xs text-[#C084FC]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Searching live web sources for “{queryInput}”...</span>
            </div>
            <div className="space-y-2.5 animate-pulse">
              <div className="h-4 w-1/3 rounded bg-[#231D38]" />
              <div className="h-3.5 w-full rounded bg-[#1C172E]" />
              <div className="h-3.5 w-11/12 rounded bg-[#1C172E]" />
              <div className="h-3.5 w-4/5 rounded bg-[#1C172E]" />
            </div>
          </div>
        )}

        {!isLoading && !error && !activeResult && (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-medium text-[#F3F0FA]">
              Query live web guides, fusion recipes, and recent patch changes
            </p>
            <p className="text-xs text-[#A79EC0] max-w-lg mx-auto leading-relaxed">
              Pick one of the quick lookups above, ask a question directly, or click the globe lookup icon next to any droid in your Inventory Analyzer or Rebirth Roadmap.
            </p>
          </div>
        )}

        {!isLoading && activeResult && (
          <motion.div
            key={activeResult.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Primary Answer */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#251F3A]">
                <p className="text-xs font-medium text-[#C084FC]">
                  Query: <span className="text-[#F3F0FA]">{activeResult.query}</span>
                </p>
                <span className="font-mono text-[11px] text-[#7E7499] tabular-nums">
                  Updated {new Date(activeResult.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {renderGroundedMarkdown(activeResult.answer)}

              {activeResult.searchQueries.length > 0 && (
                <div className="pt-3 border-t border-[#251F3A] text-xs text-[#8E84AA]">
                  <span className="font-medium text-[#A79EC0]">Google Search queries: </span>
                  {activeResult.searchQueries.join(' · ')}
                </div>
              )}
            </div>

            {/* Verified Web Sources */}
            <aside className="lg:col-span-4 space-y-3 lg:border-l lg:border-[#251F3A] lg:pl-6">
              <h3 className="font-display text-xs font-bold tracking-wider uppercase text-[#E9E4F5]">
                Verified Sources ({activeResult.sources.length})
              </h3>
              {activeResult.sources.length === 0 ? (
                <p className="text-xs text-[#8E84AA]">
                  No external source links were attached to this response.
                </p>
              ) : (
                <ul className="divide-y divide-[#231E36] border-t border-b border-[#231E36]">
                  {activeResult.sources.map((src) => (
                    <li key={src.uri}>
                      <a
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between gap-2 py-2.5 text-xs hover:text-[#C084FC] transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[#E9E4F5] group-hover:text-[#C084FC] truncate">
                            {src.title}
                          </div>
                          <div className="text-[11px] text-[#7E7499] truncate mt-0.5">
                            {getHostname(src.uri)}
                          </div>
                        </div>
                        <ArrowUpRight
                          className="h-3.5 w-3.5 text-[#7E7499] group-hover:text-[#4ADE80] shrink-0 mt-0.5 transition-colors"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </motion.div>
        )}

        {/* Session Recent Lookups */}
        {history.length > 1 && (
          <div className="mt-6 pt-4 border-t border-[#251F3A] flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-[#7E7499] mr-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Recent:</span>
            </span>
            {history.map((item) => {
              const isSelected = activeResult?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveResult(item);
                    setQueryInput(item.query);
                    setError(null);
                  }}
                  className={`max-w-[220px] truncate rounded-md px-2.5 py-1 text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#261E40] text-[#F3F0FA] font-medium'
                      : 'text-[#A79EC0] hover:bg-[#1B1630] hover:text-[#F3F0FA]'
                  }`}
                  title={item.query}
                >
                  {item.query}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
