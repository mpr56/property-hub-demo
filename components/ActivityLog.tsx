import GlassSurface from './GlassSurface';
import type { ActivityEvent } from '@/lib/types';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ActivityLog({ events }: { events: ActivityEvent[] }) {
  const ordered = [...events].reverse();

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Activity</h2>

      {ordered.length === 0 && (
        <GlassSurface borderRadius={16} backgroundOpacity={0.04} style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Nothing logged for this property yet.</p>
        </GlassSurface>
      )}

      {ordered.length > 0 && (
        <GlassSurface borderRadius={16} backgroundOpacity={0.045} style={{ padding: '4px 18px' }}>
          {ordered.map((event, i) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{event.summary}</span>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatWhen(event.at)}</span>
            </div>
          ))}
        </GlassSurface>
      )}
    </div>
  );
}
