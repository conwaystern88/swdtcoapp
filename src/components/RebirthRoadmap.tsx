import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Globe, Plus, Search } from 'lucide-react';
import { DroidRequirement, OwnedDroid, RebirthPathNumber, RebirthTier } from '../types';
import { formatCredits, RARITY_DEFINITIONS } from '../data/defaultData';
import { getTierReadiness } from '../utils/analyzer';

interface RebirthRoadmapProps {
  cycleNumber: number;
  pathNumber: RebirthPathNumber;
  tiers: RebirthTier[];
  currentRebirth: number;
  completedAllTiersInCycle: boolean;
  inventory: OwnedDroid[];
  onCompleteTier: (tierNumber: number) => void;
  onSetCurrentRebirth: (tierNumber: number) => void;
  onQuickAddDroid: (req: DroidRequirement) => void;
  onLookupIntel?: (query: string) => void;
  compact?: boolean;
}

type RoadmapFilter = 'all' | 'remaining' | 'core23' | 'endgame' | 'ready' | 'completed';

export function RebirthRoadmap({
  cycleNumber,
  pathNumber,
  tiers,
  currentRebirth,
  completedAllTiersInCycle,
  inventory,
  onCompleteTier,
  onSetCurrentRebirth,
  onQuickAddDroid,
  onLookupIntel,
  compact = false,
}: RebirthRoadmapProps) {
  const [filter, setFilter] = useState<RoadmapFilter>('remaining');
  const [search, setSearch] = useState('');

  const enrichedTiers = useMemo(() => {
    return tiers.map((tier) => {
      const completed = completedAllTiersInCycle || tier.tier < currentRebirth;
      const isCurrent = !completedAllTiersInCycle && tier.tier === currentRebirth;
      const readiness = getTierReadiness(tier, inventory);
      return {
        tier,
        completed,
        isCurrent,
        readiness,
      };
    });
  }, [tiers, currentRebirth, completedAllTiersInCycle, inventory]);

  const counts = useMemo(() => {
    let remaining = 0;
    let ready = 0;
    let completed = 0;
    for (const item of enrichedTiers) {
      if (item.completed) completed++;
      else {
        remaining++;
        if (item.readiness.isReady) ready++;
      }
    }
    return { all: enrichedTiers.length, remaining, ready, completed };
  }, [enrichedTiers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedTiers.filter((item) => {
      if (filter === 'remaining' && item.completed) return false;
      if (filter === 'completed' && !item.completed) return false;
      if (filter === 'core23' && item.tier.tier > 23) return false;
      if (filter === 'endgame' && item.tier.tier < 24) return false;
      if (filter === 'ready' && (item.completed || !item.readiness.isReady)) return false;

      if (q) {
        const tierMatch =
          `rb ${item.tier.tier}`.includes(q) ||
          `tier ${item.tier.tier}`.includes(q) ||
          String(item.tier.tier) === q;
        const droidMatch = item.tier.requirements.some(
          (r) =>
            r.droidName.toLowerCase().includes(q) ||
            r.rarity.toLowerCase().includes(q) ||
            r.droidType.toLowerCase().includes(q)
        );
        const unlockMatch = item.tier.unlockLabel.toLowerCase().includes(q);
        if (!tierMatch && !droidMatch && !unlockMatch) return false;
      }
      return true;
    });
  }, [enrichedTiers, filter, search]);

  const filterButtons: Array<{ id: RoadmapFilter; label: string; count?: number }> = [
    { id: 'remaining', label: 'Remaining', count: counts.remaining },
    { id: 'all', label: 'All 1–40', count: counts.all },
    { id: 'core23', label: 'Tiers 1–23' },
    { id: 'endgame', label: 'Tiers 24–40' },
    { id: 'ready', label: 'Ready', count: counts.ready },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <section
      aria-label="Rebirth Roadmap"
      className="panel-surface flex flex-col rounded-xl overflow-hidden"
    >
      {/* Header & Controls */}
      <div className="border-b border-[#2A2440] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="sw-title text-base sm:text-lg font-bold text-[#F3F0FA]">
              REBIRTH ROADMAP · PATH {pathNumber} · CYCLE {cycleNumber}
            </h2>
            <p className="text-xs text-[#A79EC0] mt-1">
              Tiers 1–40 with auto-checkoff from your logged hangar. Click any missing droid to log it.
            </p>
          </div>
          <div className="text-xs text-[#4ADE80] font-mono tabular-nums">
            {counts.completed} / 40 completed
          </div>
        </div>

        {/* Search + Segmented Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0E0C17] rounded-lg border border-[#26203B]">
            {filterButtons.map((btn) => {
              const active = filter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilter(btn.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#261E40] text-[#F3F0FA]'
                      : 'text-[#A79EC0] hover:text-[#F3F0FA]'
                  }`}
                >
                  {btn.label}
                  {btn.count !== undefined && (
                    <span className="ml-1.5 font-mono text-[11px] text-[#7E7499] tabular-nums">
                      {btn.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7E7499]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tier or droid..."
              aria-label="Filter roadmap by tier or droid"
              className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] py-1.5 pl-8 pr-3 text-xs text-[#F3F0FA] placeholder-[#7E7499] focus:border-[#A855F7] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table Viewport */}
      <div className={`overflow-x-auto ${compact ? 'max-h-[680px] overflow-y-auto' : ''}`}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#100E1B]/92 backdrop-blur-md border-b border-[#2A2440]">
            <tr className="text-xs font-medium text-[#A79EC0]">
              <th className="py-2.5 pl-4 pr-3 whitespace-nowrap w-28">Tier</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right w-28">Cost</th>
              <th className="py-2.5 px-3">Required Droids</th>
              <th className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#231E36] text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 px-4 text-center">
                  <p className="text-sm text-[#A79EC0]">No rebirth tiers match your current filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilter('all');
                      setSearch('');
                    }}
                    className="mt-3 rounded-lg border border-[#352D52] bg-[#1C182C] px-3.5 py-1.5 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7]/60 transition-colors"
                  >
                    Show All 40 Tiers
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map(({ tier, completed, isCurrent, readiness }) => (
                <tr
                  key={tier.tier}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-[#201936]'
                      : completed
                        ? 'bg-[#100E19]/65 text-[#7E7499]'
                        : 'hover:bg-[#1B172B]'
                  }`}
                >
                  {/* Tier # & Unlock */}
                  <td className="py-3 pl-4 pr-3 align-top whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          completed
                            ? 'text-[#4ADE80]'
                            : isCurrent
                              ? 'text-[#C084FC]'
                              : 'text-[#F3F0FA]'
                        }`}
                      >
                        RB {tier.tier}
                      </span>
                      {completed && (
                        <Check className="h-3.5 w-3.5 text-[#4ADE80]" aria-label="Completed" />
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-medium text-[#C084FC]">Target</span>
                      )}
                    </div>
                    <div
                      className="text-[11px] text-[#7E7499] mt-0.5 max-w-[148px] truncate"
                      title={tier.unlockLabel}
                    >
                      {tier.unlockLabel}
                    </div>
                  </td>

                  {/* Credit Cost */}
                  <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                    <span
                      className={`font-mono text-sm tabular-nums ${
                        completed ? 'text-[#7E7499]' : 'text-[#F3F0FA] font-medium'
                      }`}
                    >
                      {formatCredits(tier.creditCost)}
                    </span>
                  </td>

                  {/* Required Droids (Auto-Checkoff) */}
                  <td className="py-3 px-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      {readiness.details.map(({ req, satisfied, exactMatch, satisfiedByRarity }) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {satisfied ? (
                              <CheckCircle2
                                className="h-3.5 w-3.5 text-[#4ADE80] shrink-0"
                                aria-label="Owned"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => onQuickAddDroid(req)}
                                title={`Log 1× ${req.rarity} ${req.droidName} into inventory`}
                                className="h-4 w-4 inline-flex items-center justify-center rounded border border-[#3D345C] text-[#A79EC0] hover:border-[#4ADE80] hover:text-[#4ADE80] transition-colors shrink-0"
                                aria-label={`Add ${req.rarity} ${req.droidName} to inventory`}
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <span
                              className={`truncate ${
                                satisfied
                                  ? 'text-[#A79EC0] line-through decoration-[#4ADE80]/60'
                                  : completed
                                    ? 'text-[#7E7499]'
                                    : 'text-[#F3F0FA] font-medium'
                              }`}
                            >
                              {req.droidName}
                            </span>
                            <span aria-hidden="true" className="text-[#544B6E]">
                              ·
                            </span>
                            <span
                              className={`font-medium shrink-0 ${
                                completed
                                  ? 'text-[#7E7499]'
                                  : RARITY_DEFINITIONS[req.rarity].textColorClass
                              }`}
                            >
                              {req.rarity}
                            </span>
                            {satisfied && !exactMatch && satisfiedByRarity && (
                              <span className="text-[11px] text-[#4ADE80] whitespace-nowrap">
                                ({satisfiedByRarity} covers)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Tier Completion Action */}
                  <td className="py-3 pl-3 pr-4 align-top text-right whitespace-nowrap">
                    {isCurrent ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {onLookupIntel && (
                          <button
                            type="button"
                            onClick={() =>
                              onLookupIntel(
                                `Star Wars Droid Tycoon Path ${pathNumber} Rebirth ${tier.tier} requirements and required droids`
                              )
                            }
                            title={`Verify Path ${pathNumber} RB ${tier.tier} requirements on Google Search`}
                            aria-label={`Search live web intel for Path ${pathNumber} Rebirth ${tier.tier}`}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-[#352D52] bg-[#171326] text-[#A79EC0] hover:border-[#4ADE80]/60 hover:text-[#4ADE80] active:scale-[0.95] transition-all shrink-0"
                          >
                            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onCompleteTier(tier.tier)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-[0.97] transition-all whitespace-nowrap shrink-0 ${
                            readiness.isReady
                              ? 'saber-green-btn bg-[#22C55E] text-[#051B0E] hover:bg-[#4ADE80]'
                              : 'border border-[#3A315A] bg-[#1F1A33] text-[#E9E4F5] hover:border-[#A855F7] hover:text-[#E9D5FF]'
                          }`}
                        >
                          {readiness.isReady
                            ? 'Complete RB'
                            : `Complete (${readiness.met}/${readiness.total})`}
                        </button>
                      </div>
                    ) : completed ? (
                      <button
                        type="button"
                        onClick={() => onSetCurrentRebirth(tier.tier)}
                        className="text-xs text-[#7E7499] hover:text-[#D8D3E8] transition-colors whitespace-nowrap"
                      >
                        Set Target
                      </button>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            readiness.isReady ? 'text-[#4ADE80]' : 'text-[#7E7499]'
                          }`}
                        >
                          {readiness.met}/{readiness.total} owned
                        </span>
                        <button
                          type="button"
                          onClick={() => onSetCurrentRebirth(tier.tier)}
                          className="text-[11px] text-[#7E7499] hover:text-[#C084FC] transition-colors whitespace-nowrap"
                        >
                          Jump Here
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
