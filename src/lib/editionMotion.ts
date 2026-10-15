// Ấn bản: things that come and go. Every entrance has its exit: what rises
// into place sinks back a little as it fades, in three quarters of the time
// it took to come (an exit is answered, not watched). Only opacity and
// translate move, so a transform an element already carries (a centring
// translateX) is untouched. Times and curves are the stylesheet's
// (foundation.css, motion; docs/motion.md): settle in, leave out.

const SETTLE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const LEAVE = 'cubic-bezier(0.3, 0, 0.2, 1)';
const BASE = 340;
const CLOSE = 260;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Show or hide an element (its `hidden`), with an entrance and an exit. */
export function reveal(element: HTMLElement, show: boolean, rise = 8) {
  const leaving = 'leaving' in element.dataset;
  if (show === (!element.hidden && !leaving)) return;
  for (const animation of element.getAnimations()) animation.cancel();
  delete element.dataset.leaving;
  if (show) {
    element.hidden = false;
    if (!reduced())
      element.animate(
        [
          { opacity: 0, translate: `0 ${rise}px` },
          { opacity: 1, translate: '0 0' },
        ],
        {
          duration: BASE,
          easing: SETTLE,
        },
      );
    return;
  }
  if (reduced()) {
    element.hidden = true;
    return;
  }
  element.dataset.leaving = '';
  element
    .animate(
      [
        { opacity: 1, translate: '0 0' },
        { opacity: 0, translate: `0 ${rise / 2}px` },
      ],
      {
        duration: CLOSE,
        easing: LEAVE,
        fill: 'forwards',
      },
    )
    .finished.then(
      (animation) => {
        element.hidden = true;
        delete element.dataset.leaving;
        animation.cancel();
      },
      () => {},
    );
}

/** A short status line ("Đã chép"): fades in, stays a moment, fades away.
 * The element stays in place (a live region is read as its text changes);
 * only its words come and go. */
export function flash(status: HTMLElement, text: string, hold = 2400) {
  clearTimeout(Number(status.dataset.flash ?? 0));
  for (const animation of status.getAnimations()) animation.cancel();
  status.textContent = text;
  if (!reduced())
    status.animate(
      [
        { opacity: 0, translate: '0 4px' },
        { opacity: 1, translate: '0 0' },
      ],
      {
        duration: BASE,
        easing: SETTLE,
      },
    );
  status.dataset.flash = String(
    window.setTimeout(() => {
      delete status.dataset.flash;
      const clear = () => {
        if (status.textContent === text) status.textContent = '';
      };
      if (reduced()) return clear();
      status
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: CLOSE,
          easing: LEAVE,
          fill: 'forwards',
        })
        .finished.then((animation) => {
          clear();
          animation.cancel();
        }, clear);
    }, hold),
  );
}
