// Content gate: everything an AI agent or a human writes must pass this before merge.
import fs from 'node:fs';
import path from 'node:path';
import { BANDS, partAccess } from './schema.ts';
import { checkEconomy } from './economy.ts';
import { DEFAULT_LOCALE, loadContent, type Content, type Issue } from './node.ts';

export function validateContent(root: string): { content: Content; issues: Issue[] } {
  const content = loadContent(root);
  const issues: Issue[] = [...content.issues];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warn', where, message });

  const dimIds = new Set(content.dims.map((d) => d.id));
  const slugs = new Set(content.packages.map((p) => p.meta.slug));
  const articleSlugs = new Set(content.articles.map((a) => a.slug));

  for (const pkg of content.packages) {
    const w = `packages/${pkg.meta.slug}`;
    if (!pkg.meta.locales.includes(DEFAULT_LOCALE)) err(w, `must declare the default locale "${DEFAULT_LOCALE}"`);

    const cat = content.categories.find((c) => c.id === pkg.meta.category);
    if (!cat) err(w, `category "${pkg.meta.category}" is not in categories.yaml`);
    else for (const l of pkg.meta.locales) if (!cat.label[l]) err(w, `category "${cat.id}" has no "${l}" label`);
    for (const d of pkg.meta.dims) if (!dimIds.has(d)) err(w, `dim "${d}" is not in dims/registry.yaml`);
    const used = new Set<string>();
    for (const part of pkg.parts) {
      for (const s of part.scenes) {
        const weights = s.type === 'choice' || s.type === 'quiz' ? s.options.map((o) => o.dims ?? {}) : (s.type === 'sort' || s.type === 'match') && s.dims ? [s.dims] : [];
        for (const wts of weights) for (const k of Object.keys(wts)) {
          used.add(k);
          if (!pkg.meta.dims.includes(k)) err(`${w}/${part.id}/${s.id}`, `dim "${k}" used but not listed in package dims`);
        }
      }
    }
    for (const d of pkg.meta.dims) if (!used.has(d)) warn(w, `dim "${d}" is declared but no scene scores it`);
    if (!pkg.parts.some((p) => p.scenes.some((s) => s.type === 'report'))) warn(w, 'no report scene: users get no feedback');
    if (pkg.parts.length && pkg.parts.every((p) => partAccess(pkg.meta, p) === 'premium')) warn(w, 'every part is premium: add a free preview part');

    // locale completeness
    for (const locale of pkg.meta.locales) {
      const t = pkg.texts[locale];
      if (!t) continue;
      const lw = `${w}/locales/${locale}`;
      for (const d of pkg.meta.dims) {
        const dt = content.dimTexts[locale]?.[d];
        if (!dt) err(lw, `dims/${locale}.yaml is missing "${d}"`);
      }
      if (!t.rewards?.length) warn(lw, 'no rewards pool (variable rewards will use generic text)');
      for (const part of pkg.parts) {
        const pt = t.parts[part.id];
        if (!pt) { err(lw, `missing text for part "${part.id}"`); continue; }
        for (const s of part.scenes) {
          const x = pt.scenes[s.id];
          const at = `${lw}/${part.id}/${s.id}`;
          if (!x && s.type !== 'report') { err(at, 'missing scene text'); continue; }
          if (!x) continue;
          if (s.type === 'narrative' && !x.body) err(at, 'narrative needs "body"');
          if (s.type === 'choice' || s.type === 'quiz') {
            if (!x.prompt) err(at, 'needs "prompt"');
            for (const o of s.options) {
              if (!x.options?.[o.id]?.label) err(at, `option "${o.id}" needs a label`);
              else if (!x.options[o.id].feedback) warn(at, `option "${o.id}" has no feedback`);
            }
          }
          if (s.type === 'sim') {
            if (!x.prompt) err(at, 'needs "prompt"');
            for (const i of s.inputs) if (!x.inputs?.[i.id]?.label) err(at, `input "${i.id}" needs a label`);
          }
          if (s.type === 'sort') {
            if (!x.prompt) err(at, 'needs "prompt"');
            for (const i of s.items) if (!x.items?.[i]) err(at, `item "${i}" needs text`);
          }
          if (s.type === 'match') {
            if (!x.prompt) err(at, 'needs "prompt"');
            for (const id of s.pairs) if (!x.pairs?.[id]?.left || !x.pairs?.[id]?.right) err(at, `pair "${id}" needs left and right text`);
          }
          if (s.type === 'reflect') {
            if (!x.prompt) err(at, 'needs "prompt"');
            if (s.mode === 'pick') for (const o of s.options ?? []) if (!x.options?.[o]?.label) err(at, `option "${o}" needs a label`);
          }
        }
      }
    }

    // media
    for (const f of pkg.meta.gallery) if (!fs.existsSync(path.join(root, 'media', f))) err(w, `gallery file "${f}" not found in content/media`);
    for (const locale of pkg.meta.locales) {
      const t = pkg.texts[locale];
      for (const m of (t?.package.about ?? '').matchAll(/media:([^\s)"']+)/g)) if (!fs.existsSync(path.join(root, 'media', m[1]))) err(`${w}/locales/${locale}`, `about references missing media "${m[1]}"`);
    }
    // links
    if (pkg.meta.next && !slugs.has(pkg.meta.next)) err(w, `next "${pkg.meta.next}" does not exist`);
    if (pkg.meta.next === pkg.meta.slug) err(w, 'next points to itself');
    for (const r of pkg.meta.related) if (!slugs.has(r)) err(w, `related "${r}" does not exist`);
  }

  // next-chain cycles
  for (const pkg of content.packages) {
    const seen = new Set<string>([pkg.meta.slug]);
    let cur = pkg.meta.next;
    while (cur && slugs.has(cur)) {
      if (seen.has(cur)) { err(`packages/${pkg.meta.slug}`, `"next" chain has a cycle at "${cur}"`); break; }
      seen.add(cur);
      cur = content.packages.find((p) => p.meta.slug === cur)?.meta.next;
    }
  }

  // paths + orphans
  const reachable = new Set<string>();
  for (const p of content.paths) {
    for (const it of p.items) {
      if (it.type === 'package') { if (!slugs.has(it.slug)) err(`paths/${p.id}`, `package "${it.slug}" does not exist`); else reachable.add(it.slug); }
      else if (!articleSlugs.has(it.slug)) err(`paths/${p.id}`, `article "${it.slug}" does not exist`);
    }
  }
  for (const pkg of content.packages) { if (pkg.meta.next) reachable.add(pkg.meta.next); for (const r of pkg.meta.related) reachable.add(r); }
  for (const pkg of content.packages) if (!reachable.has(pkg.meta.slug)) warn(`packages/${pkg.meta.slug}`, 'orphan: not in any path, next or related');

  for (const a of content.articles) for (const m of a.body.matchAll(/media:([^\s)"']+)/g)) if (!fs.existsSync(path.join(root, 'media', m[1]))) err(`articles/${a.slug}.${a.locale}.md`, `references missing media "${m[1]}"`);
  for (const a of content.articles) for (const s of a.fm.packages) if (!slugs.has(s)) err(`articles/${a.slug}.${a.locale}.md`, `package "${s}" does not exist`);
  for (const [locale, texts] of Object.entries(content.dimTexts)) for (const [id] of Object.entries(texts)) if (!dimIds.has(id)) warn(`dims/${locale}.yaml`, `unknown dim "${id}"`);
  void BANDS;
  const ecoFile = path.join(root, 'economy.yaml');
  if (!fs.existsSync(ecoFile)) warn('economy.yaml', 'missing: tokens/points rules are not defined');
  else if (content.economy) for (const m of checkEconomy(content.economy)) err('economy.yaml', m);
  return { content, issues };
}

// Fails when code (not content) contains Arabic-script characters: all UI text must come from locale files.
export function lintI18n(repoRoot: string): Issue[] {
  const issues: Issue[] = [];
  const roots = ['packages/content/src', 'packages/engine/src', 'apps/web/src', 'apps/web/public/sw.js'];
  const exts = new Set(['.ts', '.tsx', '.astro', '.css', '.mjs', '.js']);
  const arabic = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const walk = (p: string) => {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (path.basename(p) === 'locales' || path.basename(p) === 'node_modules') return;
      for (const f of fs.readdirSync(p)) walk(path.join(p, f));
    } else if (exts.has(path.extname(p))) {
      fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (arabic.test(line)) issues.push({ level: 'error', where: `${path.relative(repoRoot, p)}:${i + 1}`, message: 'Persian/Arabic text in code: move it to a locale file' });
      });
    }
  };
  for (const r of roots) walk(path.join(repoRoot, r));
  return issues;
}
