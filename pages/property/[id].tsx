import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SilkBackground, { SILK_BRAND_COLOR, SILK_STATUS_COLOR } from '@/components/SilkBackground';
import { useBackgroundMode } from '@/lib/useBackgroundMode';
import GlassSurface from '@/components/GlassSurface';
import Icon from '@/components/Icon';
import StatusPill from '@/components/StatusPill';
import AttributeGrid from '@/components/AttributeGrid';
import AttributeHistory from '@/components/AttributeHistory';
import EntryModal from '@/components/EntryModal';
import EditPropertyModal from '@/components/EditPropertyModal';
import ActivityLog from '@/components/ActivityLog';
import TasksWidget from '@/components/TasksWidget';
import * as api from '@/lib/demo/api';
import { shared, color } from '@/lib/tokens';
import type { PropertyConfig, PropertySummary, TrackerType } from '@/lib/types';
import { ALERT_META, ALL_TRACKER_TYPES, propertyAlertLevel, propertySeverityScore } from '@/lib/trackers';
import { formatMonthYear } from '@/lib/trackers/dueDate';
import { matchPropertyByText } from '@/lib/taskLinking';

type EntryModalState = { type: TrackerType; mode: 'create' | 'edit'; entryId?: string } | null;

function isValidTrackerType(v: unknown): v is TrackerType {
  return typeof v === 'string' && (ALL_TRACKER_TYPES as string[]).includes(v);
}

export default function PropertyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [cfg, setCfg] = useState<PropertyConfig | null>(null);
  // Lightweight summaries of every property, used to resolve a free-text
  // "billed under 17 Ryan" note to the actual property so it can link through.
  const [allProps, setAllProps] = useState<PropertySummary[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [entryModal, setEntryModal] = useState<EntryModalState>(null);
  const [activeTab, setActiveTab] = useState<TrackerType>('rates');

  async function load() {
    if (typeof id !== 'string') return;
    setLoadError(false);
    try {
      const found = await api.getProperty(id);
      if (!found) { setNotFound(true); return; }
      setCfg(found);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => { load(); }, [id]);

  // The address book — best-effort; the reference just stays plain text if it
  // fails or the note doesn't resolve to a property.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summaries = await api.listSummaries();
        if (!cancelled) setAllProps(summaries);
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Resolve the rates/water "billed with …" notes to real properties (excluding
  // this one) so the reference in the timeline can link through.
  const externalRefs = useMemo(() => {
    if (!cfg) return {};
    const others = allProps.filter(p => p.id !== cfg.id);
    const resolve = (note?: string) => {
      const t = note?.trim();
      return t ? matchPropertyByText(t, others) : null;
    };
    return {
      rates: cfg.ratesExternalBill ? resolve(cfg.ratesExternalBillNote) : null,
      water: cfg.waterExternalBill ? resolve(cfg.waterExternalBillNote) : null,
    };
  }, [cfg, allProps]);

  // Hydrate the active history tab from the URL once the router is ready (query is
  // {} pre-hydration), so a direct link like ?tab=termite opens on the right tab.
  useEffect(() => {
    if (!router.isReady) return;
    if (isValidTrackerType(router.query.tab)) setActiveTab(router.query.tab);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  function changeTab(type: TrackerType) {
    setActiveTab(type);
    if (!router.isReady) return;
    router.replace({ pathname: router.pathname, query: { ...router.query, tab: type } }, undefined, { shallow: true });
  }

  function openCreate(type: TrackerType) {
    setEntryModal({ type, mode: 'create' });
  }

  function openEdit(type: TrackerType, entryId: string) {
    setEntryModal({ type, mode: 'edit', entryId });
  }

  const activeEntry = cfg && entryModal?.mode === 'edit' && entryModal.entryId
    ? cfg.attributes.trackers[entryModal.type]?.entries.find(e => e.id === entryModal.entryId)
    : undefined;

  // Same background mode as the dashboard (toggled there via the logo); in
  // status mode the tint follows this property's own alert level.
  const [bgMode] = useBackgroundMode();
  const level = cfg ? propertyAlertLevel(cfg) : 'none';
  const bgColor = bgMode === 'status' && cfg
    ? SILK_STATUS_COLOR[level === 'none' ? 'neutral' : level]
    : SILK_BRAND_COLOR;

  return (
    <div style={shared.page}>
      <div style={shared.bgLayer}><SilkBackground color={bgColor} /></div>

      {/* Sticky nav bar — always visible, never scrolls out of view */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(5,7,15,0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="page-inner" style={{ ...shared.inner, paddingTop: 12, paddingBottom: 12 }}>
          <BackButton />
        </div>
      </div>

      <div className="page-inner" style={shared.inner}>
        <div style={{ paddingTop: 28 }}>
          {notFound && (
            <GlassSurface borderRadius={16} backgroundOpacity={0.04} style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Property not found.</p>
            </GlassSurface>
          )}

          {!notFound && loadError && !cfg && (
            <GlassSurface borderRadius={16} backgroundOpacity={0.04} style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
                Couldn&apos;t load this property.
              </p>
              <button className="btn-primary" style={shared.button} onClick={load}>
                <Icon name="refresh" size={14} />
                Retry
              </button>
            </GlassSurface>
          )}

          {!notFound && !loadError && !cfg && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}>
              <div style={shared.spinner} />
            </div>
          )}

          {cfg && (
            <>
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <p style={shared.eyebrow}>Property</p>
                  <div className="header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn-ghost" style={shared.buttonGhost} onClick={() => setEditOpen(true)}>
                      <Icon name="edit" size={13} />
                      Edit details
                    </button>
                  </div>
                </div>
                <h1 style={{ fontSize: 'clamp(26px, 7vw, 40px)', fontWeight: 700, marginTop: 6, lineHeight: 1.12, overflowWrap: 'break-word' }}>
                  {cfg.address}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <StatusPill
                    label={`Score ${Math.round(propertySeverityScore(cfg))}: ${ALERT_META[propertyAlertLevel(cfg)].label}`}
                    hex={ALERT_META[propertyAlertLevel(cfg)].hex}
                  />
                  {cfg.dataIssue && <StatusPill label="Data issue flagged" hex="#f87171" />}
                  {(cfg.dwellingType === 'Dual Key' || cfg.dualKeyRole) && (
                    cfg.dualKeyRole === 'primary' ? <StatusPill label="Dual key · Primary (notices arrive here)" hex={color.sky} />
                    : cfg.dualKeyRole === 'secondary' ? <StatusPill label="Dual key · Billed with primary" hex="#94a3b8" />
                    : <StatusPill label="Dual key · role not set" hex={color.orange} />
                  )}
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 12 }}>
                  {cfg.suburb} · {cfg.council} · {cfg.dwellingType}
                  {cfg.methodOfDelivery && ` · ${cfg.methodOfDelivery}`}
                  {cfg.owner && ` · Owner: ${cfg.owner}`}
                  {cfg.tenantedSince && ` · Tenanted since ${formatMonthYear(cfg.tenantedSince)}`}
                </p>
                {cfg.notes && (
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginTop: 8, maxWidth: 560 }}>{cfg.notes}</p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <AttributeGrid cfg={cfg} onUpdate={openCreate} />
              </div>

              {/* Google Tasks mentioning this address (hidden when not configured) */}
              <TasksWidget propertyId={cfg.id} />

              <div style={{ marginBottom: 32 }}>
                <AttributeHistory cfg={cfg} activeTab={activeTab} onActiveTabChange={changeTab} onEditEntry={openEdit} externalRefs={externalRefs} />
              </div>

              <div style={{ paddingBottom: 32 }}>
                <ActivityLog events={cfg.activity} />
              </div>

              <div style={{ paddingBottom: 80 }}>
                <BackButton />
              </div>

              <EditPropertyModal open={editOpen} onClose={() => setEditOpen(false)} cfg={cfg} onSaved={load} />

              <EntryModal
                open={!!entryModal}
                onClose={() => setEntryModal(null)}
                cfg={cfg}
                trackerType={entryModal?.type ?? 'rates'}
                mode={entryModal?.mode ?? 'create'}
                entry={activeEntry}
                onSaved={load}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BackButton() {
  return (
    <Link
      href="/"
      className="btn-ghost"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.85)',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 999,
        padding: '9px 16px',
      }}
    >
      <Icon name="arrow-left" size={14} />
      Back to portfolio
    </Link>
  );
}
