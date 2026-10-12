// PDF export without libraries. Each A4 sheet is rendered by the browser itself (SVG foreignObject -> canvas -> JPEG)
// so Persian shaping, RTL and punctuation match the page; a tiny writer wraps the JPEGs into a PDF.
// Limitation: pages are images (text is not selectable). Use the print fallback for selectable text.

export const A4_W = 794;
export const A4_H = 1121;
export interface JpegPage { w: number; h: number; d: Uint8Array }

// Shrinks a sheet's content until it fits one A4 page.
export function fitSheet(sheet: HTMLElement, rtl: boolean): void {
  const inn = sheet.querySelector<HTMLElement>('.rp-in');
  if (!inn) return;
  const avail = A4_H - 38 - 60;
  inn.style.transformOrigin = rtl ? 'top right' : 'top left';
  let k = 1;
  for (let i = 0; i < 8; i++) {
    inn.style.width = `${714 / k}px`;
    inn.style.transform = `scale(${k})`;
    const vis = inn.offsetHeight * k;
    if (vis <= avail) break;
    k = (k * avail) / vis * 0.98;
  }
}

export async function sheetJpeg(el: HTMLElement, css: string, locale: string, rtl: boolean): Promise<JpegPage> {
  const S = 2;
  const html = new XMLSerializer().serializeToString(el);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W * S}" height="${A4_H * S}" viewBox="0 0 ${A4_W} ${A4_H}"><foreignObject x="0" y="0" width="${A4_W}" height="${A4_H}"><div xmlns="http://www.w3.org/1999/xhtml" dir="${rtl ? 'rtl' : 'ltr'}" lang="${locale}" style="direction:${rtl ? 'rtl' : 'ltr'};width:${A4_W}px;height:${A4_H}px"><style>/*<![CDATA[*/${css}/*]]>*/</style>${html}</div></foreignObject></svg>`;
  const img = new Image();
  await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error('svg render failed')); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; });
  const cv = document.createElement('canvas');
  cv.width = A4_W * S; cv.height = A4_H * S;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0);
  await new Promise((r) => setTimeout(r, 250)); // first pass lets the embedded font load inside the SVG image
  c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((r) => cv.toBlob((b) => r(b as Blob), 'image/jpeg', 0.92));
  return { w: cv.width, h: cv.height, d: new Uint8Array(await blob.arrayBuffer()) };
}

// Minimal PDF 1.4 writer: one A4 page per JPEG (DCTDecode).
export function makePdf(pages: JpegPage[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const xref: number[] = [];
  let off = 0;
  const push = (d: string | Uint8Array) => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); off += u.length; };
  const obj = (n: number, body: string) => { xref[n] = off; push(`${n} 0 obj\n${body}\nendobj\n`); };
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((j, i) => {
    const pg = 3 + 3 * i, ct = pg + 1, im = pg + 2, c = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
    obj(ct, `<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    xref[im] = off;
    push(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.d.length} >>\nstream\n`);
    push(j.d);
    push('\nendstream\nendobj\n');
  });
  const n = 3 + 3 * pages.length, xo = off;
  let x = `xref\n0 ${n}\n0000000000 65535 f \n`;
  for (let k = 1; k < n; k++) x += `${String(xref[k]).padStart(10, '0')} 00000 n \n`;
  push(`${x}trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

// Embeds fonts as base64 @font-face so the SVG image never needs the network.
export async function embedFontCss(fonts: { url: string; range: string }[], family = 'ReportFont'): Promise<string> {
  const rules: string[] = [];
  for (const f of fonts) {
    const buf = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    rules.push(`@font-face{font-family:'${family}';font-weight:100 900;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');unicode-range:${f.range}}`);
  }
  return rules.join('\n');
}
export const VAZIR_RANGES = {
  arabic: 'U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE80-FEFC',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Native share sheet with the file when supported, otherwise a normal download.
export async function sharePdf(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
