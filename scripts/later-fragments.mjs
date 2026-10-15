import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Parts of a page that no one sees until they ask (the stories the homepage's
// topic filter deals from, beyond the eight it shows) are written into the
// page as <template data-later="name">. After the build, each is moved out of
// the page into a file of its own, named for a hash of its content, and the
// template keeps only where to fetch it (lib/editionLater.ts). The page the
// browser parses, lays out and keeps in memory is then only what is shown.
// In development the template keeps its content, and is read in place.

const LATER = /<template data-later="([a-z-]+)">([\s\S]*?)<\/template>/g;

async function* pages(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['pagefind', 'discovery', '_astro', 'images', 'downloads'].includes(entry.name))
        yield* pages(file);
    } else if (entry.name.endsWith('.html')) yield file;
  }
}

export async function moveLaterFragments(root) {
  const moved = [];
  await fs.mkdir(path.join(root, 'discovery'), { recursive: true });
  for await (const file of pages(root)) {
    const html = await fs.readFile(file, 'utf8');
    if (!html.includes('<template data-later=')) continue;
    const writes = [];
    const next = html.replace(LATER, (_, name, content) => {
      const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
      const src = `/discovery/later-${name}-${hash}.html`;
      writes.push(fs.writeFile(path.join(root, src), content));
      moved.push({ page: path.relative(root, file), src, bytes: Buffer.byteLength(content) });
      return `<template data-later="${name}" data-src="${src}"></template>`;
    });
    await Promise.all(writes);
    await fs.writeFile(file, next);
  }
  return moved;
}

export default function laterFragments() {
  return {
    name: 'tcp-later-fragments',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const moved = await moveLaterFragments(fileURLToPath(dir));
        const files = Map.groupBy(moved, ({ src }) => src);
        for (const [src, pages] of files) {
          const where = pages.length === 1 ? pages[0].page : `${pages.length} pages`;
          const size = (pages[0].bytes / 1024).toFixed(1);
          logger.info(
            `Later: ${where} hold${pages.length === 1 ? 's' : ''} ${size} KB back, at ${src}.`,
          );
        }
      },
    },
  };
}
