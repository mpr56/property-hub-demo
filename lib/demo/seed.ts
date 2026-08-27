import type {
  ActivityEvent, InspectionEntry, LeaseEntry, PropertyConfig, RatesEntry, WaterEntry,
} from '../types';
import { days, months, stamp } from './dates';

// ─────────────────────────────────────────────────────────────────────────
// The demo portfolio: 15 fictional properties, rebuilt from scratch on every
// page load (see lib/storage.ts). Nothing here is real — addresses, councils,
// owners and tenants are all invented.
//
// The set is composed so the dashboard opens with every feature visibly in
// play rather than a wall of green:
//
//   Needs attention (red)  overdue rates · failed termite · expired lease
//   Needs oversight        lease renewals · water bill projected due · a
//                          pending inspection · an open linked task
//   Leases expiring        one expired, two inside the 3-month window
//   plus                   all 3 billing categories, a dual-key pair, an
//                          externally-billed property, a flagged data issue,
//                          and properties with termite tracking switched off
//
// Alert levels are derived, never stored — see lib/trackers/. Getting a
// property into a given state means giving it entries that *earn* that state,
// which is why the tracker semantics matter below:
//
//   rates      latest = highest quarter (year + Feb<May<Aug<Nov)
//   water      latest = EARLIEST due date (most-overdue-first), so a paid
//   inspection older entry outranks a newer unpaid one. Anything meant to
//   termite    drive the alert is therefore the sole or earliest-dated entry.
//   lease      current = latest end date
// ─────────────────────────────────────────────────────────────────────────

let seq = 0;
const uid = (prefix: string) => `demo-${prefix}-${++seq}`;

// ─── Rates quarters, derived from today ──────────────────────────────────
// NSW councils bill Feb / May / Aug / Nov. Which quarter is "current" depends
// on when the demo is opened, so it's computed rather than hard-coded.

type Quarter = { quarterPeriod: RatesEntry['quarterPeriod']; year: number };
const QUARTER_ORDER: RatesEntry['quarterPeriod'][] = ['Feb', 'May', 'Aug', 'Nov'];

function currentQuarter(): Quarter {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  if (m <= 2) return { quarterPeriod: 'Feb', year: y };
  if (m <= 5) return { quarterPeriod: 'May', year: y };
  if (m <= 8) return { quarterPeriod: 'Aug', year: y };
  if (m <= 11) return { quarterPeriod: 'Nov', year: y };
  return { quarterPeriod: 'Feb', year: y + 1 };
}

function previousQuarter(q: Quarter): Quarter {
  const i = QUARTER_ORDER.indexOf(q.quarterPeriod);
  return i === 0
    ? { quarterPeriod: 'Nov', year: q.year - 1 }
    : { quarterPeriod: QUARTER_ORDER[i - 1], year: q.year };
}

const THIS_Q = currentQuarter();
const LAST_Q = previousQuarter(THIS_Q);

// ─── Entry builders ──────────────────────────────────────────────────────

function ratesEntry(q: Quarter, o: Partial<RatesEntry> = {}): RatesEntry {
  return {
    id: uid('rates'),
    quarterPeriod: q.quarterPeriod,
    year: q.year,
    amount: null,
    provider: null,
    dueDate: null,
    dateReceived: null,
    dateForwarded: null,
    dateChecked: null,
    paid: false,
    paidDate: null,
    notes: '',
    createdAt: stamp(70),
    updatedAt: stamp(40),
    ...o,
  };
}

function waterEntry(o: Partial<WaterEntry> = {}): WaterEntry {
  return {
    id: uid('water'),
    dueDate: null,
    amount: null,
    provider: 'Hunter Water',
    dateReceived: null,
    dateForwarded: null,
    dateChecked: null,
    paid: false,
    paidDate: null,
    notes: '',
    createdAt: stamp(70),
    updatedAt: stamp(40),
    ...o,
  };
}

function leaseEntry(o: Partial<LeaseEntry> = {}): LeaseEntry {
  return {
    id: uid('lease'),
    startDate: null,
    endDate: null,
    rent: null,
    tenant: null,
    notes: '',
    createdAt: stamp(300),
    updatedAt: stamp(300),
    ...o,
  };
}

function inspectionEntry(o: Partial<InspectionEntry> = {}): InspectionEntry {
  return {
    id: uid('insp'),
    dueDate: null,
    completedDate: null,
    result: 'pending',
    provider: null,
    notes: '',
    createdAt: stamp(120),
    updatedAt: stamp(90),
    ...o,
  };
}

function activity(daysAgo: number, summary: string, trackerType?: ActivityEvent['trackerType']): ActivityEvent {
  return { id: uid('act'), at: stamp(daysAgo, 10, 15), trackerType, summary };
}

// ─── Property builder ────────────────────────────────────────────────────

type PropertyInput =
  Partial<Omit<PropertyConfig, 'attributes' | 'activity'>>
  & Pick<PropertyConfig, 'id' | 'address' | 'suburb'>
  & {
    lease?: LeaseEntry[];
    rates?: RatesEntry[];
    water?: WaterEntry[];
    inspection?: InspectionEntry[];
    termite?: InspectionEntry[];
    activity?: ActivityEvent[];
  };

function property(input: PropertyInput): PropertyConfig {
  const { lease, rates, water, inspection, termite, activity: acts, ...rest } = input;
  return {
    council: 'Kellerton Shire Council',
    ratesCategory: 'green',
    waterCategory: 'green',
    termiteApplicable: true,
    dwellingType: 'House',
    dualKeyRole: null,
    methodOfDelivery: 'Post',
    owner: '',
    tenantedSince: null,
    dataIssue: false,
    notes: '',
    createdAt: stamp(400),
    ...rest,
    attributes: {
      trackers: {
        lease: { entries: lease ?? [] },
        rates: { entries: rates ?? [] },
        water: { entries: water ?? [] },
        inspection: { entries: inspection ?? [] },
        termite: { entries: termite ?? [] },
      },
    },
    activity: acts ?? [],
  };
}

// ─── The portfolio ───────────────────────────────────────────────────────

export function buildSeedProperties(): PropertyConfig[] {
  return [
    // ── 1. NEEDS ATTENTION — rates instalment overdue, already forwarded ──
    property({
      id: 'harrowgate-12',
      address: '12 Harrowgate Street, Kellerton',
      suburb: 'Kellerton',
      owner: 'R. Vandermeer',
      tenantedSince: months(-26),
      notes: 'Owner prefers email for anything urgent; posts arrive slowly to the PO box.',
      rates: [
        ratesEntry(LAST_Q, { amount: 612, paid: true, paidDate: days(-104), dueDate: days(-110), dateReceived: days(-130), dateForwarded: days(-126) }),
        ratesEntry(THIS_Q, { amount: 648, dueDate: days(-12), dateReceived: days(-38), dateForwarded: days(-33) }),
      ],
      water: [waterEntry({ amount: 214, dueDate: days(-40), paid: true, paidDate: days(-44), dateReceived: days(-62), dateForwarded: days(-58) })],
      lease: [leaseEntry({ startDate: months(-10), endDate: months(10), rent: 640, tenant: 'D. & K. Alderton' })],
      inspection: [inspectionEntry({ dueDate: days(-65), completedDate: days(-60), result: 'pass', provider: 'Kellerton Property Services' })],
      termite: [inspectionEntry({ dueDate: days(-200), completedDate: days(-198), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [
        activity(38, `Set date received for ${THIS_Q.quarterPeriod} ${THIS_Q.year}`, 'rates'),
        activity(33, `Set date forwarded for ${THIS_Q.quarterPeriod} ${THIS_Q.year}`, 'rates'),
        activity(12, 'Updated notes'),
      ],
    }),

    // ── 2. NEEDS ATTENTION — failed termite inspection ───────────────────
    property({
      id: 'kestrel-4',
      address: '4 Kestrel Avenue, Bellmont Rise',
      suburb: 'Bellmont Rise',
      council: 'Bellmont Rise City Council',
      dwellingType: 'Duplex',
      owner: 'Hollowfield Holdings',
      tenantedSince: months(-14),
      notes: 'Subfloor access is via the rear laundry hatch.',
      rates: [
        ratesEntry(LAST_Q, { amount: 540, paid: true, paidDate: days(-100), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 556, paid: true, paidDate: days(-9), dueDate: days(-4), dateReceived: days(-30), dateForwarded: days(-27) }),
      ],
      water: [waterEntry({ amount: 188, dueDate: days(-33), paid: true, paidDate: days(-35) })],
      lease: [leaseEntry({ startDate: months(-14), endDate: months(7), rent: 585, tenant: 'M. Achterberg' })],
      inspection: [inspectionEntry({ dueDate: days(-80), completedDate: days(-77), result: 'pass', provider: 'Bellmont Inspections' })],
      // Sole termite entry, so it is unambiguously the one driving the alert.
      termite: [inspectionEntry({ dueDate: days(-10), completedDate: days(-8), result: 'fail', provider: 'Barrier Pest Control', notes: 'Active workings found in the rear fence line. Treatment quote requested.' })],
      activity: [
        activity(8, 'Marked termite inspection as fail', 'termite'),
        activity(9, `Marked ${THIS_Q.quarterPeriod} ${THIS_Q.year} as paid`, 'rates'),
      ],
    }),

    // ── 3. NEEDS ATTENTION — lease expired + water bill overdue ──────────
    property({
      id: 'ferngully-28',
      address: '28 Ferngully Road, Marrowbrook',
      suburb: 'Marrowbrook',
      council: 'Marrowbrook Council',
      ratesCategory: 'orange',
      waterCategory: 'orange',
      owner: 'T. Brightwater',
      tenantedSince: months(-38),
      notes: 'Owner handles council and water directly — we check in rather than forward.',
      rates: [
        ratesEntry(LAST_Q, { amount: 498, paid: true, paidDate: days(-98), dueDate: days(-110), dateChecked: days(-105) }),
        ratesEntry(THIS_Q, { amount: 512, paid: true, paidDate: days(-6), dueDate: days(-4), dateChecked: days(-15) }),
      ],
      // Sole water entry — an unpaid, overdue bill the owner hasn't confirmed.
      water: [waterEntry({ amount: 240, dueDate: days(-6), provider: 'Marrowbrook Water', dateChecked: days(-20) })],
      lease: [
        leaseEntry({ startDate: months(-24), endDate: months(-12), rent: 520, tenant: 'S. Okonkwo', createdAt: stamp(730) }),
        leaseEntry({ startDate: months(-12), endDate: days(-15), rent: 545, tenant: 'S. Okonkwo' }),
      ],
      inspection: [inspectionEntry({ dueDate: days(-45), completedDate: days(-43), result: 'pass', provider: 'Marrowbrook Realty' })],
      termite: [inspectionEntry({ dueDate: days(-160), completedDate: days(-158), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [
        activity(20, 'Set water bill date checked-in', 'water'),
        activity(15, 'Rent agreement reached its end date', 'lease'),
      ],
    }),

    // ── 4. OVERSIGHT — lease renewal window (~2.5 months out) ────────────
    property({
      id: 'coppersmith-9',
      address: '9 Coppersmith Lane, Kellerton',
      suburb: 'Kellerton',
      owner: 'R. Vandermeer',
      tenantedSince: months(-20),
      rates: [
        ratesEntry(LAST_Q, { amount: 588, paid: true, paidDate: days(-102), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 601, paid: true, paidDate: days(-7), dueDate: days(-4), dateReceived: days(-29), dateForwarded: days(-26) }),
      ],
      water: [
        waterEntry({ amount: 172, dueDate: days(-101), paid: true, paidDate: days(-104) }),
        waterEntry({ amount: 181, dueDate: days(-9), paid: true, paidDate: days(-12) }),
      ],
      lease: [leaseEntry({ startDate: months(-12), endDate: days(75), rent: 610, tenant: 'J. Marchetti' })],
      inspection: [inspectionEntry({ dueDate: days(-55), completedDate: days(-52), result: 'pass', provider: 'Kellerton Property Services' })],
      termite: [inspectionEntry({ dueDate: days(-220), completedDate: days(-218), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(12, 'Marked water bill as paid', 'water')],
    }),

    // ── 5. OVERSIGHT — lease renewal window + flagged data issue ─────────
    property({
      id: 'palladine-17',
      address: '17 Palladine Court, Bellmont Rise',
      suburb: 'Bellmont Rise',
      council: 'Bellmont Rise City Council',
      dwellingType: 'Townhouse',
      owner: 'Hollowfield Holdings',
      tenantedSince: months(-31),
      dataIssue: true,
      notes: 'Council record still lists the previous owner — rates notices arrive misaddressed. Chasing an update.',
      rates: [
        ratesEntry(LAST_Q, { amount: 470, paid: true, paidDate: days(-99), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 470, paid: true, paidDate: days(-11), dueDate: days(-4), dateReceived: days(-35), dateForwarded: days(-31), notes: 'Arrived addressed to the previous owner again.' }),
      ],
      water: [
        waterEntry({ amount: 155, dueDate: days(-96), paid: true, paidDate: days(-99) }),
        waterEntry({ amount: 163, dueDate: days(-5), paid: true, paidDate: days(-7) }),
      ],
      lease: [leaseEntry({ startDate: months(-12), endDate: days(80), rent: 560, tenant: 'P. Lindqvist' })],
      inspection: [inspectionEntry({ dueDate: days(-70), completedDate: days(-68), result: 'pass', provider: 'Bellmont Inspections' })],
      termite: [inspectionEntry({ dueDate: days(-240), completedDate: days(-238), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [
        activity(31, `Set date forwarded for ${THIS_Q.quarterPeriod} ${THIS_Q.year}`, 'rates'),
        activity(30, 'Updated dataIssue, notes'),
      ],
    }),

    // ── 6. OVERSIGHT — next water bill projected due within the window ───
    property({
      id: 'winterbourne-51',
      address: '51 Winterbourne Drive, Marrowbrook',
      suburb: 'Marrowbrook',
      council: 'Marrowbrook Council',
      owner: 'A. Feodorov',
      tenantedSince: months(-44),
      rates: [
        ratesEntry(LAST_Q, { amount: 533, paid: true, paidDate: days(-106), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 549, paid: true, paidDate: days(-8), dueDate: days(-4), dateReceived: days(-28), dateForwarded: days(-25) }),
      ],
      // Newest bill anchors the 13-week projection → next one lands ~1 week out.
      water: [
        waterEntry({ amount: 198, dueDate: days(-175), paid: true, paidDate: days(-178), provider: 'Marrowbrook Water' }),
        waterEntry({ amount: 205, dueDate: days(-84), paid: true, paidDate: days(-87), provider: 'Marrowbrook Water' }),
      ],
      lease: [leaseEntry({ startDate: months(-8), endDate: months(16), rent: 575, tenant: 'H. Nakamura' })],
      inspection: [inspectionEntry({ dueDate: days(-90), completedDate: days(-88), result: 'pass', provider: 'Marrowbrook Realty' })],
      termite: [inspectionEntry({ dueDate: days(-300), completedDate: days(-297), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(87, 'Marked water bill as paid', 'water')],
    }),

    // ── 7. OVERSIGHT — routine inspection due inside the 14-day window ───
    property({
      id: 'ashgrove-3',
      address: '3 Ashgrove Terrace, Halloway Park',
      suburb: 'Halloway Park',
      council: 'Halloway Park Council',
      dwellingType: 'Unit',
      owner: 'C. Ravensdale',
      tenantedSince: months(-9),
      rates: [
        ratesEntry(LAST_Q, { amount: 410, paid: true, paidDate: days(-101), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 422, paid: true, paidDate: days(-10), dueDate: days(-4), dateReceived: days(-32), dateForwarded: days(-29) }),
      ],
      water: [waterEntry({ amount: 141, dueDate: days(-20), paid: true, paidDate: days(-23), provider: 'Halloway Water' })],
      lease: [leaseEntry({ startDate: months(-9), endDate: months(15), rent: 495, tenant: 'E. Sørensen' })],
      // Sole inspection entry: pending, due just inside the two-week window.
      inspection: [inspectionEntry({ dueDate: days(9), result: 'pending', provider: 'Halloway Property Group' })],
      termite: [inspectionEntry({ dueDate: days(-150), completedDate: days(-148), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(21, 'Added inspection report entry', 'inspection')],
    }),

    // ── 8. OVERSIGHT via an open linked task (otherwise entirely healthy) ─
    property({
      id: 'rosalind-62',
      address: '62 Rosalind Way, Halloway Park',
      suburb: 'Halloway Park',
      council: 'Halloway Park Council',
      owner: 'C. Ravensdale',
      tenantedSince: months(-52),
      notes: 'Shared water meter serves 8 Marlowe Street — reading is split manually each quarter.',
      rates: [
        ratesEntry(LAST_Q, { amount: 505, paid: true, paidDate: days(-103), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 517, paid: true, paidDate: days(-13), dueDate: days(-4), dateReceived: days(-34), dateForwarded: days(-30) }),
      ],
      water: [
        waterEntry({ amount: 226, dueDate: days(-108), paid: true, paidDate: days(-110), provider: 'Halloway Water' }),
        waterEntry({ amount: 233, dueDate: days(-17), paid: true, paidDate: days(-19), provider: 'Halloway Water' }),
      ],
      lease: [leaseEntry({ startDate: months(-4), endDate: months(20), rent: 600, tenant: 'G. Whitlock' })],
      inspection: [inspectionEntry({ dueDate: days(-40), completedDate: days(-38), result: 'pass', provider: 'Halloway Property Group' })],
      termite: [inspectionEntry({ dueDate: days(-180), completedDate: days(-178), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(19, 'Marked water bill as paid', 'water')],
    }),

    // ── 9. Dual-key PRIMARY — both notices arrive here ───────────────────
    property({
      id: 'sandpiper-24-1',
      address: '1/24 Sandpiper Close, Kellerton',
      suburb: 'Kellerton',
      dwellingType: 'Dual Key',
      dualKeyRole: 'primary',
      owner: 'N. Ellery',
      tenantedSince: months(-18),
      notes: 'One rates notice and one water bill cover both halves of the block.',
      rates: [
        ratesEntry(LAST_Q, { amount: 720, paid: true, paidDate: days(-105), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 738, paid: true, paidDate: days(-14), dueDate: days(-4), dateReceived: days(-36), dateForwarded: days(-32) }),
      ],
      water: [
        waterEntry({ amount: 264, dueDate: days(-112), paid: true, paidDate: days(-115) }),
        waterEntry({ amount: 271, dueDate: days(-21), paid: true, paidDate: days(-24) }),
      ],
      lease: [leaseEntry({ startDate: months(-18), endDate: months(6), rent: 480, tenant: 'L. Brannigan' })],
      inspection: [inspectionEntry({ dueDate: days(-50), completedDate: days(-48), result: 'pass', provider: 'Kellerton Property Services' })],
      termite: [inspectionEntry({ dueDate: days(-260), completedDate: days(-258), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(32, `Set date forwarded for ${THIS_Q.quarterPeriod} ${THIS_Q.year}`, 'rates')],
    }),

    // ── 10. Dual-key SECONDARY — rates & water suppressed, lease its own ─
    property({
      id: 'sandpiper-24-2',
      address: '2/24 Sandpiper Close, Kellerton',
      suburb: 'Kellerton',
      dwellingType: 'Dual Key',
      dualKeyRole: 'secondary',
      dualKeyRatesShared: true,
      dualKeyWaterShared: true,
      owner: 'N. Ellery',
      tenantedSince: months(-6),
      notes: 'Billed under 1/24 Sandpiper Close — tracked there, silent here.',
      lease: [leaseEntry({ startDate: months(-6), endDate: months(18), rent: 455, tenant: 'Y. Abebe' })],
      inspection: [inspectionEntry({ dueDate: days(-50), completedDate: days(-48), result: 'pass', provider: 'Kellerton Property Services' })],
      termite: [inspectionEntry({ dueDate: days(-260), completedDate: days(-258), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(180, 'Property created')],
    }),

    // ── 11. Water billed under ANOTHER property (resolves to #8 by text) ─
    property({
      id: 'marlowe-8',
      address: '8 Marlowe Street, Halloway Park',
      suburb: 'Halloway Park',
      council: 'Halloway Park Council',
      waterExternalBill: true,
      waterExternalBillNote: '62 Rosalind Way',
      owner: 'C. Ravensdale',
      tenantedSince: months(-28),
      notes: 'No separate water meter — the bill arrives against 62 Rosalind Way.',
      rates: [
        ratesEntry(LAST_Q, { amount: 445, paid: true, paidDate: days(-107), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 459, paid: true, paidDate: days(-15), dueDate: days(-4), dateReceived: days(-33), dateForwarded: days(-31) }),
      ],
      lease: [leaseEntry({ startDate: months(-4), endDate: months(20), rent: 530, tenant: 'R. Adeyemi' })],
      inspection: [inspectionEntry({ dueDate: days(-35), completedDate: days(-33), result: 'pass', provider: 'Halloway Property Group' })],
      termite: [inspectionEntry({ dueDate: days(-210), completedDate: days(-208), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(60, 'Updated waterExternalBill, waterExternalBillNote')],
    }),

    // ── 12. Not tracked at all (purple) + termite N/A + periodic lease ───
    property({
      id: 'verity-40',
      address: '40 Verity Grove, Marrowbrook',
      suburb: 'Marrowbrook',
      council: 'Marrowbrook Council',
      ratesCategory: 'purple',
      waterCategory: 'purple',
      termiteApplicable: false,
      dwellingType: 'Unit',
      owner: 'Marrowbrook Strata 4471',
      tenantedSince: months(-62),
      notes: 'Strata covers rates and water; brick construction on slab, so no termite programme.',
      // Open-ended periodic agreement — nothing to count down to.
      lease: [leaseEntry({ startDate: months(-62), endDate: null, rent: 430, tenant: 'V. Kaminski', notes: 'Rolled to a periodic agreement.' })],
      inspection: [inspectionEntry({ dueDate: days(-25), completedDate: days(-24), result: 'pass', provider: 'Marrowbrook Realty' })],
      activity: [activity(24, 'Marked inspection report as pass', 'inspection')],
    }),

    // ── 13. Owner-handled (orange) for both rates and water ──────────────
    property({
      id: 'brackenhill-15',
      address: '15 Bracken Hill Road, Bellmont Rise',
      suburb: 'Bellmont Rise',
      council: 'Bellmont Rise City Council',
      ratesCategory: 'orange',
      waterCategory: 'orange',
      owner: 'D. Marchbanks',
      tenantedSince: months(-16),
      notes: 'Owner pays both directly; we confirm each quarter rather than forwarding.',
      rates: [
        ratesEntry(LAST_Q, { amount: 575, paid: true, paidDate: days(-97), dueDate: days(-110), dateChecked: days(-100) }),
        ratesEntry(THIS_Q, { amount: 590, paid: true, paidDate: days(-5), dueDate: days(-4), dateChecked: days(-18) }),
      ],
      water: [
        waterEntry({ amount: 192, dueDate: days(-115), paid: true, paidDate: days(-118), dateChecked: days(-120) }),
        waterEntry({ amount: 199, dueDate: days(-24), paid: true, paidDate: days(-26), dateChecked: days(-30) }),
      ],
      lease: [leaseEntry({ startDate: months(-16), endDate: months(8), rent: 555, tenant: 'F. Delacroix' })],
      inspection: [inspectionEntry({ dueDate: days(-60), completedDate: days(-58), result: 'pass', provider: 'Bellmont Inspections' })],
      termite: [inspectionEntry({ dueDate: days(-190), completedDate: days(-188), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(18, `Set date checked-in for ${THIS_Q.quarterPeriod} ${THIS_Q.year}`, 'rates')],
    }),

    // ── 14. Healthy ──────────────────────────────────────────────────────
    property({
      id: 'larkspur-7',
      address: '7 Larkspur Avenue, Kellerton',
      suburb: 'Kellerton',
      dwellingType: 'Unit',
      owner: 'N. Ellery',
      tenantedSince: months(-11),
      rates: [
        ratesEntry(LAST_Q, { amount: 392, paid: true, paidDate: days(-108), dueDate: days(-110) }),
        ratesEntry(THIS_Q, { amount: 403, paid: true, paidDate: days(-16), dueDate: days(-4), dateReceived: days(-37), dateForwarded: days(-35) }),
      ],
      water: [
        waterEntry({ amount: 134, dueDate: days(-120), paid: true, paidDate: days(-123) }),
        waterEntry({ amount: 138, dueDate: days(-29), paid: true, paidDate: days(-31) }),
      ],
      lease: [leaseEntry({ startDate: months(-11), endDate: months(13), rent: 470, tenant: 'B. Osei' })],
      inspection: [inspectionEntry({ dueDate: days(-30), completedDate: days(-28), result: 'pass', provider: 'Kellerton Property Services' })],
      termite: [inspectionEntry({ dueDate: days(-270), completedDate: days(-268), result: 'pass', provider: 'Barrier Pest Control' })],
      activity: [activity(28, 'Marked inspection report as pass', 'inspection')],
    }),

    // ── 15. Newly onboarded — nothing logged yet ("Not tracked" state) ───
    property({
      id: 'ellerby-33',
      address: '33 Ellerby Street, Halloway Park',
      suburb: 'Halloway Park',
      council: 'Halloway Park Council',
      dwellingType: 'Townhouse',
      termiteApplicable: false,
      owner: 'S. Thorneycroft',
      tenantedSince: null,
      notes: 'Just onboarded — awaiting the first rates notice and a managing agreement.',
      createdAt: stamp(6),
      activity: [activity(6, 'Property created')],
    }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Manufactured Google Tasks. No Google account, no OAuth, no network — these
// stand in for what the real integration returns so the widget, the
// address-matching in lib/taskLinking.ts, and the complete/snooze actions all
// still demonstrate. Tasks that name a street number + street are linked to
// that property automatically; the rest stay unlinked.
// ─────────────────────────────────────────────────────────────────────────

export interface SeedTask {
  id: string;
  tasklistId: string;
  tasklistTitle: string;
  title: string;
  notes: string;
  due: string | null;
  emailLink: string | null;
  emailSubject: string | null;
  updated: string;
}

const TASK_LIST = { id: 'demo-list-1', title: 'Property admin' };

export function buildSeedTasks(): SeedTask[] {
  const t = (o: Partial<SeedTask> & Pick<SeedTask, 'title'>): SeedTask => ({
    id: uid('task'),
    tasklistId: TASK_LIST.id,
    tasklistTitle: TASK_LIST.title,
    notes: '',
    due: null,
    emailLink: null,
    emailSubject: null,
    updated: stamp(3),
    ...o,
  });

  return [
    t({
      title: 'Chase council on the overdue instalment — 12 Harrowgate',
      notes: 'Forwarded to the owner weeks ago, still showing unpaid on the council portal.',
      due: days(-3),
      emailSubject: 'Rates notice — 12 Harrowgate Street',
      updated: stamp(1),
    }),
    t({
      title: 'Get treatment quote for 4 Kestrel after the failed termite report',
      notes: 'Barrier Pest Control found active workings in the rear fence line.',
      due: days(1),
      emailSubject: 'Termite inspection report — 4 Kestrel Ave',
      updated: stamp(1),
    }),
    t({
      title: 'Draft renewal offer for 9 Coppersmith Lane',
      notes: 'Lease ends in about two and a half months — owner wants a modest increase.',
      due: days(5),
      updated: stamp(2),
    }),
    t({
      title: 'Send lease renewal pack — 17 Palladine Court',
      due: days(12),
      updated: stamp(4),
    }),
    t({
      // Names exactly one property: lib/taskLinking.ts returns null on a tie, so
      // a note mentioning a second address here would leave the task unlinked.
      title: 'Split the shared water reading for 62 Rosalind Way',
      notes: 'Meter serves the adjoining lot too — split it manually before invoicing.',
      due: days(2),
      updated: stamp(2),
    }),
    t({
      title: 'Prepare quarterly owner statements',
      notes: 'Whole portfolio — no single property.',
      due: days(9),
      updated: stamp(5),
    }),
    t({
      title: 'Renew landlord insurance certificates',
      updated: stamp(8),
    }),
  ];
}
