import { coherence } from './construct.ts';
import { contrast, type Match } from './match.ts';
import { type Model, NOISE } from './model.ts';
import type { Estimate } from './score.ts';

// What the results page says about a player beyond the verdict: how far they lean on each
// axis, which answers made the lead, where the player and the lead part, what sets the lead
// above the runner-up, and where the player stands against the library. Every reason is
// read off the matcher's own sums, answer by answer, so the page never explains a result
// with numbers the ranking did not use. Numbers only; view.ts puts them into words
// (docs/quiz/method.md, "Diễn giải").

/** Leans from the centre, in points, at which an axis reads slight, clear and strong. */
export const LEAN = { slight: 8, clear: 20, strong: 35 } as const;

export type LeanLevel = 'balanced' | 'slight' | 'clear' | 'strong';

export interface AxisLean {
  level: LeanLevel;
  /** The pole the player leans to: 0 the first (toward 0), 1 the second; null in the middle. */
  side: 0 | 1 | null;
  /** How much of the way to each pole, in whole percents, summing to 100. */
  share: [number, number];
}

export function leanOf(position: number): AxisLean {
  const offset = Math.abs(position - 50);
  const level: LeanLevel =
    offset < LEAN.slight
      ? 'balanced'
      : offset < LEAN.clear
        ? 'slight'
        : offset < LEAN.strong
          ? 'clear'
          : 'strong';
  const second = Math.round(position);
  return {
    level,
    side: level === 'balanced' ? null : position < 50 ? 0 : 1,
    share: [100 - second, second],
  };
}

/** One answered question as a reason: the player's answer beside what profiles expect. */
export interface Quote {
  /** Question index in the model. */
  question: number;
  /** The player's answer, −3 … 3. */
  answer: number;
  /** What the lead's adherents would answer, −3 … 3 in half steps. */
  expected: number;
  /** What the runner-up's would, where the reason is a comparison. */
  other?: number;
  /** Its part in the evidence, in natural-log units. */
  value: number;
}

/** A theme question counts in its theme, a facet question in its axis. */
export type Group = { kind: 'axis'; index: number } | { kind: 'theme'; id: string };

export function groupOf(model: Model, q: number): Group {
  const f = model.questionFacet[q];
  if (f >= 0) return { kind: 'axis', index: model.facetAxis[f] };
  return { kind: 'theme', id: model.questions[q].theme ?? '' };
}

const groupKey = (group: Group) => (group.kind === 'axis' ? `a${group.index}` : `t${group.id}`);

const cell = (model: Model, v: number, q: number) => v * model.questions.length + q;

/**
 * The answers that most favour the lead over having no view at all: for each answer, how
 * much likelier it is under the lead's expectation than under an expectation of "trung
 * lập", at the player's own lean toward agreeing and use of the scale. Only answers that
 * lean the lead's way count, and each group (axis or theme) gives one quote at most.
 */
export function support(model: Model, estimate: Estimate, lead: Match, count = 3): Quote[] {
  const noise = NOISE * NOISE;
  const found: (Quote & { key: string })[] = [];
  estimate.asked.forEach((q, i) => {
    const at = cell(model, lead.index, q);
    const m = model.expected[at];
    const r = estimate.values[i];
    if (Math.abs(m) < 1 || Math.abs(r) < 1 || Math.sign(r - lead.alpha) !== Math.sign(m)) return;
    const w = 1 / (noise + model.variance[at]);
    const value = w * lead.scale * m * (r - lead.alpha - (lead.scale * m) / 2);
    if (value <= 0) return;
    found.push({ question: q, answer: r, expected: m, value, key: groupKey(groupOf(model, q)) });
  });
  found.sort((x, y) => y.value - x.value);
  const seen = new Set<string>();
  const chosen: Quote[] = [];
  for (const { key, ...quote } of found) {
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(quote);
    if (chosen.length >= count) break;
  }
  return chosen;
}

/** Below this raw gap, in scale points, an answer does not count as parting from the lead. */
export const PART = 1.5;

/**
 * The answers the lead explains worst: the largest standardised residuals at the player's
 * own lean and use of the scale, where the player sits at least PART points from what the
 * lead predicts. Largest first, one per group.
 */
export function partings(model: Model, estimate: Estimate, lead: Match, count = 2): Quote[] {
  const noise = NOISE * NOISE;
  const found: (Quote & { key: string; gap: number })[] = [];
  estimate.asked.forEach((q, i) => {
    const at = cell(model, lead.index, q);
    const m = model.expected[at];
    const r = estimate.values[i];
    const gap = r - lead.alpha - lead.scale * m;
    if (Math.abs(gap) < PART || Math.abs(r - m) < PART) return;
    const value = (gap * gap) / (noise + model.variance[at]);
    found.push({
      question: q,
      answer: r,
      expected: m,
      value,
      gap,
      key: groupKey(groupOf(model, q)),
    });
  });
  found.sort((x, y) => y.value - x.value);
  const seen = new Set<string>();
  const chosen: Quote[] = [];
  for (const { key, gap: _, ...quote } of found) {
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(quote);
    if (chosen.length >= count) break;
  }
  return chosen;
}

export interface Edge {
  /** The group whose answers did most to put the lead ahead. */
  group: Group;
  /** That group's share of the answers' net push toward the lead, 0–1. */
  share: number;
  /** Its answers that pushed hardest, where the two profiles expect different answers. */
  quotes: Quote[];
  /**
   * Share of the lead's margin that comes from how plausibly each profile explains the
   * player's use of the scale rather than from any one answer (match.ts, contrast).
   */
  style: number;
  /** The lead's margin in the evidence: under 1 the two are nearly tied. */
  margin: number;
}

/**
 * What sets the lead above the runner-up, from the same sums that ranked them: each
 * answer's part in the difference of their evidence, summed within groups.
 */
export function edge(
  model: Model,
  estimate: Estimate,
  lead: Match,
  runnerUp: Match | undefined,
): Edge | null {
  if (!runnerUp) return null;
  const parts = contrast(model, estimate, lead, runnerUp);
  const sums = new Map<string, { group: Group; sum: number }>();
  for (const part of parts.answers) {
    const group = groupOf(model, part.question);
    const key = groupKey(group);
    const entry = sums.get(key) ?? { group, sum: 0 };
    entry.sum += part.value;
    sums.set(key, entry);
  }
  const positive = [...sums.values()].reduce((total, { sum }) => total + Math.max(0, sum), 0);
  const best = [...sums.values()].sort((x, y) => y.sum - x.sum)[0];
  if (!best || best.sum <= 0) return null;
  const key = groupKey(best.group);
  const quotes = parts.answers
    .filter(
      (part) =>
        part.value > 0 &&
        groupKey(groupOf(model, part.question)) === key &&
        Math.abs(
          model.expected[cell(model, lead.index, part.question)] -
            model.expected[cell(model, runnerUp.index, part.question)],
        ) >= 1,
    )
    .sort((x, y) => y.value - x.value)
    .slice(0, 2)
    .map((part) => ({
      question: part.question,
      answer: estimate.values[part.at],
      expected: model.expected[cell(model, lead.index, part.question)],
      other: model.expected[cell(model, runnerUp.index, part.question)],
      value: part.value,
    }));
  const reach = positive + Math.max(0, parts.remainder);
  return {
    group: best.group,
    share: positive ? best.sum / positive : 0,
    quotes,
    style: reach ? Math.max(0, parts.remainder) / reach : 0,
    margin: parts.total,
  };
}

/** One axis, as a player and a variant stand on it. */
export interface AxisPair {
  axis: number;
  you: number;
  them: number;
}

/** Within this many points of the player, a variant stands with them on an axis. */
export const NEAR = 10;
/** A share of the library this large, within NEAR points, counts as standing with many. */
export const MANY = 0.3;
/** A share of the library this large, less far out than the player, counts as standing apart. */
export const FEW = 0.75;

export interface Apart {
  axis: number;
  you: number;
  /** The pole the player leans to, measured from the centre (50). */
  side: 0 | 1;
  /** Share of the variants that lean less far than the player toward that pole, 0–1. */
  beyond: number;
  median: number;
}

export interface Common {
  axis: number;
  you: number;
  /** Share of the variants within NEAR points of the player, 0–1. */
  near: number;
  median: number;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const columnOf = (model: Model, a: number) =>
  model.variants.map((_, v) => model.positions[v * model.axes.length + a]);

/**
 * Whether an axis mean can be read as one position for this player: not where the player's
 * own facets point opposite ways (score.ts, `divided`), nor on an axis whose facets do not
 * move together across the library (construct.ts, `composite`).
 */
export function readable(model: Model, estimate: Estimate, a: number): boolean {
  const axis = estimate.axes[a];
  return axis.n > 0 && !axis.divided && !coherence(model)[a].composite;
}

/**
 * Where the player stands against the library of variants: the answered axis where they
 * lean furthest beyond most variants (measured from the centre, toward the side they lean
 * to), and the one where most variants stand within NEAR points of them. Only axes whose
 * mean reads as one position count (`readable`). Either is null when nothing qualifies;
 * the page says so rather than stretch.
 */
export function standouts(
  model: Model,
  estimate: Estimate,
): { apart: Apart | null; common: Common | null } {
  let apart: Apart | null = null;
  let common: Common | null = null;
  model.axes.forEach((_, a) => {
    if (!readable(model, estimate, a)) return;
    const values = columnOf(model, a);
    const you = estimate.axes[a].mean;
    const middle = median(values);
    const near = values.filter((value) => Math.abs(value - you) <= NEAR).length / values.length;
    if (near >= MANY && (!common || near > common.near))
      common = { axis: a, you, near, median: middle };
    if (Math.abs(you - 50) < LEAN.slight) return;
    const side: 0 | 1 = you > 50 ? 1 : 0;
    const beyond =
      values.filter((value) => (side ? value < you : value > you)).length / values.length;
    if (beyond < FEW) return;
    if (
      !apart ||
      beyond > apart.beyond ||
      (beyond === apart.beyond && Math.abs(you - 50) > Math.abs(apart.you - 50))
    )
      apart = { axis: a, you, side, beyond, median: middle };
  });
  return { apart, common };
}

export interface Tension {
  /** Two axes that usually move together across the library, the player against it. */
  first: number;
  second: number;
  you: [number, number];
  /** Correlation of the two axes across the variants. */
  r: number;
  /** Variants on the player's side of both axes, nearest the player first. */
  holders: Match[];
}

/** Axes the player must lean on, in points, before a pairing counts as theirs. */
const TENSION_LEAN = 10;
/** A pairing is rare when at most this share of the variants holds it too. */
const RARE = 0.12;

/**
 * The rarest pairing in the player's answers: two axes that the library's variants tend
 * to hold together one way, which the player holds the other way. Only axes whose mean
 * reads as one position count (`readable`).
 */
export function tension(
  model: Model,
  estimate: Estimate,
  matches: readonly Match[],
): Tension | null {
  const A = model.axes.length;
  const values = model.axes.map((_, a) => columnOf(model, a));
  const mean = values.map((column) => column.reduce((s, v) => s + v, 0) / column.length);
  let best: (Tension & { score: number }) | null = null;
  for (let i = 0; i < A; i++) {
    for (let j = i + 1; j < A; j++) {
      if (!readable(model, estimate, i) || !readable(model, estimate, j)) continue;
      const dx = estimate.axes[i].mean - 50;
      const dy = estimate.axes[j].mean - 50;
      if (Math.abs(dx) < TENSION_LEAN || Math.abs(dy) < TENSION_LEAN) continue;
      let sxy = 0;
      let sxx = 0;
      let syy = 0;
      for (let v = 0; v < values[i].length; v++) {
        const x = values[i][v] - mean[i];
        const y = values[j][v] - mean[j];
        sxy += x * y;
        sxx += x * x;
        syy += y * y;
      }
      const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
      // Against the grain: the library pairs them one way, the player the other.
      if (Math.abs(r) < 0.45 || Math.sign(r) === Math.sign(dx * dy)) continue;
      const score = Math.abs(r) * Math.min(Math.abs(dx), Math.abs(dy));
      const holders = matches.filter(({ index }) => {
        const x = model.positions[index * A + i] - 50;
        const y = model.positions[index * A + j] - 50;
        return x * dx > 0 && y * dy > 0 && Math.abs(x) >= 5 && Math.abs(y) >= 5;
      });
      if (holders.length > RARE * values[i].length) continue;
      if (best && score <= best.score) continue;
      best = {
        first: i,
        second: j,
        you: [estimate.axes[i].mean, estimate.axes[j].mean],
        r,
        holders,
        score,
      };
    }
  }
  if (!best) return null;
  const { score: _, ...found } = best;
  return found;
}
