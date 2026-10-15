import { MARKS } from './marks.ts';
import { MOTIFS } from './motifs.ts';
import type { FigureAnswerFile } from './people.ts';
import type { ProfileFile } from './profiles.ts';
import {
  AXES,
  type Axis,
  type Catalogue,
  type CatalogueFile,
  type Library,
  type Question,
  type Theme,
} from './types.ts';

// Each validator returns human-readable problems; an empty list means the data is sound.

/** Fixed questions per axis in every length: two keyed each way, so a yes-sayer lands in the middle. */
export const CORE_PER_AXIS = 4;
/** Fixed questions per facet in the standard length (core and long together), one keyed each way. */
export const FULL_PER_FACET = 2;
/** Questions the in-depth length adds to each facet; their keys tip no axis by more than one. */
export const DEEP_PER_FACET = 1;
/** Questions the in-depth length asks on each theme, at least and at most. */
export const DEEP_PER_THEME = [1, 2] as const;
/** Questions a facet needs in total so the adaptive stage has something to choose from. */
export const MIN_PER_FACET = 4;
/** Questions a theme needs, so no single wording carries it. */
export const MIN_PER_THEME = 3;
/** A facet override may pull its axis average this far from the axis rating, no further. */
export const MAX_FACET_DRIFT = 10;

const inRange = (value: unknown, low: number, high: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateAxes(axes: readonly Axis[]): string[] {
  const problems: string[] = [];
  if (axes.map((axis) => axis.id).join() !== AXES.join()) {
    problems.push(`axes must be, in order: ${AXES.join(', ')}`);
  }
  const seen = new Set<string>();
  for (const axis of axes) {
    if (axis.anchors?.length !== 5) problems.push(`${axis.id}: needs 5 anchors`);
    if (axis.poles?.length !== 2) problems.push(`${axis.id}: needs 2 poles`);
    if (!axis.facets?.length) problems.push(`${axis.id}: has no facets`);
    for (const facet of axis.facets ?? []) {
      if (!facet.id.startsWith(`${axis.id}.`))
        problems.push(`${facet.id}: must start with ${axis.id}.`);
      if (seen.has(facet.id)) problems.push(`${facet.id}: duplicate facet`);
      if (facet.poles?.length !== 2) problems.push(`${facet.id}: needs 2 poles`);
      seen.add(facet.id);
    }
  }
  return problems;
}

export function validateThemes(themes: readonly Theme[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const theme of themes) {
    if (seen.has(theme.id)) problems.push(`${theme.id}: duplicate theme`);
    seen.add(theme.id);
    if (!KEBAB.test(theme.id)) problems.push(`${theme.id}: id must be kebab-case`);
    if (!theme.name || !theme.about) problems.push(`${theme.id}: needs name and about`);
  }
  return problems;
}

export function validateBank(
  axes: readonly Axis[],
  bank: readonly Question[],
  themes: readonly Theme[],
): string[] {
  const problems: string[] = [];
  const facetAxis = new Map(axes.flatMap((axis) => axis.facets.map((f) => [f.id, axis.id])));
  const themeIds = new Set(themes.map((theme) => theme.id));
  const ids = new Set<string>();
  const numbers = new Set<number>();
  const texts = new Set<string>();
  const perFacet = new Map<string, Question[]>();
  const perTheme = new Map<string, number>();
  const deepPerTheme = new Map<string, number>();
  for (const q of bank) {
    if (ids.has(q.id)) problems.push(`${q.id}: duplicate id`);
    ids.add(q.id);
    if (!Number.isInteger(q.n) || q.n < 1 || q.n > 1023)
      problems.push(`${q.id}: n must be an integer 1–1023`);
    if (numbers.has(q.n)) problems.push(`${q.id}: number ${q.n} reused`);
    numbers.add(q.n);
    const text = q.text?.trim().toLowerCase();
    if (texts.has(text)) problems.push(`${q.id}: duplicate text`);
    texts.add(text);
    if (!inRange(q.text?.length, 30, 220)) problems.push(`${q.id}: text must be 30–220 characters`);
    if (!['core', 'long', 'deep', 'pool'].includes(q.tier)) problems.push(`${q.id}: bad tier`);
    if (!['draft', 'piloted', 'kept', 'dropped'].includes(q.status))
      problems.push(`${q.id}: bad status`);
    if (q.facet === null) {
      if (q.key !== null) problems.push(`${q.id}: a theme question has no key`);
      if (!q.theme || !themeIds.has(q.theme)) problems.push(`${q.id}: unknown theme ${q.theme}`);
      if (q.tier !== 'pool' && q.tier !== 'deep')
        problems.push(`${q.id}: a theme question is asked only in depth or when chosen`);
      if (!q.id.startsWith(`${q.theme}.`)) problems.push(`${q.id}: id must start with its theme`);
      if (q.status !== 'dropped' && q.theme) {
        perTheme.set(q.theme, (perTheme.get(q.theme) ?? 0) + 1);
        if (q.tier === 'deep') deepPerTheme.set(q.theme, (deepPerTheme.get(q.theme) ?? 0) + 1);
      }
      continue;
    }
    if (!facetAxis.has(q.facet)) problems.push(`${q.id}: unknown facet ${q.facet}`);
    if (!q.id.startsWith(`${q.facet}.`)) problems.push(`${q.id}: id must start with its facet`);
    if (q.key !== 1 && q.key !== -1) problems.push(`${q.id}: key must be 1 or -1`);
    if (q.theme !== undefined && !themeIds.has(q.theme))
      problems.push(`${q.id}: unknown theme ${q.theme}`);
    if (q.status === 'dropped') continue;
    perFacet.set(q.facet, [...(perFacet.get(q.facet) ?? []), q]);
  }
  const keys = (questions: readonly Question[]) =>
    questions.reduce((sum, q) => sum + (q.key ?? 0), 0);
  for (const [facet] of facetAxis) {
    const questions = perFacet.get(facet) ?? [];
    const fixed = questions.filter((q) => q.tier === 'core' || q.tier === 'long');
    if (!questions.some((q) => q.tier === 'core')) problems.push(`${facet}: needs a core question`);
    if (fixed.length !== FULL_PER_FACET)
      problems.push(`${facet}: needs ${FULL_PER_FACET} core and long questions`);
    // Agreeing with everything must not move a facet in the full length.
    if (keys(fixed) !== 0) problems.push(`${facet}: core and long keys unbalanced`);
    if (questions.length < MIN_PER_FACET)
      problems.push(`${facet}: needs ${MIN_PER_FACET} questions`);
    if (questions.filter((q) => q.tier === 'deep').length !== DEEP_PER_FACET)
      problems.push(`${facet}: needs ${DEEP_PER_FACET} in-depth question`);
  }
  let deepKeys = 0;
  for (const axis of axes) {
    const core = axis.facets.flatMap((f) =>
      (perFacet.get(f.id) ?? []).filter((q) => q.tier === 'core'),
    );
    if (core.length !== CORE_PER_AXIS) problems.push(`${axis.id}: needs ${CORE_PER_AXIS} core`);
    if (keys(core) !== 0) problems.push(`${axis.id}: core keys unbalanced`);
    const deep = keys(
      axis.facets.flatMap((f) => (perFacet.get(f.id) ?? []).filter((q) => q.tier === 'deep')),
    );
    if (Math.abs(deep) > 1) problems.push(`${axis.id}: in-depth keys tip the axis`);
    deepKeys += deep;
  }
  if (deepKeys !== 0) problems.push('in-depth keys unbalanced over the axes');
  for (const theme of themeIds) {
    if ((perTheme.get(theme) ?? 0) < MIN_PER_THEME)
      problems.push(`${theme}: needs ${MIN_PER_THEME} questions`);
    const deep = deepPerTheme.get(theme) ?? 0;
    if (deep < DEEP_PER_THEME[0] || deep > DEEP_PER_THEME[1])
      problems.push(`${theme}: needs ${DEEP_PER_THEME.join(' to ')} in-depth questions`);
  }
  return problems;
}

/** Every variant rated in the same columns, which name every question in the bank. */
export function validateProfiles(
  bank: readonly Question[],
  library: Library,
  profiles: ProfileFile,
): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(profiles.version) || profiles.version < 0)
    problems.push('profiles: version must be a whole number');
  const columns = new Set(profiles.items);
  if (columns.size !== profiles.items.length) problems.push('profiles: duplicate column');
  const ids = new Set(bank.map((q) => q.id));
  for (const id of profiles.items)
    if (!ids.has(id)) problems.push(`profiles: unknown question ${id}`);
  for (const q of bank)
    if (q.status !== 'dropped' && !columns.has(q.id))
      problems.push(`profiles: no column for ${q.id}`);
  const variants = new Set(library.variants.map((v) => v.id));
  for (const id of Object.keys(profiles.variants))
    if (!variants.has(id)) problems.push(`profiles: unknown variant ${id}`);
  for (const v of library.variants) {
    const row = profiles.variants[v.id];
    if (row === undefined) {
      problems.push(`${v.id}: no expected answers`);
      continue;
    }
    if (row.length !== profiles.items.length)
      problems.push(`${v.id}: ${row.length} answers for ${profiles.items.length} columns`);
    if (!/^[a-z.]*$/.test(row)) problems.push(`${v.id}: answers must be letters a–z or .`);
  }
  return problems;
}

/**
 * The people's own answers name questions in the bank and people in the catalogue, a whole
 * answer −3 … 3 or a blank in every column.
 */
export function validateFigureAnswers(
  bank: readonly Question[],
  catalogue: Catalogue,
  file: FigureAnswerFile,
): string[] {
  const problems: string[] = [];
  const ids = new Set(bank.map((q) => q.id));
  if (new Set(file.items).size !== file.items.length)
    problems.push('figure answers: duplicate column');
  for (const id of file.items)
    if (!ids.has(id)) problems.push(`figure answers: unknown question ${id}`);
  const people = new Set(catalogue.figures.map((figure) => figure.id));
  for (const [id, row] of Object.entries(file.figures)) {
    if (!people.has(id)) problems.push(`figure answers: unknown person ${id}`);
    if (row.length !== file.items.length)
      problems.push(`${id}: ${row.length} answers for ${file.items.length} columns`);
    if (!/^[acegikm.]*$/.test(row)) problems.push(`${id}: answers must be whole steps or .`);
  }
  return problems;
}

export function validateLibrary(axes: readonly Axis[], library: Library): string[] {
  const problems: string[] = [];
  const facets = new Map(axes.flatMap((axis) => axis.facets.map((f) => [f.id, axis])));
  const families = new Set<string>();
  for (const family of library.families) {
    if (families.has(family.id)) problems.push(`${family.id}: duplicate family`);
    families.add(family.id);
    if (!family.name || !family.summary) problems.push(`${family.id}: needs name and summary`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  const perFamily = new Map<string, number>();
  for (const v of library.variants) {
    if (ids.has(v.id)) problems.push(`${v.id}: duplicate variant id`);
    if (names.has(v.name)) problems.push(`${v.id}: duplicate name ${v.name}`);
    ids.add(v.id);
    names.add(v.name);
    if (!KEBAB.test(v.id)) problems.push(`${v.id}: id must be kebab-case`);
    if (!families.has(v.family)) problems.push(`${v.id}: unknown family ${v.family}`);
    perFamily.set(v.family, (perFamily.get(v.family) ?? 0) + 1);
    if (!v.name || !v.en || !v.summary || !v.period) problems.push(`${v.id}: missing text`);
    if (!v.exemplars?.length) problems.push(`${v.id}: needs exemplars`);
    if (!v.raters?.length) problems.push(`${v.id}: needs raters`);
    if (!['draft', 'rated', 'reviewed', 'published'].includes(v.status)) {
      problems.push(`${v.id}: bad status`);
    }
    for (const axis of AXES) {
      if (!Number.isInteger(v.axes?.[axis]) || !inRange(v.axes[axis], 0, 100)) {
        problems.push(`${v.id}: ${axis} must be an integer 0–100`);
      }
    }
    for (const [facet, value] of Object.entries(v.facets ?? {})) {
      if (!facets.has(facet)) problems.push(`${v.id}: unknown facet ${facet}`);
      if (!Number.isInteger(value) || !inRange(value, 0, 100)) {
        problems.push(`${v.id}: ${facet} must be an integer 0–100`);
      }
    }
    for (const [key, value] of Object.entries(v.sd ?? {})) {
      if (!facets.has(key) && !(AXES as readonly string[]).includes(key)) {
        problems.push(`${v.id}: sd for unknown ${key}`);
      }
      if (!inRange(value, 3, 30)) problems.push(`${v.id}: sd ${key} must be 3–30`);
    }
    for (const axis of axes) {
      const values = axis.facets.map((f) => v.facets?.[f.id] ?? v.axes?.[axis.id]);
      const drift = values.reduce((sum, x) => sum + x, 0) / values.length - v.axes?.[axis.id];
      if (Math.abs(drift) > MAX_FACET_DRIFT) {
        problems.push(`${v.id}: ${axis.id} facets average ${Math.round(drift)} off the axis`);
      }
    }
  }
  for (const family of families) {
    if ((perFamily.get(family) ?? 0) < 2) problems.push(`${family}: needs at least 2 variants`);
  }
  return problems;
}

const HEX = /^#[0-9a-f]{6}$/;
const LIVING_VIETNAMESE = /–nay$|^s\. /;

/** Checks catalogue files one by one (ids must be unique across files), then the assembled whole. */
export function validateCatalogue(
  library: Library,
  files: Record<string, CatalogueFile>,
  catalogue: Catalogue,
): string[] {
  const problems: string[] = [];
  const variants = new Set(library.variants.map((v) => v.id));
  const color = (where: string, value: unknown) => {
    if (typeof value !== 'string' || !HEX.test(value))
      problems.push(`${where}: colour must be #rrggbb`);
  };
  // Flags print solid charges (motifs.ts); party badges draw line marks (marks.ts).
  const motif = (where: string, value: unknown) => {
    if (typeof value !== 'string' || !(value in MOTIFS))
      problems.push(`${where}: unknown motif ${value}`);
  };
  const mark = (where: string, value: unknown) => {
    if (typeof value !== 'string' || !(value in MARKS))
      problems.push(`${where}: unknown mark ${value}`);
  };
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string, file: string) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) problems.push(`${id}: ${kind} defined in ${seen.get(key)} and ${file}`);
    seen.set(key, file);
    if (!KEBAB.test(id)) problems.push(`${id}: id must be kebab-case`);
  };
  for (const [file, data] of Object.entries(files)) {
    for (const [id, flag] of Object.entries(data.flags ?? {})) {
      claim('flag', id, file);
      const where = `flag ${id}`;
      if (!['plain', 'h', 'v', 'nordic', 'cross', 'union', 'diagonal'].includes(flag.layout))
        problems.push(`${where}: bad layout`);
      if (!flag.colors?.length) problems.push(`${where}: needs colours`);
      for (const c of flag.colors ?? []) color(where, c);
      if (flag.weights && flag.weights.length !== flag.colors.length)
        problems.push(`${where}: one weight per colour`);
      if (flag.canton) {
        color(`${where} canton`, flag.canton.color);
        if (flag.canton.motif) motif(`${where} canton`, flag.canton.motif);
        if (flag.canton.ink) color(`${where} canton`, flag.canton.ink);
      }
      if (flag.triangle) {
        color(`${where} triangle`, flag.triangle.color);
        if (flag.triangle.motif) motif(`${where} triangle`, flag.triangle.motif);
        if (flag.triangle.ink) color(`${where} triangle`, flag.triangle.ink);
      }
      for (const charge of [flag.emblem ?? []].flat()) {
        motif(`${where} emblem`, charge.motif);
        color(`${where} emblem`, charge.color);
      }
    }
    for (const party of data.parties ?? []) claim('party', party.id, file);
    for (const state of data.states ?? []) claim('state', state.id, file);
    for (const figure of data.figures ?? []) claim('figure', figure.id, file);
  }
  const linked = (where: string, ids: unknown) => {
    if (!Array.isArray(ids) || !ids.length) problems.push(`${where}: needs variants`);
    for (const id of Array.isArray(ids) ? ids : [])
      if (!variants.has(id)) problems.push(`${where}: unknown variant ${id}`);
  };
  for (const party of catalogue.parties) {
    const where = `party ${party.id}`;
    if (!party.name || !party.country || !party.period) problems.push(`${where}: missing text`);
    linked(where, party.variants);
    const e = party.emblem;
    if (!e || !['disc', 'shield', 'square', 'diamond', 'hexagon'].includes(e.shape))
      problems.push(`${where}: bad emblem shape`);
    color(where, e?.field);
    color(where, e?.ink);
    if (e?.ring) color(where, e.ring);
    mark(where, e?.motif);
  }
  for (const state of catalogue.states) {
    const where = `state ${state.id}`;
    if (!state.name || !state.period) problems.push(`${where}: missing text`);
    linked(where, state.variants);
    // A sealed state prints no flag: one that had none, or Nazi Germany, whose flag is withheld.
    if (state.flag === undefined) {
      if (!state.seal) problems.push(`${where}: needs a flag or a seal`);
    } else if (!catalogue.flags[state.flag]) problems.push(`${where}: unknown flag ${state.flag}`);
  }
  for (const figure of catalogue.figures) {
    const where = `figure ${figure.id}`;
    if (!figure.name || !figure.life || !figure.role) problems.push(`${where}: missing text`);
    if (!variants.has(figure.variant)) problems.push(`${where}: unknown variant ${figure.variant}`);
    for (const [axis, value] of Object.entries(figure.axes ?? {})) {
      if (!(AXES as readonly string[]).includes(axis))
        problems.push(`${where}: unknown axis ${axis}`);
      if (!Number.isInteger(value) || !inRange(value, 0, 100))
        problems.push(`${where}: ${axis} must be an integer 0–100`);
    }
    if (LIVING_VIETNAMESE.test(figure.life) && /Việt Nam/.test(figure.role))
      problems.push(`${where}: no living Vietnamese politicians`);
  }
  return problems;
}
