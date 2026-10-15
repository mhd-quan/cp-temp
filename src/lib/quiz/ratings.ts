import { encodeCell, type ProfileFile } from './profiles.ts';

// The raters' work, as they handed it in (src/data/quiz/ratings): for each question, the
// answer a committed adherent of each variant would give, why the question draws the line
// it draws, which variants' adherents are divided, and notes on the least obvious answers.
// Two raters, A and B, rated every question for every variant without seeing each other's
// work (docs/quiz/method.md, "Hồ sơ theo câu"). Variants are named by short codes
// (ratings/codes.json). Only the build script and the tests read these files; the page
// reads the compiled profiles.json.

export type Rater = 'A' | 'B';

/** One rater's work on one question. */
export interface RatedItem {
  why: string;
  /** Codes whose adherents are divided, space-separated. */
  split?: string;
  /** Short notes on the most telling answers, by code. */
  notes?: Record<string, string>;
  /** Codes at each answer, "3" … "-3", space-separated. */
  [answer: string]: string | Record<string, string> | undefined;
}

export interface RatingFile {
  rater: Rater;
  block: string;
  items: Record<string, RatedItem>;
}

export interface Rating {
  value: number;
  split: boolean;
}

/** question id → variant id → rating, for one rater. */
export type Ratings = Map<string, Map<string, Rating>>;

const ANSWERS = ['3', '2', '1', '0', '-1', '-2', '-3'];
const codesIn = (text: unknown) =>
  typeof text === 'string' ? text.split(/[\s,]+/).filter(Boolean) : [];

/** One rater's ratings across their files; a later file overrides an earlier one. */
export function readRatings(
  files: readonly RatingFile[],
  rater: Rater,
  codes: Record<string, string>,
): Ratings {
  const variantOf = new Map(Object.entries(codes).map(([id, code]) => [code, id]));
  const ratings: Ratings = new Map();
  for (const file of files) {
    if (file.rater !== rater) continue;
    for (const [question, item] of Object.entries(file.items)) {
      const row = ratings.get(question) ?? new Map<string, Rating>();
      const divided = new Set(codesIn(item.split));
      for (const answer of ANSWERS) {
        for (const code of codesIn(item[answer])) {
          const variant = variantOf.get(code);
          if (!variant) throw new Error(`${file.block} ${question}: unknown code ${code}`);
          row.set(variant, { value: Number(answer), split: divided.has(code) });
        }
      }
      ratings.set(question, row);
    }
  }
  return ratings;
}

/** Raters this far apart on a question are treated as a division among adherents. */
export const DISAGREE = 2;

/**
 * The expected answer a profile carries: the mean of the two ratings, in half steps; loose
 * (split) where either rater found the adherents divided or the raters stood DISAGREE or
 * more apart. With one rating, that rating.
 */
export function combine(first: Rating | undefined, second: Rating | undefined): Rating | null {
  if (!first || !second) return first ?? second ?? null;
  return {
    value: Math.round(first.value + second.value) / 2,
    split: first.split || second.split || Math.abs(first.value - second.value) >= DISAGREE,
  };
}

/**
 * Compiles ratings into profiles.json: one letter per question per variant (profiles.ts),
 * in the order of `questions`. Pass one rater's ratings alone to build that rater's
 * profiles, as the cross-rater simulation does.
 */
export function compileProfiles(
  version: number,
  questions: readonly string[],
  variants: readonly string[],
  first: Ratings,
  second?: Ratings,
): ProfileFile {
  return {
    version,
    items: [...questions],
    variants: Object.fromEntries(
      variants.map((variant) => [
        variant,
        questions
          .map((question) => {
            const found = combine(
              first.get(question)?.get(variant),
              second?.get(question)?.get(variant),
            );
            return encodeCell(found && { mean: found.value, split: found.split });
          })
          .join(''),
      ]),
    ),
  };
}

/** How closely two raters agree: exact, within one point, and the correlation of their answers. */
export function agreement(first: Ratings, second: Ratings) {
  let n = 0;
  let exact = 0;
  let near = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [question, row] of first) {
    const other = second.get(question);
    if (!other) continue;
    for (const [variant, { value: x }] of row) {
      const y = other.get(variant)?.value;
      if (y === undefined) continue;
      n++;
      if (x === y) exact++;
      if (Math.abs(x - y) <= 1) near++;
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
    }
  }
  const cov = sxy / n - (sx / n) * (sy / n);
  const r = cov / Math.sqrt((sxx / n - (sx / n) ** 2) * (syy / n - (sy / n) ** 2));
  return { n, exact: exact / n, near: near / n, r };
}
