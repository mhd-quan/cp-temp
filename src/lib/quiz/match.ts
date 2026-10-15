import { ACQUIESCENCE, type Model, NOISE, PROFILE_SD, SCALE_USE, TEMPERATURE } from './model.ts';
import type { Estimate } from './score.ts';
import type { Family, Variant } from './types.ts';

// Matching (docs/quiz/method.md, "So khớp"). Every variant predicts an answer to every
// question (profiles.ts). A player who follows variant v is modelled as answering
//
//   r_i = α + λ·m_vi + ε_i,   ε_i ~ N(0, NOISE² + τ_vi²)
//
// where m_vi is v's expected answer, τ_vi how loosely it binds its followers, λ how strongly
// the player uses the scale compared with a committed adherent, and α the player's lean
// toward agreeing whatever the question. α and λ are not guessed: their priors are
// integrated out, so each variant is judged by the probability of the player's actual
// answers under it (its evidence), with the slope kept positive. The pattern of answers
// decides, not how hard the player presses the ends of the scale.

/** A result needs answers on at least this many axes… */
export const MIN_AXES = 10;
/** …and on at least this many of the 36 facets… */
export const MIN_FACETS = 24;
/** …and at least this many answers in all. */
export const MIN_ANSWERS = 36;
/** Below this lean from the centre, in points (0–100), the player stands in the middle on most facets. */
export const CENTRE = 10;
/**
 * Above this mean squared standardised residual the lead does not fit. In the cross-rater
 * simulation a follower's lead never passes 1.1 while random answers seldom stay under 1.3,
 * so this flags about nine random sheets in ten and no followers (method.md, "Khi quiz không
 * kết luận").
 */
export const LOOSE = 1.25;
/**
 * Above this mean squared standardised residual the lead explains the answers less well than
 * a follower's own variant usually does: the 95th percentile of followers in the cross-rater
 * simulation. Players whose tradition the library lacks pass it about five times as often
 * (method.md, "Khi thư viện thiếu"). Below LOOSE the page still names the lead, but the
 * quiz neither calls itself sure nor asks on to make it look surer.
 */
export const FITS = 0.95;
/** Above this scatter, in points, answers on the same facet diverge like random picks. */
export const SCATTERED = 36;
/** A runner-up with at least this share of the leader's weight is too near to call. */
export const CLOSE = 0.5;

const LOG_2PI = Math.log(2 * Math.PI);

/** Complementary error function, relative error below 1.2e-7 (Numerical Recipes, erfcc). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

/** Standard normal distribution function. */
export const normalCdf = (x: number) => 0.5 * erfc(-x / Math.SQRT2);

/** log Φ(x), accurate far into the lower tail. */
export function logNormalCdf(x: number): number {
  if (x > -6) return Math.log(normalCdf(x));
  const x2 = x * x;
  return -0.5 * x2 - Math.log(-x) - 0.5 * LOG_2PI + Math.log(1 - 1 / x2 + 3 / (x2 * x2));
}

const logNormalPdf = (x: number) => -0.5 * x * x - 0.5 * LOG_2PI;

/** The posterior of (α, λ) under one variant, and the evidence for it. */
export interface Posterior {
  /** log p(answers | variant), natural log. */
  evidence: number;
  /** Posterior mean of the lean toward agreeing. */
  alpha: number;
  /** Posterior mean of the slope, given that it is positive. */
  scale: number;
  /** Posterior variance of the lean, given that the slope is positive. */
  alphaVar: number;
  /** Posterior variance of the slope, given that it is positive. */
  scaleVar: number;
  /** Posterior covariance of the lean and the slope, given that the slope is positive. */
  covariance: number;
}

/**
 * Evidence for one profile, in closed form: with Gaussian priors on α and λ the answers are
 * jointly Gaussian, r ~ N(μλ·m, D + sα²·11ᵀ + sλ²·mmᵀ), whose density needs only 2 × 2
 * algebra (Woodbury); keeping λ > 0 multiplies it by P(λ > 0 | answers) / P(λ > 0).
 * `values` are the answers, `means` and `variances` the profile's expectations and their
 * variances (without NOISE), all of length n.
 */
export function posterior(
  values: ArrayLike<number>,
  means: ArrayLike<number>,
  variances: ArrayLike<number>,
): Posterior {
  const mu = SCALE_USE.mean;
  const sa2 = ACQUIESCENCE * ACQUIESCENCE;
  const sl2 = SCALE_USE.sd * SCALE_USE.sd;
  const noise = NOISE * NOISE;
  let Sw = 0;
  let Swm = 0;
  let Swmm = 0;
  let Swe = 0;
  let Swme = 0;
  let Swee = 0;
  let Slog = 0;
  const n = values.length;
  for (let i = 0; i < n; i++) {
    const v = noise + variances[i];
    const w = 1 / v;
    const m = means[i];
    const e = values[i] - mu * m;
    Sw += w;
    Swm += w * m;
    Swmm += w * m * m;
    Swe += w * e;
    Swme += w * m * e;
    Swee += w * e * e;
    Slog += Math.log(v);
  }
  const A11 = 1 / sa2 + Sw;
  const A12 = Swm;
  const A22 = 1 / sl2 + Swmm;
  const det = A11 * A22 - A12 * A12;
  const dAlpha = (A22 * Swe - A12 * Swme) / det;
  const dScale = (A11 * Swme - A12 * Swe) / det;
  const quad = Swee - (Swe * dAlpha + Swme * dScale);
  const logDet = Slog + Math.log(sa2 * sl2) + Math.log(det);
  const scaleMode = mu + dScale;
  // The Gaussian posterior of (α, λ) before the cut has covariance A⁻¹.
  const gaussScaleVar = A11 / det;
  const gaussAlphaVar = A22 / det;
  const gaussCovariance = -A12 / det;
  const scaleSd = Math.sqrt(gaussScaleVar);
  const z = scaleMode / scaleSd;
  const positive = logNormalCdf(z);
  const evidence =
    -0.5 * (n * LOG_2PI + logDet + quad) + positive - logNormalCdf(mu / SCALE_USE.sd);
  // Mean and variance of the slope given λ > 0 (a normal cut at zero), then the moments of
  // α, which given the slope is normal with mean linear in it: E[α | λ] = α̂ + b·(λ − λ̂).
  const mills = Math.exp(logNormalPdf(z) - positive);
  const scale = scaleMode + scaleSd * mills;
  const scaleVar = gaussScaleVar * Math.max(1e-6, 1 - mills * (z + mills));
  const b = gaussCovariance / gaussScaleVar;
  const alpha = dAlpha + b * (scale - scaleMode);
  const alphaVar = gaussAlphaVar - b * gaussCovariance + b * b * scaleVar;
  const covariance = b * scaleVar;
  return { evidence, alpha, scale, alphaVar, scaleVar, covariance };
}

export interface Match extends Posterior {
  variant: Variant;
  /** Row of the variant in the model. */
  index: number;
  /** 0–100, falling as the evidence falls: the number the page shows (see `fitIndex`). */
  fit: number;
  /** Mean squared standardised residual at the posterior mean: about 1 for a real follower. */
  misfit: number;
  /** Tempered posterior share among all variants: for the adaptive stage and "too close to call". */
  weight: number;
}

export interface FamilyMatch {
  family: Family;
  /** The family's best variant. */
  best: Match;
}

/** Axes with at least one answer, fixed or chosen. */
export function answeredAxes(estimate: Estimate): number {
  return estimate.every.axes.filter((axis) => axis.n > 0).length;
}

/** Facets with at least one answer, fixed or chosen. */
export function answeredFacets(estimate: Estimate): number {
  return estimate.every.facets.filter((facet) => facet.n > 0).length;
}

/** Whether the answers cover enough of the quiz to name a result. */
export function coverage(estimate: Estimate): {
  axes: number;
  facets: number;
  answers: number;
  enough: boolean;
} {
  const axes = answeredAxes(estimate);
  const facets = answeredFacets(estimate);
  return {
    axes,
    facets,
    answers: estimate.answered,
    enough: axes >= MIN_AXES && facets >= MIN_FACETS && estimate.answered >= MIN_ANSWERS,
  };
}

/** Root-mean-square distance from the centre over the answered facets, in points. */
export function lean(estimate: Estimate): number {
  let sum = 0;
  let count = 0;
  for (const facet of estimate.facets) {
    if (facet.n === 0) continue;
    sum += (facet.mean - 50) ** 2;
    count++;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

/** One variant's expectations over the answered questions. */
export function columns(model: Model, estimate: Estimate, v: number) {
  const Q = model.questions.length;
  const means = estimate.asked.map((q) => model.expected[v * Q + q]);
  const variances = estimate.asked.map((q) => model.variance[v * Q + q]);
  return { means, variances };
}

/**
 * The displayed fit: the evidence per answer, relative to a profile that would have
 * predicted every answer exactly, halved on the log scale so that a real follower lands
 * near 80. Monotone in the evidence, so the list reads in the order it is ranked.
 */
export function fitIndex(evidence: number, ideal: number, n: number): number {
  return n ? Math.min(100, 100 * Math.exp((evidence - ideal) / (2 * n))) : 0;
}

/**
 * The evidence for a profile that would have expected exactly the player's answers, held
 * as firmly as adherents who agree: the top of the scale `fitIndex` measures against.
 */
export function idealEvidence(estimate: Estimate): number {
  const means = estimate.values.map((value) => value / SCALE_USE.mean);
  const agreed = PROFILE_SD.agreed * PROFILE_SD.agreed;
  return posterior(
    estimate.values,
    means,
    means.map(() => agreed),
  ).evidence;
}

/** Mean squared standardised residual of the answers at a posterior's mean. */
export function misfitOf(
  estimate: { values: ArrayLike<number> },
  found: Posterior,
  means: ArrayLike<number>,
  variances: ArrayLike<number>,
): number {
  const n = estimate.values.length;
  const noise = NOISE * NOISE;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const e = estimate.values[i] - found.alpha - found.scale * means[i];
    sum += (e * e) / (noise + variances[i]);
  }
  return n ? sum / n : 0;
}

/** Every variant, most likely first. */
export function match(model: Model, estimate: Estimate): Match[] {
  const n = estimate.asked.length;
  const ideal = idealEvidence(estimate);
  const scored = model.variants.map((variant, v): Match => {
    const { means, variances } = columns(model, estimate, v);
    const found = posterior(estimate.values, means, variances);
    return {
      ...found,
      variant,
      index: v,
      fit: fitIndex(found.evidence, ideal, n),
      misfit: misfitOf(estimate, found, means, variances),
      weight: 0,
    };
  });
  scored.sort((x, y) => y.evidence - x.evidence || x.variant.id.localeCompare(y.variant.id));
  const best = scored[0]?.evidence ?? 0;
  let total = 0;
  for (const item of scored) {
    item.weight = Math.exp((item.evidence - best) / TEMPERATURE);
    total += item.weight;
  }
  for (const item of scored) item.weight /= total;
  return scored;
}

/** Families ranked by their closest variant; a family never gains by having many. */
export function matchFamilies(model: Model, matches: readonly Match[]): FamilyMatch[] {
  const byFamily = new Map<string, FamilyMatch>();
  for (const item of matches) {
    if (byFamily.has(item.variant.family)) continue;
    const family = model.families.find(({ id }) => id === item.variant.family);
    if (family) byFamily.set(family.id, { family, best: item });
  }
  return [...byFamily.values()];
}

export interface Verdict {
  /** Too few answers to say anything: the page asks for more instead of naming a result. */
  insufficient: boolean;
  lead: Match;
  family: FamilyMatch;
  runnerUp: Match | undefined;
  /** The runner-up holds at least CLOSE of the leader's weight: show both. */
  close: boolean;
  /** The player stands near the middle on most facets. */
  centre: boolean;
  /** Even the lead leaves the answers poorly explained. */
  loose: boolean;
  /** The lead fits less well than a follower's own variant usually does: the library may lack the player's tradition. */
  strained: boolean;
  /** Answers on the same facets diverge like random picks. */
  scattered: boolean;
}

export function verdict(model: Model, estimate: Estimate, matches: readonly Match[]): Verdict {
  const lead = matches[0];
  const runnerUp = matches[1];
  const family = matchFamilies(model, matches).find(
    (item) => item.family.id === lead.variant.family,
  ) as FamilyMatch;
  return {
    insufficient: !coverage(estimate).enough,
    lead,
    family,
    runnerUp,
    close: runnerUp !== undefined && runnerUp.weight >= CLOSE * lead.weight,
    centre: lean(estimate) < CENTRE,
    loose: lead.misfit > LOOSE,
    strained: lead.misfit > FITS,
    scattered: estimate.scatter > SCATTERED,
  };
}

/** One answered question's part in a comparison. */
export interface Contribution {
  /** Index into estimate.asked. */
  at: number;
  /** Question index in the model. */
  question: number;
  /** In natural-log units of evidence, positive when it favours the first variant. */
  value: number;
}

/**
 * How each answer moved the evidence between two variants, exactly: each answer's log
 * density under the first minus under the second, both at their own posterior means, plus
 * a remainder that belongs to no single answer (the priors on α and λ and the width of
 * their posteriors: how plausibly the player's use of the scale fits each variant). The
 * parts sum to the difference in evidence.
 */
export function contrast(
  model: Model,
  estimate: Estimate,
  first: Match,
  second: Match,
): { answers: Contribution[]; remainder: number; total: number } {
  const a = columns(model, estimate, first.index);
  const b = columns(model, estimate, second.index);
  const noise = NOISE * NOISE;
  const answers: Contribution[] = estimate.asked.map((question, i) => {
    const r = estimate.values[i];
    const va = noise + a.variances[i];
    const vb = noise + b.variances[i];
    const ea = r - first.alpha - first.scale * a.means[i];
    const eb = r - second.alpha - second.scale * b.means[i];
    const value = 0.5 * ((eb * eb) / vb - (ea * ea) / va) + 0.5 * Math.log(vb / va);
    return { at: i, question, value };
  });
  const total = first.evidence - second.evidence;
  const remainder = total - answers.reduce((sum, item) => sum + item.value, 0);
  return { answers, remainder, total };
}
