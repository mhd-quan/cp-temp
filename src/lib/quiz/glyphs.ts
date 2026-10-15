import { MARKS, type Mark } from './marks.ts';
import { MOTIFS } from './motifs.ts';
import type { Emblem, FlagSpec } from './types.ts';

// Every picture the results name, drawn as inline SVG strings so the page can
// print them with no image requests: a seal for each idea, engraved in its family's
// ink; a badge for each party, redrawn in its own colours (never its logo); a flag
// for each state, simplified to stripes, a cross, a canton or a charge. Seals and
// badges share one line drawing, the site's icon hand (1.5 on a 24 grid, round
// ends); flags keep solid charges, as flags are printed.
// Names always stand beside them, so the drawings are hidden from screen readers.

const r = (value: number) => String(Math.round(value * 100) / 100);

/** A motif centred on (x, y), `size` units square, in `fill` (a colour or a class). */
export function motif(name: string, x: number, y: number, size: number, fill?: string): string {
  const d = MOTIFS[name];
  if (!d) return '';
  const k = size / 256;
  const paint =
    fill === undefined
      ? ''
      : fill.startsWith('.')
        ? ` class="${fill.slice(1)}"`
        : ` fill="${fill}"`;
  return `<path${paint} transform="translate(${r(x - size / 2)} ${r(y - size / 2)}) scale(${+k.toFixed(5)})" d="${d}"/>`;
}

const svg = (className: string, width: number, height: number, body: string) =>
  `<svg class="${className}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${body}</svg>`;

/** How a mark is painted: attributes for its ink, its tint, its lines and its knockouts. */
interface Paint {
  ink: string;
  tint: string;
  line: string;
  knock: string;
}

/** A seal's paint comes from the nearest [data-family] (quiz.css). */
const FAMILY_PAINT: Paint = {
  ink: 'class="mark__ink"',
  tint: 'class="mark__tint"',
  line: 'class="mark__line"',
  knock: 'class="mark__knock"',
};

/** Paint in fixed colours: a party's own, or a family's day inks for the saved picture. */
export function paint(ink: string, field: string): Paint {
  return {
    ink: `fill="${ink}"`,
    tint: `fill="${ink}" opacity=".2"`,
    line: `fill="none" stroke="${ink}"`,
    knock: `fill="${field}" stroke="${field}"`,
  };
}

function layer(mark: Mark, by: Paint): string {
  return (
    (mark.k ? `<path ${by.knock} stroke-width="28" stroke-linejoin="round" d="${mark.k}"/>` : '') +
    (mark.t ? `<path ${by.tint} d="${mark.t}"/>` : '') +
    (mark.o ? `<path ${by.ink} d="${mark.o}"/>` : '') +
    (mark.l
      ? `<path ${by.line} stroke-width="12" stroke-linecap="round" stroke-linejoin="round" d="${mark.l}"/>`
      : '') +
    (mark.d ? `<path ${by.ink} d="${mark.d}"/>` : '')
  );
}

/** A line mark centred on (x, y), `size` units square. */
export function lineMark(name: string, x: number, y: number, size: number, by: Paint): string {
  const mark = MARKS[name] ?? MARKS.disc;
  const k = size / 256;
  return `<g transform="translate(${r(x - size / 2)} ${r(y - size / 2)}) scale(${+k.toFixed(5)})">${(mark.layers ?? [mark]).map((item) => layer(item, by)).join('')}</g>`;
}

/**
 * The seal of an idea: its mark engraved in the family's ink on the family's paper,
 * inside a milled rim between two rules. Colours come from the nearest [data-family]
 * (quiz.css), or are given for the saved picture.
 */
export function ideaMark(motifName: string, colors?: { ink: string; paper: string }): string {
  const rule = colors ? `fill="none" stroke="${colors.ink}"` : 'class="mark__rule"';
  const reed = colors
    ? `fill="none" stroke="${colors.ink}" opacity=".5"`
    : 'class="mark__rule mark__reed"';
  return svg(
    'mark',
    64,
    64,
    `<circle ${colors ? `fill="${colors.paper}"` : 'class="mark__field"'} cx="32" cy="32" r="31.5"/>` +
      `<circle ${rule} cx="32" cy="32" r="31" stroke-width=".8"/>` +
      `<circle ${reed} cx="32" cy="32" r="28.6" stroke-width="2.4" stroke-dasharray=".22 .78" pathLength="72"/>` +
      `<circle ${rule} cx="32" cy="32" r="26.8" stroke-width=".55"/>` +
      lineMark(motifName, 32, 32, 32, colors ? paint(colors.ink, colors.paper) : FAMILY_PAINT),
  );
}

const SHAPES: Record<Emblem['shape'], { outline: string; inset: string; y: number; size: number }> =
  {
    disc: {
      outline: '<circle cx="32" cy="32" r="30"/>',
      inset: '<circle cx="32" cy="32" r="26.5"/>',
      y: 32,
      size: 36,
    },
    shield: {
      outline: '<path d="M7 5h50v25c0 16-11 25-25 30C18 55 7 46 7 30Z"/>',
      inset: '<path d="M10.5 8.5h43V30c0 13.5-9 21.5-21.5 26.3C19.5 51.5 10.5 43.5 10.5 30Z"/>',
      y: 29,
      size: 33,
    },
    square: {
      outline: '<rect x="4" y="4" width="56" height="56" rx="6"/>',
      inset: '<rect x="7.5" y="7.5" width="49" height="49" rx="3.5"/>',
      y: 32,
      size: 38,
    },
    diamond: {
      outline: '<path d="M32 2 62 32 32 62 2 32Z"/>',
      inset: '<path d="M32 7 57 32 32 57 7 32Z"/>',
      y: 32,
      size: 29,
    },
    hexagon: {
      outline: '<path d="M32 2 58 17v30L32 62 6 47V17Z"/>',
      inset: '<path d="M32 6 54.5 19v26L32 58 9.5 45V19Z"/>',
      y: 32,
      size: 34,
    },
  };

/**
 * A party's badge in its own colours: its shape filled with the party's colour (softened a
 * touch toward the page's paper, as ink sits on paper), a rule inset in its second colour,
 * and its mark drawn in the same line as the idea seals.
 */
export function emblemGlyph(emblem: Emblem): string {
  const shape = SHAPES[emblem.shape] ?? SHAPES.disc;
  const tint = (markup: string, attributes: string) => markup.replace(/\/>$/, ` ${attributes}/>`);
  const field = `color-mix(in oklab, ${emblem.field} 90%, var(--paper, #fff))`;
  return svg(
    'emblem',
    64,
    64,
    tint(shape.outline, `style="fill:${field}"`) +
      tint(shape.inset, `fill="none" stroke="${emblem.ring ?? emblem.ink}" stroke-width="1.1"`) +
      lineMark(emblem.motif, 32, shape.y, shape.size, {
        ...paint(emblem.ink, emblem.field),
        knock: `style="fill:${field};stroke:${field}"`,
      }) +
      tint(shape.outline, 'class="edge" fill="none"'),
  );
}

// Flags are drawn on a 60 × 40 field.
const W = 60;
const H = 40;

function stripes(colors: string[], weights: number[] | undefined, across: boolean): string {
  const total = colors.reduce((sum, _, i) => sum + (weights?.[i] ?? 1), 0);
  let at = 0;
  return colors
    .map((color, i) => {
      const share = (weights?.[i] ?? 1) / total;
      const start = at;
      at += share;
      // Each stripe overlaps the next by a hair so no seam of the field shows through.
      return across
        ? `<rect y="${r(start * H)}" width="${W}" height="${r(share * H + 0.05)}" fill="${color}"/>`
        : `<rect x="${r(start * W)}" width="${r(share * W + 0.05)}" height="${H}" fill="${color}"/>`;
    })
    .join('');
}

function band(half: number, color: string): string {
  // The diagonal runs from the foot of the hoist to the top of the fly.
  const [dx, dy] = [W / Math.hypot(W, H), -H / Math.hypot(W, H)];
  const [nx, ny] = [-dy * half, dx * half];
  const reach = 20;
  const a = [-dx * reach, H - dy * reach];
  const b = [W + dx * reach, dy * reach];
  const points = [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
  return `<path d="M${points.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z" fill="${color}"/>`;
}

function field(spec: FlagSpec): string {
  const [first = '#ffffff', second = first, third, fourth] = spec.colors;
  switch (spec.layout) {
    case 'h':
      return stripes(spec.colors, spec.weights, true);
    case 'v':
      return stripes(spec.colors, spec.weights, false);
    case 'nordic':
      return third
        ? `<rect width="${W}" height="${H}" fill="${first}"/>` +
            `<path d="M16.4 0h10.9v15H${W}v10H27.3v15H16.4V25H0V15h16.4Z" fill="${second}"/>` +
            `<path d="M19.1 0h5.4v17.5H${W}v5H24.5V${H}h-5.4V22.5H0v-5h19.1Z" fill="${third}"/>`
        : `<rect width="${W}" height="${H}" fill="${first}"/>` +
            `<path d="M17 0h8v16h${W - 25}v8H25v16h-8V24H0v-8h17Z" fill="${second}"/>`;
    case 'cross':
      return (
        `<rect width="${W}" height="${H}" fill="${first}"/>` +
        `<path d="M26 8h8v8h8v8h-8v8h-8v-8h-8v-8h8Z" fill="${second}"/>`
      );
    case 'union':
      return (
        `<rect width="${W}" height="${H}" fill="${spec.colors[0] ?? '#012169'}"/>` +
        `<path d="M0 0 ${W} ${H}M${W} 0 0 ${H}" stroke="${spec.colors[1] ?? '#ffffff'}" stroke-width="8"/>` +
        `<path d="M0 0 ${W} ${H}M${W} 0 0 ${H}" stroke="${spec.colors[2] ?? '#c8102e'}" stroke-width="2.6"/>` +
        `<path d="M${W / 2} 0v${H}M0 ${H / 2}h${W}" stroke="${spec.colors[1] ?? '#ffffff'}" stroke-width="13.3"/>` +
        `<path d="M${W / 2} 0v${H}M0 ${H / 2}h${W}" stroke="${spec.colors[2] ?? '#c8102e'}" stroke-width="8"/>`
      );
    case 'diagonal': {
      // [upper hoist, band, lower fly, fimbriation]; two colours split the field with no band.
      const lower = spec.colors.length === 2 ? second : (third ?? second);
      return (
        `<rect width="${W}" height="${H}" fill="${first}"/>` +
        `<path d="M0 ${H}L${W} 0V${H}Z" fill="${lower}"/>` +
        (spec.colors.length > 2
          ? (fourth ? band(7.5, fourth) : '') + band(fourth ? 5.5 : 6, second)
          : '')
      );
    }
    default:
      return `<rect width="${W}" height="${H}" fill="${first}"/>`;
  }
}

function canton(spec: NonNullable<FlagSpec['canton']>): string {
  const w = (spec.width ?? 0.4) * W;
  const h = (spec.height ?? 0.5) * H;
  let body = `<rect width="${r(w)}" height="${r(h)}" fill="${spec.color}"/>`;
  if (spec.motif === 'cross') {
    // A cross in a canton runs to its edges, as on the flag of Greece.
    const t = h / 5;
    body += `<path d="M${r(w / 2 - t / 2)} 0h${r(t)}v${r(h / 2 - t / 2)}h${r(w / 2 - t / 2)}v${r(t)}H${r(w / 2 + t / 2)}v${r(h / 2 - t / 2)}h${r(-t)}V${r(h / 2 + t / 2)}H0v${r(-t)}h${r(w / 2 - t / 2)}Z" fill="${spec.ink ?? '#ffffff'}"/>`;
  } else if (spec.motif) {
    const size = Math.min(w, h) * (spec.motif === 'star-cluster' ? 0.94 : 0.7);
    body += motif(spec.motif, w / 2, h / 2, size, spec.ink ?? '#ffffff');
  }
  return body;
}

function triangle(spec: NonNullable<FlagSpec['triangle']>): string {
  const depth = (spec.depth ?? 0.5) * W;
  return (
    `<path d="M0 0L${r(depth)} ${H / 2}L0 ${H}Z" fill="${spec.color}"/>` +
    (spec.motif ? motif(spec.motif, depth / 3, H / 2, H * 0.36, spec.ink ?? '#ffffff') : '')
  );
}

/** A state's flag on a 3:2 field, with a hairline edge so white flags hold their shape. */
export function flagGlyph(spec: FlagSpec): string {
  let body = field(spec);
  if (spec.canton) body += canton(spec.canton);
  if (spec.triangle) body += triangle(spec.triangle);
  for (const { motif: name, color, size = 0.5, x = 0.5, y = 0.5 } of [spec.emblem ?? []].flat()) {
    for (const at of [x].flat()) body += motif(name, at * W, y * H, size * H, color);
  }
  return svg(
    'flag',
    W,
    H,
    `${body}<rect class="edge" x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none"/>`,
  );
}

/** Stands for a flag the page does not print: a plain field with a blind seal. */
export function sealGlyph(): string {
  return svg(
    'flag flag--seal',
    W,
    H,
    `<rect class="flag__blank" width="${W}" height="${H}"/>` +
      '<circle class="flag__seal" cx="30" cy="20" r="11" stroke-width=".8"/>' +
      '<circle class="flag__seal flag__reed" cx="30" cy="20" r="9.8" stroke-width="1.2" stroke-dasharray=".22 .78" pathLength="48"/>' +
      '<circle class="flag__seal" cx="30" cy="20" r="8.7" stroke-width=".5"/>' +
      `<rect class="edge" x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none"/>`,
  );
}
