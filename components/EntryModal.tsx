import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import Icon from './Icon';
import StatusPill from './StatusPill';
import * as api from '@/lib/demo/api';
import { shared, color } from '@/lib/tokens';
import type { InspectionEntry, InspectionResult, LeaseEntry, PropertyConfig, RatesEntry, TrackerType, WaterEntry } from '@/lib/types';
import { trackerLabel } from '@/lib/trackers';
import { entryStatus } from '@/lib/ratesLogic';

type AnyEntry = RatesEntry | WaterEntry | InspectionEntry | LeaseEntry;

interface Props {
  open: boolean;
  onClose: () => void;
  cfg: PropertyConfig;
  trackerType: TrackerType;
  mode: 'create' | 'edit';
  entry?: AnyEntry;
  onSaved: () => void;
}

const currentYear = new Date().getFullYear();
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function EntryModal({ open, onClose, cfg, trackerType, mode, entry, onSaved }: Props) {
  const isRates = trackerType === 'rates';
  const isWater = trackerType === 'water';
  const isLease = trackerType === 'lease';
  const isInspectionLike = trackerType === 'inspection' || trackerType === 'termite';
  const isEdit = mode === 'edit' && !!entry;

  const [quarterPeriod, setQuarterPeriod] = useState<RatesEntry['quarterPeriod']>('Aug');
  const [year, setYear] = useState(currentYear);
  const [dateReceived, setDateReceived] = useState('');
  const [dateForwarded, setDateForwarded] = useState('');
  const [dateChecked, setDateChecked] = useState('');
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState(false);
  const [paidDate, setPaidDate] = useState('');
  const [result, setResult] = useState<InspectionResult>('pending');
  const [completedDate, setCompletedDate] = useState('');
  const [startDate, setStartDate] = useState(''); // lease period
  const [endDate, setEndDate] = useState('');
  const [tenant, setTenant] = useState('');
  const [provider, setProvider] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (isEdit && entry) {
      const e = entry as RatesEntry & WaterEntry & InspectionEntry & LeaseEntry;
      setDueDate(e.dueDate ?? '');
      setProvider(e.provider ?? '');
      setNotes(e.notes ?? '');
      if (isLease) {
        setStartDate(e.startDate ?? '');
        setEndDate(e.endDate ?? '');
        setAmount(e.rent != null ? String(e.rent) : '');
        setTenant(e.tenant ?? '');
      } else if (isRates) {
        setQuarterPeriod(e.quarterPeriod);
        setYear(e.year);
        setAmount(e.amount != null ? String(e.amount) : '');
        setPaid(e.paid);
        setPaidDate(e.paidDate ?? '');
        setDateReceived(e.dateReceived ?? '');
        setDateForwarded(e.dateForwarded ?? '');
        setDateChecked(e.dateChecked ?? '');
      } else if (isWater) {
        setAmount(e.amount != null ? String(e.amount) : '');
        setPaid(e.paid);
        setPaidDate(e.paidDate ?? '');
        setDateReceived(e.dateReceived ?? '');
        setDateForwarded(e.dateForwarded ?? '');
        setDateChecked(e.dateChecked ?? '');
      } else {
        setResult(e.result);
        setCompletedDate(e.completedDate ?? '');
      }
    } else {
      setQuarterPeriod('Aug'); setYear(currentYear);
      setAmount(''); setPaid(false); setPaidDate('');
      setDateReceived(''); setDateForwarded(''); setDateChecked('');
      setResult('pending'); setCompletedDate('');
      setStartDate(''); setEndDate(''); setTenant('');
      setProvider(''); setDueDate(''); setNotes('');
    }
  }, [open, isEdit, entry, isRates, isWater, isLease]);

  // Rates and water share the delivery workflow, each keyed on its own category.
  const workflowCategory = isRates ? cfg.ratesCategory : isWater ? cfg.waterCategory : null;

  const derivedStatus = !isEdit || !entry || !workflowCategory
    ? null
    : entryStatus(
        { paid, dateReceived: dateReceived || null, dateForwarded: dateForwarded || null, dateChecked: dateChecked || null },
        workflowCategory
      );

  function togglePaid() {
    const next = !paid;
    setPaid(next);
    setPaidDate(next ? todayIso() : '');
  }

  async function submit() {
    if (isRates && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      setError('Year must be a whole number between 2000 and 2100.');
      return;
    }
    if ((isRates || isWater || isLease) && amount && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      setError('Amount must be a non-negative number.');
      return;
    }
    if (isLease && startDate && endDate && endDate < startDate) {
      setError('Lease end date must be on or after the start date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let body: Record<string, unknown>;
      if (isRates) {
        body = { quarterPeriod, year, amount: amount ? Number(amount) : null, provider: provider || null, dueDate: dueDate || null, notes };
        if (isEdit) Object.assign(body, { paid, paidDate: paidDate || null, dateReceived: dateReceived || null, dateForwarded: dateForwarded || null, dateChecked: dateChecked || null });
      } else if (isWater) {
        body = { amount: amount ? Number(amount) : null, provider: provider || null, dueDate: dueDate || null, notes };
        if (isEdit) Object.assign(body, { paid, paidDate: paidDate || null, dateReceived: dateReceived || null, dateForwarded: dateForwarded || null, dateChecked: dateChecked || null });
      } else if (isLease) {
        body = { startDate: startDate || null, endDate: endDate || null, rent: amount ? Number(amount) : null, tenant: tenant || null, notes };
      } else {
        body = { dueDate: dueDate || null, result, provider: provider || null, notes };
        if (isEdit) Object.assign(body, { completedDate: completedDate || null });
      }

      if (isEdit) {
        await api.updateEntry(cfg.id, trackerType, entry!.id, body);
      } else {
        await api.addEntry(cfg.id, trackerType, body);
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Something went wrong saving this entry. Try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    setSaving(true);
    setError('');
    try {
      await api.deleteEntry(cfg.id, trackerType, entry.id);
      onSaved();
      onClose();
    } catch {
      setError('Something went wrong deleting this entry. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const title = `${isEdit ? 'Update' : 'Add'} ${trackerLabel(trackerType)}`;

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -6 }}>{cfg.address}</p>

        {isRates && (
          <div className="field-row" style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={shared.label}>Quarter</label>
              <select style={shared.input} value={quarterPeriod} onChange={e => setQuarterPeriod(e.target.value as RatesEntry['quarterPeriod'])}>
                <option value="Aug">Aug</option>
                <option value="Nov">Nov</option>
                <option value="Feb">Feb</option>
                <option value="May">May</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={shared.label}>Year</label>
              <input style={shared.input} type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
          </div>
        )}

        {(isRates || isWater) && (
          <div className="field-row" style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={shared.label}>Amount ($, optional)</label>
              <input style={shared.input} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={shared.label}>Provider (optional)</label>
              <input style={shared.input} value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Blueton Water Co." />
            </div>
          </div>
        )}

        {isInspectionLike && (
          <div>
            <label style={shared.label}>Provider (optional)</label>
            <input style={shared.input} value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. inspector or company name" />
          </div>
        )}

        {isLease && (
          <>
            <div className="field-row" style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={shared.label}>Lease start</label>
                <input style={shared.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={shared.label}>Lease end</label>
                <input style={shared.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="field-row" style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={shared.label}>Rent ($/wk, optional)</label>
                <input style={shared.input} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={shared.label}>Tenant (optional)</label>
                <input style={shared.input} value={tenant} onChange={e => setTenant(e.target.value)} placeholder="e.g. tenant name" />
              </div>
            </div>
          </>
        )}

        {!isLease && (
          <div>
            <label style={shared.label}>Due date (optional)</label>
            <input style={shared.input} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        )}

        {isInspectionLike && (
          <div>
            <label style={shared.label}>Result</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['pending', 'pass', 'fail'] as InspectionResult[]).map(r => {
                const active = result === r;
                const hex = r === 'pass' ? color.green : r === 'fail' ? color.red : color.orange;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setResult(r);
                      if (r !== 'pending' && !completedDate) setCompletedDate(todayIso());
                    }}
                    style={{
                      flex: 1,
                      padding: '9px 8px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      border: active ? `1px solid ${hex}` : '1px solid rgba(255,255,255,0.1)',
                      background: active ? `${hex}22` : 'rgba(255,255,255,0.03)',
                      color: active ? hex : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isEdit && isInspectionLike && (
          <div>
            <label style={shared.label}>Completed date</label>
            <input style={shared.input} type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} />
          </div>
        )}

        {isEdit && derivedStatus && (
          <div>
            <label style={shared.label}>Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusPill label={derivedStatus.label} hex={derivedStatus.hex} />
              <button
                onClick={togglePaid}
                className="btn-ghost"
                style={{
                  ...shared.buttonGhost,
                  padding: '6px 12px',
                  fontSize: 11.5,
                  color: paid ? color.green : 'rgba(255,255,255,0.7)',
                  borderColor: paid ? `${color.green}55` : 'rgba(255,255,255,0.14)',
                }}
              >
                {paid && <Icon name="check" size={12} strokeWidth={2.5} />}
                {paid ? 'Marked paid' : 'Mark as paid'}
              </button>
            </div>
          </div>
        )}

        {isEdit && workflowCategory === 'green' && (
          <div className="field-row" style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={shared.label}>Date received</label>
              <input style={shared.input} type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={shared.label}>Date forwarded</label>
              <input style={shared.input} type="date" value={dateForwarded} onChange={e => setDateForwarded(e.target.value)} />
            </div>
          </div>
        )}

        {isEdit && workflowCategory === 'orange' && (
          <div>
            <label style={shared.label}>Date checked-in</label>
            <input style={shared.input} type="date" value={dateChecked} onChange={e => setDateChecked(e.target.value)} />
          </div>
        )}

        {isEdit && (isRates || isWater) && paidDate && (
          <div>
            <label style={shared.label}>Date paid</label>
            <input style={shared.input} type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} />
          </div>
        )}

        <div>
          <label style={shared.label}>Notes</label>
          <textarea style={{ ...shared.input, minHeight: 60, resize: 'vertical' as const }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {error && <p style={{ fontSize: 12, color: color.red }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={saving}
              style={{ ...shared.buttonGhost, color: color.red, borderColor: `${color.red}55`, opacity: saving ? 0.6 : 1 }}
            >
              Delete
            </button>
          )}
          <button className="btn-ghost" style={{ ...shared.buttonGhost, flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ ...shared.button, flex: 1, opacity: saving ? 0.6 : 1 }} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
