import { useState } from 'react';
import type { ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { EmojiTile } from '../ui/card.tsx';
import { cn } from '../ui/cn.ts';
import { t } from '../i18n.ts';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'choice' | 'quiz' }>;

export function Choice({ scene, locale, saved, onAnswer, onContinue, accent }: WidgetProps<S> & { accent: string }) {
  const [picked, setPicked] = useState<string | null>(saved?.kind === 'option' ? saved.optionId : null);
  const graded = scene.type === 'quiz';
  const hints = scene.text.hints ?? [];
  const [shown, setShown] = useState(0);
  const chosen = scene.options.find((o) => o.id === picked);

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const opt = scene.options.find((o) => o.id === id)!;
    const correct = graded ? !!opt.correct : undefined;
    onAnswer({ kind: 'option', optionId: id, correct }, graded ? (correct ? 10 : 3) : 5);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <EmojiTile emoji={scene.emoji ?? '🤔'} accent={accent} size="sm" />
        <h2 className="text-lg font-bold leading-8">{scene.text.prompt}</h2>
      </div>
      {hints.slice(0, shown).map((h, i) => <p key={i} className="rounded-xl border border-flame/40 bg-flame/10 p-3 text-sm leading-7">💡 {h}</p>)}
      {!picked && shown < hints.length && <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 1)}>💡 {t(locale, 'player.hint')}</Button>}
      <div className="space-y-3" role="radiogroup">
        {scene.options.map((o) => {
          const isPicked = picked === o.id;
          const showRight = !!picked && graded && o.correct;
          const showWrong = isPicked && graded && !o.correct;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={isPicked}
              disabled={!!picked}
              onClick={() => pick(o.id)}
              className={cn(
                'w-full rounded-2xl border-2 p-4 text-start text-base leading-7 transition',
                !picked && 'border-line bg-surface hover:border-brand active:scale-[0.99]',
                picked && !isPicked && !showRight && 'border-line bg-surface opacity-60',
                isPicked && !graded && 'border-brand bg-brand-soft',
                showRight && 'border-good bg-good-soft',
                showWrong && 'border-bad bg-bad-soft',
              )}
            >
              <span className="block">{scene.text.options?.[o.id]?.label}</span>
              {(isPicked || showRight) && scene.text.options?.[o.id]?.feedback && (
                <span className="mt-2 block text-sm text-muted">{scene.text.options[o.id].feedback}</span>
              )}
            </button>
          );
        })}
      </div>
      {picked && scene.text.explain && <p className="rounded-xl bg-brand-soft p-3 text-sm leading-7"><b>{t(locale, 'player.explain')}: </b>{scene.text.explain}</p>}
      {picked && <Button size="lg" className="w-full" onClick={() => onContinue(chosen?.goto ?? scene.goto)}>{t(locale, 'btn.continue')}</Button>}
    </div>
  );
}
