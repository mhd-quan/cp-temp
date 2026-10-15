// Ấn bản: pages fetched on intent. A link the hand has come to rest on for a
// moment, or that is focused from the keyboard, is fetched before it is
// opened; one that is pressed is fetched at once. An essay is prerendered
// (its cover decoded and its scripts run, so the page turn only has to
// animate); any other page is prefetched.
//
// This replaces the browser's own "moderate" speculation and Astro's hover
// prefetch, which both answered any hover, including a link that had only
// slid under a resting mouse as the page scrolled: a reading scroll on a
// desktop prerendered essays no one had pointed at, and their covers took
// the bandwidth of the prints the reader was scrolling towards. Here a hover
// counts only once the hand has moved (see editionHand.ts). A press always
// counts, and on a phone a press is the only intent there is.

import { handRests } from './editionHand';

// The browser's "moderate" delay for a prerender; Astro's for a prefetch.
const PRERENDER_AFTER = 200;
const PREFETCH_AFTER = 80;
// As the browser does for moderate speculation: the two most recent essays
// stay prerendered, the oldest gives way.
const PRERENDERS = 2;

const rules = HTMLScriptElement.supports?.('speculationrules') ?? false;
const linkPrefetch = document.createElement('link').relList?.supports?.('prefetch') ?? false;
const fetched = new Set<string>();
const ahead = new Set<string>();
const prerendered: { key: string; rule: HTMLScriptElement }[] = [];

const slow = () => {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return Boolean(connection?.saveData || /2g/.test(connection?.effectiveType ?? ''));
};

/** A same-site page other than this one, and not a file to download. */
function target(anchor: HTMLAnchorElement | null) {
  if (!anchor?.href || anchor.hasAttribute('download') || anchor.target === '_blank') return;
  if (anchor.dataset.astroPrefetch === 'false' || /\bexternal\b/.test(anchor.rel)) return;
  const url = new URL(anchor.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.search === location.search) return;
  return url;
}

function speculate(url: URL) {
  const key = url.pathname + url.search;
  if (fetched.has(key)) return;
  fetched.add(key);
  const essay = url.pathname.startsWith('/essays/');
  if (rules) {
    const rule = document.createElement('script');
    rule.type = 'speculationrules';
    rule.textContent = JSON.stringify({
      [essay ? 'prerender' : 'prefetch']: [{ source: 'list', urls: [key] }],
    });
    document.head.append(rule);
    if (!essay) return;
    prerendered.push({ key, rule });
    const oldest = prerendered.length > PRERENDERS ? prerendered.shift() : undefined;
    if (!oldest) return;
    // Removing its rule cancels the prerender; the essay may be pointed at again.
    oldest.rule.remove();
    fetched.delete(oldest.key);
  } else if (linkPrefetch) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = key;
    document.head.append(link);
  } else {
    fetch(key, { priority: 'low' } as RequestInit).catch(() => {});
  }
}

/** A page the reader is about to want: the essay after this one, as the end
 * of the text comes near. Its document only, not a prerender (no cover, no
 * scripts), so reading on costs a page of HTML; a hand or a press may still
 * prerender it. Never on a connection that asks to save data. */
export function prefetchAhead(anchor: HTMLAnchorElement | null) {
  const url = target(anchor);
  if (!url || slow()) return;
  const key = url.pathname + url.search;
  if (fetched.has(key) || ahead.has(key)) return;
  ahead.add(key);
  if (rules) {
    const rule = document.createElement('script');
    rule.type = 'speculationrules';
    rule.textContent = JSON.stringify({ prefetch: [{ source: 'list', urls: [key] }] });
    document.head.append(rule);
  } else if (linkPrefetch) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = key;
    document.head.append(link);
  } else {
    fetch(key, { priority: 'low' } as RequestInit).catch(() => {});
  }
}

export function initSpeculation() {
  let pending = 0;
  let aimed: HTMLAnchorElement | null = null;
  const cancel = () => {
    clearTimeout(pending);
    aimed = null;
  };
  const aim = (anchor: HTMLAnchorElement | null) => {
    if (anchor === aimed) return;
    cancel();
    aimed = anchor;
    const url = target(anchor);
    if (!url || fetched.has(url.pathname + url.search) || slow()) return;
    const essay = url.pathname.startsWith('/essays/');
    pending = window.setTimeout(() => speculate(url), essay ? PRERENDER_AFTER : PREFETCH_AFTER);
  };
  const anchorOf = (event: Event) =>
    (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]') ?? null;

  // A hand that moves onto a link (a link that slid under a resting hand waits
  // for the hand to move: pointermove, never pointerover alone).
  const hover = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || handRests()) return;
    aim(anchorOf(event));
  };
  document.addEventListener('pointerover', hover, { passive: true });
  document.addEventListener('pointermove', hover, { passive: true });
  document.addEventListener(
    'pointerout',
    (event) => {
      if (aimed && !aimed.contains(event.relatedTarget as Node | null)) cancel();
    },
    { passive: true },
  );
  document.addEventListener('focusin', (event) => {
    if ((event.target as Element).matches(':focus-visible')) aim(anchorOf(event));
  });
  document.addEventListener('focusout', cancel);
  // A press is fetched whatever the connection: it is about to be opened. A
  // mouse press at once; a finger after a moment, so a touch that turns into
  // a scroll (and is cancelled) fetches nothing, as the lamp does.
  let pressed = 0;
  let press: URL | undefined;
  const fetchPress = () => {
    clearTimeout(pressed);
    if (press) speculate(press);
    press = undefined;
  };
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) return;
      press = target(anchorOf(event));
      if (event.pointerType === 'mouse') fetchPress();
      else pressed = window.setTimeout(fetchPress, 60);
    },
    { passive: true },
  );
  document.addEventListener('pointerup', fetchPress, { passive: true });
  document.addEventListener(
    'pointercancel',
    () => {
      clearTimeout(pressed);
      press = undefined;
    },
    { passive: true },
  );
}
