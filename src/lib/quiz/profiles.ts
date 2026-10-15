// How each variant would answer each question, as a committed adherent would: the evidence
// the matcher weighs (docs/quiz/method.md, "Hồ sơ theo câu"). The source, rater by rater
// with notes, lives in src/data/quiz/ratings/; scripts/quiz-profiles.mjs
// compiles it into src/data/quiz/profiles.json, one letter per question per variant:
//
//   a … m   the expected answer −3, −2.5, …, 3, where adherents answer alike;
//   n … z   the same thirteen answers where adherents are divided, or the raters were apart;
//   .       not rated yet.

export interface ProfileFile {
  /** Rises whenever any expected answer changes; a shared link carries it. */
  version: number;
  /** Question ids in column order. */
  items: string[];
  /** One string per variant, a letter per column. */
  variants: Record<string, string>;
}

export interface Cell {
  /** Expected answer, −3 … 3, in half steps. */
  mean: number;
  /** Adherents divided (or raters apart): the answer is a looser guide. */
  split: boolean;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
/** Half steps from −3 to 3. */
const STEPS = 13;

export function encodeCell(cell: Cell | null): string {
  if (!cell) return '.';
  const step = Math.round((Math.min(3, Math.max(-3, cell.mean)) + 3) * 2);
  return LETTERS[step + (cell.split ? STEPS : 0)];
}

export function decodeCell(letter: string): Cell | null {
  const index = LETTERS.indexOf(letter);
  if (index < 0) return null;
  return { mean: (index % STEPS) / 2 - 3, split: index >= STEPS };
}
