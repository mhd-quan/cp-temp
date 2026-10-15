// What the quiz needs before its first question: the axes, the bank, the library and
// every variant's expected answers, compiled. The page fetches this module when it is
// idle, so a press on Bắt đầu rarely waits for it.
import axes from '../../data/quiz/axes.json';
import profiles from '../../data/quiz/profiles.json';
import questions from '../../data/quiz/questions.json';
import themes from '../../data/quiz/themes.json';
import { compile } from './model.ts';
import type { ProfileFile } from './profiles.ts';
import {
  type Axis,
  assembleLibrary,
  type LibraryFile,
  type Question,
  type Theme,
} from './types.ts';

const files = import.meta.glob<LibraryFile>('../../data/quiz/library/*.json', {
  eager: true,
  import: 'default',
});

export const library = assembleLibrary(
  Object.keys(files)
    .sort()
    .map((path) => files[path]),
);
export const bank = questions as Question[];
export const themeList = themes as Theme[];
export const model = compile(axes as Axis[], library, bank, profiles as ProfileFile);
