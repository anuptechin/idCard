import { useEffect, useRef, useState } from 'react';
import { renderCard, geometry } from '../lib/render';
import { CARD, MM_PER_PT } from '../lib/constants';
import { ensureFonts } from '../assets/fonts';
import { loadImage, preloadLogos, resolveLogo, type ResolvedLogo } from '../lib/images';
import { useStore } from '../store';
import type { CardData } from '../types';

interface Props {
  data: CardData;
  marks: boolean;
  bottomInset?: number;
}

export function CardCanvas({ data, marks, bottomInset = 210 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<ResolvedLogo>({ img: null, w: 70, cy: 181 });
  const [display, setDisplay] = useState({ w: 340, h: 535 });
  const patchData = useStore((s) => s.patchData);
  const drag = useRef<{ on: boolean; x: number; y: number }>({ on: false, x: 0, y: 0 });

  // fonts + logos
  useEffect(() => {
    let alive = true;
    Promise.all([ensureFonts(), preloadLogos()]).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // resolve logo (built-in brand or custom uploaded logo) whenever it changes
  useEffect(() => {
    let alive = true;
    resolveLogo(data).then((l) => alive && setLogo(l));
    return () => {
      alive = false;
    };
  }, [data.brand, data.logoUrl, ready]);

  // load photo whenever url changes
  useEffect(() => {
    let alive = true;
    if (!data.photo?.url) {
      setPhotoImg(null);
      return;
    }
    loadImage(data.photo.url)
      .then((img) => alive && setPhotoImg(img))
      .catch(() => alive && setPhotoImg(null));
    return () => {
      alive = false;
    };
  }, [data.photo?.url]);

  // responsive display size
  useEffect(() => {
    const compute = () => {
      const bleed = marks ? 3 / MM_PER_PT : 0;
      const aspect = (CARD.h + 2 * bleed) / (CARD.w + 2 * bleed);
      const wide = window.innerWidth > 1180;
      const maxW = Math.max(240, wide ? Math.min(window.innerWidth - 258 - 396 - 120, 440) : Math.min(window.innerWidth - 48, 440));
      // fixed chrome (top bar + eyebrow + foot) ≈ 168px, plus room reserved for the export bar
      const maxH = Math.max(300, Math.min(window.innerHeight - 168 - bottomInset, 680));
      let h = maxH;
      let w = h / aspect;
      if (w > maxW) {
        w = maxW;
        h = w * aspect;
      }
      setDisplay({ w: Math.round(w), h: Math.round(h) });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [marks, bottomInset]);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const bleed = marks ? 3 / MM_PER_PT : 0;
    const totalWpt = CARD.w + 2 * bleed;
    const scale = (display.w * dpr) / totalWpt;
    const g = geometry(scale, marks);
    // size the BACKING STORE (crisp), then map to CSS pixels
    if (canvas.width !== g.w) canvas.width = g.w;
    if (canvas.height !== g.h) canvas.height = g.h;
    canvas.style.width = display.w + 'px';
    canvas.style.height = display.h + 'px';
    const ctx = canvas.getContext('2d')!;
    renderCard(ctx, scale, { data, logoImg: logo.img, logoW: logo.w, logoCy: logo.cy, photoImg, marks });
  }, [data, marks, photoImg, logo, ready, display]);

  // pan
  const onPointerDown = (e: React.PointerEvent) => {
    if (!data.photo) return;
    drag.current = { on: true, x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.on) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const bleed = marks ? 3 / MM_PER_PT : 0;
    const ptPerCss = (CARD.w + 2 * bleed) / rect.width;
    patchData({
      offsetX: data.offsetX + (e.clientX - drag.current.x) * ptPerCss,
      offsetY: data.offsetY + (e.clientY - drag.current.y) * ptPerCss,
    });
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
  };
  const onPointerUp = () => {
    drag.current.on = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none' }}
    />
  );
}
