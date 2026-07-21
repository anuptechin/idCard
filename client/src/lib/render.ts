import { BRANDS, CARD, INK, LAYOUT, MM_PER_PT, NAME_FAMILY, PHOTO_BOX } from './constants';
import type { CardData } from '../types';

export interface RenderInput {
  data: CardData;
  logoImg: HTMLImageElement | null;
  /** Logo placement (width + vertical centre, in pt). Falls back to built-in brand values. */
  logoW?: number;
  logoCy?: number;
  photoImg: HTMLImageElement | null;
  marks?: boolean;
}

export interface Geometry {
  /** canvas backing-store size in px */
  w: number;
  h: number;
  /** card origin offset inside canvas (bleed) in px */
  ox: number;
  oy: number;
  /** px per pt */
  scale: number;
  bleedPt: number;
}

export function geometry(scale: number, marks: boolean): Geometry {
  const bleedPt = marks ? 3 / MM_PER_PT : 0;
  return {
    w: Math.round((CARD.w + 2 * bleedPt) * scale),
    h: Math.round((CARD.h + 2 * bleedPt) * scale),
    ox: bleedPt * scale,
    oy: bleedPt * scale,
    scale,
    bleedPt,
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrink font until text fits maxWidth; never below `min`. Returns px size. */
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  makeFont: (px: number) => string,
  startPx: number,
  minPx: number,
  maxWidthPx: number
): number {
  let s = startPx;
  for (; s > minPx; s -= 0.1) {
    ctx.font = makeFont(s);
    if (ctx.measureText(text).width <= maxWidthPx) break;
  }
  return s;
}

/**
 * Draw the entire card into `ctx` at `scale` px per pt.
 * Deterministic and resolution-independent — identical output at any DPI.
 */
export function renderCard(ctx: CanvasRenderingContext2D, scale: number, input: RenderInput) {
  const { logoImg, photoImg } = input;
  // Defensive defaults — never render "undefined" if a field is missing.
  const src = input.data;
  const data = {
    ...src,
    name: src.name ?? '',
    designation: src.designation ?? '',
    employeeCode: src.employeeCode ?? '',
    addressLines: Array.isArray(src.addressLines) ? src.addressLines : [],
    tel: src.tel ?? '',
    fax: src.fax ?? '',
    web: src.web ?? '',
    zoom: src.zoom || 1,
    offsetX: src.offsetX || 0,
    offsetY: src.offsetY || 0,
  };
  const g = geometry(scale, !!input.marks);
  const P = (v: number) => v * scale;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, g.w, g.h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, g.w, g.h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.translate(g.ox, g.oy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;

  /* ---------- PHOTO ---------- */
  const { x: fx, y: fy, w: fw, h: fh, r: fr } = PHOTO_BOX;
  ctx.save();
  roundRect(ctx, P(fx), P(fy), P(fw), P(fh), P(fr));
  ctx.clip();
  if (photoImg && photoImg.complete && photoImg.naturalWidth) {
    const iw = photoImg.naturalWidth;
    const ih = photoImg.naturalHeight;
    const FW = P(fw);
    const FH = P(fh);
    const base = Math.max(FW / iw, FH / ih) * data.zoom;
    const dw = iw * base;
    const dh = ih * base;
    let dx = P(fx) + (FW - dw) / 2 + P(data.offsetX);
    let dy = P(fy) + (FH - dh) / 2 + P(data.offsetY);
    dx = Math.min(P(fx), Math.max(P(fx) + FW - dw, dx));
    dy = Math.min(P(fy), Math.max(P(fy) + FH - dh, dy));
    ctx.drawImage(photoImg, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#eceae6';
    ctx.fillRect(P(fx), P(fy), P(fw), P(fh));
    ctx.fillStyle = '#b7b2a9';
    ctx.font = `${P(5.5).toFixed(1)}px BarlowR, sans-serif`;
    ctx.fillText('PHOTO', P(fx + fw / 2), P(fy + fh / 2 + 2));
    ctx.fillStyle = INK;
  }
  ctx.restore();

  // subtle frame
  ctx.lineWidth = Math.max(1, P(0.5));
  ctx.strokeStyle = '#D6D6D6';
  roundRect(ctx, P(fx), P(fy), P(fw), P(fh), P(fr));
  ctx.stroke();

  const CX = CARD.w / 2;
  ctx.fillStyle = INK;

  /* ---------- NAME ---------- */
  const nameFont = (px: number) => `200 ${px.toFixed(2)}px ${NAME_FAMILY}`;
  const ns = fitSize(ctx, data.name, nameFont, P(LAYOUT.name.size), P(LAYOUT.name.min), P(LAYOUT.name.maxW));
  ctx.font = nameFont(ns);
  ctx.fillText(data.name, P(CX), P(LAYOUT.name.baseline));

  /* ---------- DESIGNATION ---------- */
  const dFont = (px: number) => `${px.toFixed(2)}px BarlowR`;
  const dsz = fitSize(ctx, data.designation, dFont, P(LAYOUT.desig.size), P(LAYOUT.desig.min), P(LAYOUT.desig.maxW));
  ctx.font = dFont(dsz);
  ctx.fillText(data.designation, P(CX), P(LAYOUT.desig.baseline));

  /* ---------- EMPLOYEE CODE ---------- */
  ctx.font = `${P(LAYOUT.emp.size).toFixed(2)}px BarlowR`;
  ctx.fillText(LAYOUT.emp.label + data.employeeCode, P(CX), P(LAYOUT.emp.baseline));

  /* ---------- LOGO (built-in brand or custom uploaded logo) ---------- */
  const brand = BRANDS.find((b) => b.key === data.brand);
  const lw = input.logoW ?? brand?.w ?? 70;
  const lcy = input.logoCy ?? brand?.cy ?? 181;
  if (logoImg && logoImg.complete && logoImg.naturalWidth) {
    const lh = (lw * logoImg.naturalHeight) / logoImg.naturalWidth;
    ctx.drawImage(logoImg, P(CX - lw / 2), P(lcy - lh / 2), P(lw), P(lh));
  }

  /* ---------- ADDRESS ---------- */
  const lines = data.addressLines.filter((l) => l && l.length);
  let asz = LAYOUT.addr.size;
  ctx.font = `${P(asz).toFixed(2)}px BarlowR`;
  const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
  if (widest > P(LAYOUT.addr.maxW)) asz = Math.max(4, (asz * P(LAYOUT.addr.maxW)) / widest);
  ctx.font = `${P(asz).toFixed(2)}px BarlowR`;
  lines.forEach((l, i) => ctx.fillText(l, P(CX), P(LAYOUT.addr.base0 + i * LAYOUT.addr.gap)));

  /* ---------- CONTACT (mixed weight, centred) ---------- */
  const cs = LAYOUT.contact.size;
  const fR = `${P(cs).toFixed(2)}px BarlowR`;
  const fSB = `${P(cs).toFixed(2)}px BarlowSB`;
  const segs: [string, boolean][] = [];
  if (data.tel) segs.push(['T: ', true], [data.tel + '   ', false]);
  if (data.fax) segs.push(['F: ', true], [data.fax + '   ', false]);
  if (data.web) segs.push(['W: ', true], [data.web, false]);
  if (segs.length) segs[segs.length - 1][0] = segs[segs.length - 1][0].replace(/\s+$/, '');
  ctx.textAlign = 'left';
  let total = 0;
  for (const [t, bold] of segs) {
    ctx.font = bold ? fSB : fR;
    total += ctx.measureText(t).width;
  }
  let x = P(CX) - total / 2;
  for (const [t, bold] of segs) {
    ctx.font = bold ? fSB : fR;
    ctx.fillText(t, x, P(LAYOUT.contact.baseline));
    x += ctx.measureText(t).width;
  }
  ctx.textAlign = 'center';

  /* ---------- CROP MARKS ---------- */
  if (input.marks) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(1, P(0.25));
    const b = P(g.bleedPt);
    const mk = P(3);
    const corners: [number, number, number, number][] = [
      [0, 0, 1, 1],
      [CARD.w, 0, -1, 1],
      [0, CARD.h, 1, -1],
      [CARD.w, CARD.h, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(P(cx), P(cy) - sy * b);
      ctx.lineTo(P(cx), P(cy) - sy * b - sy * mk);
      ctx.moveTo(P(cx) - sx * b, P(cy));
      ctx.lineTo(P(cx) - sx * b - sx * mk, P(cy));
      ctx.stroke();
    }
  }

  ctx.restore();
}
