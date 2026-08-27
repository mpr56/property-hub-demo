import Icon from './Icon';
import { color } from '@/lib/tokens';

export type ViewMode = 'grouped' | 'list';

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: 11,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)',
        padding: 3,
        gap: 3,
        flexShrink: 0,
      }}
    >
      {(['list', 'grouped'] as ViewMode[]).map(mode => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={active ? undefined : 'tab-btn'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: active ? `linear-gradient(135deg, ${color.sky} 0%, ${color.skyDeep} 100%)` : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              boxShadow: active ? '0 2px 10px rgba(62,182,240,0.35)' : 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <Icon name={mode === 'list' ? 'list' : 'layers'} size={13} />
            {mode === 'list' ? 'List' : 'Grouped'}
          </button>
        );
      })}
    </div>
  );
}
