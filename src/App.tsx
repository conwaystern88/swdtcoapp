import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ActiveView,
  AppState,
  DroidCatalogItem,
  DroidRarity,
  DroidRequirement,
  DroidType,
  OwnedDroid,
  RARITY_ORDER,
  RebirthPathNumber,
} from './types';
import {
  buildCycle1Table,
  createInitialAppState,
  createSampleStarterInventory,
  DEFAULT_DROID_CATALOG,
  getNextPath,
  getNextRarity,
  normalizeDroidNameKey,
} from './data/defaultData';
import { analyzeInventory } from './utils/analyzer';
import { ensureCycleExists, loadAppState, saveAppState } from './utils/storage';
import { useFirebaseAuth } from './contexts/FirebaseContext';
import {
  addCloudCustomDroid,
  deleteCloudDroid,
  ensureCloudUserProfile,
  executeCloudSuperRebirth,
  fuseCloudDroids,
  replaceAllCloudState,
  resetCloudRun,
  sanitizeDocId,
  subscribeUserCloudState,
  updateCloudProgress,
  upsertCloudDroid,
} from './utils/firestoreSync';
import { TopBar } from './components/TopBar';
import { ProgressionHeader } from './components/ProgressionHeader';
import { RebirthRoadmap } from './components/RebirthRoadmap';
import { InventoryAnalyzer } from './components/InventoryAnalyzer';
import { LiveIntelPanel } from './components/LiveIntelPanel';
import { SuperRebirthModal } from './components/SuperRebirthModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const { user, authReady, isSigningIn, authError, signInWithGoogle, signOutUser, clearAuthError } =
    useFirebaseAuth();

  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSrbModalOpen, setIsSrbModalOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<Error | null>(null);
  const [pendingIntelQuery, setPendingIntelQuery] = useState<string | null>(null);
  const [pendingIntelNonce, setPendingIntelNonce] = useState(0);

  const latestStateRef = useRef<AppState>(state);
  latestStateRef.current = state;

  const cloudReadyRef = useRef(false);

  // Escalate critical Firestore errors to ErrorBoundary
  if (cloudError) {
    throw cloudError;
  }

  // Persist every state change to localStorage (offline cache + offline-first mode)
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Connect to Firestore real-time persistence when signed in with Google
  useEffect(() => {
    cloudReadyRef.current = false;
    if (!authReady || !user) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function connectCloud() {
      try {
        const migrated = await ensureCloudUserProfile(
          user!.uid,
          user!.displayName,
          latestStateRef.current
        );
        if (cancelled) return;
        cloudReadyRef.current = true;

        if (migrated) {
          setFeedbackBanner('Signed in with Google — synced your local progress to Firestore.');
        }

        unsubscribe = subscribeUserCloudState(user!.uid, {
          onProgress: (cloudProgress) => {
            setState((prev) => ({
              ...prev,
              cycles: ensureCycleExists(prev.cycles, cloudProgress.activeCycle),
              progress: {
                ...prev.progress,
                srbRank: cloudProgress.srbRank,
                activeCycle: cloudProgress.activeCycle,
                activePath: cloudProgress.activePath,
                currentRebirth: cloudProgress.currentRebirth,
                completedAllTiersInCycle: cloudProgress.completedAllTiersInCycle,
              },
            }));
          },
          onDroids: (droids) => {
            setState((prev) => ({
              ...prev,
              progress: {
                ...prev.progress,
                inventory: droids,
              },
            }));
          },
          onSrbHistory: (entries) => {
            setState((prev) => ({
              ...prev,
              progress: {
                ...prev.progress,
                srbHistory: entries,
              },
            }));
          },
          onCustomDroids: (customDroids) => {
            setState((prev) => ({
              ...prev,
              customDroids,
            }));
          },
          onError: (err) => {
            setCloudError(err);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    void connectCloud();

    return () => {
      cancelled = true;
      cloudReadyRef.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, [authReady, user]);

  // Auto-dismiss transient feedback notices
  useEffect(() => {
    if (!feedbackBanner) return;
    const timer = window.setTimeout(() => setFeedbackBanner(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedbackBanner]);

  function runCloudMutation(task: () => Promise<void>) {
    if (!user || !cloudReadyRef.current) return;
    task().catch((err) => {
      setCloudError(err instanceof Error ? err : new Error(String(err)));
    });
  }

  const activeCycleTable = useMemo(() => {
    return state.cycles[state.progress.activeCycle] ?? state.cycles[1] ?? buildCycle1Table();
  }, [state.cycles, state.progress.activeCycle]);

  const fullCatalog = useMemo(() => {
    const map = new Map<string, DroidCatalogItem>();
    for (const d of DEFAULT_DROID_CATALOG) {
      map.set(normalizeDroidNameKey(d.name), d);
    }
    for (const d of state.customDroids) {
      const key = normalizeDroidNameKey(d.name);
      if (!map.has(key)) {
        map.set(key, {
          ...d,
          availableRarities: d.availableRarities ?? [...RARITY_ORDER],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.customDroids]);

  const analyzedInventory = useMemo(() => {
    return analyzeInventory(
      state.progress.inventory,
      state.progress.currentRebirth,
      state.progress.completedAllTiersInCycle,
      activeCycleTable.tiers
    );
  }, [
    state.progress.inventory,
    state.progress.currentRebirth,
    state.progress.completedAllTiersInCycle,
    activeCycleTable.tiers,
  ]);

  const availableCycles = useMemo(() => {
    return Object.keys(state.cycles)
      .map(Number)
      .sort((a, b) => a - b);
  }, [state.cycles]);

  function showNotice(msg: string) {
    setFeedbackBanner(msg);
  }

  function handleLookupIntel(query: string) {
    setPendingIntelQuery(query);
    setPendingIntelNonce((n) => n + 1);
    setActiveView('intel');
  }

  // Add or increment an owned droid in inventory
  function handleAddDroid(name: string, type: DroidType, rarity: DroidRarity, quantity: number) {
    const cleanName = name.trim();
    if (!cleanName) return;

    const cleanKey = normalizeDroidNameKey(cleanName);
    const currentSnapshot = latestStateRef.current;
    const existingItem = currentSnapshot.progress.inventory.find(
      (item) => normalizeDroidNameKey(item.name) === cleanKey && item.rarity === rarity
    );

    const newDocId = sanitizeDocId(
      `droid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      'droid'
    );
    const inDefault = DEFAULT_DROID_CATALOG.some(
      (d) => normalizeDroidNameKey(d.name) === cleanKey
    );
    const inCustom = currentSnapshot.customDroids.some(
      (d) => normalizeDroidNameKey(d.name) === cleanKey
    );

    setState((prev) => {
      const existingIdx = prev.progress.inventory.findIndex(
        (item) => normalizeDroidNameKey(item.name) === cleanKey && item.rarity === rarity
      );

      const nextInventory = [...prev.progress.inventory];
      if (existingIdx >= 0) {
        nextInventory[existingIdx] = {
          ...nextInventory[existingIdx],
          type,
          quantity: nextInventory[existingIdx].quantity + quantity,
        };
      } else {
        nextInventory.push({
          id: newDocId,
          name: cleanName,
          type,
          rarity,
          quantity,
          addedAt: new Date().toISOString(),
        });
      }

      const nextCustomDroids =
        !inDefault && !inCustom
          ? [...prev.customDroids, { name: cleanName, type, availableRarities: [...RARITY_ORDER] }]
          : prev.customDroids;

      return {
        ...prev,
        progress: {
          ...prev.progress,
          inventory: nextInventory,
        },
        customDroids: nextCustomDroids,
      };
    });

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(async () => {
        if (existingItem) {
          await upsertCloudDroid(
            uid,
            {
              id: existingItem.id,
              name: existingItem.name,
              type,
              rarity,
              quantity: existingItem.quantity + quantity,
            },
            true
          );
        } else {
          await upsertCloudDroid(
            uid,
            {
              id: newDocId,
              name: cleanName,
              type,
              rarity,
              quantity,
            },
            false
          );
        }
        if (!inDefault && !inCustom) {
          await addCloudCustomDroid(uid, cleanName, type);
        }
      });
    }

    showNotice(`Logged ${quantity}× ${rarity} ${cleanName}.`);
  }

  function handleQuickAddFromRequirement(req: DroidRequirement) {
    handleAddDroid(req.droidName, req.droidType, req.rarity, 1);
  }

  function handleUpdateQuantity(id: string, delta: number) {
    const target = latestStateRef.current.progress.inventory.find((item) => item.id === id);
    if (!target) return;
    const nextQty = target.quantity + delta;

    setState((prev) => {
      const nextInventory = prev.progress.inventory
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0);

      return {
        ...prev,
        progress: {
          ...prev.progress,
          inventory: nextInventory,
        },
      };
    });

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(async () => {
        if (nextQty <= 0) {
          await deleteCloudDroid(uid, id);
        } else {
          await upsertCloudDroid(
            uid,
            {
              id: target.id,
              name: target.name,
              type: target.type,
              rarity: target.rarity,
              quantity: nextQty,
            },
            true
          );
        }
      });
    }
  }

  function handleRemoveDroid(id: string) {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        inventory: prev.progress.inventory.filter((item) => item.id !== id),
      },
    }));

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() => deleteCloudDroid(uid, id));
    }
  }

  // Fuse 3 copies into 1 copy of the next rarity tier
  function handleFuseDroid(droid: OwnedDroid) {
    const nextRarity = getNextRarity(droid.rarity);
    if (!nextRarity || droid.quantity < 3) return;

    const existingTarget = latestStateRef.current.progress.inventory.find(
      (item) =>
        normalizeDroidNameKey(item.name) === normalizeDroidNameKey(droid.name) &&
        item.rarity === nextRarity
    );
    const newTargetId = sanitizeDocId(
      `fused-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      'fused'
    );

    setState((prev) => {
      let nextInventory = prev.progress.inventory
        .map((item) => (item.id === droid.id ? { ...item, quantity: item.quantity - 3 } : item))
        .filter((item) => item.quantity > 0);

      const targetIdx = nextInventory.findIndex(
        (item) =>
          normalizeDroidNameKey(item.name) === normalizeDroidNameKey(droid.name) &&
          item.rarity === nextRarity
      );

      if (targetIdx >= 0) {
        nextInventory[targetIdx] = {
          ...nextInventory[targetIdx],
          quantity: nextInventory[targetIdx].quantity + 1,
        };
      } else {
        nextInventory = [
          ...nextInventory,
          {
            id: newTargetId,
            name: droid.name,
            type: droid.type,
            rarity: nextRarity,
            quantity: 1,
            addedAt: new Date().toISOString(),
          },
        ];
      }

      return {
        ...prev,
        progress: {
          ...prev.progress,
          inventory: nextInventory,
        },
      };
    });

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        fuseCloudDroids(uid, droid, nextRarity, existingTarget, newTargetId)
      );
    }

    showNotice(`Fused 3× ${droid.rarity} ${droid.name} → 1× ${nextRarity} ${droid.name}.`);
  }

  // Complete a Rebirth Tier and advance target
  function handleCompleteTier(tierNumber: number) {
    const isFinalTier = tierNumber >= 40;
    const nextRebirth = isFinalTier ? 40 : tierNumber + 1;

    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        currentRebirth: nextRebirth,
        completedAllTiersInCycle: isFinalTier,
      },
    }));

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        updateCloudProgress(uid, {
          currentRebirth: nextRebirth,
          completedAllTiersInCycle: isFinalTier,
        })
      );
    }

    showNotice(`Completed RB ${tierNumber}.`);
  }

  function handleSetCurrentRebirth(tierNumber: number) {
    const clamped = Math.min(40, Math.max(1, tierNumber));
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        currentRebirth: clamped,
        completedAllTiersInCycle: false,
      },
    }));

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        updateCloudProgress(uid, {
          currentRebirth: clamped,
          completedAllTiersInCycle: false,
        })
      );
    }
  }

  function handleSelectCycle(cycleNumber: number) {
    setState((prev) => {
      const cyclesWithTarget = ensureCycleExists(prev.cycles, cycleNumber);
      return {
        ...prev,
        cycles: cyclesWithTarget,
        progress: {
          ...prev.progress,
          activeCycle: cycleNumber,
        },
      };
    });

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() => updateCloudProgress(uid, { activeCycle: cycleNumber }));
    }
  }

  function handleSelectPath(pathNumber: RebirthPathNumber) {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        activePath: pathNumber,
      },
    }));

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() => updateCloudProgress(uid, { activePath: pathNumber }));
    }

    showNotice(`Switched active indicator to Path ${pathNumber}.`);
  }

  function handleAdjustSrbRank(delta: number) {
    const nextRank = Math.max(0, latestStateRef.current.progress.srbRank + delta);
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        srbRank: Math.max(0, prev.progress.srbRank + delta),
      },
    }));

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() => updateCloudProgress(uid, { srbRank: nextRank }));
    }
  }

  // Super Rebirth: advances cycle & active path (1-6 loop), increments SRB Rank,
  // resets current rebirth to 1, and clears owned droids.
  function handleConfirmSuperRebirth() {
    const snap = latestStateRef.current.progress;
    const nextPath = getNextPath(snap.activePath);
    const nextCycle = snap.activeCycle + 1;
    const nextSrbRank = snap.srbRank + 1;
    const completedBeforeSrb = snap.completedAllTiersInCycle
      ? 40
      : Math.max(0, snap.currentRebirth - 1);
    const historyId = sanitizeDocId(`srb-${Date.now()}`, 'srb');
    const droidIdsToClear = snap.inventory.map((d) => d.id);

    setState((prev) => {
      const nextCycles = ensureCycleExists(prev.cycles, nextCycle);
      return {
        ...prev,
        cycles: nextCycles,
        progress: {
          ...prev.progress,
          srbRank: nextSrbRank,
          activeCycle: nextCycle,
          activePath: nextPath,
          currentRebirth: 1,
          completedAllTiersInCycle: false,
          inventory: [],
          srbHistory: [
            {
              id: historyId,
              timestamp: new Date().toISOString(),
              fromCycle: snap.activeCycle,
              toCycle: nextCycle,
              fromPath: snap.activePath,
              toPath: nextPath,
              atRebirthTier: completedBeforeSrb,
            },
            ...prev.progress.srbHistory,
          ],
        },
      };
    });

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        executeCloudSuperRebirth(
          uid,
          {
            nextSrbRank,
            fromCycle: snap.activeCycle,
            toCycle: nextCycle,
            fromPath: snap.activePath,
            toPath: nextPath,
            atRebirthTier: completedBeforeSrb,
            historyId,
          },
          droidIdsToClear
        )
      );
    }

    setIsSrbModalOpen(false);
    showNotice(
      `Super Rebirth complete: Advanced to Path ${nextPath} · Cycle ${nextCycle}, reset to RB 1, and cleared droids.`
    );
  }

  function handleLoadSampleHangar() {
    const sample = createSampleStarterInventory();
    const prevIds = latestStateRef.current.progress.inventory.map((d) => d.id);
    const nextState: AppState = {
      ...latestStateRef.current,
      progress: {
        ...latestStateRef.current.progress,
        inventory: sample,
      },
    };

    setState(nextState);

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        replaceAllCloudState(uid, user.displayName, nextState, {
          droidIds: prevIds,
          historyIds: latestStateRef.current.progress.srbHistory.map((h) => h.id),
          customDroidNames: latestStateRef.current.customDroids.map((c) => c.name),
        })
      );
    }

    showNotice('Loaded sample Cycle 1 starter hangar (Needed, Fuse, Kyber, and Scourge examples).');
  }

  function handleResetRunOnly() {
    const droidIds = latestStateRef.current.progress.inventory.map((d) => d.id);
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        currentRebirth: 1,
        completedAllTiersInCycle: false,
        inventory: [],
      },
    }));

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() => resetCloudRun(uid, droidIds));
    }

    showNotice('Current run reset to RB 1 with cleared inventory.');
  }

  function handleFactoryReset() {
    const prev = latestStateRef.current;
    const fresh = createInitialAppState();
    setState(fresh);

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        replaceAllCloudState(uid, user.displayName, fresh, {
          droidIds: prev.progress.inventory.map((d) => d.id),
          historyIds: prev.progress.srbHistory.map((h) => h.id),
          customDroidNames: prev.customDroids.map((c) => c.name),
        })
      );
    }

    showNotice('All data reset to Path 1 · Cycle 1 defaults.');
  }

  function handleImportState(imported: AppState) {
    const prev = latestStateRef.current;
    setState(imported);

    if (user && cloudReadyRef.current) {
      const uid = user.uid;
      runCloudMutation(() =>
        replaceAllCloudState(uid, user.displayName, imported, {
          droidIds: prev.progress.inventory.map((d) => d.id),
          historyIds: prev.progress.srbHistory.map((h) => h.id),
          customDroidNames: prev.customDroids.map((c) => c.name),
        })
      );
    }

    showNotice(
      `Imported Path ${imported.progress.activePath} · Cycle ${imported.progress.activeCycle} · RB ${imported.progress.currentRebirth}.`
    );
  }

  return (
    <div className="min-h-screen text-[#F3F0FA] flex flex-col">
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        authReady={authReady}
        isSigningIn={isSigningIn}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 space-y-5">
        {/* Auth Error Notice */}
        <AnimatePresence>
          {authError && (
            <motion.div
              key="auth-error"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#F87171]/40 bg-[#261117]/90 px-4 py-2.5 text-xs font-medium text-[#FECACA]"
            >
              <span>{authError}</span>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-[#F87171] hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Notice */}
        <AnimatePresence>
          {feedbackBanner && (
            <motion.div
              key="feedback-banner"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#4ADE80]/35 bg-[#0F241A]/90 px-4 py-2.5 text-xs font-medium text-[#BBF7D0]"
            >
              <span>{feedbackBanner}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-[#4ADE80] hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent SRB / Path / Cycle Command Strip */}
        <ProgressionHeader
          progress={state.progress}
          availableCycles={availableCycles}
          onTriggerSuperRebirth={() => setIsSrbModalOpen(true)}
          onAdjustCurrentRebirth={handleSetCurrentRebirth}
          onSelectCycle={handleSelectCycle}
          onSelectPath={handleSelectPath}
          onAdjustSrbRank={handleAdjustSrbRank}
        />

        {/* Active View Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeView === 'workspace' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <div className="xl:col-span-6">
                  <InventoryAnalyzer
                    analyzedInventory={analyzedInventory}
                    catalog={fullCatalog}
                    customDroids={state.customDroids}
                    onAddDroid={handleAddDroid}
                    onUpdateQuantity={handleUpdateQuantity}
                    onFuseDroid={handleFuseDroid}
                    onRemoveDroid={handleRemoveDroid}
                    onLoadSampleHangar={handleLoadSampleHangar}
                    onLookupIntel={handleLookupIntel}
                    compact
                  />
                </div>
                <div className="xl:col-span-6">
                  <RebirthRoadmap
                    cycleNumber={state.progress.activeCycle}
                    pathNumber={state.progress.activePath}
                    tiers={activeCycleTable.tiers}
                    currentRebirth={state.progress.currentRebirth}
                    completedAllTiersInCycle={state.progress.completedAllTiersInCycle}
                    inventory={state.progress.inventory}
                    onCompleteTier={handleCompleteTier}
                    onSetCurrentRebirth={handleSetCurrentRebirth}
                    onQuickAddDroid={handleQuickAddFromRequirement}
                    onLookupIntel={handleLookupIntel}
                    compact
                  />
                </div>
              </div>
            )}

            {activeView === 'roadmap' && (
              <RebirthRoadmap
                cycleNumber={state.progress.activeCycle}
                pathNumber={state.progress.activePath}
                tiers={activeCycleTable.tiers}
                currentRebirth={state.progress.currentRebirth}
                completedAllTiersInCycle={state.progress.completedAllTiersInCycle}
                inventory={state.progress.inventory}
                onCompleteTier={handleCompleteTier}
                onSetCurrentRebirth={handleSetCurrentRebirth}
                onQuickAddDroid={handleQuickAddFromRequirement}
                onLookupIntel={handleLookupIntel}
              />
            )}

            {activeView === 'inventory' && (
              <InventoryAnalyzer
                analyzedInventory={analyzedInventory}
                catalog={fullCatalog}
                customDroids={state.customDroids}
                onAddDroid={handleAddDroid}
                onUpdateQuantity={handleUpdateQuantity}
                onFuseDroid={handleFuseDroid}
                onRemoveDroid={handleRemoveDroid}
                onLoadSampleHangar={handleLoadSampleHangar}
                onLookupIntel={handleLookupIntel}
              />
            )}

            {activeView === 'intel' && (
              <LiveIntelPanel
                progress={state.progress}
                pendingQuery={pendingIntelQuery}
                pendingQueryNonce={pendingIntelNonce}
                onConsumePendingQuery={() => setPendingIntelQuery(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#26203B] py-4 px-4 sm:px-6 text-xs text-[#7E7499]">
        <div className="mx-auto max-w-[1440px] flex flex-wrap items-center justify-between gap-2">
          <span>
            Star Wars Droid Tycoon Progression Companion ·{' '}
            {user ? 'Synced with Firebase Cloud' : 'Offline Local Storage'}
          </span>
          <span>Cycle 1 Tiers 1–23 pre-populated · Live Google Search Intel</span>
        </div>
      </footer>

      {/* Modals */}
      <SuperRebirthModal
        isOpen={isSrbModalOpen}
        progress={state.progress}
        onClose={() => setIsSrbModalOpen(false)}
        onConfirm={handleConfirmSuperRebirth}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        state={state}
        user={user}
        isSigningIn={isSigningIn}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
        onClose={() => setIsSettingsOpen(false)}
        onImportState={handleImportState}
        onResetRunOnly={handleResetRunOnly}
        onFactoryReset={handleFactoryReset}
      />
    </div>
  );
}
