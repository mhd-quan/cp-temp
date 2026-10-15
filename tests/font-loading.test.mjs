import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('shared publication pages preload their display face and never fetch Bricolage eagerly', async () => {
  const pages = [
    // Ấn bản pages: the brand face for the wordmark, the sans apparatus, and Pliego for titles.
    ...[
      'index.html',
      'books/index.html',
      'search/index.html',
      'essays/index.html',
      'series/index.html',
    ].map((page) => ({
      page,
      count: 4,
      include: [
        'libre-bodoni-latin-500-normal',
        'pensees-sans-latin-normal',
        'pensees-sans-vietnamese-normal',
        'Pliego-Medium',
      ],
    })),
    // The reader adds Pliego's text weight.
    {
      page: 'essays/2026-09-02-hongkong-va-hoang-chi-phong/index.html',
      count: 5,
      include: [
        'libre-bodoni-latin-500-normal',
        'pensees-sans-latin-normal',
        'pensees-sans-vietnamese-normal',
        'Pliego-Regular',
        'Pliego-Medium',
      ],
    },
  ];
  for (const { page, count, include } of pages) {
    const html = await readFile(new URL(`dist/${page}`, root), 'utf8');
    const preloads = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => tag.includes('as="font"'));
    assert.equal(preloads.length, count, page);
    const preloadMarkup = preloads.join('\n');
    for (const familyStyle of include) assert.match(preloadMarkup, new RegExp(familyStyle), page);
    assert.doesNotMatch(preloadMarkup, /bricolage-grotesque/, page);
    for (const tag of preloads) {
      assert.match(tag, /crossorigin/);
      const href = tag.match(/href="([^"]+)"/)[1];
      assert.ok(html.includes(`url(${href})`) || html.includes(`url("${href}")`), href);
      assert.ok((await readFile(new URL(`dist${href}`, root))).length > 0, href);
    }
  }
});

test('the sans and the brand face are fixed where the edition never varies them', async () => {
  // v1.1.1: Mona Sans is only set at 112% wide, Libre Bodoni only at 500.
  const css = await readFile(new URL('src/styles/edition/fonts.css', root), 'utf8');
  const foundation = await readFile(new URL('src/styles/edition/foundation.css', root), 'utf8');
  assert.doesNotMatch(css, /mona-sans|Mona Sans Variable/);
  assert.equal(
    [...css.matchAll(/font-family: 'Pensees Sans';[^}]*font-stretch: 112%;/g)].length,
    4,
  );
  assert.match(foundation, /--sans-width: 112%;/);
  assert.match(
    css,
    /libre-bodoni-latin-500-normal\.woff2'\) format\('woff2'\);\s*font-weight: 500;/,
  );
  // Every face set in the brand stack is set at 500.
  for (const [, weight] of foundation.matchAll(/font: (\d+) [^;]*var\(--font-brand\)/g))
    assert.equal(weight, '500');
  // Fallback stacks name only faces that can stand in: every other name is a
  // system lookup in the middle of the first layout.
  assert.match(foundation, /--font-sans: 'Pensees Sans', system-ui, sans-serif;/);
  assert.match(foundation, /--font-text: Pliego, 'Pliego fallback', serif;/);
  const sizes = {
    'pensees-sans/pensees-sans-latin-normal.woff2': 45_000,
    'pensees-sans/pensees-sans-vietnamese-normal.woff2': 8_000,
    'libre-bodoni/libre-bodoni-latin-500-normal.woff2': 17_000,
  };
  for (const [file, budget] of Object.entries(sizes)) {
    const { length } = await readFile(new URL(`src/assets/fonts/${file}`, root));
    assert.ok(length < budget, `${file}: ${length}`);
  }
});
