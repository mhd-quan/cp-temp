import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { rankFacets, rankNearest, rankTwelveAxes } from '../src/lib/quiz/baselines.ts';
import { compile } from '../src/lib/quiz/model.ts';
import { compileProfiles, readRatings } from '../src/lib/quiz/ratings.ts';
import {
  compareMethods,
  heldOut,
  ownTruth,
  simulate,
  simulateOutside,
} from '../src/lib/quiz/simulate.ts';
import { axes, bank, library, profiles } from './quiz-fixtures.mjs';

// Cross-rater simulation. Players are drawn from one rater's profiles and matched on a model
// built from the other rater's alone, so the matcher never sees the answers its players were
// drawn from: the gap between two careful readers of each variant stands in for the gap
// between a profile and a real adherent. Regression guards, set a little below what the
// library reaches; docs/quiz/method.md records the full figures.

const data = new URL('../src/data/quiz/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));
const codes = read('ratings/codes.json');
const files = readdirSync(new URL('ratings/', data))
  .filter((file) => file.endsWith('.json') && file !== 'codes.json')
  .sort()
  .map((file) => read(`ratings/${file}`));
const rated = (rater, within = library) =>
  compile(
    axes,
    within,
    bank,
    compileProfiles(
      profiles.version,
      profiles.items,
      within.variants.map((variant) => variant.id),
      readRatings(files, rater, codes),
    ),
  );
const byA = rated('A');
const byB = rated('B');
const crossed = [
  [byA, ownTruth(byB)],
  [byB, ownTruth(byA)],
];

const options = { mode: 'short', perVariant: 2, seed: 1 };
const pooled = (run) => {
  const [first, second] = crossed.map(([model, truth]) => run(model, truth));
  return Object.fromEntries(
    Object.keys(first).map((key) => [
      key,
      typeof first[key] === 'number' ? (first[key] + second[key]) / 2 : first[key],
    ]),
  );
};

test("players drawn from one rater's profiles find their variant on the other's", () => {
  const result = pooled((model, truth) => simulate(model, { ...options, adaptive: true, truth }));
  assert.ok(result.variantTop1 >= 0.75, `variant top-1 ${result.variantTop1}`);
  assert.ok(result.variantTop3 >= 0.9, `variant top-3 ${result.variantTop3}`);
  assert.ok(result.familyTop1 >= 0.88, `family top-1 ${result.familyTop1}`);
  // 48+: the fixed 48, at least 32 chosen, at most 48.
  assert.ok(result.questions >= 79 && result.questions <= 96, `questions ${result.questions}`);
  // The leader's weight is no promise: it stays at or below how often the leader is right.
  assert.ok(result.confidence <= result.variantTop1 + 0.05, `confidence ${result.confidence}`);
  // Real followers are rarely flagged as not fitting any variant, or as fitting worse than
  // a follower usually does (FITS is set at about their 95th percentile).
  assert.ok(result.loose <= 0.1, `loose ${result.loose}`);
  assert.ok(result.strained <= 0.1, `strained ${result.strained}`);
  assert.ok(result.claimed >= 0.55, `claimed ${result.claimed}`);
  // Each chosen question carries about the information the matcher expected of it: the
  // weight of the player's own variant grows by most of the bits it was promised.
  assert.ok(
    result.realisedBits >= 0.6 * result.expectedBits &&
      result.realisedBits <= 1.2 * result.expectedBits,
    `expected ${result.expectedBits} bits, realised ${result.realisedBits}`,
  );
});

test('answers the matcher has not seen cost no more bits than its predictions expect', () => {
  const variants = library.variants.flatMap((_, v) => (v % 4 === 0 ? [v] : []));
  for (const [model, truth] of crossed) {
    const found = heldOut(model, {
      ...options,
      adaptive: false,
      perVariant: 1,
      count: 20,
      truth,
      variants,
    });
    assert.ok(found.answers > 500);
    assert.ok(found.loss <= found.entropy + 0.05, `loss ${found.loss}, entropy ${found.entropy}`);
  }
});

test('players whose tradition the library lacks are told so, and seldom told the quiz is sure', () => {
  // Every third family is taken out of the library in turn; its followers, drawn from one
  // rater's profiles, are matched on the other rater's library without it.
  const pooledOutside = { players: 0, strained: 0, claimed: 0 };
  for (const [rater, other] of [
    ['A', 'B'],
    ['B', 'A'],
  ]) {
    const truth = ownTruth(other === 'A' ? byA : byB);
    library.families.forEach((family, i) => {
      if (i % 3) return;
      const within = {
        families: library.families.filter((item) => item !== family),
        variants: library.variants.filter((variant) => variant.family !== family.id),
      };
      const rows = library.variants.flatMap((variant, v) =>
        variant.family === family.id ? [v] : [],
      );
      const found = simulateOutside(rated(rater, within), truth, rows, {
        ...options,
        adaptive: true,
        perVariant: 1,
      });
      pooledOutside.players += found.players;
      pooledOutside.strained += found.strained * found.players;
      pooledOutside.claimed += found.claimed * found.players;
    });
  }
  const strained = pooledOutside.strained / pooledOutside.players;
  const claimed = pooledOutside.claimed / pooledOutside.players;
  // Followers are strained in about one case in twenty; outsiders in several times as many.
  assert.ok(strained >= 0.2, `strained ${strained}`);
  // Followers hear "cao" about seven times in ten; outsiders far less often.
  assert.ok(claimed <= 0.3, `claimed ${claimed}`);
});

test('the adaptive questions sharpen the answer beyond the fixed 48', () => {
  const fixed = pooled((model, truth) => simulate(model, { ...options, adaptive: false, truth }));
  const adaptive = pooled((model, truth) => simulate(model, { ...options, adaptive: true, truth }));
  assert.ok(
    adaptive.variantTop1 > fixed.variantTop1 + 0.05,
    `${fixed.variantTop1} → ${adaptive.variantTop1}`,
  );
});

test('the matcher beats a 12axes-style composite, facet means and nearest answers', () => {
  const methods = { twelveAxes: rankTwelveAxes, facets: rankFacets, nearest: rankNearest };
  for (const [model, truth] of crossed) {
    const result = compareMethods(model, methods, { ...options, perVariant: 1, truth });
    for (const stage of ['fixed', 'adaptive', 'random'])
      for (const name of Object.keys(methods))
        assert.ok(
          result[stage].top1.ours >= result[stage].top1[name],
          `${stage}: ours ${result[stage].top1.ours} < ${name} ${result[stage].top1[name]}`,
        );
  }
});
