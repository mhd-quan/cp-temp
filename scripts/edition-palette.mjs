// Sáu mực — generates the Ấn bản colour tokens from OKLCH definitions.
// Every value is gamut-mapped into sRGB by reducing chroma only (L and H are
// preserved), then measured with the WCAG 2 contrast formula on the exact
// hex that ships. Run: node scripts/edition-palette.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- colour math (OKLab, Björn Ottosson) ----------
function oklchToLinear(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const encode = (v) => {
  const c = Math.min(1, Math.max(0, v));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};
const decode = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Keep L and H; binary-search the largest chroma that fits sRGB. */
function mapToGamut(L, C, H) {
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
function hex(L, C, H) {
  const rgb = oklchToLinear(L, C, H).map(encode);
  return `#${rgb
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}
function luminance(hexValue) {
  const [r, g, b] = [1, 3, 5].map((i) =>
    decode(Number.parseInt(hexValue.slice(i, i + 2), 16) / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function colour(L, C, H) {
  const c = mapToGamut(L, C, H);
  return {
    oklch: `oklch(${+L.toFixed(3)} ${+c.toFixed(3)} ${+H.toFixed(1)})`,
    hex: hex(L, c, H),
    L,
    C: c,
    H,
  };
}

// ---------- neutrals ----------
// Paper is an uncoated white, not cream. Ink is an indigo-black: the brand's
// indigo lives in the text colour itself, so no second "brand accent" exists.
const neutrals = {
  light: {
    paper: colour(0.982, 0.004, 95),
    raised: colour(0.962, 0.006, 95),
    ink: colour(0.215, 0.032, 278),
    muted: colour(0.47, 0.02, 278),
    rule: colour(0.875, 0.008, 278),
    night: colour(0.2, 0.03, 278),
    'on-night': colour(0.95, 0.008, 95),
    'night-muted': colour(0.76, 0.016, 278),
    'night-rule': colour(0.36, 0.03, 278),
  },
  dark: {
    paper: colour(0.19, 0.016, 272),
    raised: colour(0.225, 0.018, 272),
    ink: colour(0.935, 0.01, 95),
    muted: colour(0.76, 0.014, 95),
    rule: colour(0.35, 0.016, 272),
    night: colour(0.155, 0.014, 272),
    'on-night': colour(0.935, 0.01, 95),
    'night-muted': colour(0.74, 0.014, 95),
    'night-rule': colour(0.3, 0.016, 272),
  },
};

// ---------- six inks, one per discipline ----------
// Hues are spread round the wheel so any two can meet on a plate and still be
// told apart. Names are Vietnamese pigments; meanings are editorial.
export const inks = [
  {
    key: 'son',
    name: 'Son',
    topic: 'Chính trị',
    slug: 'chinh-tri',
    H: 31,
    note: 'Mực son của châu phê: lời phán quyết của quyền lực.',
  },
  {
    key: 'nghe',
    name: 'Nghệ',
    topic: 'Kinh tế',
    slug: 'kinh-te',
    H: 78,
    note: 'Vàng nghệ, đồng thau: hàng hóa và trao đổi.',
  },
  {
    key: 'luc',
    name: 'Lục',
    topic: 'Xã hội',
    slug: 'xa-hoi',
    H: 152,
    note: 'Xanh lục đồng: đời sống chung, phố và làng.',
  },
  {
    key: 'lam',
    name: 'Lam',
    topic: 'Hiện đại',
    slug: 'hien-dai',
    H: 228,
    note: 'Lam cobalt: màu tổng hợp của kỹ nghệ.',
  },
  {
    key: 'cham',
    name: 'Chàm',
    topic: 'Tư tưởng',
    slug: 'tu-tuong',
    H: 281,
    note: 'Chàm: suy tưởng, gốc của nhận diện.',
  },
  {
    key: 'tia',
    name: 'Tía',
    topic: 'Căn tính',
    slug: 'can-tinh',
    H: 348,
    note: 'Tía: màu của dòng tộc và ký ức.',
  },
];

// Levels: `text` must pass 4.5:1 on paper and raised surfaces in its theme.
// `plate-ink` prints the engraving lines; `tint` is the paper it prints on.
function inkSet(H) {
  const set = {
    light: {
      text: colour(0.46, 0.15, H),
      pigment: colour(0.6, 0.17, H),
      'plate-ink': colour(0.33, 0.12, H),
      tint: colour(0.91, 0.042, H),
      wash: colour(0.955, 0.022, H),
      mark: colour(0.885, 0.07, H),
    },
    dark: {
      text: colour(0.8, 0.1, H),
      pigment: colour(0.72, 0.15, H),
      'plate-ink': colour(0.3, 0.1, H),
      tint: colour(0.84, 0.05, H),
      wash: colour(0.265, 0.035, H),
      mark: colour(0.34, 0.07, H),
    },
  };
  // Pull text darker (light) / lighter (dark) until it clears 4.5:1 on both surfaces.
  for (const theme of ['light', 'dark']) {
    const dir = theme === 'light' ? -1 : 1;
    let { L } = set[theme].text;
    const C = theme === 'light' ? 0.15 : 0.1;
    const surfaces = [
      neutrals[theme].paper.hex,
      neutrals[theme].raised.hex,
      set[theme].wash.hex,
      set[theme].mark.hex,
    ];
    while (surfaces.some((s) => contrast(colour(L, C, H).hex, s) < 4.6)) L += dir * 0.005;
    set[theme].text = colour(L, C, H);
  }
  return set;
}
for (const ink of inks) ink.set = inkSet(ink.H);

// ---------- report ----------
const report = { neutrals: {}, inks: [], plates: [] };
for (const theme of ['light', 'dark']) {
  const n = neutrals[theme];
  report.neutrals[theme] = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v.hex]));
  report.neutrals[theme].checks = {
    'ink/paper': +contrast(n.ink.hex, n.paper.hex).toFixed(2),
    'ink/raised': +contrast(n.ink.hex, n.raised.hex).toFixed(2),
    'muted/paper': +contrast(n.muted.hex, n.paper.hex).toFixed(2),
    'muted/raised': +contrast(n.muted.hex, n.raised.hex).toFixed(2),
    'on-night/night': +contrast(n['on-night'].hex, n.night.hex).toFixed(2),
    'night-muted/night': +contrast(n['night-muted'].hex, n.night.hex).toFixed(2),
  };
}
for (const ink of inks) {
  const row = { key: ink.key, name: ink.name, topic: ink.topic };
  for (const theme of ['light', 'dark']) {
    const s = ink.set[theme];
    const n = neutrals[theme];
    row[theme] = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.hex]));
    row[theme].checks = {
      'text/paper': +contrast(s.text.hex, n.paper.hex).toFixed(2),
      'text/raised': +contrast(s.text.hex, n.raised.hex).toFixed(2),
      'text/wash': +contrast(s.text.hex, s.wash.hex).toFixed(2),
      'text/mark': +contrast(s.text.hex, s.mark.hex).toFixed(2),
      'ink/wash': +contrast(n.ink.hex, s.wash.hex).toFixed(2),
      'pigment/paper (non-text 3:1)': +contrast(s.pigment.hex, n.paper.hex).toFixed(2),
    };
  }
  report.inks.push(row);
}
// Every collision: plate ink of topic A printed on tint of topic B.
for (const a of inks)
  for (const b of inks)
    report.plates.push({
      ink: a.key,
      paper: b.key,
      ratio: +contrast(a.set.light['plate-ink'].hex, b.set.light.tint.hex).toFixed(2),
    });

// ---------- CSS ----------
const decl = (entries) => entries.map(([k, v]) => `  --${k}: ${v};`).join('\n');
const neutralDecl = (theme) => decl(Object.entries(neutrals[theme]).map(([k, v]) => [k, v.oklch]));
const inkDecl = (theme) =>
  decl(
    inks.flatMap((ink) =>
      Object.entries(ink.set[theme]).map(([k, v]) => [`${ink.key}-${k}`, v.oklch]),
    ),
  );
// Plates are physical prints: their ink and paper do not change with the theme.
const printDecl = decl(
  inks.flatMap((ink) => [
    [`${ink.key}-print-ink`, ink.set.light['plate-ink'].oklch],
    [`${ink.key}-print-paper`, ink.set.light.tint.oklch],
  ]),
);
const inkSelectors = inks
  .map(
    (ink) =>
      `[data-ink="${ink.key}"] { --topic-text: var(--${ink.key}-text); --topic-pigment: var(--${ink.key}-pigment); --topic-wash: var(--${ink.key}-wash); --topic-mark: var(--${ink.key}-mark); --plate-ink: var(--${ink.key}-print-ink); }\n` +
      `[data-paper="${ink.key}"] { --plate-paper: var(--${ink.key}-print-paper); }`,
  )
  .join('\n');

const css = `/* Generated by scripts/edition-palette.mjs. Do not edit by hand. */
/* Sáu mực: colour names one discipline and nothing else. */
:root {
${printDecl}
}
:root {
  color-scheme: light;
${neutralDecl('light')}
${inkDecl('light')}
}
:root[data-theme="dark"] {
  color-scheme: dark;
${neutralDecl('dark')}
${inkDecl('dark')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${neutralDecl('dark').replaceAll('\n  ', '\n    ').replace(/^ {2}/, '    ')}
${inkDecl('dark').replaceAll('\n  ', '\n    ').replace(/^ {2}/, '    ')}
  }
}
${inkSelectors}
`;

fs.mkdirSync(path.join(root, 'src/styles/edition'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/styles/edition/palette.css'), css);
fs.mkdirSync(path.join(root, 'public/brand/edition'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'public/brand/edition/palette.json'),
  `${JSON.stringify({ generatedBy: 'scripts/edition-palette.mjs', definitions: inks.map(({ set, ...rest }) => rest), ...report }, null, 2)}\n`,
);

// Console summary
const fail = [];
for (const theme of ['light', 'dark'])
  for (const [k, v] of Object.entries(report.neutrals[theme].checks))
    if (v < 4.5) fail.push(`${theme} ${k} ${v}`);
for (const row of report.inks)
  for (const theme of ['light', 'dark'])
    for (const [k, v] of Object.entries(row[theme].checks))
      if (v < (k.includes('3:1') ? 3 : 4.5)) fail.push(`${theme} ${row.key} ${k} ${v}`);
const minPlate = report.plates.reduce((m, p) => (p.ratio < m.ratio ? p : m));
console.log(JSON.stringify(report.neutrals, null, 1));
for (const row of report.inks)
  console.log(row.key.padEnd(5), JSON.stringify(row.light), '\n      ', JSON.stringify(row.dark));
console.log('lowest plate contrast', minPlate);
console.log(fail.length ? `FAIL:\n${fail.join('\n')}` : 'All text pairs ≥ 4.5:1, pigments ≥ 3:1.');
