import { useMemo, useState } from 'react';
import type { ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { EmojiTile } from '../ui/card.tsx';
import { cn } from '../ui/cn.ts';
import { hashSeed } from '../rewards.ts';
import { t } from '../i18n.ts';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'match' }>;

function shuffle(ids: string[], seed: string): string[] {
  const arr = [...ids];
  let h = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.join() === ids.join() && arr.length > 1) arr.push(arr.shift() as string);
  return arr;
}

// Tap an item on one side, then its partner on the other. Wrong taps are counted, never blocked.
export function Match({ scene, locale, saved, onAnswer, onContinue, accent }: WidgetProps<S> & { accent: string }) {
  const rightOrder = useMemo(() => shuffle(scene.pairs, scene.id), [scene.pairs, scene.id]);
  const [done, setDone] = useState<string[]>(saved?.kind === 'match' ? saved.pairs : []);
  const [left, setLeft] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(saved?.kind === 'match' ? saved.mistakes : 0);
  const complete = done.length === scene.pairs.length;

  function tapLeft(id: string) { if (!done.includes(id)) { setLeft(id); setWrong(null); } }
  function tapRight(id: string) {
    if (!left || done.includes(id)) return;
    if (left === id) {
      const next = [...done, id];
      setDone(next);
      setLeft(null);
      if (next.length === scene.pairs.length) onAnswer({ kind: 'match', pairs: next, mistakes, correct: mistakes === 0 }, mistakes === 0 ? 10 : 5);
    } else {
      setMistakes((m) => m + 1);
      setWrong(id);
    }
  }
  const cell = (state: 'idle' | 'active' | 'done' | 'wrong') => cn('w-full rounded-2xl border-2 p-3 text-start text-sm leading-7 transition', state === 'idle' && 'border-line bg-surface hover:border-brand', state === 'active' && 'border-brand bg-brand-soft', state === 'done' && 'border-good bg-good-soft opacity-80', state === 'wrong' && 'border-bad bg-bad-soft');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <EmojiTile emoji={scene.emoji ?? '🧩'} accent={accent} size="sm" />
        <h2 className="text-lg font-bold leading-8">{scene.text.prompt}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {scene.pairs.map((id) => <button key={id} data-left={id} disabled={done.includes(id)} className={cell(done.includes(id) ? 'done' : left === id ? 'active' : 'idle')} onClick={() => tapLeft(id)}>{scene.text.pairs?.[id]?.left}</button>)}
        </div>
        <div className="space-y-2">
          {rightOrder.map((id) => <button key={id} data-right={id} disabled={done.includes(id)} className={cell(done.includes(id) ? 'done' : wrong === id ? 'wrong' : 'idle')} onClick={() => tapRight(id)}>{scene.text.pairs?.[id]?.right}</button>)}
        </div>
      </div>
      {complete && scene.text.explain && <p className="rounded-xl bg-brand-soft p-3 text-sm leading-7">{scene.text.explain}</p>}
      {complete && <Button size="lg" className="w-full" onClick={() => onContinue(scene.goto)}>{t(locale, 'btn.continue')}</Button>}
    </div>
  );
}
