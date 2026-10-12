import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import type { DimText, ResolvedPackage, ResolvedPart } from '@hormat/content/schema';
import { Button, buttonVariants } from './ui/button.tsx';
import { Card, EmojiTile } from './ui/card.tsx';
import { cn } from './ui/cn.ts';
import { $state, completePart, enqueue, hydrate, recordAnswer, resetPart, setCursor, touchDay, type Answer } from './store.ts';
import { BADGES, pickReward } from './rewards.ts';
import { currentStreak, dayKey } from './streak.ts';
import { fmtNumber, t } from './i18n.ts';
import { Narrative } from './widgets/Narrative.tsx';
import { Choice } from './widgets/Choice.tsx';
import { Sim } from './widgets/Sim.tsx';
import { Sort } from './widgets/Sort.tsx';
import { Match } from './widgets/Match.tsx';
import { Reflect } from './widgets/Reflect.tsx';
import { Report } from './widgets/Report.tsx';

export interface PlayerNav {
  packageHref: string;
  nextPartHref?: string;
  nextItemHref?: string;
  nextItemTitle?: string;
}
export interface PartPlayerProps {
  locale: string;
  pkg: Pick<ResolvedPackage, 'meta' | 'title' | 'author' | 'rewards' | 'parts'>;
  partId: string;
  dimTexts: Record<string, DimText>;
  dimEmoji: Record<string, string>;
  nav: PlayerNav;
}

export default function PartPlayer({ locale, pkg, partId, dimTexts, dimEmoji, nav }: PartPlayerProps) {
  const state = useStore($state);
  const part = pkg.parts.find((p) => p.id === partId) as ResolvedPart;
  const slug = pkg.meta.slug;
  const accent = pkg.meta.accent;
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState<null | { xp: number; reward: { title: string; body: string } | null; newBadges: string[]; streak: number }>(null);

  // Hydrate from localStorage, then resume at the saved cursor.
  useEffect(() => {
    hydrate();
    const p = $state.get().progress[slug]?.[partId];
    if (p && !p.done && p.cursor) {
      const i = part.scenes.findIndex((s) => s.id === p.cursor);
      if (i > 0) setIndex(i);
    }
    touchDay();
    enqueue({ type: 'part_open', pkg: slug, part: partId });
    setReady(true);
  }, [slug, partId, part]);

  const progress = state.progress[slug] ?? {};
  const scene = part.scenes[index];
  const saved: Answer | undefined = scene ? progress[partId]?.answers[scene.id] : undefined;

  useEffect(() => {
    if (ready && scene) setCursor(slug, partId, scene.id);
  }, [ready, scene, slug, partId]);

  function onAnswer(a: Answer, xp: number) {
    recordAnswer(slug, partId, scene.id, a, xp);
  }

  function finish() {
    const answers = $state.get().progress[slug]?.[partId]?.answers ?? {};
    const quizzes = part.scenes.filter((s) => s.type === 'quiz');
    const perfect = quizzes.length > 0 && quizzes.every((q) => (answers[q.id] as Extract<Answer, { kind: 'option' }> | undefined)?.correct === true);
    const prev = $state.get();
    const firstEver = !Object.values(prev.progress).some((byPart) => Object.values(byPart).some((p) => p.done));
    const badges: string[] = [];
    if (perfect) badges.push(BADGES.PERFECT_PART);
    if (firstEver) badges.push(BADGES.FIRST_PART);
    const streakNow = currentStreak({ days: prev.days, freezeDays: prev.freezeDays, freezes: prev.freezes }, dayKey());
    if (streakNow >= 7) badges.push(BADGES.WEEK_STREAK);
    const newBadges = badges.filter((b) => !prev.badges.includes(b));
    const xp = 30;
    completePart(slug, partId, xp, badges);
    const reward = pickReward(pkg.rewards, `${slug}:${partId}:${JSON.stringify(answers)}`);
    setFinished({ xp, reward, newBadges, streak: streakNow });
  }

  function next(goto?: string) {
    const target = goto ? part.scenes.findIndex((s) => s.id === goto) : index + 1;
    if (target < 0 || target >= part.scenes.length) finish();
    else setIndex(target);
  }

  const stepLabel = useMemo(() => t(locale, 'player.step', { n: fmtNumber(locale, index + 1), total: fmtNumber(locale, part.scenes.length) }), [locale, index, part.scenes.length]);
  if (!ready) return <div className="py-20 text-center text-4xl">{part.emoji}</div>;

  if (finished) {
    return (
      <div className="space-y-5 py-4">
        <div className="text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="mt-3 text-2xl font-extrabold">{t(locale, 'done.title')}</h2>
          <div className="mt-2 flex justify-center gap-2 text-sm font-bold">
            <span className="rounded-full bg-reward px-3 py-1 text-white">{t(locale, 'done.xp', { n: fmtNumber(locale, finished.xp) })}</span>
            {finished.streak > 0 && <span className="rounded-full bg-flame px-3 py-1 text-white">🔥 {fmtNumber(locale, finished.streak)}</span>}
          </div>
        </div>
        <Card className="space-y-1 border-reward">
          <div className="text-sm font-bold text-reward">✨ {finished.reward?.title ?? t(locale, 'done.insight')}</div>
          <p className="leading-8">{finished.reward?.body ?? t(locale, 'done.generic')}</p>
        </Card>
        {finished.newBadges.map((b) => (
          <Card key={b} className="flex items-center gap-3"><span className="text-3xl">🏅</span><div><div className="text-xs text-muted">{t(locale, 'badge.new')}</div><div className="font-bold">{t(locale, `badge.${b}`)}</div></div></Card>
        ))}
        <div className="grid gap-3">
          {nav.nextPartHref && <a className={cn(buttonVariants({ size: 'lg' }))} href={nav.nextPartHref}>{t(locale, 'done.next_part')}</a>}
          {!nav.nextPartHref && nav.nextItemHref && <a className={cn(buttonVariants({ size: 'lg' }))} href={nav.nextItemHref}>{t(locale, 'done.next_item')}: {nav.nextItemTitle}</a>}
          <a className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))} href={nav.packageHref}>{t(locale, 'done.back')}</a>
          <Button variant="ghost" onClick={() => { resetPart(slug, partId); setFinished(null); setIndex(0); }}>{t(locale, 'btn.restart')}</Button>
        </div>
      </div>
    );
  }

  const common = { locale, saved, onAnswer, onContinue: next } as const;
  return (
    <div>
      <header className="mb-5">
        <div className="mb-3 flex items-center gap-3">
          <a href={nav.packageHref} aria-label={t(locale, 'btn.close')} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-brand-soft">✕</a>
          <div className="min-w-0 grow">
            <div className="truncate text-sm font-bold">{part.emoji} {part.title}</div>
            <div className="text-xs text-muted">{stepLabel}</div>
          </div>
        </div>
        <div className="flex gap-1" aria-hidden>
          {part.scenes.map((s, i) => <div key={s.id} className={cn('h-1.5 grow rounded-full', i < index ? 'bg-brand' : i === index ? 'bg-brand/50' : 'bg-line')} />)}
        </div>
      </header>
      <div key={scene.id}>
        {scene.type === 'narrative' && <Narrative {...common} scene={scene} author={pkg.author} accent={accent} />}
        {(scene.type === 'choice' || scene.type === 'quiz') && <Choice {...common} scene={scene} accent={accent} />}
        {scene.type === 'sim' && <Sim {...common} scene={scene} accent={accent} />}
        {scene.type === 'sort' && <Sort {...common} scene={scene} accent={accent} />}
        {scene.type === 'match' && <Match {...common} scene={scene} accent={accent} />}
        {scene.type === 'reflect' && <Reflect {...common} scene={scene} accent={accent} pkg={slug} />}
        {scene.type === 'report' && <Report {...common} scene={scene} parts={pkg.parts} currentPart={part} progress={progress} dims={pkg.meta.dims} dimTexts={dimTexts} dimEmoji={dimEmoji} />}
      </div>
    </div>
  );
}
export { EmojiTile };
