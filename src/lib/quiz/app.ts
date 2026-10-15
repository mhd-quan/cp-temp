// La bàn Tư tưởng, in the page: choosing a length, the questions one by one,
// the added questions, and the results. Answers stay in this browser
// (localStorage); a shared result travels in the address's hash, which never
// reaches the server or analytics. Times and curves are the stylesheet's
// (foundation.css; docs/motion.md): settle in, leave out.
import { flash } from '../editionMotion.ts';
import { initGlints } from './glint.ts';
import { coverage, match } from './match.ts';
import { orbit } from './orbit.ts';
import type { Result } from './results.ts';
import { type Estimate, estimate } from './score.ts';
import { adaptiveDone, baseQuestions, LENGTHS, MODES, type Mode, nextQuestion } from './select.ts';
import { decodeResult, type SharedResult } from './share.ts';
import type { Answer, Question } from './types.ts';

type Data = typeof import('./load.ts');
type Extras = typeof import('./extras.ts');

interface Saved {
  version: 3;
  mode: Mode;
  seed: number;
  /** Questions in the order asked: the fixed ones, then those chosen one at a time. */
  order: string[];
  /** For each of them, f (fixed) or a (chosen for this player). */
  kinds: string;
  /** Answers on the seven-point scale, −3 … 3. */
  answers: [string, Answer][];
  at: number;
  /** The furthest question reached; the trail jumps back from it and returns to it. */
  reach?: number;
  done: boolean;
}

// Named when the compass was La bàn Chính trị; kept, so a round under way survives the rename.
const KEY = 'quiz:la-ban-chinh-tri';
const SETTLE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const LEAVE = 'cubic-bezier(0.3, 0, 0.2, 1)';
const TURN = 'cubic-bezier(0.45, 0, 0.2, 1)';
/** The ring's circumference, as view.ts draws it (radius 50). */
const RING = 2 * Math.PI * 50;
const PRESS = 130;
const QUICK = 220;
const BASE = 340;
const CLOSE = 260;
const SLOW = 540;
/** Answer buttons, left to right, and the keys (1–7) that press them. */
const SCALE: Answer[] = [3, 2, 1, 0, -1, -2, -3];

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const $ = <T extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document,
): NoInfer<T> => scope.querySelector<T & Element>(selector) as T;
const $$ = <T extends Element = HTMLElement>(selector: string, scope: ParentNode = document) => [
  ...scope.querySelectorAll<T & Element>(selector),
];

/** A round saved before the seven-point scale (version 1) cannot be carried on. */
let outdated = false;

/** The lengths' names, in a sentence. */
const PACKS: Record<Mode, string> = {
  short: 'bản rút gọn',
  standard: 'bản tiêu chuẩn',
  deep: 'bản chuyên sâu',
};
/** Version 2 had two lengths, which are now the first two: its standard is today's short. */
const RENAMED: Record<string, Mode> = { standard: 'short', full: 'standard' };

function read(): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved?.version === 2 && saved.mode in RENAMED) {
      saved.version = 3;
      saved.mode = RENAMED[saved.mode];
    }
    if (saved?.version === 3 && Array.isArray(saved.order) && typeof saved.kinds === 'string')
      return saved;
    if (saved) {
      outdated = saved.version === 1;
      localStorage.removeItem(KEY);
    }
    return null;
  } catch {
    return null;
  }
}
function write(state: Saved | null) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {}
}

const track = (name: string, fields: Record<string, string | number>) =>
  (window as { gtag?: (...args: unknown[]) => void }).gtag?.('event', name, fields);

export function initQuiz() {
  const quiz = $('[data-quiz]');
  if (!quiz) return;
  const panels = {
    intro: $('[data-panel="intro"]', quiz),
    play: $('[data-panel="play"]', quiz),
    result: $('[data-panel="result"]', quiz),
  };
  const live = $('[data-live]', quiz);
  const need = $('[data-need]', quiz);
  const notice = $('[data-notice]', quiz);
  const sheet = $('[data-sheet]');
  const sheetBody = $('[data-sheet-body]', sheet);

  let data: Data | undefined;
  let extras: Extras | undefined;
  const loadData = () => import('./load.ts').then((module) => (data = module));
  const loadExtras = () => import('./extras.ts').then((module) => (extras = module));
  let state: Saved | null = read();
  let answers = new Map<string, Answer>(state?.answers ?? []);
  let questions = new Map<string, Question>();
  let busy = false;
  /** Going back over skipped questions because the answers are too few for a result. */
  let filling = false;
  let shown: { result: Result; estimate: Estimate; answers: Map<string, Answer> } | undefined;

  for (const element of $$('[data-js-only]', quiz)) element.hidden = false;
  initGlints($('[data-bento]', quiz));
  // The cube on the first page leans toward a resting mouse and turns under a drag.
  for (const stage of $$('[data-panel="intro"] [data-cube]', quiz)) orbit(stage, { lean: true });
  let stopOrbit: (() => void) | undefined;

  const announce = (text: string) => {
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = text));
  };

  const save = () => {
    if (!state) return;
    state.answers = [...answers];
    write(state);
  };

  // ---------- stages ----------
  let stage: keyof typeof panels = 'intro';
  const settle = (element: Element, keyframes: Keyframe[], duration = BASE) =>
    reduced() ? undefined : element.animate(keyframes, { duration, easing: SETTLE });

  async function go(next: keyof typeof panels, focus?: HTMLElement | null, quiet = false) {
    if (next === stage && !panels[next].hidden) return;
    const from = panels[stage];
    if (!from.hidden && !quiet && !reduced())
      await from
        .animate(
          [
            { opacity: 1, translate: '0 0' },
            { opacity: 0, translate: '0 4px' },
          ],
          { duration: CLOSE, easing: LEAVE, fill: 'forwards' },
        )
        .finished.catch(() => {});
    for (const [name, panel] of Object.entries(panels)) {
      panel.hidden = name !== next;
      for (const animation of panel.getAnimations()) animation.cancel();
    }
    stage = next;
    quiz.dataset.stage = next;
    // Nothing moves on arrival: a shared result is simply there.
    if (quiet) return;
    const top = quiz.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.4)
      quiz.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
    settle(panels[next], [
      { opacity: 0, translate: '0 8px' },
      { opacity: 1, translate: '0 0' },
    ]);
    focus?.focus({ preventScroll: true });
  }

  // ---------- the length and the start ----------
  const chosenMode = (): Mode =>
    ($<HTMLInputElement>('input[name="quiz-pack"]:checked', quiz)?.value as Mode) ?? 'standard';
  /** The next length up from a finished one, if there is one. */
  const longer = (mode: Mode): Mode | undefined => MODES[MODES.indexOf(mode) + 1];

  const fixedCount = (saved: Saved) => saved.kinds.split('').filter((kind) => kind === 'f').length;
  const addedCount = (saved: Saved) => saved.kinds.split('').filter((kind) => kind === 'a').length;
  /** Where a question sits: its place among the fixed ones, or among those chosen for the player. */
  const placeOf = (saved: Saved, at: number) => {
    const kind = saved.kinds[at];
    const before = saved.kinds
      .slice(0, at + 1)
      .split('')
      .filter((k) => k === kind).length;
    return { chosen: kind === 'a', number: before };
  };

  const resume = $('[data-resume]', quiz);
  function showResume() {
    if (outdated) {
      notice.textContent =
        'Lượt làm dở trước đây dùng thang năm bậc cũ nên không làm tiếp được. Mời bạn bắt đầu lại với thang bảy bậc.';
      notice.hidden = false;
    }
    if (!state) {
      resume.hidden = true;
      return;
    }
    const pack = PACKS[state.mode];
    const place = placeOf(state, state.at);
    $('[data-resume-text]', resume).textContent = state.done
      ? `Bạn đã làm xong ${pack} trên trình duyệt này.`
      : place.chosen
        ? `Bạn đang làm dở ${pack}, ở phần câu chọn riêng.`
        : `Bạn đang làm dở ${pack}: câu ${place.number} trên ${fixedCount(state)}.`;
    $('[data-continue] span', resume).textContent = state.done ? 'Xem kết quả' : 'Làm tiếp';
    resume.hidden = false;
  }

  async function begin(mode: Mode) {
    const button = $<HTMLButtonElement>('[data-start]', quiz);
    if (button.dataset.pending !== undefined) return;
    button.dataset.pending = '';
    await (data ?? loadData());
    delete button.dataset.pending;
    if (!data) return;
    const seed = (Math.random() * 2 ** 32) >>> 0;
    const order = baseQuestions(data.model, mode, seed).map((question) => question.id);
    state = {
      version: 3,
      mode,
      seed,
      order,
      kinds: 'f'.repeat(order.length),
      answers: [],
      at: 0,
      reach: 0,
      done: false,
    };
    returnTo = null;
    answers = new Map();
    filling = false;
    outdated = false;
    need.hidden = true;
    notice.hidden = true;
    save();
    track('quiz_start', { quiz_mode: mode });
    await openQuestions();
  }

  async function openQuestions() {
    await (data ?? loadData());
    if (!data || !state) return;
    questions = new Map(data.model.questions.map((question) => [question.id, question]));
    showQuestion(0);
    await go('play', $('[data-question]', quiz));
  }

  // ---------- one question at a time ----------
  const card = $('[data-card]', quiz);
  const buttons = $$<HTMLButtonElement>('[data-answer]', quiz);
  const reading = $('[data-read]', quiz);
  /** Under the scale, the whole name of the answer under the pointer or focus, else of the one chosen. */
  const showRead = (button?: HTMLButtonElement) => {
    const chosen = buttons.find((item) => item.getAttribute('aria-pressed') === 'true');
    reading.textContent = (button ?? chosen)?.dataset.label ?? '';
    reading.toggleAttribute('data-chosen', !button && Boolean(chosen));
  };
  /** The heading over a question: its axis, or for a question that only separates traditions, its theme. */
  const topicOf = (question: Question) => {
    if (!data) return '';
    if (question.facet) {
      const axisId = question.facet.split('.')[0];
      return data.model.axes.find((axis) => axis.id === axisId)?.name ?? '';
    }
    return data.themeList.find((theme) => theme.id === question.theme)?.name ?? 'Phân định';
  };

  function paintQuestion() {
    if (!state || !data) return;
    const id = state.order[state.at];
    const question = questions.get(id);
    if (!question) return;
    const place = placeOf(state, state.at);
    const extra = place.chosen;
    const { min, max } = LENGTHS[state.mode];
    const capped = Number.isFinite(max);
    const fixed = fixedCount(state);
    $('[data-axis]', panels.play).textContent = topicOf(question);
    $('[data-question]', quiz).textContent = question.text;
    $('[data-count]', quiz).textContent = extra
      ? `Câu thêm ${place.number}`
      : `Câu ${place.number}`;
    // The chosen questions run to a floor, then on only while they must: to a ceiling in the
    // shortest length, with none in the longer ones, where the bar stays full past the floor.
    $('[data-total]', quiz).textContent = !extra
      ? String(fixed)
      : capped
        ? `tối đa ${max}`
        : place.number <= min
          ? `ít nhất ${min}`
          : 'tới khi đủ rõ';
    const share = extra
      ? Math.min(1, place.number / (capped ? max : min))
      : (place.number - 1) / fixed;
    $('[data-progress]', quiz).style.setProperty('--progress', share.toFixed(4));
    quiz.dataset.extra = String(extra);
    const answer = answers.get(id);
    for (const button of buttons) {
      delete button.dataset.chosen;
      button.setAttribute(
        'aria-pressed',
        String(answer !== undefined && answer !== null && Number(button.dataset.answer) === answer),
      );
    }
    $<HTMLButtonElement>('[data-back]', quiz).disabled = state.at === 0;
    showRead();
    paintTrail(question);
  }

  // ---------- the trail ----------
  // Under the question, every question of the round as a tick in the row of its axis (or of
  // the themes): answered, skipped, still to come, the one asked now, and those chosen for
  // the player as they are added. It shows how the round is built and how far it has gone,
  // and a tick already reached takes the player back to that question.
  const trail = $('[data-trail]', quiz);
  const trailSum = $('[data-trail-sum]', quiz);
  let trailOrder = '';
  /** After a jump back along the trail, the question to return to once it is answered. */
  let returnTo: number | null = null;
  const groupOf = (question: Question) => {
    if (!data || !question.facet) return 'themes';
    const f = data.model.facetIndex.get(question.facet);
    return f === undefined ? 'themes' : data.model.axes[data.model.facetAxis[f]].id;
  };
  function paintTrail(current: Question) {
    if (!state || !data) return;
    const reach = Math.max(state.reach ?? 0, state.at);
    state.reach = reach;
    const key = state.order.join();
    if (key !== trailOrder) {
      trailOrder = key;
      const groups = new Map<string, string[]>();
      state.order.forEach((id, i) => {
        const question = questions.get(id);
        if (!question) return;
        const group = groupOf(question);
        groups.set(group, [
          ...(groups.get(group) ?? []),
          `<button class="trail__tick" type="button" tabindex="-1" data-at="${i}" data-kind="${state?.kinds[i] ?? 'f'}"></button>`,
        ]);
      });
      for (const row of $$('[data-group]', trail)) {
        const ticks = groups.get(row.dataset.group ?? '') ?? [];
        $('[data-ticks]', row).innerHTML = ticks.join('');
        if (row.dataset.group === 'themes') row.hidden = !ticks.length;
      }
    }
    let answered = 0;
    let skipped = 0;
    for (const tick of $$<HTMLButtonElement>('.trail__tick[data-at]', trail)) {
      const i = Number(tick.dataset.at);
      const id = state.order[i];
      const value = answers.get(id);
      const stateOf =
        i === state.at
          ? 'current'
          : value !== undefined && value !== null
            ? 'done'
            : i <= reach && answers.has(id)
              ? 'skipped'
              : 'ahead';
      tick.dataset.state = stateOf;
      tick.disabled = i > reach || i === state.at;
      const place = placeOf(state, i);
      tick.title = `${place.chosen ? `Câu thêm ${place.number}` : `Câu ${place.number}`}${stateOf === 'done' ? ' · đã trả lời' : stateOf === 'skipped' ? ' · bỏ qua' : ''}`;
      if (value !== undefined && value !== null) answered++;
      else if (answers.has(id)) skipped++;
    }
    for (const row of $$('[data-group]', trail))
      row.toggleAttribute('data-current', row.dataset.group === groupOf(current));
    const fixed = fixedCount(state);
    const left = state.kinds
      .split('')
      .filter((kind, i) => kind === 'f' && i > reach && !answers.has(state?.order[i] ?? '')).length;
    trailSum.textContent = [
      `${answered} câu đã trả lời`,
      skipped ? `${skipped} bỏ qua` : '',
      left ? `${left} trên ${fixed} câu chung còn lại` : 'Hết phần chung',
    ]
      .filter(Boolean)
      .join(' · ');
  }
  trail.addEventListener('click', (event) => {
    const tick = (event.target as HTMLElement).closest<HTMLButtonElement>('.trail__tick');
    if (!tick || tick.disabled || !state || busy || stage !== 'play') return;
    const at = Number(tick.dataset.at);
    const reach = state.reach ?? state.at;
    returnTo = at < reach ? reach : null;
    const direction = at < state.at ? -1 : 1;
    state.at = at;
    save();
    showQuestion(direction);
  });

  function showQuestion(direction: 1 | -1 | 0) {
    if (direction === 0 || reduced()) {
      paintQuestion();
      return Promise.resolve();
    }
    busy = true;
    for (const animation of card.getAnimations()) animation.finish();
    return card
      .animate(
        [
          { opacity: 1, translate: '0 0' },
          { opacity: 0, translate: `${-6 * direction}px 0` },
        ],
        { duration: QUICK, easing: LEAVE, fill: 'forwards' },
      )
      .finished.catch(() => {})
      .then(() => {
        paintQuestion();
        busy = false;
        for (const animation of card.getAnimations()) animation.cancel();
        card.animate(
          [
            { opacity: 0, translate: `${12 * direction}px 0` },
            { opacity: 1, translate: '0 0' },
          ],
          { duration: BASE, easing: SETTLE },
        );
      });
  }

  /** The next question to ask once the fixed ones are done, or null when it is time to stop. */
  function addQuestion(): string | null {
    if (!data || !state) return null;
    const current = estimate(data.model, answers);
    const ranked = match(data.model, current);
    const pick = nextQuestion(data.model, current, new Set(state.order), ranked);
    if (adaptiveDone(state.mode, addedCount(state), ranked, pick) || !pick) return null;
    return pick.question.id;
  }

  async function respond(value: Answer, button?: HTMLButtonElement) {
    if (!state || busy || stage !== 'play') return;
    const id = state.order[state.at];
    answers.set(id, value);
    if (button) {
      for (const other of buttons)
        if (other !== button) other.setAttribute('aria-pressed', 'false');
      button.dataset.chosen = '';
      button.setAttribute('aria-pressed', 'true');
      showRead();
      // The dot takes its ink before the question leaves, so the answer is seen to land.
      if (!reduced()) {
        busy = true;
        await wait(PRESS);
        busy = false;
      }
    }
    if (state.at >= fixedCount(state) - 6) loadExtras();
    let nextAt = state.at + 1;
    if (returnTo !== null && !filling) {
      // Back along the trail and answered: on to where the player had got to.
      nextAt = returnTo;
      returnTo = null;
    } else if (filling) {
      // Going back over skipped questions only, until there is enough to name a result.
      const enough = data && coverage(estimate(data.model, answers)).enough;
      nextAt = enough ? -1 : firstSkipped(state.at + 1);
      if (nextAt < 0) {
        save();
        await finish();
        return;
      }
    } else if (nextAt >= state.order.length) {
      const added = addQuestion();
      if (added) {
        const first = addedCount(state) === 0;
        state.order.push(added);
        state.kinds += 'a';
        if (first)
          announce('Đã xong phần chính. Vài câu thêm để phân định những hướng đang sát nhau.');
      } else nextAt = -1;
    }
    if (nextAt < 0) {
      save();
      await finish();
      return;
    }
    state.at = nextAt;
    save();
    await showQuestion(1);
  }

  async function back() {
    if (!state || busy || state.at === 0) return;
    returnTo = null;
    state.at--;
    save();
    await showQuestion(-1);
  }

  for (const button of buttons) {
    button.addEventListener('click', () =>
      respond(Number(button.dataset.answer) as Answer, button),
    );
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') showRead(button);
    });
    button.addEventListener('pointerleave', () => showRead());
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) showRead(button);
    });
    button.addEventListener('blur', () => showRead());
  }
  $('[data-skip]', quiz).addEventListener('click', () => respond(null));
  $('[data-back]', quiz).addEventListener('click', back);
  $('[data-finish]', quiz).addEventListener('click', () => finish());

  document.addEventListener('keydown', (event) => {
    if (stage !== 'play' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.querySelector('dialog[open], :popover-open')) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    const index = '1234567'.indexOf(event.key);
    if (index >= 0) {
      event.preventDefault();
      respond(SCALE[index], buttons[index]);
    } else if (event.key === '0') {
      event.preventDefault();
      respond(null);
    } else if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      event.preventDefault();
      back();
    }
  });

  // ---------- results ----------
  /** Index of the first question from `from` on that was skipped or not yet reached, or −1. */
  function firstSkipped(from = 0): number {
    if (!state) return -1;
    for (let i = from; i < state.order.length; i++)
      if (answers.get(state.order[i]) == null) return i;
    return -1;
  }

  /**
   * Too few answers to name a result (match.ts, coverage): say what is missing and take
   * the player back through the questions they skipped.
   */
  async function askForMore(): Promise<boolean> {
    if (!state || !data) return false;
    const covered = coverage(estimate(data.model, answers));
    if (covered.enough) {
      filling = false;
      need.hidden = true;
      return false;
    }
    need.textContent = `Chưa đủ để kết luận: bạn mới trả lời ở ${covered.facets} trên ${data.model.facets.length} khía cạnh. Hãy trả lời thêm vài câu còn bỏ trống.`;
    need.hidden = false;
    const at = firstSkipped();
    if (at < 0) return false;
    filling = true;
    state.at = at;
    state.done = false;
    save();
    // A finished round saved by an earlier version can reach here from the start page.
    if (stage === 'play') await showQuestion(-1);
    else await openQuestions();
    return true;
  }

  async function finish() {
    if (!state) return;
    await (data ?? loadData());
    if (await askForMore()) return;
    state.done = true;
    save();
    track('quiz_complete', { quiz_mode: state.mode, quiz_questions: state.order.length });
    await showResult();
  }

  async function showResult(shared?: SharedResult, quiet = false) {
    await Promise.all([data ?? loadData(), extras ?? loadExtras()]);
    if (!data || !extras) return;
    // Every way in (a finished round, a resumed one, a link) passes the same coverage test
    // before any name, rank or number is drawn.
    if (!shared && (await askForMore())) return;
    // A link from before the seven-point scale was matched by a method since replaced:
    // say so, rather than show a result its sender never saw.
    if (shared && shared.version !== 3) {
      notice.textContent =
        'Liên kết này được tạo từ phiên bản trước của la bàn, khi còn dùng thang năm bậc và cách tính cũ, nên không dựng lại được. Bạn có thể tự làm la bàn ngay dưới đây.';
      notice.hidden = false;
      if (stage !== 'intro') await go('intro');
      return;
    }
    const received = shared ? extras.answersFromShared(data.model, shared) : null;
    const given = received ? received.answers : answers;
    const current = estimate(data.model, given);
    if (!coverage(current).enough) {
      notice.textContent = shared
        ? 'Đường dẫn này mang quá ít câu trả lời để dựng một kết quả. Bạn có thể tự làm la bàn ngay dưới đây.'
        : 'Lượt này có quá ít câu trả lời để dựng một kết quả.';
      notice.hidden = false;
      if (stage !== 'intro') await go('intro');
      return;
    }
    notice.hidden = true;
    const result = extras.buildResult(data.model, current, extras.catalogue);
    shown = { result, estimate: current, answers: new Map(given) };
    const context = viewContext();
    if (!context) return;
    const { view } = extras;
    const fill = (slot: string, html: string) => {
      $(`[data-slot="${slot}"]`, quiz).innerHTML = html;
    };
    fill('field', view.field(result));
    fill('hero', view.hero(context, result));
    $('[data-slot="hero"]', quiz).dataset.family = result.lead.variant.family;
    fill('why', view.why(context, result));
    fill('top', view.topList(context, result));
    const heading = view.topHeading(result);
    $('[data-top-title]', quiz).textContent = heading.title;
    $('[data-top-note]', quiz).textContent = heading.note;
    stopOrbit?.();
    fill('map', view.compassCube(context, result));
    stopOrbit = orbit($('[data-slot="map"] [data-cube]', quiz));
    fill('holders', view.embodied(context, result));
    fill('people', view.figures(context, result));
    fill('axes-ref', view.axisReference(context, result));
    fill('axes', view.axisRows(context, result, current));
    fill('apart', view.apart(context, result));
    fill('far', view.farthest(context, result, current));
    fill('credits', view.credits(context, result));
    $('[data-holders-name]', quiz).textContent = result.lead.variant.name;
    $('[data-shared]', quiz).hidden = !shared;
    $('[data-recomputed]', quiz).hidden = !received?.recomputed;
    $('[data-own]', quiz).hidden = Boolean(shared);
    const next = state && longer(state.mode);
    $('[data-more]', quiz).hidden = Boolean(shared) || !next;
    if (next) $('[data-more] span', quiz).textContent = `Làm tiếp thành ${PACKS[next]}`;
    inkPortraits(panels.result);
    const animate = stage !== 'result' && !quiet;
    await go('result', quiet ? null : $('#quiz-verdict', quiz), quiet);
    if (animate) choreograph();
    announce(`Kết quả: ${result.lead.variant.name}.`);
  }

  function viewContext() {
    if (!data || !extras) return;
    return {
      model: data.model,
      themes: new Map(data.themeList.map((theme) => [theme.id, theme])),
      axes: data.model.axes,
      families: new Map(data.library.families.map((family) => [family.id, family])),
      variants: new Map(data.library.variants.map((variant) => [variant.id, variant])),
      glyphs: extras.glyphData,
      catalogue: extras.catalogue,
      portraits: extras.portraitData,
    };
  }

  /** A portrait fades in once it has arrived (the plate rule in foundation.css). */
  function inkPortraits(scope: ParentNode) {
    for (const image of $$<HTMLImageElement>('.plate__print img', scope)) {
      const print = image.parentElement as HTMLElement;
      const ink = () => (print.dataset.inked = '');
      if (image.complete) print.dataset.inked = 'quiet';
      else {
        image.addEventListener('load', ink, { once: true });
        image.addEventListener('error', ink, { once: true });
      }
    }
  }

  /** The verdict is stamped, the five nearest are ruled in, then the rest rises. */
  function choreograph() {
    if (reduced()) return;
    // As the seal lands, a light runs once around the verdict's rim (quiz.css).
    const verdictTile = $('.tile--verdict', quiz);
    delete verdictTile.dataset.arrived;
    window.setTimeout(() => {
      verdictTile.dataset.arrived = '';
      verdictTile.addEventListener('animationend', () => delete verdictTile.dataset.arrived, {
        once: true,
      });
    }, SLOW * 0.6);
    const seal = $('.verdict__seal', quiz);
    seal?.animate(
      [
        { opacity: 0, scale: '1.06' },
        { opacity: 1, scale: '1' },
      ],
      { duration: SLOW, easing: SETTLE },
    );
    // The fit fills its ring once, from twelve o'clock, as the seal lands: one even stroke,
    // as a line is engraved (docs/motion.md, rule 6), its dash set in the ring's own units
    // so no browser rescales it midway; the number arrives as the stroke nears it.
    const arc = $('.verdict__figures .ring__arc', quiz);
    if (arc)
      arc.animate([{ strokeDashoffset: String(RING) }], {
        duration: SLOW + BASE,
        delay: QUICK,
        easing: TURN,
        fill: 'backwards',
      });
    $('.verdict__figures .ring__value', quiz)?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: BASE,
      delay: QUICK + SLOW,
      easing: SETTLE,
      fill: 'backwards',
    });
    for (const [i, bar] of $$('.top__bar > span', quiz).entries())
      bar.animate([{ scale: '0 1' }], {
        duration: SLOW,
        delay: 120 + i * 30,
        easing: SETTLE,
        fill: 'backwards',
      });
    for (const [i, element] of $$('.verdict__text > *, [data-rise]', quiz).entries())
      element.animate(
        [
          { opacity: 0, translate: '0 8px' },
          { opacity: 1, translate: '0 0' },
        ],
        { duration: BASE, delay: Math.min(i * 30, 300), easing: SETTLE, fill: 'backwards' },
      );
  }

  // ---------- the variant the twelve axes are set against ----------
  quiz.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.name !== 'quiz-ref') return;
    const variant = viewContext()?.variants.get(input.value);
    if (!variant) return;
    // Where the variant's expected answers place it on each axis, in the axes' order.
    const positions = (input.dataset.positions ?? '').split(',');
    for (const [a, cell] of $$('.lean[data-axis]', quiz).entries()) {
      const scale = $('.lean__scale', cell);
      const index = data?.model.axes.findIndex((axis) => axis.id === cell.dataset.axis) ?? a;
      scale.style.setProperty('--them', positions[index] ?? '50');
      scale.dataset.family = variant.family;
    }
    $('[data-ref-key]', quiz).dataset.family = variant.family;
    $('[data-ref-name]', quiz).textContent = variant.name;
    announce(`Các trục đang so với ${variant.name}.`);
  });

  // ---------- the profile sheet ----------
  let opener: HTMLElement | null = null;
  quiz.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-profile]');
    if (!button || !shown || !extras) return;
    const context = viewContext();
    const item = shown.result.matches.find((entry) => entry.variant.id === button.dataset.profile);
    if (!context || !item) return;
    const { parties, states } = extras.view.embodiedFor(context, item.variant.id);
    sheetBody.innerHTML = extras.view.profile(
      context,
      item,
      shown.estimate,
      extras.view.holders(context, parties, states),
    );
    opener = button;
    sheet.showPopover();
    $('#quiz-profile-title', sheet)?.focus({ preventScroll: true });
  });
  sheet.addEventListener('toggle', (event) => {
    if ((event as ToggleEvent).newState === 'closed') {
      opener?.focus({ preventScroll: true });
      opener = null;
    }
  });

  // ---------- sharing and starting over ----------
  const status = $('[data-status]', quiz);
  const shareUrl = () => {
    if (!shown) return location.href;
    const code = extras && data ? extras.shareCode(data.model, shown.answers) : '';
    return `${location.origin}${location.pathname}#k=${code}`;
  };
  $('[data-copy]', quiz).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      flash(status, 'Đã chép');
    } catch {
      flash(status, 'Không chép được liên kết');
    }
  });
  // The result as a picture (card.ts): offered to the phone's share sheet, saved elsewhere.
  const picture = $<HTMLButtonElement>('[data-image]', quiz);
  picture.addEventListener('click', async () => {
    const context = viewContext();
    if (!shown || !context || picture.dataset.pending !== undefined) return;
    picture.dataset.pending = '';
    const { result } = shown;
    try {
      const { drawCard } = await import('./card.ts');
      // The picture carries the same link as Chép liên kết, as a code in its corner.
      const blob = await drawCard(result, context, shareUrl());
      const name = `la-ban-tu-tuong-${result.lead.variant.id}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        await navigator
          .share({ files: [file], title: `La bàn Tư tưởng: ${result.lead.variant.name}` })
          .catch(() => {});
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
        flash(status, 'Đã lưu ảnh');
      }
      // Counted, never with the result: analytics does not learn how anyone leans.
      track('quiz_image', {});
    } catch {
      flash(status, 'Không vẽ được ảnh');
    } finally {
      delete picture.dataset.pending;
    }
  });
  const share = $<HTMLButtonElement>('[data-share]', quiz);
  share.hidden = !('share' in navigator);
  share.addEventListener('click', () => {
    if (!shown) return;
    navigator
      .share({
        title: `La bàn Tư tưởng: ${shown.result.lead.variant.name}`,
        url: shareUrl(),
      })
      .catch(() => {});
  });
  const restart = async () => {
    write(null);
    state = null;
    answers = new Map();
    shown = undefined;
    if (location.hash) history.replaceState(null, '', location.pathname);
    showResume();
    await go('intro', $('[data-start]', quiz));
  };
  for (const button of $$('[data-again]', quiz)) button.addEventListener('click', restart);
  $('[data-more]', quiz).addEventListener('click', async () => {
    await (data ?? loadData());
    if (!data || !state) return;
    const next = longer(state.mode);
    if (!next) return;
    // The fixed questions of the next length not asked yet, then more chosen for the
    // player as that length asks them (at least its floor, with no ceiling), then the
    // results again.
    const asked = new Set(state.order);
    const more = baseQuestions(data.model, next, state.seed)
      .map((question) => question.id)
      .filter((id) => !asked.has(id));
    if (!more.length) return;
    state.order.push(...more);
    state.kinds += 'f'.repeat(more.length);
    state.mode = next;
    state.done = false;
    state.at = state.order.length - more.length;
    save();
    await openQuestions();
  });

  $('[data-start]', quiz).addEventListener('click', () => begin(chosenMode()));
  $('[data-continue]', quiz).addEventListener('click', () =>
    state?.done ? showResult() : openQuestions(),
  );
  $('[data-restart]', quiz).addEventListener('click', () => {
    write(null);
    state = null;
    answers = new Map();
    showResume();
    $<HTMLButtonElement>('[data-start]', quiz).focus();
  });
  for (const input of $$<HTMLInputElement>('input[name="quiz-pack"]', quiz))
    input.addEventListener('change', () => {
      $('[data-start-length]', quiz).textContent = String(LENGTHS[chosenMode()].base);
    });

  // ---------- arriving ----------
  const shared = /^#k=(.+)$/.exec(location.hash);
  const decoded = shared ? decodeResult(decodeURIComponent(shared[1])) : null;
  if (decoded) showResult(decoded, true);
  else showResume();
  // The questions are this page's purpose: fetch them once the page has settled.
  const idle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1200));
  idle(() => loadData());
}
