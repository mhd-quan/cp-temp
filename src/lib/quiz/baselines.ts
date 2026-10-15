import type { Model } from './model.ts';
import type { Estimate } from './score.ts';

// Other ways to match, kept only to measure the quiz's own matcher against them on the same
// synthetic players (simulate.ts, docs/quiz/method.md, "So với cách khác"). Neither is used
// by the page.

/**
 * The composite score of 12axes (github.com/RomanCypherpunk/12axes, README, "Matching",
 * as of commit a1dc5b4), applied to our twelve axis scores against each variant's twelve
 * axis positions: axis by axis nearness 0.42, direction 0.33, magnitude 0.18, the worst
 * axis 0.07. Its method only; none of its data.
 */
export function twelveAxesScore(you: ArrayLike<number>, them: ArrayLike<number>): number {
  const n = you.length;
  let axis = 0;
  let dot = 0;
  let uu = 0;
  let tt = 0;
  let youIntensity = 0;
  let themIntensity = 0;
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const diff = Math.abs(you[i] - them[i]);
    const base = Math.max(0, 1 - (diff / 50) ** 2);
    const opposite =
      (you[i] - 50) * (them[i] - 50) < 0
        ? 1 - 0.45 * Math.tanh(Math.abs(you[i] - 50) / 25) * Math.tanh(Math.abs(them[i] - 50) / 25)
        : 1;
    axis += 100 * base * opposite;
    const u = you[i] - 50;
    const t = them[i] - 50;
    dot += u * t;
    uu += u * u;
    tt += t * t;
    youIntensity += Math.abs(u);
    themIntensity += Math.abs(t);
    worst = Math.max(worst, diff);
  }
  axis /= n;
  const k = n * 8 * 8;
  const direction = 50 + (50 * (dot + k)) / Math.sqrt((uu + k) * (tt + k));
  const magnitude = 100 - 2 * Math.abs(youIntensity / n - themIntensity / n);
  const outlier = 100 * Math.max(0, 1 - (worst / 100) ** 2.5);
  return 0.42 * axis + 0.33 * direction + 0.18 * magnitude + 0.07 * outlier;
}

/** Variant rows ranked by the 12axes composite over the answered axes, best first. */
export function rankTwelveAxes(model: Model, estimate: Estimate): number[] {
  const axes = estimate.every.axes;
  const answered = axes.flatMap((axis, a) => (axis.n > 0 ? [a] : []));
  const you = answered.map((a) => axes[a].mean);
  const A = model.axes.length;
  const scores = model.variants.map((_, v) =>
    twelveAxesScore(
      you,
      answered.map((a) => model.positions[v * A + a]),
    ),
  );
  return scores.map((_, v) => v).sort((x, y) => scores[y] - scores[x]);
}

/**
 * The quiz's matcher before this version (30/9/2026, commit f292081): facet positions,
 * each profile scaled toward the centre by the intensity that fits best in [0.3, 1.2],
 * charged 20 points per unit away from 0.8; smallest gap first.
 */
export function rankFacets(model: Model, estimate: Estimate): number[] {
  const F = model.facets.length;
  const facets = estimate.every.facets;
  const axisFacets = model.axes.map((_, a) => model.facetAxis.filter((x) => x === a).length);
  const gaps = model.variants.map((_, v) => {
    let a = 0;
    let b = 0;
    let c = 0;
    let neutral = 0;
    for (let f = 0; f < F; f++) {
      const n = facets[f].n;
      if (!n) continue;
      const w = (1 / axisFacets[model.facetAxis[f]]) * (n / (n + 1));
      const d = model.facetPositions[v * F + f] - 50;
      const y = facets[f].mean - 50;
      a += w * d * d;
      b += w * y * d;
      c += w * y * y;
      neutral += w;
    }
    if (!neutral) return 0;
    const penalty = 400 * neutral;
    const s = Math.min(1.2, Math.max(0.3, (b + penalty * 0.8) / (a + penalty)));
    return (c - 2 * s * b + s * s * a + penalty * (s - 0.8) ** 2) / neutral;
  });
  return gaps.map((_, v) => v).sort((x, y) => gaps[x] - gaps[y]);
}

/** Plain nearest profile: root-mean-square distance over the answered facets. */
export function rankNearest(model: Model, estimate: Estimate): number[] {
  const F = model.facets.length;
  const facets = estimate.every.facets;
  const gaps = model.variants.map((_, v) => {
    let sum = 0;
    for (let f = 0; f < F; f++) {
      if (!facets[f].n) continue;
      sum += (facets[f].mean - model.facetPositions[v * F + f]) ** 2;
    }
    return sum;
  });
  return gaps.map((_, v) => v).sort((x, y) => gaps[x] - gaps[y]);
}
