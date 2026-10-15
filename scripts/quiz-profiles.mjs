// Compiles the raters' work (src/data/quiz/ratings) into the expected answers the quiz
// matches against (src/data/quiz/profiles.json), and reports how closely the raters agree.
// Run after adding or changing ratings, questions or variants:
//
//   node scripts/quiz-profiles.mjs
//
// The version rises whenever any expected answer changes, so shared links can tell.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { agreement, compileProfiles, readRatings } from '../src/lib/quiz/ratings.ts';
import { assembleLibrary } from '../src/lib/quiz/types.ts';

const data = new URL('../src/data/quiz/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));
const folder = (name) =>
  readdirSync(new URL(`${name}/`, data))
    .filter((file) => file.endsWith('.json') && file !== 'codes.json')
    .sort()
    .map((file) => read(`${name}/${file}`));

const codes = read('ratings/codes.json');
const files = folder('ratings');
const questions = read('questions.json')
  .filter((question) => question.status !== 'dropped')
  .map((question) => question.id);
const variants = assembleLibrary(folder('library')).variants.map((variant) => variant.id);

const first = readRatings(files, 'A', codes);
const second = readRatings(files, 'B', codes);

const missing = [];
for (const variant of variants) {
  if (!codes[variant]) missing.push(`${variant}: no code`);
  for (const question of questions)
    for (const [rater, ratings] of [
      ['A', first],
      ['B', second],
    ])
      if (!ratings.get(question)?.has(variant)) missing.push(`${rater} ${question} ${variant}`);
}

const previous = (() => {
  try {
    return read('profiles.json');
  } catch {
    return { version: 0, items: [], variants: {} };
  }
})();
const next = compileProfiles(previous.version, questions, variants, first, second);
const changed =
  JSON.stringify({ ...next, version: 0 }) !== JSON.stringify({ ...previous, version: 0 });
if (changed) next.version = previous.version + 1;

writeFileSync(new URL('profiles.json', data), `${JSON.stringify(next, null, 1)}\n`);

const agree = agreement(first, second);
console.log(
  `profiles v${next.version}${changed ? ' (changed)' : ''}: ${variants.length} variants × ${questions.length} questions`,
);
console.log(
  `raters agree exactly on ${(100 * agree.exact).toFixed(1)}%, within one point on ${(100 * agree.near).toFixed(1)}%, r = ${agree.r.toFixed(3)} (${agree.n} pairs)`,
);
if (missing.length) {
  console.log(`${missing.length} ratings missing, first ones:`);
  console.log(missing.slice(0, 20).join('\n'));
  process.exitCode = 1;
}
