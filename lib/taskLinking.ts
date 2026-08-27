import type { TaskItem } from './demo/tasks';

// Matches Google Tasks to properties by street number + street name found in
// the task text — the suburb/state isn't required, so "Plumbing issues for
// 4 Kestrel" links to "4 Kestrel Avenue, Bellmont Rise".

export type LinkedTask = TaskItem & {
  propertyId: string | null;
  propertyAddress: string | null;
};

// Street-type suffixes mark the end of the street name when parsing an
// address ("10 St Andrews Road" → street "st andrews", not just "st").
const STREET_SUFFIXES = new Set([
  'street', 'st', 'road', 'rd', 'drive', 'dr', 'avenue', 'ave', 'av',
  'court', 'ct', 'place', 'pl', 'crescent', 'cres', 'close', 'cl',
  'lane', 'ln', 'way', 'parade', 'pde', 'circuit', 'cct', 'boulevard',
  'blvd', 'terrace', 'tce', 'grove', 'esplanade', 'esp', 'highway', 'hwy',
]);

/** Lowercase, punctuation → spaces, collapsed. "1/24 Sandpiper!" → "1 24 sandpiper" */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True when `phrase` appears in `text` on word boundaries. */
function containsPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

interface StreetKey {
  /** "1 24 sandpiper" for unit addresses ("1/24 Sandpiper Cl"), else null. */
  full: string | null;
  /** "24 sandpiper" — number + street name, no unit. */
  base: string;
}

function isNumberish(word: string): boolean {
  return /^\d+[a-z]?$/.test(word);
}

export function parseStreetKey(address: string): StreetKey | null {
  // Only the part before the first comma is the street address.
  const words = normalize(address.split(',')[0]).split(' ').filter(Boolean);

  // Leading number tokens: one is the street number, two means unit + number
  // ("1/24" normalizes to "1 24"). Street names never start with a digit.
  const nums: string[] = [];
  while (nums.length < 2 && words.length && isNumberish(words[0])) {
    nums.push(words.shift()!);
  }
  if (nums.length === 0) return null;

  const streetWords: string[] = [];
  for (const w of words) {
    // A suffix word ends the street name — unless it opens it ("St Andrews").
    if (STREET_SUFFIXES.has(w) && streetWords.length > 0) break;
    streetWords.push(w);
  }
  if (streetWords.length === 0) return null;

  const street = streetWords.join(' ');
  if (nums.length === 2) {
    return { full: `${nums[0]} ${nums[1]} ${street}`, base: `${nums[1]} ${street}` };
  }
  return { full: null, base: `${nums[0]} ${street}` };
}

export interface PropertyRef {
  id: string;
  address: string;
}

/**
 * Finds the property whose street address appears in `text` (a task title, a
 * free-text bill note like "62 Rosalind", etc.). Match strength, strongest first:
 *   3 — unit-exact ("1/24 Sandpiper" text → the 1/24 Sandpiper property)
 *   2 — a unit-less property matched on its own number+street ("24 Sandpiper" →
 *       a property literally at 24 Sandpiper, not its "1/24" unit sibling)
 *   1 — a unit property matched only by its base number+street
 * A tie at the top score means the mention is ambiguous, so it returns null
 * rather than guessing. Matching is on the raw address string, so callers can
 * pass property summaries straight in.
 */
export function matchPropertyByText(
  text: string,
  properties: PropertyRef[]
): PropertyRef | null {
  const normalized = normalize(text);
  let bestScore = 0;
  let best: PropertyRef | null = null;
  let tied = false;

  for (const p of properties) {
    const key = parseStreetKey(p.address);
    if (!key) continue;
    const score = key.full && containsPhrase(normalized, key.full) ? 3
      : !containsPhrase(normalized, key.base) ? 0
      : key.full === null ? 2  // this property IS the base number (no unit)
      : 1;                      // a unit property matched only via its base
    if (score > bestScore) {
      bestScore = score;
      best = p;
      tied = false;
    } else if (score === bestScore && score > 0 && p.id !== best?.id) {
      tied = true;
    }
  }

  return best && !tied ? best : null;
}

/**
 * Annotates tasks with the property whose address appears in the task text.
 */
export function linkTasksToProperties(
  tasks: TaskItem[],
  properties: PropertyRef[]
): LinkedTask[] {
  return tasks.map(task => {
    const match = matchPropertyByText(`${task.title} ${task.notes} ${task.emailSubject ?? ''}`, properties);
    return { ...task, propertyId: match?.id ?? null, propertyAddress: match?.address ?? null };
  });
}
