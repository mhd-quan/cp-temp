// A colour for every family of ideas, set the way the six inks are set
// (scripts/edition-palette.mjs): each role keeps its lightness and hue, its
// chroma is the ink's chroma times the family's strength, reduced only as far
// as sRGB needs, and the text level moves until it clears 4.6:1 on its papers.

export interface FamilyInk {
  hue: number;
  /** 1 is as vivid as the six inks; muted families sit near 0.2. */
  strength: number;
}

type Rgb = [number, number, number];

function oklchToLinear(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** The largest chroma up to `C` that fits sRGB at this lightness and hue. */
export function fitChroma(L: number, C: number, H: number): number {
  if (inGamut(oklchToLinear(L, C, H))) return C;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear(L, mid, H))) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Relative luminance of a colour as it ships (clipped to sRGB). */
export function luminance(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinear(L, C, H).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export interface Role {
  L: number;
  C: number;
}

export interface FamilyRoles {
  text: Role;
  pigment: Role;
  ink: Role;
  paper: Role;
  wash: Role;
}

// The six inks' levels (palette.css), and the surfaces text must read on.
const LEVELS = {
  light: {
    text: [0.46, 0.15],
    pigment: [0.6, 0.17],
    ink: [0.33, 0.12],
    paper: [0.91, 0.042],
    wash: [0.955, 0.022],
  },
  dark: {
    text: [0.8, 0.1],
    pigment: [0.72, 0.15],
    ink: [0.3, 0.1],
    paper: [0.84, 0.05],
    wash: [0.265, 0.035],
  },
} as const;
export const SURFACES = {
  light: [
    [0.982, 0.004, 95],
    [0.962, 0.006, 95],
  ],
  dark: [
    [0.19, 0.016, 272],
    [0.225, 0.018, 272],
  ],
} as const;

export function familyRoles({ hue, strength }: FamilyInk, theme: 'light' | 'dark'): FamilyRoles {
  const levels = LEVELS[theme];
  const role = ([L, C]: readonly [number, number]): Role => ({
    L,
    C: fitChroma(L, C * strength, hue),
  });
  const roles: FamilyRoles = {
    text: role(levels.text),
    pigment: role(levels.pigment),
    ink: role(levels.ink),
    paper: role(levels.paper),
    wash: role(levels.wash),
  };
  const surfaces = [
    ...SURFACES[theme].map(([L, C, H]) => luminance(L, C, H)),
    luminance(roles.wash.L, roles.wash.C, hue),
  ];
  const step = theme === 'light' ? -0.005 : 0.005;
  let { L } = roles.text;
  const reads = (at: number) =>
    surfaces.every(
      (s) => contrast(luminance(at, fitChroma(at, levels.text[1] * strength, hue), hue), s) >= 4.6,
    );
  while (!reads(L)) L += step;
  roles.text = { L, C: fitChroma(L, levels.text[1] * strength, hue) };
  return roles;
}

const n = (value: number) => String(+value.toFixed(3)).replace(/^0\./, '.');
const LETTERS = { text: 't', pigment: 'g', ink: 'i', paper: 'p', wash: 'w' } as const;

/**
 * One rule per family, carrying its hue and each role's lightness and chroma, by day
 * (--l*) and by night (--d*): t text, g pigment, i ink, p paper, w wash. quiz.css turns
 * them into --fam-text, --fam-pigment, --fam-ink, --fam-paper and --fam-wash.
 */
export function familyPaletteCss(families: Record<string, FamilyInk>): string {
  return Object.entries(families)
    .map(([id, ink]) => {
      const light = familyRoles(ink, 'light');
      const dark = familyRoles(ink, 'dark');
      const pairs = (roles: FamilyRoles, prefix: string) =>
        (Object.keys(LETTERS) as (keyof FamilyRoles)[])
          .map((key) => `--${prefix}${LETTERS[key]}:${n(roles[key].L)} ${n(roles[key].C)}`)
          .join(';');
      return `[data-family='${id}']{--fh:${ink.hue};${pairs(light, 'l')};${pairs(dark, 'd')}}`;
    })
    .join('');
}

/** A family's pigment, by day and by night: the colour of its dots in the cube. */
export function familyPigment(ink: FamilyInk): { day: string; night: string } {
  const colour = (theme: 'light' | 'dark') => {
    const { pigment } = familyRoles(ink, theme);
    return `oklch(${n(pigment.L)} ${n(pigment.C)} ${ink.hue})`;
  };
  return { day: colour('light'), night: colour('dark') };
}
