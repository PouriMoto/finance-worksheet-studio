import { useState } from 'react';
import type { ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { EmojiTile } from '../ui/card.tsx';
import { cn } from '../ui/cn.ts';
import { hashSeed } from '../rewards.ts';
import { t } from '../i18n.ts';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'sort' }>;

function shuffled(ids: string[], seed: string, avoid: string[]): string[] {
  let arr = [...ids];
  let h = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.join() === avoid.join()) arr = [...arr.slice(1), arr[0]];
  return arr;
}

export function Sort({ scene, locale, saved, onAnswer, onContinue, accent }: WidgetProps<S> & { accent: string }) {
  const [order, setOrder] = useState<string[]>(() => (saved?.kind === 'sort' ? saved.order : shuffled(scene.items, scene.id, scene.correctOrder)));
  const [result, setResult] = useState<boolean | null>(saved?.kind === 'sort' ? saved.correct : null);
  const locked = result !== null;

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (locked || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }
  function check() {
    const ok = order.join() === scene.correctOrder.join();
    setResult(ok);
    onAnswer({ kind: 'sort', order, correct: ok }, ok ? 10 : 3);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <EmojiTile emoji={scene.emoji ?? '🔀'} accent={accent} size="sm" />
        <h2 className="text-lg font-bold leading-8">{scene.text.prompt}</h2>
      </div>
      {!locked && <p className="text-sm text-muted">{t(locale, 'player.sort_hint')}</p>}
      <ol className="space-y-2">
        {order.map((id, i) => (
          <li key={id} className={cn('flex items-center gap-3 rounded-2xl border-2 bg-surface p-3', locked ? (id === scene.correctOrder[i] ? 'border-good' : 'border-bad') : 'border-line')}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span>
            <span className="grow">{scene.text.items?.[id]}</span>
            {!locked && (
              <span className="flex gap-1">
                <Button variant="outline" size="sm" aria-label={t(locale, 'player.move_up')} disabled={i === 0} onClick={() => move(i, -1)}>▲</Button>
                <Button variant="outline" size="sm" aria-label={t(locale, 'player.move_down')} disabled={i === order.length - 1} onClick={() => move(i, 1)}>▼</Button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {locked && (
        <div className="rounded-xl bg-brand-soft p-3 text-sm leading-7">
          <b>{result ? t(locale, 'player.sort_right') : t(locale, 'player.sort_wrong')}</b>
          {!result && <ol className="mt-1 list-decimal ps-5">{scene.correctOrder.map((id) => <li key={id}>{scene.text.items?.[id]}</li>)}</ol>}
          {scene.text.explain && <p className="mt-2">{scene.text.explain}</p>}
        </div>
      )}
      {locked ? <Button size="lg" className="w-full" onClick={() => onContinue(scene.goto)}>{t(locale, 'btn.continue')}</Button> : <Button size="lg" className="w-full" onClick={check}>{t(locale, 'btn.check')}</Button>}
    </div>
  );
}
