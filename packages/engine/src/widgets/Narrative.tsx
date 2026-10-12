import type { ResolvedPackage, ResolvedScene } from '@hormat/content/schema';
import { Button } from '../ui/button.tsx';
import { EmojiTile } from '../ui/card.tsx';
import { t } from '../i18n.ts';
import type { WidgetProps } from './types.ts';

type S = Extract<ResolvedScene, { type: 'narrative' }>;

export function Narrative({ scene, locale, onContinue, author, accent }: WidgetProps<S> & { author?: ResolvedPackage['author']; accent: string }) {
  const paragraphs = (scene.text.body ?? '').split('\n\n');
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <EmojiTile emoji={scene.emoji ?? '💡'} accent={accent} size="lg" />
        {scene.text.title && <h2 className="text-2xl font-extrabold leading-snug">{scene.text.title}</h2>}
      </div>
      {scene.id === 'author' && author && (
        <div className="rounded-2xl border border-line bg-bg p-4">
          <div className="font-bold">{author.name}</div>
          <p className="mt-1 text-sm leading-7 text-muted">{author.bio}</p>
        </div>
      )}
      <div className="space-y-3 text-base leading-8">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
      <Button size="lg" className="w-full" onClick={() => onContinue(scene.goto)}>{t(locale, 'btn.continue')}</Button>
    </div>
  );
}
