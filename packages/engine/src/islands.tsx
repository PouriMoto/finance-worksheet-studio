// Small islands that read the shared store: header chips, notification centre, resume card, profile, archive filter.
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Badge, Card, EmojiTile } from './ui/card.tsx';
import { Button, buttonVariants } from './ui/button.tsx';
import { cn } from './ui/cn.ts';
import { $state, hydrate, markNoticesRead, setNotices, type PartProgress } from './store.ts';
import { currentStreak, dayKey } from './streak.ts';
import { buildNotices, enablePush } from './notify.ts';
import { exportBackup, importBackup } from './backup.ts';
import type { Features } from './features.ts';
import { computeEvidence } from './profile.ts';
import { BandScale } from './viz/index.tsx';
import type { DimText, ResolvedPart } from '@hormat/content/schema';
import { fmtDate, fmtNumber, normalizeSearch, t } from './i18n.ts';

export interface CatalogPart { id: string; title: string; locked: boolean }
export interface CatalogItem {
  slug: string; title: string; emoji: string; accent: string; type: string; minutes: number; level: string; tags: string[]; subtitle?: string; description: string;
  parts: CatalogPart[]; next?: string; href: string; category: string; featured: boolean; access: 'free' | 'mixed' | 'premium';
}
export interface CategoryItem { id: string; emoji: string; label: string }

function useAppState() {
  const s = useStore($state);
  useEffect(() => { hydrate(); }, []);
  return s;
}
export const statusOf = (progress: Record<string, PartProgress> | undefined, parts: CatalogPart[]) => {
  const done = parts.filter((p) => progress?.[p.id]?.done).length;
  const started = parts.some((p) => progress?.[p.id] && Object.keys(progress[p.id].answers).length > 0);
  return { done, total: parts.length, key: done === parts.length ? 'done' : started || done > 0 ? 'progress' : 'new' } as const;
};

export function StreakChip({ locale }: { locale: string }) {
  const s = useAppState();
  const streak = currentStreak({ days: s.days, freezeDays: s.freezeDays, freezes: s.freezes }, dayKey());
  return (
    <a href={`/${locale}/me/`} className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold" title={t(locale, 'me.streak', { n: streak })}>
      <span aria-hidden>🔥</span><span className="tabular-nums">{fmtNumber(locale, streak)}</span>
      <span className="ms-1 text-reward" aria-hidden>⭐</span><span className="tabular-nums">{fmtNumber(locale, s.xp)}</span>
    </a>
  );
}

export function NotifBell({ locale, catalog, features }: { locale: string; catalog: CatalogItem[]; features: Features }) {
  const s = useAppState();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const list = buildNotices($state.get(), catalog.map((c) => ({ slug: c.slug, parts: c.parts.map((p) => p.id), next: c.next })), locale);
    setNotices(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.progress, s.days.length]);
  const unread = s.notices.filter((n) => !n.read).length;
  const label = (n: (typeof s.notices)[number]) => {
    const item = catalog.find((c) => c.slug === n.params.pkg);
    const part = item?.parts.find((p) => p.id === n.params.part)?.title ?? '';
    return t(locale, `notif.${n.kind}`, { pkg: item?.title ?? '', part, n: n.params.n ?? '' });
  };
  const [pushMsg, setPushMsg] = useState('');
  async function push() {
    const r = await enablePush(import.meta.env?.PUBLIC_VAPID_KEY as string | undefined);
    setPushMsg(t(locale, r.ok ? 'push.ok' : `push.${r.reason}`));
  }
  return (
    <div className="relative">
      <button aria-label={t(locale, 'notif.title')} onClick={() => { setOpen((o) => !o); if (!open) markNoticesRead(); }} className="relative flex size-10 items-center justify-center rounded-full hover:bg-brand-soft">
        <span aria-hidden className="text-xl">🔔</span>
        {unread > 0 && <span className="absolute end-1 top-1 flex size-4 items-center justify-center rounded-full bg-bad text-[10px] font-bold text-white">{fmtNumber(locale, unread)}</span>}
      </button>
      {open && (
        <div className="absolute end-0 top-12 z-50 w-72 space-y-2 rounded-2xl border border-line bg-surface p-3 shadow-lg">
          <div className="font-bold">{t(locale, 'notif.title')}</div>
          {s.notices.length === 0 && <p className="text-sm text-muted">{t(locale, 'notif.empty')}</p>}
          {s.notices.map((n) => <a key={n.id} href={n.href} className="block rounded-xl bg-bg p-3 text-sm leading-6 hover:bg-brand-soft">{label(n)}</a>)}
          {features.push && <Button variant="soft" size="sm" className="w-full" onClick={push}>{t(locale, 'push.enable')}</Button>}
          {pushMsg && <p className="text-xs text-muted">{pushMsg}</p>}
        </div>
      )}
    </div>
  );
}

export function ContinueCard({ locale, catalog, fallbackSlug }: { locale: string; catalog: CatalogItem[]; fallbackSlug: string }) {
  const s = useAppState();
  const target = useMemo(() => {
    for (const c of catalog) {
      const st = statusOf(s.progress[c.slug], c.parts);
      if (st.key === 'progress') {
        const part = c.parts.find((p) => !s.progress[c.slug]?.[p.id]?.done) ?? c.parts[0];
        return { c, part, resume: true };
      }
    }
    const c = catalog.find((x) => x.slug === fallbackSlug) ?? catalog[0];
    return c ? { c, part: c.parts[0], resume: false } : null;
  }, [s.progress, catalog, fallbackSlug]);
  if (!target) return null;
  const { c, part, resume } = target;
  return (
    <a href={`/${locale}/play/${c.slug}/${part.id}/`} className="block rounded-3xl bg-brand p-5 text-brand-ink shadow-sm active:scale-[0.99]">
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl" aria-hidden>{c.emoji}</div>
        <div className="min-w-0">
          <div className="text-sm opacity-80">{t(locale, resume ? 'home.continue' : 'home.start_here')}</div>
          <div className="truncate text-xl font-extrabold">{c.title}</div>
          <div className="truncate text-sm opacity-90">{part.title}</div>
        </div>
      </div>
    </a>
  );
}

export function PartList({ locale, item }: { locale: string; item: CatalogItem }) {
  const s = useAppState();
  const progress = s.progress[item.slug];
  return (
    <ol className="space-y-3">
      {item.parts.map((p, i) => {
        if (p.locked) {
          return (
            <li key={p.id}>
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-bg p-4 opacity-80" aria-disabled="true">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-line text-sm">🔒</span>
                <span className="grow font-semibold">{p.title}</span>
                <span className="text-xs text-muted">{t(locale, 'lock.part')}</span>
              </div>
            </li>
          );
        }
        const done = progress?.[p.id]?.done;
        const started = !done && progress?.[p.id] && Object.keys(progress[p.id].answers).length > 0;
        return (
          <li key={p.id}>
            <a href={`/${locale}/play/${item.slug}/${p.id}/`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 active:scale-[0.99]">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold', done ? 'bg-good text-white' : 'bg-brand-soft text-brand')}>{done ? '✓' : fmtNumber(locale, i + 1)}</span>
              <span className="grow font-semibold">{p.title}</span>
              <span className="text-xs text-muted">{t(locale, done ? 'pkg.status.done' : started ? 'pkg.status.progress' : 'pkg.start')}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function PackageCard({ locale, c, showStatus = true }: { locale: string; c: CatalogItem; showStatus?: boolean }) {
  const s = useAppState();
  const st = statusOf(s.progress[c.slug], c.parts);
  return (
    <a href={c.href} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 active:scale-[0.99]">
      <EmojiTile emoji={c.emoji} accent={c.accent} />
      <div className="min-w-0 grow">
        <div className="flex items-center gap-2"><Badge>{t(locale, `type.${c.type}`)}</Badge>{c.access !== 'free' && <Badge className="bg-flame/15 text-flame">🔒 {t(locale, `access.${c.access}`)}</Badge>}{showStatus && st.key !== 'new' && <Badge className="bg-good-soft text-good">{t(locale, `pkg.status.${st.key}`)}</Badge>}</div>
        <div className="mt-1 truncate font-bold">{c.title}</div>
        <div className="truncate text-sm text-muted">{c.subtitle}</div>
        <div className="mt-1 text-xs text-muted">{t(locale, 'minutes', { n: fmtNumber(locale, c.minutes) })} · {t(locale, `level.${c.level}`)}</div>
      </div>
    </a>
  );
}

const COVER: Record<string, [string, string]> = {
  teal: ['#0B8F76', '#0E5F7A'], violet: ['#6A4DF4', '#3B2A9E'], amber: ['#F2780C', '#B8430A'], rose: ['#E0457B', '#8E2350'], sky: ['#2F8CF0', '#1A4F9C'],
};

// Game tile: big emoji cover, title overlay, status. One tap opens the experience page.
export function CoverTile({ locale, c, wide = false }: { locale: string; c: CatalogItem; wide?: boolean }) {
  const s = useAppState();
  const st = statusOf(s.progress[c.slug], c.parts);
  const [from, to] = COVER[c.accent] ?? COVER.teal;
  return (
    <a href={c.href} className={cn('group relative block aspect-[4/5] shrink-0 overflow-hidden rounded-3xl text-white shadow-sm transition active:scale-[0.98]', wide && 'w-44')} style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}>
      <div aria-hidden className="absolute -end-8 -top-8 size-36 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-10 -start-6 size-32 rounded-full bg-black/10" />
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pb-10 text-7xl drop-shadow transition-transform group-hover:scale-110">{c.emoji}</div>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold backdrop-blur">{c.access !== 'free' ? '🔒 ' : ''}{t(locale, `type.${c.type}`)}</span>
        {st.key === 'done' && <span className="flex size-7 items-center justify-center rounded-full bg-white text-sm font-bold text-good" title={t(locale, 'tile.done')}>✓</span>}
        {st.key === 'progress' && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-ink">{fmtNumber(locale, st.done)}/{fmtNumber(locale, st.total)}</span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
        <div className="line-clamp-2 text-sm font-extrabold leading-6">{c.title}</div>
        <div className="text-xs opacity-80">{t(locale, 'minutes', { n: fmtNumber(locale, c.minutes) })}</div>
      </div>
    </a>
  );
}

// CrazyGames-style home: category chips, search, featured row, tile grid.
export function HomeGrid({ locale, items, categories }: { locale: string; items: CatalogItem[]; categories: CategoryItem[] }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const query = normalizeSearch(q);
  const list = items.filter((i) => (cat === 'all' || i.category === cat) && (!query || normalizeSearch(`${i.title} ${i.subtitle ?? ''} ${i.tags.join(' ')}`).includes(query)));
  const featured = items.filter((i) => i.featured);
  const chip = (active: boolean) => cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', active ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface');
  return (
    <div className="space-y-6">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, 'archive.search')} className="h-12 w-full rounded-2xl border-2 border-line bg-surface px-4 outline-none focus:border-brand" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={chip(cat === 'all')} onClick={() => setCat('all')}>{t(locale, 'archive.all')}</button>
        {categories.map((c) => <button key={c.id} className={chip(cat === c.id)} onClick={() => setCat(c.id)}>{c.emoji} {c.label}</button>)}
      </div>
      {cat === 'all' && !query && featured.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold">⭐ {t(locale, 'home.featured')}</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">{featured.map((c) => <CoverTile key={c.slug} locale={locale} c={c} wide />)}</div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-extrabold">🎮 {t(locale, 'home.all')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{list.map((c) => <CoverTile key={c.slug} locale={locale} c={c} />)}</div>
        {list.length === 0 && <p className="py-10 text-center text-muted">{t(locale, 'archive.empty')}</p>}
      </section>
    </div>
  );
}

export function ArchiveFilter({ locale, items, categories = [] }: { locale: string; items: CatalogItem[]; categories?: CategoryItem[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [type, setType] = useState('all');
  const [level, setLevel] = useState('all');
  const [duration, setDuration] = useState('all');
  const [sort, setSort] = useState('default');
  const types = ['all', ...Array.from(new Set(items.map((i) => i.type)))];
  const levels = ['all', ...Array.from(new Set(items.map((i) => i.level)))];
  const dur = (m: number) => (m <= 10 ? 'short' : m <= 20 ? 'mid' : 'long');
  const nq = normalizeSearch(q);
  const filtered = items.filter((i) => (type === 'all' || i.type === type) && (cat === 'all' || i.category === cat) && (level === 'all' || i.level === level) && (duration === 'all' || dur(i.minutes) === duration) && (!nq || normalizeSearch(`${i.title} ${i.subtitle ?? ''} ${i.description} ${i.tags.join(' ')}`).includes(nq)));
  const list = sort === 'short' ? [...filtered].sort((a, b) => a.minutes - b.minutes) : sort === 'long' ? [...filtered].sort((a, b) => b.minutes - a.minutes) : filtered;
  const chip = (active: boolean) => cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', active ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface');
  return (
    <div className="space-y-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, 'archive.search')} className="h-12 w-full rounded-2xl border-2 border-line bg-surface px-4 outline-none focus:border-brand" />
      {categories.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1"><button className={chip(cat === 'all')} onClick={() => setCat('all')}>{t(locale, 'archive.all')}</button>{categories.map((c) => <button key={c.id} className={chip(cat === c.id)} onClick={() => setCat(c.id)}>{c.emoji} {c.label}</button>)}</div>}
      <div className="flex gap-2 overflow-x-auto pb-1">{types.map((x) => <button key={x} className={chip(type === x)} onClick={() => setType(x)}>{x === 'all' ? t(locale, 'archive.all') : t(locale, `type.${x}`)}</button>)}</div>
      <div className="flex gap-2 overflow-x-auto pb-1"><span className="shrink-0 self-center text-sm text-muted">{t(locale, 'archive.duration')}</span>{['all', 'short', 'mid', 'long'].map((d) => <button key={d} className={chip(duration === d)} onClick={() => setDuration(d)}>{d === 'all' ? t(locale, 'archive.all') : t(locale, `archive.dur_${d}`)}</button>)}</div>
      <div className="flex gap-2 overflow-x-auto pb-1"><span className="shrink-0 self-center text-sm text-muted">{t(locale, 'archive.sort')}</span>{['default', 'short', 'long'].map((d) => <button key={d} className={chip(sort === d)} onClick={() => setSort(d)}>{t(locale, `archive.sort_${d}`)}</button>)}</div>
      <div className="flex gap-2 overflow-x-auto pb-1">{levels.map((x) => <button key={x} className={chip(level === x)} onClick={() => setLevel(x)}>{x === 'all' ? t(locale, 'archive.all') : t(locale, `level.${x}`)}</button>)}</div>
      <div className="text-sm text-muted">{t(locale, 'archive.count', { n: fmtNumber(locale, list.length) })}</div>
      <div className="grid gap-3 sm:grid-cols-2">{list.map((c) => <PackageCard key={c.slug} locale={locale} c={c} />)}</div>
      {list.length === 0 && <p className="py-10 text-center text-muted">{t(locale, 'archive.empty')}</p>}
    </div>
  );
}

// Last five weeks of activity: filled = active day, snowflake = covered by a freeze.
export function StreakCalendar({ locale, days, freezeDays }: { locale: string; days: string[]; freezeDays: string[] }) {
  const active = new Set(days);
  const frozen = new Set(freezeDays);
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    return dayKey(d);
  });
  return (
    <div dir="ltr" className="grid grid-cols-7 gap-1.5" role="img" aria-label={t(locale, 'me.calendar')}>
      {cells.map((k) => <div key={k} title={k} className={cn('flex aspect-square items-center justify-center rounded-lg text-xs', active.has(k) ? 'bg-brand text-brand-ink' : frozen.has(k) ? 'bg-sky-200 dark:bg-sky-900' : 'bg-line/60')}>{frozen.has(k) && !active.has(k) ? '❄️' : ''}</div>)}
    </div>
  );
}

export function ProfileView({ locale, catalog, features }: { locale: string; catalog: CatalogItem[]; features: Features }) {
  const [backupMsg, setBackupMsg] = useState('');
  function download() {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function restore(file: File | undefined) {
    if (!file) return;
    const r = importBackup(await file.text(), 'merge');
    setBackupMsg(t(locale, r.ok ? 'backup.ok' : r.reason === 'version' ? 'backup.version' : 'backup.invalid'));
  }
  const s = useAppState();
  const streak = currentStreak({ days: s.days, freezeDays: s.freezeDays, freezes: s.freezes }, dayKey());
  const goals = s.notes.filter((n) => n.kind === 'goal');
  const notes = s.notes.filter((n) => n.kind === 'note');
  const title = (slug: string) => catalog.find((c) => c.slug === slug)?.title ?? slug;
  const touched = catalog.filter((c) => statusOf(s.progress[c.slug], c.parts).key !== 'new');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center"><div className="text-3xl">🔥</div><div className="text-2xl font-extrabold tabular-nums">{fmtNumber(locale, streak)}</div><div className="text-xs text-muted">{t(locale, 'me.streak', { n: '' }).trim()}</div></Card>
        <Card className="text-center"><div className="text-3xl">⭐</div><div className="text-2xl font-extrabold tabular-nums">{fmtNumber(locale, s.xp)}</div><div className="text-xs text-muted">{t(locale, 'me.xp')}</div></Card>
      </div>
      <section className="space-y-2"><h3 className="font-bold">🗓️ {t(locale, 'me.calendar')}</h3><StreakCalendar locale={locale} days={s.days} freezeDays={s.freezeDays} /></section>
      <p className="text-sm text-muted">❄️ {t(locale, 'me.freezes', { n: fmtNumber(locale, s.freezes) })}</p>
      {s.badges.length > 0 && <section><h3 className="mb-2 font-bold">🏅 {t(locale, 'me.badges')}</h3><div className="flex flex-wrap gap-2">{s.badges.map((b) => <Badge key={b} className="px-3 py-1.5 text-sm">{t(locale, `badge.${b}`)}</Badge>)}</div></section>}
      {goals.length > 0 && <section><h3 className="mb-2 font-bold">🎯 {t(locale, 'me.goals')}</h3><div className="space-y-2">{goals.map((g, i) => <Card key={i} className="p-4"><div className="text-xs text-muted">{title(g.pkg)}</div><div className="leading-7">{g.text}</div></Card>)}</div></section>}
      {notes.length > 0 && <section><h3 className="mb-2 font-bold">📝 {t(locale, 'me.notes')}</h3><div className="space-y-2">{notes.map((g, i) => <Card key={i} className="p-4"><div className="text-xs text-muted">{title(g.pkg)}</div><div className="leading-7">{g.text}</div></Card>)}</div></section>}
      <section>
        <h3 className="mb-2 font-bold">📋 {t(locale, 'me.reports')}</h3>
        {touched.length === 0 ? <p className="text-muted">{t(locale, 'me.empty')}</p> : <div className="space-y-3">{touched.map((c) => <PackageCard key={c.slug} locale={locale} c={c} />)}</div>}
      </section>
      {features.backup && (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <h3 className="font-bold">💾 {t(locale, 'backup.title')}</h3>
          <p className="text-sm leading-7 text-muted">{t(locale, 'backup.hint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={download}>⬇️ {t(locale, 'backup.download')}</Button>
            <label className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
              ⬆️ {t(locale, 'backup.restore')}
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          {backupMsg && <p role="status" className="text-sm font-semibold">{backupMsg}</p>}
        </section>
      )}
      <a className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')} href={`/${locale}/me/report/`}>📄 {t(locale, 'me.report_link')}</a>
      <p className="text-xs text-muted">{t(locale, 'me.local_note')}</p>
    </div>
  );
}
export { buttonVariants };
