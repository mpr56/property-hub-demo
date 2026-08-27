import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import SilkBackground, { SILK_BRAND_COLOR, SILK_STATUS_COLOR } from '@/components/SilkBackground';
import type { BackgroundStatus } from '@/components/SilkBackground';
import { useBackgroundMode } from '@/lib/useBackgroundMode';
import GlassSurface from '@/components/GlassSurface';
import Icon from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import PropertyCard from '@/components/PropertyCard';
import AddPropertyModal from '@/components/AddPropertyModal';
import FiltersPanel from '@/components/FiltersPanel';
import type { SortBy } from '@/components/FiltersPanel';
import ViewToggle from '@/components/ViewToggle';
import type { ViewMode } from '@/components/ViewToggle';
import SeverityGroup from '@/components/SeverityGroup';
import TasksWidget from '@/components/TasksWidget';
import * as api from '@/lib/demo/api';
import { shared, color } from '@/lib/tokens';
import type { AlertLevel, Category, PropertyConfig, TrackerType } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/types';
import {
  ALERT_META,
  ALERT_RANK,
  ALL_TRACKER_TYPES,
  leaseExpiringSoon,
  propertyAlertLevel,
  propertyNeedsAttention,
  propertySeverityScore,
  trackerLabel,
  trackerNeedsAttention,
} from '@/lib/trackers';

type FilterCat = Category | 'all';

const ALL_ALERT_LEVELS: AlertLevel[] = ['missing', 'due-soon', 'ok', 'none'];

function isValidCategory(v: unknown): v is Category {
  return v === 'green' || v === 'orange' || v === 'purple';
}
function isValidAlertLevel(v: string): v is AlertLevel {
  return (ALL_ALERT_LEVELS as string[]).includes(v);
}
function isValidTrackerType(v: string): v is TrackerType {
  return (ALL_TRACKER_TYPES as string[]).includes(v);
}
function isValidSort(v: unknown): v is SortBy {
  return v === 'severity' || v === 'score' || v === 'address';
}

// "Needs oversight" = softer signals worth keeping an eye on, but NOT overdue:
// the water 3-week estimate ('due-soon') OR an open linked Google task. Overdue
// ('missing') is more urgent and belongs to "Needs attention", so it's excluded
// here — every property lands in at most one of the two tiles.
function needsOversight(p: PropertyConfig, taskPropertyIds: Set<string>): boolean {
  if (propertyNeedsAttention(p)) return false;
  return propertyAlertLevel(p) === 'due-soon' || taskPropertyIds.has(p.id);
}

function matchesSearch(p: PropertyConfig, search: string): boolean {
  const q = search.toLowerCase().trim();
  if (!q) return true;
  return p.address.toLowerCase().includes(q) || p.suburb.toLowerCase().includes(q) || p.council.toLowerCase().includes(q);
}

function compareBySort(sort: SortBy) {
  if (sort === 'address') return (a: PropertyConfig, b: PropertyConfig) => a.address.localeCompare(b.address);
  if (sort === 'score') return (a: PropertyConfig, b: PropertyConfig) => propertySeverityScore(b) - propertySeverityScore(a);
  return (a: PropertyConfig, b: PropertyConfig) => {
    const rankDiff = ALERT_RANK[propertyAlertLevel(a)] - ALERT_RANK[propertyAlertLevel(b)];
    if (rankDiff !== 0) return rankDiff;
    const scoreDiff = propertySeverityScore(b) - propertySeverityScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.address.localeCompare(b.address);
  };
}

export default function Home() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyConfig[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [search, setSearch] = useState('');
  const [filterRatesCat, setFilterRatesCat] = useState<FilterCat>('all');
  const [filterWaterCat, setFilterWaterCat] = useState<FilterCat>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertLevel[]>([]);
  const [filterAttributes, setFilterAttributes] = useState<TrackerType[]>([]);
  const [filterOversight, setFilterOversight] = useState(false);
  const [filterLeaseExpiring, setFilterLeaseExpiring] = useState(false);
  const [sort, setSort] = useState<SortBy>('severity');
  const [view, setView] = useState<ViewMode>('list');
  // Property IDs that have an open Google Task linked to them. A linked task is a
  // human-flagged to-do — a soft "keep an eye on this" signal, so it feeds the
  // "Needs oversight" tile (NOT "Needs attention", which is overdue-only). See
  // needsOversight below. Best-effort: empty when Google isn't configured / fetch fails.
  const [taskPropertyIds, setTaskPropertyIds] = useState<Set<string>>(() => new Set());

  async function load() {
    setLoadError(false);
    try {
      // Full configs in one call — the alert level, severity score and every
      // filter facet are derived from the trackers, so summaries aren't enough.
      setProperties(await api.listFullProperties());
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => { load(); }, []);

  // Which properties have an open linked task (drives the "needs oversight" signal).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tasks = await api.listTasks();
        if (cancelled) return;
        const ids = tasks.filter(t => t.propertyId).map(t => t.propertyId as string);
        setTaskPropertyIds(new Set(ids));
      } catch { /* tasks are best-effort; the dashboard works without them */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hydrate filter/sort/view state from the URL once, after the router is ready
  // (router.query is {} pre-hydration — reading it earlier would clobber a bookmarked URL).
  useEffect(() => {
    if (!router.isReady || hydrated) return;
    const q = router.query;
    if (typeof q.q === 'string') setSearch(q.q);
    if (q.rates === 'all' || isValidCategory(q.rates)) setFilterRatesCat(q.rates as FilterCat);
    if (q.water === 'all' || isValidCategory(q.water)) setFilterWaterCat(q.water as FilterCat);
    if (typeof q.severity === 'string' && q.severity) {
      setFilterSeverity(q.severity.split(',').filter(isValidAlertLevel));
    }
    if (typeof q.attribute === 'string' && q.attribute) {
      setFilterAttributes(q.attribute.split(',').filter(isValidTrackerType));
    }
    if (q.oversight === '1') setFilterOversight(true);
    if (q.lease === '1') setFilterLeaseExpiring(true);
    if (isValidSort(q.sort)) setSort(q.sort);
    if (q.view === 'grouped' || q.view === 'list') setView(q.view);
    setHydrated(true);
  }, [router.isReady, hydrated, router.query]);

  // Reflect current state back into the URL (shallow, debounced) so filtered/sorted
  // views are bookmarkable/shareable and survive a reload.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      const query: Record<string, string> = {};
      if (filterRatesCat !== 'all') query.rates = filterRatesCat;
      if (filterWaterCat !== 'all') query.water = filterWaterCat;
      if (filterSeverity.length) query.severity = filterSeverity.join(',');
      if (filterAttributes.length) query.attribute = filterAttributes.join(',');
      if (filterOversight) query.oversight = '1';
      if (filterLeaseExpiring) query.lease = '1';
      if (sort !== 'severity') query.sort = sort;
      if (view !== 'list') query.view = view;
      if (search) query.q = search;
      router.replace({ pathname: '/', query }, undefined, { shallow: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, search, filterRatesCat, filterWaterCat, filterSeverity, filterAttributes, filterOversight, filterLeaseExpiring, sort, view]);

  const categoryFiltered = useMemo(() => {
    if (!properties) return [];
    return properties
      .filter(p => (filterRatesCat === 'all' ? true : p.ratesCategory === filterRatesCat))
      .filter(p => (filterWaterCat === 'all' ? true : p.waterCategory === filterWaterCat))
      .filter(p => matchesSearch(p, search));
  }, [properties, filterRatesCat, filterWaterCat, search]);

  const filtered = useMemo(() => {
    return categoryFiltered
      .filter(p => (filterSeverity.length === 0 ? true : filterSeverity.includes(propertyAlertLevel(p))))
      .filter(p => (filterAttributes.length === 0 ? true : filterAttributes.some(t => trackerNeedsAttention(p, t))))
      .filter(p => (!filterOversight ? true : needsOversight(p, taskPropertyIds)))
      .filter(p => (!filterLeaseExpiring ? true : leaseExpiringSoon(p)))
      .sort(compareBySort(sort));
  }, [categoryFiltered, filterSeverity, filterAttributes, filterOversight, filterLeaseExpiring, taskPropertyIds, sort]);

  // Facet counts reflect the OTHER active facets, not their own selection —
  // otherwise checking a severity box would immediately zero out every other option's count.
  const severityOptions = useMemo(() => {
    const afterAttribute = categoryFiltered.filter(p => filterAttributes.length === 0 || filterAttributes.some(t => trackerNeedsAttention(p, t)));
    return ALL_ALERT_LEVELS.map(level => ({
      value: level,
      label: ALERT_META[level].label,
      hex: ALERT_META[level].hex,
      count: afterAttribute.filter(p => propertyAlertLevel(p) === level).length,
    }));
  }, [categoryFiltered, filterAttributes]);

  const attributeOptions = useMemo(() => {
    const afterSeverity = categoryFiltered.filter(p => filterSeverity.length === 0 || filterSeverity.includes(propertyAlertLevel(p)));
    return ALL_TRACKER_TYPES.map(type => ({
      value: type,
      label: trackerLabel(type),
      count: afterSeverity.filter(p => trackerNeedsAttention(p, type)).length,
    }));
  }, [categoryFiltered, filterSeverity]);

  const groups = useMemo(() => {
    const buckets: Record<AlertLevel, PropertyConfig[]> = { missing: [], 'due-soon': [], ok: [], none: [] };
    for (const p of filtered) buckets[propertyAlertLevel(p)].push(p);
    return buckets;
  }, [filtered]);

  function resetFilters() {
    setFilterRatesCat('all');
    setFilterWaterCat('all');
    setFilterSeverity([]);
    setFilterAttributes([]);
    setFilterOversight(false);
    setFilterLeaseExpiring(false);
    setSort('severity');
    setSearch('');
  }

  const activeFilterCount = (filterRatesCat !== 'all' ? 1 : 0) + (filterWaterCat !== 'all' ? 1 : 0) + filterSeverity.length + filterAttributes.length + (filterOversight ? 1 : 0) + (filterLeaseExpiring ? 1 : 0);

  const counts = useMemo(() => {
    if (!properties) return { total: 0, attention: 0, oversight: 0, leaseExpiring: 0 };
    return {
      total: properties.length,
      // Needs attention = genuinely overdue only (past a due date).
      attention: properties.filter(p => propertyNeedsAttention(p)).length,
      // TODO(oversight): "Needs oversight" currently means the water 3-week estimate
      // ('due-soon') OR an open linked Google task. When rates/other trackers grow
      // their own upcoming/estimate ('due-soon') logic they'll fold in automatically
      // via propertyAlertLevel; revisit the label/semantics at that point.
      oversight: properties.filter(p => needsOversight(p, taskPropertyIds)).length,
      // Rent agreements ending within the ~3-month renewal window (or already
      // in the final stretch / expired) — see leaseExpiringSoon.
      leaseExpiring: properties.filter(leaseExpiringSoon).length,
    };
  }, [properties, taskPropertyIds]);

  // The stat tiles double as quick filters, and they behave as ONE exclusive
  // group (like radio buttons): clicking a tile clears the other tiles' filters
  // so you never end up ANDing "needs attention" with "leases expiring" and
  // getting an empty list. "Total" clears everything; clicking the already-active
  // tile toggles back to showing all.
  const attentionFilterActive = filterSeverity.length === 1 && filterSeverity[0] === 'missing';
  const showingAll = activeFilterCount === 0;
  type Tile = 'attention' | 'oversight' | 'lease';
  function selectTile(tile: Tile) {
    const active = tile === 'attention' ? attentionFilterActive
      : tile === 'oversight' ? filterOversight
      : filterLeaseExpiring;
    // Reset all three tile filters, then switch the clicked one on unless it was
    // already the active tile (in which case this click clears it → showing all).
    setFilterSeverity(tile === 'attention' && !active ? ['missing'] : []);
    setFilterOversight(tile === 'oversight' && !active);
    setFilterLeaseExpiring(tile === 'lease' && !active);
  }

  // Background tint in status mode follows the worst alert in the portfolio.
  const [bgMode, toggleBgMode] = useBackgroundMode();
  const bgStatus = useMemo<BackgroundStatus>(() => {
    if (!properties || properties.length === 0) return 'neutral';
    const levels = properties.map(p => propertyAlertLevel(p));
    if (levels.includes('missing')) return 'missing';
    if (levels.includes('due-soon')) return 'due-soon';
    return 'ok';
  }, [properties]);
  const bgColor = bgMode === 'status' ? SILK_STATUS_COLOR[bgStatus] : SILK_BRAND_COLOR;

  return (
    <div style={shared.page}>
      <div style={shared.bgLayer}><SilkBackground color={bgColor} /></div>

      <div className="page-inner" style={shared.inner}>
        <header style={{ padding: 'clamp(28px, 6vw, 44px) 0 clamp(20px, 4vw, 28px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              {/* Logo doubles as the background-mode switch: static brand blue
                  vs. tinted by the portfolio's worst alert level. */}
              <button
                onClick={toggleBgMode}
                aria-pressed={bgMode === 'status'}
                title={bgMode === 'status' ? 'Background: status colours (click for static)' : 'Background: static (click for status colours)'}
                style={{
                  width: 46, height: 46, borderRadius: 14, color: '#fff',
                  background: `linear-gradient(135deg, ${color.sky} 0%, ${color.skyDeep} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: bgMode === 'status'
                    ? `0 8px 24px rgba(62,182,240,0.35), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 2px ${SILK_STATUS_COLOR[bgStatus]}`
                    : '0 8px 24px rgba(62,182,240,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
                  border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                <Icon name="building" size={23} />
              </button>
              <div>
                <p style={shared.eyebrow}>Property Hub</p>
                <h1 style={{ fontSize: 'clamp(23px, 5.5vw, 30px)', fontWeight: 700, marginTop: 2 }}>Blue Hill Dashboard</h1>
              </div>
            </div>
            <div className="header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn-primary" style={shared.button} onClick={() => setAddOpen(true)}>
                <Icon name="plus" size={15} strokeWidth={2.5} />
                Add property
              </button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 14 }}>
            {counts.total} propert{counts.total === 1 ? 'y' : 'ies'} tracked
            {counts.attention > 0 && (
              <span style={{ color: color.red, fontWeight: 700 }}> · {counts.attention} need attention</span>
            )}
          </p>
        </header>

        {/* Stat cards — one exclusive quick-filter group; clean 2×2 on phones/tablet,
            single row of four on wide desktop (see .stat-grid in globals). */}
        <div className="stat-grid">
          <StatCard
            label="Total properties"
            value={counts.total}
            hex={color.skyLight}
            icon="building"
            neutralValue
            onClick={resetFilters}
            active={showingAll}
            title={showingAll ? 'Showing all properties' : 'Show all properties (clear filters)'}
          />
          <StatCard
            label="Needs attention"
            value={counts.attention}
            hex={color.red}
            icon="alert-triangle"
            onClick={() => selectTile('attention')}
            active={attentionFilterActive}
          />
          <StatCard
            label="Needs oversight"
            value={counts.oversight}
            hex={color.orange}
            icon="search-check"
            onClick={() => selectTile('oversight')}
            active={filterOversight}
          />
          <StatCard
            label="Leases expiring"
            value={counts.leaseExpiring}
            hex={color.purple}
            icon="file-text"
            onClick={() => selectTile('lease')}
            active={filterLeaseExpiring}
            title={filterLeaseExpiring ? 'Showing leases expiring (click to clear)' : 'Show leases expiring within ~3 months'}
          />
        </div>

        {/* Google Tasks (renders nothing until the integration is configured) */}
        <TasksWidget />

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="filter-search" style={{ position: 'relative', flex: '1 1 220px' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none', display: 'flex' }}>
                <Icon name="search" size={15} />
              </span>
              <input
                style={{ ...shared.input, paddingLeft: 34 }}
                placeholder="Search address, suburb, council…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search properties"
              />
            </div>
            <FilterSelect
              value={filterRatesCat}
              onChange={v => setFilterRatesCat(v as FilterCat)}
              options={[
                { value: 'all', label: 'Rates: all' },
                ...(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => ({ value: cat, label: `Rates: ${CATEGORY_CONFIG[cat].label}` })),
              ]}
            />
            <FilterSelect
              value={filterWaterCat}
              onChange={v => setFilterWaterCat(v as FilterCat)}
              options={[
                { value: 'all', label: 'Water: all' },
                ...(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => ({ value: cat, label: `Water: ${CATEGORY_CONFIG[cat].label}` })),
              ]}
            />
            <ViewToggle value={view} onChange={setView} />
          </div>

          <FiltersPanel
            severityOptions={severityOptions}
            severitySelected={filterSeverity}
            onSeverityChange={setFilterSeverity}
            attributeOptions={attributeOptions}
            attributeSelected={filterAttributes}
            onAttributeChange={setFilterAttributes}
            sort={sort}
            onSortChange={setSort}
            onReset={resetFilters}
            activeCount={activeFilterCount}
          />
        </div>

        {/* Property list */}
        <main style={{ paddingBottom: 80 }}>
          {loadError && (
            <GlassSurface borderRadius={16} backgroundOpacity={0.04} style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
                Couldn&apos;t load the sample portfolio.
              </p>
              <button className="btn-primary" style={shared.button} onClick={load}>
                <Icon name="refresh" size={14} />
                Retry
              </button>
            </GlassSurface>
          )}

          {!loadError && properties === null && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}>
              <div style={shared.spinner} />
            </div>
          )}

          {properties !== null && filtered.length === 0 && (
            <GlassSurface borderRadius={16} backgroundOpacity={0.04} style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                {properties.length === 0 ? 'No properties yet. Add your first one to get started.' : 'Nothing matches these filters.'}
              </p>
            </GlassSurface>
          )}

          {properties !== null && filtered.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
                Showing {filtered.length} of {properties.length} · sorted {sort === 'address' ? 'A–Z' : sort === 'score' ? 'by score' : 'highest severity first'}
              </p>

              {view === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map(cfg => (
                    <PropertyCard key={cfg.id} cfg={cfg} hasTask={taskPropertyIds.has(cfg.id)} />
                  ))}
                </div>
              )}

              {view === 'grouped' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ALL_ALERT_LEVELS.map(level => (
                    <SeverityGroup
                      key={level}
                      label={ALERT_META[level].label}
                      hex={ALERT_META[level].hex}
                      count={groups[level].length}
                      defaultOpen={level === 'missing' || level === 'due-soon'}
                    >
                      {groups[level].map(cfg => (
                        <PropertyCard key={cfg.id} cfg={cfg} hasTask={taskPropertyIds.has(cfg.id)} />
                      ))}
                    </SeverityGroup>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AddPropertyModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </div>
  );
}

function StatCard({ label, value, hex, icon, neutralValue = false, onClick, active = false, title }: { label: string; value: number; hex: string; icon: IconName; neutralValue?: boolean; onClick?: () => void; active?: boolean; title?: string }) {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
      <div>
        <p style={shared.cardLabel}>{label}</p>
        <p style={{ ...shared.statValue, color: neutralValue || value === 0 ? '#fff' : hex }}>{value}</p>
      </div>
      <div
        aria-hidden
        style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: `${hex}1c`, border: `1px solid ${hex}30`, color: hex,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={15} />
      </div>
    </div>
  );

  // Clickable variant (e.g. the Upcoming tile toggles a filter); active shows a ring.
  const surface = (
    <GlassSurface
      borderRadius={16}
      backgroundOpacity={0.05}
      className="stat-card"
      borderColor={active ? `${hex}80` : undefined}
      style={{ padding: '15px 16px', boxShadow: active ? `0 0 0 1px ${hex}80` : undefined }}
    >
      {inner}
    </GlassSurface>
  );

  if (!onClick) return surface;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={title ?? (active ? `${label}: showing only these (click to clear)` : `Show only ${label.toLowerCase()}`)}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
    >
      {surface}
    </button>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select style={shared.select} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

