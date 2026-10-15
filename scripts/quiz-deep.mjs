// Chooses the 72 questions the in-depth length (Chuyên sâu) adds to the fixed part of the
// standard one, and marks them `deep` in src/data/quiz/questions.json:
//
//   node scripts/quiz-deep.mjs
//
// One facet question for each of the 36 facets, and 36 theme questions, at least one for
// each of the twenty themes the axes do not draw and at most two. Within each group the
// question chosen is the one that parts the library most: the spread of the variants'
// expected answers over the noise of an answer and of the profile (docs/quiz/method.md,
// "Các tầng"). The facet questions' keys are set so that agreeing with everything moves
// no axis by more than one question, and the whole part not at all. Run again after the
// ratings or the bank change; questions already marked `deep` are chosen afresh.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { compile, NOISE } from '../src/lib/quiz/model.ts';
import { assembleLibrary } from '../src/lib/quiz/types.ts';

const data = new URL('../src/data/quiz/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));
const library = assembleLibrary(
  readdirSync(new URL('library/', data))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => read(`library/${file}`)),
);
const axes = read('axes.json');
const themes = read('themes.json');
const bank = read('questions.json').map((question) =>
  question.tier === 'deep' ? { ...question, tier: 'pool' } : question,
);
const model = compile(axes, library, bank, read('profiles.json'));

const Q = model.questions.length;
const V = model.variants.length;
/** How far a question parts the library: the variants' spread over an answer's noise. */
function parting(id) {
  const q = model.questionIndex.get(id);
  let sum = 0;
  let square = 0;
  let loose = 0;
  for (let v = 0; v < V; v++) {
    const m = model.expected[v * Q + q];
    sum += m;
    square += m * m;
    loose += model.variance[v * Q + q];
  }
  const mean = sum / V;
  return (square / V - mean * mean) / (NOISE * NOISE + loose / V);
}

const open = bank.filter((question) => question.status !== 'dropped' && question.tier === 'pool');
const best = (questions) =>
  questions.reduce((top, question) => (!top || question.score > top.score ? question : top), null);
const scored = open.map((question) => ({ ...question, score: parting(question.id) }));

// Facets: for each axis, the best key pattern summing to +1 or −1; then six axes each way.
const plans = axes.map((axis) => {
  const options = axis.facets.map((facet) => ({
    1: best(scored.filter((q) => q.facet === facet.id && q.key === 1)),
    [-1]: best(scored.filter((q) => q.facet === facet.id && q.key === -1)),
  }));
  const bySign = {};
  for (const keys of [
    [1, 1, -1],
    [1, -1, 1],
    [-1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ]) {
    const picks = keys.map((key, f) => options[f][key]);
    if (picks.some((pick) => !pick)) continue;
    const sign = keys.reduce((a, b) => a + b, 0);
    const score = picks.reduce((total, pick) => total + pick.score, 0);
    if (!bySign[sign] || score > bySign[sign].score) bySign[sign] = { picks, score };
  }
  return { axis: axis.id, bySign };
});
const lean = plans
  .map((plan) => ({
    plan,
    gain: (plan.bySign[1]?.score ?? -Infinity) - (plan.bySign[-1]?.score ?? -Infinity),
  }))
  .sort((a, b) => b.gain - a.gain);
const facetPicks = lean.flatMap(({ plan }, i) => plan.bySign[i < axes.length / 2 ? 1 : -1].picks);

// Themes: the best question of each, then the best of the rest, two at most for a theme.
const themePool = scored.filter((q) => q.theme && !q.facet);
const themePicks = themes.map((theme) => best(themePool.filter((q) => q.theme === theme.id)));
const taken = new Map(themes.map((theme) => [theme.id, 1]));
for (const question of [...themePool].sort((a, b) => b.score - a.score)) {
  if (themePicks.length >= 36) break;
  if (themePicks.some((pick) => pick.id === question.id)) continue;
  if ((taken.get(question.theme) ?? 0) >= 2) continue;
  themePicks.push(question);
  taken.set(question.theme, (taken.get(question.theme) ?? 0) + 1);
}

const deep = new Set([...facetPicks, ...themePicks].map((question) => question.id));
if (deep.size !== 72) throw new Error(`chose ${deep.size} questions, not 72`);
const written = bank.map((question) =>
  deep.has(question.id) ? { ...question, tier: 'deep' } : question,
);
writeFileSync(new URL('questions.json', data), `${JSON.stringify(written, null, 1)}\n`);
console.log(
  `deep: ${facetPicks.length} facet questions (keys ${facetPicks.reduce((s, q) => s + q.key, 0)}), ${themePicks.length} theme questions`,
);
