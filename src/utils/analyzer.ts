import {
  AnalyzedOwnedDroid,
  DroidRarity,
  DroidRequirement,
  DroidType,
  InventoryStatus,
  OwnedDroid,
  RebirthTier,
} from '../types';
import {
  findCatalogDroid,
  getNextRarity,
  isScourgeRarity,
  normalizeDroidNameKey,
  RARITY_DEFINITIONS,
} from '../data/defaultData';

export function standardRarityIndex(rarity: DroidRarity): number {
  return RARITY_DEFINITIONS[rarity]?.fusionOrder ?? -1;
}

export interface RequirementSatisfaction {
  satisfied: boolean;
  exactMatch: boolean;
  satisfiedByRarity: DroidRarity | null;
}

/**
 * In Star Wars Droid Tycoon:
 * - Owning a standard droid at the required rarity OR HIGHER
 *   (Base -> Gold -> Diamond -> Rainbow -> Beskar -> Galactic -> Stellar -> Kyber)
 *   satisfies that rebirth requirement.
 * - Scourge Droids live in a separate rarity area and count for all variant types for rebirth requirements.
 */
export function checkRequirementSatisfied(
  requirement: DroidRequirement,
  inventory: OwnedDroid[]
): RequirementSatisfaction {
  const targetName = normalizeDroidNameKey(requirement.droidName);
  const isReqScourge = isScourgeRarity(requirement.rarity);
  const minStandardIdx = standardRarityIndex(requirement.rarity);

  let exactMatch = false;
  let hasWildcardScourge = false;
  let bestStandardIdx = -1;
  let bestStandardRarity: DroidRarity | null = null;

  for (const item of inventory) {
    if (item.quantity <= 0) continue;
    if (normalizeDroidNameKey(item.name) !== targetName) continue;

    if (RARITY_DEFINITIONS[item.rarity]?.countsForAllRebirthVariants) {
      hasWildcardScourge = true;
      if (isReqScourge) exactMatch = true;
      continue;
    }

    if (isReqScourge) continue;

    const ownedIdx = standardRarityIndex(item.rarity);
    if (ownedIdx === minStandardIdx) {
      exactMatch = true;
    }
    if (ownedIdx >= minStandardIdx && (bestStandardIdx === -1 || ownedIdx < bestStandardIdx)) {
      bestStandardIdx = ownedIdx;
      bestStandardRarity = item.rarity;
    }
  }

  if (bestStandardIdx !== -1) {
    return {
      satisfied: true,
      exactMatch,
      satisfiedByRarity: bestStandardRarity,
    };
  }

  if (hasWildcardScourge) {
    return {
      satisfied: true,
      exactMatch: isReqScourge,
      satisfiedByRarity: DroidRarity.Scourge,
    };
  }

  return {
    satisfied: false,
    exactMatch: false,
    satisfiedByRarity: null,
  };
}

/**
 * Analyzes every droid in the user's owned inventory against all upcoming
 * rebirth tiers (>= currentRebirth) in the active cycle.
 *
 * Tagging rules:
 * - Standard progression (Base -> Gold -> Diamond -> Rainbow -> Beskar -> Galactic -> Stellar -> Kyber):
 *   - 'fuse': Quantity >= 3 and rarity has a next fusion tier (Base through Stellar -> Kyber).
 *   - 'needed': Required directly for remaining rebirth tiers, or held as fusion fodder.
 *   - 'sell': Unused in remaining tiers or already covered by a higher standard rarity / Scourge variant.
 * - Scourge Droids (separate rarity area):
 *   - Never fuse up; counts for all variant types on upcoming rebirth requirements.
 */
export function analyzeInventory(
  inventory: OwnedDroid[],
  currentRebirth: number,
  completedAllTiersInCycle: boolean,
  tiers: RebirthTier[]
): AnalyzedOwnedDroid[] {
  const remainingTiers = completedAllTiersInCycle
    ? []
    : tiers.filter((t) => t.tier >= currentRebirth);

  const futureNeedsByName = new Map<string, Array<{ tier: number; rarity: DroidRarity }>>();
  for (const tier of remainingTiers) {
    for (const r of tier.requirements) {
      const key = normalizeDroidNameKey(r.droidName);
      const list = futureNeedsByName.get(key) ?? [];
      list.push({ tier: tier.tier, rarity: r.rarity });
      futureNeedsByName.set(key, list);
    }
  }

  const highestStandardIdxByName = new Map<string, number>();
  const hasScourgeByName = new Map<string, boolean>();
  for (const item of inventory) {
    if (item.quantity <= 0) continue;
    const key = normalizeDroidNameKey(item.name);
    if (isScourgeRarity(item.rarity)) {
      hasScourgeByName.set(key, true);
      continue;
    }
    const idx = standardRarityIndex(item.rarity);
    const prev = highestStandardIdxByName.get(key) ?? -1;
    if (idx > prev) highestStandardIdxByName.set(key, idx);
  }

  return inventory.map((droid) => {
    const key = normalizeDroidNameKey(droid.name);
    const needs = futureNeedsByName.get(key) ?? [];

    // Separate rarity lane: Scourge Droids
    if (isScourgeRarity(droid.rarity)) {
      const allUpcomingTiers = Array.from(new Set(needs.map((n) => n.tier))).sort((a, b) => a - b);
      if (allUpcomingTiers.length > 0) {
        const tierList = formatTierList(allUpcomingTiers);
        return {
          droid,
          primaryStatus: 'needed',
          matchedStatuses: ['needed'],
          neededForTiers: allUpcomingTiers,
          fusionTargetRarity: null,
          fusionTargetTiers: [],
          canFuse: false,
          reason: `Scourge variant — counts for all rarities on ${tierList}`,
        };
      }
      return {
        droid,
        primaryStatus: 'sell',
        matchedStatuses: ['sell'],
        neededForTiers: [],
        fusionTargetRarity: null,
        fusionTargetTiers: [],
        canFuse: false,
        reason: completedAllTiersInCycle
          ? 'Scourge variant · Cycle complete (keep for Hive Mind or sell)'
          : `Scourge variant · Unused in RB ${currentRebirth}–40 (keep for Hive Mind or sell)`,
      };
    }

    // Standard rarity progression: Base -> ... -> Stellar -> Kyber
    const myRarityIdx = standardRarityIndex(droid.rarity);
    const nextRarity = getNextRarity(droid.rarity);
    const nextRarityIdx = nextRarity ? standardRarityIndex(nextRarity) : -1;
    const highestStandard = highestStandardIdxByName.get(key) ?? myRarityIdx;
    const coveredByScourge = Boolean(hasScourgeByName.get(key));

    const standardNeeds = needs.filter((n) => !isScourgeRarity(n.rarity));

    const directNeededTiers = coveredByScourge
      ? []
      : Array.from(
          new Set(
            standardNeeds
              .filter((n) => {
                const reqIdx = standardRarityIndex(n.rarity);
                if (reqIdx > myRarityIdx) return false;
                if (highestStandard > myRarityIdx) return false;
                return true;
              })
              .map((n) => n.tier)
          )
        ).sort((a, b) => a - b);

    const higherFutureTiers = coveredByScourge
      ? []
      : Array.from(
          new Set(
            standardNeeds
              .filter((n) => standardRarityIndex(n.rarity) > myRarityIdx)
              .map((n) => n.tier)
          )
        ).sort((a, b) => a - b);

    const exactNextFusionTiers =
      nextRarity && !coveredByScourge
        ? Array.from(
            new Set(
              standardNeeds
                .filter((n) => standardRarityIndex(n.rarity) >= nextRarityIdx)
                .map((n) => n.tier)
            )
          ).sort((a, b) => a - b)
        : [];

    const maxStandardNeedIdx = Math.max(
      ...standardNeeds.map((n) => standardRarityIndex(n.rarity)),
      -1
    );

    const canFuse = droid.quantity >= 3 && nextRarity !== null;
    const isDirectlyNeeded = directNeededTiers.length > 0;
    const isNeededForFutureFusion =
      !coveredByScourge && higherFutureTiers.length > 0 && highestStandard < maxStandardNeedIdx;

    const matchedStatuses: InventoryStatus[] = [];
    let primaryStatus: InventoryStatus = 'sell';
    let reason = 'Not required for any remaining rebirth tier in this cycle';

    if (canFuse) {
      primaryStatus = 'fuse';
      matchedStatuses.push('fuse');
      if (isDirectlyNeeded || isNeededForFutureFusion) {
        matchedStatuses.push('needed');
      }

      if (exactNextFusionTiers.length > 0) {
        const tierList = formatTierList(exactNextFusionTiers);
        reason = `Fuse 3 into ${nextRarity} — needed for ${tierList}`;
      } else if (isDirectlyNeeded) {
        const tierList = formatTierList(directNeededTiers);
        reason = `Ready to fuse 3 into ${nextRarity} (also satisfies ${tierList})`;
      } else {
        reason = `3+ copies owned — ready to fuse into ${nextRarity}`;
      }
    } else if (isDirectlyNeeded) {
      primaryStatus = 'needed';
      matchedStatuses.push('needed');
      const tierList = formatTierList(directNeededTiers);
      reason = `Required for ${tierList}`;
    } else if (isNeededForFutureFusion) {
      primaryStatus = 'needed';
      matchedStatuses.push('needed');
      const tierList = formatTierList(higherFutureTiers);
      const neededMore = 3 - droid.quantity;
      reason = `Hold to fuse toward ${tierList} (need ${neededMore} more)`;
    } else {
      primaryStatus = 'sell';
      matchedStatuses.push('sell');
      if (coveredByScourge && standardNeeds.length > 0) {
        reason = 'Covered by owned Scourge variant — safe to sell';
      } else if (
        highestStandard > myRarityIdx &&
        standardNeeds.some((n) => standardRarityIndex(n.rarity) <= myRarityIdx)
      ) {
        reason = 'Covered by higher-rarity copy — safe to sell';
      } else {
        reason = completedAllTiersInCycle
          ? 'All tiers complete in cycle — safe to sell'
          : `Unused in RB ${currentRebirth}–40 — safe to sell`;
      }
    }

    return {
      droid,
      primaryStatus,
      matchedStatuses,
      neededForTiers: directNeededTiers.length > 0 ? directNeededTiers : higherFutureTiers,
      fusionTargetRarity: nextRarity,
      fusionTargetTiers: exactNextFusionTiers,
      canFuse,
      reason,
    };
  });
}

function formatTierList(tiers: number[]): string {
  if (tiers.length === 0) return '';
  if (tiers.length <= 3) return tiers.map((t) => `RB ${t}`).join(', ');
  return `${tiers
    .slice(0, 2)
    .map((t) => `RB ${t}`)
    .join(', ')} +${tiers.length - 2} more`;
}

export interface InventoryFilterOptions {
  query: string;
  status: 'all' | InventoryStatus;
  type: 'all' | DroidType;
  rarity: 'all' | DroidRarity;
}

const STATUS_SEARCH_ALIASES: Record<InventoryStatus, string[]> = {
  needed: ['needed', 'need', 'keep', 'hold', 'required'],
  fuse: ['fuse', 'fusion', 'upgrade', 'ready to fuse', 'fuse up'],
  sell: ['sell', 'safe', 'safe to sell', 'scrap', 'unused'],
};

/**
 * Filters analyzed inventory items by search query (matches droid name, type,
 * rarity/category, status label/alias, or tier reason) and explicit filters.
 */
export function filterAnalyzedInventory(
  items: AnalyzedOwnedDroid[],
  filters: InventoryFilterOptions
): AnalyzedOwnedDroid[] {
  const q = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.status !== 'all') {
      if (!item.matchedStatuses.includes(filters.status)) {
        return false;
      }
    }

    if (filters.type !== 'all' && item.droid.type !== filters.type) {
      return false;
    }

    if (filters.rarity !== 'all' && item.droid.rarity !== filters.rarity) {
      return false;
    }

    if (q) {
      const rarityDef = RARITY_DEFINITIONS[item.droid.rarity];
      const catalogMeta = findCatalogDroid(item.droid.name);
      const nameMatch = item.droid.name.toLowerCase().includes(q);
      const typeMatch = item.droid.type.toLowerCase().includes(q);
      const tierMatch = Boolean(catalogMeta?.tier?.toLowerCase().includes(q));
      const fusionTagMatch = Boolean(catalogMeta?.isFusion && 'fusion'.includes(q));
      const rarityMatch =
        item.droid.rarity.toLowerCase().includes(q) ||
        rarityDef.category.toLowerCase().includes(q);
      const reasonMatch = item.reason.toLowerCase().includes(q);
      const statusMatch = item.matchedStatuses.some((st) =>
        STATUS_SEARCH_ALIASES[st].some((alias) => alias.includes(q) || q.includes(alias))
      );

      if (
        !nameMatch &&
        !typeMatch &&
        !tierMatch &&
        !fusionTagMatch &&
        !rarityMatch &&
        !statusMatch &&
        !reasonMatch
      ) {
        return false;
      }
    }

    return true;
  });
}

export function getTierReadiness(tier: RebirthTier, inventory: OwnedDroid[]) {
  const total = tier.requirements.length;
  let met = 0;
  const details = tier.requirements.map((req) => {
    const check = checkRequirementSatisfied(req, inventory);
    if (check.satisfied) met++;
    return { req, ...check };
  });
  return {
    total,
    met,
    isReady: total === 0 || met === total,
    details,
  };
}
