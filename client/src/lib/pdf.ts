/**
 * Minimal, dependency-free PDF writer.
 * Embeds a JPEG (DCTDecode) at exact physical size — no rasterisation loss,
 * no third-party library. The page is sized in PDF points so the printed
 * card is physically correct (CR80).
 */
function strBytes(s: string): Uint8Array {
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
  return u;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export interface PdfPage {
  jpeg: Uint8Array;
  imgW: number;
  imgH: number;
}

/**
 * Multi-page PDF — one card per page, all at the exact same physical size.
 * Every page shares one content stream (`draw /Im0 full-page`); each page's
 * Resources maps /Im0 to that page's own image XObject.
 */
export function buildPdfMulti(pages: PdfPage[], pageWpt: number, pageHpt: number): Blob {
  const parts: Uint8Array[] = [];
  let len = 0;
  const offsets: number[] = [];
  const push = (u: Uint8Array) => {
    parts.push(u);
    len += u.length;
  };
  const pushs = (s: string) => push(strBytes(s));
  const obj = (n: number, body: string) => {
    offsets[n] = len;
    pushs(`${n} 0 obj\n${body}\nendobj\n`);
  };

  pushs('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // 1 catalog, 2 pages, 3 shared content; then per page: pageObj + imageObj
  const pageNo = (i: number) => 4 + i * 2;
  const imgNo = (i: number) => 5 + i * 2;

  const kids = pages.map((_, i) => `${pageNo(i)} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);

  const content = `q\n${pageWpt.toFixed(3)} 0 0 ${pageHpt.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
  obj(3, `<< /Length ${content.length} >>\nstream\n${content}endstream`);

  pages.forEach((pg, i) => {
    obj(
      pageNo(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWpt.toFixed(3)} ${pageHpt.toFixed(3)}] ` +
        `/Resources << /XObject << /Im0 ${imgNo(i)} 0 R >> >> /Contents 3 0 R >>`
    );
    offsets[imgNo(i)] = len;
    pushs(
      `${imgNo(i)} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.imgW} /Height ${pg.imgH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`
    );
    push(pg.jpeg);
    pushs('\nendstream\nendobj\n');
  });

  const total = 3 + pages.length * 2;
  const xrefStart = len;
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= total; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pushs(xref);
  pushs(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

export function buildPdf(jpeg: Uint8Array, imgW: number, imgH: number, pageWpt: number, pageHpt: number): Blob {
  const parts: Uint8Array[] = [];
  let len = 0;
  const offsets: number[] = [];
  const push = (u: Uint8Array) => {
    parts.push(u);
    len += u.length;
  };
  const pushs = (s: string) => push(strBytes(s));

  pushs('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const obj = (n: number, body: string) => {
    offsets[n] = len;
    pushs(`${n} 0 obj\n${body}\nendobj\n`);
  };

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWpt.toFixed(3)} ${pageHpt.toFixed(3)}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'
  );

  offsets[4] = len;
  pushs(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  push(jpeg);
  pushs('\nendstream\nendobj\n');

  const content = `q\n${pageWpt.toFixed(3)} 0 0 ${pageHpt.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}endstream`);

  const xrefStart = len;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pushs(xref);
  pushs(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
