import { useState } from 'react';
import type { ReactNode } from 'react';
import GlassSurface from './GlassSurface';
import Icon from './Icon';

interface Props {
  label: string;
  hex: string;
  count: number;
  defaultOpen: boolean;
  children: ReactNode;
}

export default function SeverityGroup({ label, hex, count, defaultOpen, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassSurface borderRadius={16} backgroundOpacity={0.04} style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
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
          cursor: 'pointer',
          font: 'inherit',
          borderRadius: 0,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: hex, boxShadow: `0 0 8px ${hex}90`, flexShrink: 0 }} />
          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: hex, background: `${hex}18`, border: `1px solid ${hex}35`, borderRadius: 999, padding: '1px 9px' }}>
            {count}
          </span>
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

      {open && count > 0 && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </GlassSurface>
  );
}
