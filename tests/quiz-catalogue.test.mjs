import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCatalogue, validateFigureAnswers } from '../src/lib/quiz/validate.ts';
import { bank, catalogue, catalogueFiles, figureAnswers, library } from './quiz-fixtures.mjs';

test('catalogue: parties, states, flags and figures are complete and point at real variants', () => {
  assert.deepEqual(validateCatalogue(library, catalogueFiles, catalogue), []);
});

test("people's own answers name real questions and people, a whole answer or a blank in each column", () => {
  assert.deepEqual(validateFigureAnswers(bank, catalogue, figureAnswers), []);
  const rated = catalogue.figures.filter((figure) => figure.answers);
  assert.equal(rated.length, Object.keys(figureAnswers.figures).length);
});
