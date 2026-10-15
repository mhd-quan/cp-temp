// What only the results need: the people, parties and states, the glyphs and
// the portraits. Fetched as the player nears the end of the questions.
import figureAnswers from '../../data/quiz/figure-answers.json';
import glyphs from '../../data/quiz/glyphs.json';
import portraits from '../../data/quiz/portraits.json';
import { withAnswers } from './people.ts';
import { assembleCatalogue, type CatalogueFile } from './types.ts';
import type { GlyphData, Portrait } from './view.ts';

const files = import.meta.glob<CatalogueFile>('../../data/quiz/catalogue/*.json', {
  eager: true,
  import: 'default',
});

export const catalogue = withAnswers(
  assembleCatalogue(
    Object.keys(files)
      .sort()
      .map((path) => files[path]),
  ),
  figureAnswers,
);
export const glyphData = glyphs as GlyphData;
export const portraitData = portraits as unknown as Record<string, Portrait>;
export { answersFromShared, buildResult, shareCode } from './results.ts';
export * as view from './view.ts';
