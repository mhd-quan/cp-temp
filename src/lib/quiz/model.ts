import { decodeCell, type ProfileFile } from './profiles.ts';
import type { Axis, Family, Library, Question, Variant } from './types.ts';

// Tuning constants. Answers are on the seven-point scale, −3 … 3, unless noted;
// docs/quiz/method.md explains each one, and the pilot re-estimates them from real answers.

/**
 * Spread of one answer around what the player's tradition would answer, once the player's
 * own use of the scale is allowed for: each person's quirks on single questions plus the
 * noise of answering at all.
 */
export const NOISE = 1.3;
/**
 * How loosely a profile's expected answer binds its followers: where adherents agree, where
 * they are divided (or the raters were apart), and where nobody has rated the question.
 */
export const PROFILE_SD = { agreed: 0.6, split: 1.5, unrated: 2.2 } as const;
/**
 * How strongly a person uses the scale compared with a committed adherent's expected
 * answers (the slope λ): real people seldom pick the ends of the scale, so the prior centres
 * below 1. The slope is kept positive: nobody fits a tradition by answering its opposite.
 */
export const SCALE_USE = { mean: 0.75, sd: 0.35 } as const;
/** Prior spread of a person's lean toward agreeing whatever the question (the intercept α). */
export const ACQUIESCENCE = 0.4;
/**
 * The evidence is divided by this before the weights are formed: answers from one person are
 * not independent draws, so the raw posterior would be overconfident. Calibrated so that the
 * leader's weight matches how often the leader is right in simulation.
 */
export const TEMPERATURE = 1;

/** Axes, facets, questions and variants flattened into arrays for the scorer and the matcher. */
export interface Model {
  axes: Axis[];
  facets: string[];
  facetIndex: Map<string, number>;
  facetAxis: number[];
  families: Family[];
  variants: Variant[];
  variantIndex: Map<string, number>;
  /** Questions that can be asked (not dropped), in column order. */
  questions: Question[];
  questionIndex: Map<string, number>;
  /** Each question's facet index, or −1 for a theme question. */
  questionFacet: Int16Array;
  /** Expected answer of variant v to question q, at [v · questions + q]. */
  expected: Float32Array;
  /** Variance of that expectation (PROFILE_SD squared), same layout. */
  variance: Float32Array;
  /** Share of the questions each variant has been rated on. */
  rated: Float32Array;
  /** Where each variant stands on each facet, 0–100, as its expected answers place it, at [v · facets + f]. */
  facetPositions: Float32Array;
  /** Where each variant stands on each axis, 0–100, at [v · axes + a]. */
  positions: Float32Array;
  /** The version of the expected answers (profiles.json), carried by shared links. */
  version: number;
}

/** An answer's place on its facet, 0–100. */
export const place = (key: number, answer: number) => 50 + (key * answer * 50) / 3;

/**
 * Standing in for a question nobody has rated for a variant: a facet question takes the
 * answer the variant's rated facet position implies, a theme question says nothing.
 */
function fallback(question: Question, variant: Variant, axes: Axis[]): number {
  if (!question.facet || !question.key) return 0;
  const axis = axes.find((item) => question.facet?.startsWith(`${item.id}.`));
  const value = variant.facets?.[question.facet] ?? (axis ? variant.axes[axis.id] : 50);
  return Math.min(3, Math.max(-3, (3 * question.key * (value - 50)) / 50));
}

export function compile(
  axes: Axis[],
  library: Library,
  bank: readonly Question[],
  profiles: ProfileFile,
): Model {
  const facets: string[] = [];
  const facetAxis: number[] = [];
  axes.forEach((axis, a) => {
    for (const facet of axis.facets) {
      facets.push(facet.id);
      facetAxis.push(a);
    }
  });
  const facetIndex = new Map(facets.map((id, f) => [id, f]));
  const questions = bank.filter((question) => question.status !== 'dropped');
  const questionIndex = new Map(questions.map((question, q) => [question.id, q]));
  const questionFacet = Int16Array.from(questions, (question) =>
    question.facet ? (facetIndex.get(question.facet) ?? -1) : -1,
  );
  const column = new Map(profiles.items.map((id, c) => [id, c]));

  const V = library.variants.length;
  const Q = questions.length;
  const F = facets.length;
  const expected = new Float32Array(V * Q);
  const variance = new Float32Array(V * Q);
  const rated = new Float32Array(V);
  const facetPositions = new Float32Array(V * F);
  const positions = new Float32Array(V * axes.length);
  const sd = (value: number) => value * value;

  library.variants.forEach((variant, v) => {
    const row = profiles.variants[variant.id] ?? '';
    const sum = new Float64Array(F);
    const count = new Float64Array(F);
    let ratedCount = 0;
    questions.forEach((question, q) => {
      const c = column.get(question.id);
      const cell = c === undefined ? null : decodeCell(row[c] ?? '.');
      const at = v * Q + q;
      if (cell) {
        expected[at] = cell.mean;
        variance[at] = sd(cell.split ? PROFILE_SD.split : PROFILE_SD.agreed);
        ratedCount++;
        const f = questionFacet[q];
        if (f >= 0 && question.key) {
          sum[f] += place(question.key, cell.mean);
          count[f]++;
        }
      } else {
        expected[at] = fallback(question, variant, axes);
        variance[at] = sd(PROFILE_SD.unrated);
      }
    });
    rated[v] = Q ? ratedCount / Q : 0;
    // A facet is placed by its rated questions; with fewer than two, by the editorial rating.
    facets.forEach((id, f) => {
      facetPositions[v * F + f] =
        count[f] >= 2
          ? sum[f] / count[f]
          : (variant.facets?.[id] ?? variant.axes[axes[facetAxis[f]].id]);
    });
    axes.forEach((_, a) => {
      let total = 0;
      let k = 0;
      for (let f = 0; f < F; f++) {
        if (facetAxis[f] !== a) continue;
        total += facetPositions[v * F + f];
        k++;
      }
      positions[v * axes.length + a] = k ? total / k : 50;
    });
  });

  return {
    axes,
    facets,
    facetIndex,
    facetAxis,
    families: library.families,
    variants: library.variants,
    variantIndex: new Map(library.variants.map((variant, v) => [variant.id, v])),
    questions,
    questionIndex,
    questionFacet,
    expected,
    variance,
    rated,
    facetPositions,
    positions,
    version: profiles.version,
  };
}

/** A variant's position on an axis, 0–100. */
export function position(model: Model, v: number, a: number): number {
  return model.positions[v * model.axes.length + a];
}
