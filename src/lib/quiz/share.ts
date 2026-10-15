// A result travels in the URL hash (#k=…), which never reaches the server or analytics.
//
// Version 3 (from 1/10/2026) carries the answers themselves, so a link rebuilds the same
// result exactly: which questions were answered, by their stable numbers (Question.n), and
// each answer on the seven-point scale, 3 bits. Before them sits the version of the
// expected answers the sender was matched against (profiles.json), so the page can say
// when it has recomputed with newer ones. Layout, in bits: the highest question number
// (10), one bit per number up to it, then 3 per answer in number order; base64url.
// Links of versions 1 and 2 carried axis or facet totals for a matcher since replaced;
// they are recognised and declined, never rebuilt into a result their sender did not see.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const SHARE_VERSION = 3;
/** Highest question number a link can carry. */
const MAX_NUMBER = 1023;

export type SharedResult =
  | {
      version: 3;
      /** Version of the expected answers the sender was matched against. */
      profiles: number;
      /** Question number and answer, −3 … 3, in number order. */
      answers: [number, number][];
    }
  | { version: 1 | 2; legacy: true };

const bitsOf = (value: number, width: number) => value.toString(2).padStart(width, '0');

function pack(bits: string): string {
  let chars = '';
  const padded = bits.padEnd(Math.ceil(bits.length / 6) * 6, '0');
  for (let i = 0; i < padded.length; i += 6)
    chars += ALPHABET[Number.parseInt(padded.slice(i, i + 6), 2)];
  return chars;
}

function unpack(chars: string): string {
  return [...chars].map((char) => ALPHABET.indexOf(char).toString(2).padStart(6, '0')).join('');
}

/** Encodes answers keyed by question number; skipped questions are left out. */
export function encodeResult(profiles: number, answers: ReadonlyMap<number, number>): string {
  const numbers = [...answers.keys()].sort((a, b) => a - b);
  const top = numbers[numbers.length - 1] ?? 0;
  if (top > MAX_NUMBER || numbers.some((n) => n < 1 || !Number.isInteger(n)))
    throw new Error('question number out of range');
  let bits = bitsOf(top, 10);
  const present = new Set(numbers);
  for (let n = 1; n <= top; n++) bits += present.has(n) ? '1' : '0';
  for (const n of numbers) {
    const value = answers.get(n) as number;
    if (!Number.isInteger(value) || Math.abs(value) > 3) throw new Error('answer out of range');
    bits += bitsOf(value + 3, 3);
  }
  return `${SHARE_VERSION}.${profiles.toString(36)}.${pack(bits)}`;
}

export function decodeResult(value: string): SharedResult | null {
  const current = /^3\.([0-9a-z]{1,6})\.([A-Za-z0-9_-]{2,})$/.exec(value);
  if (current) {
    const bits = unpack(current[2]);
    const top = Number.parseInt(bits.slice(0, 10), 2);
    if (bits.length < 10 + top) return null;
    const numbers: number[] = [];
    for (let n = 1; n <= top; n++) if (bits[9 + n] === '1') numbers.push(n);
    let at = 10 + top;
    if (bits.length < at + 3 * numbers.length) return null;
    const answers: [number, number][] = [];
    for (const n of numbers) {
      const code = Number.parseInt(bits.slice(at, at + 3), 2);
      if (code > 6) return null;
      answers.push([n, code - 3]);
      at += 3;
    }
    // Only zero padding may follow.
    if (bits.slice(at).includes('1') || bits.length - at >= 6) return null;
    return { version: 3, profiles: Number.parseInt(current[1], 36), answers };
  }
  if (/^2\.[A-Za-z0-9_-]{62}$/.test(value)) return { version: 2, legacy: true };
  if (/^1\.[A-Za-z0-9_-]{14}(?:\.[a-z0-9-]+)?$/.test(value)) return { version: 1, legacy: true };
  return null;
}
