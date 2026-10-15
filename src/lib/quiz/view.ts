import { type CubeDot, compass, cubeStage, DIMENSIONS, type Dimension, VIEWS } from './compass.ts';
import { coherence } from './construct.ts';
import { emblemGlyph, flagGlyph, ideaMark, sealGlyph } from './glyphs.ts';
import { type Group, type LeanLevel, leanOf, partings, type Quote, support } from './insight.ts';
import { CLOSE, FITS, LOOSE, type Match } from './match.ts';
import type { Model } from './model.ts';
import { embodiments, type FigureMatch, figureFacet } from './people.ts';
import { anchorIndex, type Result } from './results.ts';
import type { Estimate } from './score.ts';
import { ADAPTIVE } from './select.ts';
import {
  type Axis,
  type Catalogue,
  type Family,
  type Figure,
  type Party,
  SCALE,
  type State,
  type Theme,
  type Variant,
} from './types.ts';

// The results page as markup: every block the dashboard shows, written from a Result.
// Kept free of the DOM so the tests can read it. Names always stand beside their
// pictures, so every picture here is decorative to a screen reader.

export interface GlyphData {
  families: Record<string, { hue: number; strength: number; motif: string }>;
  variants: Record<string, string>;
}

export interface Portrait {
  /** Files under /quiz/portraits/, smallest first, with their widths. */
  src: [string, number][];
  width: number;
  height: number;
  credit: string;
  license: string;
  /** The file's page on Wikimedia Commons. */
  page: string;
}

export interface ViewContext {
  model: Model;
  themes: Map<string, Theme>;
  axes: Axis[];
  families: Map<string, Family>;
  variants: Map<string, Variant>;
  glyphs: GlyphData;
  catalogue: Catalogue;
  portraits: Record<string, Portrait>;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export const esc = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** A 0–1 share as the page prints it: whole percents, never a bare zero. */
export function percent(value: number): string {
  const whole = Math.round(value * 100);
  return value > 0 && whole < 1 ? '<1%' : `${whole}%`;
}

/** A match's fit, 0–100, in whole percents. */
export const fitted = (item: { fit: number }) => percent(item.fit / 100);

/**
 * How sure the quiz is of a variant, in a word: its share of the library's weight.
 * "Cao" from the share at which the questions stop because the lead is settled
 * (ADAPTIVE.confident, 0.9); then "khá cao", "vừa" and "thấp". A share, not the chance
 * that the player "is" this variant, so it is said in words, the number beside them. A
 * share is relative: a variant can hold nearly all of it and still explain the answers
 * worse than a follower's own variant would (misfit above FITS); then the word goes no
 * higher than "vừa". Where it explains them poorly (above LOOSE) it is only the least bad
 * the library has, and the word is "thấp" whatever the share.
 */
export function confidence(item: { weight: number; misfit: number }): string {
  if (item.misfit > LOOSE) return 'thấp';
  if (item.misfit > FITS) return item.weight >= 0.4 ? 'vừa' : 'thấp';
  if (item.weight >= ADAPTIVE.confident) return 'cao';
  if (item.weight >= 0.7) return 'khá cao';
  if (item.weight >= 0.4) return 'vừa';
  return 'thấp';
}

/** What stands beside the word: the share, or, for a variant that fits poorly, that it does. */
export function sureness(item: { weight: number; misfit: number }): string {
  return item.misfit > LOOSE ? 'khớp kém' : percent(item.weight);
}

/** The ring's circumference in drawing units (radius 50): its dash is set in these, never through pathLength. */
export const RING = 2 * Math.PI * 50;

/**
 * A match's figures: its fit as a ring, filled as far as the fit goes in the family's
 * pigment, the number in its middle; under or beside it, how sure the quiz is, in
 * capitals, and whatever else the caller adds (a close second, a caveat).
 */
export function figuresOf(item: Match, more = '', className = 'figures'): string {
  const fit = Math.max(0, Math.min(100, item.fit));
  const number = fitted(item);
  return `<div class="${className}">
  <div class="ring" style="--rest:${(RING * (1 - fit / 100)).toFixed(2)}">
    <svg class="ring__dial" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="ring__track" cx="60" cy="60" r="50"/><circle class="ring__arc" cx="60" cy="60" r="50"/></svg>
    <p class="ring__value"><span class="ring__number">${number.replace('%', '<span class="ring__unit">%</span>')}</span> <span class="caps ring__label">Độ khớp</span></p>
  </div>
  <div class="figures__notes">
    <p class="caps figures__sure">Mức tin cậy <span class="figures__level">${confidence(item)}</span><span aria-hidden="true"> · </span><span class="sr-only">, </span>${sureness(item)}</p>
    ${more}
  </div>
</div>`;
}

/** A variant's place on an axis or a facet, 0–100, as its expected answers put it. */
export const axisPosition = (context: ViewContext, variant: Variant, a: number) => {
  const v = context.model.variantIndex.get(variant.id) ?? 0;
  return context.model.positions[v * context.model.axes.length + a];
};
const facetPosition = (context: ViewContext, variant: Variant, f: number) => {
  const v = context.model.variantIndex.get(variant.id) ?? 0;
  return context.model.facetPositions[v * context.model.facets.length + f];
};
/** Every axis position of a variant, rounded, for the page's script. */
export const positionList = (context: ViewContext, variant: Variant) =>
  context.axes.map((_, a) => Math.round(axisPosition(context, variant, a))).join(',');

const familyOf = (context: ViewContext, variant: Variant) =>
  context.families.get(variant.family) as Family;

export function mark(context: ViewContext, variant: Variant, className = 'idea'): string {
  return `<span class="${className}" data-family="${variant.family}">${ideaMark(context.glyphs.variants[variant.id] ?? context.glyphs.families[variant.family]?.motif ?? 'disc')}</span>`;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return (first + last).toLocaleUpperCase('vi');
}

/** A person as a plate in their family's ink: their portrait, or their initials until it arrives. */
export function portrait(context: ViewContext, figure: Figure, sizes: string): string {
  const variant = context.variants.get(figure.variant);
  const family = variant?.family ?? '';
  const picture = context.portraits[figure.id];
  if (!picture)
    return `<span class="plate portrait portrait--initials" data-family="${family}"><span class="portrait__initials">${esc(initials(figure.name))}</span></span>`;
  const [first] = picture.src;
  const srcset = picture.src.map(([file, width]) => `/quiz/portraits/${file} ${width}w`).join(', ');
  return `<span class="plate portrait" data-family="${family}"><span class="plate__print"><img src="/quiz/portraits/${first[0]}" srcset="${srcset}" sizes="${sizes}" width="${picture.width}" height="${picture.height}" alt="" loading="lazy" decoding="async"></span></span>`;
}

function wiki(figure: Figure): string {
  return figure.wiki
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(figure.wiki.replace(/ /g, '_'))}`
    : '';
}

function partyCard(party: Party): string {
  const meta = [party.abbr, party.country, party.period]
    .filter(Boolean)
    .map((part) => esc(part as string));
  return `<li class="holder"><span class="holder__art holder__art--emblem">${emblemGlyph(party.emblem)}</span><span class="holder__text"><span class="holder__name">${esc(party.name)}</span><span class="holder__meta caps">${meta.join(' · ')}</span></span></li>`;
}

function stateCard(context: ViewContext, state: State): string {
  const spec = state.flag ? context.catalogue.flags[state.flag] : undefined;
  const art = state.seal || !spec ? sealGlyph() : flagGlyph(spec);
  return `<li class="holder"><span class="holder__art holder__art--flag">${art}</span><span class="holder__text"><span class="holder__name">${esc(state.name)}</span><span class="holder__meta caps">${esc(state.period)}</span>${state.note ? `<span class="holder__note">${esc(state.note)}</span>` : ''}</span></li>`;
}

/** The parties and states of one variant alone, for its profile. */
export function embodiedFor(context: ViewContext, variantId: string) {
  return embodiments(context.catalogue, variantId);
}

/** Parties and states that followed a variant, as a list of badges and flags. */
export function holders(context: ViewContext, parties: Party[], states: State[]): string {
  const items = [...parties.map(partyCard), ...states.map((state) => stateCard(context, state))];
  return items.length ? `<ul class="holders" role="list">${items.join('')}</ul>` : '';
}

/**
 * The light behind the results' glass: a pool for each of the closest variants, in its
 * family's pigment, set down the page in the order of the ranking, the nearest largest and
 * brightest (quiz.css, .field). Two close variants of one family make one colour stronger.
 */
export function field(result: Result): string {
  return result.top
    .map((item) => `<span class="field__light" data-family="${item.variant.family}"></span>`)
    .join('');
}

export function hero(context: ViewContext, result: Result): string {
  const { lead, family } = result;
  const variant = lead.variant;
  const exemplars = variant.exemplars.length
    ? `<p class="verdict__people"><span class="caps">Tiêu biểu</span> ${variant.exemplars.map(esc).join(', ')}</p>`
    : '';
  const { insufficient, close, runnerUp, centre, loose, strained, scattered } = result.verdict;
  const runner =
    close && runnerUp
      ? `<p class="verdict__close">Sát nút: <button class="verdict__link" type="button" data-profile="${runnerUp.variant.id}">${esc(runnerUp.variant.name)}</button>, độ khớp ${fitted(runnerUp)}. Hai hướng này giải thích câu trả lời của bạn gần ngang nhau.</p>`
      : '';
  const rubric = insufficient
    ? 'Chưa đủ câu trả lời để kết luận; tạm gần nhất là'
    : centre
      ? 'Bạn đứng gần giữa trên hầu hết các khía cạnh; gần nhất là'
      : loose
        ? 'Chưa hướng nào khớp rõ; gần nhất là'
        : 'Hướng gần bạn nhất';
  const limit =
    strained && !loose && !insufficient
      ? '<p class="quiz-note">Hướng này dẫn đầu nhưng giải thích câu trả lời của bạn kém hơn mức một người theo nó thường được giải thích. Có thể thư viện chưa có hướng nào gần bạn hơn: hãy đọc nó như hướng gần nhất, không như một tên gọi chắc chắn.</p>'
      : '';
  const caveat =
    limit +
    (scattered
      ? '<p class="quiz-note">Nhiều câu trả lời trong cùng một khía cạnh đi ngược nhau, nên kết quả này kém chắc. Làm lại chậm hơn có thể cho kết quả rõ hơn.</p>'
      : '');
  return `<div class="verdict" data-family="${variant.family}">
  <div class="verdict__seal">${mark(context, variant, 'idea idea--seal')}</div>
  <div class="verdict__text">
    <p class="rubric verdict__rubric"><span>${rubric}</span><span class="rubric__sep" aria-hidden="true"> · </span><span class="rubric__lead">${esc(family.family.name)}</span></p>
    <h2 class="verdict__name" id="quiz-verdict" tabindex="-1">${esc(variant.name)}</h2>
    <p class="verdict__en">${esc(variant.en)} · ${esc(variant.period)}</p>
    <p class="verdict__summary">${esc(variant.summary)}</p>
    ${exemplars}
  </div>
  ${figuresOf(lead, runner + caveat, 'figures verdict__figures')}
</div>`;
}

/**
 * How a variant stands behind the lead: its weight as a share of the lead's, the chance the
 * answers give it against the lead's, in words. "Sát nút" from the share at which the
 * verdict names a close second (match.ts, CLOSE). A share, never shown as a percent: beside
 * the fit's percent it would read as a second, unrelated score.
 */
export function standing(item: Match, lead: Match): { share: number; words: string } {
  const share = item === lead ? 1 : lead.weight > 0 ? Math.min(1, item.weight / lead.weight) : 0;
  const words =
    item === lead ? 'Kết luận' : share >= CLOSE ? 'Sát nút' : share >= 0.15 ? 'Khá gần' : 'Xa hơn';
  return { share, words };
}

/**
 * The ranking's heading: when several variants explain the answers almost equally, the list
 * is what the reader shares views with, and its order is said to be loose.
 */
export function topHeading(result: Result): { title: string; note: string } {
  const close = result.top.filter((item) => standing(item, result.lead).share >= CLOSE).length;
  const open =
    'Chạm vào một hướng để xem hồ sơ, những câu bạn khớp và lệch với nó, và so trên từng trục.';
  if (close >= 3)
    return {
      title: 'Những hướng bạn chia sẻ quan điểm',
      note: `${close === result.top.length ? 'Cả bảy' : (NUMBERS[close] ?? close)} hướng đầu giải thích câu trả lời của bạn gần ngang nhau, nên thứ tự giữa chúng chỉ để tham khảo. ${open}`,
    };
  return {
    title: 'Bảy hướng gần nhất',
    note: `Xếp theo mức mỗi hướng giải thích câu trả lời của bạn; thanh cho biết mỗi hướng theo sát hướng đầu tới đâu, mỗi phần ba thanh là một bậc mười lần. ${open}`,
  };
}
const NUMBERS = ['Không', 'Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy'];

export function topList(context: ViewContext, result: Result): string {
  const rows = result.top.map((item, i) => {
    const family = familyOf(context, item.variant);
    const lead = item === result.lead;
    const { share, words } = standing(item, result.lead);
    // The bar counts orders of magnitude: a tenth of the lead's chance is two thirds of the
    // way, a thousandth is nothing, so the far ones still read in order.
    const bar = Math.max(0.03, 1 + Math.log10(Math.max(share, 1e-6)) / 3);
    return `<li class="top__row${lead ? ' top__row--lead' : ''}" data-family="${item.variant.family}" style="--share:${bar.toFixed(3)};--i:${i}">
  <button class="top__button" type="button" data-profile="${item.variant.id}">
    <span class="top__rank" aria-hidden="true">${i + 1}</span>
    ${mark(context, item.variant, 'idea idea--row')}
    <span class="top__text"><span class="top__name">${esc(item.variant.name)}</span><span class="rubric"><span class="rubric__lead">${esc(family.name)}</span></span></span>
    <span class="top__share"><span class="top__bar" aria-hidden="true"><span></span></span><span class="top__value caps"${share >= CLOSE ? ' data-close' : ''}>${words}</span></span>
  </button>
</li>`;
  });
  return `<ol class="top" role="list">${rows.join('')}</ol>`;
}

export function embodied(context: ViewContext, result: Result): string {
  const name = esc(result.lead.variant.name);
  const family = esc(result.family.family.name);
  const lines: string[] = [];
  if (!result.parties.length && !result.states.length)
    lines.push(
      `${name} chưa có đảng phái hay nhà nước nào theo trọn vẹn: nó sống trong sách vở và phong trào nhiều hơn trong chính quyền.`,
    );
  else {
    if (result.borrowedParties)
      lines.push(`Chưa đảng nào theo trọn ${name}; đây là những đảng gần nhất trong họ ${family}.`);
    if (result.borrowedStates)
      lines.push(
        `Chưa nhà nước nào theo trọn ${name}; đây là nhà nước gần nhất trong họ ${family}.`,
      );
  }
  return `${lines.map((line) => `<p class="quiz-note">${line}</p>`).join('')}${holders(context, result.parties, result.states)}`;
}

function figureCard(context: ViewContext, item: FigureMatch, index: number): string {
  const { figure } = item;
  const variant = context.variants.get(figure.variant);
  const link = wiki(figure);
  const name = link
    ? `<a class="person__name title-link" href="${link}" rel="external noopener" target="_blank">${esc(figure.name)}<span class="sr-only"> (Wikipedia, mở thẻ mới)</span></a>`
    : `<span class="person__name">${esc(figure.name)}</span>`;
  return `<li class="person" style="--i:${index}">
  ${portrait(context, figure, '(max-width: 760px) 88px, 216px')}
  <p class="rubric"><span class="rubric__lead" data-family="${variant?.family ?? ''}">${esc(variant?.name ?? '')}</span></p>
  ${name}
  <p class="person__meta caps">${esc(figure.life)}</p>
  <p class="person__role">${esc(figure.role)}</p>
</li>`;
}

export function figures(context: ViewContext, result: Result): string {
  return `<ol class="people" role="list">${result.figures.map((item, i) => figureCard(context, item, i)).join('')}</ol>`;
}

/** Who made each portrait on the page, and under what licence. */
export function credits(context: ViewContext, result: Result): string {
  const shown = new Map<string, Figure>();
  for (const item of [...result.figures, ...result.axisFigures])
    if (item && context.portraits[item.figure.id]) shown.set(item.figure.id, item.figure);
  if (!shown.size) return '';
  const rows = [...shown.values()].map((figure) => {
    const picture = context.portraits[figure.id];
    return `<li><a href="${esc(picture.page)}" rel="external noopener" target="_blank">${esc(figure.name)}</a>: ${esc(picture.credit)} · ${esc(picture.license)}</li>`;
  });
  return `<h3 class="caps result__credits-title">Ảnh chân dung</h3><p>Từ Wikimedia Commons, in lại đơn sắc.</p><ul class="result__credits" role="list">${rows.join('')}</ul>`;
}

/** A pole in running text: its first letter in lower case. */
const lower = (text: string) => text.charAt(0).toLocaleLowerCase('vi') + text.slice(1);

const LEVEL: Record<LeanLevel, string> = {
  balanced: 'Cân bằng',
  slight: 'Hơi nghiêng',
  clear: 'Nghiêng',
  strong: 'Nghiêng mạnh',
};

/**
 * The lean of one axis in words: "Nghiêng · Thị trường", or "Cân bằng"; "Phân hoá" where
 * the player's facets point opposite ways, since the mean then says where they cancel.
 */
export function leanTag(axis: Axis, position: number, divided = false): string {
  if (divided) return 'Phân hoá';
  const lean = leanOf(position);
  return lean.side === null ? LEVEL.balanced : `${LEVEL[lean.level]} · ${axis.poles[lean.side]}`;
}

/**
 * A bar drawn from the centre out to the player, as long as the lean is strong, with the
 * lead variant's mark on it. The share of the way to each pole is printed at its end.
 */
function leanBar(axis: Axis, position: number, them: number | undefined, family: string): string {
  const lean = leanOf(position);
  const pole = (side: 0 | 1) =>
    `<span class="lean__pole"${lean.side === side ? ' data-on' : ''}><span class="lean__pole-name">${esc(axis.poles[side])}</span><span class="lean__share">${lean.share[side]}%</span></span>`;
  return `<div class="lean__scale" data-family="${family}" style="--you:${position.toFixed(1)}${them === undefined ? '' : `;--them:${them}`}">
  <div class="lean__poles">${pole(0)}${pole(1)}</div>
  <div class="lean__bar" aria-hidden="true"><span class="lean__fill"></span>${them === undefined ? '' : '<span class="lean__them"></span>'}<span class="lean__you"></span></div>
</div>`;
}

/** How firmly a lean is held, as a verb before the pole it leans to. */
const STANCE: Record<Exclude<LeanLevel, 'balanced'>, string> = {
  slight: 'hơi nghiêng về',
  clear: 'đồng tình với',
  strong: 'tin chắc vào',
};

/** A pole quoted in running text. */
const quote = (text: string) => `“${esc(lower(text))}”`;

/**
 * One sentence for each facet of an axis, set beside the person who stands nearest the
 * player on it: what the two of them hold together and how firmly, or where they part.
 */
export function facetNotes(
  axis: Axis,
  estimate: Pick<Estimate, 'facets'> & Partial<Pick<Estimate, 'every'>>,
  first: number,
  name: string,
  place: (f: number) => number,
): string {
  const who = esc(name);
  const items = axis.facets.map((facet, i): { topic: string; stance: string; text: string } => {
    const at = estimate.facets[first + i];
    const topic = esc(facet.name);
    if (at.n === 0)
      return {
        topic,
        stance: 'none',
        // The bars read the fixed questions only; answers chosen for the player do not place them.
        text: estimate.every?.facets[first + i].n
          ? `Bạn đã bỏ qua câu cố định về ${esc(lower(facet.name))}, nên ở đây bạn chưa có vị trí.`
          : `Bạn chưa trả lời câu nào về ${esc(lower(facet.name))}.`,
      };
    const them = place(first + i);
    if (Number.isNaN(them))
      return {
        topic,
        stance: 'none',
        text: `Không câu nào cho biết ${who} nghĩ gì về ${esc(lower(facet.name))}: điều ấy có thể chưa đặt ra vào thời của họ.`,
      };
    const mine = leanOf(at.mean);
    const theirs = leanOf(them);
    let stance: 'with' | 'apart' | 'middle' | 'both';
    let text: string;
    if (mine.side === null && theirs.side === null) {
      stance = 'both';
      text = `${who} và bạn cùng đứng giữa, không nghiêng hẳn về phía nào.`;
    } else if (mine.side === theirs.side && mine.side !== null) {
      stance = 'with';
      const you = Math.abs(at.mean - 50);
      const other = Math.abs(them - 50);
      const shared = leanOf(50 + Math.min(you, other)).level;
      const verb = shared === 'balanced' ? STANCE.slight : STANCE[shared];
      const more =
        Math.abs(you - other) >= 20
          ? you > other
            ? ', bạn còn đậm hơn'
            : `, ${who} còn đậm hơn`
          : '';
      text = `${who} và bạn cùng ${verb} ${quote(facet.poles[mine.side])}${more}.`;
    } else if (mine.side === null && theirs.side !== null) {
      stance = 'middle';
      text = `Bạn đứng giữa, còn ${who} ${STANCE[theirs.level as keyof typeof STANCE]} ${quote(facet.poles[theirs.side])}.`;
    } else if (theirs.side === null && mine.side !== null) {
      stance = 'middle';
      text = `Bạn ${STANCE[mine.level as keyof typeof STANCE]} ${quote(facet.poles[mine.side])}, còn ${who} đứng giữa.`;
    } else {
      stance = 'apart';
      const [a, b] = [mine.side as 0 | 1, theirs.side as 0 | 1];
      text = `Bạn ${STANCE[mine.level as keyof typeof STANCE]} ${quote(facet.poles[a])}, còn ${who} lại ${STANCE[theirs.level as keyof typeof STANCE]} ${quote(facet.poles[b])}.`;
    }
    return { topic, stance, text };
  });
  // Facets where both stand in the middle say the same thing: one sentence covers them.
  const middle = items.filter((item) => item.stance === 'both');
  const shown =
    middle.length > 1
      ? [
          ...items.filter((item) => item.stance !== 'both'),
          {
            topic: middle.map((item) => item.topic).join(' · '),
            stance: 'both',
            text: `${who} và bạn cùng đứng giữa ở ${middle.length === axis.facets.length ? `cả ${middle.length === 3 ? 'ba' : middle.length} khía cạnh` : 'hai khía cạnh'} này, không nghiêng hẳn về phía nào.`,
          },
        ]
      : items;
  const html = shown.map(
    (item) =>
      `<li class="lean__note" data-stance="${item.stance === 'both' ? 'with' : item.stance}"><span class="lean__note-topic">${item.topic}</span>${item.text}</li>`,
  );
  return `<ul class="lean__notes" role="list">${html.join('')}</ul>`;
}

/**
 * The twelve axes as cells: the side and strength of the player's lean in words and as a
 * bar, the lead variant's place on it, what that position means, and a person who stands there.
 */
export function axisRows(context: ViewContext, result: Result, estimate: Estimate): string {
  const lead = result.lead.variant;
  const { model } = context;
  const composite = coherence(model).map((item) => item.composite);
  let first = 0;
  const cells = context.axes.map((axis, a) => {
    const you = estimate.axes[a];
    const from = first;
    first += axis.facets.length;
    const answered = you.n > 0;
    const person = result.axisFigures[a];
    if (!answered)
      return `<li class="lean lean--empty" style="--i:${a}"><div class="lean__head"><h3 class="lean__name">${esc(axis.name)}</h3></div><p class="lean__reading">${estimate.every.axes[a].n ? 'Bạn đã bỏ qua các câu cố định của trục này, nên ở đây bạn chưa có vị trí.' : 'Bạn chưa trả lời câu nào của trục này.'}</p></li>`;
    const level = you.divided ? 'divided' : leanOf(you.mean).level;
    const figure = person?.figure ?? null;
    const notes = figure
      ? facetNotes(axis, estimate, from, figure.name, (f) => figureFacet(model, figure, f))
      : facetNotes(axis, estimate, from, lead.name, (f) => facetPosition(context, lead, f));
    const personLine = figure
      ? `<p class="axis__person">${portrait(context, figure, '32px')}<span>Đứng gần bạn nhất ở trục này: <strong>${esc(figure.name)}</strong></span></p>`
      : '';
    // The cell takes a breath of the colour of whoever stands with the player on it.
    const tint = (figure && context.variants.get(figure.variant)?.family) ?? lead.family;
    return `<li class="lean" data-axis="${axis.id}" data-family="${tint}" style="--i:${a}">
  <div class="lean__head"><h3 class="lean__name">${esc(axis.name)}</h3><span class="lean__tag caps" data-level="${level}">${esc(leanTag(axis, you.mean, you.divided))}</span></div>
  ${leanBar(axis, you.mean, Math.round(axisPosition(context, lead, a)), lead.family)}
  <p class="lean__reading">${you.divided ? 'Các khía cạnh của bạn ở trục này đi ngược chiều nhau, nên điểm trục là chỗ chúng bù trừ, không phải một lập trường ôn hoà. Đọc từng khía cạnh dưới đây.' : esc(axis.anchors[anchorIndex(you.mean)])}</p>
  ${composite[a] ? '<p class="quiz-note lean__composite">Trong thư viện, các khía cạnh của trục này không đi cùng nhau, nên điểm trục là trung bình của những lập trường khác nhau chứ không phải một thang duy nhất.</p>' : ''}
  ${personLine}
  ${notes}
</li>`;
  });
  return `<ol class="leans" role="list">${cells.join('')}</ol>`;
}

/** How many of the closest variants the twelve axes can be set against. */
export const REFERENCES = 4;

/**
 * The variants the twelve axes can be compared with: the lead and the next three. Picking
 * one moves the coloured mark on every axis (app.ts); the key says which mark is whose.
 */
export function axisReference(context: ViewContext, result: Result): string {
  const options = result.top.slice(0, REFERENCES).map((item, i) => {
    return `<label class="ref" data-family="${item.variant.family}">
  <input class="ref__input" type="radio" name="quiz-ref" value="${item.variant.id}" data-positions="${positionList(context, item.variant)}"${i === 0 ? ' checked' : ''}>
  <span class="ref__tick" aria-hidden="true"></span>
  <span class="ref__text"><span class="ref__name">${esc(item.variant.name)}</span><span class="ref__meta caps">${i === 0 ? 'Kết luận' : `Thứ ${i + 1} · ${standing(item, result.lead).words}`}</span></span>
</label>`;
  });
  return `<fieldset class="refs"><legend class="caps refs__legend">Vạch màu trên mỗi trục là</legend><div class="refs__options">${options.join('')}</div></fieldset>
<p class="refs__key caps" aria-hidden="true"><span class="key key--you"></span><span>Bạn</span><span class="key key--them" data-family="${result.lead.variant.family}" data-ref-key></span><span data-ref-name>${esc(result.lead.variant.name)}</span></p>`;
}

/** A point of the seven-point scale in words, lower case: an expected half step reads as the step further from the middle. */
export function answerWords(value: number): string {
  const step = Math.sign(value) * Math.ceil(Math.abs(value) - 1e-9);
  return lower(SCALE[Math.min(6, Math.max(0, step + 3))]);
}

/** Where a group of questions lives: an axis, or a theme the axes do not draw. */
function groupName(context: ViewContext, group: Group): string {
  if (group.kind === 'axis') return `trục ${esc(lower(context.axes[group.index].name))}`;
  const theme = context.themes.get(group.id);
  return theme ? `chủ đề ${esc(lower(theme.name))}` : 'các câu phân định';
}

/**
 * One answered question quoted as a reason: the statement, and on a strip of the seven
 * answers the player's own beside what an adherent of the lead (and of the runner-up,
 * when comparing) would answer.
 */
export function quoteAnswer(
  context: ViewContext,
  item: Quote,
  lead: Variant,
  other?: Variant,
): string {
  const question = context.model.questions[item.question];
  const at = (value: number) => ((value + 3) / 6).toFixed(4);
  const marks = [
    `<span class="scale7__mark scale7__mark--them" data-family="${lead.family}" style="--at:${at(item.expected)}"></span>`,
    item.other !== undefined && other
      ? `<span class="scale7__mark scale7__mark--other" data-family="${other.family}" style="--at:${at(item.other)}"></span>`
      : '',
    `<span class="scale7__mark scale7__mark--you" style="--at:${at(item.answer)}"></span>`,
  ].join('');
  const reads = [
    `<span><span class="key key--you"></span>Bạn: ${answerWords(item.answer)}</span>`,
    `<span><span class="key key--them" data-family="${lead.family}"></span>Người theo ${esc(lead.name)}: ${answerWords(item.expected)}</span>`,
    item.other !== undefined && other
      ? `<span><span class="key key--other" data-family="${other.family}"></span>Người theo ${esc(other.name)}: ${answerWords(item.other)}</span>`
      : '',
  ].join('');
  return `<figure class="quote">
  <blockquote class="quote__text"><p>${esc(question.text)}</p></blockquote>
  <div class="scale7" aria-hidden="true"><span class="scale7__rule"></span>${'<span class="scale7__tick"></span>'.repeat(7)}${marks}</div>
  <figcaption class="quote__reads">${reads}</figcaption>
</figure>`;
}

/**
 * The lead's reasons, answer by answer, from the matcher's own sums (insight.ts): the
 * answers that made it, where it explains the player worst, what sets it above the
 * runner-up, and how the player uses the scale.
 */
export function why(context: ViewContext, result: Result): string {
  const { lead, reasons, verdict: called } = result;
  const variant = lead.variant;
  const name = esc(variant.name);
  const blocks: [string, string][] = [];
  blocks.push([
    'Cùng hướng',
    reasons.support.length
      ? `<p>Những câu trả lời khớp với ${name} rõ nhất, mỗi câu từ một trục hay chủ đề khác nhau:</p>${reasons.support.map((item) => quoteAnswer(context, item, variant)).join('')}`
      : `<p>Không câu nào bạn và ${name} cùng nghiêng rõ; hồ sơ này đứng đầu vì các hồ sơ khác còn khớp kém hơn.</p>`,
  ]);
  blocks.push([
    'Chỗ khác',
    reasons.partings.length
      ? `<p>Những câu ${name} khó giải thích nhất trong câu trả lời của bạn:</p>${reasons.partings.map((item) => quoteAnswer(context, item, variant)).join('')}`
      : `<p>Không câu nào bạn lệch hẳn khỏi điều một người theo ${name} sẽ trả lời.</p>`,
  ]);
  const runner = called.runnerUp;
  const found = reasons.edge;
  if (runner) {
    const other = esc(runner.variant.name);
    let text: string;
    if (!found || found.margin < 0.5)
      text = `<p>${name} và ${other} giải thích câu trả lời của bạn gần như ngang nhau; không nhóm câu nào tách được hai hướng.</p>`;
    else {
      // Under the centre flag nothing is said about how the player uses the scale.
      const style =
        !called.centre && found.style >= 0.35
          ? ' Một phần đáng kể của cách biệt không nằm ở câu nào riêng, mà ở chỗ cách bạn dùng thang hợp với hồ sơ này hơn.'
          : '';
      text = `<p>${name} vượt ${other} chủ yếu nhờ các câu thuộc ${groupName(context, found.group)}, chiếm ${percent(found.share)} phần chênh giữa hai hướng.${style}${found.quotes.length ? ' Rõ nhất:' : ''}</p>${found.quotes.map((item) => quoteAnswer(context, item, variant, runner.variant)).join('')}`;
    }
    blocks.push(['Hơn hướng nhì', text]);
  }
  if (!called.centre) {
    const scale = lead.scale;
    const words =
      scale < 0.55
        ? `Bạn chọn mức vừa phải hơn nhiều so với một người theo ${name} thường chọn.`
        : scale < 0.9
          ? `Bạn chọn mức vừa phải hơn một chút so với một người theo ${name} thường chọn.`
          : scale <= 1.2
            ? `Bạn dùng thang gần như một người theo ${name}.`
            : `Bạn chọn hai đầu thang nhiều hơn một người theo ${name} thường chọn.`;
    const lean =
      Math.abs(lead.alpha) >= 0.5
        ? ` Bạn cũng hơi thiên về phía ${lead.alpha > 0 ? 'đồng ý' : 'phản đối'} bất kể mệnh đề nói gì; quiz trừ khuynh hướng ấy ra trước khi so.`
        : '';
    blocks.push([
      'Cách dùng thang',
      `<p>${words}${lean} Quiz so khuôn mẫu câu trả lời chứ không so độ gắt, nên điều này không làm kết quả thay đổi, và cũng không nói bạn tin sâu tới đâu.</p>`,
    ]);
  }
  return `<dl class="why">${blocks.map(([term, text]) => `<div class="why__item"><dt class="caps">${term}</dt><dd>${text}</dd></div>`).join('')}</dl>`;
}

/** A small scale for one axis with the library's median and the player on it. */
function medianBar(position: number, median: number): string {
  return `<div class="lean__bar lean__bar--median" style="--you:${position.toFixed(1)};--them:${median.toFixed(1)}" aria-hidden="true"><span class="lean__median"></span><span class="lean__you"></span></div>`;
}

/** Where the player stands apart from the library, where with much of it, and a rare pairing. */
export function apart(context: ViewContext, result: Result): string {
  const count = context.variants.size;
  const blocks: string[] = [];
  const { apart: far, common } = result.standouts;
  if (far) {
    const axis = context.axes[far.axis];
    blocks.push(`<div class="stand">
  <p class="caps stand__kicker">Chỗ bạn đi xa hơn phần lớn</p>
  <h3 class="stand__name">${esc(axis.name)}</h3>
  <p class="stand__text">Bạn nghiêng về ${esc(lower(axis.poles[far.side]))} xa hơn ${percent(far.beyond)} trong ${count} hướng tư tưởng của thư viện.</p>
  ${medianBar(far.you, far.median)}
  <p class="stand__legend caps"><span>Trung vị các hướng ${Math.round(far.median)}</span><span>Bạn ${Math.round(far.you)}</span></p>
</div>`);
  } else
    blocks.push(`<div class="stand">
  <p class="caps stand__kicker">Chỗ bạn đi xa hơn phần lớn</p>
  <p class="stand__text">Không trục nào bạn nghiêng xa hơn ba phần tư số hướng trong thư viện: bạn không đứng ở rìa trục nào.</p>
</div>`);
  if (common) {
    const axis = context.axes[common.axis];
    blocks.push(`<div class="stand">
  <p class="caps stand__kicker">Chỗ bạn đứng cùng nhiều hướng nhất</p>
  <h3 class="stand__name">${esc(axis.name)}</h3>
  <p class="stand__text">${percent(common.near)} trong ${count} hướng đứng cách bạn không quá 10 điểm trên trục này: điểm chung dễ tìm với nhiều truyền thống.</p>
  ${medianBar(common.you, common.median)}
  <p class="stand__legend caps"><span>Trung vị các hướng ${Math.round(common.median)}</span><span>Bạn ${Math.round(common.you)}</span></p>
</div>`);
  } else
    blocks.push(`<div class="stand">
  <p class="caps stand__kicker">Chỗ bạn đứng cùng nhiều hướng nhất</p>
  <p class="stand__text">Không trục nào có tới ba phần mười số hướng đứng cách bạn trong vòng 10 điểm: vị trí của bạn ít trùng với thư viện ở mọi trục.</p>
</div>`);
  const pair = result.tension;
  if (pair) {
    const first = context.axes[pair.first];
    const second = context.axes[pair.second];
    const mine = [pair.you[0] < 50 ? 0 : 1, pair.you[1] < 50 ? 0 : 1] as const;
    const usual = second.poles[1 - mine[1]];
    const names = pair.holders
      .slice(0, 3)
      .map(
        (item) =>
          `<button class="verdict__link" type="button" data-profile="${item.variant.id}">${esc(item.variant.name)}</button>`,
      );
    const holders = pair.holders.length
      ? `Chỉ ${pair.holders.length} trong ${count} hướng giữ cả hai, gần bạn nhất là ${names.join(', ')}.`
      : `Không hướng nào trong ${count} hướng của thư viện giữ cả hai.`;
    blocks.push(`<div class="stand stand--wide">
  <p class="caps stand__kicker">Một cặp hiếm gặp</p>
  <h3 class="stand__name">${esc(first.poles[mine[0]])} mà vẫn ${esc(lower(second.poles[mine[1]]))}</h3>
  <p class="stand__text">Trong thư viện, hướng nào nghiêng về ${esc(lower(first.poles[mine[0]]))} thường cũng nghiêng về ${esc(lower(usual))}; bạn đi ngược lại. ${holders}</p>
</div>`);
  }
  return `<div class="stands">${blocks.join('')}</div>`;
}

/** The variant least likely for the player, and the axes that part them most. */
export function farthest(context: ViewContext, result: Result, estimate: Estimate): string {
  const item = result.farthest;
  const variant = item.variant;
  const family = familyOf(context, variant);
  const gaps = context.axes
    .map((axis, a) => ({
      axis,
      a,
      gap: Math.abs(estimate.axes[a].mean - axisPosition(context, variant, a)),
    }))
    .filter(({ a }) => estimate.axes[a].n > 0 && !estimate.axes[a].divided)
    .sort((x, y) => y.gap - x.gap)
    .slice(0, 2)
    .map(({ axis }) => esc(lower(axis.name)));
  return `<button class="far" type="button" data-profile="${variant.id}" data-family="${variant.family}">
  ${mark(context, variant, 'idea idea--far')}
  <span class="far__text"><span class="rubric"><span class="rubric__lead">${esc(family.name)}</span></span><span class="far__name">${esc(variant.name)}</span><span class="far__value caps">Xa nhất trong ${context.variants.size} hướng</span></span>
</button>
<p class="far__summary">${esc(variant.summary)}</p>
${gaps.length ? `<p class="quiz-note">Cách bạn xa nhất ở trục ${gaps.join(' và ')}.</p>` : ''}`;
}

/** A place on one of the cube's dimensions in words: "Nghiêng · Cứng rắn", or "Cân bằng". */
export function dimensionTag(dimension: Dimension, value: number): string {
  const lean = leanOf(value);
  return lean.side === null
    ? LEVEL.balanced
    : `${LEVEL[lean.level]} · ${dimension.poles[lean.side]}`;
}

/**
 * The compass in three dimensions (compass.ts): every variant as a dot in its family's
 * colour, inked by how near it stands in the ranking, the seven nearest as numbered seals,
 * and the player with a needle from the centre and a line down to the floor. Under it, the
 * player's place on each dimension as a bar, so the cube never has to be read for a number.
 */
export function compassCube(context: ViewContext, result: Result): string {
  const top = new Set(result.top.map((item) => item.variant.id));
  const count = result.matches.length;
  const place = (variant: Variant) =>
    compass(context.axes.map((_, a) => axisPosition(context, variant, a)));
  // A dot's ink follows its rank on all the answers, not its place in these three dimensions.
  const dots: CubeDot[] = result.matches
    .map((item, rank) => ({ item, rank }))
    .filter(({ item }) => !top.has(item.variant.id))
    .reverse()
    .map(({ item, rank }) => ({
      at: place(item.variant),
      family: item.variant.family,
      name: item.variant.name,
      near: (1 - rank / count) ** 2,
    }));
  const seals = result.top.map((item, i) => ({
    at: place(item.variant),
    family: item.variant.family,
    name: item.variant.name,
    id: item.variant.id,
    rank: i + 1,
  }));
  const views = (Object.keys(VIEWS) as (keyof typeof VIEWS)[])
    .map(
      (key) =>
        `<button class="cube__view" type="button" data-view="${key}" aria-pressed="${key === 'free'}">${esc(VIEWS[key].name)}</button>`,
    )
    .join('');
  const legend = DIMENSIONS.map((dimension, d) => {
    const value = result.point[d];
    return `<div class="cube__row">
  <dt class="caps">${esc(dimension.name)}</dt>
  <dd><span class="cube__end">${esc(dimension.poles[0])}</span><span class="cube__track" style="--you:${value.toFixed(1)}" aria-hidden="true"><span></span></span><span class="cube__end">${esc(dimension.poles[1])}</span><span class="cube__tag">${esc(dimensionTag(dimension, value))}</span><span class="sr-only">: ${Math.round(value)} trên thang từ ${esc(lower(dimension.poles[0]))} (0) tới ${esc(lower(dimension.poles[1]))} (100).</span></dd>
</div>`;
  }).join('');
  return `<figure class="cube" data-cube-figure>
  <div class="cube__views" role="group" aria-label="Góc nhìn">${views}</div>
  ${cubeStage({ dots, seals, you: result.point, label: '', labelledBy: 'quiz-map-caption' })}
  <dl class="cube__legend">${legend}</dl>
  <figcaption id="quiz-map-caption" class="quiz-note">Kéo để xoay. Mặt trước là la bàn hai chiều quen thuộc; chiều sâu là thái độ trước thay đổi. Khối chỉ gộp năm trong mười hai trục, nên một trong bảy hướng gần nhất (dấu số) vẫn có thể đứng xa bạn ở đây.</figcaption>
</figure>`;
}

/** How a variant stands against the player on one axis, in a few words. */
function against(you: number, them: number): { level: LeanLevel; words: string } {
  const gap = Math.round(Math.abs(you - them));
  const mine = leanOf(you).side;
  const theirs = leanOf(them).side;
  const side =
    gap < 8
      ? 'Gần như trùng'
      : mine !== null && theirs !== null && mine !== theirs
        ? 'Ngược phía'
        : mine === null || theirs === null
          ? 'Một bên ở giữa'
          : 'Cùng phía';
  const level: LeanLevel =
    gap < 8 ? 'balanced' : gap < 20 ? 'slight' : gap < 35 ? 'clear' : 'strong';
  return { level, words: gap < 8 ? side : `${side} · lệch ${gap}` };
}

/** In a profile, the player's answers that fit the variant best and worst. */
function answerSection(context: ViewContext, item: Match, estimate: Estimate): string {
  const good = support(context.model, estimate, item, 2);
  const bad = partings(context.model, estimate, item, 2);
  if (!good.length && !bad.length) return '';
  const part = (title: string, quotes: Quote[]) =>
    quotes.length
      ? `<p class="caps profile__answers-kicker">${title}</p>${quotes.map((entry) => quoteAnswer(context, entry, item.variant)).join('')}`
      : '';
  return `<section class="profile__answers" aria-label="Câu trả lời so với hồ sơ">${part('Khớp nhất', good)}${part('Lệch nhất', bad)}</section>`;
}

/** The profile of one variant, set in the sheet: who it is, and where it stands against the player on each axis. */
export function profile(
  context: ViewContext,
  item: Match,
  estimate: Estimate,
  holdersHtml: string,
): string {
  const variant = item.variant;
  const family = familyOf(context, variant);
  const name = esc(variant.name);
  const answered = context.axes.filter((_, a) => estimate.axes[a].n > 0);
  const rows = context.axes
    .map((axis, a) => {
      const you = estimate.axes[a];
      const them = Math.round(axisPosition(context, variant, a));
      const poles = `<div class="lean__poles"><span class="lean__pole">${esc(axis.poles[0])}</span><span class="lean__pole">${esc(axis.poles[1])}</span></div>`;
      if (you.n === 0)
        return `<li class="compare__row compare__row--empty"><div class="compare__head"><h3 class="compare__name">${esc(axis.name)}</h3><span class="lean__tag caps">Bạn chưa trả lời</span></div>${poles}<div class="lean__bar compare__bar" style="--them:${them}" aria-hidden="true"><span class="lean__them"></span></div></li>`;
      const { level, words } = you.divided
        ? { level: 'divided', words: 'Bạn phân hoá' }
        : against(you.mean, them);
      const low = Math.min(you.mean, them);
      const high = Math.max(you.mean, them);
      return `<li class="compare__row"><div class="compare__head"><h3 class="compare__name">${esc(axis.name)}</h3><span class="lean__tag caps" data-level="${level}">${words}</span></div>${poles}<div class="lean__bar compare__bar" style="--you:${you.mean.toFixed(1)};--them:${them};--low:${low.toFixed(1)};--high:${high.toFixed(1)}" aria-hidden="true"><span class="compare__gap"></span><span class="lean__them"></span><span class="lean__you"></span></div><p class="sr-only">Bạn ở ${Math.round(you.mean)}, ${name} ở ${them}, trên thang từ ${esc(lower(axis.poles[0]))} (0) tới ${esc(lower(axis.poles[1]))} (100).</p></li>`;
    })
    .join('');
  // The two axes where the variant stands nearest the player, and the one where it stands
  // furthest; an axis where the player's facets cancel has no one place to measure from.
  const gaps = answered
    .filter((axis) => !estimate.axes[context.axes.indexOf(axis)].divided)
    .map((axis) => {
      const a = context.axes.indexOf(axis);
      return { axis, gap: Math.abs(estimate.axes[a].mean - axisPosition(context, variant, a)) };
    })
    .sort((x, y) => x.gap - y.gap);
  const near = gaps.slice(0, 2).map(({ axis }) => esc(lower(axis.name)));
  const far = gaps[gaps.length - 1];
  const summary =
    gaps.length >= 3
      ? `<p class="compare__summary">${name} đứng gần bạn nhất ở trục ${near.join(' và ')}, xa bạn nhất ở trục ${esc(lower(far.axis.name))}.</p>`
      : '';
  return `<div class="profile" data-family="${variant.family}">
  <div class="profile__head">
    ${mark(context, variant, 'idea idea--profile')}
    <div>
      <p class="rubric"><span class="rubric__lead">${esc(family.name)}</span></p>
      <h2 class="profile__name" id="quiz-profile-title">${name}</h2>
      <p class="verdict__en">${esc(variant.en)} · ${esc(variant.period)}</p>
    </div>
  </div>
  ${figuresOf(item, '', 'figures figures--small')}
  <p class="profile__summary">${esc(variant.summary)}</p>
  ${variant.exemplars.length ? `<p class="verdict__people"><span class="caps">Tiêu biểu</span> ${variant.exemplars.map(esc).join(', ')}</p>` : ''}
  ${holdersHtml}
  ${answerSection(context, item, estimate)}
  <section class="compare" aria-labelledby="quiz-compare">
    <p class="caps tile__kicker">So với bạn</p>
    <h3 class="compare__title" id="quiz-compare">Mười hai trục, hai vị trí</h3>
    ${summary}
    <p class="refs__key caps" aria-hidden="true"><span class="key key--you"></span><span>Bạn</span><span class="key key--them"></span><span>${name}</span></p>
    <ol class="compare__rows" role="list">${rows}</ol>
  </section>
</div>`;
}
