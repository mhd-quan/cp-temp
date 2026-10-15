import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { brotliCompressSync } from 'node:zlib';

const home = readFileSync(new URL('../dist/index.html', import.meta.url));
// The door to La bàn Tư tưởng (v1.2) stands on the first page for good: its cube, every
// variant a dot, and its styles add about 10.6 KB raw but 2.4 KB over the wire. The raw
// line moved from 200 to 215 KB with it. The pensées then became a shelf of up to eight
// notes (two views of four), about 1.3 KB raw each: with all eight the page is about 217 KB
// raw and 29.2 KB Brotli, so the raw line is 220 KB; what travels, Brotli, keeps its 30 KB.
test('homepage stays below 220 KB raw and 30 KB Brotli without the full discovery catalog', () => {
  assert.ok(home.length < 220_000, `HTML: ${home.length} bytes`);
  const sent = brotliCompressSync(home).length;
  assert.ok(sent < 30_000, `Brotli: ${sent} bytes`);
  assert.doesNotMatch(home.toString(), /data-home-discovery-payload/);
});
