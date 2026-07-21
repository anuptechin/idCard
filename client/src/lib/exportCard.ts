import { renderCard, geometry } from './render';
import { CARD, MM_PER_PT } from './constants';
import { buildPdf, buildPdfMulti, base64ToBytes, type PdfPage } from './pdf';
import { loadImage, resolveLogo } from './images';
import type { CardData } from '../types';

export interface ExportOpts {
  dpi: number;
  marks: boolean;
}

export async function renderToCanvas(data: CardData, opts: ExportOpts): Promise<HTMLCanvasElement> {
  const photoImg = data.photo ? await loadImage(data.photo.url).catch(() => null) : null;
  const logo = await resolveLogo(data);
  const scale = opts.dpi / 72;
  const g = geometry(scale, opts.marks);
  const canvas = document.createElement('canvas');
  canvas.width = g.w;
  canvas.height = g.h;
  const ctx = canvas.getContext('2d')!;
  renderCard(ctx, scale, { data, logoImg: logo.img, logoW: logo.w, logoCy: logo.cy, photoImg, marks: opts.marks });
  return canvas;
}

function fileBase(data: CardData): string {
  const n = (data.name || 'ID-Card').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${n}${data.employeeCode ? '_' + data.employeeCode : ''}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportPng(data: CardData, opts: ExportOpts): Promise<void> {
  const canvas = await renderToCanvas(data, opts);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  download(blob, `${fileBase(data)}_${opts.dpi}dpi.png`);
}

export async function exportPdf(data: CardData, opts: ExportOpts): Promise<void> {
  const dpi = Math.max(opts.dpi, 600); // PDF embeds JPEG; keep it crisp
  const canvas = await renderToCanvas(data, { ...opts, dpi });
  const jpegB64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  const bleedPt = opts.marks ? 3 / MM_PER_PT : 0;
  const blob = buildPdf(
    base64ToBytes(jpegB64),
    canvas.width,
    canvas.height,
    CARD.w + 2 * bleedPt,
    CARD.h + 2 * bleedPt
  );
  download(blob, `${fileBase(data)}.pdf`);
}

export async function exportPrint(data: CardData, opts: ExportOpts): Promise<string> {
  const canvas = await renderToCanvas(data, { ...opts, dpi: Math.max(opts.dpi, 600) });
  return canvas.toDataURL('image/png');
}

/** Batch: render every card and emit ONE multi-page PDF (one card per page). */
export async function exportAllPdf(
  items: { name: string; data: CardData }[],
  opts: ExportOpts,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const dpi = Math.max(opts.dpi, 600);
  const bleedPt = opts.marks ? 3 / MM_PER_PT : 0;
  const pages: PdfPage[] = [];
  for (let i = 0; i < items.length; i++) {
    const canvas = await renderToCanvas(items[i].data, { ...opts, dpi });
    const jpegB64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    pages.push({ jpeg: base64ToBytes(jpegB64), imgW: canvas.width, imgH: canvas.height });
    onProgress?.(i + 1, items.length);
    // release memory + let the UI breathe between cards
    canvas.width = canvas.height = 0;
    await new Promise((r) => setTimeout(r, 0));
  }
  const blob = buildPdfMulti(pages, CARD.w + 2 * bleedPt, CARD.h + 2 * bleedPt);
  const stamp = new Date().toISOString().slice(0, 10);
  download(blob, `DDECOR_ID_Cards_${items.length}_${stamp}.pdf`);
}
