import assert from 'node:assert/strict';
import test from 'node:test';
import { COHERENT, coherence, LINKED, wording } from '../src/lib/quiz/construct.ts';
import { LENGTHS } from '../src/lib/quiz/select.ts';
import {
  validateAxes,
  validateBank,
  validateLibrary,
  validateProfiles,
  validateThemes,
} from '../src/lib/quiz/validate.ts';
import { axes, bank, library, model, profiles, themes } from './quiz-fixtures.mjs';

test('twelve axes, each with facets and five anchors', () => {
  assert.deepEqual(validateAxes(axes), []);
  assert.equal(model.facets.length, 36);
});

test('themes: each names the line it draws between close variants', () => {
  assert.deepEqual(validateThemes(themes), []);
  assert.ok(themes.length >= 16);
});

test('question bank: the fixed parts of the three lengths, and a pool to choose from', () => {
  assert.deepEqual(validateBank(axes, bank, themes), []);
  const live = bank.filter((q) => q.status !== 'dropped');
  const count = (tier) => live.filter((q) => q.tier === tier).length;
  assert.equal(count('core'), LENGTHS.short.base);
  assert.equal(count('core') + count('long'), LENGTHS.standard.base);
  assert.equal(count('core') + count('long') + count('deep'), LENGTHS.deep.base);
  // In depth, every theme the axes do not draw is asked at least once.
  const deepThemes = new Set(live.filter((q) => q.tier === 'deep' && !q.facet).map((q) => q.theme));
  assert.equal(deepThemes.size, themes.length);
  // Enough to choose the longest adaptive floor many times over, on axes and themes alike.
  assert.ok(count('pool') >= 6 * LENGTHS.deep.min);
  assert.ok(live.filter((q) => q.tier === 'pool' && !q.facet).length >= 2 * LENGTHS.deep.min);
});

test('an axis is a hypothesis: the library says which hold together, and method.md names them', () => {
  const found = coherence(model);
  // Foreign affairs mixes force, international law and intervention, which the library holds
  // apart; change mixes pace with the acceptance of violence. Both read facet by facet
  // (docs/quiz/method.md, "Trục là giả thuyết"). A change here needs the doc changed too.
  assert.deepEqual(
    model.axes.filter((_, a) => found[a].composite).map((axis) => axis.id),
    ['foreign', 'change'],
  );
  for (const [a, axis] of model.axes.entries()) {
    if (found[a].composite) continue;
    assert.ok(found[a].alpha >= COHERENT, `${axis.id} α ${found[a].alpha}`);
    assert.ok(found[a].weakest >= LINKED, `${axis.id} r ${found[a].weakest}`);
  }
});

test('the fixed questions keyed each way are worded nearly alike on every axis', () => {
  // Balanced keys do not make balanced wording: the offsets of the questions keyed each way
  // must not move any bar more than a few points (docs/quiz/method.md, "Trục là giả thuyết").
  for (const tiers of [['core'], ['core', 'long'], ['core', 'long', 'deep']]) {
    const { lean } = wording(model, tiers);
    for (const [a, axis] of model.axes.entries())
      assert.ok(Math.abs(lean[a]) <= 6.5, `${tiers.join('+')} ${axis.id} ${lean[a].toFixed(1)}`);
  }
});

test('questions never name current institutions or officeholders', () => {
  const banned = [
    'Quốc hội',
    'Bộ Chính trị',
    'Tổng Bí thư',
    'Chủ tịch nước',
    'Thủ tướng',
    'Đảng Cộng sản',
  ];
  for (const q of bank) {
    for (const word of banned) assert.ok(!q.text.includes(word), `${q.id} names ${word}`);
  }
});

test('library: families of variants, every one complete and internally consistent', () => {
  assert.deepEqual(validateLibrary(axes, library), []);
  assert.ok(library.families.length >= 24);
  assert.ok(library.variants.length >= 150);
});

test('library carries the variants the result must be able to name', () => {
  const ids = new Set(library.variants.map((v) => v.id));
  for (const id of [
    'american-conservatism',
    'aristocratic-conservatism',
    'authoritarian-liberalism',
    'caesarism',
    'laissez-faire',
    'christian-right',
    'catholic-integralism',
    'athenian-democracy',
    'cultural-nationalism',
    'authoritarian-capitalism',
    'liberal-interventionism',
    'mercantilism',
    'new-deal-liberalism',
  ]) {
    assert.ok(ids.has(id), id);
  }
});

test('every variant answers every question, as two raters judged it', () => {
  assert.deepEqual(validateProfiles(bank, library, profiles), []);
  for (const [id, row] of Object.entries(profiles.variants))
    assert.ok(!row.includes('.'), `${id} leaves questions unrated`);
});

/** Questions on which two variants' adherents answer at least this far apart. */
const APART = 2;
/** Each pair of variants is told apart by at least this many questions. */
const SEPARATING = 3;

test('every two variants are told apart by several questions, not by one wording', () => {
  const Q = model.questions.length;
  const V = model.variants.length;
  const thin = [];
  for (let x = 0; x < V; x++) {
    for (let y = x + 1; y < V; y++) {
      let apart = 0;
      for (let q = 0; q < Q; q++) {
        if (Math.abs(model.expected[x * Q + q] - model.expected[y * Q + q]) >= APART) apart++;
      }
      if (apart < SEPARATING)
        thin.push(`${model.variants[x].id} / ${model.variants[y].id}: ${apart}`);
    }
  }
  assert.deepEqual(thin, []);
});
