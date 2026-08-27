import { useState } from 'react';
import Sheet from './Sheet';
import CategoryPicker from './CategoryPicker';
import DualKeyFields from './DualKeyFields';
import * as api from '@/lib/demo/api';
import { shared } from '@/lib/tokens';
import type { Category, DualKeyRole } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddPropertyModal({ open, onClose, onCreated }: Props) {
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [council, setCouncil] = useState('');
  const [ratesCategory, setRatesCategory] = useState<Category>('green');
  const [waterCategory, setWaterCategory] = useState<Category>('green');
  const [termiteApplicable, setTermiteApplicable] = useState(true);
  const [dwellingType, setDwellingType] = useState('House');
  const [dualKeyRole, setDualKeyRole] = useState<DualKeyRole | null>(null);
  const [dualKeyRatesShared, setDualKeyRatesShared] = useState(true);
  const [dualKeyWaterShared, setDualKeyWaterShared] = useState(false);
  const [owner, setOwner] = useState('');
  const [tenantedSince, setTenantedSince] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!address.trim()) { setError('Address is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.createProperty({
        address, suburb, council, ratesCategory, waterCategory, termiteApplicable, dwellingType,
        dualKeyRole: dwellingType === 'Dual Key' ? dualKeyRole : null,
        dualKeyRatesShared, dualKeyWaterShared,
        owner, tenantedSince: tenantedSince || null,
      });
      setAddress(''); setSuburb(''); setCouncil(''); setRatesCategory('green'); setWaterCategory('green'); setTermiteApplicable(true); setDwellingType('House'); setDualKeyRole(null); setDualKeyRatesShared(true); setDualKeyWaterShared(false); setOwner(''); setTenantedSince('');
      onCreated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Something went wrong saving this property. Try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add property">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={shared.label}>Address</label>
          <input style={shared.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Example Street, Suburb" />
        </div>
        <div className="field-row" style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={shared.label}>Suburb</label>
            <input style={shared.input} value={suburb} onChange={e => setSuburb(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={shared.label}>Dwelling type</label>
            <select style={shared.input} value={dwellingType} onChange={e => setDwellingType(e.target.value)}>
              <option>House</option>
              <option>Duplex</option>
              <option>Dual Key</option>
              <option>Unit</option>
              <option>Townhouse</option>
            </select>
          </div>
        </div>
        {dwellingType === 'Dual Key' && (
          <DualKeyFields
            role={dualKeyRole}
            onRoleChange={setDualKeyRole}
            ratesShared={dualKeyRatesShared}
            onRatesSharedChange={setDualKeyRatesShared}
            waterShared={dualKeyWaterShared}
            onWaterSharedChange={setDualKeyWaterShared}
          />
        )}

        <div>
          <label style={shared.label}>Council</label>
          <input style={shared.input} value={council} onChange={e => setCouncil(e.target.value)} />
        </div>
        <div className="field-row" style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={shared.label}>Owner (optional)</label>
            <input style={shared.input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. J. Turner" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={shared.label}>Tenanted since (optional)</label>
            <input style={shared.input} type="date" value={tenantedSince} onChange={e => setTenantedSince(e.target.value)} />
          </div>
        </div>

        <CategoryPicker label="Rates category" value={ratesCategory} onChange={setRatesCategory} />
        <CategoryPicker label="Water category" value={waterCategory} onChange={setWaterCategory} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
          <input type="checkbox" checked={termiteApplicable} onChange={e => setTermiteApplicable(e.target.checked)} />
          Termite inspections apply to this property
        </label>

        {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn-ghost" style={{ ...shared.buttonGhost, flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ ...shared.button, flex: 1, opacity: saving ? 0.6 : 1 }} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Add property'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
