import Link from 'next/link';
import GlassSurface from './GlassSurface';
import StatusPill from './StatusPill';
import Icon from './Icon';
import { CATEGORY_CONFIG } from '@/lib/types';
import type { PropertyConfig } from '@/lib/types';
import { ALERT_META, ALL_TRACKER_TYPES, TRACKER_SHORT_LABEL, propertyAlertLevel, propertySeverityScore, trackerAlertLevel, trackerDescribe } from '@/lib/trackers';
import { color } from '@/lib/tokens';

interface Props {
  cfg: PropertyConfig;
  // True when a Google Task is linked to this property — a human-flagged to-do,
  // so the card highlights it and it counts toward "needs attention".
  hasTask?: boolean;
}

export default function PropertyCard({ cfg, hasTask = false }: Props) {
  const ratesCat = CATEGORY_CONFIG[cfg.ratesCategory];
  const waterCat = CATEGORY_CONFIG[cfg.waterCategory];
  const level = propertyAlertLevel(cfg);
  // The strong red "attention" treatment is reserved for genuinely overdue.
  // Softer oversight signals (due-soon estimate, linked task) show via the
  // severity stripe/pill and the Task chip instead — not the red pulse.
  const needsAttention = level === 'missing';
  const meta = ALERT_META[level];
  const score = Math.round(propertySeverityScore(cfg));

  return (
    <Link href={`/property/${cfg.id}`} style={{ display: 'block' }}>
      <GlassSurface
        borderRadius={16}
        backgroundOpacity={needsAttention ? 0.07 : 0.045}
        blur={14}
        borderColor={needsAttention ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.1)'}
        style={{
          transition: 'transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
          animation: needsAttention ? 'pulseGlow 2.6s ease-in-out infinite' : undefined,
        }}
        className="property-card pc-grid"
      >
        {/* Severity stripe — overall alert level drives this, not category */}
        <div className="pc-stripe" style={{ borderRadius: 4, background: meta.hex, opacity: 0.9, boxShadow: `0 0 10px ${meta.hex}50` }} />

        <div className="pc-address" style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
          {cfg.address}
        </div>

        {/* Rates & water categories are independent — show both, compactly. */}
        <div className="pc-cats">
          <StatusPill label={`Rates · ${ratesCat.shortLabel}`} hex={ratesCat.hex} />
          <StatusPill label={`Water · ${waterCat.shortLabel}`} hex={waterCat.hex} />
        </div>

        <div className="pc-meta" style={{ minWidth: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.suburb} · Score {score}</span>
          {hasTask && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: color.skyLight, background: 'rgba(62,182,240,0.12)', border: '1px solid rgba(62,182,240,0.35)', borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              <Icon name="list" size={10} />
              Task
            </span>
          )}
          {cfg.dataIssue && <StatusPill label="Data issue" hex={color.red} />}
          {/* Dual keys need a visible role: an untagged one still alerts as
              normal, so nudge until the primary/secondary call is made. Roles
              can also live on other dwelling types (some duplexes share a
              rates notice) — always show a role once set. */}
          {(cfg.dwellingType === 'Dual Key' || cfg.dualKeyRole) && (
            cfg.dualKeyRole === 'primary' ? <StatusPill label="DK · Primary" hex={color.sky} />
            : cfg.dualKeyRole === 'secondary' ? <StatusPill label="DK · Secondary" hex="#94a3b8" />
            : <StatusPill label="DK · set role" hex={color.orange} />
          )}
        </div>

        <div className="pc-level">
          <StatusPill label={meta.label} hex={meta.hex} filled={needsAttention} />
        </div>

        <div className="pc-trackers" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_TRACKER_TYPES.map(type => {
            const tLevel = trackerAlertLevel(cfg, type);
            const tMeta = ALERT_META[tLevel];
            // Bare label when there's nothing to report — a full descriptive
            // suffix on every chip for every card would bury the ones that matter.
            const bare = tLevel === 'none' || tLevel === 'ok';
            const label = bare ? TRACKER_SHORT_LABEL[type] : `${TRACKER_SHORT_LABEL[type]} · ${trackerDescribe(cfg, type)}`;
            return <StatusPill key={type} label={label} hex={tMeta.hex} />;
          })}
        </div>
      </GlassSurface>
    </Link>
  );
}
