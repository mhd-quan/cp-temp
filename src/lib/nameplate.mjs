// Ấn bản: the nameplate as a drawing, from the outlines of Libre Bodoni itself
// (the very file the masthead sets the name in), laid out at build time as
// the browser sets the text: the face's own kerning, -0.02em of tracking,
// line boxes of 1em with the baseline where CSS puts it. Each letter is drawn
// once (<defs>) and placed wherever it is set (<use>). Laid over the name,
// the drawing covers it to the pixel.
//
// The name itself stays text: it is what the page paints first, and what
// search and screen readers read. The drawing is needed once, on a visitor's
// first page, to engrave the name as the page appears: it travels as one
// small module with the engraving itself (nameplateEngrave.js), fetched only
// then (editionHead.js, job 4), never a weight on every page. It brings no
// stylesheet: a stylesheet added to a page restyles the whole of it. What
// the drawing needs is written on it (presentation attributes), and its
// motion is set by script, from the page's own tokens.
//
// Two settings share the letters: on a wide page one line, "The Cochinchine
// Pensées"; on a phone the lockup, "The" small above the name. The lockup's
// proportions are set here and handed to the stylesheet (lockupStyle), so
// text and drawing cannot drift apart. "The" is an article, not a second
// line of the name: two fifths of the name, tracked open as small type must
// be, its T aligned on the curve of the C, its cap height centred on the
// menu button beside it.
//
// Every outline is traced at one pace, as a burin cuts (one dash, as long as
// the longest contour), so a short contour closes first.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from 'esbuild';
import * as fontkit from 'fontkit';

const FONT = join(
  process.cwd(),
  'src/assets/fonts/libre-bodoni/libre-bodoni-latin-500-normal.woff2',
);
const ENGRAVE = join(process.cwd(), 'src/lib/nameplateEngrave.js');
const UNITS = 1000;
/** The name's tracking, as .wordmark sets it: -0.02em. */
const TRACK = -20;
/** "The" in the lockup: its size as a share of the name, and its tracking in its own em. */
export const THE = 0.4;
const THE_TRACK = 40;
/** The hairline that traces each outline, in thousandths of the name: near
 * a pixel on a wide page, and on a phone, where the name is set smaller. */
const HAIRLINE = { line: 8, lockup: 22 };
/** Clear space from the baseline of "The" to the top of the capitals below it. */
const THE_GAP = 200;
/** Where the cap height of "The" is centred, from the top of the lockup (the
 * menu button's centre in the masthead's first row, in ems of the name). */
const THE_CENTRE = 211;

let cached;

const round = (value) => Math.round(value);

/** A glyph's outline as compact relative path data, y pointing down. */
function outline(path) {
  let d = '';
  let x = 0;
  let y = 0;
  let start = [0, 0];
  let last = '';
  const emit = (command, values) => {
    const numbers = values
      .map(round)
      .map((value, index) => (index === 0 || value < 0 ? `${value}` : ` ${value}`))
      .join('');
    if (command === last) d += numbers.startsWith('-') ? numbers : ` ${numbers}`;
    else d += command + numbers;
    last = command === 'm' ? 'l' : command;
  };
  for (const { command, args } of path.commands) {
    const points = [];
    for (let index = 0; index < args.length; index += 2)
      points.push([args[index], -args[index + 1]]);
    const end = points.at(-1);
    if (command === 'closePath') {
      // A closed contour returns the pen to where it began.
      d += 'z';
      last = 'z';
      [x, y] = start;
      continue;
    }
    const letter = { moveTo: 'm', lineTo: 'l', quadraticCurveTo: 'q', bezierCurveTo: 'c' }[command];
    emit(
      letter,
      points.flatMap(([px, py]) => [round(px) - round(x), round(py) - round(y)]),
    );
    [x, y] = [round(end[0]), round(end[1])];
    if (command === 'moveTo') start = [x, y];
  }
  return d;
}

/** The length of the longest contour, found by walking each curve in short steps. */
function longestContour(path) {
  let longest = 0;
  let length = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const walk = (at) => {
    let [px, py] = [x, y];
    for (let step = 1; step <= 16; step++) {
      const [nx, ny] = at(step / 16);
      length += Math.hypot(nx - px, ny - py);
      [px, py] = [nx, ny];
    }
  };
  for (const { command, args } of path.commands) {
    if (command === 'moveTo') {
      longest = Math.max(longest, length);
      length = 0;
      [x, y] = args;
      [startX, startY] = args;
    } else if (command === 'lineTo') {
      length += Math.hypot(args[0] - x, args[1] - y);
      [x, y] = args;
    } else if (command === 'quadraticCurveTo') {
      const [cx, cy, ex, ey] = args;
      walk((t) => [
        (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t ** 2 * ex,
        (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t ** 2 * ey,
      ]);
      [x, y] = [ex, ey];
    } else if (command === 'bezierCurveTo') {
      const [c1x, c1y, c2x, c2y, ex, ey] = args;
      walk((t) => [
        (1 - t) ** 3 * x + 3 * (1 - t) ** 2 * t * c1x + 3 * (1 - t) * t ** 2 * c2x + t ** 3 * ex,
        (1 - t) ** 3 * y + 3 * (1 - t) ** 2 * t * c1y + 3 * (1 - t) * t ** 2 * c2y + t ** 3 * ey,
      ]);
      [x, y] = [ex, ey];
    } else if (command === 'closePath') {
      length += Math.hypot(startX - x, startY - y);
      [x, y] = [startX, startY];
    }
  }
  return Math.ceil(Math.max(longest, length));
}

/** Letters as the browser sets them: kerned, tracked, and where each begins. */
function set(font, text, track) {
  const run = font.layout(text);
  let x = 0;
  const letters = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const letter = { glyph, x: x + position.xOffset };
    x += position.xAdvance + track;
    return letter;
  });
  return { letters: letters.filter(({ glyph }) => glyph.path.commands.length), width: x };
}

/** The nameplate's letters and its two settings, computed once per build. */
export function nameplate() {
  if (cached) return cached;
  const font = fontkit.create(readFileSync(FONT));
  const used = new Map();
  let longest = 0;
  const place = ({ glyph, x }, y) => {
    if (!used.has(glyph.id)) {
      used.set(glyph.id, { id: `np${glyph.id}`, d: outline(glyph.path) });
      longest = Math.max(longest, longestContour(glyph.path));
    }
    const at = [round(x) && ` x="${round(x)}"`, y && ` y="${y}"`].filter(Boolean).join('');
    return `<use href="#${used.get(glyph.id).id}"${at}/>`;
  };
  // The line box of 1em, baseline where CSS puts it: half the leading above
  // the ascent (the face's line is 1.25em, so the half-leading is negative).
  const ascent = font.ascent;
  const descent = -font.descent;
  const baseline = ascent - (ascent + descent - UNITS) / 2;

  // Wide pages: one line.
  const line = set(font, 'The Cochinchine Pensées', TRACK);
  const lineWidth = round(line.width);
  const lineBody = line.letters.map((letter) => place(letter, 0)).join('');

  // Phones: the lockup. "The" is set in a line box of its own size.
  const name = set(font, 'Cochinchine Pensées', TRACK);
  const the = set(font, 'The', THE_TRACK);
  const cap = font.capHeight;
  const theBaseline = round(THE_CENTRE + (cap * THE) / 2);
  const theTop = theBaseline - baseline * THE;
  const nameBaseline = theBaseline + THE_GAP + cap;
  const nameTop = nameBaseline - baseline;
  const C = name.letters[0].glyph.bbox.minX;
  const T = the.letters[0].glyph.bbox.minX;
  // The flat T sits a hair inside the round C, which overshoots the margin.
  const theLeft = round(C + 6 - T * THE);
  const theBody = the.letters.map((letter) => place(letter, 0)).join('');
  const nameBody = name.letters.map((letter) => place(letter, round(nameBaseline))).join('');
  const lockupWidth = round(name.width);
  const lockupHeight = round(nameTop + UNITS);

  const em = (units, of = UNITS) => `${+(units / of).toFixed(4)}em`;
  const defs = [...used.values()].map(({ id, d }) => `<path id="${id}" d="${d}"/>`).join('');
  // A setting is the name drawn to lie over the text: laid at the top left of
  // the link, the size of its lines, and naming the baseline its name stands
  // on, in its own units, so it can be laid on the text's
  // (nameplateEngrave.js). "The", drawn at two fifths, draws its hairline
  // in its own units, so it is as fine as the name's.
  const setting = (kind, viewBox, width, height, baseline, hairline, body) =>
    `<span class="nameplate" aria-hidden="true" style="position:absolute;top:0;left:0;pointer-events:none"><svg class="nameplate__${kind}" viewBox="${viewBox}" style="display:block;overflow:visible;width:${width};height:${height}" data-baseline="${baseline}" fill="currentColor" stroke="currentColor" stroke-width="${hairline}" stroke-dasharray="${longest}" focusable="false"><defs>${defs}</defs>${body}</svg></span>`;
  const settings = {
    line: setting(
      'line',
      `0 ${-round(baseline)} ${lineWidth} ${UNITS}`,
      em(lineWidth),
      '1em',
      0,
      HAIRLINE.line,
      lineBody,
    ),
    lockup: setting(
      'lockup',
      `0 0 ${lockupWidth} ${lockupHeight}`,
      em(lockupWidth),
      em(lockupHeight),
      round(nameBaseline),
      HAIRLINE.lockup,
      `<g class="nameplate__the" transform="translate(${theLeft} ${theBaseline}) scale(${THE})" stroke-width="${round(HAIRLINE.lockup / THE)}">${theBody}</g>${nameBody}`,
    ),
  };
  const engraving = transformSync(readFileSync(ENGRAVE, 'utf8'), {
    format: 'esm',
    minify: true,
    target: 'es2022',
  }).code;
  const module = `${engraving}export const settings=${JSON.stringify(settings)};\n`;
  const hash = createHash('sha256').update(module).digest('hex').slice(0, 12);
  const theEm = UNITS * THE;
  cached = {
    module,
    url: `/nameplate/${hash}.js`,
    hash,
    // The two settings themselves, for the launch screens of the app (scripts/app-images.mjs).
    settings,
    // The lockup's text, placed as the drawing is (foundation.css,
    // .wordmark__the): in ems of "The" itself.
    lockupStyle: [
      `--the-size:${THE}em`,
      `--the-track:${em(THE_TRACK)}`,
      `--the-top:${em(theTop, theEm)}`,
      `--the-gap:${em(nameTop - (theTop + theEm), theEm)}`,
      `--the-left:${em(theLeft, theEm)}`,
    ].join(';'),
  };
  return cached;
}
