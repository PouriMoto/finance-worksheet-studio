// Build-time content access for pages (server only). Never import this inside a React island.
import { loadContent, resolvePackage, defaultContentRoot, type Content, type PackageData } from '@hormat/content/node';
import { EDITION } from '../config';
import type { ResolvedPackage } from '@hormat/content/schema';
import type { CatalogItem } from '@hormat/engine';

let cache: Content | null = null;
export function content(): Content {
  return (cache ??= loadContent(defaultContentRoot()));
}
export function packages(): PackageData[] {
  return content().packages;
}
// Premium parts come back locked in the local edition (titles and counts only, never scenes or text).
export function resolved(locale: string): ResolvedPackage[] {
  return packages().map((p) => resolvePackage(p, locale, EDITION)).filter((p): p is ResolvedPackage => p !== null);
}
export function findPackage(locale: string, slug: string): ResolvedPackage | undefined {
  return resolved(locale).find((p) => p.meta.slug === slug);
}
export const href = (locale: string, ...segments: string[]) => `/${[locale, ...segments].join('/')}/`;

export function catalog(locale: string): CatalogItem[] {
  return resolved(locale).map((p) => ({
    slug: p.meta.slug, title: p.title, emoji: p.meta.emoji, accent: p.meta.accent, type: p.meta.type,
    minutes: p.meta.minutes, level: p.meta.level, tags: p.meta.tags, subtitle: p.subtitle, description: p.description,
    parts: p.parts.map((x) => ({ id: x.id, title: x.title, locked: x.locked })), next: p.meta.next, href: href(locale, 'p', p.meta.slug),
    category: p.meta.category, featured: p.meta.featured,
    access: p.parts.every((x) => x.locked) ? ('premium' as const) : p.parts.some((x) => x.locked) ? ('mixed' as const) : ('free' as const),
  }));
}
export function articles(locale: string) {
  return content().articles.filter((a) => a.locale === locale).sort((a, b) => b.fm.date.localeCompare(a.fm.date));
}
export function dimTextsFor(locale: string, dims: string[]) {
  const all = content().dimTexts[locale] ?? {};
  return Object.fromEntries(dims.filter((d) => all[d]).map((d) => [d, all[d]]));
}
export function dimEmoji(dims: string[]) {
  return Object.fromEntries(content().dims.filter((d) => dims.includes(d.id)).map((d) => [d.id, d.emoji]));
}

export function categoriesFor(locale: string, items: { category: string }[]) {
  const used = new Set(items.map((i) => i.category));
  return content().categories.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, emoji: c.emoji, label: c.label[locale] ?? c.id }));
}
