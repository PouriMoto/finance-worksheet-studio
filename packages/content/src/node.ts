// Node-only loader: reads the content folder, validates with zod, merges text per locale.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { ZodType } from 'zod';
import { EconomySchema, type Economy } from './economy.ts';
import {
  ArticleFrontmatterSchema, CategorySchema, DimDefSchema, DimTextSchema, LocaleTextSchema, PackageMetaSchema,
  PartSchema, PathSchema, partAccess,
  type ArticleFrontmatter, type Category, type DimDef, type DimText, type LocaleText, type PackageMeta,
  type Part, type PathDef, type ResolvedPackage, type ResolvedPart, type ResolvedScene,
} from './schema.ts';

export const DEFAULT_LOCALE = 'fa';
export interface Issue { level: 'error' | 'warn'; where: string; message: string }
export interface PackageData { meta: PackageMeta; parts: Part[]; texts: Record<string, LocaleText>; dir: string }
export interface Article { slug: string; locale: string; fm: ArticleFrontmatter; body: string }
export interface Content {
  root: string;
  dims: DimDef[];
  categories: Category[];
  dimTexts: Record<string, Record<string, DimText>>;
  packages: PackageData[];
  paths: PathDef[];
  articles: Article[];
  economy: Economy | null;
  issues: Issue[];
}

function readYaml(file: string): unknown {
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}
function listDir(dir: string): string[] {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

export function loadContent(root: string): Content {
  const issues: Issue[] = [];
  const rel = (p: string) => path.relative(root, p);
  function parse<T>(schema: ZodType<T>, data: unknown, where: string): T | null {
    const r = schema.safeParse(data);
    if (r.success) return r.data;
    for (const i of r.error.issues) issues.push({ level: 'error', where, message: `${i.path.join('.') || '(root)'}: ${i.message}` });
    return null;
  }
  function tryYaml(file: string): unknown {
    try { return readYaml(file); } catch (e) {
      issues.push({ level: 'error', where: rel(file), message: `YAML parse error: ${(e as Error).message}` });
      return null;
    }
  }

  // dims
  const dims: DimDef[] = [];
  const dimsFile = path.join(root, 'dims', 'registry.yaml');
  if (fs.existsSync(dimsFile)) {
    const raw = tryYaml(dimsFile);
    if (Array.isArray(raw)) for (const d of raw) { const p = parse(DimDefSchema, d, 'dims/registry.yaml'); if (p) dims.push(p); }
  }
  const dimTexts: Record<string, Record<string, DimText>> = {};
  for (const f of listDir(path.join(root, 'dims')).filter((f) => f !== 'registry.yaml' && f.endsWith('.yaml'))) {
    const locale = f.replace('.yaml', '');
    const raw = tryYaml(path.join(root, 'dims', f)) as Record<string, unknown> | null;
    dimTexts[locale] = {};
    for (const [id, v] of Object.entries(raw ?? {})) { const p = parse(DimTextSchema, v, `dims/${f}#${id}`); if (p) dimTexts[locale][id] = p; }
  }

  const categories: Category[] = [];
  const catFile = path.join(root, 'categories.yaml');
  if (fs.existsSync(catFile)) {
    const raw = tryYaml(catFile);
    if (Array.isArray(raw)) for (const c of raw) { const p = parse(CategorySchema, c, 'categories.yaml'); if (p) categories.push(p); }
  }

  // packages
  const packages: PackageData[] = [];
  for (const slug of listDir(path.join(root, 'packages'))) {
    const dir = path.join(root, 'packages', slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    const metaRaw = tryYaml(path.join(dir, 'package.yaml'));
    const meta = parse(PackageMetaSchema, metaRaw, `packages/${slug}/package.yaml`);
    if (!meta) continue;
    if (meta.slug !== slug) issues.push({ level: 'error', where: `packages/${slug}`, message: `slug "${meta.slug}" must match folder name` });
    const parts: Part[] = [];
    for (const pid of meta.parts) {
      const file = path.join(dir, 'parts', `${pid}.yaml`);
      if (!fs.existsSync(file)) { issues.push({ level: 'error', where: rel(file), message: 'part file missing' }); continue; }
      const p = parse(PartSchema, tryYaml(file), rel(file));
      if (p) { if (p.id !== pid) issues.push({ level: 'error', where: rel(file), message: `part id "${p.id}" must match file name` }); parts.push(p); }
    }
    const texts: Record<string, LocaleText> = {};
    for (const locale of meta.locales) {
      const file = path.join(dir, 'locales', `${locale}.yaml`);
      if (!fs.existsSync(file)) { issues.push({ level: 'error', where: `packages/${slug}`, message: `declared locale "${locale}" has no locales/${locale}.yaml` }); continue; }
      const t = parse(LocaleTextSchema, tryYaml(file), rel(file));
      if (t) texts[locale] = t;
    }
    packages.push({ meta, parts, texts, dir });
  }

  // paths
  const paths: PathDef[] = [];
  for (const f of listDir(path.join(root, 'paths')).filter((f) => f.endsWith('.yaml'))) {
    const p = parse(PathSchema, tryYaml(path.join(root, 'paths', f)), `paths/${f}`);
    if (p) paths.push(p);
  }

  // articles: <slug>.<locale>.md
  const articles: Article[] = [];
  for (const f of listDir(path.join(root, 'articles')).filter((f) => f.endsWith('.md'))) {
    const m = f.match(/^(.+)\.([a-z]{2})\.md$/);
    if (!m) { issues.push({ level: 'error', where: `articles/${f}`, message: 'file name must be <slug>.<locale>.md' }); continue; }
    const text = fs.readFileSync(path.join(root, 'articles', f), 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) { issues.push({ level: 'error', where: `articles/${f}`, message: 'missing frontmatter' }); continue; }
    const fm = parse(ArticleFrontmatterSchema, YAML.parse(fmMatch[1]), `articles/${f}`);
    if (fm) articles.push({ slug: m[1], locale: m[2], fm, body: fmMatch[2] });
  }

  let economy: Economy | null = null;
  const ecoFile = path.join(root, 'economy.yaml');
  if (fs.existsSync(ecoFile)) economy = parse(EconomySchema, tryYaml(ecoFile), 'economy.yaml');

  return { root, dims, categories, dimTexts, packages, paths, articles, economy, issues };
}

export type Edition = 'local' | 'cloud';

// First readable line of a scene's text, used for preview tiles of FREE scenes only.
function excerpt(x: { title?: string; prompt?: string; body?: string } | undefined): string | undefined {
  const raw = x?.title ?? x?.prompt ?? x?.body;
  if (!raw) return undefined;
  const one = raw.replace(/\s+/g, ' ').trim();
  return one.length > 70 ? `${one.slice(0, 67)}...` : one;
}

// Resolves a package for one locale. In the local edition premium parts are LOCKED: no scenes, no scene text,
// only titles, counts and scene types, so the page can show what exists without shipping the content.
export function resolvePackage(pkg: PackageData, locale: string, edition: Edition = 'cloud'): ResolvedPackage | null {
  if (!pkg.meta.locales.includes(locale)) return null;
  const text = pkg.texts[locale];
  if (!text) return null;
  const parts: ResolvedPart[] = pkg.parts.map((p) => {
    const pt = text.parts[p.id];
    const locked = edition === 'local' && partAccess(pkg.meta, p) === 'premium';
    const kinds = p.scenes.map((s) => ({ type: s.type, emoji: s.emoji, ...(locked ? {} : { title: excerpt(pt?.scenes[s.id]) }) }));
    return {
      id: p.id, emoji: p.emoji, minutes: p.minutes,
      title: pt?.title ?? p.id, summary: pt?.summary ?? '',
      locked, sceneCount: p.scenes.length, sceneKinds: kinds,
      scenes: locked ? [] : p.scenes.map((s) => ({ ...s, text: pt?.scenes[s.id] ?? {} }) as ResolvedScene),
    };
  });
  return {
    meta: pkg.meta, locale, fallback: false,
    title: text.package.title, subtitle: text.package.subtitle, description: text.package.description,
    about: text.package.about,
    gallery: pkg.meta.gallery.map((file) => ({ file, caption: text.package.gallery?.[file] })),
    author: text.package.author, rewards: text.rewards ?? [], parts,
  };
}

export function defaultContentRoot(): string {
  if (process.env.CONTENT_DIR) return path.resolve(process.env.CONTENT_DIR);
  for (const c of ['content', '../../content']) {
    const p = path.resolve(process.cwd(), c);
    if (fs.existsSync(path.join(p, 'dims'))) return p;
  }
  return path.resolve(process.cwd(), 'content');
}
