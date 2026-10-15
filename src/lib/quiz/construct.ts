import type { Model } from './model.ts';

// Whether each axis holds together, and whether its fixed questions lean one way in their
// wording (docs/quiz/method.md, "Trục là giả thuyết"). An axis score is the mean of three
// facets; that mean says something only if the facets move together. Across the library's
// variants we can test that: where they do not, the axis is a composite, and the page reads
// it facet by facet. Balanced keys are not balanced wording either: a question keyed one
// way can be easier to agree with than its mirror. Neither check uses real answers yet; the
// pilot repeats both on them.

/** Below this Cronbach α of its facets across the library, an axis is a composite. */
export const COHERENT = 0.7;
/** Two facets of one axis correlating below this across the library make it a composite. */
export const LINKED = 0.3;

export interface Coherence {
  /** Cronbach α of the axis's facets, as the variants' places on them vary across the library. */
  alpha: number;
  /** Correlation of each pair of the axis's facets across the library: [first, second, r]. */
  pairs: [number, number, number][];
  /** The weakest of them. */
  weakest: number;
  /** The facets do not move together: the axis mean is not one position. */
  composite: boolean;
}

function correlation(x: ArrayLike<number>, y: ArrayLike<number>): number {
  const n = x.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i] / n;
    my += y[i] / n;
  }
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

const variance = (x: ArrayLike<number>) => {
  const n = x.length;
  let m = 0;
  for (let i = 0; i < n; i++) m += x[i] / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += (x[i] - m) ** 2;
  return n > 1 ? s / (n - 1) : 0;
};

const coherences = new WeakMap<Model, Coherence[]>();

/** How well each axis's facets move together across the library, axis by axis. */
export function coherence(model: Model): Coherence[] {
  const known = coherences.get(model);
  if (known) return known;
  const V = model.variants.length;
  const F = model.facets.length;
  const column = (f: number) =>
    Float64Array.from({ length: V }, (_, v) => model.facetPositions[v * F + f]);
  const found = model.axes.map((_, a): Coherence => {
    const facets = model.facets.flatMap((_, f) => (model.facetAxis[f] === a ? [f] : []));
    const columns = facets.map(column);
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < facets.length; i++)
      for (let j = i + 1; j < facets.length; j++)
        pairs.push([facets[i], facets[j], correlation(columns[i], columns[j])]);
    const k = facets.length;
    const total = Float64Array.from({ length: V }, (_, v) =>
      columns.reduce((sum, values) => sum + values[v], 0),
    );
    const parts = columns.reduce((sum, values) => sum + variance(values), 0);
    const whole = variance(total);
    const alpha = k > 1 && whole ? (k / (k - 1)) * (1 - parts / whole) : 1;
    const weakest = pairs.length ? Math.min(...pairs.map(([, , r]) => r)) : 1;
    return { alpha, pairs, weakest, composite: alpha < COHERENT || weakest < LINKED };
  });
  coherences.set(model, found);
  return found;
}

export interface Wording {
  /**
   * Each keyed question's offset, in scale points: how much more a variant agrees with it
   * than its place on the facet, read from the facet's other rated questions, would say;
   * averaged over the library. NaN for a theme question.
   */
  offsets: Float64Array;
  /**
   * For each axis, how far the offsets of its fixed questions push the axis score, in points
   * (0–100), with the facets weighed as the bars weigh them: positive toward the second pole.
   * Zero when the questions keyed each way are worded alike.
   */
  lean: number[];
}

/**
 * Whether the fixed questions keyed each way are worded alike. A question's offset is the
 * agreement its wording draws beyond the facet position: m_vi − key · 3(p_vf − 50)/50, where
 * p_vf is variant v's place on the facet from its other rated questions. Offsets that differ
 * between the two keys move the bars even when the keys are balanced.
 */
export function wording(model: Model, tiers: readonly string[] = ['core']): Wording {
  const V = model.variants.length;
  const Q = model.questions.length;
  const F = model.facets.length;
  const byFacet = model.facets.map(() => [] as number[]);
  model.questions.forEach((question, q) => {
    const f = model.questionFacet[q];
    if (f >= 0 && question.key) byFacet[f].push(q);
  });
  const rated = (at: number) => model.variance[at] < 4;
  const offsets = new Float64Array(Q).fill(Number.NaN);
  model.questions.forEach((question, q) => {
    const f = model.questionFacet[q];
    if (f < 0 || !question.key) return;
    let sum = 0;
    let count = 0;
    for (let v = 0; v < V; v++) {
      if (!rated(v * Q + q)) continue;
      let toward = 0;
      let k = 0;
      for (const other of byFacet[f]) {
        if (other === q || !rated(v * Q + other)) continue;
        toward += (model.questions[other].key as number) * model.expected[v * Q + other];
        k++;
      }
      if (!k) continue;
      sum += model.expected[v * Q + q] - question.key * (toward / k);
      count++;
    }
    offsets[q] = count ? sum / count : 0;
  });
  // The bars: each facet the mean of its poles, each axis the mean of its facets.
  const lean = model.axes.map((_, a) => {
    let total = 0;
    let facets = 0;
    for (let f = 0; f < F; f++) {
      if (model.facetAxis[f] !== a) continue;
      const poles = [1, -1].map((key) =>
        byFacet[f].filter(
          (q) => model.questions[q].key === key && tiers.includes(model.questions[q].tier),
        ),
      );
      const present = poles.filter((items) => items.length);
      if (!present.length) continue;
      let shift = 0;
      for (const items of present) {
        const key = model.questions[items[0]].key as number;
        shift += (key * items.reduce((sum, q) => sum + offsets[q], 0)) / items.length;
      }
      total += ((shift / present.length) * 50) / 3;
      facets++;
    }
    return facets ? total / facets : 0;
  });
  return { offsets, lean };
}
