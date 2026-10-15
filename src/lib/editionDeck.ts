// Ấn bản: series decks. Pointing at (or focusing) a part brings its print to
// the top of the deck; the other prints keep their order beneath it. Only
// translate, rotate and scale move (see .volume__card ranks in cards.css).
// A part carried under a resting hand by the scroll deals nothing until the
// hand moves (editionHand.ts).

import { handRests } from './editionHand';

// The stylesheet's settling curve and plate time (foundation.css, motion).
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const PLATE = 620;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function setFront(deck: HTMLElement, front: number) {
  const cards = [...deck.querySelectorAll<HTMLElement>('[data-card]')];
  if (!cards.length) return;
  const order = [front, ...cards.map((_, index) => index).filter((index) => index !== front)];
  const previous = Number(deck.dataset.front ?? front);
  cards.forEach((card, index) => {
    card.dataset.rank = String(order.indexOf(index));
  });
  deck.dataset.front = String(front);
  deck.parentElement?.querySelectorAll<HTMLElement>('[data-part]').forEach((part) => {
    part.toggleAttribute('data-active', Number(part.dataset.part) === front);
  });
  // The print that comes forward is lifted off the pile, not slid through it.
  if (previous !== front && !reduced())
    cards[front]?.animate([{ scale: '1' }, { scale: '1.035', offset: 0.4 }, { scale: '1' }], {
      duration: PLATE,
      easing: EASE,
      composite: 'accumulate',
    });
}

/** The new deck is dealt: each print lands in its place, one after another. */
export function dealDeck(panel: HTMLElement) {
  if (reduced()) return;
  panel.querySelectorAll<HTMLElement>('[data-card]').forEach((card, index) => {
    card.animate([{ opacity: 0, translate: '0 40px', rotate: '0deg' }, {}], {
      duration: PLATE,
      delay: 60 + index * 70,
      easing: EASE,
      fill: 'backwards',
    });
  });
}

export function initDecks(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>('.volume').forEach((panel) => {
    const deck = panel.querySelector<HTMLElement>('[data-deck]');
    if (!deck) return;
    const count = deck.querySelectorAll('[data-card]').length;
    if (!count) return;
    panel.querySelectorAll<HTMLElement>('[data-part]').forEach((part) => {
      const front = Math.min(Number(part.dataset.part), count - 1);
      const show = () => setFront(deck, front);
      const point = () => {
        if (!handRests() && deck.dataset.front !== String(front)) show();
      };
      part.addEventListener('pointerenter', point);
      part.addEventListener('pointermove', point, { passive: true });
      part.addEventListener('focus', show);
    });
    // A tap on the deck deals the next print (pointer only; the list is the control).
    deck.addEventListener('click', () =>
      setFront(deck, (Number(deck.dataset.front ?? 0) + 1) % count),
    );
    setFront(deck, 0);
  });
}

/**
 * Prints of a deck load before they are asked for. A browser leaves a lazy
 * image alone until it is almost on screen (Safari waits longest), and never
 * loads one in a hidden tab: a series opened on a phone used to deal three
 * blank sheets that printed one by one. When the decks are a screen or so
 * away, the series on the table is fetched; once it is in, the top print of
 * every other series follows at low priority (the prints beneath it are
 * mostly covered, and a phone's data is spent only on what will be seen). A
 * tab that is pointed at, touched or focused fetches the rest of its series.
 * With Save-Data on, nothing is fetched ahead. Series held back from the page
 * (lib/editionLater.ts) are gathered by `more` first, when the decks come near
 * or a tab is reached for.
 */
export function warmDecks(
  section: HTMLElement | null,
  more: () => Promise<void> = () => Promise.resolve(),
) {
  if (!section) return;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
  const panels = () => [...section.querySelectorAll<HTMLElement>('.volume')];
  const fetchPrints = (
    panel: HTMLElement | null | undefined,
    selector: string,
    priority: 'high' | 'low' | 'auto',
  ) => {
    const images = [...(panel?.querySelectorAll<HTMLImageElement>(selector) ?? [])];
    for (const image of images) {
      if (image.loading !== 'lazy') continue;
      image.fetchPriority = priority;
      image.loading = 'eager';
    }
    return Promise.all(
      images.map((image) =>
        image.complete
          ? null
          : new Promise((done) => {
              image.addEventListener('load', done, { once: true });
              image.addEventListener('error', done, { once: true });
            }),
      ),
    );
  };
  const tops = () => {
    for (const panel of panels())
      if (panel.hidden) void fetchPrints(panel, '[data-card="0"] img', 'low');
  };
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const shown = panels().find((panel) => !panel.hidden) ?? panels()[0];
      void fetchPrints(shown, '[data-deck] img', 'auto').then(async () => {
        if (saveData) return;
        await more();
        if ('requestIdleCallback' in window) requestIdleCallback(tops, { timeout: 2000 });
        else setTimeout(tops, 600);
      });
    },
    { rootMargin: '150% 0px' },
  ).observe(section);
  section.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab) => {
    const warm = () =>
      void more().then(() =>
        fetchPrints(
          document.getElementById(tab.getAttribute('aria-controls') ?? ''),
          '[data-deck] img',
          'high',
        ),
      );
    // pointermove, not pointerenter: a tab carried under a resting hand by the
    // scroll is not pointed at, and fetches nothing (editionHand.ts).
    for (const type of ['pointermove', 'pointerdown', 'focus'])
      tab.addEventListener(type, warm, { once: true });
  });
}
