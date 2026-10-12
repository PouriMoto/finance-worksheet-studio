import type { APIRoute } from 'astro';
import { LOCALES, SITE } from '../config';
import { articles, resolved } from '../lib/content';
import { t } from '@hormat/engine';

export const GET: APIRoute = () => {
  const lines: string[] = [`# ${t('en', 'app.name')}`, '', `> ${t('en', 'home.tagline')}`, ''];
  for (const lang of LOCALES) {
    lines.push(`## ${lang}`);
    for (const p of resolved(lang)) lines.push(`- [${p.title}](${SITE}/${lang}/p/${p.meta.slug}/): ${p.description}`);
    for (const a of articles(lang)) lines.push(`- [${a.fm.title}](${SITE}/${lang}/articles/${a.slug}/): ${a.fm.description}`);
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
