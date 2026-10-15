// Ấn bản: shared editorial data rules for the new publication system.
// Colour is never decorative here. Each discipline owns one ink; a plate is
// printed in the ink of an essay's first topic on the paper of its second.

export const TOPICS = [
  'Chính trị',
  'Kinh tế',
  'Căn tính',
  'Xã hội',
  'Tư tưởng',
  'Hiện đại',
] as const;
export type Topic = (typeof TOPICS)[number];

export interface Ink {
  key: 'son' | 'nghe' | 'luc' | 'lam' | 'cham' | 'tia';
  name: string;
  topic: Topic;
  slug: string;
}

export const INKS: Record<Topic, Ink> = {
  'Chính trị': { key: 'son', name: 'Son', topic: 'Chính trị', slug: 'chinh-tri' },
  'Kinh tế': { key: 'nghe', name: 'Nghệ', topic: 'Kinh tế', slug: 'kinh-te' },
  'Xã hội': { key: 'luc', name: 'Lục', topic: 'Xã hội', slug: 'xa-hoi' },
  'Hiện đại': { key: 'lam', name: 'Lam', topic: 'Hiện đại', slug: 'hien-dai' },
  'Tư tưởng': { key: 'cham', name: 'Chàm', topic: 'Tư tưởng', slug: 'tu-tuong' },
  'Căn tính': { key: 'tia', name: 'Tía', topic: 'Căn tính', slug: 'can-tinh' },
};

export const inkOf = (topic: string) => INKS[topic as Topic] ?? INKS['Tư tưởng'];

/** Ink of the first topic, paper of the second. A single topic prints on its own tint. */
export function plateOf(topics: readonly string[]) {
  const ink = inkOf(topics[0]).key;
  const paper = topics[1] ? inkOf(topics[1]).key : ink;
  return { ink, paper, id: `plate-${ink}-${paper}` };
}

/** The ink that appears most often across a set of essays (first topic weighs double). */
export function dominantInk(topicLists: readonly (readonly string[])[]) {
  const score = new Map<string, number>();
  for (const topics of topicLists)
    topics.forEach((topic, index) => {
      score.set(topic, (score.get(topic) ?? 0) + (index === 0 ? 2 : 1));
    });
  const [topic] = [...score.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['Tư tưởng'];
  return inkOf(topic);
}

const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** 1 tháng 9, 2026: the form a Vietnamese reader says aloud. */
export function longDate(date: Date) {
  return `${date.getUTCDate()} tháng ${MONTHS[date.getUTCMonth()]}, ${date.getUTCFullYear()}`;
}

/** 01.09.2026: compact and aligned in lists. */
export function shortDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

/** Same rate as the reader's own estimate, so the two never disagree. */
export function readingMinutes(body = '') {
  return Math.max(1, Math.ceil(body.split(/\s+/).length / 250));
}

export const text = (value = '') => value.normalize('NFC');
