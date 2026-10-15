import {
  fitIndex,
  idealEvidence,
  type Match,
  match,
  misfitOf,
  type Posterior,
  posterior,
} from './match.ts';
import { type Model, NOISE, PROFILE_SD, place } from './model.ts';
import { decodeCell } from './profiles.ts';
import type { Estimate } from './score.ts';
import type { Catalogue, Figure, Party, State } from './types.ts';

// The people, parties and states the results page names (docs/quiz/method.md, "Người, đảng
// và nhà nước"). A person rated question by question (figure-answers.json) is expected to
// answer as rated, and only there. Where the rater left a question blank, there was nothing
// to go on, often because the question did not exist in the person's world: the blank is
// given no value, nothing stands in for it, and it neither helps nor hurts the person. A
// person's place on a facet and an axis comes from their own answers alone; a facet they
// were never asked about is unmeasured. A person not rated yet answers as their variant
// would, except on the axes where the catalogue rates them apart from it: there every facet
// question is moved by the gap, in the direction its key points.

export interface FigureMatch extends Posterior {
  figure: Figure;
  /** Row of the person's variant in the model. */
  index: number;
  /** 0–100, as for variants. */
  fit: number;
  /** Over the answers the person has an expectation for. */
  misfit: number;
  /** How many of the player's answers the person has an expectation for. */
  covered: number;
}

/** The people's own answers: question ids in column order, a profiles.ts letter per column. */
export interface FigureAnswerFile {
  items: string[];
  figures: Record<string, string>;
}

/** Facet-distance gaps within this many points count as the same place when picking per axis. */
export const AXIS_TIE = 2.5;

/** The catalogue with each rated person's own answers attached. */
export function withAnswers(catalogue: Catalogue, file: FigureAnswerFile): Catalogue {
  return {
    ...catalogue,
    figures: catalogue.figures.map((figure) => {
      const row = file.figures[figure.id];
      if (row === undefined) return figure;
      const answers: Record<string, number> = {};
      file.items.forEach((id, c) => {
        const cell = decodeCell(row[c] ?? '.');
        if (cell) answers[id] = cell.mean;
      });
      return { ...figure, answers };
    }),
  };
}

/** How far a person departs from their variant on each axis, in points (0 where rated alike). */
export function departures(model: Model, figure: Figure): number[] {
  const v = model.variantIndex.get(figure.variant);
  const variant = v === undefined ? undefined : model.variants[v];
  return model.axes.map((axis) => {
    const own = figure.axes?.[axis.id];
    return own === undefined || !variant ? 0 : own - variant.axes[axis.id];
  });
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** A person compiled against the model, as compile() does for a variant. */
interface Profile {
  /** Expected answer to each question, at [q]; NaN where a rated person was left blank. */
  expected: Float64Array;
  /** Its variance (PROFILE_SD squared), at [q]. */
  variance: Float64Array;
  /** Place on each facet, 0–100, at [f]; NaN where unmeasured. */
  facets: Float64Array;
  /** Place on each axis, 0–100, at [a]; NaN where unmeasured. */
  axes: Float64Array;
}

const compiled = new WeakMap<Model, WeakMap<Figure, Profile>>();

/** A person not rated question by question: their variant, moved on the axes they depart on. */
function proxyOf(model: Model, figure: Figure, v: number): Profile {
  const Q = model.questions.length;
  const F = model.facets.length;
  const A = model.axes.length;
  const shift = departures(model, figure);
  const expected = new Float64Array(Q);
  const variance = new Float64Array(Q);
  model.questions.forEach((question, q) => {
    const f = model.questionFacet[q];
    const m = model.expected[v * Q + q];
    expected[q] =
      f < 0 || !question.key
        ? m
        : clamp(m + (question.key * shift[model.facetAxis[f]] * 3) / 50, -3, 3);
    variance[q] = model.variance[v * Q + q];
  });
  const facets = new Float64Array(F);
  for (let f = 0; f < F; f++)
    facets[f] = clamp(model.facetPositions[v * F + f] + shift[model.facetAxis[f]], 0, 100);
  const axes = new Float64Array(A);
  for (let a = 0; a < A; a++) axes[a] = clamp(model.positions[v * A + a] + shift[a], 0, 100);
  return { expected, variance, facets, axes };
}

/** A person rated question by question: their own answers and nothing else. */
function ratedOf(model: Model, answers: Record<string, number>): Profile {
  const Q = model.questions.length;
  const F = model.facets.length;
  const A = model.axes.length;
  const agreed = PROFILE_SD.agreed * PROFILE_SD.agreed;
  const expected = new Float64Array(Q).fill(Number.NaN);
  const variance = new Float64Array(Q).fill(agreed);
  const sum = new Float64Array(F);
  const count = new Float64Array(F);
  model.questions.forEach((question, q) => {
    const own = answers[question.id];
    if (own === undefined) return;
    expected[q] = own;
    const f = model.questionFacet[q];
    if (f >= 0 && question.key) {
      sum[f] += place(question.key, own);
      count[f]++;
    }
  });
  const facets = new Float64Array(F).map((_, f) => (count[f] ? sum[f] / count[f] : Number.NaN));
  const axes = new Float64Array(A).map((_, a) => {
    let total = 0;
    let k = 0;
    for (let f = 0; f < F; f++) {
      if (model.facetAxis[f] !== a || Number.isNaN(facets[f])) continue;
      total += facets[f];
      k++;
    }
    return k ? total / k : Number.NaN;
  });
  return { expected, variance, facets, axes };
}

function profileOf(model: Model, figure: Figure): Profile {
  let byFigure = compiled.get(model);
  if (!byFigure) {
    byFigure = new WeakMap();
    compiled.set(model, byFigure);
  }
  const known = byFigure.get(figure);
  if (known) return known;
  const v = model.variantIndex.get(figure.variant) ?? 0;
  const profile = figure.answers ? ratedOf(model, figure.answers) : proxyOf(model, figure, v);
  byFigure.set(figure, profile);
  return profile;
}

/** Where a person stands on an axis, 0–100; NaN where none of their answers reaches it. */
export function figurePosition(model: Model, figure: Figure, a: number): number {
  return profileOf(model, figure).axes[a];
}

/** Where a person stands on a facet, 0–100; NaN where none of their answers reaches it. */
export function figureFacet(model: Model, figure: Figure, f: number): number {
  return profileOf(model, figure).facets[f];
}

const LOG_2PI = Math.log(2 * Math.PI);

/**
 * What a blank is worth: for each of the player's answers, the mean over the library's
 * variants of its log density under each (at the player's own lean and slope under that
 * variant), as match.ts weighs answers. It describes how well a typical tradition explains
 * the answer, says nothing about any person, and is the same for every person.
 */
export function typicalDensity(
  model: Model,
  estimate: Estimate,
  matches: readonly Match[],
): Float64Array {
  const Q = model.questions.length;
  const noise = NOISE * NOISE;
  const typical = new Float64Array(estimate.asked.length);
  if (!matches.length) return typical;
  for (const item of matches) {
    estimate.asked.forEach((q, i) => {
      const at = item.index * Q + q;
      const v = noise + model.variance[at];
      const d = estimate.values[i] - item.alpha - item.scale * model.expected[at];
      typical[i] -= 0.5 * (LOG_2PI + Math.log(v) + (d * d) / v);
    });
  }
  for (let i = 0; i < typical.length; i++) typical[i] /= matches.length;
  return typical;
}

/**
 * Every person, most likely first; people who answer alike keep catalogue order. A person
 * is judged on the answers they have an expectation for; an answer to a question they were
 * left blank on counts at its typical density (`typicalDensity`), the same for every
 * person, so no value is put in the blank and it favours no one: not the people rated on
 * many questions, nor those the raters knew little about.
 */
export function matchFigures(
  model: Model,
  estimate: Estimate,
  figures: readonly Figure[],
  matches: readonly Match[] = match(model, estimate),
): FigureMatch[] {
  const n = estimate.asked.length;
  const ideal = idealEvidence(estimate);
  const typical = typicalDensity(model, estimate, matches);
  const found: FigureMatch[] = [];
  figures.forEach((figure) => {
    const v = model.variantIndex.get(figure.variant);
    if (v === undefined) return;
    const profile = profileOf(model, figure);
    const values: number[] = [];
    const means: number[] = [];
    const variances: number[] = [];
    let blank = 0;
    estimate.asked.forEach((q, i) => {
      const m = profile.expected[q];
      const r = estimate.values[i];
      if (Number.isNaN(m)) {
        blank += typical[i];
        return;
      }
      values.push(r);
      means.push(m);
      variances.push(profile.variance[q]);
    });
    const result = posterior(values, means, variances);
    const evidence = result.evidence + blank;
    found.push({
      ...result,
      evidence,
      figure,
      index: v,
      fit: fitIndex(evidence, ideal, n),
      misfit: misfitOf({ values }, result, means, variances),
      covered: values.length,
    });
  });
  return found
    .map((item, order) => ({ item, order }))
    .sort((a, b) => b.item.evidence - a.item.evidence || a.order - b.order)
    .map(({ item }) => item);
}

/**
 * One person for each of the leading variants, in their order: the most likely of that
 * variant's people. Variants with no person are passed over.
 */
export function representatives(
  ranked: readonly FigureMatch[],
  matches: readonly Match[],
  count: number,
): FigureMatch[] {
  const chosen: FigureMatch[] = [];
  for (const item of matches) {
    const person = ranked.find(({ figure }) => figure.variant === item.variant.id);
    if (person) chosen.push(person);
    if (chosen.length >= count) break;
  }
  return chosen;
}

/**
 * How far a person stands from the player on one axis, in points: the root-mean-square gap
 * over the axis's facets that both have a place on, so two people at the same axis mean
 * for opposite reasons are not taken for one another. NaN when the person shares too few of
 * the player's facets there: all but one of them, and at least one.
 */
export function axisGap(model: Model, estimate: Estimate, figure: Figure, a: number): number {
  let mine = 0;
  let shared = 0;
  let sum = 0;
  for (let f = 0; f < model.facets.length; f++) {
    if (model.facetAxis[f] !== a || estimate.facets[f].n === 0) continue;
    mine++;
    const theirs = figureFacet(model, figure, f);
    if (Number.isNaN(theirs)) continue;
    shared++;
    sum += (estimate.facets[f].mean - theirs) ** 2;
  }
  return shared && shared >= mine - 1 ? Math.sqrt(sum / shared) : Number.NaN;
}

/**
 * For each answered axis, a person who stands where the player stands on that axis, facet
 * by facet (`axisGap`): among the people within AXIS_TIE points of the nearest, the most
 * likely overall, preferring someone not already named on another axis.
 */
export function axisFigures(
  model: Model,
  estimate: Estimate,
  ranked: readonly FigureMatch[],
): (FigureMatch | null)[] {
  const used = new Set<string>();
  return model.axes.map((_, a) => {
    if (estimate.axes[a].n === 0 || !ranked.length) return null;
    const gaps = ranked.map((item) => axisGap(model, estimate, item.figure, a));
    const placed = gaps.filter((gap) => !Number.isNaN(gap));
    if (!placed.length) return null;
    const nearest = Math.min(...placed);
    const tied = ranked.filter((_, i) => gaps[i] <= nearest + AXIS_TIE);
    const pick = tied.find((item) => !used.has(item.figure.id)) ?? tied[0] ?? null;
    if (pick) used.add(pick.figure.id);
    return pick;
  });
}

/** Parties and states that followed a variant, the most typical first. */
export function embodiments(catalogue: Catalogue, variantId: string, parties = 3, states = 2) {
  const rank = <T extends Party | State>(items: readonly T[]) =>
    items
      .map((item, index) => ({ item, index, at: item.variants.indexOf(variantId) }))
      .filter(({ at }) => at >= 0)
      .sort((a, b) => a.at - b.at || a.index - b.index)
      .map(({ item }) => item);
  return {
    parties: rank(catalogue.parties).slice(0, parties),
    states: rank(catalogue.states).slice(0, states),
  };
}
