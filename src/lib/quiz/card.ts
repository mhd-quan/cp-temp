// La bàn Tư tưởng: the result as a picture to keep or send, drawn on a canvas
// as a small copy of the results page: tiles of frosted glass over a field of
// light in the inks of the nearest families, each glass with its mirrored rim
// and the halo at its lit corners (quiz.css, "the results, as a bento of
// glass"). The verdict across the top, with its seal, its fit and how sure the
// quiz is; the five nearest beside the cube as the page first turns it, the
// player in it; the twelve axes; the people nearest and the parties that
// followed the lead; and in the corner a code that opens this very result.
// Always by day, in the page's own type. Loaded only when the reader asks for it.
import { encode } from 'uqr';
import { compass, DIMENSIONS, frame, project, SKETCH, unit, VIEWS } from './compass.ts';
import { emblemGlyph, flagGlyph, ideaMark, sealGlyph } from './glyphs.ts';
import { position } from './model.ts';
import { familyRoles } from './palette.ts';
import type { Result } from './results.ts';
import type { Figure, Party, State } from './types.ts';
import {
  confidence,
  dimensionTag,
  type GlyphData,
  leanTag,
  percent,
  standing,
  sureness,
  type ViewContext,
} from './view.ts';

// A 9:16 sheet, the shape a story or a phone's screen shows whole.
const W = 1080;
const H = 1920;
const M = 60;
const GAP = 22;
const RADIUS = 26;
// The day inks of palette.css.
const PAPER = 'oklch(0.982 0.004 95)';
const INK = 'oklch(0.215 0.032 278)';
const MUTED = 'oklch(0.47 0.02 278)';
const TRACK = 'oklch(0.215 0.032 278 / 0.1)';
const EDGE = 'oklch(0.215 0.032 278 / 0.11)';
const BRAND = '"Libre Bodoni Variable", "Bodoni 72", Didot, serif';
const TEXT = 'Pliego, "Pliego fallback", Georgia, serif';
const SANS = '"Pensees Sans", system-ui, sans-serif';
const ADDRESS = 'cochinchinepensees.studio/the-nghiem/la-ban-tu-tuong';
/** Rows of the ranking the picture has room for, and seals numbered in its cube. */
const CARD_ROWS = 5;
/** Parties and states the picture has room for. */
const HOLDERS = 3;
/**
 * The side of the code that opens the result, in pixels, quiet zone and all: as small as a
 * share link's code (49 modules) still reads at three quarters of the picture's size.
 */
const CODE = 144;

type Context = CanvasRenderingContext2D & { letterSpacing?: string };
type Box = { x: number; y: number; w: number; h: number };

function inks(glyphs: GlyphData, family: string) {
  const ink = glyphs.families[family] ?? { hue: 270, strength: 0, motif: 'disc' };
  const roles = familyRoles(ink, 'light');
  const color = (role: keyof typeof roles, alpha = 1) =>
    `oklch(${roles[role].L.toFixed(3)} ${roles[role].C.toFixed(3)} ${ink.hue} / ${alpha})`;
  return {
    text: color('text'),
    pigment: (alpha = 1) => color('pigment', alpha),
    ink: color('ink'),
    paper: color('paper'),
    wash: (alpha = 1) => color('wash', alpha),
  };
}

/** An idea's seal as an image, in the family's day inks. */
async function seal(glyphs: GlyphData, variant: string, family: string, size: number) {
  const color = inks(glyphs, family);
  const markup = ideaMark(glyphs.variants[variant] ?? glyphs.families[family]?.motif ?? 'disc', {
    ink: color.ink,
    paper: color.paper,
  }).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `);
  const image = new Image(size, size);
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  return image;
}

/** Words set to a measure, as many lines as they take. */
function setLines(context: Context, text: string, measure: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > measure) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The largest size, down to `least`, at which the text sets in `most` lines. */
function fit(
  context: Context,
  text: string,
  font: (size: number) => string,
  measure: number,
  sizes: [number, number],
  most: number,
) {
  let [size] = sizes;
  let lines: string[] = [];
  for (; size >= sizes[1]; size -= 2) {
    plain(context, font(size));
    lines = setLines(context, text, measure);
    if (lines.length <= most) break;
  }
  // Balanced, as text-wrap: balance sets the page's titles: the narrowest measure that
  // still takes no more lines, so a last word is never left alone.
  if (lines.length > 1 && lines.length <= most) {
    let narrow = measure;
    while (narrow > measure / 2) {
      const next = setLines(context, text, narrow - 8);
      if (next.length > lines.length) break;
      narrow -= 8;
      lines = next;
    }
  }
  return { size, lines: lines.slice(0, most) };
}

/** Capitals as the page sets them: the sans at 600, tracked 0.08em. */
function caps(context: Context, size: number) {
  context.font = `600 ${size}px ${SANS}`;
  if ('letterSpacing' in context) context.letterSpacing = `${(size * 0.08).toFixed(1)}px`;
}
function plain(context: Context, font: string) {
  context.font = font;
  if ('letterSpacing' in context) context.letterSpacing = '0px';
}

/** A soft pool of a family's pigment, as .field__light draws it. */
function pool(
  context: Context,
  x: number,
  y: number,
  r: number,
  color: (alpha: number) => string,
  strength: number,
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, alpha] of [
    [0, 0.46],
    [0.26, 0.34],
    [0.54, 0.16],
    [0.78, 0.05],
    [1, 0],
  ])
    gradient.addColorStop(at, color(alpha * strength));
  context.fillStyle = gradient;
  context.fillRect(x - r, y - r, 2 * r, 2 * r);
}

/** A tile of glass: its shadow, its translucent paper, the halo at two corners and the lit rim. */
function glass(context: Context, box: Box, fill: string) {
  const { x, y, w, h } = box;
  const shape = () => {
    context.beginPath();
    context.roundRect(x, y, w, h, RADIUS);
  };
  context.save();
  shape();
  context.shadowColor = 'oklch(0.32 0.03 278 / 0.16)';
  context.shadowBlur = 44;
  context.shadowOffsetY = 18;
  context.fillStyle = fill;
  context.fill();
  context.restore();

  context.save();
  shape();
  context.clip();
  const halo = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
    context.save();
    context.translate(cx, cy);
    context.scale(1, ry / rx);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0, `oklch(1 0 0 / ${alpha})`);
    gradient.addColorStop(0.72, 'oklch(1 0 0 / 0)');
    context.fillStyle = gradient;
    context.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    context.restore();
  };
  halo(x, y, 300, 180, 0.75);
  halo(x + w, y + h, 230, 150, 0.4);
  context.restore();

  // The hairline that keeps the edge on paper, then the rim lit from the upper left.
  context.save();
  shape();
  context.lineWidth = 2;
  context.strokeStyle = EDGE;
  context.stroke();
  context.beginPath();
  context.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, RADIUS - 1.5);
  const angle = (152 * Math.PI) / 180;
  const half = (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) / 2;
  const [dx, dy] = [Math.sin(angle) * half, -Math.cos(angle) * half];
  const rim = context.createLinearGradient(
    x + w / 2 - dx,
    y + h / 2 - dy,
    x + w / 2 + dx,
    y + h / 2 + dy,
  );
  rim.addColorStop(0, 'oklch(1 0 0 / 0.95)');
  rim.addColorStop(0.2, 'oklch(1 0 0 / 0.4)');
  rim.addColorStop(0.44, 'oklch(1 0 0 / 0)');
  rim.addColorStop(0.66, 'oklch(1 0 0 / 0)');
  rim.addColorStop(0.88, 'oklch(1 0 0 / 0.4)');
  rim.addColorStop(1, 'oklch(1 0 0 / 0.95)');
  context.lineWidth = 2;
  context.strokeStyle = rim;
  context.stroke();
  context.restore();
}

/** A drawing of the page's (an emblem, a flag) as an image, with the few rules quiz.css gives it. */
async function drawing(markup: string, width: number, height: number) {
  const rules =
    '<style>.edge{stroke:oklch(0.215 0.032 278 / 0.16);stroke-width:1}.flag__blank{fill:oklch(0.94 0.005 95)}.flag__seal{fill:none;stroke:oklch(0.47 0.02 278)}.flag__reed{opacity:.6}</style>';
  const svg = markup
    .replace(
      '<svg ',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `,
    )
    .replace(/(<svg[^>]*>)/, `$1${rules}`)
    .replaceAll('var(--paper, #fff)', PAPER);
  const image = new Image(width, height);
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}

/** A portrait from the page's own files; nothing if it cannot be had. */
async function photograph(src: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.src = src;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

/**
 * A photograph printed as a plate is (foundation.css, .plate__print): grey, screened with the
 * ink so its blacks become ink, then multiplied by the paper so its whites become paper.
 */
function printed(image: HTMLImageElement, w: number, h: number, ink: string, paper: string) {
  const sheet = document.createElement('canvas');
  sheet.width = w;
  sheet.height = h;
  const context = sheet.getContext('2d', { willReadFrequently: true }) as Context;
  // Cover the box, as object-fit: cover does.
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  context.drawImage(
    image,
    (image.naturalWidth - sw) / 2,
    (image.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    w,
    h,
  );
  const pixels = context.getImageData(0, 0, w, h);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const grey = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = grey;
  }
  context.putImageData(pixels, 0, 0);
  context.globalCompositeOperation = 'screen';
  context.fillStyle = ink;
  context.fillRect(0, 0, w, h);
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = paper;
  context.fillRect(0, 0, w, h);
  return sheet;
}

/** The text cut at the measure with an ellipsis, on a word where it can be. */
function clipped(context: Context, text: string, measure: number) {
  if (context.measureText(text).width <= measure) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > measure)
    cut = cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut.slice(0, -1);
  return `${cut.replace(/[,;:·\s]+$/, '')}…`;
}

/** A tile's caption, as the page heads its tiles. */
function kicker(context: Context, text: string, box: Box, inner: number) {
  caps(context, 16);
  context.textAlign = 'left';
  context.fillStyle = MUTED;
  context.fillText(text, box.x + inner, box.y + inner + 16, box.w - 2 * inner);
}

export async function drawCard(result: Result, view: ViewContext, url: string): Promise<Blob> {
  const { glyphs, model, axes } = view;
  const lead = result.lead.variant;
  const familyName = result.family.family.name;
  const rows = result.top.slice(0, CARD_ROWS);
  const people = result.figures.slice(0, 3);
  const holders: ({ kind: 'party'; party: Party } | { kind: 'state'; state: State })[] = [
    ...result.parties.map((party) => ({ kind: 'party' as const, party })),
    ...result.states.map((state) => ({ kind: 'state' as const, state })),
  ].slice(0, HOLDERS);
  const { close, runnerUp, centre, loose, insufficient } = result.verdict;
  const rubric = insufficient
    ? 'TẠM GẦN NHẤT'
    : centre
      ? 'ĐỨNG GẦN GIỮA · GẦN NHẤT'
      : loose
        ? 'CHƯA KHỚP RÕ · GẦN NHẤT'
        : 'HƯỚNG GẦN BẠN NHẤT';
  // Borrowed when the lead has none of its own: then they are its nearest kin's (results.ts).
  const kinds = new Set(holders.map((item) => item.kind));
  const holdersTitle =
    kinds.size !== 1
      ? 'ĐẢNG PHÁI VÀ NHÀ NƯỚC'
      : kinds.has('party')
        ? result.borrowedParties
          ? 'ĐẢNG PHÁI CÙNG HỌ'
          : 'ĐẢNG PHÁI ĐÃ ĐI THEO'
        : result.borrowedStates
          ? 'NHÀ NƯỚC CÙNG HỌ'
          : 'NHÀ NƯỚC ĐÃ ĐI THEO';
  const holderNames = holders
    .map((item) => (item.kind === 'party' ? item.party.name : item.state.name))
    .join('');
  const variantOf = (figure: Figure) => view.variants.get(figure.variant);
  // The canvas sets only faces the page has already fetched; ask for each, with its own letters.
  await Promise.all(
    [
      [`500 40px ${BRAND}`, 'The Cochinchine Pensées'],
      [
        `500 66px ${TEXT}`,
        lead.name +
          rows.map((item) => item.variant.name).join('') +
          people.map((item) => item.figure.name).join('') +
          holderNames,
      ],
      [`italic 400 26px ${TEXT}`, `${lead.en} ${lead.period} Chưa đảng phái hay nhà nước nào`],
      [
        `600 18px ${SANS}`,
        `LA BÀN TƯ TƯỞNG ${rubric} NĂM HƯỚNG GẦN NHẤT MƯỜI HAI TRỤC BẠN TRONG KHỐI NGƯỜI NGHĨ GẦN BẠN ${holdersTitle} QUÉT MÃ ĐỂ MỞ KẾT QUẢ NÀY LÀM BÀI CỦA BẠN ĐỘ KHỚP MỨC TIN CẬY CAO KHÁ VỪA THẤP KẾT LUẬN SÁT NÚT GẦN XA HƠN ${familyName.toUpperCase()} ${people.map((item) => variantOf(item.figure)?.name ?? '').join(' ')} ${DIMENSIONS.map((d) => d.name).join(' ')} 0123456789%·`.toLocaleUpperCase(
          'vi',
        ),
      ],
      [
        `400 20px ${SANS}`,
        `${ADDRESS} Sát nút ${axes.map((axis) => axis.name + axis.poles.join('')).join('')} ${DIMENSIONS.map((d) => d.poles.join('')).join('')} Hơi nghiêng Nghiêng rõ Nghiêng mạnh Cân bằng Phân hoá`,
      ],
    ].map(([font, text]) => document.fonts.load(font, text).catch(() => [])),
  );
  const [leadSeal, rowSeals, faces, arts] = await Promise.all([
    seal(glyphs, lead.id, lead.family, 176),
    Promise.all(rows.map((item) => seal(glyphs, item.variant.id, item.variant.family, 50))),
    Promise.all(
      people.map((item) => {
        // The largest file: each print is drawn at twice its width in the picture.
        const picture = view.portraits[item.figure.id];
        return picture ? photograph(`/quiz/portraits/${picture.src.at(-1)?.[0]}`) : null;
      }),
    ),
    Promise.all(
      holders.map((item) => {
        if (item.kind === 'party') return drawing(emblemGlyph(item.party.emblem), 56, 56);
        const spec = item.state.flag ? view.catalogue.flags[item.state.flag] : undefined;
        return drawing(item.state.seal || !spec ? sealGlyph() : flagGlyph(spec), 60, 40);
      }),
    ),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext('2d') as Context;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, W, H);
  context.textBaseline = 'alphabetic';

  // The field: the lead's light high on the left, the next families across and below.
  const families: string[] = [];
  for (const item of result.top)
    if (!families.includes(item.variant.family)) families.push(item.variant.family);
  const spots: [number, number, number, number][] = [
    [0.2 * W, 0.12 * H, 640, 1],
    [0.9 * W, 0.34 * H, 580, 0.8],
    [0.14 * W, 0.62 * H, 580, 0.62],
    [0.88 * W, 0.86 * H, 540, 0.5],
  ];
  families.slice(0, spots.length).forEach((family, i) => {
    const [x, y, r, strength] = spots[i];
    pool(context, x, y, r, inks(glyphs, family).pigment, strength);
  });

  // The masthead, on the field.
  plain(context, `500 40px ${BRAND}`);
  context.fillStyle = INK;
  context.textAlign = 'left';
  context.fillText('The Cochinchine Pensées', M + 6, M + 40);
  caps(context, 18);
  context.fillStyle = MUTED;
  context.textAlign = 'right';
  context.fillText('LA BÀN TƯ TƯỞNG', W - M - 6, M + 36);

  // ---------- the verdict ----------
  const color = inks(glyphs, lead.family);
  const verdict: Box = { x: M, y: M + 72, w: W - 2 * M, h: 372 };
  glass(context, verdict, color.wash(0.8));
  const pad = 44;
  context.drawImage(leadSeal, verdict.x + pad, verdict.y + pad + 6, 176, 176);
  const textX = verdict.x + pad + 176 + 40;
  const measure = verdict.x + verdict.w - pad - textX;
  let y = verdict.y + pad + 22;
  caps(context, 18);
  context.textAlign = 'left';
  context.fillStyle = MUTED;
  const rubricLead = `${rubric} · `;
  context.fillText(rubricLead, textX, y);
  context.fillStyle = color.text;
  context.fillText(
    familyName.toLocaleUpperCase('vi'),
    textX + context.measureText(rubricLead).width,
    y,
    measure - context.measureText(rubricLead).width,
  );
  // Its fit and how sure the quiz is, at the foot of the tile, under a rule.
  const foot = verdict.y + verdict.h - pad;
  // The name as large as it can be while it, and the English under it, stay above that rule:
  // a name of two lines is set smaller than one of one.
  const block = (name: ReturnType<typeof fit>, english: ReturnType<typeof fit>) =>
    Math.round(name.size * 1.16) +
    (name.lines.length - 1) * name.size * 1.04 +
    42 +
    (english.lines.length - 1) * english.size * 1.25;
  const titled = (largest: number) => {
    const name = fit(
      context,
      lead.name,
      (size) => `500 ${size}px ${TEXT}`,
      measure,
      [largest, 40],
      2,
    );
    const english = fit(
      context,
      `${lead.en} · ${lead.period}`,
      (size) => `italic 400 ${size}px ${TEXT}`,
      measure,
      [26, 20],
      2,
    );
    return { name, english };
  };
  let largest = 66;
  let { name, english } = titled(largest);
  while (y + block(name, english) > foot - 92 - 24 && largest > 40) {
    largest -= 2;
    ({ name, english } = titled(largest));
  }
  plain(context, `500 ${name.size}px ${TEXT}`);
  context.fillStyle = INK;
  y += Math.round(name.size * 1.16);
  for (const [i, line] of name.lines.entries())
    context.fillText(line, textX, y + i * name.size * 1.04);
  y += (name.lines.length - 1) * name.size * 1.04 + 42;
  plain(context, `italic 400 ${english.size}px ${TEXT}`);
  context.fillStyle = MUTED;
  for (const [i, line] of english.lines.entries())
    context.fillText(line, textX, y + i * english.size * 1.25);
  y += (english.lines.length - 1) * english.size * 1.25;
  // The summary, in as many lines as the room above the figures allows.
  plain(context, `400 21px ${SANS}`);
  context.fillStyle = INK;
  const room = Math.min(3, Math.floor((foot - 92 - 22 - (y + 14)) / 30));
  const summary = setLines(context, lead.summary, measure);
  if (room > 0 && summary.length) {
    const shown = summary.slice(0, room);
    if (summary.length > room) {
      let last = shown[room - 1];
      while (last.includes(' ') && context.measureText(`${last}…`).width > measure)
        last = last.slice(0, last.lastIndexOf(' '));
      shown[room - 1] = `${last.replace(/[,;:]$/, '')}…`;
    }
    for (const [i, line] of shown.entries()) context.fillText(line, textX, y + 44 + i * 30);
  }
  context.fillStyle = 'oklch(0.215 0.032 278 / 0.14)';
  context.fillRect(textX, foot - 92, measure, 1.5);
  // The fit as a ring, as the page draws it, the number in its middle; beside it,
  // how sure the quiz is, in capitals.
  const ring = { x: textX + 40, y: foot - 40, r: 36 };
  const share = Math.max(0, Math.min(100, result.lead.fit)) / 100;
  context.save();
  context.lineWidth = 11;
  context.lineCap = 'round';
  context.strokeStyle = color.pigment(0.18);
  context.beginPath();
  context.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
  context.stroke();
  if (share > 0) {
    context.strokeStyle = color.pigment();
    context.beginPath();
    context.arc(ring.x, ring.y, ring.r, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
    context.stroke();
  }
  context.restore();
  plain(context, `650 22px ${SANS}`);
  context.fillStyle = color.text;
  context.textAlign = 'center';
  context.fillText(percent(share), ring.x, ring.y + 8);
  context.textAlign = 'left';
  const notesX = ring.x + ring.r + 28;
  caps(context, 15);
  context.fillStyle = MUTED;
  context.fillText('ĐỘ KHỚP', notesX, foot - 48);
  const sure = [
    ['MỨC TIN CẬY ', MUTED],
    [confidence(result.lead).toLocaleUpperCase('vi'), INK],
    [` · ${sureness(result.lead)}`, MUTED],
  ];
  let sureX = notesX;
  for (const [text, fill] of sure) {
    context.fillStyle = fill;
    context.fillText(text, sureX, foot - 20);
    sureX += context.measureText(text).width;
  }
  if (close && runnerUp) {
    plain(context, `400 19px ${SANS}`);
    context.fillStyle = MUTED;
    const lines = setLines(
      context,
      `Sát nút với ${runnerUp.variant.name}, độ khớp ${percent(runnerUp.fit / 100)}.`,
      measure - 420,
    );
    for (const [i, line] of lines.slice(0, 3).entries())
      context.fillText(line, textX + 420, foot - 62 + i * 25);
  }

  const inner = 34;
  const half = 486;
  const glassFill = 'oklch(0.982 0.004 95 / 0.72)';

  // ---------- the five nearest, and the cube beside them ----------
  const rowA = verdict.y + verdict.h + GAP;
  const left: Box = { x: M, y: rowA, w: half, h: 460 };
  const right: Box = { x: M + half + GAP, y: rowA, w: W - 2 * M - half - GAP, h: 460 };
  glass(context, left, glassFill);
  glass(context, right, glassFill);

  kicker(context, 'NĂM HƯỚNG GẦN NHẤT', left, inner);
  const top = left.y + inner + 44;
  const step = (left.y + left.h - inner - top) / rows.length;
  const nameX = left.x + inner + 50 + 18;
  const nameW = left.x + left.w - inner - nameX;
  for (const [i, item] of rows.entries()) {
    const row = top + i * step;
    const ink = inks(glyphs, item.variant.family);
    context.drawImage(rowSeals[i], left.x + inner, row + 4, 50, 50);
    // The largest size at which the name takes one line, cut short only below the smallest.
    fit(context, item.variant.name, (size) => `500 ${size}px ${TEXT}`, nameW - 70, [26, 21], 1);
    context.fillStyle = INK;
    context.textAlign = 'left';
    context.fillText(clipped(context, item.variant.name, nameW - 70), nameX, row + 24);
    // How the variant stands behind the lead, in words, as the page says it: no second percent.
    const place = standing(item, result.lead);
    caps(context, 13);
    context.fillStyle = place.share >= 0.5 ? INK : MUTED;
    context.textAlign = 'right';
    context.fillText(place.words.toLocaleUpperCase('vi'), left.x + left.w - inner, row + 24);
    caps(context, 13);
    context.textAlign = 'left';
    context.fillStyle = ink.text;
    const family = result.families.find((entry) => entry.family.id === item.variant.family);
    context.fillText((family?.family.name ?? '').toLocaleUpperCase('vi'), nameX, row + 46, nameW);
    context.fillStyle = TRACK;
    context.beginPath();
    context.roundRect(nameX, row + 56, nameW, 6, 3);
    context.fill();
    context.fillStyle = ink.pigment();
    context.beginPath();
    context.roundRect(nameX, row + 56, Math.max(6, nameW * place.share), 6, 3);
    context.fill();
  }

  // The cube as the page first turns it: every variant a dot in its family's colour, the
  // nearest the darker; the five nearest as numbered seals; the player with a needle from
  // the centre and a line down to the floor. Under it, the player's place on each dimension.
  kicker(context, 'BẠN TRONG KHỐI', right, inner);
  const legendH = DIMENSIONS.length * 26;
  const cubeTop = right.y + inner + 34;
  const cubeH = right.y + right.h - inner - legendH - 12 - cubeTop;
  const k = cubeH / SKETCH[3];
  const cubeW = SKETCH[2] * k;
  const ox = right.x + (right.w - cubeW) / 2 - SKETCH[0] * k;
  const oy = cubeTop - SKETCH[1] * k;
  const lines = frame(VIEWS.free);
  context.save();
  context.translate(ox, oy);
  context.scale(k, k);
  context.lineWidth = 1 / k;
  context.fillStyle = 'oklch(0.215 0.032 278 / 0.05)';
  context.fill(new Path2D(lines.floor));
  context.setLineDash([2 / k, 3 / k]);
  context.strokeStyle = 'oklch(0.215 0.032 278 / 0.22)';
  context.stroke(new Path2D(lines.back));
  context.setLineDash([1 / k, 3 / k]);
  context.strokeStyle = 'oklch(0.215 0.032 278 / 0.16)';
  context.stroke(new Path2D(lines.axes));
  context.setLineDash([]);
  const place3 = (v: number) => unit(compass(model.axes.map((_, a) => position(model, v, a))));
  const nearest = new Set(rows.map((item) => item.variant.id));
  const count = result.matches.length;
  for (const [rank, item] of [...result.matches.entries()].reverse()) {
    if (nearest.has(item.variant.id)) continue;
    const v = model.variantIndex.get(item.variant.id);
    if (v === undefined) continue;
    const p = project(place3(v), VIEWS.free);
    const near = (1 - rank / count) ** 2;
    context.fillStyle = inks(glyphs, item.variant.family).pigment(0.18 + 0.7 * near);
    context.beginPath();
    context.arc(p.x, p.y, 2.6 * p.scale, 0, Math.PI * 2);
    context.fill();
  }
  // The player.
  const you = unit(result.point);
  const youAt = project(you, VIEWS.free);
  const ground = project([you[0], -1, you[2]], VIEWS.free);
  const middle = project([0, 0, 0], VIEWS.free);
  context.strokeStyle = 'oklch(0.215 0.032 278 / 0.45)';
  context.setLineDash([2 / k, 2 / k]);
  context.beginPath();
  context.moveTo(youAt.x, youAt.y);
  context.lineTo(ground.x, ground.y);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = 'oklch(0.215 0.032 278 / 0.28)';
  context.beginPath();
  context.ellipse(ground.x, ground.y, 5, 2.4, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'oklch(0.215 0.032 278 / 0.55)';
  context.lineWidth = 1.4 / k;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(middle.x, middle.y);
  context.lineTo(youAt.x, youAt.y);
  context.stroke();
  // The five nearest, those nearer the reader over those behind.
  const seals = rows
    .map((item, i) => {
      const v = model.variantIndex.get(item.variant.id) ?? 0;
      return { item, rank: i + 1, p: project(place3(v), VIEWS.free) };
    })
    .sort((a, b) => a.p.depth - b.p.depth);
  for (const { item, rank, p } of seals) {
    const ink = inks(glyphs, item.variant.family);
    context.fillStyle = ink.paper;
    context.strokeStyle = ink.ink;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(p.x, p.y, 10.5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    plain(context, `600 11.5px ${SANS}`);
    context.fillStyle = ink.ink;
    context.textAlign = 'center';
    context.fillText(String(rank), p.x, p.y + 4);
  }
  context.fillStyle = 'oklch(0.982 0.004 95 / 0.6)';
  context.strokeStyle = INK;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(youAt.x, youAt.y, 9, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = INK;
  context.beginPath();
  context.arc(youAt.x, youAt.y, 5, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 1 / k;
  context.strokeStyle = 'oklch(0.215 0.032 278 / 0.42)';
  context.stroke(new Path2D(lines.front));
  context.restore();
  // Where the player stands on each of the cube's three dimensions.
  DIMENSIONS.forEach((dimension, d) => {
    const row = right.y + right.h - inner - legendH + d * 26 + 18;
    caps(context, 13);
    context.textAlign = 'left';
    context.fillStyle = MUTED;
    context.fillText(dimension.name.toLocaleUpperCase('vi'), right.x + inner, row);
    plain(context, `500 17px ${SANS}`);
    context.fillStyle = INK;
    context.textAlign = 'right';
    context.fillText(
      dimensionTag(dimension, result.point[d]),
      right.x + right.w - inner,
      row,
      right.w - 2 * inner - 110,
    );
  });

  // ---------- the twelve axes, in two columns ----------
  const rowB = rowA + left.h + GAP;
  const wide: Box = { x: M, y: rowB, w: W - 2 * M, h: 312 };
  glass(context, wide, glassFill);
  kicker(context, 'MƯỜI HAI TRỤC', wide, inner);
  const columns = 2;
  const perColumn = Math.ceil(axes.length / columns);
  const columnGap = 48;
  const trackW = (wide.w - 2 * inner - columnGap * (columns - 1)) / columns;
  const axisTop = wide.y + inner + 40;
  const axisStep = (wide.y + wide.h - inner - axisTop) / perColumn;
  axes.forEach((axis, a) => {
    const trackX = wide.x + inner + Math.floor(a / perColumn) * (trackW + columnGap);
    const row = axisTop + (a % perColumn) * axisStep;
    const value = result.scores[a] ?? 50;
    plain(context, `600 16px ${SANS}`);
    context.fillStyle = INK;
    context.textAlign = 'left';
    context.fillText(axis.name, trackX, row + 14);
    plain(context, `400 15px ${SANS}`);
    context.fillStyle = MUTED;
    context.textAlign = 'right';
    context.fillText(
      leanTag(axis, value, result.divided[a]),
      trackX + trackW,
      row + 14,
      trackW - 120,
    );
    context.fillStyle = TRACK;
    context.fillRect(trackX, row + 23, trackW, 4);
    context.fillStyle = 'oklch(0.215 0.032 278 / 0.35)';
    context.fillRect(trackX + trackW / 2 - 0.75, row + 19, 1.5, 12);
    const from = trackX + trackW / 2;
    const to = trackX + (trackW * value) / 100;
    context.fillStyle = color.pigment();
    context.fillRect(Math.min(from, to), row + 23, Math.max(2, Math.abs(to - from)), 4);
  });

  // ---------- the people nearest, and the parties that followed the lead ----------
  const rowC = rowB + wide.h + GAP;
  const peopleBox: Box = { x: M, y: rowC, w: half, h: 330 };
  const holdersBox: Box = { x: M + half + GAP, y: rowC, w: W - 2 * M - half - GAP, h: 330 };
  glass(context, peopleBox, glassFill);
  glass(context, holdersBox, glassFill);

  kicker(context, 'NGƯỜI NGHĨ GẦN BẠN', peopleBox, inner);
  // The three side by side as one strip of prints, a hairline of paper between them and the
  // strip's own corners rounded, so they read as one company rather than three cards.
  const personGap = 4;
  const personW = (peopleBox.w - 2 * inner - personGap * 2) / 3;
  const faceW = Math.floor(personW);
  const faceH = Math.round(faceW * 1.2);
  const corner = 10;
  people.forEach((item, i) => {
    const x = Math.round(peopleBox.x + inner + i * (personW + personGap));
    const faceY = peopleBox.y + inner + 36;
    const variant = variantOf(item.figure);
    const ink = inks(glyphs, variant?.family ?? '');
    const face = faces[i];
    const first = i === 0;
    const last = i === people.length - 1;
    const radii = [first ? corner : 0, last ? corner : 0, last ? corner : 0, first ? corner : 0];
    context.save();
    context.beginPath();
    context.roundRect(x, faceY, faceW, faceH, radii);
    context.clip();
    if (face)
      context.drawImage(
        printed(face, faceW * 2, faceH * 2, ink.ink, ink.paper),
        x,
        faceY,
        faceW,
        faceH,
      );
    else {
      context.fillStyle = ink.paper;
      context.fillRect(x, faceY, faceW, faceH);
      const words = item.figure.name.split(/\s+/).filter(Boolean);
      const letters = `${words[0]?.[0] ?? ''}${words.length > 1 ? (words.at(-1)?.[0] ?? '') : ''}`;
      plain(context, `500 40px ${TEXT}`);
      context.fillStyle = ink.ink;
      context.textAlign = 'center';
      context.fillText(letters.toLocaleUpperCase('vi'), x + faceW / 2, faceY + faceH / 2 + 14);
    }
    context.restore();
    context.strokeStyle = 'oklch(0 0 0 / 0.07)';
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x + 0.5, faceY + 0.5, faceW - 1, faceH - 1, radii);
    context.stroke();
    // The words under each print keep a little short of the next, which stands so close.
    const measure = faceW - 14;
    const named = fit(
      context,
      item.figure.name,
      (size) => `500 ${size}px ${TEXT}`,
      measure,
      [19, 15],
      2,
    );
    context.fillStyle = INK;
    context.textAlign = 'left';
    const nameY = faceY + faceH + 26;
    for (const [l, line] of named.lines.entries())
      context.fillText(line, x, nameY + l * named.size * 1.15);
    caps(context, 11);
    context.fillStyle = ink.text;
    context.fillText(
      clipped(context, (variant?.name ?? '').toLocaleUpperCase('vi'), measure),
      x,
      nameY + (named.lines.length - 1) * named.size * 1.15 + 22,
    );
  });

  kicker(context, holdersTitle, holdersBox, inner);
  if (!holders.length) {
    plain(context, `italic 400 21px ${TEXT}`);
    context.fillStyle = MUTED;
    context.textAlign = 'left';
    const lines = setLines(
      context,
      `Chưa đảng phái hay nhà nước nào theo trọn ${lead.name}: nó sống trong sách vở và phong trào nhiều hơn trong chính quyền.`,
      holdersBox.w - 2 * inner,
    );
    for (const [l, line] of lines.slice(0, 5).entries())
      context.fillText(line, holdersBox.x + inner, holdersBox.y + inner + 70 + l * 30);
  }
  const holderStep = (holdersBox.h - 2 * inner - 40) / HOLDERS;
  holders.forEach((item, i) => {
    const row = holdersBox.y + inner + 40 + i * holderStep;
    const art = arts[i];
    const artX = holdersBox.x + inner;
    if (item.kind === 'party') context.drawImage(art, artX, row + 4, 56, 56);
    else context.drawImage(art, artX - 2, row + 12, 60, 40);
    const textLeft = artX + 56 + 18;
    const textW = holdersBox.x + holdersBox.w - inner - textLeft;
    const label = item.kind === 'party' ? item.party.name : item.state.name;
    plain(context, `500 20px ${TEXT}`);
    context.fillStyle = INK;
    context.textAlign = 'left';
    context.fillText(clipped(context, label, textW), textLeft, row + 28);
    const meta =
      item.kind === 'party'
        ? [item.party.abbr, item.party.country, item.party.period].filter(Boolean).join(' · ')
        : item.state.period;
    caps(context, 12);
    context.fillStyle = MUTED;
    context.fillText(clipped(context, meta.toLocaleUpperCase('vi'), textW), textLeft, row + 50);
  });

  // ---------- where to take it, and the code that opens this result ----------
  // One size whatever the link's length: a module is CODE over the modules and the quiet
  // zone, its edges rounded to whole pixels so no seam or blur runs between dark modules.
  const qr = encode(url, { ecc: 'L', border: 0 });
  const quiet = 2;
  const module = CODE / (qr.size + 2 * quiet);
  const codeX = W - M - CODE;
  const codeY = H - M - CODE;
  const edge = (from: number, i: number) => Math.round(from + (i + quiet) * module);
  context.save();
  context.shadowColor = 'oklch(0.32 0.03 278 / 0.14)';
  context.shadowBlur = 22;
  context.shadowOffsetY = 8;
  context.fillStyle = '#fff';
  context.beginPath();
  context.roundRect(codeX, codeY, CODE, CODE, 12);
  context.fill();
  context.restore();
  context.fillStyle = INK;
  for (let row = 0; row < qr.size; row++)
    for (let column = 0; column < qr.size; column++)
      if (qr.data[row][column]) {
        const x = edge(codeX, column);
        const y = edge(codeY, row);
        context.fillRect(x, y, edge(codeX, column + 1) - x, edge(codeY, row + 1) - y);
      }

  context.textAlign = 'left';
  caps(context, 15);
  context.fillStyle = MUTED;
  context.fillText('LÀM BÀI CỦA BẠN', M + 6, H - M - 64);
  plain(context, `500 23px ${SANS}`);
  context.fillStyle = INK;
  context.fillText(ADDRESS, M + 6, H - M - 32, codeX - M - 36);
  caps(context, 13);
  context.fillStyle = MUTED;
  context.fillText('QUÉT MÃ ĐỂ MỞ KẾT QUẢ NÀY →', M + 6, H - M);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png'),
  );
}
