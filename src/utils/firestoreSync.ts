import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AppState,
  DROID_TYPES,
  DroidCatalogItem,
  DroidRarity,
  DroidType,
  OwnedDroid,
  RARITY_ORDER,
  RebirthPathNumber,
  SuperRebirthHistoryEntry,
} from '../types';
import { findCatalogDroid, normalizePathNumber } from '../data/defaultData';

// Blueprint-synchronized volumetric & format constraints (mirrors firebase-blueprint.json)
const ID_MAX_LENGTH = 128;
const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;
const NAME_MAX_LENGTH = 80;
const DISPLAY_NAME_MAX_LENGTH = 100;
const MAX_SRB_RANK = 10000;
const MAX_CYCLE = 10000;
const MIN_REBIRTH = 1;
const MAX_REBIRTH = 40;
const MIN_QTY = 1;
const MAX_QTY = 9999;

export function sanitizeDocId(raw: string, prefix = 'doc'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, ID_MAX_LENGTH);
  if (cleaned.length >= 1 && ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.slice(
    0,
    ID_MAX_LENGTH
  );
}

function clampInt(val: number, min: number, max: number): number {
  const num = Number.isFinite(val) ? Math.floor(val) : min;
  return Math.min(max, Math.max(min, num));
}

function sanitizeName(name: string): string {
  const trimmed = name.trim().slice(0, NAME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : 'Unknown Droid';
}

function sanitizeDisplayName(displayName?: string | null): string {
  return (displayName ?? '').trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
}

function sanitizeDroidType(type: string, name?: string): DroidType {
  if (name) {
    const official = findCatalogDroid(name);
    if (official) return official.type;
  }
  return (DROID_TYPES as string[]).includes(type) ? (type as DroidType) : 'Worker';
}

function sanitizeRarity(rarity: string): DroidRarity {
  return Object.values(DroidRarity).includes(rarity as DroidRarity)
    ? (rarity as DroidRarity)
    : DroidRarity.Base;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export interface CloudUserProgress {
  srbRank: number;
  activeCycle: number;
  activePath: RebirthPathNumber;
  currentRebirth: number;
  completedAllTiersInCycle: boolean;
}

/**
 * Ensures /users/{uid} exists before any subcollection writes or listeners.
 * If this is the user's first sign-in and they already have local offline data,
 * migrates their local progression, droids, SRB history, and custom droids to Firestore.
 */
export async function ensureCloudUserProfile(
  uid: string,
  displayName: string | null,
  localState: AppState
): Promise<boolean> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap.exists()) {
    return false;
  }

  // Create parent document first so Master Gate passes for all subcollection writes
  const p = localState.progress;
  try {
    await setDoc(userRef, {
      ownerId: uid,
      displayName: sanitizeDisplayName(displayName),
      srbRank: clampInt(p.srbRank, 0, MAX_SRB_RANK),
      activeCycle: clampInt(p.activeCycle, 1, MAX_CYCLE),
      activePath: normalizePathNumber(p.activePath, p.activeCycle),
      currentRebirth: clampInt(p.currentRebirth, MIN_REBIRTH, MAX_REBIRTH),
      completedAllTiersInCycle: Boolean(p.completedAllTiersInCycle),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  // Migrate local droids, SRB history, and custom droids if present
  const hasSubItems =
    p.inventory.length > 0 || p.srbHistory.length > 0 || localState.customDroids.length > 0;

  if (hasSubItems) {
    await writeSubcollectionsChunked(uid, p.inventory, p.srbHistory, localState.customDroids);
  }

  return true;
}

async function writeSubcollectionsChunked(
  uid: string,
  inventory: OwnedDroid[],
  srbHistory: SuperRebirthHistoryEntry[],
  customDroids: DroidCatalogItem[]
): Promise<void> {
  const ops: Array<{ run: (batch: ReturnType<typeof writeBatch>) => void }> = [];

  for (const item of inventory) {
    const droidId = sanitizeDocId(item.id, 'droid');
    const name = sanitizeName(item.name);
    ops.push({
      run: (batch) => {
        batch.set(doc(db, 'users', uid, 'droids', droidId), {
          ownerId: uid,
          name,
          type: sanitizeDroidType(item.type, name),
          rarity: sanitizeRarity(item.rarity),
          quantity: clampInt(item.quantity, MIN_QTY, MAX_QTY),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      },
    });
  }

  for (const entry of srbHistory) {
    const entryId = sanitizeDocId(entry.id, 'srb');
    const fromCycle = clampInt(entry.fromCycle, 1, MAX_CYCLE);
    const toCycle = clampInt(Math.max(fromCycle, entry.toCycle), fromCycle, MAX_CYCLE);
    ops.push({
      run: (batch) => {
        batch.set(doc(db, 'users', uid, 'srbHistory', entryId), {
          ownerId: uid,
          fromCycle,
          toCycle,
          fromPath: normalizePathNumber(entry.fromPath, fromCycle),
          toPath: normalizePathNumber(entry.toPath, toCycle),
          atRebirthTier: clampInt(entry.atRebirthTier, 0, MAX_REBIRTH),
          createdAt: serverTimestamp(),
        });
      },
    });
  }

  for (const custom of customDroids) {
    const name = sanitizeName(custom.name);
    if (findCatalogDroid(name)) continue;
    const customId = sanitizeDocId(`custom-${name.toLowerCase()}`, 'custom');
    ops.push({
      run: (batch) => {
        batch.set(doc(db, 'users', uid, 'customDroids', customId), {
          ownerId: uid,
          name,
          type: sanitizeDroidType(custom.type),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      },
    });
  }

  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + CHUNK_SIZE)) {
      op.run(batch);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }
}

export interface CloudSubscriptionCallbacks {
  onProgress: (progress: CloudUserProgress) => void;
  onDroids: (droids: OwnedDroid[]) => void;
  onSrbHistory: (entries: SuperRebirthHistoryEntry[]) => void;
  onCustomDroids: (customDroids: DroidCatalogItem[]) => void;
  onError: (error: Error) => void;
}

export function subscribeUserCloudState(
  uid: string,
  callbacks: CloudSubscriptionCallbacks
): Unsubscribe {
  const userPath = `users/${uid}`;
  const droidsPath = `users/${uid}/droids`;
  const historyPath = `users/${uid}/srbHistory`;
  const customPath = `users/${uid}/customDroids`;

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const activeCycle = clampInt(Number(data.activeCycle ?? 1), 1, MAX_CYCLE);
      callbacks.onProgress({
        srbRank: clampInt(Number(data.srbRank ?? 0), 0, MAX_SRB_RANK),
        activeCycle,
        activePath: normalizePathNumber(data.activePath, activeCycle),
        currentRebirth: clampInt(Number(data.currentRebirth ?? 1), MIN_REBIRTH, MAX_REBIRTH),
        completedAllTiersInCycle: Boolean(data.completedAllTiersInCycle),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubDroids = onSnapshot(
    query(collection(db, 'users', uid, 'droids'), where('ownerId', '==', uid)),
    (snap) => {
      const list: OwnedDroid[] = snap.docs.map((d) => {
        const data = d.data();
        const name = sanitizeName(String(data.name ?? 'Unknown Droid'));
        return {
          id: d.id,
          name,
          type: sanitizeDroidType(String(data.type ?? 'Worker'), name),
          rarity: sanitizeRarity(String(data.rarity ?? DroidRarity.Base)),
          quantity: clampInt(Number(data.quantity ?? 1), MIN_QTY, MAX_QTY),
          addedAt: timestampToIso(data.createdAt),
        };
      });
      callbacks.onDroids(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, droidsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubHistory = onSnapshot(
    query(collection(db, 'users', uid, 'srbHistory'), where('ownerId', '==', uid)),
    (snap) => {
      const entries: SuperRebirthHistoryEntry[] = snap.docs
        .map((d) => {
          const data = d.data();
          const fromCycle = clampInt(Number(data.fromCycle ?? 1), 1, MAX_CYCLE);
          const toCycle = clampInt(Number(data.toCycle ?? fromCycle + 1), fromCycle, MAX_CYCLE);
          return {
            id: d.id,
            timestamp: timestampToIso(data.createdAt),
            fromCycle,
            toCycle,
            fromPath: normalizePathNumber(data.fromPath, fromCycle),
            toPath: normalizePathNumber(data.toPath, toCycle),
            atRebirthTier: clampInt(Number(data.atRebirthTier ?? 0), 0, MAX_REBIRTH),
          };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      callbacks.onSrbHistory(entries);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, historyPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubCustom = onSnapshot(
    query(collection(db, 'users', uid, 'customDroids'), where('ownerId', '==', uid)),
    (snap) => {
      const list: DroidCatalogItem[] = snap.docs
        .map((d) => {
          const data = d.data();
          const name = sanitizeName(String(data.name ?? ''));
          return {
            name,
            type: sanitizeDroidType(String(data.type ?? 'Worker')),
            availableRarities: [...RARITY_ORDER],
          };
        })
        .filter((item) => item.name.length > 0 && !findCatalogDroid(item.name));
      callbacks.onCustomDroids(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, customPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubUser();
    unsubDroids();
    unsubHistory();
    unsubCustom();
  };
}

export async function updateCloudProgress(
  uid: string,
  fields: Partial<CloudUserProgress>
): Promise<void> {
  const path = `users/${uid}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (fields.srbRank !== undefined) {
    payload.srbRank = clampInt(fields.srbRank, 0, MAX_SRB_RANK);
  }
  if (fields.activeCycle !== undefined) {
    payload.activeCycle = clampInt(fields.activeCycle, 1, MAX_CYCLE);
  }
  if (fields.activePath !== undefined) {
    payload.activePath = normalizePathNumber(fields.activePath, fields.activeCycle ?? 1);
  }
  if (fields.currentRebirth !== undefined) {
    payload.currentRebirth = clampInt(fields.currentRebirth, MIN_REBIRTH, MAX_REBIRTH);
  }
  if (fields.completedAllTiersInCycle !== undefined) {
    payload.completedAllTiersInCycle = Boolean(fields.completedAllTiersInCycle);
  }

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertCloudDroid(
  uid: string,
  droid: { id: string; name: string; type: DroidType; rarity: DroidRarity; quantity: number },
  isExisting: boolean
): Promise<void> {
  const droidId = sanitizeDocId(droid.id, 'droid');
  const path = `users/${uid}/droids/${droidId}`;
  const ref = doc(db, 'users', uid, 'droids', droidId);
  const cleanName = sanitizeName(droid.name);
  const cleanType = sanitizeDroidType(droid.type, cleanName);
  const cleanQty = clampInt(droid.quantity, MIN_QTY, MAX_QTY);

  try {
    if (isExisting) {
      await updateDoc(ref, {
        type: cleanType,
        quantity: cleanQty,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        name: cleanName,
        type: cleanType,
        rarity: sanitizeRarity(droid.rarity),
        quantity: cleanQty,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCloudDroid(uid: string, droidId: string): Promise<void> {
  const cleanId = sanitizeDocId(droidId, 'droid');
  const path = `users/${uid}/droids/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'droids', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fuseCloudDroids(
  uid: string,
  source: OwnedDroid,
  nextRarity: DroidRarity,
  existingTarget: OwnedDroid | undefined,
  newTargetId: string
): Promise<void> {
  const path = `users/${uid}/droids`;
  const batch = writeBatch(db);
  const sourceId = sanitizeDocId(source.id, 'droid');
  const sourceRef = doc(db, 'users', uid, 'droids', sourceId);

  const remainingQty = source.quantity - 3;
  if (remainingQty > 0) {
    batch.update(sourceRef, {
      quantity: clampInt(remainingQty, MIN_QTY, MAX_QTY),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.delete(sourceRef);
  }

  if (existingTarget) {
    const targetId = sanitizeDocId(existingTarget.id, 'droid');
    batch.update(doc(db, 'users', uid, 'droids', targetId), {
      quantity: clampInt(existingTarget.quantity + 1, MIN_QTY, MAX_QTY),
      updatedAt: serverTimestamp(),
    });
  } else {
    const cleanName = sanitizeName(source.name);
    const targetId = sanitizeDocId(newTargetId, 'fused');
    batch.set(doc(db, 'users', uid, 'droids', targetId), {
      ownerId: uid,
      name: cleanName,
      type: sanitizeDroidType(source.type, cleanName),
      rarity: sanitizeRarity(nextRarity),
      quantity: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addCloudCustomDroid(
  uid: string,
  name: string,
  type: DroidType
): Promise<void> {
  const cleanName = sanitizeName(name);
  if (findCatalogDroid(cleanName)) return;
  const customId = sanitizeDocId(`custom-${cleanName.toLowerCase()}`, 'custom');
  const path = `users/${uid}/customDroids/${customId}`;
  const ref = doc(db, 'users', uid, 'customDroids', customId);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        name: cleanName,
        type: sanitizeDroidType(type),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        name: cleanName,
        type: sanitizeDroidType(type),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function executeCloudSuperRebirth(
  uid: string,
  params: {
    nextSrbRank: number;
    fromCycle: number;
    toCycle: number;
    fromPath: RebirthPathNumber;
    toPath: RebirthPathNumber;
    atRebirthTier: number;
    historyId: string;
  },
  droidIdsToClear: string[]
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const historyId = sanitizeDocId(params.historyId, 'srb');
  const historyRef = doc(db, 'users', uid, 'srbHistory', historyId);

  // First commit profile update + SRB history entry + up to 350 droid deletions atomically
  const firstBatch = writeBatch(db);
  firstBatch.update(userRef, {
    srbRank: clampInt(params.nextSrbRank, 0, MAX_SRB_RANK),
    activeCycle: clampInt(params.toCycle, 1, MAX_CYCLE),
    activePath: normalizePathNumber(params.toPath, params.toCycle),
    currentRebirth: 1,
    completedAllTiersInCycle: false,
    updatedAt: serverTimestamp(),
  });
  firstBatch.set(historyRef, {
    ownerId: uid,
    fromCycle: clampInt(params.fromCycle, 1, MAX_CYCLE),
    toCycle: clampInt(Math.max(params.fromCycle, params.toCycle), params.fromCycle, MAX_CYCLE),
    fromPath: normalizePathNumber(params.fromPath, params.fromCycle),
    toPath: normalizePathNumber(params.toPath, params.toCycle),
    atRebirthTier: clampInt(params.atRebirthTier, 0, MAX_REBIRTH),
    createdAt: serverTimestamp(),
  });

  const firstSlice = droidIdsToClear.slice(0, 350);
  for (const id of firstSlice) {
    firstBatch.delete(doc(db, 'users', uid, 'droids', sanitizeDocId(id, 'droid')));
  }

  try {
    await firstBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  // Delete any remaining droids beyond the first batch
  await deleteDocsChunked(uid, 'droids', droidIdsToClear.slice(350));
}

export async function resetCloudRun(uid: string, droidIdsToClear: string[]): Promise<void> {
  const firstBatch = writeBatch(db);
  firstBatch.update(doc(db, 'users', uid), {
    currentRebirth: 1,
    completedAllTiersInCycle: false,
    updatedAt: serverTimestamp(),
  });

  for (const id of droidIdsToClear.slice(0, 350)) {
    firstBatch.delete(doc(db, 'users', uid, 'droids', sanitizeDocId(id, 'droid')));
  }

  try {
    await firstBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  await deleteDocsChunked(uid, 'droids', droidIdsToClear.slice(350));
}

export async function replaceAllCloudState(
  uid: string,
  displayName: string | null,
  nextState: AppState,
  existingIds: {
    droidIds: string[];
    historyIds: string[];
    customDroidNames: string[];
  }
): Promise<void> {
  const p = nextState.progress;
  const userRef = doc(db, 'users', uid);

  // Ensure user doc exists & update progress fields
  let exists = false;
  try {
    const snap = await getDoc(userRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }

  try {
    if (exists) {
      await updateDoc(userRef, {
        displayName: sanitizeDisplayName(displayName),
        srbRank: clampInt(p.srbRank, 0, MAX_SRB_RANK),
        activeCycle: clampInt(p.activeCycle, 1, MAX_CYCLE),
        activePath: normalizePathNumber(p.activePath, p.activeCycle),
        currentRebirth: clampInt(p.currentRebirth, MIN_REBIRTH, MAX_REBIRTH),
        completedAllTiersInCycle: Boolean(p.completedAllTiersInCycle),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, {
        ownerId: uid,
        displayName: sanitizeDisplayName(displayName),
        srbRank: clampInt(p.srbRank, 0, MAX_SRB_RANK),
        activeCycle: clampInt(p.activeCycle, 1, MAX_CYCLE),
        activePath: normalizePathNumber(p.activePath, p.activeCycle),
        currentRebirth: clampInt(p.currentRebirth, MIN_REBIRTH, MAX_REBIRTH),
        completedAllTiersInCycle: Boolean(p.completedAllTiersInCycle),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  // Clear old subcollections
  await deleteDocsChunked(uid, 'droids', existingIds.droidIds);
  await deleteDocsChunked(uid, 'srbHistory', existingIds.historyIds);
  await deleteDocsChunked(
    uid,
    'customDroids',
    existingIds.customDroidNames.map((n) => sanitizeDocId(`custom-${n.toLowerCase()}`, 'custom'))
  );

  // Write new subcollections
  await writeSubcollectionsChunked(uid, p.inventory, p.srbHistory, nextState.customDroids);
}

async function deleteDocsChunked(
  uid: string,
  subcollection: 'droids' | 'srbHistory' | 'customDroids',
  docIds: string[]
): Promise<void> {
  if (docIds.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docIds.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const id of docIds.slice(i, i + CHUNK_SIZE)) {
      batch.delete(doc(db, 'users', uid, subcollection, sanitizeDocId(id, 'doc')));
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}/${subcollection}`);
    }
  }
}
