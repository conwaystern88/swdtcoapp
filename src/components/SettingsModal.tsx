import { ChangeEvent, useRef, useState } from 'react';
import { Check, Cloud, Copy, Download, LogIn, LogOut, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { User } from 'firebase/auth';
import { AppState } from '../types';
import {
  downloadStateJson,
  exportStateAsJsonString,
  validateAndNormalizeState,
} from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  state: AppState;
  user: User | null;
  isSigningIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onClose: () => void;
  onImportState: (nextState: AppState) => void;
  onResetRunOnly: () => void;
  onFactoryReset: () => void;
}

export function SettingsModal({
  isOpen,
  state,
  user,
  isSigningIn,
  onSignIn,
  onSignOut,
  onClose,
  onImportState,
  onResetRunOnly,
  onFactoryReset,
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pasteJson, setPasteJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const [confirmRunReset, setConfirmRunReset] = useState(false);

  function handleClose() {
    setConfirmFactoryReset(false);
    setConfirmRunReset(false);
    setImportError(null);
    setImportSuccess(null);
    onClose();
  }

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(exportStateAsJsonString(state));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setImportError('Clipboard access unavailable. Use Download JSON instead.');
    }
  }

  function processRawJson(rawText: string) {
    setImportError(null);
    setImportSuccess(null);
    try {
      const parsed = JSON.parse(rawText);
      const result = validateAndNormalizeState(parsed);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      onImportState(result.state);
      setImportSuccess(
        `Imported Path ${result.state.progress.activePath} · Cycle ${result.state.progress.activeCycle} · RB ${result.state.progress.currentRebirth} (${result.state.progress.inventory.length} droids).`
      );
      setPasteJson('');
    } catch {
      setImportError('Invalid JSON syntax. Please check your backup file and try again.');
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processRawJson(reader.result);
      }
    };
    reader.onerror = () => {
      setImportError('Unable to read the selected file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.17, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="panel-surface w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A2440] px-5 py-4 shrink-0">
              <div>
                <h2 id="settings-modal-title" className="sw-title text-sm sm:text-base font-bold text-[#F3F0FA]">
                  SETTINGS & SYNC BACKUP
                </h2>
                <p className="text-xs text-[#A79EC0] mt-1">
                  {user
                    ? 'Progress syncs to your Google account in Firestore with local offline caching.'
                    : 'Stored locally offline. Sign in with Google to sync progress across devices.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close settings modal"
                className="rounded-md p-1.5 text-[#A79EC0] hover:bg-[#221D36] hover:text-[#F3F0FA] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-6">
          {/* Section 0: Google Account & Cloud Persistence */}
          <div className="rounded-lg border border-[#2A2440] bg-[#0E0C17] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full border border-[#3B315E] object-cover shrink-0"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg border border-[#352D52] bg-[#171326] flex items-center justify-center shrink-0">
                  <Cloud className="h-4 w-4 text-[#C084FC]" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F3F0FA] truncate">
                  {user ? user.displayName || user.email || 'Signed In' : 'Cloud Sync (Google Sign-In)'}
                </p>
                <p className="text-[11px] text-[#A79EC0] truncate">
                  {user
                    ? `${user.email ?? 'Authenticated'} · Synced to Firestore`
                    : 'Sign in with Google to keep your progression synced across devices.'}
                </p>
              </div>
            </div>
            {user ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#352D52] bg-[#1C182C] px-3.5 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#FB7185]/60 hover:text-[#FDA4AF] transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="saber-purple-btn inline-flex items-center gap-1.5 rounded-lg bg-[#9333EA] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A855F7] disabled:opacity-50 transition-colors shrink-0"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>

          <hr className="border-[#2A2440]" />

          {/* Section 1: JSON Export */}
          <div className="space-y-2.5">
            <h3 className="font-display text-xs font-bold tracking-wider uppercase text-[#E9E4F5]">
              Export Backup (JSON)
            </h3>
            <p className="text-xs text-[#A79EC0]">
              Download a full snapshot of your SRB Rank, active Path, active Cycle, owned droids, and requirement tables.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => downloadStateJson(state)}
                className="saber-purple-btn inline-flex items-center gap-2 rounded-lg bg-[#9333EA] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A855F7] transition-colors"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export JSON File</span>
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-2 rounded-lg border border-[#352D52] bg-[#1C182C] px-4 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#4ADE80]/60 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden="true" />
                    <span className="text-[#4ADE80]">Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#A79EC0]" aria-hidden="true" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <hr className="border-[#2A2440]" />

          {/* Section 2: JSON Import */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xs font-bold tracking-wider uppercase text-[#E9E4F5]">
                  Import Backup (JSON)
                </h3>
                <p className="text-xs text-[#A79EC0]">
                  Restore from a saved JSON file or paste exported JSON text below.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#352D52] bg-[#1C182C] px-3.5 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7] transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 text-[#C084FC]" aria-hidden="true" />
                  <span>Import JSON File</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                rows={4}
                value={pasteJson}
                onChange={(e) => setPasteJson(e.target.value)}
                placeholder='Paste exported JSON here... e.g. {"schemaVersion": 1, "progress": {...}}'
                aria-label="Paste JSON backup"
                className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] p-3 font-mono text-xs text-[#E9E4F5] placeholder-[#61587D] focus:border-[#A855F7] focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs">
                  {importError && <span className="text-[#FDA4AF]">{importError}</span>}
                  {importSuccess && <span className="text-[#4ADE80]">{importSuccess}</span>}
                </div>
                <button
                  type="button"
                  disabled={!pasteJson.trim()}
                  onClick={() => processRawJson(pasteJson)}
                  className="rounded-lg border border-[#352D52] bg-[#1C182C] px-3.5 py-1.5 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7] disabled:opacity-40 transition-colors"
                >
                  Import Pasted JSON
                </button>
              </div>
            </div>
          </div>

          <hr className="border-[#2A2440]" />

          {/* Section 3: Reset Controls */}
          <div className="space-y-3">
            <h3 className="font-display text-xs font-bold tracking-wider uppercase text-[#E9E4F5]">
              Reset Data
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Reset Current Run */}
              <div className="rounded-lg border border-[#2A2440] bg-[#0E0C17] p-3.5 space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-[#F3F0FA]">Reset Current Run</p>
                  <p className="text-[11px] text-[#A79EC0] mt-0.5">
                    Clears owned droids and resets Rebirth to 1. Keeps SRB Rank, Active Path, and Cycle.
                  </p>
                </div>
                {!confirmRunReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRunReset(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#352D52] bg-[#1C182C] px-3 py-1.5 text-xs font-medium text-[#E9E4F5] hover:border-[#FCD34D] hover:text-[#FEF3C7] transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset Run</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetRunOnly();
                        setConfirmRunReset(false);
                      }}
                      className="rounded-md bg-[#D97706] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B45309]"
                    >
                      Confirm Reset Run
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRunReset(false)}
                      className="text-xs text-[#A79EC0] hover:text-[#F3F0FA]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Factory Reset */}
              <div className="rounded-lg border border-[#7F1D1D]/55 bg-[#0E0C17] p-3.5 space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-[#FDA4AF]">Full Factory Reset</p>
                  <p className="text-[11px] text-[#A79EC0] mt-0.5">
                    Wipes all local data and restores Path 1 · Cycle 1 defaults, SRB Rank 0, and empty inventory.
                  </p>
                </div>
                {!confirmFactoryReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmFactoryReset(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#991B1B]/60 bg-[#2A1219] px-3 py-1.5 text-xs font-medium text-[#FDA4AF] hover:bg-[#3F1924] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset All Data</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onFactoryReset();
                        setConfirmFactoryReset(false);
                        onClose();
                      }}
                      className="rounded-md bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C]"
                    >
                      Confirm Wipe All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmFactoryReset(false)}
                      className="text-xs text-[#A79EC0] hover:text-[#F3F0FA]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: SRB History Log */}
          {state.progress.srbHistory.length > 0 && (
            <>
              <hr className="border-[#2A2440]" />
              <div className="space-y-2">
                <h3 className="font-display text-xs font-bold tracking-wider uppercase text-[#E9E4F5]">
                  Super Rebirth Log ({state.progress.srbHistory.length})
                </h3>
                <div className="rounded-lg border border-[#2A2440] bg-[#0E0C17] divide-y divide-[#231E36] text-xs">
                  {state.progress.srbHistory.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-3.5 py-2">
                      <span className="text-[#E9E4F5]">
                        Cycle {entry.fromCycle}
                        {entry.fromPath ? ` (Path ${entry.fromPath})` : ''} → Cycle {entry.toCycle}
                        {entry.toPath ? ` (Path ${entry.toPath})` : ''}
                      </span>
                      <span className="font-mono text-[#4ADE80] tabular-nums">
                        at RB {entry.atRebirthTier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-[#2A2440] bg-[#100E1B] px-5 py-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-[#352D52] bg-[#1C182C] px-4 py-1.5 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7]/60 active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
