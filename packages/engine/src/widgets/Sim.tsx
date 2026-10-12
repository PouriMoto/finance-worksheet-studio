import { useMemo, useState } from 'react';
import type { ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { EmojiTile } from '../ui/card.tsx';
import { fmtNumber, t } from '../i18n.ts';
import { runSim } from '../models.ts';
import { CoinViz, PriceValueViz, RunwayViz, StackViz } from '../viz/index.tsx';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'sim' }>;

export function Sim({ scene, locale, saved, onAnswer, onContinue, accent }: WidgetProps<S> & { accent: string }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    saved?.kind === 'sim' ? saved.values : Object.fromEntries(scene.inputs.map((i) => [i.id, i.default])),
  );
  const res = useMemo(() => runSim(scene.model, values), [scene.model, values]);
  const unit = (u: string) => (u === 'none' ? '' : t(locale, `unit.${u}`));

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <EmojiTile emoji={scene.emoji ?? '🎚️'} accent={accent} size="sm" />
        <h2 className="text-lg font-bold leading-8">{scene.text.prompt}</h2>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        {scene.model === 'runway' && <RunwayViz locale={locale} months={res.value} band={res.band} />}
        {scene.model === 'purchasing-power' && <CoinViz locale={locale} amount={values.amount} real={res.value} years={values.years} unit={t(locale, 'unit.million')} />}
        {scene.model === 'margin-of-safety' && <PriceValueViz locale={locale} value={values.value} price={values.price} margin={res.value} />}
        {scene.model === 'rebalance' && <StackViz locale={locale} share={res.value} target={res.extra.target} />}
      </div>
      <div className="space-y-4">
        {scene.inputs.map((i) => (
          <label key={i.id} className="block">
            <span className="flex justify-between text-sm font-semibold">
              <span>{scene.text.inputs?.[i.id]?.label}</span>
              <span className="tabular-nums">{fmtNumber(locale, values[i.id])} {unit(i.unit)}</span>
            </span>
            <input
              type="range" min={i.min} max={i.max} step={i.step} value={values[i.id]}
              onChange={(e) => setValues((v) => ({ ...v, [i.id]: Number(e.target.value) }))}
              className="mt-2 w-full accent-brand" dir="ltr"
            />
          </label>
        ))}
      </div>
      {scene.text.explain && <p className="rounded-xl bg-brand-soft p-3 text-sm leading-7">{scene.text.explain}</p>}
      <Button size="lg" className="w-full" onClick={() => { onAnswer({ kind: 'sim', values }, 5); onContinue(scene.goto); }}>{t(locale, 'btn.continue')}</Button>
    </div>
  );
}
