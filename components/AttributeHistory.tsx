import { useEffect, useState } from 'react';
import GlassSurface from './GlassSurface';
import Icon from './Icon';
import AttributeTimeline from './AttributeTimeline';
import type { PropertyConfig, TrackerType } from '@/lib/types';
import { ALL_TRACKER_TYPES, trackerHistoryRows, trackerLabel } from '@/lib/trackers';

interface Props {
  cfg: PropertyConfig;
  activeTab: TrackerType;
  onActiveTabChange: (type: TrackerType) => void;
  onEditEntry: (type: TrackerType, entryId: string) => void;
  // Resolved "billed under" property per tracker (rates/water), so the timeline
  // can link the reference through to that property.
  externalRefs?: Partial<Record<TrackerType, { id: string; address: string } | null>>;
}

export default function AttributeHistory({ cfg, activeTab, onActiveTabChange, onEditEntry, externalRefs }: Props) {
  // Independent of the URL-synced `activeTab` — lets multiple mobile accordion rows
  // stay open at once instead of behaving like exclusive tabs.
  const [openMobile, setOpenMobile] = useState<Set<TrackerType>>(() => new Set([activeTab]));

  // Keep whichever tab the URL/desktop resolves to included in the open set,
  // without clobbering any other rows the user has separately expanded on mobile.
  useEffect(() => {
    setOpenMobile(prev => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  function toggleMobile(type: TrackerType) {
    setOpenMobile(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
    onActiveTabChange(type);
  }

  return (
    <GlassSurface borderRadius={16} backgroundOpacity={0.045} style={{ padding: 0, overflow: 'hidden' }}>
      {/* Desktop: exclusive tab bar + single timeline panel */}
      <div className="tabs-only" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {ALL_TRACKER_TYPES.map(type => (
          <button
            key={type}
            onClick={() => onActiveTabChange(type)}
            className="tab-btn"
            style={{
              flex: 1,
              padding: '14px 12px',
              background: activeTab === type ? 'rgba(62,182,240,0.07)' : 'none',
              border: 'none',
              borderBottom: activeTab === type ? '2px solid #3EB6F0' : '2px solid transparent',
              color: activeTab === type ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {trackerLabel(type)}
          </button>
        ))}
      </div>
      <div className="tabs-only" style={{ padding: '4px 18px 18px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: '14px 0 4px' }}>
          History — {trackerLabel(activeTab)}
        </p>
        <AttributeTimeline cfg={cfg} type={activeTab} onEditEntry={entryId => onEditEntry(activeTab, entryId)} externalRef={externalRefs?.[activeTab]} />
      </div>

      {/* Mobile: independently toggleable accordion rows */}
      <div className="accordion-only">
        {ALL_TRACKER_TYPES.map((type, i) => {
          const rows = trackerHistoryRows(cfg, type);
          const open = openMobile.has(type);
          return (
            <div key={type} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => toggleMobile(type)}
                aria-expanded={open}
                className="row-btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{trackerLabel(type)} — {rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    display: 'inline-flex',
                    transform: open ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <Icon name="chevron-right" size={15} />
                </span>
              </button>
              {open && (
                <div style={{ padding: '0 18px 14px' }}>
                  <AttributeTimeline cfg={cfg} type={type} onEditEntry={entryId => onEditEntry(type, entryId)} externalRef={externalRefs?.[type]} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassSurface>
  );
}
