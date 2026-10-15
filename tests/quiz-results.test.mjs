import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { coherence } from '../src/lib/quiz/construct.ts';
import { emblemGlyph, flagGlyph, ideaMark, sealGlyph } from '../src/lib/quiz/glyphs.ts';
import { groupOf, leanOf, PART, standouts } from '../src/lib/quiz/insight.ts';
import { MARKS } from '../src/lib/quiz/marks.ts';
import { contrast, FITS, LOOSE } from '../src/lib/quiz/match.ts';
import {
  familyRoles,
  fitChroma,
  luminance,
  contrast as luminanceContrast,
  SURFACES,
} from '../src/lib/quiz/palette.ts';
import { embodiments } from '../src/lib/quiz/people.ts';
import {
  answersFromShared,
  buildResult,
  estimateFromShared,
  FIGURES,
  shareCode,
  TOP,
} from '../src/lib/quiz/results.ts';
import { estimate } from '../src/lib/quiz/score.ts';
import { ADAPTIVE, random } from '../src/lib/quiz/select.ts';
import { decodeResult, encodeResult } from '../src/lib/quiz/share.ts';
import {
  answerWords,
  apart,
  axisPosition,
  axisReference,
  axisRows,
  compassCube,
  confidence,
  credits,
  embodied,
  esc,
  facetNotes,
  farthest,
  figures,
  fitted,
  hero,
  holders,
  leanTag,
  percent,
  positionList,
  profile,
  REFERENCES,
  RING,
  standing,
  sureness,
  topHeading,
  topList,
  why,
} from '../src/lib/quiz/view.ts';
import { catalogue, library, model, themes } from './quiz-fixtures.mjs';

const glyphs = JSON.parse(
  readFileSync(new URL('../src/data/quiz/glyphs.json', import.meta.url), 'utf8'),
);

const Q = model.questions.length;
const clamp7 = (value) => Math.max(-3, Math.min(3, Math.round(value))) || 0;

/**
 * What a follower of this variant answers on the fixed part of the quiz (core and long
 * questions): its expected answer, scaled by how firmly they press the scale, no noise.
 */
function answersLike(id, scale = 1) {
  const v = model.variantIndex.get(id);
  return new Map(
    model.questions
      .filter((q) => q.tier !== 'pool')
      .map((q) => [q.id, clamp7(scale * model.expected[v * Q + model.questionIndex.get(q.id)])]),
  );
}

/** Variants spread through the library, so the tests name none of them. */
const SAMPLE = model.variants.filter((_, i) => i % 24 === 5);

/** Someone in the middle: no opinion on most questions, a mild one on one in three. */
function middling(seed) {
  const next = random(seed);
  return new Map(
    model.questions
      .filter((q) => q.tier !== 'pool')
      .map((q) => [q.id, next() < 0.33 ? (next() < 0.5 ? -1 : 1) : 0]),
  );
}

/** Someone who answers at random, so their answers on one facet disagree. */
function scatteredPlayer(seed) {
  const next = random(seed);
  return new Map(
    model.questions.filter((q) => q.tier !== 'pool').map((q) => [q.id, Math.floor(next() * 7) - 3]),
  );
}

/** A clear follower, a mild one, a scattered one and one in the middle. */
function players() {
  return [
    { name: 'clear', answers: answersLike(SAMPLE[0].id) },
    { name: 'clear, other', answers: answersLike(SAMPLE[3].id) },
    { name: 'mild', answers: answersLike(SAMPLE[1].id, 0.35) },
    { name: 'scattered', answers: scatteredPlayer(3) },
    { name: 'middle', answers: middling(8) },
    { name: 'blank', answers: new Map(model.questions.map((q) => [q.id, 0])) },
  ];
}

const themeMap = new Map(themes.map((theme) => [theme.id, theme]));
const context = {
  model,
  themes: themeMap,
  axes: model.axes,
  families: new Map(library.families.map((family) => [family.id, family])),
  variants: new Map(library.variants.map((variant) => [variant.id, variant])),
  glyphs,
  catalogue,
  portraits: {},
};

/** Every tile of the results page, in the order the page sets them. */
function allTiles(ctx, result, est) {
  return [
    hero(ctx, result),
    topList(ctx, result),
    embodied(ctx, result),
    figures(ctx, result),
    credits(ctx, result),
    axisReference(ctx, result),
    axisRows(ctx, result, est),
    why(ctx, result),
    apart(ctx, result),
    farthest(ctx, result, est),
    compassCube(ctx, result),
  ].join('\n');
}

test('a result lists the closest variants, closest first, with one person for each', () => {
  for (const { id } of SAMPLE) {
    const est = estimate(model, answersLike(id));
    const result = buildResult(model, est, catalogue);
    assert.equal(result.matches.length, model.variants.length);
    assert.deepEqual(result.top, result.matches.slice(0, TOP));
    assert.equal(result.top.length, TOP);
    assert.equal(result.top[0], result.lead);
    assert.ok(
      result.top.every((item, i) => i === 0 || result.top[i - 1].evidence >= item.evidence),
    );
    assert.ok(result.top.every((item, i) => i === 0 || result.top[i - 1].fit >= item.fit));
    assert.equal(new Set(result.top.map((item) => item.variant.id)).size, TOP);
    assert.equal(result.lead.variant.family, result.family.family.id);
    assert.equal(result.family.best, result.lead);
    assert.ok(!result.verdict.insufficient, id);
    assert.equal(result.scores.length, model.axes.length);
    assert.equal(result.farthest, result.matches[result.matches.length - 1]);
    // One person for each of the leading variants, in their order, none twice.
    assert.equal(result.figures.length, FIGURES);
    const order = result.matches.map((item) => item.variant.id);
    const rank = result.figures.map((person) => order.indexOf(person.figure.variant));
    assert.ok(
      rank.every((r, i) => r >= 0 && (i === 0 || rank[i - 1] < r)),
      id,
    );
    assert.equal(new Set(result.figures.map((person) => person.figure.id)).size, FIGURES);
    // Every axis the player answered names a person; there is no such person where it was not.
    assert.equal(result.axisFigures.length, model.axes.length);
    result.axisFigures.forEach((person, a) => {
      assert.equal(person === null, est.axes[a].n === 0, `${id} axis ${a}`);
    });
    assert.ok(result.parties.length <= 3 && result.states.length <= 2);
  }
});

test('a variant with no party of its own borrows from its nearest kin, and says so', () => {
  let borrowed = 0;
  let borrowedStates = 0;
  for (const variant of model.variants) {
    const result = buildResult(model, estimate(model, answersLike(variant.id)), catalogue);
    const lead = result.lead.variant;
    const own = embodiments(catalogue, lead.id);
    const kin = result.matches
      .filter((item) => item !== result.lead && item.variant.family === lead.family)
      .map((item) => embodiments(catalogue, item.variant.id));
    const text = embodied(context, result);
    const name = esc(result.family.family.name);
    for (const [kind, label, found, lent, borrows] of [
      ['parties', 'đảng', result.parties, kin.flatMap((k) => k.parties), result.borrowedParties],
      ['states', 'nhà nước', result.states, kin.flatMap((k) => k.states), result.borrowedStates],
    ]) {
      if (own[kind].length) {
        assert.equal(borrows, false, `${lead.id} ${kind}`);
        assert.deepEqual(found, own[kind]);
      } else if (lent.length) {
        assert.equal(borrows, true, `${lead.id} ${kind}`);
        assert.ok(found.length > 0 && found.every((entry) => lent.includes(entry)));
        assert.ok(found.every((entry) => !entry.variants.includes(lead.id)));
        assert.ok(text.includes(`Chưa ${label} nào theo trọn ${esc(lead.name)}`), lead.id);
        assert.ok(text.includes(name));
        if (kind === 'parties') borrowed++;
        else borrowedStates++;
      } else {
        assert.equal(borrows, false, `${lead.id} ${kind}`);
        assert.equal(found.length, 0);
      }
      if (!borrows) assert.ok(!text.includes(`Chưa ${label} nào theo trọn`), `${lead.id} ${kind}`);
    }
  }
  assert.ok(borrowed > 0, 'no variant borrows a party: the check proved nothing');
  assert.ok(borrowedStates > 0, 'no variant borrows a state: the check proved nothing');
});

test('a shared link rebuilds the whole result exactly, skips and scatter included', () => {
  const next = random(5);
  for (let player = 0; player < 12; player++) {
    // Uneven answers: some skipped, some from the long and adaptive parts, some in no sense.
    const answers = new Map();
    for (const question of model.questions) {
      const roll = next();
      if (question.tier === 'pool' && roll < 0.8) continue;
      answers.set(question.id, roll < 0.1 ? null : Math.floor(next() * 7) - 3);
    }
    const est = estimate(model, answers);
    const mine = buildResult(model, est, catalogue);
    const shared = decodeResult(shareCode(model, answers));
    assert.equal(shared.version, 3);
    assert.equal(shared.profiles, model.version);
    // A skipped question is left out of the link, not carried as a blank.
    assert.equal(shared.answers.length, [...answers.values()].filter((a) => a !== null).length);
    const back = answersFromShared(model, shared);
    assert.equal(back.recomputed, false);
    const rebuilt = estimateFromShared(model, shared);
    assert.deepEqual(rebuilt.facets, est.facets);
    assert.deepEqual(rebuilt.axes, est.axes);
    assert.equal(rebuilt.answered, est.answered);
    assert.ok(Math.abs(rebuilt.scatter - est.scatter) < 1e-9);
    const theirs = buildResult(model, rebuilt, catalogue);
    assert.deepEqual(
      theirs.matches.map((item) => item.variant.id),
      mine.matches.map((item) => item.variant.id),
    );
    theirs.matches.forEach((item, i) => {
      assert.ok(Math.abs(item.evidence - mine.matches[i].evidence) < 1e-6);
    });
    assert.deepEqual(theirs.scores, mine.scores);
    assert.deepEqual(theirs.verdict.insufficient, mine.verdict.insufficient);
    for (const flag of ['close', 'centre', 'loose', 'scattered'])
      assert.equal(theirs.verdict[flag], mine.verdict[flag], flag);
    assert.deepEqual(
      theirs.figures.map((person) => person.figure.id),
      mine.figures.map((person) => person.figure.id),
    );
    assert.deepEqual(
      theirs.reasons.support.map((quote) => quote.question),
      mine.reasons.support.map((quote) => quote.question),
    );
    assert.deepEqual(theirs.standouts, mine.standouts);
    // The same page, down to the character.
    assert.equal(allTiles(context, theirs, rebuilt), allTiles(context, mine, est));
  }
  // A link made against other expected answers is recomputed, and says so.
  const shared = decodeResult(encodeResult(model.version + 1, new Map([[1, 2]])));
  assert.equal(answersFromShared(model, shared).recomputed, true);
});

test('a link from before 1/10/2026 is recognised as old and never rebuilt into a result', () => {
  assert.deepEqual(decodeResult(`1.${'A'.repeat(14)}`), { version: 1, legacy: true });
  assert.deepEqual(decodeResult(`1.${'A'.repeat(14)}.nordic-model`), { version: 1, legacy: true });
  assert.deepEqual(decodeResult(`2.${'Az09-_'.repeat(10)}AB`), { version: 2, legacy: true });
  for (const code of ['1.short', `2.${'A'.repeat(61)}`, 'hello', '4.A', '']) {
    assert.equal(decodeResult(code), null, code);
  }
  // Nothing in an old link is read as answers.
  for (const code of [`1.${'B'.repeat(14)}`, `2.${'C'.repeat(62)}`])
    assert.equal('answers' in decodeResult(code), false);
});

test('the results are written with every name escaped and every share rounded', () => {
  assert.equal(
    esc('<b>"Đảng" & \'phe\'</b>'),
    '&lt;b&gt;&quot;Đảng&quot; &amp; &#39;phe&#39;&lt;/b&gt;',
  );
  assert.equal(percent(0.004), '<1%');
  assert.equal(percent(0), '0%');
  assert.equal(percent(0.346), '35%');
  assert.equal(percent(1), '100%');
  assert.equal(fitted({ fit: 63.49 }), '63%');
  // Every name the page prints is replaced by a hostile one.
  const H = '<script>alert("a") & \'b\'</script>';
  const hostile = {
    ...model,
    families: model.families.map((family) => ({ ...family, name: `${H}${family.name}` })),
    variants: model.variants.map((variant) => ({
      ...variant,
      name: `${H}${variant.name}`,
      en: H,
      period: H,
      summary: H,
      exemplars: [H],
    })),
    questions: model.questions.map((question) => ({ ...question, text: `${H}${question.text}` })),
    axes: model.axes.map((axis) => ({
      ...axis,
      name: H,
      poles: [H, H],
      anchors: axis.anchors.map(() => H),
      facets: axis.facets.map((facet) => ({ ...facet, name: H, poles: [H, H] })),
    })),
  };
  const spoiled = {
    ...catalogue,
    parties: catalogue.parties.map((party) => ({
      ...party,
      name: H,
      abbr: H,
      country: H,
      period: H,
    })),
    states: catalogue.states.map((state) => ({ ...state, name: H, period: H, note: H })),
    figures: catalogue.figures.map((figure) => ({ ...figure, name: H, life: H, role: H })),
  };
  const ctx = {
    ...context,
    model: hostile,
    themes: new Map(themes.map((theme) => [theme.id, { ...theme, name: H }])),
    axes: hostile.axes,
    families: new Map(hostile.families.map((family) => [family.id, family])),
    variants: new Map(hostile.variants.map((variant) => [variant.id, variant])),
    catalogue: spoiled,
  };
  for (const { name, answers } of players()) {
    const est = estimate(model, answers);
    const result = buildResult(hostile, est, spoiled);
    const html = [
      allTiles(ctx, result, est),
      ...result.top.map((item) => profile(ctx, item, est, '')),
      holders(ctx, result.parties, result.states),
    ].join('\n');
    const around = (re) => {
      const at = html.search(re);
      return at < 0 ? null : html.slice(Math.max(0, at - 60), at + 60);
    };
    assert.equal(around(/<script/), null, name);
    assert.equal(around(/alert\("a"\)| & 'b'/), null, name);
    assert.match(html, /&lt;script&gt;/, name);
    // Every share is a whole percent.
    const text = html.replace(/<\/?[a-z][^>]*>/g, ' ');
    assert.doesNotMatch(text, /\d[.,]\d+ ?%/, name);
    assert.equal(around(/undefined|NaN/), null, name);
  }
  const est = estimate(model, answersLike(SAMPLE[2].id));
  const result = buildResult(model, est, catalogue);
  const html = hero(context, result) + topList(context, result);
  assert.match(html, /id="quiz-verdict"/);
  assert.equal((html.match(/data-profile=/g) ?? []).length >= TOP, true);
  // The fit fills a ring, its number in the middle; how sure the quiz is, in words.
  const rest = (RING * (1 - Math.min(100, result.lead.fit) / 100)).toFixed(2);
  assert.match(html, new RegExp(`class="ring" style="--rest:${rest}"`));
  assert.match(
    html,
    new RegExp(
      `class="ring__number">${fitted(result.lead).replace('%', '<span class="ring__unit">%</span>')}</span>`,
    ),
  );
  // The ranking prints no second percent: each variant stands behind the lead in words.
  const list = topList(context, result);
  assert.doesNotMatch(list.replace(/<[^>]+>/g, ' '), /%/);
  assert.match(list, /class="top__value caps"[^>]*>Kết luận</);
  assert.match(
    html,
    new RegExp(
      `Mức tin cậy <span class="figures__level">${confidence(result.lead)}</span>.*?${sureness(result.lead)}</p>`,
    ),
  );
  assert.doesNotMatch(html, /Độ chắc/);
});

test('how sure the quiz is reads as a word, "cao" where the questions stop, never for a poor fit', () => {
  const fits = (weight) => ({ weight, misfit: 0.5 });
  assert.equal(confidence(fits(ADAPTIVE.confident)), 'cao');
  assert.equal(confidence(fits(1)), 'cao');
  assert.equal(confidence(fits(0.89)), 'khá cao');
  assert.equal(confidence(fits(0.7)), 'khá cao');
  assert.equal(confidence(fits(0.59)), 'vừa');
  assert.equal(confidence(fits(0.4)), 'vừa');
  assert.equal(confidence(fits(0.39)), 'thấp');
  assert.equal(confidence(fits(0)), 'thấp');
  assert.equal(sureness(fits(0.93)), '93%');
  // Nearly all the weight, but fitting worse than a follower's own variant: no higher than "vừa".
  assert.equal(confidence({ weight: 0.99, misfit: FITS + 0.01 }), 'vừa');
  assert.equal(confidence({ weight: 0.3, misfit: FITS + 0.01 }), 'thấp');
  assert.equal(sureness({ weight: 0.99, misfit: FITS + 0.01 }), '99%');
  // Explaining the answers poorly: only the least bad of the library.
  const poor = { weight: 0.99, misfit: LOOSE + 0.01 };
  assert.equal(confidence(poor), 'thấp');
  assert.equal(sureness(poor), 'khớp kém');
});

test('every tile of the results reads cleanly, for clear, mild and scattered players', () => {
  for (const { name, answers } of players()) {
    const est = estimate(model, answers);
    const result = buildResult(model, est, catalogue);
    const html = allTiles(context, result, est);
    assert.doesNotMatch(html, /undefined|NaN|null|\[object/, name);
    assert.equal((html.match(/id="quiz-verdict"/g) ?? []).length, 1, name);
    assert.equal((html.match(/class="lean"/g) ?? []).length, model.axes.length, name);
    assert.notEqual(result.farthest, result.lead, name);
    assert.equal((html.match(/<li class="top__row/g) ?? []).length, TOP, name);
    assert.equal((html.match(/class="why__item"/g) ?? []).length >= 3, true, name);
    for (const item of result.top.slice(0, 3))
      assert.doesNotMatch(profile(context, item, est, ''), /undefined|NaN|null/, name);
  }
  // Too few answers to name a result: the page says so, and everything still draws.
  const few = new Map(answersLike(SAMPLE[0].id));
  for (const id of [...few.keys()].slice(10)) few.delete(id);
  const est = estimate(model, few);
  const result = buildResult(model, est, catalogue);
  assert.equal(result.verdict.insufficient, true);
  const html = allTiles(context, result, est);
  assert.match(html, /Chưa đủ câu trả lời/);
  assert.doesNotMatch(html, /undefined|NaN|null|\[object/);
});

test('the axes can be set against the lead or the next three, and the key says whose mark is whose', () => {
  const est = estimate(model, answersLike(SAMPLE[4].id));
  const result = buildResult(model, est, catalogue);
  const html = axisReference(context, result);
  const options = [...html.matchAll(/name="quiz-ref" value="([^"]+)" data-positions="([^"]+)"/g)];
  assert.deepEqual(
    options.map((m) => m[1]),
    result.top.slice(0, REFERENCES).map((item) => item.variant.id),
  );
  // Each choice carries its own twelve places, the same the axes are drawn from.
  result.top.slice(0, REFERENCES).forEach((item, i) => {
    assert.equal(options[i][2], positionList(context, item.variant));
    assert.equal(options[i][2].split(',').length, model.axes.length);
  });
  assert.equal((html.match(/ checked/g) ?? []).length, 1);
  assert.match(
    html,
    new RegExp(`value="${result.lead.variant.id}" data-positions="[^"]*" checked`),
  );
  assert.match(html, /key--you/);
  assert.match(html, /data-ref-name>/);
  // Every answered axis draws the lead's mark where the lead stands.
  const rows = axisRows(context, result, est);
  assert.equal((rows.match(/class="lean" data-axis=/g) ?? []).length, model.axes.length);
  assert.doesNotMatch(rows, /Ba khía cạnh|<details/);
  const marks = [...rows.matchAll(/--you:([\d.]+);--them:(\d+)/g)];
  assert.equal(marks.length, model.axes.length);
  marks.forEach((m, a) => {
    assert.equal(Number(m[2]), Math.round(axisPosition(context, result.lead.variant, a)));
    assert.ok(Math.abs(Number(m[1]) - est.axes[a].mean) < 0.05);
  });
  // The cube numbers the seven nearest as the ranking does, and carries every other variant.
  const cube = compassCube(context, result);
  for (let rank = 1; rank <= TOP; rank++) assert.match(cube, new RegExp(`>${rank}</text>`));
  assert.equal((cube.match(/class="cube__dot"/g) ?? []).length, model.variants.length - TOP);
  assert.equal((cube.match(/class="cube__you"/g) ?? []).length, 1);
  assert.equal((cube.match(/data-view=/g) ?? []).length, 4);
});

test('each facet is one sentence: what the nearest person and the player hold together, and how firmly', () => {
  const axis = model.axes[0];
  const first = 0;
  const count = axis.facets.length;
  assert.ok(count >= 3);
  const facets = (means) => ({
    facets: Array.from({ length: model.facets.length }, (_, f) => {
      const mean = means[f - first] ?? null;
      return { mean: mean ?? 50, n: mean === null || mean === undefined ? 0 : 2 };
    }),
  });
  // Both strongly toward the second pole on the first facet, apart on the second, unanswered the rest.
  const est = facets([90, 20]);
  const place = (f) => [85, 95][f - first] ?? 50;
  const html = facetNotes(axis, est, first, 'Friedrich List', place);
  const notes = [...html.matchAll(/<li class="lean__note" data-stance="(\w+)">(.*?)<\/li>/g)];
  assert.equal(notes.length, count);
  assert.equal(notes[0][1], 'with');
  assert.match(notes[0][2], /Friedrich List và bạn cùng tin chắc vào “/);
  assert.equal(notes[1][1], 'apart');
  assert.match(notes[1][2], /Bạn đồng tình với “.*”, còn Friedrich List lại tin chắc vào “/);
  for (let i = 2; i < count; i++) assert.equal(notes[i][1], 'none');
  assert.match(notes[2][2], /Bạn chưa trả lời câu nào về/);
  // A facet whose fixed question was skipped, though a chosen one was answered, has no place on the bars.
  const chosen = { ...est, every: { facets: est.facets.map((facet) => ({ ...facet, n: 1 })) } };
  assert.match(facetNotes(axis, chosen, first, 'A', place), /Bạn đã bỏ qua câu cố định về/);
  // One sentence each: the topic, then text that ends at its first full stop.
  for (const [, , text] of notes) {
    const sentence = text.replace(/^<span class="lean__note-topic">.*?<\/span>/, '');
    assert.equal(sentence.indexOf('.'), sentence.length - 1, sentence);
  }
  // Where both stand in the middle, one sentence covers every such facet.
  const middle = facetNotes(axis, facets([50, 52, 48].slice(0, count)), first, 'A', () => 50);
  assert.equal((middle.match(/<li /g) ?? []).length, 1);
  assert.match(middle, /cùng đứng giữa ở cả ba khía cạnh/);
  // The name is escaped.
  assert.doesNotMatch(facetNotes(axis, est, first, '<i>X</i>', place), /<i>/);
});

test('a profile compares the variant with the player axis by axis, with a key for both marks', () => {
  const est = estimate(model, answersLike(SAMPLE[5].id));
  const result = buildResult(model, est, catalogue);
  const item = result.matches[3];
  const html = profile(context, item, est, '');
  const rows = [...html.matchAll(/<li class="compare__row">.*?<\/li>/g)].map((m) => m[0]);
  assert.equal((html.match(/class="compare__row[ "]/g) ?? []).length, model.axes.length);
  assert.equal(rows.length, model.axes.length);
  assert.match(html, /key--you/);
  assert.match(html, new RegExp(`<span>${esc(item.variant.name).replace(/[()]/g, '\\$&')}</span>`));
  assert.match(html, /đứng gần bạn nhất ở trục/);
  assert.doesNotMatch(html, /undefined|NaN/);
  // Each row says how far apart the two stand, as the numbers put them.
  rows.forEach((row, a) => {
    const you = est.axes[a].mean;
    const them = Math.round(axisPosition(context, item.variant, a));
    const gap = Math.round(Math.abs(you - them));
    const words = />([^<>]*)<\/span><\/div><div class="lean__poles"/.exec(row)[1];
    // Where the player's own facets point opposite ways, there is no one place to measure from.
    if (est.axes[a].divided) assert.equal(words, 'Bạn phân hoá', `axis ${a}`);
    else if (gap < 8) assert.equal(words, 'Gần như trùng', `axis ${a}`);
    else assert.match(words, new RegExp(`lệch ${gap}$`), `axis ${a}`);
    assert.match(row, new RegExp(`--them:${them}[;"]`));
  });
  // The summary names the nearest and the furthest axes by their gaps, divided axes aside.
  const gaps = model.axes
    .filter((_, a) => !est.axes[a].divided)
    .map((axis) => ({ axis, a: model.axes.indexOf(axis) }))
    .map(({ axis, a }) => ({
      axis,
      gap: Math.abs(est.axes[a].mean - axisPosition(context, item.variant, a)),
    }))
    .sort((x, y) => x.gap - y.gap);
  const low = (text) => text.charAt(0).toLocaleLowerCase('vi') + text.slice(1);
  assert.match(
    html,
    new RegExp(`xa bạn nhất ở trục ${esc(low(gaps[gaps.length - 1].axis.name))}\\.`),
  );
});

test('the reasons agree with the numbers they explain', () => {
  const sheets = [
    ...SAMPLE.map((variant) => ({ name: variant.id, answers: answersLike(variant.id) })),
    ...players(),
  ];
  let withEdge = 0;
  for (const { name, answers } of sheets) {
    const est = estimate(model, answers);
    const result = buildResult(model, est, catalogue);
    const { lead } = result;
    const { support, partings, edge } = result.reasons;
    const given = new Map(est.asked.map((q, i) => [q, est.values[i]]));
    const groups = (quotes) =>
      quotes.map((quote) => JSON.stringify(groupOf(model, quote.question)));
    // Each answer quoted is the player's own, beside what the lead's followers answer.
    for (const quote of [...support, ...partings]) {
      assert.equal(quote.answer, given.get(quote.question), name);
      assert.equal(quote.expected, model.expected[lead.index * Q + quote.question], name);
      assert.ok(quote.value > 0, name);
    }
    assert.ok(support.length <= 3 && partings.length <= 2, name);
    for (const quote of support) {
      assert.ok(Math.abs(quote.expected) >= 1 && Math.abs(quote.answer) >= 1, name);
      assert.equal(Math.sign(quote.answer - lead.alpha), Math.sign(quote.expected), name);
    }
    for (const quote of partings) assert.ok(Math.abs(quote.answer - quote.expected) >= PART, name);
    for (const list of [support, partings]) {
      assert.equal(new Set(groups(list)).size, list.length, `${name}: one quote per group`);
      assert.ok(
        list.every((quote, i) => i === 0 || list[i - 1].value >= quote.value),
        name,
      );
    }
    // Its parts add up to the difference in evidence that put the lead first.
    const runner = result.verdict.runnerUp;
    const parts = contrast(model, est, lead, runner);
    const sum = parts.answers.reduce((total, part) => total + part.value, parts.remainder);
    assert.ok(Math.abs(sum - parts.total) < 1e-6, name);
    assert.ok(Math.abs(parts.total - (lead.evidence - runner.evidence)) < 1e-9, name);
    assert.ok(parts.total >= 0, name);
    if (edge) {
      withEdge++;
      assert.ok(Math.abs(edge.margin - parts.total) < 1e-9, name);
      assert.ok(edge.share > 0 && edge.share <= 1 && edge.style >= 0 && edge.style <= 1, name);
    }
    // The page prints the same numbers and the same answers.
    const html = why(context, result);
    const shown = edge && edge.margin >= 0.5 ? edge.quotes : [];
    for (const quote of [...support, ...partings, ...shown]) {
      assert.ok(html.includes(esc(model.questions[quote.question].text)), name);
    }
    for (const quote of support) {
      assert.ok(html.includes(`Bạn: ${answerWords(quote.answer)}`), name);
      assert.ok(html.includes(`: ${answerWords(quote.expected)}</span>`), name);
    }
    if (edge && edge.margin >= 0.5)
      assert.ok(html.includes(`chiếm ${percent(edge.share)} phần chênh`), name);
    // A pairing the player holds against the grain of the library, and few variants hold.
    const pair = result.tension;
    if (pair) {
      const { first, second, you, r, holders: held } = pair;
      assert.notEqual(first, second);
      assert.ok(Math.sign(r) !== Math.sign((you[0] - 50) * (you[1] - 50)), name);
      assert.ok(held.length <= 0.12 * model.variants.length, name);
      for (const item of held) {
        const at = (a) => model.positions[item.index * model.axes.length + a] - 50;
        assert.ok(at(first) * (you[0] - 50) > 0 && at(second) * (you[1] - 50) > 0, name);
      }
    }
  }
  assert.ok(withEdge > 0, 'no player had an edge over the runner-up: the check proved nothing');
});

test('the "khác biệt" tile never claims the player is unusual on an axis where they sit near the library median', () => {
  const A = model.axes.length;
  const V = model.variants.length;
  const column = (a) =>
    model.variants.map((_, v) => model.positions[v * A + a]).sort((x, y) => x - y);
  const columns = model.axes.map((_, a) => column(a));
  const quantile = (a, p) => {
    const at = p * (V - 1);
    const lo = Math.floor(at);
    return columns[a][lo] + (columns[a][Math.min(V - 1, lo + 1)] - columns[a][lo]) * (at - lo);
  };
  const median = (a) => quantile(a, 0.5);
  const placed = (means) => ({ axes: means.map((mean) => ({ mean, n: 3, facets: 3 })) });
  const result = buildResult(model, estimate(model, answersLike(SAMPLE[0].id)), catalogue);
  const tile = (est) => apart(context, { ...result, standouts: standouts(model, est) });
  // Standing at the median, or anywhere between the 40th and 60th percentile, on every axis.
  for (const p of [0.4, 0.45, 0.5, 0.55, 0.6]) {
    const est = placed(model.axes.map((_, a) => quantile(a, p)));
    assert.equal(standouts(model, est).apart, null, `percentile ${p}`);
    const html = tile(est);
    assert.match(html, /không đứng ở rìa trục nào/);
    assert.doesNotMatch(html, /Bạn nghiêng về/);
  }
  // One axis at a time sweeps the whole scale: any claim is made only well away from the median.
  let claims = 0;
  for (let a = 0; a < A; a++) {
    for (let you = 0; you <= 100; you += 0.5) {
      const est = placed(model.axes.map((_, i) => (i === a ? you : median(i))));
      const found = standouts(model, est).apart;
      if (!found) continue;
      claims++;
      assert.equal(found.axis, a);
      assert.equal(found.you, you);
      assert.ok(Math.abs(found.median - median(a)) < 1e-9);
      // It leans to its own side of the centre, and the median lies on the near side of it.
      assert.equal(found.side, you > 50 ? 1 : 0);
      assert.ok(found.side ? you > found.median : you < found.median, `axis ${a} at ${you}`);
      // The share it quotes is the share of variants that lean less far, and is a clear majority.
      const less =
        columns[a].filter((value) => (found.side ? value < you : value > you)).length / V;
      assert.ok(Math.abs(found.beyond - less) < 1e-9);
      assert.ok(found.beyond >= 0.75);
      // So the player is beyond the 75th percentile of the library on that side, not near the median.
      assert.ok(
        found.side ? you > quantile(a, 0.7) : you < quantile(a, 0.3),
        `axis ${a} at ${you}`,
      );
      const html = tile(est);
      assert.ok(html.includes(`Trung vị các hướng ${Math.round(found.median)}`));
      assert.ok(html.includes(`xa hơn ${percent(found.beyond)} trong ${V} hướng`));
      assert.ok(html.includes(esc(model.axes[a].name)));
    }
    // Within a few points of the median there is never a claim.
    for (const gap of [-3, -1.5, 0, 1.5, 3]) {
      const est = placed(model.axes.map((_, i) => (i === a ? median(a) + gap : median(i))));
      assert.equal(standouts(model, est).apart, null, `axis ${a}, ${gap} from the median`);
    }
  }
  assert.ok(claims > 0, 'no claim anywhere on the scale: the check proved nothing');
  // Real players: whatever the tile says, it says on an axis where they are far from the median.
  for (const { name, answers } of players()) {
    const est = estimate(model, answers);
    const found = standouts(model, est).apart;
    if (!found) continue;
    assert.ok(Math.abs(est.axes[found.axis].mean - median(found.axis)) > 0, name);
    assert.ok(found.beyond >= 0.75, name);
  }
});

test('under the centre flag no wording states how firmly the player holds a view', () => {
  const INTENSITY =
    /bạn giữ|giữ \d+ ?%|Nghiêng mạnh|Hơi nghiêng|tin chắc|đồng tình với|vừa phải|hai đầu thang|dùng thang|cường độ|độ gắt|Cách dùng thang/i;
  // Players with an opinion on a share of the questions, mild or sometimes firm, and none on the rest.
  const sparse = (seed) => {
    const next = random(seed);
    const share = 0.05 + (seed % 10) * 0.05;
    return new Map(
      model.questions
        .filter((q) => q.tier !== 'pool')
        .map((q) => [q.id, next() < share ? (next() < 0.5 ? -1 : 1) * (next() < 0.2 ? 2 : 1) : 0]),
    );
  };
  const middle = [
    { name: 'blank', answers: new Map(model.questions.map((q) => [q.id, 0])) },
    ...Array.from({ length: 300 }, (_, i) => ({ name: `sparse ${i + 1}`, answers: sparse(i + 1) })),
  ];
  let checked = 0;
  for (const { name, answers } of middle) {
    const est = estimate(model, answers);
    const result = buildResult(model, est, catalogue);
    if (!result.verdict.centre) continue;
    checked++;
    assert.equal(result.verdict.insufficient, false, name);
    assert.match(hero(context, result), /Bạn đứng gần giữa/, name);
    const html = [
      hero(context, result),
      topList(context, result),
      why(context, result),
      apart(context, result),
      farthest(context, result, est),
    ]
      .join('\n')
      .replace(/<\/?[a-z][^>]*>/g, ' ');
    const found = INTENSITY.exec(html);
    assert.equal(
      found && html.slice(Math.max(0, found.index - 100), found.index + 100).replace(/\s+/g, ' '),
      null,
      name,
    );
    // Each of the player's axes reads as balanced, never as a lean of some strength.
    if (name === 'blank') {
      const rows = axisRows(context, result, est);
      assert.doesNotMatch(rows, /Bạn (hơi nghiêng|đồng tình|tin chắc)|lean__share">(?!50)/, name);
      assert.equal((rows.match(/data-level="balanced"/g) ?? []).length, model.axes.length);
    }
  }
  assert.ok(checked >= 50, 'too few players in the middle to check anything');
  // Without the flag, the same tile does speak of how the player uses the scale.
  const est = estimate(model, answersLike(SAMPLE[0].id));
  const result = buildResult(model, est, catalogue);
  assert.equal(result.verdict.centre, false);
  assert.match(why(context, result), /Cách dùng thang/);
});

test('what puts the leader above the runner-up is read off the per-answer contributions', () => {
  const lower = (text) => text.charAt(0).toLocaleLowerCase('vi') + text.slice(1);
  const sheets = [
    ...SAMPLE.map((variant) => ({ name: variant.id, answers: answersLike(variant.id) })),
    ...SAMPLE.map((variant) => ({
      name: `${variant.id}, mild`,
      answers: answersLike(variant.id, 0.4),
    })),
    ...players(),
  ];
  let quoted = 0;
  let tied = 0;
  for (const { name, answers } of sheets) {
    const est = estimate(model, answers);
    const result = buildResult(model, est, catalogue);
    const { lead, runnerUp } = result.verdict;
    const parts = contrast(model, est, lead, runnerUp);
    const html = why(context, result);
    const block = /Hơn hướng nhì<\/dt><dd>(.*?)<\/dd><\/div>/s.exec(html)[1];
    // Independently: every answer's part, summed within its axis or theme.
    const sums = new Map();
    for (const part of parts.answers) {
      const group = groupOf(model, part.question);
      const key = JSON.stringify(group);
      sums.set(key, { group, sum: (sums.get(key)?.sum ?? 0) + part.value });
    }
    const best = [...sums.values()].sort((x, y) => y.sum - x.sum)[0];
    const positive = [...sums.values()].reduce((total, { sum }) => total + Math.max(0, sum), 0);
    const { edge } = result.reasons;
    if (!best || best.sum <= 0) {
      assert.equal(edge, null, name);
    } else {
      assert.deepEqual(edge.group, best.group, name);
      assert.ok(Math.abs(edge.share - best.sum / positive) < 1e-9, name);
      assert.ok(Math.abs(edge.margin - parts.total) < 1e-9, name);
    }
    if (!edge || edge.margin < 0.5) {
      tied++;
      assert.match(block, /gần như ngang nhau/, name);
      assert.doesNotMatch(block, /<figure/, name);
      continue;
    }
    // The items quoted are those whose own contribution favours the leader, within that group,
    // where the two expect different answers, the two that favour it most.
    const eligible = parts.answers
      .filter(
        (part) =>
          part.value > 0 &&
          JSON.stringify(groupOf(model, part.question)) === JSON.stringify(best.group) &&
          Math.abs(
            model.expected[lead.index * Q + part.question] -
              model.expected[runnerUp.index * Q + part.question],
          ) >= 1,
      )
      .sort((x, y) => y.value - x.value)
      .slice(0, 2);
    assert.deepEqual(
      edge.quotes.map((quote) => quote.question),
      eligible.map((part) => part.question),
      name,
    );
    edge.quotes.forEach((quote, i) => {
      assert.ok(Math.abs(quote.value - eligible[i].value) < 1e-12, name);
      assert.equal(quote.answer, est.values[eligible[i].at], name);
      assert.equal(quote.expected, model.expected[lead.index * Q + quote.question], name);
      assert.equal(quote.other, model.expected[runnerUp.index * Q + quote.question], name);
    });
    // And the sentence on the page says exactly that: this group, this share, these answers.
    const label =
      best.group.kind === 'axis'
        ? `trục ${esc(lower(model.axes[best.group.index].name))}`
        : `chủ đề ${esc(lower(themeMap.get(best.group.id).name))}`;
    assert.ok(block.includes(`${esc(lead.variant.name)} vượt ${esc(runnerUp.variant.name)}`), name);
    assert.ok(
      block.includes(`các câu thuộc ${label}, chiếm ${percent(best.sum / positive)}`),
      name,
    );
    const shown = [...block.matchAll(/<blockquote class="quote__text"><p>(.*?)<\/p>/gs)].map(
      (m) => m[1],
    );
    assert.deepEqual(
      shown,
      eligible.map((part) => esc(model.questions[part.question].text)),
      name,
    );
    // No answer that favours the runner-up is offered as a reason for the leader.
    for (const part of parts.answers.filter((item) => item.value < 0))
      assert.ok(!block.includes(esc(model.questions[part.question].text)), name);
    // Each quoted answer is set beside what each side's followers answer.
    for (const quote of edge.quotes) {
      assert.ok(
        block.includes(`Người theo ${esc(lead.variant.name)}: ${answerWords(quote.expected)}`),
        name,
      );
      assert.ok(
        block.includes(`Người theo ${esc(runnerUp.variant.name)}: ${answerWords(quote.other)}`),
        name,
      );
      quoted++;
    }
  }
  assert.ok(quoted > 0, 'no edge quoted any answer: the check proved nothing');
  assert.ok(tied + quoted > 0);
});

test('an axis reads as balanced, slight, clear or strong toward the pole it leans to', () => {
  const [economy] = model.axes;
  assert.deepEqual(leanOf(50), { level: 'balanced', side: null, share: [50, 50] });
  assert.equal(leanOf(45).level, 'balanced');
  assert.deepEqual(leanOf(66), { level: 'slight', side: 1, share: [34, 66] });
  assert.equal(leanOf(25).level, 'clear');
  assert.equal(leanOf(10).level, 'strong');
  assert.equal(leanTag(economy, 50), 'Cân bằng');
  assert.equal(leanTag(economy, 10), `Nghiêng mạnh · ${economy.poles[0]}`);
  assert.equal(leanTag(economy, 50, true), 'Phân hoá');
});

test('an axis whose facets cancel reads as divided, never as moderate, and claims nothing about it', () => {
  const foreign = model.axes.findIndex((axis) => axis.id === 'foreign');
  const facets = model.facets.flatMap((_, f) => (model.facetAxis[f] === foreign ? [f] : []));
  // Law and intervention both: a liberal internationalist, at the middle of the axis.
  const toward = { 'foreign.force': 0, 'foreign.rules': 3, 'foreign.intervention': -3 };
  const answers = answersLike(SAMPLE[0].id);
  for (const q of model.questions)
    if (q.facet in toward && q.tier !== 'pool') answers.set(q.id, q.key * toward[q.facet]);
  const est = estimate(model, answers);
  assert.ok(Math.abs(est.axes[foreign].mean - 50) < 1e-9);
  assert.equal(est.axes[foreign].divided, true);
  const result = buildResult(model, est, catalogue);
  assert.equal(result.divided[foreign], true);
  const rows = axisRows(context, result, est);
  const cell = rows.match(/<li class="lean" data-axis="foreign".*?<\/ul>\s*<\/li>/s)[0];
  assert.match(cell, /data-level="divided">Phân hoá</);
  assert.match(cell, /đi ngược chiều nhau/);
  assert.doesNotMatch(cell, new RegExp(esc(model.axes[foreign].anchors[2])));
  assert.notEqual(result.standouts.apart?.axis, foreign);
  assert.notEqual(result.standouts.common?.axis, foreign);
  assert.ok(!result.tension || ![result.tension.first, result.tension.second].includes(foreign));
  assert.equal(facets.length, 3);
});

test('an axis whose facets do not move together in the library says so, and a person never asked says nothing', () => {
  const coherent = coherence(model);
  const est = estimate(model, answersLike(SAMPLE[1].id));
  const result = buildResult(model, est, catalogue);
  const rows = axisRows(context, result, est);
  for (const [a, axis] of model.axes.entries()) {
    const cell = rows.match(
      new RegExp(`<li class="lean" data-axis="${axis.id}".*?</ul>\\s*</li>`, 's'),
    )[0];
    assert.equal(/lean__composite/.test(cell), coherent[a].composite, axis.id);
  }
  // A person with no answer on a facet: the note says nothing is known, and guesses no stance.
  const axis = model.axes[0];
  const facetsOf = (means) => ({
    facets: Array.from({ length: model.facets.length }, (_, f) => ({ mean: means[f] ?? 50, n: 2 })),
  });
  const html = facetNotes(axis, facetsOf([80, 20, 50]), 0, 'Khổng Tử', (f) =>
    f === 1 ? Number.NaN : 80,
  );
  const notes = [...html.matchAll(/data-stance="(\w+)">(.*?)<\/li>/g)];
  assert.equal(notes[1][1], 'none');
  assert.match(notes[1][2], /Không câu nào cho biết Khổng Tử nghĩ gì/);
  assert.doesNotMatch(html, /NaN/);
});

test('every idea, party and state has a picture drawn from known motifs', () => {
  for (const variant of library.variants) {
    const motif = glyphs.variants[variant.id];
    assert.ok(MARKS[motif], `${variant.id}: ${motif}`);
    assert.match(ideaMark(motif), /<path class="mark__(?:ink|line)"/);
  }
  for (const family of library.families)
    assert.ok(MARKS[glyphs.families[family.id]?.motif], family.id);
  for (const party of catalogue.parties) {
    assert.ok(MARKS[party.emblem.motif], `${party.id}: ${party.emblem.motif}`);
    assert.doesNotMatch(emblemGlyph(party.emblem), /undefined|NaN/);
  }
  for (const [id, spec] of Object.entries(catalogue.flags))
    assert.doesNotMatch(flagGlyph(spec), /undefined|NaN/, id);
  assert.match(sealGlyph(), /flag--seal/);
});

test('sensitive regimes: every one draws its historical flag, only Nazi Germany a seal', () => {
  const nazi = catalogue.states.filter((state) => state.variants.includes('nazism'));
  assert.ok(nazi.length && nazi.every((state) => state.seal && !state.flag));
  const rvn = catalogue.states.filter((state) => state.flag === 'rvn');
  assert.ok(rvn.length >= 1 && rvn.every((state) => !state.seal));
  const sealed = catalogue.states.filter((state) => state.seal);
  for (const state of sealed)
    assert.ok(state.variants.includes('nazism') || !state.flag, `${state.id} hides a flag`);
  const nsdap = catalogue.parties.find((party) => party.variants[0] === 'nazism');
  assert.equal(nsdap.emblem.motif, 'ring');
});

test('every family colour fits sRGB and its text reads on paper by day and by night', () => {
  for (const [id, ink] of Object.entries(glyphs.families)) {
    for (const theme of ['light', 'dark']) {
      const roles = familyRoles(ink, theme);
      for (const [role, { L, C }] of Object.entries(roles))
        assert.ok(Math.abs(fitChroma(L, C, ink.hue) - C) < 1e-6, `${id} ${theme} ${role}`);
      const text = luminance(roles.text.L, roles.text.C, ink.hue);
      for (const [L, C, H] of SURFACES[theme])
        assert.ok(luminanceContrast(text, luminance(L, C, H)) >= 4.5, `${id} ${theme} text`);
    }
  }
});

test('every variant has people, and a shared result holds no answers', () => {
  for (const variant of library.variants)
    assert.ok(
      catalogue.figures.some((figure) => figure.variant === variant.id),
      `${variant.id} has no figure`,
    );
  const html = holders(context, [], []);
  assert.equal(html, '');
});

test('the ranking says how each variant stands behind the lead, and owns up when they are level', () => {
  const lead = { weight: 0.4 };
  assert.deepEqual(standing(lead, lead), { share: 1, words: 'Kết luận' });
  assert.equal(standing({ weight: 0.2 }, lead).words, 'Sát nút');
  assert.equal(standing({ weight: 0.1 }, lead).words, 'Khá gần');
  assert.equal(standing({ weight: 0.01 }, lead).words, 'Xa hơn');
  const level = {
    lead,
    top: [lead, ...[0.39, 0.38, 0.1, 0.05, 0.01, 0].map((weight) => ({ weight }))],
  };
  assert.equal(topHeading(level).title, 'Những hướng bạn chia sẻ quan điểm');
  assert.match(topHeading(level).note, /^Ba hướng đầu/);
  const clear = { lead, top: [lead, ...[0.1, 0.05, 0.01, 0, 0, 0].map((weight) => ({ weight }))] };
  assert.equal(topHeading(clear).title, 'Bảy hướng gần nhất');
});
