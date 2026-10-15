// Ấn bản: the way back into an essay left half read. The reader keeps its
// place in each essay on this device (editionReader.ts, continuity); inside
// that essay it offers to go on. The front page offers the most recent one
// once in a visit: a quiet line at the foot of the screen, over the page
// (nothing below it moves), that leads to the paragraph where reading
// stopped. It leaves when the page is scrolled, answered or dismissed; a
// dismissed essay is not offered again from the front page.
import { reveal } from './editionMotion';

const POSITIONS_KEY = 'pensees-reading-positions';
const OFFERED_KEY = 'pensees-return-offered';
const DAYS = 14;

interface Position {
  id: string;
  time: number;
  title?: string;
  left?: number;
  quiet?: boolean;
}

const read = (): Record<string, Position> => {
  try {
    const value = JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export function initReturn() {
  const prompt = document.querySelector<HTMLElement>('[data-return]');
  const link = prompt?.querySelector<HTMLAnchorElement>('[data-return-link]');
  if (!prompt || !link || location.hash) return;
  try {
    if (sessionStorage.getItem(OFFERED_KEY)) return;
  } catch {
    return;
  }
  const [path, position] =
    Object.entries(read())
      .filter(
        ([path, position]) =>
          path.startsWith('/essays/') &&
          typeof position?.id === 'string' &&
          typeof position.time === 'number' &&
          typeof position.title === 'string' &&
          !position.quiet &&
          Date.now() - position.time < DAYS * 86_400_000,
      )
      .sort((a, b) => b[1].time - a[1].time)[0] ?? [];
  if (!path || !position?.title) return;

  link.href = `${path}#${encodeURIComponent(position.id)}`;
  const title = prompt.querySelector<HTMLElement>('[data-return-title]');
  const left = prompt.querySelector<HTMLElement>('[data-return-left]');
  if (title) title.textContent = position.title;
  if (left) left.textContent = position.left ? `Còn ${position.left} phút` : '';

  const leave = () => reveal(prompt, false, 12);
  const offer = () => {
    // A reader already on the way down the page has chosen what to read.
    if (scrollY > innerHeight * 0.5) return;
    try {
      sessionStorage.setItem(OFFERED_KEY, '1');
    } catch {}
    reveal(prompt, true, 12);
    addEventListener('scroll', leave, { once: true, passive: true });
  };
  link.addEventListener('click', leave);
  prompt.querySelector('[data-return-dismiss]')?.addEventListener('click', () => {
    leave();
    const positions = read();
    if (!positions[path]) return;
    positions[path].quiet = true;
    try {
      localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
    } catch {}
  });
  // Offered once the first screen has settled, never in the way of its paint.
  const settle = () => window.setTimeout(offer, 700);
  if (document.readyState === 'complete') settle();
  else addEventListener('load', settle, { once: true });
}
