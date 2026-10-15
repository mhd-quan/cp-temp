import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { anchorReaderHtml } from '../src/lib/anchorReaderHtml.mjs';
import { paragraphId } from '../src/lib/readingAnchors.mjs';

test('paragraph links survive normalization and insertions, with unique duplicate anchors', () => {
  const text = 'Những điều còn ở lại.';
  assert.equal(paragraphId(text), paragraphId(text.normalize('NFD')));
  assert.equal(paragraphId(text), paragraphId('Những  điều\n còn ở lại.'));
  const result = anchorReaderHtml(
    `<p>Một đoạn trước.</p><p>${text}</p><p>${text}</p><section class="footnotes"><p>${text}</p></section>`,
  );
  assert.ok(result.includes(`<p id="${paragraphId(text)}">`));
  assert.ok(result.includes(`<p id="${paragraphId(text)}-2">`));
  assert.ok(result.includes('<section class="footnotes"><p>'));
});
test('all built readers expose unique paragraph anchors and real footnote destinations', () => {
  const dir = new URL('../dist/essays/', import.meta.url);
  for (const folder of fs.readdirSync(dir)) {
    const file = new URL(`${folder}/index.html`, dir);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('reader-essay')) continue;
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, folder);
    assert.ok(
      ids.some((id) => id.startsWith('p-')),
      folder,
    );
    for (const [, id] of html.matchAll(/href="#(fn-[^"]+)"/g))
      assert.ok(ids.includes(id), folder + ': ' + id);
  }
});
test('all 58 imported essays match the audited main commit byte for byte', () => {
  const root = new URL('../', import.meta.url),
    report = JSON.parse(fs.readFileSync(new URL('docs/MAIN-CONTENT-SYNC.json', root)));
  assert.equal(report.essayCount, 58);
  for (const entry of report.essays) {
    const hash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(new URL(entry.path, root)))
      .digest('hex');
    assert.equal(hash, entry.sha256, entry.path);
  }
});
