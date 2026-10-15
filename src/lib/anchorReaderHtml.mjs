import { parseFragment, serialize } from 'parse5';
import { paragraphId } from './readingAnchors.mjs';
/** Add stable text-based anchors to the rendered MDX, including raw JSX paragraphs. */
export function anchorReaderHtml(html) {
  const document = parseFragment(html),
    seen = new Map();
  const text = (node) =>
    node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
  function visit(node, inNotes = false) {
    const notes =
      inNotes ||
      (node.attrs ?? []).some(
        (a) => a.name === 'class' && a.value.split(/\s+/).includes('footnotes'),
      );
    if (node.tagName === 'p' && !notes && !node.attrs.some((a) => a.name === 'id')) {
      const key = paragraphId(text(node)),
        count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      node.attrs.push({ name: 'id', value: count === 1 ? key : `${key}-${count}` });
    }
    for (const child of node.childNodes ?? []) visit(child, notes);
  }
  visit(document);
  return serialize(document);
}
