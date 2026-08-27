import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import CategoryPicker from './CategoryPicker';
import DualKeyFields from './DualKeyFields';
import * as api from '@/lib/demo/api';
import { shared } from '@/lib/tokens';
import type { Category, DualKeyRole, PropertyConfig } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  cfg: PropertyConfig;
  onSaved: () => void;
}

export default function EditPropertyModal({ open, onClose, cfg, onSaved }: Props) {
  const [address, setAddress] = useState(cfg.address);
  const [suburb, setSuburb] = useState(cfg.suburb);
  const [council, setCouncil] = useState(cfg.council);
  const [ratesCategory, setRatesCategory] = useState<Category>(cfg.ratesCategory);
  const [waterCategory, setWaterCategory] = useState<Category>(cfg.waterCategory);
  const [termiteApplicable, setTermiteApplicable] = useState(cfg.termiteApplicable);
  const [dwellingType, setDwellingType] = useState(cfg.dwellingType);
  const [dualKeyRole, setDualKeyRole] = useState<DualKeyRole | null>(cfg.dualKeyRole ?? null);
  const [dualKeyRatesShared, setDualKeyRatesShared] = useState(cfg.dualKeyRatesShared ?? true);
  const [dualKeyWaterShared, setDualKeyWaterShared] = useState(cfg.dualKeyWaterShared ?? false);
  const [waterExternalBill, setWaterExternalBill] = useState(cfg.waterExternalBill ?? false);
  const [waterExternalBillNote, setWaterExternalBillNote] = useState(cfg.waterExternalBillNote ?? '');
  const [ratesExternalBill, setRatesExternalBill] = useState(cfg.ratesExternalBill ?? false);
  const [ratesExternalBillNote, setRatesExternalBillNote] = useState(cfg.ratesExternalBillNote ?? '');
  const [methodOfDelivery, setMethodOfDelivery] = useState(cfg.methodOfDelivery);
  const [owner, setOwner] = useState(cfg.owner);
  const [tenantedSince, setTenantedSince] = useState(cfg.tenantedSince ?? '');
  const [dataIssue, setDataIssue] = useState(cfg.dataIssue);
  const [notes, setNotes] = useState(cfg.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAddress(cfg.address);
    setSuburb(cfg.suburb);
    setCouncil(cfg.council);
    setRatesCategory(cfg.ratesCategory);
    setWaterCategory(cfg.waterCategory);
    setTermiteApplicable(cfg.termiteApplicable);
    setDwellingType(cfg.dwellingType);
    setDualKeyRole(cfg.dualKeyRole ?? null);
    setDualKeyRatesShared(cfg.dualKeyRatesShared ?? true);
    setDualKeyWaterShared(cfg.dualKeyWaterShared ?? false);
    setWaterExternalBill(cfg.waterExternalBill ?? false);
    setWaterExternalBillNote(cfg.waterExternalBillNote ?? '');
    setRatesExternalBill(cfg.ratesExternalBill ?? false);
    setRatesExternalBillNote(cfg.ratesExternalBillNote ?? '');
    setMethodOfDelivery(cfg.methodOfDelivery);
    setOwner(cfg.owner);
    setTenantedSince(cfg.tenantedSince ?? '');
    setDataIssue(cfg.dataIssue);
    setNotes(cfg.notes);
    setError('');
  }, [open, cfg]);

  async function submit() {
    if (!address.trim()) { setError('Address is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.updateProperty(cfg.id, {
        address, suburb, council, ratesCategory, waterCategory, termiteApplicable, dwellingType,
        // Keep whatever role the picker shows; it's visible whenever set,
        // regardless of dwelling type (duplexes can share a notice too).
        dualKeyRole,
        dualKeyRatesShared, dualKeyWaterShared,
        waterExternalBill,
        waterExternalBillNote: waterExternalBill ? waterExternalBillNote : '',
        ratesExternalBill,
        ratesExternalBillNote: ratesExternalBill ? ratesExternalBillNote : '',
        methodOfDelivery, owner, tenantedSince: tenantedSince || null, dataIssue, notes,
      });
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Something went wrong saving this property. Try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit property">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={shared.label}>Address</label>
          <input style={shared.input} value={address} onChange={e => setAddress(e.target.value)} />
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
        {(dwellingType === 'Dual Key' || dualKeyRole !== null) && (
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
        <div>
          <label style={shared.label}>Method of delivery</label>
          <input style={shared.input} value={methodOfDelivery} onChange={e => setMethodOfDelivery(e.target.value)} />
        </div>
        <div className="field-row" style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={shared.label}>Owner</label>
            <input style={shared.input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. J. Turner" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={shared.label}>Tenanted since (optional)</label>
            <input style={shared.input} type="date" value={tenantedSince} onChange={e => setTenantedSince(e.target.value)} />
          </div>
        </div>

        <CategoryPicker label="Rates category" value={ratesCategory} onChange={setRatesCategory} />
        <CategoryPicker label="Water category" value={waterCategory} onChange={setWaterCategory} />

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <input type="checkbox" checked={ratesExternalBill} onChange={e => setRatesExternalBill(e.target.checked)} />
            No rates notice of its own; billed under another property
          </label>
          {ratesExternalBill && (
            <input
              style={{ ...shared.input, marginTop: 8 }}
              value={ratesExternalBillNote}
              onChange={e => setRatesExternalBillNote(e.target.value)}
              placeholder="Billed with… e.g. 1/24 Sandpiper Close"
            />
          )}
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <input type="checkbox" checked={waterExternalBill} onChange={e => setWaterExternalBill(e.target.checked)} />
            No water bill of its own; billed under another property
          </label>
          {waterExternalBill && (
            <input
              style={{ ...shared.input, marginTop: 8 }}
              value={waterExternalBillNote}
              onChange={e => setWaterExternalBillNote(e.target.value)}
              placeholder="Billed with… e.g. 62 Rosalind Way"
            />
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
          <input type="checkbox" checked={termiteApplicable} onChange={e => setTermiteApplicable(e.target.checked)} />
          Termite inspections apply to this property
        </label>

        <div>
          <label style={shared.label}>Notes</label>
          <textarea
            style={{ ...shared.input, minHeight: 60, resize: 'vertical' as const }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
          <input type="checkbox" checked={dataIssue} onChange={e => setDataIssue(e.target.checked)} />
          Flag a data issue on this property
        </label>

        {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn-ghost" style={{ ...shared.buttonGhost, flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ ...shared.button, flex: 1, opacity: saving ? 0.6 : 1 }} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
