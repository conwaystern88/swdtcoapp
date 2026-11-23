import {
  AppState,
  CycleTable,
  DroidCatalogItem,
  DroidRarity,
  DroidRequirement,
  DroidTier,
  DroidType,
  OwnedDroid,
  RARITY_ORDER,
  RarityDefinition,
  RebirthPathNumber,
  RebirthTier,
  STANDARD_RARITIES,
} from '../types';

export const SCHEMA_VERSION = 1;

export const RARITY_DEFINITIONS: Record<DroidRarity, RarityDefinition> = {
  [DroidRarity.Base]: {
    rarity: DroidRarity.Base,
    label: 'Base',
    category: 'standard',
    fusionOrder: 0,
    nextRarity: DroidRarity.Gold,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#4ADE80]',
    rowGlowClass: 'rarity-row-base',
    textGlowClass: 'rarity-text-base',
  },
  [DroidRarity.Gold]: {
    rarity: DroidRarity.Gold,
    label: 'Gold',
    category: 'standard',
    fusionOrder: 1,
    nextRarity: DroidRarity.Diamond,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#FBBF24]',
    rowGlowClass: 'rarity-row-gold',
    textGlowClass: 'rarity-text-gold',
  },
  [DroidRarity.Diamond]: {
    rarity: DroidRarity.Diamond,
    label: 'Diamond',
    category: 'standard',
    fusionOrder: 2,
    nextRarity: DroidRarity.Rainbow,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#60A5FA]',
    rowGlowClass: 'rarity-row-diamond',
    textGlowClass: 'rarity-text-diamond',
  },
  [DroidRarity.Rainbow]: {
    rarity: DroidRarity.Rainbow,
    label: 'Rainbow',
    category: 'standard',
    fusionOrder: 3,
    nextRarity: DroidRarity.Beskar,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#F0ABFC]',
    rowGlowClass: 'rarity-row-rainbow',
    textGlowClass: 'rarity-text-rainbow',
  },
  [DroidRarity.Beskar]: {
    rarity: DroidRarity.Beskar,
    label: 'Beskar',
    category: 'standard',
    fusionOrder: 4,
    nextRarity: DroidRarity.Galactic,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#CBD5E1]',
    rowGlowClass: 'rarity-row-beskar',
    textGlowClass: 'rarity-text-beskar',
  },
  [DroidRarity.Galactic]: {
    rarity: DroidRarity.Galactic,
    label: 'Galactic',
    category: 'standard',
    fusionOrder: 5,
    nextRarity: DroidRarity.Stellar,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#C084FC]',
    rowGlowClass: 'rarity-row-galactic',
    textGlowClass: 'rarity-text-galactic',
  },
  [DroidRarity.Stellar]: {
    rarity: DroidRarity.Stellar,
    label: 'Stellar',
    category: 'standard',
    fusionOrder: 6,
    nextRarity: DroidRarity.Kyber,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#22D3EE]',
    rowGlowClass: 'rarity-row-stellar',
    textGlowClass: 'rarity-text-stellar',
  },
  [DroidRarity.Kyber]: {
    rarity: DroidRarity.Kyber,
    label: 'Kyber',
    category: 'standard',
    fusionOrder: 7,
    nextRarity: null,
    countsForAllRebirthVariants: false,
    textColorClass: 'text-[#FDE047]',
    rowGlowClass: 'rarity-row-kyber',
    textGlowClass: 'rarity-text-kyber',
  },
  [DroidRarity.Scourge]: {
    rarity: DroidRarity.Scourge,
    label: 'Scourge',
    category: 'scourge',
    fusionOrder: null,
    nextRarity: null,
    countsForAllRebirthVariants: true,
    textColorClass: 'text-[#F87171]',
    rowGlowClass: 'rarity-row-scourge',
    textGlowClass: 'rarity-text-scourge',
  },
};

/**
 * Complete 101-droid Star Wars Droid Tycoon roster synced with droidtycoonhelper.com/droids/
 * covering Worker (37), Astromech (30), Battle (28), and Protocol (6) classes,
 * including Common, Rare, Epic, Legendary, Mythic, Fusion-exclusive, and Iconic droids.
 */
const RAW_DROID_CATALOG: Array<{
  name: string;
  type: DroidType;
  tier: DroidTier;
  isFusion?: boolean;
}> = [
  // Worker Droids (37)
  { name: 'Gonk', type: 'Worker', tier: 'Common' },
  { name: 'Mouse', type: 'Worker', tier: 'Common' },
  { name: 'Pit', type: 'Worker', tier: 'Common' },
  { name: 'ARG', type: 'Worker', tier: 'Rare' },
  { name: 'B-U4D', type: 'Worker', tier: 'Rare' },
  { name: 'Bal-Core', type: 'Worker', tier: 'Rare' },
  { name: 'BDX Explorer', type: 'Worker', tier: 'Rare' },
  { name: 'EG-58', type: 'Worker', tier: 'Rare' },
  { name: 'ROLL-R', type: 'Worker', tier: 'Rare' },
  { name: 'Senate Hovercam', type: 'Worker', tier: 'Rare' },
  { name: 'WHL-EX', type: 'Worker', tier: 'Rare', isFusion: true },
  { name: 'AMP Walker', type: 'Worker', tier: 'Epic' },
  { name: 'EGL', type: 'Worker', tier: 'Epic' },
  { name: 'Groundmech', type: 'Worker', tier: 'Epic' },
  { name: 'Gunrunner', type: 'Worker', tier: 'Epic' },
  { name: 'KT', type: 'Worker', tier: 'Epic' },
  { name: 'LO', type: 'Worker', tier: 'Epic' },
  { name: 'N-UL', type: 'Worker', tier: 'Epic', isFusion: true },
  { name: 'Opti-Pod', type: 'Worker', tier: 'Epic' },
  { name: 'SEN-TRI', type: 'Worker', tier: 'Epic' },
  { name: 'FUS-3', type: 'Worker', tier: 'Legendary', isFusion: true },
  { name: 'JO9-4MN', type: 'Worker', tier: 'Legendary' },
  { name: 'Mecha-Droid', type: 'Worker', tier: 'Legendary' },
  { name: 'Mono-WLKR', type: 'Worker', tier: 'Legendary' },
  { name: 'PLNK', type: 'Worker', tier: 'Legendary' },
  { name: 'Proto-Roller', type: 'Worker', tier: 'Legendary' },
  { name: 'RO-TOR', type: 'Worker', tier: 'Legendary', isFusion: true },
  { name: 'LEP', type: 'Worker', tier: 'Mythic' },
  { name: 'Loadlifter', type: 'Worker', tier: 'Mythic' },
  { name: 'LOW-MO', type: 'Worker', tier: 'Mythic', isFusion: true },
  { name: 'LUG-G', type: 'Worker', tier: 'Mythic', isFusion: true },
  { name: 'RIC', type: 'Worker', tier: 'Mythic' },
  { name: 'RIC-1200', type: 'Worker', tier: 'Mythic' },
  { name: 'RIV-3T', type: 'Worker', tier: 'Mythic', isFusion: true },
  { name: 'Snow Mouse', type: 'Worker', tier: 'Mythic' },
  { name: 'D-O', type: 'Worker', tier: 'Iconic' },
  { name: 'DJ R-3X', type: 'Worker', tier: 'Iconic' },

  // Astromech Droids (30)
  { name: 'CB', type: 'Astromech', tier: 'Common' },
  { name: 'R3', type: 'Astromech', tier: 'Common' },
  { name: 'R5', type: 'Astromech', tier: 'Common' },
  { name: 'R8', type: 'Astromech', tier: 'Common' },
  { name: '2BB', type: 'Astromech', tier: 'Rare' },
  { name: 'A-LT', type: 'Astromech', tier: 'Rare' },
  { name: 'R4', type: 'Astromech', tier: 'Rare' },
  { name: 'R9', type: 'Astromech', tier: 'Rare' },
  { name: 'ZRO-TEC', type: 'Astromech', tier: 'Rare', isFusion: true },
  { name: 'BB', type: 'Astromech', tier: 'Epic' },
  { name: 'MPH', type: 'Astromech', tier: 'Epic' },
  { name: 'ORB-Walker', type: 'Astromech', tier: 'Epic' },
  { name: 'R2', type: 'Astromech', tier: 'Epic' },
  { name: 'R6', type: 'Astromech', tier: 'Epic' },
  { name: 'SCRP-R', type: 'Astromech', tier: 'Epic', isFusion: true },
  { name: 'TRAK-R', type: 'Astromech', tier: 'Epic' },
  { name: 'Util-Tec (Ulti-Tech)', type: 'Astromech', tier: 'Epic' },
  { name: 'BB9', type: 'Astromech', tier: 'Legendary' },
  { name: 'QIK-BIT', type: 'Astromech', tier: 'Legendary', isFusion: true },
  { name: 'R7', type: 'Astromech', tier: 'Legendary' },
  { name: 'AXI-POD', type: 'Astromech', tier: 'Mythic', isFusion: true },
  { name: 'CYCLENS', type: 'Astromech', tier: 'Mythic' },
  { name: 'DRFT-R', type: 'Astromech', tier: 'Mythic' },
  { name: 'ECG', type: 'Astromech', tier: 'Mythic' },
  { name: 'MO-TRAK', type: 'Astromech', tier: 'Mythic' },
  { name: 'TRI-TEK', type: 'Astromech', tier: 'Mythic' },
  { name: 'BB-8', type: 'Astromech', tier: 'Iconic' },
  { name: 'CB-23', type: 'Astromech', tier: 'Iconic' },
  { name: 'Chopper', type: 'Astromech', tier: 'Iconic' },
  { name: 'R2-D2', type: 'Astromech', tier: 'Iconic' },

  // Battle Droids (28)
  { name: 'B1 Battle', type: 'Battle', tier: 'Common' },
  { name: 'DRK-1 Probe', type: 'Battle', tier: 'Common' },
  { name: 'ID10', type: 'Battle', tier: 'Common' },
  { name: 'Imperial Probe', type: 'Battle', tier: 'Common' },
  { name: 'B1 Security', type: 'Battle', tier: 'Rare' },
  { name: 'BTL-R', type: 'Battle', tier: 'Rare', isFusion: true },
  { name: 'HOV-R', type: 'Battle', tier: 'Rare' },
  { name: 'NAV-EX', type: 'Battle', tier: 'Rare' },
  { name: 'VECT-Arm', type: 'Battle', tier: 'Rare' },
  { name: 'ARM-CORE', type: 'Battle', tier: 'Epic', isFusion: true },
  { name: 'B1 Heavy', type: 'Battle', tier: 'Epic' },
  { name: 'B2 Heavy', type: 'Battle', tier: 'Epic' },
  { name: 'B2 Super', type: 'Battle', tier: 'Epic' },
  { name: 'Haul-R', type: 'Battle', tier: 'Epic' },
  { name: 'LNG-Shot', type: 'Battle', tier: 'Epic' },
  { name: 'OPT-AR', type: 'Battle', tier: 'Epic', isFusion: true },
  { name: 'Strike-Orb', type: 'Battle', tier: 'Epic' },
  { name: 'B2-RP', type: 'Battle', tier: 'Legendary' },
  { name: 'Cyclo-Grav', type: 'Battle', tier: 'Legendary' },
  { name: 'Opti-STRK', type: 'Battle', tier: 'Legendary' },
  { name: 'ORB-XL', type: 'Battle', tier: 'Legendary', isFusion: true },
  { name: 'IG', type: 'Battle', tier: 'Mythic' },
  { name: 'KX', type: 'Battle', tier: 'Mythic' },
  { name: 'SRV-O', type: 'Battle', tier: 'Mythic', isFusion: true },
  { name: 'X-ONK', type: 'Battle', tier: 'Mythic', isFusion: true },
  { name: 'IG-11 Marshal', type: 'Battle', tier: 'Iconic' },
  { name: 'Mister Bones', type: 'Battle', tier: 'Iconic' },
  { name: 'WG-22', type: 'Battle', tier: 'Iconic' },

  // Protocol Droids (6)
  { name: 'SA-5', type: 'Protocol', tier: 'Rare' },
  { name: 'LOM', type: 'Protocol', tier: 'Epic' },
  { name: 'PZ', type: 'Protocol', tier: 'Legendary' },
  { name: 'TDA', type: 'Protocol', tier: 'Mythic' },
  { name: 'C-3PO', type: 'Protocol', tier: 'Iconic' },
  { name: 'Scourge Prime', type: 'Protocol', tier: 'Iconic' },
];

export const DEFAULT_DROID_CATALOG: DroidCatalogItem[] = RAW_DROID_CATALOG.map((item) => ({
  ...item,
  availableRarities: [...RARITY_ORDER],
}));

const DROID_NAME_ALIASES: Record<string, string> = {
  'util-tec': 'util-tec (ulti-tech)',
  'ulti-tech': 'util-tec (ulti-tech)',
  'dj-r3x': 'dj r-3x',
  'x-onx': 'x-onk',
  'axl-pod': 'axi-pod',
};

export function normalizeDroidNameKey(name: string): string {
  const key = name.trim().toLowerCase();
  return DROID_NAME_ALIASES[key] ?? key;
}

const DEFAULT_CATALOG_BY_KEY: Record<string, DroidCatalogItem> = Object.fromEntries(
  DEFAULT_DROID_CATALOG.map((d) => [normalizeDroidNameKey(d.name), d])
);

export function findCatalogDroid(
  name: string,
  customDroids: DroidCatalogItem[] = []
): DroidCatalogItem | undefined {
  const key = normalizeDroidNameKey(name);
  const defaultMatch = DEFAULT_CATALOG_BY_KEY[key];
  if (defaultMatch) return defaultMatch;
  return customDroids.find((d) => normalizeDroidNameKey(d.name) === key);
}

export function inferDroidType(name: string, customDroids: DroidCatalogItem[] = []): DroidType {
  return findCatalogDroid(name, customDroids)?.type ?? 'Worker';
}

function req(tier: number, idx: number, droidName: string, rarity: DroidRarity): DroidRequirement {
  return {
    id: `c1-t${tier}-r${idx}`,
    droidName,
    rarity,
    droidType: inferDroidType(droidName),
  };
}

export function getNextPath(currentPath: RebirthPathNumber): RebirthPathNumber {
  return (currentPath >= 6 ? 1 : currentPath + 1) as RebirthPathNumber;
}

export function normalizePathNumber(value: unknown, fallbackCycle = 1): RebirthPathNumber {
  const num = Math.floor(Number(value));
  if (num >= 1 && num <= 6) return num as RebirthPathNumber;
  return ((((Math.max(1, fallbackCycle) - 1) % 6) + 1) as RebirthPathNumber);
}

function getSlotUnlockLabel(tier: number): string {
  if (tier === 12) return 'Worker Slot · SRB Unlock';
  if (tier === 20) return 'Astromech Slot · Midgame Milestone';
  if (tier === 30) return 'Battle Slot · High Command';
  if (tier === 40) return 'Max Tier Milestone';
  const mod = tier % 3;
  if (mod === 1) return 'Worker Slot';
  if (mod === 2) return 'Astromech Slot';
  return 'Battle Slot';
}

/**
 * Pre-populated Cycle 1 (Path 1):
 * - Tiers 1 through 23 contain specific Star Wars Droid Tycoon Credit costs
 *   and Droid + Rarity requirements.
 * - Tiers 24 through 40 extend the full 1-40 Roadmap through Beskar, Galactic,
 *   Stellar, and Kyber tiers.
 */
export function buildCycle1Table(): CycleTable {
  const tiers: RebirthTier[] = [
    {
      tier: 1,
      creditCost: 10_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(1, 1, 'CB', DroidRarity.Base),
        req(1, 2, 'Pit', DroidRarity.Base),
        req(1, 3, 'DRK-1 Probe', DroidRarity.Base),
      ],
    },
    {
      tier: 2,
      creditCost: 150_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(2, 1, 'BDX Explorer', DroidRarity.Base),
        req(2, 2, '2BB', DroidRarity.Base),
        req(2, 3, 'Bal-Core', DroidRarity.Base),
      ],
    },
    {
      tier: 3,
      creditCost: 975_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot · Fusion Unlock',
      requirements: [
        req(3, 1, 'A-LT', DroidRarity.Base),
        req(3, 2, 'B-U4D', DroidRarity.Base),
        req(3, 3, 'R9', DroidRarity.Gold),
      ],
    },
    {
      tier: 4,
      creditCost: 2_950_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(4, 1, 'ARG', DroidRarity.Gold),
        req(4, 2, 'B1 Security', DroidRarity.Gold),
        req(4, 3, 'Groundmech', DroidRarity.Base),
      ],
    },
    {
      tier: 5,
      creditCost: 5_350_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(5, 1, 'B-U4D', DroidRarity.Gold),
        req(5, 2, 'HOV-R', DroidRarity.Gold),
        req(5, 3, 'R9', DroidRarity.Diamond),
      ],
    },
    {
      tier: 6,
      creditCost: 9_850_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot',
      requirements: [
        req(6, 1, 'A-LT', DroidRarity.Diamond),
        req(6, 2, 'ARG', DroidRarity.Diamond),
        req(6, 3, 'Groundmech', DroidRarity.Gold),
      ],
    },
    {
      tier: 7,
      creditCost: 14_500_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(7, 1, 'B-U4D', DroidRarity.Diamond),
        req(7, 2, 'B1 Security', DroidRarity.Diamond),
        req(7, 3, 'BB', DroidRarity.Gold),
      ],
    },
    {
      tier: 8,
      creditCost: 36_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(8, 1, 'HOV-R', DroidRarity.Diamond),
        req(8, 2, 'LO', DroidRarity.Gold),
        req(8, 3, 'Util-Tec (Ulti-Tech)', DroidRarity.Gold),
      ],
    },
    {
      tier: 9,
      creditCost: 89_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot',
      requirements: [
        req(9, 1, 'TRAK-R', DroidRarity.Gold),
        req(9, 2, 'R6', DroidRarity.Gold),
        req(9, 3, 'Groundmech', DroidRarity.Rainbow),
      ],
    },
    {
      tier: 10,
      creditCost: 220_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(10, 1, 'LO', DroidRarity.Rainbow),
        req(10, 2, 'Haul-R', DroidRarity.Rainbow),
        req(10, 3, 'Strike-Orb', DroidRarity.Gold),
      ],
    },
    {
      tier: 11,
      creditCost: 550_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(11, 1, 'AMP Walker', DroidRarity.Rainbow),
        req(11, 2, 'B1 Heavy', DroidRarity.Rainbow),
        req(11, 3, 'BB9', DroidRarity.Base),
      ],
    },
    {
      tier: 12,
      creditCost: 1_360_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot · SRB Unlock',
      requirements: [
        req(12, 1, 'Proto-Roller', DroidRarity.Gold),
        req(12, 2, 'Mecha-Droid', DroidRarity.Base),
        req(12, 3, 'BB9', DroidRarity.Gold),
      ],
    },
    {
      tier: 13,
      creditCost: 3_400_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(13, 1, 'Opti-STRK', DroidRarity.Rainbow),
        req(13, 2, 'Mono-WLKR', DroidRarity.Rainbow),
        req(13, 3, 'Mecha-Droid', DroidRarity.Rainbow),
      ],
    },
    {
      tier: 14,
      creditCost: 8_450_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(14, 1, 'B2-RP', DroidRarity.Rainbow),
        req(14, 2, 'Cyclo-Grav', DroidRarity.Rainbow),
        req(14, 3, 'R7', DroidRarity.Rainbow),
      ],
    },
    {
      tier: 15,
      creditCost: 21_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot',
      requirements: [
        req(15, 1, 'B2-RP', DroidRarity.Gold),
        req(15, 2, 'BB9', DroidRarity.Gold),
        req(15, 3, 'R7', DroidRarity.Gold),
      ],
    },
    {
      tier: 16,
      creditCost: 52_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(16, 1, 'Proto-Roller', DroidRarity.Diamond),
        req(16, 2, 'Mecha-Droid', DroidRarity.Gold),
        req(16, 3, 'Mono-WLKR', DroidRarity.Diamond),
      ],
    },
    {
      tier: 17,
      creditCost: 130_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(17, 1, 'Mecha-Droid', DroidRarity.Diamond),
        req(17, 2, 'Mono-WLKR', DroidRarity.Diamond),
        req(17, 3, 'Opti-STRK', DroidRarity.Diamond),
      ],
    },
    {
      tier: 18,
      creditCost: 325_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot',
      requirements: [
        req(18, 1, 'Proto-Roller', DroidRarity.Diamond),
        req(18, 2, 'Mono-WLKR', DroidRarity.Rainbow),
        req(18, 3, 'MPH', DroidRarity.Rainbow),
      ],
    },
    {
      tier: 19,
      creditCost: 810_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(19, 1, 'Proto-Roller', DroidRarity.Rainbow),
        req(19, 2, 'Mecha-Droid', DroidRarity.Diamond),
        req(19, 3, 'Mono-WLKR', DroidRarity.Gold),
      ],
    },
    {
      tier: 20,
      creditCost: 2_000_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(20, 1, 'R7', DroidRarity.Rainbow),
        req(20, 2, 'Opti-STRK', DroidRarity.Rainbow),
        req(20, 3, 'Mecha-Droid', DroidRarity.Rainbow),
      ],
    },
    {
      tier: 21,
      creditCost: 3_000_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Battle Slot',
      requirements: [
        req(21, 1, 'AMP Walker', DroidRarity.Beskar),
        req(21, 2, 'Groundmech', DroidRarity.Beskar),
        req(21, 3, 'Haul-R', DroidRarity.Beskar),
      ],
    },
    {
      tier: 22,
      creditCost: 4_500_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Worker Slot',
      requirements: [
        req(22, 1, 'Gunrunner', DroidRarity.Beskar),
        req(22, 2, 'Strike-Orb', DroidRarity.Beskar),
        req(22, 3, 'B2-RP', DroidRarity.Beskar),
      ],
    },
    {
      tier: 23,
      creditCost: 6_000_000_000_000,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: 'Astromech Slot',
      requirements: [
        req(23, 1, 'R7', DroidRarity.Beskar),
        req(23, 2, 'Mono-WLKR', DroidRarity.Beskar),
        req(23, 3, 'Opti-STRK', DroidRarity.Beskar),
      ],
    },
  ];

  const lateTierPools: Array<{ droids: [string, string, string]; rarity: DroidRarity }> = [
    { droids: ['B2 Super', 'Opti-Pod', 'R2'], rarity: DroidRarity.Beskar },
    { droids: ['Proto-Roller', 'Mecha-Droid', 'Cyclo-Grav'], rarity: DroidRarity.Beskar },
    { droids: ['LNG-Shot', 'MPH', 'BB9'], rarity: DroidRarity.Beskar },
    { droids: ['WHL-EX', 'RIV-3T', 'X-ONK'], rarity: DroidRarity.Beskar },
    { droids: ['ZRO-TEC', 'N-UL', 'ORB-XL'], rarity: DroidRarity.Beskar },
    { droids: ['AMP Walker', 'B2-RP', 'Haul-R'], rarity: DroidRarity.Galactic },
    { droids: ['Gunrunner', 'Strike-Orb', 'R7'], rarity: DroidRarity.Galactic },
    { droids: ['Opti-STRK', 'Mono-WLKR', 'Mecha-Droid'], rarity: DroidRarity.Galactic },
    { droids: ['B2 Super', 'Cyclo-Grav', 'Proto-Roller'], rarity: DroidRarity.Galactic },
    { droids: ['LNG-Shot', 'Opti-Pod', 'MPH'], rarity: DroidRarity.Galactic },
    { droids: ['WHL-EX', 'RIV-3T', 'ZRO-TEC'], rarity: DroidRarity.Galactic },
    { droids: ['X-ONK', 'N-UL', 'ORB-XL'], rarity: DroidRarity.Galactic },
    { droids: ['Opti-STRK', 'Mono-WLKR', 'R7'], rarity: DroidRarity.Stellar },
    { droids: ['Mecha-Droid', 'B2 Super', 'Gunrunner'], rarity: DroidRarity.Stellar },
    { droids: ['WHL-EX', 'RIV-3T', 'X-ONK'], rarity: DroidRarity.Kyber },
    { droids: ['ZRO-TEC', 'N-UL', 'ORB-XL'], rarity: DroidRarity.Kyber },
    { droids: ['Mecha-Droid', 'ORB-XL', 'Opti-STRK'], rarity: DroidRarity.Kyber },
  ];

  let prevCost = 6_000_000_000_000;
  for (let t = 24; t <= 40; t++) {
    prevCost = Math.round(prevCost * 1.48);
    const pool = lateTierPools[t - 24];
    tiers.push({
      tier: t,
      creditCost: prevCost,
      novaReward: 0,
      srbNovaPayout: 0,
      unlockLabel: getSlotUnlockLabel(t),
      requirements: pool.droids.map((name, i) => req(t, i + 1, name, pool.rarity)),
    });
  }

  return {
    cycle: 1,
    label: 'Cycle 1',
    tiers,
  };
}

/**
 * Generates Cycle N (N >= 2) requirement table by scaling credit costs and
 * shifting early rarity floors upward within STANDARD_RARITIES (Base -> ... -> Kyber).
 */
export function buildScaledCycleTable(cycleNumber: number, baseCycle1?: CycleTable): CycleTable {
  const source = baseCycle1 ?? buildCycle1Table();
  const rarityShift = Math.min(2, Math.floor((cycleNumber - 1) / 2) + (cycleNumber >= 2 ? 1 : 0));
  const creditFactor = Math.pow(1.65, cycleNumber - 1);

  return {
    cycle: cycleNumber,
    label: `Cycle ${cycleNumber}`,
    tiers: source.tiers.map((t) => ({
      ...t,
      creditCost: Math.round(t.creditCost * creditFactor),
      requirements: t.requirements.map((r, idx) => {
        const currentIdx = STANDARD_RARITIES.indexOf(r.rarity);
        if (currentIdx === -1) {
          return { ...r, id: `c${cycleNumber}-t${t.tier}-r${idx + 1}` };
        }
        const shift = t.tier <= 12 ? Math.min(1, rarityShift) : t.tier <= 23 ? rarityShift - 1 : 0;
        const nextRarity =
          STANDARD_RARITIES[Math.min(STANDARD_RARITIES.length - 1, Math.max(0, currentIdx + shift))];
        return {
          ...r,
          id: `c${cycleNumber}-t${t.tier}-r${idx + 1}`,
          rarity: nextRarity,
        };
      }),
    })),
  };
}

export function createInitialAppState(): AppState {
  const cycle1 = buildCycle1Table();
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    progress: {
      srbRank: 0,
      activeCycle: 1,
      activePath: 1,
      currentRebirth: 1,
      completedAllTiersInCycle: false,
      novaCrystals: 0,
      permanentCreditMultiplier: 0,
      permanentXpMultiplier: 0,
      inventory: [],
      srbHistory: [],
    },
    cycles: {
      1: cycle1,
    },
    customDroids: [],
  };
}

export function createSampleStarterInventory(): OwnedDroid[] {
  const now = new Date().toISOString();
  return [
    { id: 'sample-1', name: 'CB', type: 'Astromech', rarity: DroidRarity.Base, quantity: 1, addedAt: now },
    { id: 'sample-2', name: 'Pit', type: 'Worker', rarity: DroidRarity.Base, quantity: 1, addedAt: now },
    { id: 'sample-3', name: 'DRK-1 Probe', type: 'Battle', rarity: DroidRarity.Base, quantity: 1, addedAt: now },
    { id: 'sample-4', name: 'R9', type: 'Astromech', rarity: DroidRarity.Base, quantity: 3, addedAt: now },
    { id: 'sample-5', name: 'ARG', type: 'Worker', rarity: DroidRarity.Gold, quantity: 3, addedAt: now },
    { id: 'sample-6', name: 'WHL-EX', type: 'Worker', rarity: DroidRarity.Stellar, quantity: 3, addedAt: now },
    { id: 'sample-7', name: 'ORB-XL', type: 'Battle', rarity: DroidRarity.Kyber, quantity: 1, addedAt: now },
    { id: 'sample-8', name: 'Mecha-Droid', type: 'Worker', rarity: DroidRarity.Scourge, quantity: 1, addedAt: now },
    { id: 'sample-9', name: 'PZ', type: 'Protocol', rarity: DroidRarity.Base, quantity: 2, addedAt: now },
  ];
}

export function formatCredits(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '0';
  if (amount >= 1e15) return `${(amount / 1e15).toFixed(2)}Qa`;
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(amount >= 100_000 ? 0 : 1)}K`;
  return Math.round(amount).toLocaleString();
}

export function getNextRarity(rarity: DroidRarity): DroidRarity | null {
  return RARITY_DEFINITIONS[rarity]?.nextRarity ?? null;
}

export function isScourgeRarity(rarity: DroidRarity): boolean {
  return RARITY_DEFINITIONS[rarity]?.category === 'scourge';
}
