import manifest from '../../.astro/responsive-images.json';

interface ResponsiveImage {
  width: number;
  height: number;
  variants: { src: string; width: number }[];
  avifVariants: { src: string; width: number }[];
}

const images: Record<string, ResponsiveImage> = manifest;

function limitedVariants(
  variants: ResponsiveImage['variants'],
  maximumWidth = Number.POSITIVE_INFINITY,
) {
  const limited = variants.filter(({ width }) => width <= maximumWidth);
  return limited.length > 0 ? limited : variants.slice(0, 1);
}

function responsiveSrcset(
  variants: ResponsiveImage['variants'],
  maximumWidth = Number.POSITIVE_INFINITY,
) {
  return limitedVariants(variants, maximumWidth)
    .map((variant) => `${variant.src} ${variant.width}w`)
    .join(', ');
}

export function responsiveSource(
  source: string,
  sizes: string,
  maximumWidth = Number.POSITIVE_INFINITY,
) {
  return {
    type: 'image/avif',
    srcset: responsiveSrcset(images[source].avifVariants, maximumWidth),
    sizes,
  };
}

export function responsiveWebpSource(
  source: string,
  sizes: string,
  maximumWidth = Number.POSITIVE_INFINITY,
) {
  return {
    type: 'image/webp',
    srcset: responsiveSrcset(images[source].variants, maximumWidth),
    sizes,
  };
}

// The width a book is drawn on the shelf (cards.css, .shelf and .book): every
// book stands at the shelf's height and takes its own width from its cover,
// so the width is that height times the cover's ratio. The height is a
// clamp, written here as the ranges where each of its bounds holds, in
// pixels where it is fixed (only calc() is used: every browser reads it in
// `sizes`, and the list is short: it is written twice for each book). A
// phone asked for the column width (36vw) fetched a 480px file for a book
// drawn 127px wide.
export function shelfCoverSizes(width: number, height: number, lead = false) {
  const ratio = width / height;
  const px = (height: number) => `${Math.round(height * ratio)}px`;
  // 12rem on a phone (min(12rem, 50vw): a little less below 384px, where a
  // file a step larger is no loss); the lead is 1.2 times as tall there, and
  // 1.28 times from 641px.
  const phone = 192 * (lead ? 1.2 : 1);
  const scale = (ratio * (lead ? 1.28 : 1)).toFixed(3);
  const small = px(192 * (lead ? 1.28 : 1));
  return [
    px(phone) !== small && `(max-width:640px) ${px(phone)}`,
    `(max-width:889px) ${small}`,
    `(max-width:1511px) calc((7rem + 9vw) * ${scale})`,
    px(248 * (lead ? 1.28 : 1)),
  ]
    .filter(Boolean)
    .join(',');
}

// A book on the shelf is never drawn wider than 230px, so 320 and 480 cover
// every screen density; a smaller original keeps its own width.
export function bookCover(source: string, lead = false) {
  const image = images[source];
  if (!image) throw new Error(`Image missing from responsive pipeline: ${source}`);
  const pick = (variants: ResponsiveImage['variants']) => {
    const chosen = variants.filter(({ width }) => width >= 290 && width <= 480);
    return chosen.length > 0 ? chosen : variants.slice(-1);
  };
  const webp = pick(image.variants);
  const srcset = (variants: ResponsiveImage['variants']) =>
    variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
  return {
    src: (webp.find(({ width }) => width >= 320) ?? webp.at(-1)!).src,
    srcset: srcset(webp),
    avif: srcset(pick(image.avifVariants)),
    sizes: shelfCoverSizes(image.width, image.height, lead),
    width: image.width,
    height: image.height,
  };
}

export const HOME_DISCOVERY_IMAGE_SIZES =
  '(min-width: 1280px) 440px, (min-width: 896px) calc((100vw - 8rem) * 0.38), ' +
  'calc(100vw - 2.5rem)';

export const HOME_DISCOVERY_MOBILE_MAX_WIDTH = 672;

export function responsiveImage(source: string, sizes: string, fallbackWidth = 800) {
  const image = images[source];
  if (!image) throw new Error(`Image missing from responsive pipeline: ${source}`);
  const fallback =
    image.variants.find((variant) => variant.width >= fallbackWidth) ??
    image.variants[image.variants.length - 1];
  return {
    src: fallback.src,
    srcset: image.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
    sizes,
    width: image.width,
    height: image.height,
  };
}

// Metadata reuses the largest generated image; no additional browser request.
export function metadataImage(source: string) {
  const image = images[source];
  if (!image) throw new Error(`Missing metadata image: ${source}`);
  const variant = image.variants.at(-1)!;
  return { url: new URL(variant.src, 'https://cochinchinepensees.studio').href };
}
