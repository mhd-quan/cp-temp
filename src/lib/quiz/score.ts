import { ACQUIESCENCE, type Model, NOISE, PROFILE_SD, place } from './model.ts';
import { type Mode, TIERS } from './select.ts';
import type { Answer, Question } from './types.ts';

// What the player's answers say on their own, before any matching: which questions were
// answered, and where the answers place the player on each facet and axis (0–100), for the
// bars on the results page. The matcher (match.ts) reads every answer itself; the bars read
// only the fixed part, the questions every player of the same length is asked, so that two
// players' bars come from the same questions and the questions chosen to tell variants
// apart never move them (docs/quiz/method.md, "Điểm khía cạnh và trục").

export interface Position {
  /** 0–100; 50 when nothing was answered. */
  mean: number;
  /** Answers behind it. */
  n: number;
}

export interface AxisPosition extends Position {
  /** Facets of the axis with at least one answer. */
  facets: number;
  /**
   * The facets point opposite ways, at least DIVIDED points from the middle each: the mean
   * of the axis then says where the facets cancel, not that the player is moderate.
   */
  divided: boolean;
}

export interface Estimate {
  /** Answered questions, as indices into model.questions, in the order given. */
  asked: number[];
  /** Their answers, −3 … 3. */
  values: number[];
  /** Where the fixed part places the player on each facet, for the bars. */
  facets: Position[];
  /** Where it places the player on each axis: the mean of the measured facets. */
  axes: AxisPosition[];
  /**
   * Every facet answer, fixed or chosen, as plain means on each facet and axis: what the
   * coverage test counts, and what the methods kept for comparison (baselines.ts) read.
   */
  every: { facets: Position[]; axes: AxisPosition[] };
  answered: number;
  /**
   * Typical disagreement, in points (0–100), between answers on the same facet, over the
   * facets with two answers or more; 0 when there are none.
   */
  scatter: number;
  /** The lean toward agreeing whatever the question that the bars allow for, in scale points. */
  acquiescence: number;
  /** The length whose fixed part the bars read: its tiers (select.ts, TIERS) and no others. */
  length: Mode;
}

/** Facets that lean at least this far from the middle in opposite directions divide their axis (as LEAN.clear). */
export const DIVIDED = 20;

/**
 * A player who has answered at least this share of a tier took a length whose fixed part
 * asks it: the shorter lengths ask none of it in theirs, and their adaptive stages pick few.
 */
export const LENGTH_SHARE = 0.5;

/**
 * On a facet asked both ways, half the sum of the two poles' mean answers estimates the lean
 * toward agreeing with variance PAIR · (1/n₊ + 1/n₋): a quarter of one answer's spread
 * around its expectation, per answer on each pole. The estimates are pooled by precision
 * with the prior on the lean (ACQUIESCENCE), so a few pairs move it only part of the way.
 */
const PAIR = (NOISE * NOISE + PROFILE_SD.agreed * PROFILE_SD.agreed) / 4;

/**
 * The longest length whose fixed part the answers include: 72+ once half the long tier is
 * answered, 144+ once half the deep tier is too, 48+ otherwise. A function of the answers
 * alone, so a shared link reads the same bars.
 */
export function lengthOf(model: Model, answers: ReadonlyMap<string, Answer>): Mode {
  const taken = (tier: Question['tier']) => {
    let all = 0;
    let answered = 0;
    for (const question of model.questions) {
      if (question.tier !== tier) continue;
      all++;
      const answer = answers.get(question.id);
      if (answer !== null && answer !== undefined) answered++;
    }
    return all > 0 && answered >= LENGTH_SHARE * all;
  };
  if (!taken('long')) return 'short';
  return taken('deep') ? 'deep' : 'standard';
}

/**
 * Reads the answers.
 *
 * The bars use the fixed part only: the core, the long tier when the player took 72+, and
 * the deep tier as well when they took 144+. Within a facet, agreeing with a question keyed
 * toward the second pole and disagreeing with one keyed toward the first point the same way;
 * a habit of agreeing pushes them apart. So each facet weighs its two poles equally, the
 * mean of the answers keyed each way, and where only one pole was asked, the answer is first
 * cleared of the player's lean toward agreeing, estimated from the facets asked both ways.
 * On a facet asked both ways that lean cancels exactly. A facet nobody answered stays unmeasured
 * (n = 0); nothing is borrowed from other facets. An axis is the mean of its measured facets.
 */
export function estimate(model: Model, answers: ReadonlyMap<string, Answer>): Estimate {
  const F = model.facets.length;
  const length = lengthOf(model, answers);
  const fixed = (tier: Question['tier']) => TIERS[length].includes(tier);
  // Every facet answer, for the coverage test, the scatter and the baselines.
  const sum = new Float64Array(F);
  const square = new Float64Array(F);
  const count = new Float64Array(F);
  // Fixed answers by facet and pole: raw sums and counts, keyed +1 at [2f], −1 at [2f + 1].
  const poleSum = new Float64Array(2 * F);
  const poleCount = new Float64Array(2 * F);
  const asked: number[] = [];
  const values: number[] = [];
  for (const [id, answer] of answers) {
    if (answer === null || answer === undefined) continue;
    const q = model.questionIndex.get(id);
    if (q === undefined) continue;
    asked.push(q);
    values.push(answer);
    const f = model.questionFacet[q];
    const question = model.questions[q];
    const key = question.key;
    if (f < 0 || !key) continue;
    const x = place(key, answer);
    sum[f] += x;
    square[f] += x * x;
    count[f]++;
    if (!fixed(question.tier)) continue;
    const at = 2 * f + (key > 0 ? 0 : 1);
    poleSum[at] += answer;
    poleCount[at]++;
  }

  // The lean toward agreeing: on a facet asked both ways, half the sum of the two poles'
  // mean answers, weighted by how many answers back it and shrunk toward no lean.
  let leanSum = 0;
  let leanWeight = 1 / (ACQUIESCENCE * ACQUIESCENCE);
  for (let f = 0; f < F; f++) {
    const plus = poleCount[2 * f];
    const minus = poleCount[2 * f + 1];
    if (!plus || !minus) continue;
    const weight = 1 / (PAIR * (1 / plus + 1 / minus));
    leanSum += (weight * (poleSum[2 * f] / plus + poleSum[2 * f + 1] / minus)) / 2;
    leanWeight += weight;
  }
  const acquiescence = leanSum / leanWeight;

  const facets: Position[] = [];
  const every: Position[] = [];
  let spread = 0;
  let spreadCount = 0;
  for (let f = 0; f < F; f++) {
    const plus = poleCount[2 * f];
    const minus = poleCount[2 * f + 1];
    // Each pole's mean answer cleared of the lean, toward the second pole of the facet.
    const toward =
      plus && minus
        ? (poleSum[2 * f] / plus - poleSum[2 * f + 1] / minus) / 2
        : plus
          ? poleSum[2 * f] / plus - acquiescence
          : minus
            ? acquiescence - poleSum[2 * f + 1] / minus
            : 0;
    facets.push({ mean: Math.min(100, Math.max(0, place(1, toward))), n: plus + minus });
    const n = count[f];
    const mean = n ? sum[f] / n : 50;
    every.push({ mean, n });
    if (n >= 2) {
      spread += (Math.max(0, square[f] / n - mean * mean) * n) / (n - 1);
      spreadCount++;
    }
  }
  return {
    asked,
    values,
    facets,
    axes: axesOf(model, facets),
    every: { facets: every, axes: axesOf(model, every) },
    answered: asked.length,
    scatter: spreadCount ? Math.sqrt(spread / spreadCount) : 0,
    acquiescence,
    length,
  };
}

/** Axis positions from facet positions: the mean of the answered facets. */
export function axesOf(model: Model, facets: Position[]): AxisPosition[] {
  return model.axes.map((_, a): AxisPosition => {
    let mean = 0;
    let n = 0;
    let k = 0;
    let high = 0;
    let low = 0;
    facets.forEach((facet, f) => {
      if (model.facetAxis[f] !== a || facet.n === 0) return;
      mean += facet.mean;
      n += facet.n;
      k++;
      high = Math.max(high, facet.mean - 50);
      low = Math.max(low, 50 - facet.mean);
    });
    return k
      ? { mean: mean / k, n, facets: k, divided: high >= DIVIDED && low >= DIVIDED }
      : { mean: 50, n: 0, facets: 0, divided: false };
  });
}
