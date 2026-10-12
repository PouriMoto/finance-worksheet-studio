// Converts a legacy studio-core scenes.json (linear narrative/quiz/sort/tangle games) into a package folder.
// Anything the new engine cannot express is reported as a warning, never silently dropped.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

interface LegacyScene { id: string; type: string; narrationText?: string; config?: Record<string, any>; next?: string }
export interface MigrateResult { files: Record<string, string>; warnings: string[]; parts: number }

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scene';

export function convertLegacy(legacy: LegacyScene[], opts: { slug: string; title: string; category?: string; locale?: string; chunk?: number }): MigrateResult {
  const locale = opts.locale ?? 'fa';
  const chunk = opts.chunk ?? 7;
  const warnings: string[] = [];
  const used = new Set<string>();
  const uid = (raw: string) => { let id = slugify(raw); let n = 2; while (used.has(id)) id = `${slugify(raw)}-${n++}`; used.add(id); return id; };

  type Out = { structure: Record<string, unknown>; text: Record<string, unknown> };
  const outs: Out[] = [];
  let lastNarration = '';
  for (const s of legacy) {
    const id = uid(s.id);
    if (s.type === 'narrative') {
      lastNarration = s.narrationText ?? '';
      outs.push({ structure: { id, type: 'narrative' }, text: { body: s.narrationText ?? '' } });
    } else if (s.type === 'quiz') {
      const opts2 = (s.config?.options ?? []) as { text: string; correct?: boolean; feedback?: string }[];
      const hasCorrect = opts2.some((o) => o.correct);
      outs.push({
        structure: {
          id, type: hasCorrect ? 'quiz' : 'choice',
          options: opts2.map((o, i) => ({ id: `o${i + 1}`, ...(hasCorrect && o.correct ? { correct: true } : {}), dims: { concept_mastery: o.correct ? 2 : 0 } })),
        },
        text: { prompt: s.config?.question ?? '', options: Object.fromEntries(opts2.map((o, i) => [`o${i + 1}`, { label: o.text, ...(o.feedback ? { feedback: o.feedback } : {}) }])) },
      });
    } else if (s.type === 'sort') {
      const items = (s.config?.items ?? []) as string[];
      const order = (s.config?.correctOrder ?? []) as number[];
      const ids = items.map((_, i) => `i${i + 1}`);
      outs.push({
        structure: { id, type: 'sort', items: ids, correctOrder: order.map((i) => ids[i]), dims: { concept_mastery: 1 } },
        text: { prompt: s.narrationText ?? s.config?.prompt ?? lastNarration.split('\n').filter(Boolean).slice(-1)[0] ?? '', items: Object.fromEntries(items.map((t, i) => [ids[i], t])) },
      });
    } else if (s.type === 'tangle') {
      warnings.push(`${s.id}: "tangle" slider converted to a narrative; redesign it with a sim model that matches the concept`);
      outs.push({ structure: { id, type: 'narrative' }, text: { body: [s.narrationText, s.config?.outputTemplate].filter(Boolean).join('\n\n') } });
    } else {
      warnings.push(`${s.id}: type "${s.type}" is not supported by the converter; scene skipped`);
    }
  }
  if (!outs.length) throw new Error('nothing to convert');

  const groups: Out[][] = [];
  for (let i = 0; i < outs.length; i += chunk) groups.push(outs.slice(i, i + chunk));
  const files: Record<string, string> = {};
  const textParts: Record<string, unknown> = {};
  const partIds: string[] = [];
  groups.forEach((g, gi) => {
    const pid = `part-${gi + 1}`;
    partIds.push(pid);
    const last = gi === groups.length - 1;
    const scenes = [...g.map((o) => o.structure), { id: 'report', type: 'report', scope: last ? 'package' : 'part' }];
    files[`parts/${pid}.yaml`] = YAML.stringify({ id: pid, emoji: '📖', minutes: 6, scenes });
    textParts[pid] = { title: `${gi + 1}`, summary: '', scenes: Object.fromEntries(g.map((o) => [o.structure.id as string, o.text])) };
  });
  files['package.yaml'] = YAML.stringify({
    slug: opts.slug, type: 'game', emoji: '🎮', category: opts.category ?? 'general', featured: false, access: 'free', accent: 'teal',
    locales: [locale], tags: ['migrated'], level: 'beginner', minutes: groups.length * 6, dims: ['concept_mastery'], parts: partIds, related: [],
  });
  files[`locales/${locale}.yaml`] = YAML.stringify({ package: { title: opts.title, description: opts.title }, parts: textParts });
  warnings.push('part titles, summaries, package description, emoji, accent and rewards are placeholders: edit them by hand');
  return { files, warnings, parts: groups.length };
}

export function migrateFolder(srcDir: string, contentRoot: string, slug: string, category?: string): MigrateResult {
  const legacy = JSON.parse(fs.readFileSync(path.join(srcDir, 'scenes.json'), 'utf8')) as LegacyScene[];
  let title = slug;
  const metaFile = path.join(srcDir, 'game-meta.json');
  if (fs.existsSync(metaFile)) title = (JSON.parse(fs.readFileSync(metaFile, 'utf8')) as { title?: string }).title ?? slug;
  const r = convertLegacy(legacy, { slug, title, category });
  const dest = path.join(contentRoot, 'packages', slug);
  if (fs.existsSync(dest)) throw new Error(`already exists: ${dest}`);
  for (const [rel, text] of Object.entries(r.files)) {
    fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true });
    fs.writeFileSync(path.join(dest, rel), text);
  }
  return r;
}
