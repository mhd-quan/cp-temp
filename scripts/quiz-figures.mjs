// Compiles the people's own answers, rated person by person outside the repository, into
// src/data/quiz/figure-answers.json, which the results page matches people against
// (docs/quiz/method.md, "Người, đảng và nhà nước"). Run when more people are rated:
//
//   node scripts/quiz-figures.mjs <answers.csv> <progress.json> [--except id,id]
//
// answers.csv has a figure_id column, then one column per question numbered by its `n`
// (−3 … 3, blank where the rater could not place the person). progress.json lists the
// finished people in `completed_ids`; only they are kept, less any named after --except
// (a person still being rated). A file that names an unknown person or question is refused.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { encodeCell } from '../src/lib/quiz/profiles.ts';

const [csvPath, progressPath, ...rest] = process.argv.slice(2);
if (!csvPath || !progressPath) {
  console.error(
    'usage: node scripts/quiz-figures.mjs <answers.csv> <progress.json> [--except id,id]',
  );
  process.exit(2);
}
const flag = rest.indexOf('--except');
const except = new Set(flag >= 0 ? (rest[flag + 1] ?? '').split(',').filter(Boolean) : []);

const data = new URL('../src/data/quiz/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));

/** RFC 4180 rows: quoted fields may hold commas, quotes and line breaks. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((cells) => cells.some((cell) => cell !== ''));
}

const bank = read('questions.json').filter((question) => question.status !== 'dropped');
const byNumber = new Map(bank.map((question) => [String(question.n), question.id]));
const people = new Set(
  readdirSync(new URL('catalogue/', data))
    .filter((file) => file.endsWith('.json'))
    .flatMap((file) => read(`catalogue/${file}`).figures ?? [])
    .map((figure) => figure.id),
);

const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const problems = [];
if (header[0] !== 'figure_id') problems.push('the first column must be figure_id');
const items = header.slice(1).map((n) => {
  const id = byNumber.get(n);
  if (!id) problems.push(`column ${n}: no such question`);
  return id;
});
for (const question of bank)
  if (!items.includes(question.id)) problems.push(`no column for ${question.n} (${question.id})`);

const completed = new Set(JSON.parse(readFileSync(progressPath, 'utf8')).completed_ids ?? []);
const figures = {};
const skipped = [];
for (const [id, ...cells] of rows) {
  if (!people.has(id)) problems.push(`${id}: not in the catalogue`);
  if (!completed.has(id) || except.has(id)) {
    skipped.push(id);
    continue;
  }
  if (cells.length !== items.length)
    problems.push(`${id}: ${cells.length} answers for ${items.length} columns`);
  figures[id] = cells
    .map((cell, c) => {
      if (cell.trim() === '') return '.';
      const value = Number(cell);
      if (!Number.isInteger(value) || value < -3 || value > 3)
        problems.push(`${id} ${items[c]}: ${cell} is not an answer −3 … 3`);
      return encodeCell({ mean: value, split: false });
    })
    .join('');
}
if (problems.length) {
  console.error(problems.slice(0, 30).join('\n'));
  process.exit(1);
}

writeFileSync(
  new URL('figure-answers.json', data),
  `${JSON.stringify({ items, figures }, null, 1)}\n`,
);
const kept = Object.values(figures);
const answered = kept.reduce((sum, row) => sum + row.replaceAll('.', '').length, 0);
console.log(
  `${kept.length} of ${people.size} people with their own answers: ${answered} answers, ${kept.length * items.length - answered} left blank`,
);
if (skipped.length) console.log(`not yet finished: ${skipped.join(', ')}`);
