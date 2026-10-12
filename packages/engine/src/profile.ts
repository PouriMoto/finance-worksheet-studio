// Deterministic behaviour profile: rules compute evidence; AI (later) may only explain it.
import type { Band, ResolvedPart } from '@hormat/content/schema';
import type { Answer } from './store.ts';

export interface DimEvidence { dim: string; score: number; max: number; count: number; ratio: number; band: Band }
export type Confidence = 'low' | 'medium' | 'high';

export function bandOf(ratio: number): Band {
  return ratio >= 0.67 ? 'high' : ratio >= 0.34 ? 'mid' : 'low';
}

export function computeEvidence(
  parts: ResolvedPart[],
  answers: Record<string, Record<string, Answer>>,
  dims: string[],
): DimEvidence[] {
  const acc: Record<string, { score: number; max: number; count: number }> = {};
  for (const d of dims) acc[d] = { score: 0, max: 0, count: 0 };
  for (const part of parts) {
    const pa = answers[part.id] ?? {};
    for (const scene of part.scenes) {
      const a = pa[scene.id];
      if (!a) continue;
      if ((scene.type === 'choice' || scene.type === 'quiz') && a.kind === 'option') {
        const chosen = scene.options.find((o) => o.id === a.optionId);
        for (const d of dims) {
          const present = scene.options.some((o) => o.dims && d in o.dims);
          if (!present) continue;
          const max = Math.max(...scene.options.map((o) => o.dims?.[d] ?? 0));
          acc[d].score += chosen?.dims?.[d] ?? 0;
          acc[d].max += max;
          acc[d].count += 1;
        }
      } else if (scene.type === 'match' && scene.dims && a.kind === 'match') {
        const frac = 1 - Math.min(1, a.mistakes / Math.max(1, scene.pairs.length));
        for (const d of dims) {
          const w = scene.dims[d];
          if (w === undefined) continue;
          acc[d].score += w * frac;
          acc[d].max += w;
          acc[d].count += 1;
        }
      } else if (scene.type === 'sort' && scene.dims && a.kind === 'sort') {
        for (const d of dims) {
          const w = scene.dims[d];
          if (w === undefined) continue;
          acc[d].score += a.correct ? w : 0;
          acc[d].max += w;
          acc[d].count += 1;
        }
      }
    }
  }
  return dims.map((dim) => {
    const x = acc[dim];
    const ratio = x.max > 0 ? Math.min(1, Math.max(0, x.score / x.max)) : 0;
    return { dim, ...x, ratio, band: bandOf(ratio) };
  });
}

export function confidenceOf(count: number): Confidence {
  return count < 3 ? 'low' : count < 6 ? 'medium' : 'high';
}
