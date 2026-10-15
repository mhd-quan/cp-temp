// Ấn bản: the engraving of the name, on a visitor's first page. Not part of
// any page: it travels with the drawing, in the one file fetched only then
// (lib/nameplate.mjs), imported by the head script (editionHead.js, job 4),
// which has hidden the text and given the drawing a second to arrive.
//
// A hairline traces the outline of each letter, left to right, as a burin
// cuts it into the plate; ink floods the letter as the line closes, and the
// hairline is gone into it. Then the drawing is taken away and the name is
// text again, where it was drawn (docs/motion.md, the engraved name). The
// motion is set here rather than in a stylesheet (a stylesheet added to a
// page restyles all of it, in the middle of its loading), in the page's own
// tokens.
const root = document.documentElement;
const rest = () => delete root.dataset.nameplate;

// The drawing is laid on the text's own baselines, found by a mark set at the
// end of each line of it: browsers round a line's metrics to whole pixels,
// each in its own way, and paint text on a whole pixel of the screen; the
// drawing would sit a pixel off.
const align = (name, svg) => {
  const the = svg.querySelector('.nameplate__the');
  const mark = (line) => {
    const probe = document.createElement('i');
    probe.style.display = 'inline-block';
    return line.appendChild(probe);
  };
  const small = the && name.querySelector('.wordmark__the');
  const marks = [mark(name), small && mark(small)];
  const drift = (probe, drawn, y) => {
    const at = drawn.getScreenCTM();
    const pixel = devicePixelRatio;
    return Math.round(probe.getBoundingClientRect().bottom * pixel) / pixel - (at.d * y + at.f);
  };
  const scale = svg.getScreenCTM().d;
  const shift = drift(marks[0], svg, +svg.dataset.baseline);
  const lift = marks[1] ? drift(marks[1], the, 0) - shift : 0;
  for (const probe of marks) probe?.remove();
  svg.style.translate = `0 ${shift}px`;
  if (lift) the.style.translate = `0 ${lift / scale}px`;
};

// Each letter is traced in --d-trace on the turn's curve, the next begun
// --d-letter later; its ink floods in --d-slow, settling, from a little past
// half its tracing.
const motion = () => {
  const tokens = getComputedStyle(root);
  const token = (name) => tokens.getPropertyValue(name).trim();
  // A time as written (the built stylesheet writes 600ms as .6s), in ms.
  const time = (name) => {
    const value = token(name);
    return Number.parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
  };
  return {
    trace: time('--d-trace'),
    letter: time('--d-letter'),
    ink: time('--d-slow'),
    turn: token('--ease-turn'),
    settle: token('--ease-out'),
  };
};
const cut = (svg, { trace, letter, ink, turn, settle }) => {
  const length = +svg.getAttribute('stroke-dasharray');
  return [...svg.querySelectorAll('use')].flatMap((use, index) => [
    use.animate(
      { strokeDashoffset: [length, 0] },
      { duration: trace, delay: index * letter, easing: turn, fill: 'both' },
    ),
    use.animate(
      { fillOpacity: [0, 1], strokeOpacity: [1, 0] },
      { duration: ink, delay: index * letter + trace * 0.56, easing: settle, fill: 'both' },
    ),
  ]);
};

/** Lay the drawing over the name once the page has been painted and the
 * name's face has arrived, engrave it, and take it away when the ink is dry.
 * Nothing is read from the page before its first frame: measuring the name
 * any sooner made the browser lay the whole page out early, and the first
 * paint came later. Until the face arrives the text is set in another, of
 * other widths. On a phone the name is the lockup. */
export function engrave(settings, late) {
  const find = () => {
    const name = document.querySelector('.wordmark a');
    if (!name) {
      requestAnimationFrame(find);
      return;
    }
    document.fonts.load(`500 1em ${getComputedStyle(name).fontFamily}`).then(() => {
      // Too late: the name has been shown as it is.
      if (!('nameplate' in root.dataset)) return;
      clearTimeout(late);
      const timing = motion();
      const phone = matchMedia('(max-width: 760px)').matches;
      name.insertAdjacentHTML('beforeend', phone ? settings.lockup : settings.line);
      const plate = name.lastElementChild;
      const svg = plate.firstElementChild;
      const runs = cut(svg, timing);
      align(name, svg);
      const done = () => {
        plate.remove();
        rest();
      };
      Promise.all(runs.map((run) => run.finished)).then(done, done);
    }, rest);
  };
  // The second frame: the first has been painted.
  requestAnimationFrame(() => requestAnimationFrame(find));
}
