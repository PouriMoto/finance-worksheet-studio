// Local "notification centre" (works without push) + opt-in Web Push helper.
import type { AppState, Notice } from './store.ts';
import { currentStreak, dayKey } from './streak.ts';

export interface CatalogItem { slug: string; parts: string[]; next?: string }

export function buildNotices(state: AppState, catalog: CatalogItem[], locale: string): Notice[] {
  const out: Notice[] = [];
  const at = new Date().toISOString();
  const keep = new Map(state.notices.map((n) => [n.id, n]));
  const push = (n: Omit<Notice, 'at' | 'read'>) => out.push({ ...n, at: keep.get(n.id)?.at ?? at, read: keep.get(n.id)?.read ?? false });

  for (const item of catalog) {
    const prog = state.progress[item.slug] ?? {};
    const started = item.parts.some((p) => prog[p]?.answers && Object.keys(prog[p].answers).length > 0);
    const nextPart = item.parts.find((p) => !prog[p]?.done);
    if (started && nextPart) {
      const midPart = Object.keys(prog[nextPart]?.answers ?? {}).length > 0;
      push({ id: `${midPart ? 'continue' : 'next'}:${item.slug}:${nextPart}`, kind: midPart ? 'continue' : 'next', params: { pkg: item.slug, part: nextPart }, href: `/${locale}/play/${item.slug}/${nextPart}/` });
    }
  }
  const today = dayKey();
  const streak = currentStreak({ days: state.days, freezeDays: state.freezeDays, freezes: state.freezes }, today);
  if (streak >= 2 && !state.days.includes(today)) push({ id: `streak:${today}`, kind: 'streak', params: { n: String(streak) }, href: `/${locale}/` });
  return out.slice(0, 20);
}

export type PushResult = { ok: true; subscription: PushSubscriptionJSON } | { ok: false; reason: 'unsupported' | 'denied' | 'no-key' | 'error' };

// Must be called from a user gesture. iOS only supports it for installed (home screen) web apps.
export async function enablePush(vapidPublicKey: string | undefined): Promise<PushResult> {
  if (!vapidPublicKey) return { ok: false, reason: 'no-key' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: false, reason: 'unsupported' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const pad = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
    const raw = atob((vapidPublicKey + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    return { ok: true, subscription: sub.toJSON() };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
