// La bàn Tư tưởng: data shapes shared by the engine, the page and the tests.
// Method and constants are documented in docs/quiz/method.md.

export const AXES = [
  'economy',
  'distribution',
  'trade',
  'power',
  'liberty',
  'elites',
  'lifestyle',
  'religion',
  'identity',
  'environment',
  'foreign',
  'change',
] as const;
export type AxisId = (typeof AXES)[number];

/** A narrower question inside an axis. Its poles run the same way as the axis poles. */
export interface Facet {
  id: string;
  name: string;
  poles: [string, string];
}

/** 0 is the first pole, 100 the second. Anchors describe 0, 25, 50, 75 and 100. */
export interface Axis {
  id: AxisId;
  name: string;
  question: string;
  poles: [string, string];
  anchors: [string, string, string, string, string];
  facets: Facet[];
}

/** The seven-point scale: −3 (phản đối trong mọi trường hợp) … 3 (đồng ý trong mọi trường hợp); null is a skip. */
export type Answer = -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;

/** The labels of the seven points, from −3 to 3. */
export const SCALE = [
  'Phản đối trong mọi trường hợp',
  'Phản đối trong phần lớn trường hợp',
  'Phản đối phần nào',
  'Trung lập',
  'Đồng ý phần nào',
  'Đồng ý trong phần lớn trường hợp',
  'Đồng ý trong mọi trường hợp',
] as const;

export interface Question {
  id: string;
  /** Stable number, never reused: shared links name questions by it. */
  n: number;
  text: string;
  /** The facet whose axis score the answer moves; null for a theme question, which only separates variants. */
  facet: string | null;
  /** +1: agreeing moves toward the facet's second pole (100); −1: toward the first (0); null for a theme question. */
  key: 1 | -1 | null;
  /** For a theme question: what it separates (docs/quiz/method.md, "Chủ đề phân định"). */
  theme?: string;
  /**
   * core: the fixed part of every length; long: added to it in the standard and in-depth
   * lengths; deep: added again in the in-depth length; pool: chosen for the player only.
   */
  tier: 'core' | 'long' | 'deep' | 'pool';
  status: 'draft' | 'piloted' | 'kept' | 'dropped';
}

/** A theme: a line of division the twelve axes do not draw, used to separate close variants. */
export interface Theme {
  id: string;
  name: string;
  /** One sentence on what it separates. */
  about: string;
}

export interface Family {
  id: string;
  name: string;
  en: string;
  summary: string;
}

export interface Variant {
  id: string;
  family: string;
  name: string;
  en: string;
  summary: string;
  exemplars: string[];
  period: string;
  /** Position on every axis, 0–100. */
  axes: Record<AxisId, number>;
  /** Facets where the variant departs from its axis position. Others inherit the axis value. */
  facets?: Record<string, number>;
  /** Rating uncertainty in points, keyed by axis or facet id, where it differs from the default. */
  sd?: Record<string, number>;
  status: 'draft' | 'rated' | 'reviewed' | 'published';
  raters: string[];
}

/** One file in src/data/quiz/library: a family and its variants. */
export interface LibraryFile {
  family: Family;
  variants: Omit<Variant, 'family'>[];
}

export interface Library {
  families: Family[];
  variants: Variant[];
}

/** A party badge drawn from the motif set; a redrawn glyph, never the party's own logo. */
export interface Emblem {
  shape: 'disc' | 'shield' | 'square' | 'diamond' | 'hexagon';
  field: string;
  ink: string;
  motif: string;
  ring?: string;
}

/** A simplified flag on a 3:2 field. Stripes run top to bottom (h) or hoist to fly (v). */
export interface FlagSpec {
  layout: 'plain' | 'h' | 'v' | 'nordic' | 'cross' | 'union' | 'diagonal';
  colors: string[];
  weights?: number[];
  canton?: { color: string; motif?: string; ink?: string; width?: number; height?: number };
  triangle?: { color: string; motif?: string; ink?: string; depth?: number };
  /** `x` may list several places along the band, for a flag that repeats its mark; a list stacks charges, as the star on North Korea's disc. */
  emblem?: FlagCharge | FlagCharge[];
}

export interface FlagCharge {
  motif: string;
  color: string;
  size?: number;
  x?: number | number[];
  y?: number;
}

export interface Party {
  id: string;
  name: string;
  abbr?: string;
  country: string;
  period: string;
  /** Variants the party embodies, most typical first. */
  variants: string[];
  emblem: Emblem;
}

/** A state or regime in a given period, e.g. Sweden 1932–1976. */
export interface State {
  id: string;
  name: string;
  period: string;
  note?: string;
  variants: string[];
  /** A key of the catalogue's flags; none for a state before flags, or one never printed. */
  flag?: string;
  /** Show a neutral seal instead of a flag. */
  seal?: boolean;
}

export interface Figure {
  id: string;
  name: string;
  life: string;
  role: string;
  variant: string;
  /** Axes where the person departs from their variant, for the period rated. */
  axes?: Partial<Record<AxisId, number>>;
  /**
   * The person's own answers, question id → −3 … 3, where they have been rated question by
   * question (figure-answers.json, attached by people.ts withAnswers); blanks are left out.
   */
  answers?: Record<string, number>;
  /** English Wikipedia article, used to find a licensed portrait. */
  wiki?: string;
}

/** One file in src/data/quiz/catalogue: parties, states and figures for a family's variants. */
export interface CatalogueFile {
  flags?: Record<string, FlagSpec>;
  parties?: Party[];
  states?: State[];
  figures?: Figure[];
}

export interface Catalogue {
  flags: Record<string, FlagSpec>;
  parties: Party[];
  states: State[];
  figures: Figure[];
}

export function assembleCatalogue(files: CatalogueFile[]): Catalogue {
  return {
    flags: Object.assign({}, ...files.map((file) => file.flags ?? {})),
    parties: files.flatMap((file) => file.parties ?? []),
    states: files.flatMap((file) => file.states ?? []),
    figures: files.flatMap((file) => file.figures ?? []),
  };
}

export function assembleLibrary(files: LibraryFile[]): Library {
  return {
    families: files.map((file) => file.family),
    variants: files.flatMap((file) =>
      file.variants.map((variant) => ({ ...variant, family: file.family.id })),
    ),
  };
}
