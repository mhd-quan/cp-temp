// Ấn bản: collection queries shared by the homepage and the directory pages.
import { type CollectionEntry, getCollection } from 'astro:content';
import { dominantInk, type Ink, inkOf, readingMinutes, text } from './edition';

export type Essay = CollectionEntry<'essays'>;

export interface Review {
  id: string;
  book: { title: string; author: string; year?: number; alt: string };
  cover: { source: string };
  /** Ink of the review's first discipline. */
  ink: string;
  essay: {
    id: string;
    title: string;
    subtitle?: string;
    topics: string[];
    coverImage?: string;
    date: Date;
    author: string;
  };
}

/** Every reviewed book whose review is published, newest review first. */
export async function reviewsOf(published: Essay[]): Promise<Review[]> {
  const byId = new Map(published.map((entry) => [entry.id, entry]));
  return (await getCollection('books'))
    .filter((book) => byId.has(book.data.reviewEssayId) && book.data.coverImage)
    .map((book) => {
      const essay = byId.get(book.data.reviewEssayId)!;
      return {
        id: book.id,
        book: {
          title: text(book.data.title),
          author: book.data.author,
          year: book.data.year,
          alt: book.data.coverImageAlt ?? `Bìa sách ${text(book.data.title)}`,
        },
        cover: { source: book.data.coverImage! },
        ink: inkOf(essay.data.topics[0]).key,
        essay: {
          id: essay.id,
          title: text(essay.data.title),
          subtitle: essay.data.subtitle ? text(essay.data.subtitle) : undefined,
          topics: essay.data.topics,
          coverImage: essay.data.coverImage,
          date: essay.data.date,
          author: essay.data.author,
        },
      };
    })
    .sort((a, b) => +b.essay.date - +a.essay.date);
}

export interface Volume {
  slug: string;
  name: string;
  description: string;
  featured: boolean;
  parts: Essay[];
  /** Announced parts: their place in the run is shown, their text is not. */
  upcoming: Essay[];
  ink: Ink;
  minutes: number;
  latest: number;
}

/** Every series with its published parts in order, the most recently extended first. */
export async function volumesOf(published: Essay[]): Promise<Volume[]> {
  const byId = new Map(published.map((entry) => [entry.id, entry]));
  const announced = new Map(
    (await getCollection('essays', ({ data }) => data.draft && data.comingSoon)).map((entry) => [
      entry.id,
      entry,
    ]),
  );
  return (await getCollection('series'))
    .map((entry) => {
      const parts = entry.data.essayIds
        .map((id) => byId.get(id))
        .filter((part) => part !== undefined);
      return {
        slug: entry.data.slug,
        name: text(entry.data.nameVi ?? entry.data.name),
        description: entry.data.description,
        featured: entry.data.featured,
        parts,
        upcoming: entry.data.essayIds
          .map((id) => announced.get(id))
          .filter((part) => part !== undefined),
        ink: dominantInk(parts.map((part) => part.data.topics)),
        minutes: parts.reduce((sum, part) => sum + readingMinutes(part.body), 0),
        latest: Math.max(0, ...parts.map((part) => +part.data.date)),
      };
    })
    .filter((volume) => volume.parts.length > 0)
    .sort((a, b) => b.latest - a.latest);
}
