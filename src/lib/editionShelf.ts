// Ấn bản: a shelf that slides. The shelf itself is a native scroller with snap
// points, so fingers, trackpads and the keyboard move it as they move any
// list; these controls step one view of books (or of the first page's pensées)
// at a time for a mouse, and fall quiet at either end (aria-disabled, so a
// focused control keeps its focus).

export function initShelves() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  for (const controls of document.querySelectorAll<HTMLElement>('[data-shelf-controls]')) {
    const shelf = document.getElementById(controls.dataset.shelfControls ?? '');
    const [back, on] = controls.querySelectorAll<HTMLButtonElement>('[data-step]');
    if (!shelf || !back || !on) continue;

    const update = () => {
      const end = shelf.scrollWidth - shelf.clientWidth;
      controls.hidden = end < 4;
      back.setAttribute('aria-disabled', String(shelf.scrollLeft < 4));
      on.setAttribute('aria-disabled', String(shelf.scrollLeft > end - 4));
    };

    // On: the first book not wholly in view comes to the start of the shelf.
    // Back: the book one view earlier does.
    const step = (direction: 1 | -1) => {
      const view = shelf.getBoundingClientRect();
      const inset = Number.parseFloat(getComputedStyle(shelf).scrollPaddingInlineStart) || 0;
      const start = view.left + inset;
      const span = view.width - 2 * inset;
      // The shelf's own list, whether the shelf holds it or is it.
      const items = [...shelf.querySelectorAll<HTMLElement>('[role="list"] > li')];
      const target =
        direction > 0
          ? items.find((item) => item.getBoundingClientRect().right > view.right - inset + 1)
          : items.find((item) => item.getBoundingClientRect().left >= start - span - 1);
      if (!target) return;
      shelf.scrollBy({
        left: target.getBoundingClientRect().left - start,
        behavior: reduced.matches ? 'instant' : 'smooth',
      });
    };

    back.addEventListener('click', () => back.getAttribute('aria-disabled') !== 'true' && step(-1));
    on.addEventListener('click', () => on.getAttribute('aria-disabled') !== 'true' && step(1));
    let queued = 0;
    shelf.addEventListener(
      'scroll',
      () => {
        queued ||= requestAnimationFrame(() => {
          queued = 0;
          update();
        });
      },
      { passive: true },
    );
    // The first observation arrives once the page is laid out: measuring the
    // shelf here instead would lay out the whole page before its first frame.
    new ResizeObserver(update).observe(shelf);
  }
}
