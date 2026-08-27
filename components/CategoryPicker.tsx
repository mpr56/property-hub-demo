import { shared } from '@/lib/tokens';
import type { Category } from '@/lib/types';
import { CATEGORY_CONFIG } from '@/lib/types';

interface Props {
  label: string; // e.g. "Rates category" / "Water category"
  value: Category;
  onChange: (c: Category) => void;
}

/** The green/orange/purple 3-way picker, used once for rates and once for water. */
export default function CategoryPicker({ label, value, onChange }: Props) {
  return (
    <div>
      <label style={shared.label}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
          const c = CATEGORY_CONFIG[cat];
          const active = value === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              style={{
                flex: 1,
                padding: '9px 8px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: active ? `1px solid ${c.hex}` : '1px solid rgba(255,255,255,0.1)',
                background: active ? `${c.hex}22` : 'rgba(255,255,255,0.03)',
                color: active ? c.hex : 'rgba(255,255,255,0.6)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
        {CATEGORY_CONFIG[value].desc}
      </p>
    </div>
  );
}
