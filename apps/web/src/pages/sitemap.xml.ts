import type { APIRoute } from 'astro';
import { LOCALES, SITE } from '../config';
import { articles, resolved } from '../lib/content';

export const GET: APIRoute = () => {
  const urls: string[] = [];
  for (const lang of LOCALES) {
    for (const p of ['', 'archive/', 'path/', 'articles/']) urls.push(`${SITE}/${lang}/${p}`);
    for (const pkg of resolved(lang)) urls.push(`${SITE}/${lang}/p/${pkg.meta.slug}/`);
    for (const a of articles(lang)) urls.push(`${SITE}/${lang}/articles/${a.slug}/`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
