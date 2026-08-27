import { shared } from '@/lib/tokens';
import type { DualKeyRole } from '@/lib/types';

interface Props {
  role: DualKeyRole | null;
  onRoleChange: (r: DualKeyRole | null) => void;
  ratesShared: boolean;
  onRatesSharedChange: (v: boolean) => void;
  waterShared: boolean;
  onWaterSharedChange: (v: boolean) => void;
}

/**
 * Dual-key role picker shown in the Add/Edit property modals when the
 * dwelling type is "Dual Key". Marking a unit secondary is what silences its
 * shared-bill alerts, so the copy spells out the consequence.
 */
export default function DualKeyFields({ role, onRoleChange, ratesShared, onRatesSharedChange, waterShared, onWaterSharedChange }: Props) {
  const checkboxLabel = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(62,182,240,0.06)', border: '1px solid rgba(62,182,240,0.2)' }}>
      <div>
        <label style={shared.label}>Dual key role</label>
        <select
          style={shared.input}
          value={role ?? ''}
          onChange={e => onRoleChange((e.target.value || null) as DualKeyRole | null)}
        >
          <option value="">Not set (alerts behave as normal)</option>
          <option value="primary">Primary (notices arrive under this address)</option>
          <option value="secondary">Secondary (billed with the primary unit)</option>
        </select>
      </div>
      {role === 'secondary' && (
        <>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={ratesShared} onChange={e => onRatesSharedChange(e.target.checked)} />
            Rates billed with primary (no rates alerts for this unit)
          </label>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={waterShared} onChange={e => onWaterSharedChange(e.target.checked)} />
            Water billed with primary (no water alerts for this unit)
          </label>
        </>
      )}
    </div>
  );
}
