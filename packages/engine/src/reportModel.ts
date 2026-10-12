// Pure report model: everything the on-screen report and the PDF sheets display, computed once and testable without a DOM.
import type { DimText, ResolvedPart } from '@hormat/content/schema';
import type { AppState } from './store.ts';
import { computeEvidence, confidenceOf, type Confidence } from './profile.ts';
import { currentStreak, dayKey } from './streak.ts';

export interface ScoringPart { id: string; scenes: { id: string; type: string; options?: { id: string; dims?: Record<string, number> }[]; dims?: Record<string, number> }[] }
export type ScoringIndex = Record<string, { dims: string[]; parts: ScoringPart[] }>;
export interface CatalogLite { slug: string; title: string; emoji: string; parts: { id: string }[] }

export interface DimLine { dim: string; label: string; emoji: string; ratio: number; band: 'low' | 'mid' | 'high'; count: number; meaning: string; practice: string }
export interface ReportPackage { slug: string; title: string; emoji: string; partsDone: number; partsTotal: number; confidence: Confidence; dims: DimLine[] }
export interface ReportModel {
  generatedAt: string; xp: number; streak: number; partsDone: number; partsTotal: number;
  packages: ReportPackage[];
  notes: { pkgTitle: string; kind: 'goal' | 'note'; text: string }[];
}

export function buildReportModel(i: {
  catalog: CatalogLite[]; scoring: ScoringIndex; dimTexts: Record<string, DimText>; dimEmoji: Record<string, string>;
  state: AppState; includeNotes: boolean; now?: Date;
}): ReportModel {
  const { state } = i;
  const packages: ReportPackage[] = [];
  for (const c of i.catalog) {
    const prog = state.progress[c.slug];
    const started = c.parts.some((p) => prog?.[p.id] && Object.keys(prog[p.id].answers).length > 0);
    const done = c.parts.filter((p) => prog?.[p.id]?.done).length;
    if (!started && done === 0) continue;
    const sc = i.scoring[c.slug];
    if (!sc) continue;
    const answers = Object.fromEntries(Object.entries(prog ?? {}).map(([k, v]) => [k, v.answers]));
    const parts = sc.parts.map((p) => ({ ...p, scenes: p.scenes.map((x) => ({ ...x, text: {} })) })) as unknown as ResolvedPart[];
    const ev = computeEvidence(parts, answers, sc.dims).filter((e) => e.count > 0);
    const dims: DimLine[] = ev.flatMap((e) => {
      const txt = i.dimTexts[e.dim];
      return txt ? [{ dim: e.dim, label: txt.label, emoji: i.dimEmoji[e.dim] ?? '', ratio: e.ratio, band: e.band, count: e.count, meaning: txt[e.band].meaning, practice: txt[e.band].practice }] : [];
    });
    packages.push({ slug: c.slug, title: c.title, emoji: c.emoji, partsDone: done, partsTotal: c.parts.length, confidence: confidenceOf(Math.max(0, ...dims.map((d) => d.count))), dims });
  }
  const title = (slug: string) => i.catalog.find((c) => c.slug === slug)?.title ?? slug;
  return {
    generatedAt: (i.now ?? new Date()).toISOString(),
    xp: state.xp,
    streak: currentStreak({ days: state.days, freezeDays: state.freezeDays, freezes: state.freezes }, dayKey(i.now ?? new Date())),
    partsDone: packages.reduce((n, p) => n + p.partsDone, 0),
    partsTotal: packages.reduce((n, p) => n + p.partsTotal, 0),
    packages,
    notes: i.includeNotes ? state.notes.map((n) => ({ pkgTitle: title(n.pkg), kind: n.kind, text: n.text })) : [],
  };
}
