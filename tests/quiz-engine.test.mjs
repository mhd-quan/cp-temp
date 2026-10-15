import assert from 'node:assert/strict';
import test from 'node:test';
import { compass, cubeStage, frame, poleAt, project, VIEWS } from '../src/lib/quiz/compass.ts';
import { edge, groupOf, PART, partings, support } from '../src/lib/quiz/insight.ts';
import {
  answeredAxes,
  contrast,
  coverage,
  FITS,
  logNormalCdf,
  match,
  matchFamilies,
  normalCdf,
  posterior,
  verdict,
} from '../src/lib/quiz/match.ts';
import {
  ACQUIESCENCE,
  compile,
  NOISE,
  PROFILE_SD,
  place,
  SCALE_USE,
} from '../src/lib/quiz/model.ts';
import {
  axisFigures,
  axisGap,
  departures,
  embodiments,
  figureFacet,
  figurePosition,
  matchFigures,
  typicalDensity,
  withAnswers,
} from '../src/lib/quiz/people.ts';
import { decodeCell, encodeCell } from '../src/lib/quiz/profiles.ts';
import { answersFromShared, shareCode } from '../src/lib/quiz/results.ts';
import { estimate } from '../src/lib/quiz/score.ts';
import {
  ADAPTIVE,
  adaptiveDone,
  baseQuestions,
  LENGTHS,
  nextQuestion,
  predictive,
  random,
} from '../src/lib/quiz/select.ts';
import { decodeResult, encodeResult } from '../src/lib/quiz/share.ts';
import { AXES } from '../src/lib/quiz/types.ts';
import { axes, bank } from './quiz-fixtures.mjs';

// The engine on small made-up libraries, so each test states exactly what its variants
// expect. The real library is tested in quiz-data, quiz-results and quiz-simulation.

const family = (id) => ({ id, name: id, en: id, summary: id });
const flat = (value) => Object.fromEntries(AXES.map((axis) => [axis, value]));
const core = bank.filter((q) => q.tier === 'core');
const fixedStandard = bank.filter((q) => q.tier === 'core' || q.tier === 'long');
const fixedDeep = bank.filter((q) => q.tier !== 'pool');

/**
 * A model of the given variants over the given questions. Each spec's `answer(question, i)`
 * gives the expected answer: a number, { mean, split }, or null for unrated.
 */
function toy(specs, questions = bank, version = 7) {
  const families = [...new Set(specs.map((spec) => spec.family ?? 'f'))];
  const library = {
    families: families.map(family),
    variants: specs.map((spec) => ({
      id: spec.id,
      family: spec.family ?? 'f',
      name: spec.id,
      en: spec.id,
      summary: spec.id,
      exemplars: [],
      period: '',
      axes: spec.axes ?? flat(50),
      status: 'draft',
      raters: [],
    })),
  };
  const profiles = {
    version,
    items: questions.map((q) => q.id),
    variants: Object.fromEntries(
      specs.map((spec) => [
        spec.id,
        questions
          .map((q, i) => {
            const value = spec.answer(q, i);
            if (value === null) return encodeCell(null);
            return encodeCell(typeof value === 'number' ? { mean: value, split: false } : value);
          })
          .join(''),
      ]),
    ),
  };
  return compile(axes, library, questions, profiles);
}

/** Expected answers drawn at random in half steps, so made-up variants differ everywhere. */
function randomProfile(seed) {
  const next = random(seed);
  return () => Math.round(next() * 12) / 2 - 3;
}

/** The same expected answers, for variants meant to agree everywhere they are not told apart. */
const table = (seed, length) => Array.from({ length }, randomProfile(seed));

const clamp7 = (value) => Math.max(-3, Math.min(3, Math.round(value))) || 0;

/** What a follower of variant v answers: their own use of the scale and lean, no noise. */
function answersOf(model, v, { scale = 1, lean = 0, questions = model.questions } = {}) {
  const Q = model.questions.length;
  return new Map(
    questions.map((question) => {
      const q = model.questionIndex.get(question.id);
      return [question.id, clamp7(lean + scale * model.expected[v * Q + q])];
    }),
  );
}

const SIX = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, k) => ({
  id,
  family: k < 3 ? 'left' : 'right',
  // Keyed by question number, so a variant expects the same answers in every model.
  answer: (
    (values) => (q) =>
      values[q.n]
  )(table(100 + k, 1024)),
}));

// Profiles.

test('every expected answer survives the letter code, divided or not, and blanks stay blank', () => {
  for (let step = 0; step <= 12; step++) {
    for (const split of [false, true]) {
      const cell = { mean: step / 2 - 3, split };
      assert.deepEqual(decodeCell(encodeCell(cell)), cell);
    }
  }
  assert.equal(encodeCell(null), '.');
  assert.equal(decodeCell('.'), null);
  assert.equal(encodeCell({ mean: 9, split: false }), 'm');
  assert.equal(encodeCell({ mean: -9, split: true }), 'n');
});

test('compiling lays out each expectation with its spread, and places variants by them', () => {
  const model = toy([
    { id: 'firm', answer: (q) => (q.key ? 2 * q.key : 1) },
    { id: 'divided', answer: (q) => ({ mean: q.key ? -q.key : 0, split: true }) },
    { id: 'blank', answer: () => null },
  ]);
  const Q = model.questions.length;
  model.questions.forEach((question, q) => {
    assert.equal(model.expected[q], question.key ? 2 * question.key : 1);
    assert.ok(Math.abs(model.variance[q] - PROFILE_SD.agreed ** 2) < 1e-6);
    assert.ok(Math.abs(model.variance[Q + q] - PROFILE_SD.split ** 2) < 1e-6);
    assert.ok(Math.abs(model.variance[2 * Q + q] - PROFILE_SD.unrated ** 2) < 1e-6);
  });
  assert.equal(model.rated[0], 1);
  assert.equal(model.rated[2], 0);
  // Agreeing at 2 with every question keyed to the second pole puts it two thirds of the way.
  const A = model.axes.length;
  for (let a = 0; a < A; a++) {
    assert.ok(Math.abs(model.positions[a] - place(1, 2)) < 1e-4);
    assert.ok(Math.abs(model.positions[A + a] - place(-1, 1)) < 1e-4);
    // Unrated, a variant stands where the editors rated it.
    assert.equal(model.positions[2 * A + a], 50);
  }
  assert.equal(model.version, 7);
});

// The evidence.

const LOG_2PI = Math.log(2 * Math.PI);
const logNormal = (x, mean, variance) =>
  -0.5 * (LOG_2PI + Math.log(variance) + ((x - mean) * (x - mean)) / variance);

/** The evidence and posterior means by brute force: a fine grid over α and positive λ. */
function quadrature(values, means, variances, steps = 500) {
  const sa = ACQUIESCENCE;
  const sl = SCALE_USE.sd;
  const mu = SCALE_USE.mean;
  const aLow = -7 * sa;
  const da = (14 * sa) / steps;
  const lHigh = mu + 9 * sl;
  const dl = lHigh / steps;
  const logs = [];
  let max = -Infinity;
  for (let i = 0; i < steps; i++) {
    const alpha = aLow + (i + 0.5) * da;
    for (let j = 0; j < steps; j++) {
      const scale = (j + 0.5) * dl;
      let value = logNormal(alpha, 0, sa * sa) + logNormal(scale, mu, sl * sl);
      for (let k = 0; k < values.length; k++)
        value += logNormal(values[k], alpha + scale * means[k], NOISE * NOISE + variances[k]);
      logs.push([alpha, scale, value]);
      if (value > max) max = value;
    }
  }
  let total = 0;
  let alpha = 0;
  let scale = 0;
  let aa = 0;
  let ll = 0;
  let al = 0;
  for (const [a, l, value] of logs) {
    const w = Math.exp(value - max);
    total += w;
    alpha += w * a;
    scale += w * l;
    aa += w * a * a;
    ll += w * l * l;
    al += w * a * l;
  }
  alpha /= total;
  scale /= total;
  return {
    evidence: max + Math.log(total * da * dl) - Math.log(normalCdf(mu / sl)),
    alpha,
    scale,
    alphaVar: aa / total - alpha * alpha,
    scaleVar: ll / total - scale * scale,
    covariance: al / total - alpha * scale,
  };
}

test('the closed-form evidence and posterior moments equal the integral over the lean and the use of the scale', () => {
  const cases = [
    {
      values: [3, 2, -1, 0, -3, 1],
      means: [2.5, 2, -1, 0.5, -2, 1],
      variances: [0.36, 0.36, 2.25, 0.36, 4.84, 0.36],
    },
    // Answers against the profile: the slope's posterior presses on zero and the cut matters.
    {
      values: [-2, -3, 2, 1, 3, -1],
      means: [2, 2.5, -2, -1, -3, 1],
      variances: [0.36, 0.36, 0.36, 2.25, 0.36, 0.36],
    },
    { values: [1, 1, 1, 1], means: [-1, 0, 1, 2], variances: [0.36, 0.36, 0.36, 0.36] },
  ];
  for (const { values, means, variances } of cases) {
    const closed = posterior(values, means, variances);
    const brute = quadrature(values, means, variances);
    assert.ok(
      Math.abs(closed.evidence - brute.evidence) < 1e-3,
      `${closed.evidence} vs ${brute.evidence}`,
    );
    assert.ok(Math.abs(closed.scale - brute.scale) < 1e-2, `λ ${closed.scale} vs ${brute.scale}`);
    assert.ok(Math.abs(closed.alpha - brute.alpha) < 1e-2, `α ${closed.alpha} vs ${brute.alpha}`);
    // The spread predictive() widens each answer by, with the slope kept positive.
    for (const key of ['alphaVar', 'scaleVar', 'covariance'])
      assert.ok(
        Math.abs(closed[key] - brute[key]) < 2e-3 + 0.02 * Math.abs(brute[key]),
        `${key} ${closed[key]} vs ${brute[key]}`,
      );
  }
});

test('the normal tail stays accurate where the slope is all but ruled out', () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-7);
  assert.ok(Math.abs(normalCdf(1.959964) - 0.975) < 1e-6);
  // Across the switch to the asymptotic series the log tail is continuous.
  assert.ok(Math.abs(logNormalCdf(-5.999) - logNormalCdf(-6.001)) < 0.02);
  assert.ok(Math.abs(logNormalCdf(-10) - -53.231285) < 1e-3);
});

test('the variant you answer like ranks first, however you use the scale, and the weights sum to one', () => {
  const model = toy(SIX, core);
  for (let v = 0; v < SIX.length; v++) {
    for (const scale of [0.45, 0.8, 1.3]) {
      for (const lean of [-0.8, 0, 0.8]) {
        const ranked = match(model, estimate(model, answersOf(model, v, { scale, lean })));
        assert.equal(ranked[0].index, v, `${SIX[v].id} at λ ${scale}, α ${lean}`);
        const total = ranked.reduce((sum, item) => sum + item.weight, 0);
        assert.ok(Math.abs(total - 1) < 1e-9);
        assert.ok(ranked.every((item, i) => i === 0 || ranked[i - 1].evidence >= item.evidence));
        assert.ok(ranked.every((item, i) => i === 0 || ranked[i - 1].fit >= item.fit));
      }
    }
  }
});

test('the fitted lean and slope recover how the player used the scale', () => {
  const model = toy(SIX, bank);
  const found = match(model, estimate(model, answersOf(model, 2, { scale: 0.6, lean: 0.7 })))[0];
  assert.equal(found.index, 2);
  assert.ok(Math.abs(found.scale - 0.6) < 0.12, `λ ${found.scale}`);
  assert.ok(Math.abs(found.alpha - 0.7) < 0.2, `α ${found.alpha}`);
});

test('a mild follower of a strong variant finds it, not the variant that sits in the middle', () => {
  const strong = randomProfile(7);
  const model = toy(
    [
      { id: 'strong', answer: (q, i) => strong(q, i) },
      { id: 'middle', answer: (_, i) => (i % 5 === 0 ? 1 : 0) },
    ],
    core,
  );
  const ranked = match(model, estimate(model, answersOf(model, 0, { scale: 0.35 })));
  assert.equal(ranked[0].variant.id, 'strong');
});

test('a variant gains nothing by being vague: a divided profile loses to a firm one that fits', () => {
  const firm = randomProfile(8);
  const model = toy(
    [
      { id: 'firm', answer: (q, i) => firm(q, i) },
      { id: 'vague', answer: () => ({ mean: 0, split: true }) },
      { id: 'blank', answer: () => null },
    ],
    core,
  );
  const ranked = match(model, estimate(model, answersOf(model, 0, { scale: 0.8 })));
  assert.equal(ranked[0].variant.id, 'firm');
});

test('families rank by their closest variant and the verdict names it', () => {
  const model = toy(SIX, core);
  const est = estimate(model, answersOf(model, 4));
  const ranked = match(model, est);
  const families = matchFamilies(model, ranked);
  assert.deepEqual(
    families.map((item) => item.family.id),
    ['right', 'left'],
  );
  const called = verdict(model, est, ranked);
  assert.equal(called.lead.variant.id, 'e');
  assert.equal(called.family.family.id, 'right');
  assert.equal(called.runnerUp, ranked[1]);
});

// Flags.

test('no result is named without answers on enough of the quiz', () => {
  const model = toy(SIX, bank);
  const economy = bank.filter((q) => q.facet?.startsWith('economy.'));
  const est = estimate(model, answersOf(model, 0, { questions: economy }));
  assert.equal(answeredAxes(est), 1);
  assert.equal(coverage(est).enough, false);
  assert.equal(verdict(model, est, match(model, est)).insufficient, true);
  const full = estimate(model, answersOf(model, 0, { questions: core }));
  assert.equal(coverage(full).enough, true);
});

test('answering in the middle is called the middle; a real follower is not', () => {
  const model = toy(SIX, core);
  const middle = estimate(model, new Map(core.map((q) => [q.id, 0])));
  assert.equal(verdict(model, middle, match(model, middle)).centre, true);
  const follower = estimate(model, answersOf(model, 1));
  const called = verdict(model, follower, match(model, follower));
  assert.equal(called.centre, false);
  assert.equal(called.loose, false);
  assert.equal(called.scattered, false);
});

test('answers that no variant explains are flagged loose', () => {
  const model = toy(SIX, core);
  // Every answer at one end of the scale or the other, by the toss of a coin.
  const next = random(21);
  const est = estimate(model, new Map(core.map((q) => [q.id, next() < 0.5 ? -3 : 3])));
  const called = verdict(model, est, match(model, est));
  assert.equal(called.loose, true, `${called.lead.variant.id} misfit ${called.lead.misfit}`);
});

test('contradicting yourself on the same facet is flagged scattered', () => {
  const model = toy(SIX, fixedStandard);
  const seen = new Map();
  const answers = new Map();
  for (const question of fixedStandard) {
    const k = seen.get(question.facet) ?? 0;
    seen.set(question.facet, k + 1);
    answers.set(question.id, (k % 2 ? -3 : 3) * question.key);
  }
  const est = estimate(model, answers);
  assert.equal(verdict(model, est, match(model, est)).scattered, true);
});

test('two variants that expect the same answers are too close to call', () => {
  const same = table(9, core.length);
  const model = toy(
    [
      { id: 'one', answer: (_, i) => same[i] },
      { id: 'two', answer: (_, i) => same[i] },
      ...SIX.slice(0, 3),
    ],
    core,
  );
  const est = estimate(model, answersOf(model, 0));
  const called = verdict(model, est, match(model, est));
  assert.equal(called.close, true);
  assert.ok(['one', 'two'].includes(called.lead.variant.id));
});

// Explanations.

test('every reason is read off the sums that ranked the lead', () => {
  const model = toy(SIX, bank);
  const next = random(3);
  for (let player = 0; player < 6; player++) {
    const answers = new Map(
      [...answersOf(model, player % 6, { scale: 0.7 })].map(([id, value]) => [
        id,
        clamp7(value + (next() < 0.25 ? (next() < 0.5 ? -2 : 2) : 0)),
      ]),
    );
    const est = estimate(model, answers);
    const ranked = match(model, est);
    const [lead, second] = ranked;
    const parts = contrast(model, est, lead, second);
    const sum = parts.answers.reduce((total, part) => total + part.value, 0);
    assert.ok(Math.abs(sum + parts.remainder - (lead.evidence - second.evidence)) < 1e-9);
    const found = edge(model, est, lead, second);
    assert.ok(found);
    assert.ok(Math.abs(found.margin - parts.total) < 1e-9);
    // The group named carries more of the push than any other group.
    const sums = new Map();
    for (const part of parts.answers) {
      const group = groupOf(model, part.question);
      const key = group.kind === 'axis' ? `a${group.index}` : `t${group.id}`;
      sums.set(key, (sums.get(key) ?? 0) + part.value);
    }
    const named = found.group.kind === 'axis' ? `a${found.group.index}` : `t${found.group.id}`;
    assert.equal(Math.max(...sums.values()), sums.get(named));
    for (const quote of found.quotes) {
      assert.ok(quote.value > 0);
      assert.ok(Math.abs(quote.expected - quote.other) >= 1);
      assert.deepEqual(groupOf(model, quote.question), found.group);
    }
    const seen = new Set();
    for (const quote of support(model, est, lead)) {
      assert.ok(Math.abs(quote.expected) >= 1 && Math.abs(quote.answer) >= 1);
      assert.equal(Math.sign(quote.answer - lead.alpha), Math.sign(quote.expected));
      const group = groupOf(model, quote.question);
      const key = JSON.stringify(group);
      assert.ok(!seen.has(key), 'one quote per group');
      seen.add(key);
    }
    for (const quote of partings(model, est, lead))
      assert.ok(Math.abs(quote.answer - quote.expected) >= PART);
  }
});

test('when two variants differ on one question only, that question is the edge', () => {
  const target = bank.find((q) => q.theme && q.tier === 'pool');
  const questions = [...core, target];
  const shared = table(11, questions.length);
  const model = toy(
    [
      { id: 'yes', answer: (q, i) => (q === target ? 3 : shared[i]) },
      { id: 'no', answer: (q, i) => (q === target ? -3 : shared[i]) },
    ],
    questions,
  );
  const answers = answersOf(model, 0);
  const est = estimate(model, answers);
  const [lead, second] = match(model, est);
  assert.equal(lead.variant.id, 'yes');
  const found = edge(model, est, lead, second);
  assert.deepEqual(found.group, { kind: 'theme', id: target.theme });
  assert.equal(model.questions[found.quotes[0].question].id, target.id);
});

// The adaptive stage.

test('the fixed part is 48, 72 or 144 questions, repeatable, never the same axis twice in a row', () => {
  const model = toy(SIX, bank);
  for (const mode of ['short', 'standard', 'deep']) {
    const order = baseQuestions(model, mode, 42);
    assert.equal(order.length, LENGTHS[mode].base);
    assert.equal(new Set(order.map((q) => q.id)).size, order.length);
    assert.deepEqual(
      baseQuestions(model, mode, 42).map((q) => q.id),
      order.map((q) => q.id),
    );
    assert.notDeepEqual(
      baseQuestions(model, mode, 43).map((q) => q.id),
      order.map((q) => q.id),
    );
    const axisOf = (q) => q.facet?.split('.')[0] ?? `theme ${q.id}`;
    for (let i = 1; i < order.length; i++) assert.notEqual(axisOf(order[i]), axisOf(order[i - 1]));
    // Agreeing with everything leaves every axis in the middle, or in depth one question off it.
    const est = estimate(model, new Map(order.map((q) => [q.id, 2])));
    for (const axis of est.axes)
      assert.ok(Math.abs(axis.mean - 50) < (mode === 'deep' ? 13 : 1e-9), `${mode} ${axis.mean}`);
    const keys = order.reduce((sum, q) => sum + (q.key ?? 0), 0);
    assert.equal(keys, 0, mode);
  }
  // In depth the themes are dealt through the round, not left in a run at its end.
  const deep = baseQuestions(model, 'deep', 42);
  const lastFacet = deep.findLastIndex((q) => q.facet);
  assert.ok(lastFacet >= deep.length - 4, `last facet question at ${lastFacet}`);
  assert.ok(deep.slice(0, 48).some((q) => !q.facet));
});

test('each answer is predicted as a proper distribution over the seven points', () => {
  const model = toy(SIX, core);
  const ranked = match(model, estimate(model, answersOf(model, 0)));
  for (let q = 0; q < model.questions.length; q += 7) {
    const p = predictive(model, ranked[0], q);
    assert.equal(p.length, 7);
    assert.ok(p.every((x) => x >= 0));
    assert.ok(Math.abs(p.reduce((s, x) => s + x, 0) - 1) < 1e-9);
  }
});

test('the next question is one that tells the leaders apart', () => {
  const shared = table(12, bank.length);
  const split = new Set(
    bank
      .filter((q) => q.tier === 'pool')
      .slice(0, 6)
      .map((q) => q.id),
  );
  const model = toy([
    { id: 'yes', answer: (q, i) => (split.has(q.id) ? 3 : shared[i]) },
    { id: 'no', answer: (q, i) => (split.has(q.id) ? -3 : shared[i]) },
  ]);
  const answers = answersOf(model, 0, { questions: core });
  const pick = nextQuestion(model, estimate(model, answers), new Set(answers.keys()));
  assert.ok(split.has(pick.question.id), pick.question.id);
  assert.ok(pick.information > 0.3, `${pick.information} bits`);
});

test('the adaptive stage stops between its minimum and its maximum', () => {
  const pick = { question: bank[0], information: 0.5 };
  const sure = [{ weight: ADAPTIVE.confident, misfit: 0.5 }];
  const unsure = [{ weight: 0.4, misfit: 0.5 }];
  for (const mode of ['short', 'standard', 'deep']) {
    const { min } = LENGTHS[mode];
    assert.equal(adaptiveDone(mode, min - 1, sure, pick), false);
    assert.equal(adaptiveDone(mode, min, sure, pick), true);
    assert.equal(adaptiveDone(mode, min, unsure, pick), false);
    assert.equal(
      adaptiveDone(mode, min, unsure, { ...pick, information: ADAPTIVE.idle / 2 }),
      true,
    );
    assert.equal(adaptiveDone(mode, 0, unsure, null), true);
  }
  // 48+ stops at its ceiling; 72+ and 144+ have none, and ask on while a question still
  // tells the leaders apart.
  assert.equal(adaptiveDone('short', LENGTHS.short.max, unsure, pick), true);
  for (const mode of ['standard', 'deep']) {
    assert.equal(LENGTHS[mode].max, Number.POSITIVE_INFINITY);
    assert.equal(adaptiveDone(mode, 400, unsure, pick), false);
    assert.equal(adaptiveDone(mode, 400, sure, pick), true);
  }
  // The floors are the old ceilings: nothing is concluded before them, and a longer length
  // never asks fewer chosen questions than a shorter one.
  assert.ok(LENGTHS.short.min >= 32 && LENGTHS.standard.min >= 48);
  assert.ok(LENGTHS.deep.min >= LENGTHS.standard.min);
});

test('when no variant fits as a follower would, the questions stop instead of sharpening the least bad', () => {
  const pick = { question: bank[0], information: 0.5 };
  const { min } = LENGTHS.standard;
  // Ahead of everything else, but explaining the answers worse than a follower's own variant.
  const strained = [{ weight: 0.6, misfit: FITS + 0.05 }];
  assert.equal(adaptiveDone('standard', min - 1, strained, pick), false);
  assert.equal(adaptiveDone('standard', min, strained, pick), true);
  // Nearly all the weight is no reason to ask on either; and it is never called sure.
  const dominant = [{ weight: 0.99, misfit: FITS + 0.05 }];
  assert.equal(adaptiveDone('standard', min, dominant, pick), true);
  // A toy library without the player's variant: answers it cannot place are flagged.
  const model = toy(SIX.slice(0, 3), bank);
  const outsider = toy(SIX, bank);
  const answers = answersOf(outsider, 4, { questions: core, scale: 0.8 });
  const est = estimate(model, answers);
  const called = verdict(model, est, match(model, est));
  assert.equal(called.strained, true, `misfit ${called.lead.misfit}`);
});

// Reading the answers.

test('keys point each answer at the right pole, and a skip counts for nothing', () => {
  const model = toy(SIX, bank);
  const facetItems = bank.filter((q) => q.facet);
  const high = estimate(model, new Map(facetItems.map((q) => [q.id, 3 * q.key])));
  assert.ok(high.axes.every((axis) => Math.abs(axis.mean - 100) < 1e-9));
  const answers = new Map();
  for (const q of facetItems) {
    if (q.facet.startsWith('economy.'))
      answers.set(q.id, q.facet === 'economy.steering' ? null : -2 * q.key);
  }
  const est = estimate(model, answers);
  const steering = est.facets[model.facetIndex.get('economy.steering')];
  assert.equal(steering.n, 0);
  assert.equal(steering.mean, 50);
  const economy = est.axes[AXES.indexOf('economy')];
  assert.ok(Math.abs(economy.mean - place(1, -2)) < 1e-9);
  assert.equal(economy.facets, 2);
  assert.equal(est.answered, answers.size - [...answers.values()].filter((v) => v === null).length);
  assert.ok(est.scatter < 1e-6);
});

test('the bars read the fixed part only; questions chosen for the player move the match, not the bars', () => {
  const model = toy(SIX, bank);
  const answers = answersOf(model, 2, { questions: core });
  const before = estimate(model, answers);
  // Pool questions on one facet, answered at the far end of it.
  const chosen = bank.filter((q) => q.tier === 'pool' && q.facet === 'economy.planning');
  for (const q of chosen) answers.set(q.id, 3 * q.key);
  const after = estimate(model, answers);
  assert.deepEqual(after.facets, before.facets);
  assert.deepEqual(after.axes, before.axes);
  assert.equal(after.answered, before.answered + chosen.length);
  const f = model.facetIndex.get('economy.planning');
  assert.equal(after.every.facets[f].n, before.every.facets[f].n + chosen.length);
  assert.equal(after.length, 'short');
  // 72+'s fixed part counts once the long tier has been answered, 144+'s once the deep tier
  // has been too.
  for (const [length, questions] of [
    ['standard', fixedStandard],
    ['deep', fixedDeep],
  ]) {
    const read = estimate(model, answersOf(model, 2, { questions }));
    assert.equal(read.length, length);
    assert.equal(
      read.facets.reduce((sum, facet) => sum + facet.n, 0),
      questions.filter((q) => q.facet).length,
    );
  }
});

test('a habit of agreeing moves no axis, and on a facet asked one way only what is left of it', () => {
  const model = toy(SIX, bank);
  // No views at all, and a strong habit of agreeing with whatever is said.
  const yes = (questions) => estimate(model, new Map(questions.map((q) => [q.id, 2])));
  const standard = yes(core);
  assert.ok(standard.acquiescence > 1, `lean ${standard.acquiescence}`);
  for (const axis of standard.axes) assert.ok(Math.abs(axis.mean - 50) < 1e-9);
  for (const [f, facet] of standard.facets.entries()) {
    // A facet asked both ways cancels the habit exactly; one asked one way keeps only the part
    // the estimate of the lean has not caught, far less than the 33 points read raw.
    const keys = core.filter((q) => q.facet === model.facets[f]).map((q) => q.key);
    const offset = Math.abs(facet.mean - 50);
    if (keys.includes(1) && keys.includes(-1)) assert.ok(offset < 1e-9);
    else assert.ok(Math.abs(offset - ((2 - standard.acquiescence) * 50) / 3) < 1e-9);
  }
  // In the full length every facet is asked both ways: the habit cancels everywhere.
  const full = yes(fixedStandard);
  for (const facet of full.facets) assert.ok(Math.abs(facet.mean - 50) < 1e-9);
  // A view held through the habit still shows.
  const lean = estimate(model, answersOf(model, 0, { questions: fixedStandard, lean: 1 }));
  const plain = estimate(model, answersOf(model, 0, { questions: fixedStandard }));
  for (let a = 0; a < model.axes.length; a++)
    assert.ok(Math.abs(lean.axes[a].mean - plain.axes[a].mean) < 12, model.axes[a].id);
});

test('a theme question is matched on but moves no axis', () => {
  const model = toy(SIX, bank);
  const theme = bank.filter((q) => q.theme).slice(0, 10);
  const est = estimate(model, new Map(theme.map((q) => [q.id, 3])));
  assert.equal(est.answered, 10);
  assert.ok(est.axes.every((axis) => axis.n === 0 && axis.mean === 50));
});

// Shared links.

test('a link carries every answer by question number and its profiles version', () => {
  const next = random(5);
  for (let player = 0; player < 20; player++) {
    const answers = new Map();
    for (let n = 1; n <= 1023; n++) if (next() < 0.1) answers.set(n, Math.floor(next() * 7) - 3);
    const code = encodeResult(player * 37, answers);
    const shared = decodeResult(code);
    assert.equal(shared.version, 3);
    assert.equal(shared.profiles, player * 37);
    assert.deepEqual(
      shared.answers,
      [...answers].sort((a, b) => a[0] - b[0]),
    );
  }
  assert.deepEqual(decodeResult(encodeResult(0, new Map())), {
    version: 3,
    profiles: 0,
    answers: [],
  });
  assert.throws(() => encodeResult(1, new Map([[1024, 1]])));
  assert.throws(() => encodeResult(1, new Map([[3, 4]])));
});

test('a damaged link is refused and an old one is recognised, never rebuilt', () => {
  const code = encodeResult(
    4,
    new Map([
      [1, 3],
      [2, -3],
      [5, 0],
    ]),
  );
  assert.equal(decodeResult(`${code}A`), null);
  assert.equal(decodeResult(code.replace(/^3\./, '4.')), null);
  assert.equal(decodeResult('3.4.'), null);
  // An answer code of 7 is outside the scale.
  assert.equal(decodeResult(encodeResult(4, new Map([[1, 3]])).replace(/\.[^.]*$/, '.ABf_')), null);
  assert.deepEqual(decodeResult(`2.${'A'.repeat(62)}`), { version: 2, legacy: true });
  assert.deepEqual(decodeResult(`1.${'A'.repeat(14)}`), { version: 1, legacy: true });
  assert.deepEqual(decodeResult(`1.${'A'.repeat(14)}.nordic-model`), { version: 1, legacy: true });
  assert.equal(decodeResult('1.short'), null);
  assert.equal(decodeResult('hello'), null);
});

test('a link rebuilds the answers, and says when the result was recomputed', () => {
  const model = toy(SIX, bank, 12);
  const answers = answersOf(model, 2, { questions: core });
  answers.set(bank.find((q) => q.tier === 'pool').id, null);
  const shared = decodeResult(shareCode(model, answers));
  const back = answersFromShared(model, shared);
  assert.equal(back.recomputed, false);
  assert.deepEqual(
    [...back.answers].sort(),
    [...answers].filter(([, value]) => value !== null).sort(),
  );
  const newer = toy(SIX, bank, 13);
  assert.equal(answersFromShared(newer, shared).recomputed, true);
  // A question since dropped from the bank cannot be matched on: the result is recomputed.
  const fewer = toy(SIX, bank.slice(1), 12);
  assert.ok(answers.has(bank[0].id));
  assert.equal(answersFromShared(fewer, shared).recomputed, true);
});

// People.

const person = (id, variant, axisValues) => ({
  id,
  name: id,
  life: '1900–1990',
  role: id,
  variant,
  axes: axisValues,
});

test('a person answers as their variant, except on the axes where they depart from it', () => {
  const model = toy(
    SIX.map((spec) => ({ ...spec, axes: flat(30) })),
    core,
  );
  const figures = [
    person('plain', 'a'),
    person('market', 'a', { economy: 90 }),
    person('other', 'd'),
  ];
  assert.deepEqual(departures(model, figures[1])[AXES.indexOf('economy')], 60);
  const base = model.positions[AXES.indexOf('economy')];
  assert.ok(
    Math.abs(
      figurePosition(model, figures[1], AXES.indexOf('economy')) - Math.min(100, base + 60),
    ) < 1e-6,
  );
  const est = estimate(model, answersOf(model, 0));
  const ranked = matchFigures(model, est, figures);
  const [lead] = match(model, est);
  assert.deepEqual(
    ranked.map((item) => item.figure.id),
    ['plain', 'market', 'other'],
  );
  assert.ok(Math.abs(ranked[0].evidence - lead.evidence) < 1e-9);
});

test('a person rated question by question answers and stands as rated, and a blank is left blank', () => {
  const model = toy(
    SIX.map((spec) => ({ ...spec, axes: flat(30) })),
    core,
  );
  const Q = model.questions.length;
  const F = model.facets.length;
  const d = model.variantIndex.get('d');
  const items = model.questions.map((question) => question.id);
  // Rated as d's adherents answer on every question but those of one facet, left blank.
  const silent = model.questionFacet[0];
  const blank = (q) => model.questionFacet[q] === silent;
  const row = items
    .map((_, q) => (blank(q) ? '.' : encodeCell({ mean: model.expected[d * Q + q], split: false })))
    .join('');
  const { figures } = withAnswers(
    {
      flags: {},
      parties: [],
      states: [],
      figures: [person('plain', 'a'), person('rated', 'a'), person('elsewhere', 'f')],
    },
    { items, figures: { rated: row, elsewhere: row } },
  );
  assert.equal(figures[0].answers, undefined);
  assert.equal(Object.keys(figures[1].answers).length, items.filter((_, q) => !blank(q)).length);

  const est = estimate(model, answersOf(model, d));
  const matches = match(model, est);
  const ranked = matchFigures(model, est, figures, matches);
  assert.equal(ranked[2].figure.id, 'plain');
  // Nothing of the variant stands in for a blank: the same answers score the same under any variant.
  const [rated, elsewhere] = ['rated', 'elsewhere'].map((id) =>
    ranked.find((item) => item.figure.id === id),
  );
  assert.ok(Math.abs(rated.evidence - elsewhere.evidence) < 1e-9);
  // A blank counts at the typical density, the same for everyone: the covered answers decide.
  const typical = typicalDensity(model, est, matches);
  const covered = est.asked.flatMap((q, i) => (blank(q) ? [] : [i]));
  const own = posterior(
    covered.map((i) => est.values[i]),
    covered.map((i) => figures[1].answers[items[est.asked[i]]]),
    covered.map(() => PROFILE_SD.agreed ** 2),
  );
  const rest = est.asked.reduce((sum, q, i) => sum + (blank(q) ? typical[i] : 0), 0);
  assert.ok(Math.abs(rated.evidence - (own.evidence + rest)) < 1e-9);
  assert.equal(rated.covered, covered.length);
  // It stands where its own answers put it, and nowhere on the facet it was never asked.
  for (let f = 0; f < F; f++) {
    const n = model.questionFacet.filter((facet) => facet === f).length;
    if (f === silent) {
      assert.ok(Number.isNaN(figureFacet(model, figures[1], f)));
      continue;
    }
    if (n < 2) continue;
    assert.ok(Math.abs(figureFacet(model, figures[1], f) - model.facetPositions[d * F + f]) < 1e-4);
    assert.ok(Math.abs(figureFacet(model, figures[0], f) - model.facetPositions[f]) < 1e-9);
  }
  const a = model.facetAxis[silent];
  const others = model.facets
    .map((_, f) => f)
    .filter((f) => model.facetAxis[f] === a && f !== silent)
    .map((f) => figureFacet(model, figures[1], f));
  assert.ok(
    Math.abs(
      figurePosition(model, figures[1], a) - others.reduce((x, y) => x + y, 0) / others.length,
    ) < 1e-9,
  );
});

test('each axis names the person nearest on that axis, sharing out the ties', () => {
  const model = toy(
    SIX.map((spec) => ({ ...spec, axes: flat(30) })),
    core,
  );
  const figures = [person('plain', 'a'), person('twin', 'a'), person('far', 'd', { power: 0 })];
  const est = estimate(model, answersOf(model, 0));
  const perAxis = axisFigures(model, est, matchFigures(model, est, figures));
  assert.equal(perAxis.length, 12);
  assert.ok(perAxis.every(Boolean));
  assert.ok(perAxis.some((item) => item.figure.id === 'twin'));
});

test('on an axis, people are matched facet by facet, and never where they were not asked', () => {
  const model = toy(SIX, core);
  const foreign = AXES.indexOf('foreign');
  const facets = model.facets.flatMap((_, f) => (model.facetAxis[f] === foreign ? [f] : []));
  const items = model.questions.map((question) => question.id);
  // Two people at the same mean on foreign affairs, for opposite reasons, and one never asked.
  const row = (toward) =>
    model.questions
      .map((question, q) => {
        const f = model.questionFacet[q];
        if (model.facetAxis[f] !== foreign) return encodeCell({ mean: 0, split: false });
        return encodeCell({ mean: question.key * toward[facets.indexOf(f)], split: false });
      })
      .join('');
  const silent = model.questions
    .map((_, q) => (model.facetAxis[model.questionFacet[q]] === foreign ? '.' : 'g'))
    .join('');
  const { figures } = withAnswers(
    {
      flags: {},
      parties: [],
      states: [],
      figures: [person('liberal', 'a'), person('realist', 'a'), person('ancient', 'a')],
    },
    { items, figures: { liberal: row([0, 3, -3]), realist: row([0, -3, 3]), ancient: silent } },
  );
  for (const figure of figures.slice(0, 2))
    assert.ok(Math.abs(figurePosition(model, figure, foreign) - 50) < 1e-9);
  assert.ok(Number.isNaN(figurePosition(model, figures[2], foreign)));
  // The player stands with the liberal internationalist: law yes, intervention yes.
  const answers = new Map(
    core.map((question) => {
      const q = model.questionIndex.get(question.id);
      const f = model.questionFacet[q];
      const toward = [0, 3, -3][facets.indexOf(f)] ?? 0;
      return [question.id, model.facetAxis[f] === foreign ? question.key * toward : 0];
    }),
  );
  const est = estimate(model, answers);
  assert.ok(Math.abs(est.axes[foreign].mean - 50) < 1e-9);
  assert.equal(est.axes[foreign].divided, true);
  const ranked = matchFigures(model, est, figures);
  assert.ok(Number.isNaN(axisGap(model, est, figures[2], foreign)));
  assert.equal(axisGap(model, est, figures[0], foreign), 0);
  assert.ok(axisGap(model, est, figures[1], foreign) > 50);
  assert.equal(axisFigures(model, est, ranked)[foreign].figure.id, 'liberal');
});

test('parties and states are listed for a variant, the most typical first', () => {
  const party = (id, variants) => ({
    id,
    name: id,
    country: 'x',
    period: 'x',
    variants,
    emblem: {},
  });
  const state = (id, variants) => ({ id, name: id, period: 'x', variants, flag: 'x' });
  const catalogue = {
    flags: {},
    parties: [party('a', ['right', 'left']), party('b', ['left']), party('c', ['right'])],
    states: [state('s', ['right']), state('t', ['left', 'right']), state('u', ['right'])],
    figures: [],
  };
  const { parties, states } = embodiments(catalogue, 'left');
  assert.deepEqual(
    parties.map((p) => p.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    states.map((s) => s.id),
    ['t'],
  );
  assert.deepEqual(
    embodiments(catalogue, 'right').states.map((s) => s.id),
    ['s', 'u'],
  );
});

test('the cube averages economy with distribution, reads power and liberty as how hard a state rules, and change as it is', () => {
  // economy, distribution, trade, power, liberty, elites, lifestyle, religion, identity, environment, foreign, change
  assert.deepEqual(compass([10, 30, 0, 80, 60, 0, 0, 0, 0, 0, 0, 90]), [20, 30, 90]);
});

test('the cube is drawn the same way it is turned: faces seen straight on, the front edges in front', () => {
  // Straight on, the front face is the familiar compass: the market to the right, the hard state up.
  const right = project([1, 0, 0], VIEWS.front);
  const up = project([0, 1, 0], VIEWS.front);
  assert.ok(right.x > 0 && Math.abs(right.y) < 1e-9);
  assert.ok(up.y < 0 && Math.abs(up.x) < 1e-9);
  // From above, change runs down the page; from the side, across it.
  assert.ok(project([0, 0, 1], VIEWS.top).y > 0);
  assert.ok(project([0, 0, 1], VIEWS.side).x > 0);
  // Turned, nine edges show in front and three hide behind.
  const lines = frame(VIEWS.free);
  assert.equal((lines.front.match(/M/g) ?? []).length, 9);
  assert.equal((lines.back.match(/M/g) ?? []).length, 3);
  // Seen end on, an axis's two names fade rather than print over each other.
  assert.equal(poleAt(2, 1, VIEWS.front).opacity, 0);
  assert.equal(poleAt(0, 1, VIEWS.front).opacity, 1);
  const stage = cubeStage({ dots: [{ at: [50, 50, 50], family: 'f', name: '<x>' }], label: 'a' });
  assert.match(stage, /data-p="50 50 50"/);
  assert.match(stage, /&lt;x&gt;/);
});
