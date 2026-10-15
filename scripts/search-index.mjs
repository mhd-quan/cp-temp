import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { close, createIndex } from 'pagefind';

export default function searchIndex() {
  let outputDir;
  return {
    name: 'tcp-search-index',
    hooks: {
      'astro:config:done': ({ config }) => {
        outputDir = fileURLToPath(config.outDir);
      },
      'astro:server:setup': ({ server }) => {
        // Preview the latest built index on the dev origin as well as the static preview.
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !['GET', 'HEAD'].includes(req.method ?? '')) return next();
          const pathname = new URL(req.url, 'http://localhost').pathname;
          if (!pathname.startsWith('/pagefind/')) return next();
          const directory = resolve(outputDir, 'pagefind');
          const path = resolve(outputDir, `.${pathname}`);
          if (!path.startsWith(directory + sep)) return next();
          try {
            const bytes = await readFile(path);
            const types = {
              '.js': 'text/javascript',
              '.json': 'application/json',
              '.css': 'text/css',
              '.wasm': 'application/wasm',
            };
            res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(req.method === 'HEAD' ? undefined : bytes);
          } catch {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const path = fileURLToPath(dir);
        // Keep Vietnamese and English essays in the same searchable collection.
        const { index, errors } = await createIndex({ forceLanguage: 'vi' });
        try {
          if (errors.length || !index)
            throw new Error(errors.join('\n') || 'Cannot create search index');
          const result = await index.addDirectory({ path });
          if (result.errors.length) throw new Error(result.errors.join('\n'));
          if (!result.page_count) throw new Error('Search index contains no published articles');
          const written = await index.writeFiles({ outputPath: `${path}/pagefind` });
          if (written.errors.length) throw new Error(written.errors.join('\n'));
          const entry = JSON.parse(await readFile(`${path}/pagefind/pagefind-entry.json`, 'utf8'));
          const count = Object.values(entry.languages).reduce(
            (total, language) => total + language.page_count,
            0,
          );
          logger.info(`Search: ${count} published articles indexed; loaded only on demand.`);
        } finally {
          await close();
        }
      },
    },
  };
}
