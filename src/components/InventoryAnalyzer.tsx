import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Globe,
  Layers,
  Minus,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  AnalyzedOwnedDroid,
  DROID_TYPES,
  DroidCatalogItem,
  DroidRarity,
  DroidType,
  InventoryStatus,
  OwnedDroid,
  SPECIAL_RARITIES,
  STANDARD_RARITIES,
} from '../types';
import {
  findCatalogDroid,
  inferDroidType,
  isScourgeRarity,
  normalizeDroidNameKey,
  RARITY_DEFINITIONS,
} from '../data/defaultData';
import { filterAnalyzedInventory } from '../utils/analyzer';

interface InventoryAnalyzerProps {
  analyzedInventory: AnalyzedOwnedDroid[];
  catalog: DroidCatalogItem[];
  customDroids: DroidCatalogItem[];
  onAddDroid: (name: string, type: DroidType, rarity: DroidRarity, quantity: number) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onFuseDroid: (droid: OwnedDroid) => void;
  onRemoveDroid: (id: string) => void;
  onLoadSampleHangar: () => void;
  onLookupIntel?: (query: string) => void;
  compact?: boolean;
}

export function InventoryAnalyzer({
  analyzedInventory,
  catalog,
  customDroids,
  onAddDroid,
  onUpdateQuantity,
  onFuseDroid,
  onRemoveDroid,
  onLoadSampleHangar,
  onLookupIntel,
  compact = false,
}: InventoryAnalyzerProps) {
  // Quick-add & full-catalog search state
  const [droidName, setDroidName] = useState('');
  const [droidType, setDroidType] = useState<DroidType>('Worker');
  const [rarity, setRarity] = useState<DroidRarity>(DroidRarity.Base);
  const [quantity, setQuantity] = useState(1);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const catalogComboboxRef = useRef<HTMLDivElement | null>(null);

  // Search bar & filter options state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | DroidType>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | DroidRarity>('all');

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        catalogComboboxRef.current &&
        !catalogComboboxRef.current.contains(event.target as Node)
      ) {
        setIsCatalogOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const ownedQuantityByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of analyzedInventory) {
      const key = normalizeDroidNameKey(item.droid.name);
      map.set(key, (map.get(key) ?? 0) + item.droid.quantity);
    }
    return map;
  }, [analyzedInventory]);

  const catalogSearchResults = useMemo(() => {
    const q = droidName.trim().toLowerCase();
    if (!q) return catalog;
    const startsWith: DroidCatalogItem[] = [];
    const nameIncludes: DroidCatalogItem[] = [];
    const metaMatches: DroidCatalogItem[] = [];

    for (const d of catalog) {
      const lowerName = d.name.toLowerCase();
      if (lowerName.startsWith(q)) {
        startsWith.push(d);
      } else if (lowerName.includes(q)) {
        nameIncludes.push(d);
      } else if (
        d.type.toLowerCase().includes(q) ||
        (d.tier && d.tier.toLowerCase().includes(q)) ||
        (d.isFusion && 'fusion'.includes(q))
      ) {
        metaMatches.push(d);
      }
    }
    return [...startsWith, ...nameIncludes, ...metaMatches];
  }, [catalog, droidName]);

  const statusCounts = useMemo(() => {
    let needed = 0;
    let fuse = 0;
    let sell = 0;
    for (const item of analyzedInventory) {
      if (item.matchedStatuses.includes('needed')) needed++;
      if (item.matchedStatuses.includes('fuse')) fuse++;
      if (item.matchedStatuses.includes('sell')) sell++;
    }
    return { all: analyzedInventory.length, needed, fuse, sell };
  }, [analyzedInventory]);

  const rarityCounts = useMemo(() => {
    const counts: Partial<Record<DroidRarity, number>> = {};
    for (const item of analyzedInventory) {
      counts[item.droid.rarity] = (counts[item.droid.rarity] ?? 0) + 1;
    }
    return counts;
  }, [analyzedInventory]);

  const activeRarityDef = rarityFilter !== 'all' ? RARITY_DEFINITIONS[rarityFilter] : null;

  const filteredItems = useMemo(() => {
    const matched = filterAnalyzedInventory(analyzedInventory, {
      query: searchQuery,
      status: statusFilter,
      type: typeFilter,
      rarity: rarityFilter,
    });
    const rank: Record<InventoryStatus, number> = { fuse: 0, needed: 1, sell: 2 };
    return [...matched].sort((a, b) => {
      const diff = rank[a.primaryStatus] - rank[b.primaryStatus];
      if (diff !== 0) return diff;
      return a.droid.name.localeCompare(b.droid.name);
    });
  }, [analyzedInventory, searchQuery, statusFilter, typeFilter, rarityFilter]);

  const standardFilteredItems = useMemo(
    () => filteredItems.filter((item) => !isScourgeRarity(item.droid.rarity)),
    [filteredItems]
  );

  const scourgeFilteredItems = useMemo(
    () => filteredItems.filter((item) => isScourgeRarity(item.droid.rarity)),
    [filteredItems]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    rarityFilter !== 'all';

  const toolbarCatalogMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const shownKeys = new Set(filteredItems.map((i) => normalizeDroidNameKey(i.droid.name)));
    return catalog
      .filter((d) => {
        if (typeFilter !== 'all' && d.type !== typeFilter) return false;
        if (shownKeys.has(normalizeDroidNameKey(d.name))) return false;
        return (
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          Boolean(d.tier?.toLowerCase().includes(q)) ||
          Boolean(d.isFusion && 'fusion'.includes(q))
        );
      })
      .slice(0, 8);
  }, [catalog, filteredItems, searchQuery, typeFilter]);

  function handleNameInputChange(value: string) {
    setDroidName(value);
    setIsCatalogOpen(true);
    setHighlightedIndex(0);
    const key = normalizeDroidNameKey(value);
    const match = catalog.find((d) => normalizeDroidNameKey(d.name) === key);
    if (match) {
      setDroidType(match.type);
    } else if (value.trim()) {
      const catalogEntry = findCatalogDroid(value, customDroids);
      if (catalogEntry) {
        setDroidType(catalogEntry.type);
      } else if (catalog.some((d) => normalizeDroidNameKey(d.name) === key)) {
        setDroidType(inferDroidType(value, customDroids));
      }
    }
  }

  function handleSelectCatalogDroid(item: DroidCatalogItem) {
    setDroidName(item.name);
    setDroidType(item.type);
    setIsCatalogOpen(false);
  }

  function handleCatalogKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isCatalogOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsCatalogOpen(true);
      return;
    }
    if (!isCatalogOpen || catalogSearchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % catalogSearchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + catalogSearchResults.length) % catalogSearchResults.length
      );
    } else if (e.key === 'Enter' && catalogSearchResults[highlightedIndex]) {
      const exactAlready =
        normalizeDroidNameKey(droidName) ===
        normalizeDroidNameKey(catalogSearchResults[highlightedIndex].name);
      if (!exactAlready) {
        e.preventDefault();
        handleSelectCatalogDroid(catalogSearchResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsCatalogOpen(false);
    }
  }

  function formatDroidSubtitle(name: string, type: DroidType): string {
    const meta = findCatalogDroid(name, customDroids);
    const parts: string[] = [type];
    if (meta?.tier) parts.push(meta.tier);
    if (meta?.isFusion) parts.push('Fusion');
    return parts.join(' · ');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = droidName.trim();
    if (!trimmed) return;
    onAddDroid(trimmed, droidType, rarity, Math.max(1, quantity));
    setDroidName('');
    setQuantity(1);
    setIsCatalogOpen(false);
  }

  function clearAllFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setRarityFilter('all');
  }

  return (
    <section
      aria-label="Droid Inventory Analyzer"
      className="panel-surface flex flex-col rounded-xl"
    >
      {/* Header + Quick-Log Form */}
      <div className="border-b border-[#2A2440] p-4 sm:p-5 space-y-4 rounded-t-xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="sw-title text-base sm:text-lg font-bold text-[#F3F0FA]">
              DROID INVENTORY ANALYZER
            </h2>
            <p className="text-xs text-[#A79EC0] mt-1">
              Log owned droids to auto-tag them as Needed for upcoming rebirths, Ready to Fuse (3+), or Safe to Sell.
            </p>
          </div>
          <div className="text-xs text-[#C084FC] font-mono tabular-nums">
            {analyzedInventory.reduce((sum, i) => sum + i.droid.quantity, 0)} units logged
          </div>
        </div>

        {/* Log Owned Droid Form */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1"
        >
          <div ref={catalogComboboxRef} className="relative sm:col-span-4">
            <label htmlFor="add-droid-name" className="sr-only">
              Search entire droid catalog by name
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7E7499]"
              aria-hidden="true"
            />
            <input
              id="add-droid-name"
              type="text"
              role="combobox"
              aria-expanded={isCatalogOpen}
              aria-controls="catalog-search-listbox"
              aria-autocomplete="list"
              autoComplete="off"
              value={droidName}
              onFocus={() => {
                setIsCatalogOpen(true);
                setHighlightedIndex(0);
              }}
              onChange={(e) => handleNameInputChange(e.target.value)}
              onKeyDown={handleCatalogKeyDown}
              placeholder={`Search all ${catalog.length} droids (e.g. R9, PZ, X-ONK)...`}
              className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] py-2 pl-8 pr-7 text-xs text-[#F3F0FA] placeholder-[#7E7499] focus:border-[#A855F7] focus:outline-none"
            />
            {droidName && (
              <button
                type="button"
                onClick={() => {
                  setDroidName('');
                  setIsCatalogOpen(true);
                  setHighlightedIndex(0);
                }}
                aria-label="Clear catalog search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E7499] hover:text-[#F3F0FA]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {isCatalogOpen && (
              <div
                id="catalog-search-listbox"
                role="listbox"
                aria-label="Droid catalog search results"
                className="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-lg border border-[#3B315E] bg-[#120F1E] shadow-xl shadow-black/50 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-[#26203B] bg-[#0E0C17] px-3 py-1.5 text-[11px] text-[#A79EC0]">
                  <span>
                    Catalog ({catalogSearchResults.length} of {catalog.length})
                  </span>
                  <span className="text-[#7E7499]">Click to select or +1 to log</span>
                </div>

                {catalogSearchResults.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-[#A79EC0]">
                    No catalog match for <span className="text-[#F3F0FA] font-medium">“{droidName}”</span>. Press <span className="text-[#C084FC]">Add Droid</span> to log it as a custom entry.
                  </div>
                ) : (
                  <ul className="max-h-60 overflow-y-auto divide-y divide-[#231E36]/70">
                    {catalogSearchResults.map((item, idx) => {
                      const ownedQty = ownedQuantityByKey.get(normalizeDroidNameKey(item.name)) ?? 0;
                      const isHighlighted = idx === highlightedIndex;
                      const subtitle = [item.type, item.tier, item.isFusion ? 'Fusion' : null]
                        .filter(Boolean)
                        .join(' · ');

                      return (
                        <li
                          key={item.name}
                          role="option"
                          aria-selected={isHighlighted}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors ${
                            isHighlighted ? 'bg-[#221A3B]' : 'hover:bg-[#1C1630]'
                          }`}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectCatalogDroid(item)}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className="font-medium text-[#F3F0FA] truncate">{item.name}</div>
                            <div className="text-[11px] text-[#8E84AA] truncate">{subtitle}</div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            {ownedQty > 0 && (
                              <span className="font-mono text-[11px] text-[#4ADE80] tabular-nums">
                                {ownedQty} owned
                              </span>
                            )}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                onAddDroid(item.name, item.type, rarity, 1);
                                setDroidName('');
                                setIsCatalogOpen(false);
                              }}
                              title={`Quick-log 1× ${rarity} ${item.name}`}
                              className="inline-flex items-center gap-0.5 rounded border border-[#3B315E] bg-[#1A152C] px-1.5 py-0.5 text-[11px] font-medium text-[#E9D5FF] hover:border-[#A855F7] hover:bg-[#2A1D47] transition-colors"
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                              <span>1</span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="add-droid-type" className="sr-only">
              Droid Type
            </label>
            <select
              id="add-droid-type"
              value={droidType}
              onChange={(e) => setDroidType(e.target.value as DroidType)}
              className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] px-2.5 py-2 text-xs text-[#F3F0FA] focus:border-[#A855F7] focus:outline-none"
            >
              {DROID_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#151221]">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="add-droid-rarity" className="sr-only">
              Rarity
            </label>
            <select
              id="add-droid-rarity"
              value={rarity}
              onChange={(e) => setRarity(e.target.value as DroidRarity)}
              className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] px-2.5 py-2 text-xs text-[#F3F0FA] focus:border-[#A855F7] focus:outline-none"
            >
              <optgroup label="Standard Progression" className="bg-[#151221] text-[#A79EC0]">
                {STANDARD_RARITIES.map((r) => (
                  <option key={r} value={r} className="bg-[#151221] text-[#F3F0FA]">
                    {r}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Scourge Droids" className="bg-[#151221] text-[#F87171]">
                {SPECIAL_RARITIES.map((r) => (
                  <option key={r} value={r} className="bg-[#151221] text-[#F87171]">
                    {r}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="add-droid-qty" className="sr-only">
              Quantity
            </label>
            <input
              id="add-droid-qty"
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] px-2.5 py-2 font-mono text-xs text-[#F3F0FA] tabular-nums focus:border-[#A855F7] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!droidName.trim()}
              className="saber-purple-btn w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9333EA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A855F7] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Droid</span>
            </button>
          </div>
        </form>
      </div>

      {/* Search Bar & Filter Options Toolbar */}
      <div className="border-b border-[#2A2440] bg-[#100E1B] px-4 py-3 sm:px-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Primary Search Input */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7E7499]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by droid name, type, rarity, or status (needed, sell, fuse)..."
              aria-label="Search inventory by droid name, type, or status"
              className="w-full rounded-lg border border-[#2F2848] bg-[#0E0C17] py-2 pl-9 pr-8 text-xs text-[#F3F0FA] placeholder-[#7E7499] focus:border-[#A855F7] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E7499] hover:text-[#F3F0FA]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Dropdown */}
          <select
            aria-label="Filter by droid type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | DroidType)}
            className="rounded-lg border border-[#2F2848] bg-[#0E0C17] px-3 py-2 text-xs text-[#E9E4F5] focus:border-[#A855F7] focus:outline-none shrink-0"
          >
            <option value="all" className="bg-[#151221]">All Types</option>
            {DROID_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#151221]">
                {t}
              </option>
            ))}
          </select>

          {/* Rarity Filter Dropdown */}
          <div className="inline-flex items-center gap-1.5 shrink-0">
            <div className="relative flex-1 sm:flex-initial">
              <Filter
                className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
                  activeRarityDef ? activeRarityDef.textColorClass : 'text-[#7E7499]'
                }`}
                aria-hidden="true"
              />
              <select
                id="filter-droid-rarity"
                aria-label="Filter by rarity"
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as 'all' | DroidRarity)}
                className={`w-full sm:w-auto rounded-lg border pl-8 pr-3 py-2 text-xs font-medium focus:border-[#A855F7] focus:outline-none transition-colors ${
                  activeRarityDef
                    ? `border-transparent bg-[#0E0C17] ${activeRarityDef.rowGlowClass} ${activeRarityDef.textColorClass}`
                    : 'border-[#2F2848] bg-[#0E0C17] text-[#E9E4F5]'
                }`}
              >
                <option value="all" className="bg-[#151221] text-[#E9E4F5]">
                  All Rarities ({analyzedInventory.length})
                </option>
                <optgroup label="Standard Progression" className="bg-[#151221] text-[#A79EC0]">
                  {STANDARD_RARITIES.map((r) => {
                    const count = rarityCounts[r] ?? 0;
                    return (
                      <option key={r} value={r} className="bg-[#151221] text-[#F3F0FA]">
                        {count > 0 ? `${r} (${count})` : r}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Scourge Droids" className="bg-[#151221] text-[#F87171]">
                  {SPECIAL_RARITIES.map((r) => {
                    const count = rarityCounts[r] ?? 0;
                    return (
                      <option key={r} value={r} className="bg-[#151221] text-[#F87171]">
                        {count > 0 ? `${r} (${count})` : r}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>
            {rarityFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setRarityFilter('all')}
                aria-label="Clear rarity filter"
                title="Show all rarities"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#2F2848] bg-[#0E0C17] text-[#A79EC0] hover:border-[#A855F7]/60 hover:text-[#F3F0FA] transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Segmented Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Filter by inventory status"
            className="inline-flex items-center gap-1 p-1 bg-[#0E0C17] rounded-lg border border-[#26203B]"
          >
            {(
              [
                { id: 'all', label: 'All', count: statusCounts.all },
                { id: 'needed', label: 'Needed', count: statusCounts.needed },
                { id: 'fuse', label: 'Ready to Fuse', count: statusCounts.fuse },
                { id: 'sell', label: 'Safe to Sell', count: statusCounts.sell },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#261E40] text-[#F3F0FA]'
                      : 'text-[#A79EC0] hover:text-[#F3F0FA]'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 font-mono text-[11px] text-[#7E7499] tabular-nums">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-medium text-[#C084FC] hover:text-[#E9D5FF] transition-colors whitespace-nowrap"
            >
              Reset Filters ({filteredItems.length} shown)
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table / Empty State */}
      <div className={`overflow-x-auto rounded-b-xl ${compact ? 'max-h-[600px] overflow-y-auto' : ''}`}>
        {analyzedInventory.length === 0 && searchQuery.trim() === '' ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-[#F3F0FA]">Your droid hangar is empty</p>
            <p className="mt-1 text-xs text-[#A79EC0] max-w-md mx-auto">
              Search the {catalog.length}-droid catalog above to log units, or click any missing requirement in the Rebirth Roadmap.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLoadSampleHangar}
                className="rounded-lg border border-[#3B315E] bg-[#1D1830] px-4 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#4ADE80]/70 hover:text-[#86EFAC] transition-colors"
              >
                Load Sample Hangar
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-10 text-center space-y-5">
            <div>
              <p className="text-sm font-medium text-[#F3F0FA]">No logged droids match your search</p>
              <p className="mt-1 text-xs text-[#A79EC0]">
                Try searching by droid name, class (Worker, Astromech, Battle, Protocol), tier (Mythic, Iconic, Fusion), or status (needed, sell, fuse).
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-3 rounded-lg border border-[#3B315E] bg-[#1D1830] px-4 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7]/70 transition-colors"
                >
                  Clear Search & Filters
                </button>
              )}
            </div>

            {toolbarCatalogMatches.length > 0 && (
              <div className="mx-auto max-w-xl text-left rounded-lg border border-[#2A2440] bg-[#100E1B] overflow-hidden">
                <div className="border-b border-[#26203B] px-3.5 py-2 text-xs font-medium text-[#C084FC]">
                  Catalog Matches Not Yet Logged ({toolbarCatalogMatches.length})
                </div>
                <ul className="divide-y divide-[#231E36]">
                  {toolbarCatalogMatches.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#F3F0FA] truncate">{item.name}</div>
                        <div className="text-[11px] text-[#8E84AA] truncate">
                          {[item.type, item.tier, item.isFusion ? 'Fusion' : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onAddDroid(
                            item.name,
                            item.type,
                            rarityFilter !== 'all' ? rarityFilter : rarity,
                            1
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-[#3B315E] bg-[#1D1830] px-2.5 py-1 text-xs font-medium text-[#E9D5FF] hover:border-[#A855F7] hover:bg-[#2A1D47] transition-colors shrink-0"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        <span>
                          Log {rarityFilter !== 'all' ? rarityFilter : rarity}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#100E1B]/92 backdrop-blur-md border-b border-[#2A2440]">
              <tr className="text-xs font-medium text-[#A79EC0]">
                <th className="py-2.5 pl-4 pr-3">Droid</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Rarity</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Qty</th>
                <th className="py-2.5 px-3">Recommendation</th>
                <th className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#231E36] text-sm">
              {standardFilteredItems.map((item) => {
                const { droid, primaryStatus, canFuse, fusionTargetRarity, reason } = item;
                const rarityDef = RARITY_DEFINITIONS[droid.rarity];
                return (
                  <tr
                    key={droid.id}
                    className={`${rarityDef.rowGlowClass} transition-[background-color,box-shadow] duration-150`}
                  >
                    {/* Droid Name & Type */}
                    <td className="py-3 pl-4 pr-3 align-middle">
                      <div className="font-medium text-[#F3F0FA]">{droid.name}</div>
                      <div className="text-xs text-[#7E7499]">
                        {formatDroidSubtitle(droid.name, droid.type)}
                      </div>
                    </td>

                    {/* Rarity */}
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${rarityDef.textColorClass} ${rarityDef.textGlowClass}`}
                      >
                        {droid.rarity}
                      </span>
                    </td>

                    {/* Quantity Stepper */}
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(droid.id, -1)}
                          aria-label={`Decrease quantity of ${droid.rarity} ${droid.name}`}
                          className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#322B4B] bg-[#0E0C17] text-[#A79EC0] hover:text-[#F3F0FA] hover:border-[#A855F7]/60 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center font-mono text-xs font-semibold text-[#F3F0FA] tabular-nums">
                          {droid.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(droid.id, 1)}
                          aria-label={`Increase quantity of ${droid.rarity} ${droid.name}`}
                          className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#322B4B] bg-[#0E0C17] text-[#A79EC0] hover:text-[#F3F0FA] hover:border-[#A855F7]/60 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Recommendation Status */}
                    <td className="py-3 px-3 align-middle">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {primaryStatus === 'fuse' && (
                          <>
                            <Layers className="h-3.5 w-3.5 text-[#C084FC] shrink-0" aria-hidden="true" />
                            <span className="text-[#C084FC]">Ready to Fuse</span>
                          </>
                        )}
                        {primaryStatus === 'needed' && (
                          <>
                            <ShieldAlert className="h-3.5 w-3.5 text-[#FCD34D] shrink-0" aria-hidden="true" />
                            <span className="text-[#FCD34D]">Needed</span>
                          </>
                        )}
                        {primaryStatus === 'sell' && (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#4ADE80] shrink-0" aria-hidden="true" />
                            <span className="text-[#4ADE80]">Safe to Sell</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-[#A79EC0] mt-0.5 leading-snug">{reason}</p>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3 pl-3 pr-4 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canFuse && fusionTargetRarity && (
                          <button
                            type="button"
                            onClick={() => onFuseDroid(droid)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#A855F7]/45 bg-[#241738] px-2.5 py-1 text-xs font-medium text-[#E9D5FF] hover:bg-[#321F4F] active:scale-[0.97] transition-all whitespace-nowrap"
                          >
                            <span>Fuse 3→1</span>
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                        {onLookupIntel && (
                          <button
                            type="button"
                            onClick={() =>
                              onLookupIntel(
                                `Star Wars Droid Tycoon ${droid.name} ${droid.type} droid stats, fusion recipe, and how to get`
                              )
                            }
                            title={`Look up ${droid.name} in Live Intel`}
                            aria-label={`Search live web intel for ${droid.name}`}
                            className="inline-flex items-center justify-center rounded-md border border-[#322B4B] bg-[#0E0C17] p-1 text-[#A79EC0] hover:border-[#4ADE80]/60 hover:text-[#4ADE80] active:scale-[0.95] transition-all"
                          >
                            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveDroid(droid.id)}
                          title={primaryStatus === 'sell' ? 'Sell / Remove droid' : 'Remove droid'}
                          aria-label={`Remove ${droid.rarity} ${droid.name}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#322B4B] bg-[#0E0C17] px-2 py-1 text-xs text-[#A79EC0] hover:border-[#FB7185]/60 hover:text-[#FDA4AF] active:scale-[0.97] transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">
                            {primaryStatus === 'sell' ? 'Sell' : 'Remove'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {scourgeFilteredItems.length > 0 && (
                <>
                  <tr className="bg-[#1F1014] border-t border-[#4C1D24]">
                    <td colSpan={5} className="py-2 px-4 text-xs font-semibold text-[#F87171]">
                      <span className="font-display tracking-wider uppercase text-[11px] rarity-text-scourge">
                        Scourge Droids
                      </span>
                      <span className="ml-2 font-normal text-[#C4A6AD]">
                        · Separate rarity tier · Counts for all rebirth variants
                      </span>
                    </td>
                  </tr>
                  {scourgeFilteredItems.map((item) => {
                    const { droid, primaryStatus, reason } = item;
                    const rarityDef = RARITY_DEFINITIONS[droid.rarity];
                    return (
                      <tr
                        key={droid.id}
                        className={`${rarityDef.rowGlowClass} transition-[background-color,box-shadow] duration-150`}
                      >
                        <td className="py-3 pl-4 pr-3 align-middle">
                          <div className="font-medium text-[#F3F0FA]">{droid.name}</div>
                          <div className="text-xs text-[#9C8288]">
                            {formatDroidSubtitle(droid.name, droid.type)}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <span
                            className={`text-xs font-semibold ${rarityDef.textColorClass} ${rarityDef.textGlowClass}`}
                          >
                            {droid.rarity}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(droid.id, -1)}
                              aria-label={`Decrease quantity of ${droid.rarity} ${droid.name}`}
                              className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#4C1D24] bg-[#160B0E] text-[#C4A6AD] hover:text-[#F3F0FA] hover:border-[#F87171]/60 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center font-mono text-xs font-semibold text-[#F3F0FA] tabular-nums">
                              {droid.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(droid.id, 1)}
                              aria-label={`Increase quantity of ${droid.rarity} ${droid.name}`}
                              className="h-6 w-6 inline-flex items-center justify-center rounded border border-[#4C1D24] bg-[#160B0E] text-[#C4A6AD] hover:text-[#F3F0FA] hover:border-[#F87171]/60 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            {primaryStatus === 'needed' ? (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5 text-[#FCD34D] shrink-0" aria-hidden="true" />
                                <span className="text-[#FCD34D]">Needed</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#4ADE80] shrink-0" aria-hidden="true" />
                                <span className="text-[#4ADE80]">Safe to Sell</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-[#C4A6AD] mt-0.5 leading-snug">{reason}</p>
                        </td>
                        <td className="py-3 pl-3 pr-4 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {onLookupIntel && (
                              <button
                                type="button"
                                onClick={() =>
                                  onLookupIntel(
                                    `Star Wars Droid Tycoon Scourge ${droid.name} droid stats and how to get`
                                  )
                                }
                                title={`Look up Scourge ${droid.name} in Live Intel`}
                                aria-label={`Search live web intel for Scourge ${droid.name}`}
                                className="inline-flex items-center justify-center rounded-md border border-[#4C1D24] bg-[#160B0E] p-1 text-[#C4A6AD] hover:border-[#4ADE80]/60 hover:text-[#4ADE80] active:scale-[0.95] transition-all"
                              >
                                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRemoveDroid(droid.id)}
                              title={primaryStatus === 'sell' ? 'Sell / Remove droid' : 'Remove droid'}
                              aria-label={`Remove ${droid.rarity} ${droid.name}`}
                              className="inline-flex items-center gap-1 rounded-md border border-[#4C1D24] bg-[#160B0E] px-2 py-1 text-xs text-[#C4A6AD] hover:border-[#F87171]/70 hover:text-[#FCA5A5] active:scale-[0.97] transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="hidden sm:inline">
                                {primaryStatus === 'sell' ? 'Sell' : 'Remove'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
