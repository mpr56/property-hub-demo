import Link from 'next/link';
import Icon from './Icon';
import type { IconName } from './Icon';
import type { PropertyConfig, TrackerType } from '@/lib/types';
import { trackerHistoryRows, estimatedNextWaterDue, isWaterEstimateOverdue, ratesNextInstalment, isRatesUpcoming } from '@/lib/trackers';
import { formatDate } from '@/lib/trackers/dueDate';
import { color } from '@/lib/tokens';

interface Props {
  cfg: PropertyConfig;
  type: TrackerType;
  onEditEntry: (entryId: string) => void;
  // The property this tracker's bill is billed under (resolved from the free-text
  // "billed with …" note), so the reference can render as a link to its page.
  externalRef?: { id: string; address: string } | null;
}

export default function AttributeTimeline({ cfg, type, onEditEntry, externalRef }: Props) {
  const rows = trackerHistoryRows(cfg, type);

  // A "ghost" row above the logged entries showing the projected NEXT item.
  // Water: a rough, derived estimate (can read as overdue). Rates: the next FIXED
  // council instalment (a known date — never "overdue", just rolls forward).
  const ghost = buildGhost(cfg, type);

  // Billed under another property (water OR rates) — this record never gets its own.
  const external =
    type === 'water' && cfg.waterExternalBill
      ? { noun: 'water bill', note: cfg.waterExternalBillNote?.trim(), icon: 'droplet' as IconName }
      : type === 'rates' && cfg.ratesExternalBill
        ? { noun: 'rates notice', note: cfg.ratesExternalBillNote?.trim(), icon: 'banknote' as IconName }
        : null;
  if (external) {
    return (
      <div
        style={{
          display: 'flex',
          gap: 11,
          alignItems: 'flex-start',
          padding: '13px 15px',
          borderRadius: 12,
          background: 'rgba(148,163,184,0.1)',
          border: '1px solid rgba(148,163,184,0.28)',
        }}
      >
        <span style={{ color: '#cbd5e1', flexShrink: 0, marginTop: 1 }}>
          <Icon name={external.icon} size={15} />
        </span>
        <span style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)' }}>
          <span style={{ display: 'block', fontWeight: 700, color: '#fff' }}>
            No {external.noun} of its own
          </span>
          This property doesn&apos;t receive its own {external.noun}, it&apos;s billed under another property
          {external.note ? (
            <>
              :{' '}
              {externalRef ? (
                <Link
                  href={`/property/${externalRef.id}`}
                  title={`Open ${externalRef.address}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: color.skyLight, fontWeight: 700, textDecoration: 'none' }}
                >
                  {external.note}
                  <Icon name="chevron-right" size={12} />
                </Link>
              ) : (
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{external.note}</span>
              )}
              .
            </>
          ) : '.'}
        </span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
        No history yet. Entries you add will show up here.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {ghost && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', width: '100%' }}>
          <span style={{ position: 'relative', width: 8, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            {/* Hollow dashed dot = projected, not a real logged entry */}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'transparent', border: `1.5px dashed ${ghost.hex}`, marginTop: 5, zIndex: 1 }} />
            {rows.length > 0 && (
              <span style={{ position: 'absolute', top: 15, bottom: -12, width: 2, background: 'rgba(255,255,255,0.1)' }} />
            )}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
              {ghost.title}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {ghost.subtitle}
            </span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: ghost.hex, flexShrink: 0, whiteSpace: 'nowrap', opacity: 0.85 }}>
            {ghost.badge}
          </span>
        </div>
      )}
      {rows.map((row, i) => (
        <button
          key={row.id}
          onClick={() => onEditEntry(row.id)}
          className="row-btn"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '10px 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit',
            color: 'inherit',
            width: '100%',
          }}
        >
          <span style={{ position: 'relative', width: 8, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.badgeHex, boxShadow: `0 0 6px ${row.badgeHex}80`, marginTop: 5, zIndex: 1 }} />
            {i !== rows.length - 1 && (
              <span style={{ position: 'absolute', top: 15, bottom: -12, width: 2, background: 'rgba(255,255,255,0.1)' }} />
            )}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#fff' }}>{row.title}</span>
            {row.isToday && (
              <span style={{ display: 'block', fontSize: 11.5, color: '#7CCDF6', fontWeight: 700, marginTop: 2 }}>Today</span>
            )}
            {!row.isToday && row.subtitle && (
              <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{row.subtitle}</span>
            )}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: row.badgeHex, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {row.badge}
          </span>
        </button>
      ))}
    </div>
  );
}

interface Ghost { title: string; subtitle: string; badge: string; hex: string; }

/** The projected "next up" row for a tracker, or null when there's nothing to project. */
function buildGhost(cfg: PropertyConfig, type: TrackerType): Ghost | null {
  if (type === 'water') {
    const d = estimatedNextWaterDue(cfg);
    if (!d) return null;
    const overdue = isWaterEstimateOverdue(cfg);
    return {
      title: `~ Est. next bill · ${formatDate(d)}`,
      subtitle: overdue ? 'Estimated date passed, bill not logged yet' : 'Rough estimate · ~3 months after last bill',
      badge: overdue ? 'Overdue' : 'Est.',
      hex: overdue ? color.red : color.orange,
    };
  }
  if (type === 'rates') {
    const d = ratesNextInstalment(cfg);
    if (!d) return null;
    const upcoming = isRatesUpcoming(cfg);
    return {
      title: `Next instalment · ${formatDate(d)}`,
      subtitle: 'Council rates · fixed quarterly schedule',
      badge: upcoming ? 'Due soon' : 'Upcoming',
      hex: upcoming ? color.orange : 'rgba(255,255,255,0.4)',
    };
  }
  return null;
}
