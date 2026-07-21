import { LOGOS } from '../assets/logos';
import { BRANDS } from './constants';
import type { BrandKey, CardData } from '../types';

/** Load an HTMLImageElement and resolve when decoded. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // same-origin uploads → keeps canvas untainted
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const logoCache = new Map<BrandKey, HTMLImageElement>();
let logosReady: Promise<void> | null = null;

export function preloadLogos(): Promise<void> {
  if (logosReady) return logosReady;
  logosReady = Promise.all(
    (Object.keys(LOGOS) as BrandKey[]).map((k) =>
      loadImage(LOGOS[k]).then((img) => {
        logoCache.set(k, img);
      })
    )
  ).then(() => {});
  return logosReady;
}

export function getLogo(key: string): HTMLImageElement | null {
  return logoCache.get(key as BrandKey) ?? null;
}

export interface ResolvedLogo {
  img: HTMLImageElement | null;
  w: number;
  cy: number;
}

/** Resolve the logo for a card — a built-in brand, or a custom uploaded logo URL. */
export async function resolveLogo(data: CardData): Promise<ResolvedLogo> {
  const builtin = BRANDS.find((b) => b.key === data.brand);
  if (builtin) {
    await preloadLogos();
    return { img: getLogo(builtin.key), w: builtin.w, cy: builtin.cy };
  }
  if (data.logoUrl) {
    const img = await loadImage(data.logoUrl).catch(() => null);
    return { img, w: 70, cy: 181 };
  }
  return { img: null, w: 70, cy: 181 };
}
