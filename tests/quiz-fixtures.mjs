import { readdirSync, readFileSync } from 'node:fs';
import { compile } from '../src/lib/quiz/model.ts';
import { withAnswers } from '../src/lib/quiz/people.ts';
import { assembleCatalogue, assembleLibrary } from '../src/lib/quiz/types.ts';

const data = new URL('../src/data/quiz/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));
const folder = (name) =>
  readdirSync(new URL(`${name}/`, data))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => [file, read(`${name}/${file}`)]);

export const axes = read('axes.json');
export const bank = read('questions.json');
export const themes = read('themes.json');
export const profiles = read('profiles.json');
export const library = assembleLibrary(folder('library').map(([, file]) => file));
export const catalogueFiles = Object.fromEntries(folder('catalogue'));
export const figureAnswers = read('figure-answers.json');
export const catalogue = withAnswers(
  assembleCatalogue(Object.values(catalogueFiles)),
  figureAnswers,
);
export const model = compile(axes, library, bank, profiles);
