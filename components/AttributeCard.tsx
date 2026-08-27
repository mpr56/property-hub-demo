import type { CSSProperties } from 'react';
import GlassSurface from './GlassSurface';
import Icon from './Icon';
import type { IconName } from './Icon';
import StatusPill from './StatusPill';
import { shared, color } from '@/lib/tokens';
import type { PropertyConfig, TrackerType } from '@/lib/types';
import { ALERT_META, trackerAlertLevel, trackerDescribe, trackerLabel } from '@/lib/trackers';

const TRACKER_ICON: Record<TrackerType, IconName> = {
  lease: 'file-text',
  rates: 'banknote',
  water: 'droplet',
  inspection: 'search-check',
  termite: 'bug',
};

interface Props {
  cfg: PropertyConfig;
  type: TrackerType;
  onUpdate: () => void;
  style?: CSSProperties;
}

export default function AttributeCard({ cfg, type, onUpdate, style }: Props) {
  const level = trackerAlertLevel(cfg, type);
  const meta = ALERT_META[level];
  // Deliberately switched off for this property (vs. merely nothing logged yet).
  const isUntracked =
    (type === 'rates' && (cfg.ratesCategory === 'purple' || cfg.ratesExternalBill === true)) ||
    (type === 'water' && (cfg.waterCategory === 'purple' || cfg.waterExternalBill === true)) ||
    (type === 'termite' && !cfg.termiteApplicable);
  const isEmpty = level === 'none' && !isUntracked;

  return (
    <GlassSurface
      borderRadius={16}
      backgroundOpacity={0.045}
      borderColor={level === 'missing' ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.09)'}
      style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            aria-hidden
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(62,182,240,0.12)', border: '1px solid rgba(62,182,240,0.25)', color: color.skyLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name={TRACKER_ICON[type]} size={14} />
          </span>
          {trackerLabel(type)}
        </span>
        <StatusPill label={meta.label} hex={meta.hex} />
      </div>

      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 14, flex: 1 }}>
        {trackerDescribe(cfg, type)}
      </p>

      {!isUntracked && (
        <button className="btn-ghost" style={{ ...shared.buttonGhost, fontSize: 12, padding: '8px 14px', alignSelf: 'flex-start' }} onClick={onUpdate}>
          {isEmpty && <Icon name="plus" size={12} strokeWidth={2.5} />}
          {isEmpty ? 'Add entry' : 'Update'}
        </button>
      )}
    </GlassSurface>
  );
}
