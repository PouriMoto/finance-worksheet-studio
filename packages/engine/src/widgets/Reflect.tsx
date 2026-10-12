import { useState } from 'react';
import type { ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { EmojiTile } from '../ui/card.tsx';
import { cn } from '../ui/cn.ts';
import { addNote } from '../store.ts';
import { t } from '../i18n.ts';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'reflect' }>;

// Investment step of the Hook loop: what the user writes here is kept in their profile.
export function Reflect({ scene, locale, saved, onAnswer, onContinue, accent, pkg }: WidgetProps<S> & { accent: string; pkg: string }) {
  const [text, setText] = useState(saved?.kind === 'text' ? saved.text : '');
  const [picked, setPicked] = useState<string | null>(saved?.kind === 'pick' ? saved.optionId : null);
  const done = saved !== undefined || picked !== null;
  const [justSaved, setJustSaved] = useState(false);

  function savePick(id: string) {
    setPicked(id);
    onAnswer({ kind: 'pick', optionId: id }, 8);
    addNote({ pkg, kind: scene.saveAs, text: scene.text.options?.[id]?.label ?? id });
  }
  function saveText() {
    if (!text.trim()) return;
    onAnswer({ kind: 'text', text: text.trim() }, 8);
    addNote({ pkg, kind: scene.saveAs, text: text.trim() });
    setJustSaved(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <EmojiTile emoji={scene.emoji ?? '📝'} accent={accent} size="sm" />
        <h2 className="text-lg font-bold leading-8">{scene.text.prompt}</h2>
      </div>
      {scene.mode === 'pick' ? (
        <div className="space-y-3" role="radiogroup">
          {(scene.options ?? []).map((o) => (
            <button key={o} role="radio" aria-checked={picked === o} disabled={done} onClick={() => savePick(o)}
              className={cn('w-full rounded-2xl border-2 p-4 text-start transition', picked === o ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-brand', done && picked !== o && 'opacity-60')}>
              {scene.text.options?.[o]?.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={done} rows={4} placeholder={scene.text.placeholder ?? t(locale, 'player.write_here')}
            className="w-full rounded-2xl border-2 border-line bg-surface p-4 leading-8 outline-none focus:border-brand disabled:opacity-70" />
          {!done && <Button variant="soft" onClick={saveText} disabled={!text.trim()}>{t(locale, 'btn.save')}</Button>}
          {(done || justSaved) && <p className="text-sm font-semibold text-good">✓ {t(locale, 'player.saved')}</p>}
        </div>
      )}
      {done && <Button size="lg" className="w-full" onClick={() => onContinue(scene.goto)}>{t(locale, 'btn.continue')}</Button>}
    </div>
  );
}
