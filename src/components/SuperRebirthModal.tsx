import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { UserProgress } from '../types';
import { getNextPath } from '../data/defaultData';

interface SuperRebirthModalProps {
  isOpen: boolean;
  progress: UserProgress;
  onClose: () => void;
  onConfirm: () => void;
}

export function SuperRebirthModal({
  isOpen,
  progress,
  onClose,
  onConfirm,
}: SuperRebirthModalProps) {
  const completedTiers = progress.completedAllTiersInCycle
    ? 40
    : Math.max(0, progress.currentRebirth - 1);
  const ownedUnitCount = progress.inventory.reduce((sum, i) => sum + i.quantity, 0);
  const nextPath = getNextPath(progress.activePath);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="srb-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.17, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="panel-surface w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A2440] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="h-4 w-4 text-[#C084FC]" aria-hidden="true" />
                <h2 id="srb-modal-title" className="sw-title text-sm sm:text-base font-bold text-[#F3F0FA]">
                  CONFIRM SUPER REBIRTH
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-md p-1 text-[#A79EC0] hover:bg-[#221D36] hover:text-[#F3F0FA] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-sm">
              {completedTiers < 12 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-[#FCD34D]/30 bg-[#FCD34D]/10 p-3 text-xs text-[#FEF3C7]">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#FCD34D] mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Below RB 12 Standard Threshold</p>
                    <p className="mt-0.5 text-[#FEF3C7]/80">
                      In-game Super Rebirth unlocks after completing RB 12. You currently have {completedTiers} completed tiers logged, but you can still confirm to advance your Path and Cycle.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Delta Table */}
              <div className="rounded-lg border border-[#2A2440] bg-[#0E0C17] divide-y divide-[#231E36] text-xs">
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[#A79EC0]">SRB Rank</span>
                  <span className="font-mono text-[#F3F0FA] tabular-nums">
                    {progress.srbRank} → <strong className="text-[#C084FC]">{progress.srbRank + 1}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[#A79EC0]">Active Path</span>
                  <span className="font-mono text-[#F3F0FA] tabular-nums">
                    Path {progress.activePath} →{' '}
                    <strong className="text-[#4ADE80]">Path {nextPath}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[#A79EC0]">Active Cycle</span>
                  <span className="font-mono text-[#F3F0FA] tabular-nums">
                    Cycle {progress.activeCycle} →{' '}
                    <strong className="text-[#C084FC]">Cycle {progress.activeCycle + 1}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[#A79EC0]">Current Rebirth Tier</span>
                  <span className="font-mono text-[#F3F0FA] tabular-nums">
                    RB {progress.currentRebirth} → <strong className="text-[#F3F0FA]">RB 1</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[#A79EC0]">Owned Droid Inventory</span>
                  <span className="font-mono text-[#FDA4AF] tabular-nums">
                    {ownedUnitCount} units cleared
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-[#2A2440] bg-[#100E1B] px-5 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#352D52] bg-[#1C182C] px-4 py-2 text-xs font-medium text-[#E9E4F5] hover:bg-[#251F3B] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="saber-purple-btn rounded-lg bg-[#9333EA] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A855F7] active:scale-[0.98] transition-all"
              >
                Trigger Super Rebirth
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
