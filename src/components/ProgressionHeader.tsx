import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react';
import { REBIRTH_PATHS, RebirthPathNumber, UserProgress } from '../types';
import { getNextPath } from '../data/defaultData';

interface ProgressionHeaderProps {
  progress: UserProgress;
  availableCycles: number[];
  onTriggerSuperRebirth: () => void;
  onAdjustCurrentRebirth: (tier: number) => void;
  onSelectCycle: (cycle: number) => void;
  onSelectPath: (path: RebirthPathNumber) => void;
  onAdjustSrbRank: (delta: number) => void;
}

export function ProgressionHeader({
  progress,
  availableCycles,
  onTriggerSuperRebirth,
  onAdjustCurrentRebirth,
  onSelectCycle,
  onSelectPath,
  onAdjustSrbRank,
}: ProgressionHeaderProps) {
  const completedTiers = progress.completedAllTiersInCycle
    ? 40
    : Math.max(0, progress.currentRebirth - 1);
  const cyclePercent = Math.round((completedTiers / 40) * 100);
  const nextPath = getNextPath(progress.activePath);

  const cycleOptions = Array.from(
    new Set([...availableCycles, progress.activeCycle, progress.activeCycle + 1])
  ).sort((a, b) => a - b);

  return (
    <section
      aria-label="Progression Overview"
      className="panel-surface rounded-xl overflow-hidden"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#2A2440]/80">
        {/* SRB Rank */}
        <div className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#A79EC0]">SRB Rank</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Decrease SRB Rank"
                onClick={() => onAdjustSrbRank(-1)}
                disabled={progress.srbRank <= 0}
                className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#322B4B] bg-[#1C182C] text-[#A79EC0] hover:text-[#F3F0FA] hover:border-[#A855F7]/60 active:scale-[0.94] disabled:opacity-35 transition-all"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Increase SRB Rank"
                onClick={() => onAdjustSrbRank(1)}
                className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#322B4B] bg-[#1C182C] text-[#A79EC0] hover:text-[#F3F0FA] hover:border-[#A855F7]/60 active:scale-[0.94] transition-all"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-[#F3F0FA] tabular-nums">
              {progress.srbRank}
            </span>
            <span className="text-xs text-[#7E7499]">
              {progress.srbHistory.length} logged
            </span>
          </div>
        </div>

        {/* Active Path Indicator & Selector (Paths 1-6) */}
        <div className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#A79EC0]">Active Path</span>
            <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
              Path {progress.activePath}
            </span>
          </div>
          <div
            role="group"
            aria-label="Select Active Path"
            className="grid grid-cols-6 gap-1 p-1 rounded-lg border border-[#2F2848] bg-[#0E0C17]"
          >
            {REBIRTH_PATHS.map((pathNum) => {
              const isSelected = progress.activePath === pathNum;
              return (
                <button
                  key={pathNum}
                  type="button"
                  onClick={() => onSelectPath(pathNum)}
                  aria-pressed={isSelected}
                  aria-label={`Path ${pathNum}`}
                  className={`py-1 rounded font-mono text-xs font-semibold tabular-nums active:scale-[0.94] transition-all ${
                    isSelected
                      ? 'bg-[#22C55E] text-[#051B0E] shadow-[0_0_12px_rgba(34,197,94,0.34)]'
                      : 'text-[#A79EC0] hover:bg-[#1E1930] hover:text-[#F3F0FA]'
                  }`}
                >
                  {pathNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Cycle */}
        <div className="p-4 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-[#A79EC0]">Active Cycle</span>
          <div className="relative inline-flex items-center">
            <select
              aria-label="Active Cycle"
              value={progress.activeCycle}
              onChange={(e) => onSelectCycle(Number(e.target.value))}
              className="w-full appearance-none rounded-lg border border-[#322B4B] bg-[#1C182C] py-1.5 pl-3 pr-8 font-mono text-base font-semibold text-[#F3F0FA] hover:border-[#A855F7]/60 focus:border-[#A855F7] focus:outline-none transition-colors cursor-pointer"
            >
              {cycleOptions.map((c) => (
                <option key={c} value={c} className="bg-[#151221] text-[#F3F0FA]">
                  Cycle {c}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#C084FC]"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Current Rebirth Target */}
        <div className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#A79EC0]">Current Tier</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous Rebirth Tier"
                onClick={() => onAdjustCurrentRebirth(Math.max(1, progress.currentRebirth - 1))}
                disabled={progress.currentRebirth <= 1 && !progress.completedAllTiersInCycle}
                className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#322B4B] bg-[#1C182C] text-[#A79EC0] hover:text-[#F3F0FA] hover:border-[#A855F7]/60 active:scale-[0.94] disabled:opacity-35 transition-all"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Next Rebirth Tier"
                onClick={() => onAdjustCurrentRebirth(Math.min(40, progress.currentRebirth + 1))}
                disabled={progress.currentRebirth >= 40 && progress.completedAllTiersInCycle}
                className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#322B4B] bg-[#1C182C] text-[#A79EC0] hover:text-[#F3F0FA] hover:border-[#A855F7]/60 active:scale-[0.94] disabled:opacity-35 transition-all"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-[#C084FC] tabular-nums">
              {progress.completedAllTiersInCycle ? '40 / 40' : `RB ${progress.currentRebirth}`}
            </span>
            <span className="text-xs text-[#7E7499] tabular-nums">
              {completedTiers}/40 ({cyclePercent}%)
            </span>
          </div>
        </div>

        {/* Super Rebirth Action */}
        <div className="p-4 flex flex-col justify-center gap-2 col-span-2 md:col-span-1">
          <button
            type="button"
            onClick={onTriggerSuperRebirth}
            className="saber-purple-btn w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#9333EA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A855F7] active:bg-[#7E22CE] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B4FE]"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Super Rebirth</span>
          </button>
          <p className="text-center text-xs text-[#A79EC0]">
            Path {nextPath} · Cycle {progress.activeCycle + 1}
          </p>
        </div>
      </div>

      {/* Sleek Cycle Completion Hairline Bar */}
      <div
        role="progressbar"
        aria-label="Cycle rebirth completion"
        aria-valuenow={completedTiers}
        aria-valuemin={0}
        aria-valuemax={40}
        className="h-[3px] w-full bg-[#100D1B]"
      >
        <div
          className="h-full bg-gradient-to-r from-[#9333EA] via-[#C084FC] to-[#4ADE80] transition-[width] duration-300 ease-out"
          style={{ width: `${cyclePercent}%` }}
        />
      </div>
    </section>
  );
}
