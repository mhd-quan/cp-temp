import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('.astro/responsive-images.json', root), 'utf8'));

test('every advertised AVIF and WebP candidate is deployed with the promised dimensions', async () => {
  for (const [source, image] of Object.entries(manifest)) {
    assert.deepEqual(
      image.avifVariants.map((v) => v.width),
      image.variants.map((v) => v.width),
      source,
    );
    for (const variant of [...image.variants, ...image.avifVariants]) {
      const file = new URL(`dist${variant.src}`, root);
      assert.ok((await stat(file)).size > 0, variant.src);
      const metadata = await sharp(fileURLToPath(file)).metadata();
      assert.equal(metadata.width, variant.width, variant.src);
      assert.ok(variant.width <= image.width, `Must not upscale ${source}`);
      assert.ok(
        Math.abs(metadata.height - (variant.width * image.height) / image.width) <= 1,
        variant.src,
      );
      assert.equal(metadata.format, variant.src.endsWith('.webp') ? 'webp' : 'heif', variant.src);
    }
  }
});

test('homepage illustration retains priority, dimensions and responsive WebP candidates', async () => {
  const home = await readFile(new URL('dist/index.html', root), 'utf8');
  const image = home.match(/<a class="cover__plate"[\s\S]*?(<img\b[^>]*>)/)[1];
  assert.match(image, /src="[^"]+\.webp"/);
  assert.match(image, /loading="eager"/);
  assert.match(image, /fetchpriority="high"/);
  assert.match(image, /width="\d+"/);
  assert.match(image, /height="\d+"/);
  assert.match(image, /srcset="[^"]+"/);
  assert.match(image, /sizes="[^"]+"/);
  for (const [, src] of image.matchAll(/(\/images\/responsive\/[^\s",]+\.webp)/g))
    assert.ok((await stat(new URL(`dist${src}`, root))).size > 0);
});
