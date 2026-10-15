import { FITS, type Match, match, normalCdf, type Posterior } from './match.ts';
import { type Model, NOISE } from './model.ts';
import type { Estimate } from './score.ts';
import type { Question } from './types.ts';

export type Mode = 'short' | 'standard' | 'deep';

/**
 * Each length (48+, 72+ and 144+) asks a fixed part, then at least `min` questions chosen for
 * the player, so no lean is read into the answers too soon. Past that it asks on only while
 * it must: until the leader holds `confident` of the weight while it fits as a follower's own
 * variant would, until no variant fits that well, or until no question left can tell the
 * leaders apart. Rút gọn stops at `max` whatever happens; the two longer lengths have no
 * ceiling. Rút gọn asks the core; Tiêu chuẩn adds a question each way on every facet;
 * Chuyên sâu adds one more on every facet and one or two on each of the themes the axes do
 * not draw (scripts/quiz-deep.mjs).
 */
export const LENGTHS = {
  short: { base: 48, min: 32, max: 48 },
  standard: { base: 72, min: 48, max: Number.POSITIVE_INFINITY },
  deep: { base: 144, min: 48, max: Number.POSITIVE_INFINITY },
} as const;
/** The lengths in order, shortest first: a finished round can go on to the next. */
export const MODES: readonly Mode[] = ['short', 'standard', 'deep'];
/** The tiers each length asks in its fixed part. */
export const TIERS: Record<Mode, readonly Question['tier'][]> = {
  short: ['core'],
  standard: ['core', 'long'],
  deep: ['core', 'long', 'deep'],
};
/**
 * `confident`: the leader's share of the weight that settles it. `candidates`, `coverage`:
 * the leaders a question is chosen among. `idle`: past the floor, a question is worth asking
 * only if it carries at least this many bits; below it, asking on is not needed. At 0.01 the
 * 72+ length asked a few players hundreds more questions for no gain in accuracy, and its
 * leaders came out surer than they were right (method.md, "Chặng hỏi thêm").
 */
export const ADAPTIVE = { confident: 0.9, candidates: 40, coverage: 0.999, idle: 0.05 } as const;

/** Small seeded generator so a given seed always gives the same order. */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], next: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const axisOf = (model: Model, question: Question) => {
  const f = question.facet ? model.facetIndex.get(question.facet) : undefined;
  return f === undefined ? -1 : model.facetAxis[f];
};

/**
 * The fixed part of a quiz, shuffled so that no two neighbours share an axis. Theme
 * questions (in depth only) are dealt into groups as large as an axis's, so they are
 * spread through the round as the axes are, not left in a run at its end.
 */
export function baseQuestions(model: Model, mode: Mode, seed: number): Question[] {
  const next = random(seed);
  const tiers = TIERS[mode];
  const byAxis = model.axes.map(() => [] as Question[]);
  const themed: Question[] = [];
  for (const question of model.questions) {
    if (!tiers.includes(question.tier)) continue;
    const a = axisOf(model, question);
    if (a < 0) themed.push(question);
    else byAxis[a].push(question);
  }
  const size = Math.max(1, ...byAxis.map((group) => group.length));
  shuffle(themed, next);
  for (let start = 0; start < themed.length; start += size)
    byAxis.push(themed.slice(start, start + size));
  for (const group of byAxis) shuffle(group, next);
  const order: Question[] = [];
  let last = -1;
  while (byAxis.some((group) => group.length)) {
    const round = shuffle(
      byAxis.flatMap((group, a) => (group.length ? [a] : [])),
      next,
    );
    if (round.length > 1 && round[0] === last) [round[0], round[1]] = [round[1], round[0]];
    for (const a of round) order.push(byAxis[a].pop() as Question);
    last = round[round.length - 1];
  }
  return order;
}

const entropy = (p: ArrayLike<number>) => {
  let h = 0;
  for (let k = 0; k < p.length; k++) if (p[k] > 1e-12) h -= p[k] * Math.log2(p[k]);
  return h;
};

/**
 * The probability of each of the seven answers to question q from a follower of one
 * variant: the Gaussian of match.ts cut at the half points, centred on α + λ·m at the
 * posterior means, and as wide as everything still unknown makes it. Besides the noise and
 * the looseness of the profile, that is the uncertainty left in the player's lean and use
 * of the scale: Var(α + λ·m) = Var(α) + m²·Var(λ) + 2m·Cov(α, λ).
 */
export function predictive(
  model: Model,
  item: Posterior & { index: number },
  q: number,
): Float64Array {
  const at = item.index * model.questions.length + q;
  const m = model.expected[at];
  const mean = item.alpha + item.scale * m;
  const sd = Math.sqrt(
    NOISE * NOISE +
      model.variance[at] +
      item.alphaVar +
      m * m * item.scaleVar +
      2 * m * item.covariance,
  );
  const p = new Float64Array(7);
  let below = 0;
  for (let k = 0; k < 7; k++) {
    const upper = k === 6 ? 1 : normalCdf((k - 3 + 0.5 - mean) / sd);
    p[k] = upper - below;
    below = upper;
  }
  return p;
}

export interface Pick {
  question: Question;
  /** Expected information about which leading variant the player follows, in bits. */
  information: number;
}

/**
 * The unasked question that best tells the leading variants apart: the one whose answer
 * carries the most expected information about which of them the player follows (mutual
 * information between the answer and the variant, over the leaders that hold nearly all the
 * weight). Nothing else limits the choice: the bars read the fixed questions only
 * (score.ts), and the matcher allows for a habit of agreeing itself.
 */
export function nextQuestion(
  model: Model,
  estimate: Estimate,
  asked: ReadonlySet<string>,
  ranked: readonly Match[] = match(model, estimate),
): Pick | null {
  const leaders: Match[] = [];
  let held = 0;
  for (const item of ranked) {
    leaders.push(item);
    held += item.weight;
    if (leaders.length >= ADAPTIVE.candidates || (leaders.length >= 2 && held >= ADAPTIVE.coverage))
      break;
  }
  const share = leaders.map((item) => item.weight / held);
  let best: Pick | null = null;
  const mixture = new Float64Array(7);
  model.questions.forEach((question, q) => {
    if (asked.has(question.id)) return;
    mixture.fill(0);
    let within = 0;
    leaders.forEach((item, i) => {
      const p = predictive(model, item, q);
      within += share[i] * entropy(p);
      for (let k = 0; k < 7; k++) mixture[k] += share[i] * p[k];
    });
    const information = entropy(mixture) - within;
    if (!best || information > best.information) best = { question, information };
  });
  return best;
}

/**
 * Whether the adaptive stage can stop after `extra` added questions. Past the minimum, a lead
 * that explains the answers less well than a follower's own variant usually does (misfit
 * above FITS) stops it: the library lacks a closer tradition, and more questions would only
 * make the least bad of its variants look surer. A share of the weight counts as settled only
 * for a lead that fits.
 */
export function adaptiveDone(
  mode: Mode,
  extra: number,
  ranked: readonly Match[],
  next: Pick | null,
): boolean {
  const { min, max } = LENGTHS[mode];
  if (extra >= max || !next) return true;
  if (extra < min) return false;
  const lead = ranked[0];
  if (lead.misfit > FITS) return true;
  return lead.weight >= ADAPTIVE.confident || next.information < ADAPTIVE.idle;
}
