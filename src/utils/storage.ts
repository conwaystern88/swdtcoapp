import { AppState, CycleTable, DROID_TYPES, DroidRarity } from '../types';
import {
  buildCycle1Table,
  buildScaledCycleTable,
  createInitialAppState,
  findCatalogDroid,
  inferDroidType,
  normalizePathNumber,
  SCHEMA_VERSION,
} from '../data/defaultData';

export const STORAGE_KEY = 'swdt_progression_companion_v1';

export function loadAppState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createInitialAppState();
      saveAppState(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const validated = validateAndNormalizeState(parsed);
    if (!validated.ok) {
      const fresh = createInitialAppState();
      saveAppState(fresh);
      return fresh;
    }
    return validated.state;
  } catch {
    const fresh = createInitialAppState();
    saveAppState(fresh);
    return fresh;
  }
}

export function saveAppState(state: AppState): void {
  try {
    const toStore: AppState = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function ensureCycleExists(
  cycles: Record<number, CycleTable>,
  cycleNumber: number
): Record<number, CycleTable> {
  if (cycles[cycleNumber]) return cycles;
  const baseCycle1 = cycles[1] ?? buildCycle1Table();
  return {
    ...cycles,
    [cycleNumber]: buildScaledCycleTable(cycleNumber, baseCycle1),
  };
}

export function validateAndNormalizeState(
  raw: unknown
): { ok: true; state: AppState } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'JSON root must be an object.' };
  }

  const obj = raw as Record<string, unknown>;
  const progress = obj.progress as Record<string, unknown> | undefined;

  if (!progress || typeof progress !== 'object') {
    return { ok: false, error: 'Missing "progress" object in imported JSON.' };
  }

  const activeCycle = Math.max(1, Math.floor(Number(progress.activeCycle) || 1));
  const activePath = normalizePathNumber(progress.activePath, activeCycle);
  const currentRebirth = Math.min(40, Math.max(1, Math.floor(Number(progress.currentRebirth) || 1)));
  const srbRank = Math.max(0, Math.floor(Number(progress.srbRank) || 0));
  const novaCrystals = Math.max(0, Math.floor(Number(progress.novaCrystals) || 0));
  const permanentCreditMultiplier = Math.max(0, Number(progress.permanentCreditMultiplier) || 0);
  const permanentXpMultiplier = Math.max(0, Number(progress.permanentXpMultiplier) || 0);
  const completedAllTiersInCycle = Boolean(progress.completedAllTiersInCycle);

  const inventory = Array.isArray(progress.inventory)
    ? progress.inventory
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item, idx) => {
          const name = String(item.name || 'Unknown Droid').trim();
          const rawType = String(item.type ?? '');
          const officialMatch = findCatalogDroid(name);
          const resolvedType = officialMatch
            ? officialMatch.type
            : (DROID_TYPES as string[]).includes(rawType)
              ? (rawType as AppState['progress']['inventory'][number]['type'])
              : inferDroidType(name);
          return {
            id: typeof item.id === 'string' && item.id ? item.id : `imp-${Date.now()}-${idx}`,
            name,
            type: resolvedType,
            rarity: Object.values(DroidRarity).includes(String(item.rarity) as DroidRarity)
              ? (String(item.rarity) as DroidRarity)
              : DroidRarity.Base,
            quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
            addedAt: typeof item.addedAt === 'string' ? item.addedAt : new Date().toISOString(),
          };
        })
    : [];

  const srbHistory = Array.isArray(progress.srbHistory)
    ? (progress.srbHistory as AppState['progress']['srbHistory'])
    : [];

  const cycles: Record<number, CycleTable> = {};
  if (obj.cycles && typeof obj.cycles === 'object') {
    for (const [key, val] of Object.entries(obj.cycles as Record<string, unknown>)) {
      const num = Number(key);
      if (
        Number.isInteger(num) &&
        num >= 1 &&
        val &&
        typeof val === 'object' &&
        Array.isArray((val as CycleTable).tiers) &&
        (val as CycleTable).tiers.length > 0
      ) {
        cycles[num] = val as CycleTable;
      }
    }
  }

  if (!cycles[1]) {
    cycles[1] = buildCycle1Table();
  }
  const normalizedCycles = ensureCycleExists(cycles, activeCycle);

  const customDroids = Array.isArray(obj.customDroids)
    ? (obj.customDroids as AppState['customDroids'])
        .filter((d) => d && typeof d.name === 'string' && !findCatalogDroid(d.name))
        .map((d) => ({
          ...d,
          type: (DROID_TYPES as string[]).includes(String(d.type)) ? d.type : 'Worker',
        }))
    : [];

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
      progress: {
        srbRank,
        activeCycle,
        activePath,
        currentRebirth,
        completedAllTiersInCycle,
        novaCrystals,
        permanentCreditMultiplier,
        permanentXpMultiplier,
        inventory,
        srbHistory,
      },
      cycles: normalizedCycles,
      customDroids,
    },
  };
}

export function exportStateAsJsonString(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function downloadStateJson(state: AppState): void {
  const json = exportStateAsJsonString(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `droid-tycoon-cycle${state.progress.activeCycle}-rb${state.progress.currentRebirth}-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
