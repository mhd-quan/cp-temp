// Ấn bản: the hand. Hover answers a hand that moves, never the page moving
// beneath a hand at rest.
//
// When the page scrolls under a resting mouse (the wheel, the keyboard, the
// scrollbar), the browser gives the pointer to whatever slides beneath it,
// though the hand has not moved: at every pause of a reading scroll a lamp
// was lit, a title underlined, a book lifted and the next essay fetched, and
// all of it was put out again as the next scroll began. Every scroll on a
// desktop started by restyling, repainting and re-rastering prints, and
// fetching pages no one had pointed at (v1.1.1: a reading scroll of the
// homepage with the mouse on the page cost four to five times the style,
// paint and layerizing of the same scroll with the mouse off it).
//
// So the page waits for the hand. From the first scroll under a mouse until
// the mouse next moves, the root carries data-resting: hover styles hold
// still (every :hover rule is written under :where(:root:not([data-resting]))),
// and the lamp, the series decks and link speculation wait (handRests()).
// The browser sends no pointermove when content moves under a still pointer
// (only pointerover and the like), so a pointermove that travels is the hand.
//
// While the page is moving, a clear shield also covers it, so nothing is
// hovered on the way past (one element is shown and hidden; nothing else is
// restyled). Neither happens while a button is held: a selection dragged
// past the edge scrolls the page, and must keep reading the text under the
// hand.

const root = document.documentElement;
const mouse = matchMedia('(hover: hover) and (pointer: fine)');
let resting = false;

/** True from a scroll under a resting mouse until the mouse moves again. */
export const handRests = () => resting;

export function initHand() {
  const shield = document.querySelector<HTMLElement>('[data-scroll-shield]');
  let scrolling = false;
  // The hand moved after the page's last movement, before it came to rest.
  let stirred = false;
  let settle = 0;
  let held = false;
  const wake = () => {
    resting = false;
    delete root.dataset.resting;
  };
  addEventListener('pointerdown', () => (held = true), { passive: true, capture: true });
  for (const type of ['pointerup', 'pointercancel', 'blur'])
    addEventListener(type, () => (held = false), { passive: true, capture: true });
  addEventListener(
    'scroll',
    () => {
      if (!mouse.matches || held) return;
      if (!resting) {
        resting = true;
        root.dataset.resting = '';
      }
      stirred = false;
      if (!scrolling) {
        scrolling = true;
        if (shield) shield.hidden = false;
      }
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        scrolling = false;
        // Awake before the shield lifts: what the browser then hovers under
        // the hand answers it at once.
        if (stirred) wake();
        if (shield) shield.hidden = true;
      }, 140);
    },
    { passive: true },
  );
  // A move while the page is still moving is kept until it rests (a hand
  // moved mid-scroll would otherwise toggle the root with every frame).
  // Captured on window, so the hand is awake before anything beneath it
  // hears the move.
  addEventListener(
    'pointermove',
    (event) => {
      if (!resting || event.pointerType !== 'mouse') return;
      if (!event.movementX && !event.movementY) return;
      if (scrolling) stirred = true;
      else wake();
    },
    { passive: true, capture: true },
  );
}
