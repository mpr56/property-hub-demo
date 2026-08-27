import { useState } from 'react';
import GlassSurface from './GlassSurface';
import Icon from './Icon';
import { shared, color } from '@/lib/tokens';
import type { AlertLevel, TrackerType } from '@/lib/types';

interface CountOption<T extends string> {
  value: T;
  label: string;
  hex?: string;
  count: number;
}

export type SortBy = 'severity' | 'score' | 'address';

interface Props {
  severityOptions: CountOption<AlertLevel>[];
  severitySelected: AlertLevel[];
  onSeverityChange: (v: AlertLevel[]) => void;
  attributeOptions: CountOption<TrackerType>[];
  attributeSelected: TrackerType[];
  onAttributeChange: (v: TrackerType[]) => void;
  sort: SortBy;
  onSortChange: (v: SortBy) => void;
  onReset: () => void;
  activeCount: number;
}

/** A single tappable pill toggle used across both filter groups. */
function Chip({ label, count, hex, active, onClick }: { label: string; count: number; hex?: string; active: boolean; onClick: () => void }) {
  const accent = hex ?? color.skyLight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="filter-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 12px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        color: active ? '#fff' : 'rgba(255,255,255,0.62)',
        background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${accent}70` : 'rgba(255,255,255,0.12)'}`,
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
      }}
    >
      {hex && <span style={{ width: 7, height: 7, borderRadius: '50%', background: hex, flexShrink: 0, boxShadow: active ? `0 0 6px ${hex}` : 'none' }} />}
      {label}
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? accent : 'rgba(255,255,255,0.4)' }}>{count}</span>
    </button>
  );
}

function ChipGroup<T extends string>({ heading, options, selected, onChange }: { heading: string; options: CountOption<T>[]; selected: T[]; onChange: (v: T[]) => void }) {
  function toggle(v: T) {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  }
  return (
    <div>
      <span style={{ ...shared.cardLabel, display: 'block', marginBottom: 8 }}>{heading}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(o => (
          <Chip key={o.value} label={o.label} count={o.count} hex={o.hex} active={selected.includes(o.value)} onClick={() => toggle(o.value)} />
        ))}
      </div>
    </div>
  );
}

export default function FiltersPanel({
  severityOptions, severitySelected, onSeverityChange,
  attributeOptions, attributeSelected, onAttributeChange,
  sort, onSortChange, onReset, activeCount,
}: Props) {
  // Collapsed on load — the search + category selects above cover the common
  // case, so the advanced filters stay tucked away until opened.
  const [open, setOpen] = useState(false);

  return (
    <GlassSurface borderRadius={16} backgroundOpacity={0.045} style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="row-btn"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
          font: 'inherit',
          borderRadius: 0,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
          <Icon name="filter" size={13} style={{ color: color.skyLight }} />
          Filters
          {activeCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7CCDF6', background: 'rgba(62,182,240,0.15)', border: '1px solid rgba(62,182,240,0.3)', borderRadius: 999, padding: '1px 8px' }}>
              {activeCount}
            </span>
          )}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.45)',
            display: 'inline-flex',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        >
          <Icon name="chevron-down" size={15} />
        </span>
      </button>

      {open && (
        <div style={{ padding: '16px 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ChipGroup heading="Severity" options={severityOptions} selected={severitySelected} onChange={v => onSeverityChange(v as AlertLevel[])} />
          <ChipGroup heading="Show issues in" options={attributeOptions} selected={attributeSelected} onChange={v => onAttributeChange(v as TrackerType[])} />

          <div className="filter-foot" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
            <div>
              <label style={{ ...shared.cardLabel, display: 'block', marginBottom: 6 }}>Sort by</label>
              <select style={shared.select} value={sort} onChange={e => onSortChange(e.target.value as SortBy)}>
                <option value="severity">Severity (high→low)</option>
                <option value="score">Score (high→low)</option>
                <option value="address">Address (A→Z)</option>
              </select>
            </div>
            <button className="btn-ghost" style={{ ...shared.buttonGhost, fontSize: 12, padding: '9px 14px', opacity: activeCount > 0 ? 1 : 0.5 }} onClick={onReset} disabled={activeCount === 0}>
              <Icon name="x" size={12} />
              Reset filters
            </button>
          </div>
        </div>
      )}
    </GlassSurface>
  );
}
