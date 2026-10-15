import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from 'parse5';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const nodes = (node) => [node, ...(node.childNodes ?? []).flatMap(nodes)];
const attr = (node, key) => node.attrs?.find((a) => a.name === key)?.value;
test('every built page is an Ấn bản page: one search sheet, a main landmark, the colophon and the appearance', () => {
  for (const file of readdirSync(new URL('dist/', root), { recursive: true }).filter(
    (f) => f.endsWith('.html') && !f.startsWith('discovery/'),
  )) {
    const tree = nodes(parse(read(`dist/${file}`)));
    assert.equal(
      attr(
        tree.find((n) => n.tagName === 'html'),
        'data-system',
      ),
      'edition',
      file,
    );
    assert.equal(tree.filter((n) => n.tagName === 'main').length, 1, file);
    assert.equal(tree.filter((n) => n.tagName === 'h1').length, 1, file);
    const dialogs = tree.filter((n) => n.tagName === 'dialog');
    assert.equal(dialogs.length, 1, file);
    assert.equal(attr(dialogs[0], 'aria-labelledby'), 'search-sheet-title', file);
    const search = nodes(dialogs[0]);
    assert.ok(
      search.some((n) => n.tagName === 'button' && attr(n, 'aria-label') === 'Đóng tìm kiếm'),
      file,
    );
    assert.ok(
      search.some((n) => n.tagName === 'input' && attr(n, 'type') === 'search'),
      file,
    );
    assert.ok(
      tree.some((n) => n.tagName === 'footer' && attr(n, 'class') === 'colophon'),
      file,
    );
    assert.ok(
      tree.some((n) => n.tagName === 'fieldset' && attr(n, 'class') === 'appearance'),
      file,
    );
  }
});
