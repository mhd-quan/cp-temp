// Ấn bản: fixed instances of the two variable faces every page preloads.
//
// Mona Sans ships two axes (width 75–125, weight 200–900), but the edition
// sets it at one width only (--sans-width: 112%), so its width axis is
// pinned there: the Latin file falls from 98 KB to 40 KB, and the pages set
// exactly the same letters. Libre Bodoni is only ever set at 500 (the
// wordmark and the bar), so its weight axis is pinned: 26 KB to 16 KB. Both
// files are preloaded at the highest priority on every page, where on a
// phone they share the first second of bandwidth with the cover print.
//
// Mona Sans reserves the name "Mona" (SIL OFL 1.1): a modified version may
// not be presented under it, so the instance is renamed Pensees Sans. Its
// copyright, licence, designer and trademark records are kept as delivered.
// Libre Bodoni reserves no name and keeps its own.
//
// Run after updating @fontsource-variable/mona-sans or libre-bodoni:
//   node scripts/instance-fonts.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import fontverter from 'fontverter';
import subsetFont from 'subset-font';

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = path.join(root, 'node_modules/@fontsource-variable');
const fonts = path.join(root, 'src/assets/fonts');
export const SANS_WIDTH = 112;
export const BRAND_WEIGHT = 500;

const jobs = [
  ...['latin', 'vietnamese'].flatMap((subset) =>
    ['normal', 'italic'].map((style) => ({
      source: path.join(modules, `mona-sans/files/mona-sans-${subset}-wdth-${style}.woff2`),
      output: path.join(fonts, `pensees-sans/pensees-sans-${subset}-${style}.woff2`),
      axes: { wdth: SANS_WIDTH },
      rename: style === 'italic' ? 'Italic' : 'Regular',
    })),
  ),
  {
    source: path.join(modules, 'libre-bodoni/files/libre-bodoni-latin-wght-normal.woff2'),
    output: path.join(fonts, 'libre-bodoni/libre-bodoni-latin-500-normal.woff2'),
    axes: { wght: BRAND_WEIGHT },
  },
];

const FAMILY = 'Pensees Sans';
// Records presented as the font's own name; everything else (copyright,
// version, trademark, designer, licence, and the axis and instance names
// from 256 up) is kept as delivered.
const NAMED = new Set([1, 2, 3, 4, 6, 16, 17, 18, 21, 22, 25]);

function tablesOf(font) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  return Array.from({ length: view.getUint16(4) }, (_, index) => {
    const at = 12 + index * 16;
    const offset = view.getUint32(at + 8);
    const length = view.getUint32(at + 12);
    const tag = String.fromCharCode(...font.subarray(at, at + 4));
    return { tag, data: font.subarray(offset, offset + length) };
  });
}

function nameTable(old, style) {
  const view = new DataView(old.buffer, old.byteOffset, old.byteLength);
  const storage = view.getUint16(4);
  const records = [];
  for (let index = 0; index < view.getUint16(2); index++) {
    const at = 6 + index * 12;
    const [platform, encoding, language, id, length, offset] = [0, 2, 4, 6, 8, 10].map((step) =>
      view.getUint16(at + step),
    );
    // Windows Unicode records only: the Macintosh copies repeat them.
    if (platform !== 3 || NAMED.has(id)) continue;
    const bytes = old.subarray(storage + offset, storage + offset + length);
    records.push({ platform, encoding, language, id, bytes });
  }
  const utf16 = (text) => {
    const bytes = new Uint8Array(text.length * 2);
    for (let index = 0; index < text.length; index++) {
      bytes[index * 2] = text.charCodeAt(index) >> 8;
      bytes[index * 2 + 1] = text.charCodeAt(index) & 0xff;
    }
    return bytes;
  };
  const postscript = `${FAMILY.replace(/\s/g, '')}-${style}`;
  const own = {
    1: FAMILY,
    2: style,
    3: `${postscript}; instance of Mona Sans at width ${SANS_WIDTH}`,
    4: style === 'Regular' ? FAMILY : `${FAMILY} ${style}`,
    6: postscript,
    25: FAMILY.replace(/\s/g, ''),
  };
  for (const [id, text] of Object.entries(own))
    records.push({ platform: 3, encoding: 1, language: 0x409, id: Number(id), bytes: utf16(text) });
  records.sort(
    (a, b) =>
      a.platform - b.platform || a.encoding - b.encoding || a.language - b.language || a.id - b.id,
  );
  const header = 6 + records.length * 12;
  const size = header + records.reduce((sum, record) => sum + record.bytes.length, 0);
  const table = new Uint8Array(size);
  const out = new DataView(table.buffer);
  out.setUint16(2, records.length);
  out.setUint16(4, header);
  let offset = 0;
  records.forEach((record, index) => {
    const at = 6 + index * 12;
    [
      record.platform,
      record.encoding,
      record.language,
      record.id,
      record.bytes.length,
      offset,
    ].forEach((value, step) => {
      out.setUint16(at + step * 2, value);
    });
    table.set(record.bytes, header + offset);
    offset += record.bytes.length;
  });
  return table;
}

const checksum = (bytes) => {
  const padded = new Uint8Array(Math.ceil(bytes.length / 4) * 4);
  padded.set(bytes);
  const view = new DataView(padded.buffer);
  let sum = 0;
  for (let at = 0; at < padded.length; at += 4) sum = (sum + view.getUint32(at)) >>> 0;
  return sum;
};

/** A TrueType font with its name table replaced, checksums recomputed. */
function rename(font, style) {
  const tables = tablesOf(font).map((table) =>
    table.tag === 'name' ? { ...table, data: nameTable(table.data, style) } : table,
  );
  const directory = 12 + tables.length * 16;
  let size = directory;
  for (const table of tables) size += Math.ceil(table.data.length / 4) * 4;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  out.set(font.subarray(0, 12));
  let offset = directory;
  let head = -1;
  tables.forEach((table, index) => {
    const at = 12 + index * 16;
    const data = new Uint8Array(table.data);
    if (table.tag === 'head') {
      head = offset;
      new DataView(data.buffer).setUint32(8, 0);
    }
    out.set(new TextEncoder().encode(table.tag), at);
    view.setUint32(at + 4, checksum(data));
    view.setUint32(at + 8, offset);
    view.setUint32(at + 12, data.length);
    out.set(data, offset);
    offset += Math.ceil(data.length / 4) * 4;
  });
  view.setUint32(head + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out;
}

for (const job of jobs) {
  const source = await fs.readFile(job.source);
  const characters = fontkit
    .create(source)
    .characterSet.map((code) => String.fromCodePoint(code))
    .join('');
  let font = await subsetFont(source, characters, {
    targetFormat: 'truetype',
    variationAxes: job.axes,
  });
  if (job.rename) font = rename(new Uint8Array(font), job.rename);
  const woff2 = await fontverter.convert(Buffer.from(font), 'woff2');
  await fs.mkdir(path.dirname(job.output), { recursive: true });
  await fs.writeFile(job.output, woff2);
  console.log(
    `${path.relative(root, job.output)}: ${(source.length / 1024).toFixed(1)} → ${(woff2.length / 1024).toFixed(1)} KB`,
  );
}
