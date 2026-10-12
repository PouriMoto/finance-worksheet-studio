import type { DimText, ResolvedPart, ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { Card } from '../ui/card.tsx';
import { computeEvidence, confidenceOf } from '../profile.ts';
import type { PartProgress } from '../store.ts';
import { t } from '../i18n.ts';
import { BandScale } from '../viz/index.tsx';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'report' }>;

export function Report({ scene, locale, parts, currentPart, progress, dims, dimTexts, dimEmoji, onContinue }: WidgetProps<S> & {
  parts: ResolvedPart[]; currentPart: ResolvedPart; progress: Record<string, PartProgress>; dims: string[];
  dimTexts: Record<string, DimText>; dimEmoji: Record<string, string>;
}) {
  const scope = scene.scope === 'package' ? parts : [currentPart];
  const answers = Object.fromEntries(Object.entries(progress).map(([k, v]) => [k, v.answers]));
  const evidence = computeEvidence(scope, answers, dims).filter((e) => e.count > 0);
  const total = evidence.reduce((n, e) => Math.max(n, e.count), 0);
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold">📋 {t(locale, 'report.title')}</h2>
      {evidence.length === 0 && <p className="text-muted">{t(locale, 'report.empty')}</p>}
      {evidence.map((e) => {
        const txt = dimTexts[e.dim];
        if (!txt) return null;
        return (
          <Card key={e.dim} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">{dimEmoji[e.dim]} {txt.label}</h3>
              <span className="text-xs text-muted">{t(locale, 'report.basis', { n: e.count })}</span>
            </div>
            <BandScale locale={locale} ratio={e.ratio} />
            <p className="leading-8"><b>{t(locale, 'report.meaning')}: </b>{txt[e.band].meaning}</p>
            <p className="leading-8"><b>{t(locale, 'report.practice')}: </b>{txt[e.band].practice}</p>
          </Card>
        );
      })}
      {evidence.length > 0 && <p className="text-xs leading-6 text-muted">{t(locale, `report.conf.${confidenceOf(total)}`)} · {t(locale, 'report.disclaimer')}</p>}
      <Button size="lg" className="w-full" onClick={() => onContinue(scene.goto)}>{t(locale, 'btn.finish')}</Button>
    </div>
  );
}
