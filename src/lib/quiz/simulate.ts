import { type Match, match, verdict } from './match.ts';
import type { Model } from './model.ts';
import { type Estimate, estimate } from './score.ts';
import {
  ADAPTIVE,
  adaptiveDone,
  baseQuestions,
  type Mode,
  nextQuestion,
  type Pick,
  predictive,
  random,
} from './select.ts';
import type { Answer } from './types.ts';

// Synthetic players take the quiz, so the matcher can be measured (docs/quiz/method.md,
// "Mô phỏng"). Each player follows one variant, but answers from `truth` (by default the
// model's own expected answers; for an honest test, a second rater's), strays from it on
// each question, uses the scale more or less strongly, leans toward agreeing, answers with
// noise and skips a few questions. Everything the matcher assumes, the players break.

export interface Population {
  /** Mean and spread of how strongly players use the scale compared with an adherent. */
  scale: [number, number];
  /** Spread of the lean toward agreeing, in scale points. */
  acquiescence: number;
  /** Spread of a player's own departures from the tradition on each question. */
  idiosyncrasy: number;
  /** Extra departure where the tradition's adherents are divided. */
  divided: number;
  /** Answering noise. */
  noise: number;
  /** Share of questions skipped. */
  skip: number;
}

export const POPULATION: Population = {
  scale: [0.7, 0.25],
  acquiescence: 0.4,
  idiosyncrasy: 0.9,
  divided: 1.2,
  noise: 0.7,
  skip: 0.02,
};

export interface Truth {
  /** Expected answer per variant and question, in the model's layout. */
  expected: Float32Array;
  /** Whether adherents are divided on it. */
  divided: Uint8Array;
}

export function gauss(next: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
}

/**
 * The random stream of one player: the p-th player drawn from variant row v under a seed.
 * Each player has their own, so a player answers the same whatever the quiz asked the
 * players before them, and two versions of the code are measured on the same players.
 */
export function playerStream(seed: number, v: number, p: number): () => number {
  return random(
    Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(v + 1, 0x85ebca6b) ^ Math.imul(p + 1, 0xc2b2ae35),
  );
}

/** A synthetic follower of variant v: a function from question index to answer. */
export function follower(
  model: Model,
  truth: Truth,
  v: number,
  population: Population,
  next: () => number,
): (q: number) => Answer {
  const Q = model.questions.length;
  const scale = Math.max(0.1, population.scale[0] + population.scale[1] * gauss(next));
  const lean = population.acquiescence * gauss(next);
  const own = new Float64Array(Q).map(
    (_, q) =>
      (population.idiosyncrasy + (truth.divided[v * Q + q] ? population.divided : 0)) * gauss(next),
  );
  return (q) => {
    if (next() < population.skip) return null;
    const latent =
      lean + scale * (truth.expected[v * Q + q] + own[q]) + population.noise * gauss(next);
    return Math.min(3, Math.max(-3, Math.round(latent))) as Answer;
  };
}

export interface Run {
  variant: number;
  estimate: Estimate;
  ranked: Match[];
  asked: number;
}

/**
 * One synthetic player through the whole quiz: the fixed part, then the adaptive stage.
 * `step`, if given, sees each question the adaptive stage asks with the ranking before and
 * after its answer.
 */
export function play(
  model: Model,
  answer: (q: number) => Answer,
  mode: Mode,
  seed: number,
  adaptive = true,
  step?: (pick: Pick, before: readonly Match[], after: readonly Match[]) => void,
): { estimate: Estimate; ranked: Match[]; asked: number; answers: Map<string, Answer> } {
  const answers = new Map<string, Answer>();
  const asked = new Set<string>();
  const respond = (id: string) => {
    asked.add(id);
    answers.set(id, answer(model.questionIndex.get(id) as number));
  };
  for (const question of baseQuestions(model, mode, seed)) respond(question.id);
  let est = estimate(model, answers);
  let ranked = match(model, est);
  let extra = 0;
  while (adaptive) {
    const pick = nextQuestion(model, est, asked, ranked);
    if (adaptiveDone(mode, extra, ranked, pick) || !pick) break;
    respond(pick.question.id);
    est = estimate(model, answers);
    const before = ranked;
    ranked = match(model, est);
    step?.(pick, before, ranked);
    extra++;
  }
  return { estimate: est, ranked, asked: asked.size, answers };
}

export interface SimulationOptions {
  mode: Mode;
  adaptive: boolean;
  perVariant: number;
  seed: number;
  population?: Population;
  truth?: Truth;
  /** Only these variant rows (all by default). */
  variants?: number[];
}

export interface SimulationResult {
  players: number;
  variantTop1: number;
  variantTop3: number;
  familyTop1: number;
  /** Mean weight of the headline variant; near variantTop1 when calibrated. */
  confidence: number;
  loose: number;
  /** Share whose lead fits worse than a follower's own variant usually does (FITS). */
  strained: number;
  /** Share told the quiz is sure ("cao"): the lead holds ADAPTIVE.confident and fits. */
  claimed: number;
  close: number;
  questions: number;
  /** Mean information each adaptive question was expected to carry about the variant, in bits. */
  expectedBits: number;
  /**
   * Mean information it carried: how far the answer moved the weight of the player's own
   * variant, log₂(after / before). If the model's predictions are right, its mean is the
   * expected information; above it, the model undersells its questions, below, oversells.
   */
  realisedBits: number;
  /** "a > b": a follower of a got b as the headline, with its count. */
  confusions: Map<string, number>;
}

/** The model's own expected answers as the truth. */
export function ownTruth(model: Model): Truth {
  const divided = new Uint8Array(model.variance.length);
  model.variance.forEach((value, i) => {
    divided[i] = value > 1 ? 1 : 0;
  });
  return { expected: model.expected, divided };
}

export function simulate(model: Model, options: SimulationOptions): SimulationResult {
  const population = options.population ?? POPULATION;
  const truth = options.truth ?? ownTruth(model);
  const rows = options.variants ?? model.variants.map((_, v) => v);
  const result: SimulationResult = {
    players: 0,
    variantTop1: 0,
    variantTop3: 0,
    familyTop1: 0,
    confidence: 0,
    loose: 0,
    strained: 0,
    claimed: 0,
    close: 0,
    questions: 0,
    expectedBits: 0,
    realisedBits: 0,
    confusions: new Map(),
  };
  let picks = 0;
  const weightOf = (ranked: readonly Match[], v: number) =>
    Math.max(1e-300, ranked.find((item) => item.index === v)?.weight ?? 0);
  for (const v of rows) {
    for (let p = 0; p < options.perVariant; p++) {
      const next = playerStream(options.seed, v, p);
      const answer = follower(model, truth, v, population, next);
      const run = play(
        model,
        answer,
        options.mode,
        options.seed + p,
        options.adaptive,
        (pick, before, after) => {
          picks++;
          result.expectedBits += pick.information;
          result.realisedBits += Math.log2(weightOf(after, v) / weightOf(before, v));
        },
      );
      const called = verdict(model, run.estimate, run.ranked);
      const variant = model.variants[v];
      result.players++;
      result.questions += run.asked;
      result.confidence += called.lead.weight;
      if (called.loose) result.loose++;
      if (called.strained) result.strained++;
      if (!called.strained && called.lead.weight >= ADAPTIVE.confident) result.claimed++;
      if (called.close) result.close++;
      if (called.lead.index === v) result.variantTop1++;
      else {
        const key = `${variant.id} > ${called.lead.variant.id}`;
        result.confusions.set(key, (result.confusions.get(key) ?? 0) + 1);
      }
      if (run.ranked.slice(0, 3).some((item) => item.index === v)) result.variantTop3++;
      if (called.lead.variant.family === variant.family) result.familyTop1++;
    }
  }
  const n = result.players || 1;
  return {
    ...result,
    variantTop1: result.variantTop1 / n,
    variantTop3: result.variantTop3 / n,
    familyTop1: result.familyTop1 / n,
    confidence: result.confidence / n,
    loose: result.loose / n,
    strained: result.strained / n,
    claimed: result.claimed / n,
    close: result.close / n,
    questions: result.questions / n,
    expectedBits: result.expectedBits / (picks || 1),
    realisedBits: result.realisedBits / (picks || 1),
  };
}

export interface HeldOut {
  answers: number;
  /** Bits per held-out answer that the matcher's predictions, mixed over the leaders, cost. */
  loss: number;
  /** Bits per answer the predictions themselves expected to cost: their entropy. */
  entropy: number;
}

/**
 * How well the matcher predicts answers it has not seen. Each player answers the fixed
 * part; then `count` questions not asked are answered and scored against the predictive
 * distribution (select.ts, predictive), mixed over the leading variants by weight, as the
 * adaptive stage mixes them. A loss above the entropy means the predictions are too sure.
 */
export function heldOut(model: Model, options: SimulationOptions & { count: number }): HeldOut {
  const population = options.population ?? POPULATION;
  const truth = options.truth ?? ownTruth(model);
  const rows = options.variants ?? model.variants.map((_, v) => v);
  const out = { answers: 0, loss: 0, entropy: 0 };
  for (const v of rows) {
    for (let p = 0; p < options.perVariant; p++) {
      const next = playerStream(options.seed, v, p);
      const answer = follower(model, truth, v, population, next);
      const answers = new Map<string, Answer>();
      for (const question of baseQuestions(model, options.mode, options.seed + p))
        answers.set(question.id, answer(model.questionIndex.get(question.id) as number));
      const ranked = match(model, estimate(model, answers));
      const leaders: Match[] = [];
      let held = 0;
      for (const item of ranked) {
        leaders.push(item);
        held += item.weight;
        if (
          leaders.length >= ADAPTIVE.candidates ||
          (leaders.length >= 2 && held >= ADAPTIVE.coverage)
        )
          break;
      }
      const pool = model.questions.flatMap((question, q) => (answers.has(question.id) ? [] : [q]));
      for (let k = 0; k < options.count && pool.length; k++) {
        const [q] = pool.splice(Math.floor(next() * pool.length), 1);
        const r = answer(q);
        if (r === null) continue;
        const mixture = new Float64Array(7);
        for (const item of leaders) {
          const prediction = predictive(model, item, q);
          for (let j = 0; j < 7; j++) mixture[j] += (item.weight / held) * prediction[j];
        }
        out.answers++;
        out.loss -= Math.log2(Math.max(1e-12, mixture[r + 3]));
        for (const x of mixture) if (x > 1e-12) out.entropy -= x * Math.log2(x);
      }
    }
  }
  const n = out.answers || 1;
  return { answers: out.answers, loss: out.loss / n, entropy: out.entropy / n };
}

export interface Outside {
  players: number;
  /** Share flagged loose: the page says no variant fits clearly. */
  loose: number;
  /** Share whose lead fits worse than a follower's own variant usually does (FITS): the page says the library may lack it. */
  strained: number;
  /** Share told the quiz is sure ("cao"): the lead holds ADAPTIVE.confident and fits. */
  claimed: number;
  /** Mean weight of the lead. */
  confidence: number;
  questions: number;
}

/**
 * Players whose tradition the library lacks: followers of variants of `truth` (another
 * model's rows over the same questions, e.g. the whole library) matched on `model`, a
 * library without them. Nothing they could be named is right; what matters is whether the
 * quiz says so, or claims to be sure of a variant that only beats the others.
 */
export function simulateOutside(
  model: Model,
  truth: Truth,
  rows: readonly number[],
  options: Omit<SimulationOptions, 'truth' | 'variants'>,
): Outside {
  const population = options.population ?? POPULATION;
  const out: Outside = {
    players: 0,
    loose: 0,
    strained: 0,
    claimed: 0,
    confidence: 0,
    questions: 0,
  };
  for (const v of rows) {
    for (let p = 0; p < options.perVariant; p++) {
      const next = playerStream(options.seed, v, p);
      const answer = follower(model, truth, v, population, next);
      const run = play(model, answer, options.mode, options.seed + p, options.adaptive);
      const called = verdict(model, run.estimate, run.ranked);
      out.players++;
      out.questions += run.asked;
      out.confidence += called.lead.weight;
      if (called.loose) out.loose++;
      if (called.strained) out.strained++;
      if (!called.strained && called.lead.weight >= ADAPTIVE.confident) out.claimed++;
    }
  }
  const n = out.players || 1;
  return {
    players: out.players,
    loose: out.loose / n,
    strained: out.strained / n,
    claimed: out.claimed / n,
    confidence: out.confidence / n,
    questions: out.questions / n,
  };
}

export interface Comparison {
  players: number;
  /** Share of players whose own variant each method ranks first, and in its top three. */
  top1: Record<string, number>;
  top3: Record<string, number>;
}

/**
 * The matcher against the other methods (baselines.ts) on the same players. Each player is
 * scored three ways: on the fixed part only; on the questions this quiz's adaptive stage
 * chose; and on the fixed part plus as many other questions drawn at random, so no method
 * is given questions picked for another.
 */
export function compareMethods(
  model: Model,
  methods: Record<string, (model: Model, estimate: Estimate) => number[]>,
  options: SimulationOptions,
): Record<'fixed' | 'adaptive' | 'random', Comparison> {
  const population = options.population ?? POPULATION;
  const truth = options.truth ?? ownTruth(model);
  const rows = options.variants ?? model.variants.map((_, v) => v);
  const all = {
    ours: (m: Model, e: Estimate) => match(m, e).map((item) => item.index),
    ...methods,
  };
  const empty = (): Comparison => ({
    players: 0,
    top1: Object.fromEntries(Object.keys(all).map((k) => [k, 0])),
    top3: Object.fromEntries(Object.keys(all).map((k) => [k, 0])),
  });
  const out = { fixed: empty(), adaptive: empty(), random: empty() };
  const score = (into: Comparison, est: Estimate, v: number) => {
    into.players++;
    for (const [name, rank] of Object.entries(all)) {
      const order = rank(model, est);
      if (order[0] === v) into.top1[name]++;
      if (order.slice(0, 3).includes(v)) into.top3[name]++;
    }
  };
  for (const v of rows) {
    for (let p = 0; p < options.perVariant; p++) {
      const next = playerStream(options.seed, v, p);
      const answer = follower(model, truth, v, population, next);
      // One set of answers per player, so every method reads the same ones.
      const known = new Map<number, Answer>();
      const ask = (q: number) => {
        if (!known.has(q)) known.set(q, answer(q));
        return known.get(q) as Answer;
      };
      const base = baseQuestions(model, options.mode, options.seed + p);
      const fixed = new Map(
        base.map((question) => [question.id, ask(model.questionIndex.get(question.id) as number)]),
      );
      score(out.fixed, estimate(model, fixed), v);
      const run = play(model, ask, options.mode, options.seed + p, true);
      score(out.adaptive, run.estimate, v);
      const extra = run.asked - base.length;
      const pool = model.questions
        .map((question, q) => ({ question, q }))
        .filter(({ question }) => !fixed.has(question.id));
      const drawn = new Map(fixed);
      for (let k = 0; k < extra && pool.length; k++) {
        const [{ question, q }] = pool.splice(Math.floor(next() * pool.length), 1);
        drawn.set(question.id, ask(q));
      }
      score(out.random, estimate(model, drawn), v);
    }
  }
  for (const part of Object.values(out))
    for (const name of Object.keys(all)) {
      part.top1[name] /= part.players || 1;
      part.top3[name] /= part.players || 1;
    }
  return out;
}
