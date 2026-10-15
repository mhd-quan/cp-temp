export function paragraphId(text) {
  const value = text.normalize('NFC').replace(/\s+/gu, ' ').trim();
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return `p-${(hash >>> 0).toString(36)}`;
}
