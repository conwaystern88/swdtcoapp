export enum DroidRarity {
  Base = 'Base',
  Gold = 'Gold',
  Diamond = 'Diamond',
  Rainbow = 'Rainbow',
  Beskar = 'Beskar',
  Galactic = 'Galactic',
  Stellar = 'Stellar',
  Kyber = 'Kyber',
  Scourge = 'Scourge',
}

export type Rarity = DroidRarity;

export type RarityCategory = 'standard' | 'scourge';

export interface RarityDefinition {
  rarity: DroidRarity;
  label: string;
  category: RarityCategory;
  fusionOrder: number | null;
  nextRarity: DroidRarity | null;
  countsForAllRebirthVariants: boolean;
  textColorClass: string;
  rowGlowClass: string;
  textGlowClass: string;
}

export const STANDARD_RARITIES: DroidRarity[] = [
  DroidRarity.Base,
  DroidRarity.Gold,
  DroidRarity.Diamond,
  DroidRarity.Rainbow,
  DroidRarity.Beskar,
  DroidRarity.Galactic,
  DroidRarity.Stellar,
  DroidRarity.Kyber,
];

export const SPECIAL_RARITIES: DroidRarity[] = [DroidRarity.Scourge];

export const RARITY_ORDER: DroidRarity[] = [...STANDARD_RARITIES, ...SPECIAL_RARITIES];

export type DroidType = 'Worker' | 'Astromech' | 'Battle' | 'Protocol';

export const DROID_TYPES: DroidType[] = ['Worker', 'Astromech', 'Battle', 'Protocol'];

export type DroidTier = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Iconic';

export const REBIRTH_PATHS = [1, 2, 3, 4, 5, 6] as const;
export type RebirthPathNumber = (typeof REBIRTH_PATHS)[number];

export type InventoryStatus = 'needed' | 'fuse' | 'sell';

export interface DroidCatalogItem {
  name: string;
  type: DroidType;
  tier?: DroidTier;
  isFusion?: boolean;
  availableRarities?: DroidRarity[];
}

export interface DroidRequirement {
  id: string;
  droidName: string;
  rarity: DroidRarity;
  droidType: DroidType;
}

export interface RebirthTier {
  tier: number; // 1 to 40
  creditCost: number; // Raw numeric credits
  novaReward: number; // Kept for schema compatibility
  srbNovaPayout: number; // Kept for schema compatibility
  unlockLabel: string;
  requirements: DroidRequirement[];
}

export interface CycleTable {
  cycle: number;
  label: string;
  tiers: RebirthTier[];
}

export interface OwnedDroid {
  id: string;
  name: string;
  type: DroidType;
  rarity: DroidRarity;
  quantity: number;
  addedAt: string;
}

export interface SuperRebirthHistoryEntry {
  id: string;
  timestamp: string;
  fromCycle: number;
  toCycle: number;
  fromPath?: number;
  toPath?: number;
  atRebirthTier: number;
  novaEarned?: number;
  creditMultiplierGain?: number;
  xpMultiplierGain?: number;
}

export interface UserProgress {
  srbRank: number;
  activeCycle: number;
  activePath: RebirthPathNumber; // Path 1..6 sequential loop
  currentRebirth: number; // Current target tier (1..40), meaning tiers < currentRebirth are completed
  completedAllTiersInCycle: boolean;
  novaCrystals: number; // Preserved in storage for backup compatibility
  permanentCreditMultiplier: number; // Preserved in storage for backup compatibility
  permanentXpMultiplier: number; // Preserved in storage for backup compatibility
  inventory: OwnedDroid[];
  srbHistory: SuperRebirthHistoryEntry[];
}

export interface AppState {
  schemaVersion: number;
  updatedAt: string;
  progress: UserProgress;
  cycles: Record<number, CycleTable>;
  customDroids: DroidCatalogItem[];
}

export interface AnalyzedOwnedDroid {
  droid: OwnedDroid;
  primaryStatus: InventoryStatus;
  matchedStatuses: InventoryStatus[];
  neededForTiers: number[];
  fusionTargetRarity: DroidRarity | null;
  fusionTargetTiers: number[];
  canFuse: boolean;
  reason: string;
}

export type ActiveView = 'workspace' | 'roadmap' | 'inventory' | 'intel';
