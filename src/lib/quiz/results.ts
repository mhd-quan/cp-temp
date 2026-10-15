import { compass, type Point3 } from './compass.ts';
import {
  type Apart,
  type Common,
  type Edge,
  edge,
  partings,
  type Quote,
  standouts,
  support,
  type Tension,
  tension,
} from './insight.ts';
import {
  type FamilyMatch,
  type Match,
  match,
  matchFamilies,
  type Verdict,
  verdict,
} from './match.ts';
import type { Model } from './model.ts';
import {
  axisFigures,
  embodiments,
  type FigureMatch,
  matchFigures,
  representatives,
} from './people.ts';
import { type Estimate, estimate } from './score.ts';
import { encodeResult, type SharedResult } from './share.ts';
import type { Answer, Catalogue, Party, State } from './types.ts';

// Everything the results page shows, worked out from an estimate in one place so the
// page only draws it. docs/quiz/method.md explains the numbers.

/** Variants listed under the verdict, the verdict among them. */
export const TOP = 7;
/** People named, one for each of the leading variants. */
export const FIGURES = 3;

export interface Result {
  /** What the page may say, and the leading matches. */
  verdict: Verdict;
  matches: Match[];
  families: FamilyMatch[];
  /** The closest variants, closest first; the lead is the first. */
  top: Match[];
  lead: Match;
  family: FamilyMatch;
  parties: Party[];
  states: State[];
  /** The lead variant has no party (or state) of its own; these follow its nearest kin. */
  borrowedParties: boolean;
  borrowedStates: boolean;
  /** One person for each of the leading variants. */
  figures: FigureMatch[];
  axisFigures: (FigureMatch | null)[];
  /** Axis positions, 0–100, in the order of the axes; 50 where unanswered. */
  scores: number[];
  /** Axes where the player's facets point opposite ways (score.ts, `divided`). */
  divided: boolean[];
  /** Where the cube puts the player: 0–100 on economy, rule and change (compass.ts). */
  point: Point3;
  /** Why the lead: the answers that made it, those it explains worst, and its edge over the runner-up. */
  reasons: {
    support: Quote[];
    partings: Quote[];
    edge: Edge | null;
  };
  /** Where the player stands apart from the library, and where with much of it. */
  standouts: { apart: Apart | null; common: Common | null };
  tension: Tension | null;
  /** The variant least likely for the player. */
  farthest: Match;
}

/**
 * Parties and states for the lead variant. When it has none of its own, the nearest
 * variants of the same family lend theirs, in the order the player matched them.
 */
function represent(catalogue: Catalogue, matches: readonly Match[], lead: Match) {
  const own = embodiments(catalogue, lead.variant.id);
  const kin = matches.filter(
    (item) => item !== lead && item.variant.family === lead.variant.family,
  );
  const borrow = <T extends Party | State>(pick: (id: string) => T[], limit: number) => {
    const found: T[] = [];
    for (const item of kin) {
      for (const entry of pick(item.variant.id)) {
        if (found.length < limit && !found.includes(entry)) found.push(entry);
      }
      if (found.length >= limit) break;
    }
    return found;
  };
  const parties = own.parties.length
    ? own.parties
    : borrow((id) => embodiments(catalogue, id).parties, 2);
  const states = own.states.length
    ? own.states
    : borrow((id) => embodiments(catalogue, id).states, 1);
  return {
    parties,
    states,
    borrowedParties: !own.parties.length && parties.length > 0,
    borrowedStates: !own.states.length && states.length > 0,
  };
}

export function buildResult(model: Model, current: Estimate, catalogue: Catalogue): Result {
  const matches = match(model, current);
  const called = verdict(model, current, matches);
  const scores = current.axes.map((axis) => Math.round(axis.mean));
  const ranked = matchFigures(model, current, catalogue.figures, matches);
  return {
    verdict: called,
    matches,
    families: matchFamilies(model, matches),
    top: matches.slice(0, TOP),
    lead: called.lead,
    family: called.family,
    ...represent(catalogue, matches, called.lead),
    figures: representatives(ranked, matches, FIGURES),
    axisFigures: axisFigures(model, current, ranked),
    scores,
    divided: current.axes.map((axis) => axis.divided),
    point: compass(scores),
    reasons: {
      support: support(model, current, called.lead),
      partings: partings(model, current, called.lead),
      edge: edge(model, current, called.lead, called.runnerUp),
    },
    standouts: standouts(model, current),
    tension: tension(model, current, matches),
    farthest: matches[matches.length - 1],
  };
}

/** The code a shared link carries (share.ts): every answer, by question number. */
export function shareCode(model: Model, answers: ReadonlyMap<string, Answer>): string {
  const byNumber = new Map<number, number>();
  for (const [id, answer] of answers) {
    const q = model.questionIndex.get(id);
    if (q === undefined || answer === null || answer === undefined) continue;
    byNumber.set(model.questions[q].n, answer);
  }
  return encodeResult(model.version, byNumber);
}

/**
 * The answers a current link carries, by question id, and whether the result is recomputed
 * against expected answers newer than the sender's, or without questions since dropped.
 */
export function answersFromShared(
  model: Model,
  shared: Extract<SharedResult, { version: 3 }>,
): { answers: Map<string, Answer>; recomputed: boolean } {
  const byNumber = new Map(model.questions.map((question) => [question.n, question.id]));
  const answers = new Map<string, Answer>();
  let missing = 0;
  for (const [n, value] of shared.answers) {
    const id = byNumber.get(n);
    if (id) answers.set(id, value as Answer);
    else missing++;
  }
  return { answers, recomputed: missing > 0 || shared.profiles !== model.version };
}

/** The estimate a current link describes. */
export function estimateFromShared(
  model: Model,
  shared: Extract<SharedResult, { version: 3 }>,
): Estimate {
  return estimate(model, answersFromShared(model, shared).answers);
}

/** The anchor sentence nearest a score: 0, 25, 50, 75 or 100. */
export function anchorIndex(score: number): number {
  return Math.min(4, Math.max(0, Math.round(score / 25)));
}
