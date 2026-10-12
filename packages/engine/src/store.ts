// Client state shared by all islands (nanostores). Persisted in localStorage; synced through an adapter.
import { atom } from 'nanostores';
import { applyDay, dayKey } from './streak.ts';

export type Answer =
  | { kind: 'option'; optionId: string; correct?: boolean }
  | { kind: 'sort'; order: string[]; correct: boolean }
  | { kind: 'match'; pairs: string[]; mistakes: number; correct: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'pick'; optionId: string }
  | { kind: 'sim'; values: Record<string, number> };

export interface PartProgress { done: boolean; answers: Record<string, Answer>; cursor?: string; completedAt?: string }
export interface Note { pkg: string; kind: 'goal' | 'note'; text: string; at: string }
export interface Notice { id: string; kind: 'continue' | 'next' | 'streak'; params: Record<string, string>; href: string; at: string; read: boolean }
export interface StudioEvent { type: string; pkg?: string; part?: string; scene?: string; data?: Record<string, unknown>; at: string }

export interface AppState {
  v: 1;
  anonId: string;
  xp: number;
  days: string[];
  freezeDays: string[];
  freezes: number;
  badges: string[];
  progress: Record<string, Record<string, PartProgress>>;
  notes: Note[];
  notices: Notice[];
  queue: StudioEvent[];
}

const KEY = 'fcity.v1';

// Where state is persisted. Local edition: localStorage. A later module can swap in a server-backed implementation.
export interface Persistence { read(): AppState | null; write(state: AppState): void }
const localPersistence: Persistence = {
  read() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw) as AppState; if (p.v === 1) return p; }
    } catch { /* corrupted storage: start fresh */ }
    return null;
  },
  write(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  },
};
let persistence: Persistence = localPersistence;
export function setPersistence(p: Persistence): void { persistence = p; }
export const fresh = (): AppState => ({
  v: 1,
  anonId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2),
  xp: 0, days: [], freezeDays: [], freezes: 0, badges: [], progress: {}, notes: [], notices: [], queue: [],
});

// Starts empty on server and client so the first render matches; hydrate() loads the saved state afterwards.
export const $state = atom<AppState>(fresh());
let hydrated = typeof window === 'undefined';
export function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  const stored = persistence.read();
  if (stored) $state.set(stored);
  else commit($state.get());
}
function commit(next: AppState): void {
  $state.set(next);
  persistence.write(next);
}
function update(fn: (s: AppState) => AppState): void {
  hydrate();
  commit(fn($state.get()));
}
const now = () => new Date().toISOString();

export function touchDay(): void {
  update((s) => {
    const r = applyDay({ days: s.days, freezeDays: s.freezeDays, freezes: s.freezes }, dayKey());
    return r.days === s.days ? s : { ...s, ...r };
  });
}
export function enqueue(e: Omit<StudioEvent, 'at'>): void {
  update((s) => ({ ...s, queue: [...s.queue, { ...e, at: now() }].slice(-500) }));
}
export function recordAnswer(pkg: string, part: string, scene: string, answer: Answer, xp: number): void {
  touchDay();
  update((s) => {
    const p = s.progress[pkg]?.[part] ?? { done: false, answers: {} };
    const first = !p.answers[scene];
    return {
      ...s,
      xp: s.xp + (first ? xp : 0),
      progress: { ...s.progress, [pkg]: { ...s.progress[pkg], [part]: { ...p, answers: { ...p.answers, [scene]: answer } } } },
    };
  });
  enqueue({ type: 'answer', pkg, part, scene, data: { answer } });
}
export function setCursor(pkg: string, part: string, cursor: string): void {
  update((s) => {
    const p = s.progress[pkg]?.[part] ?? { done: false, answers: {} };
    return { ...s, progress: { ...s.progress, [pkg]: { ...s.progress[pkg], [part]: { ...p, cursor } } } };
  });
}
export function completePart(pkg: string, part: string, xp: number, badges: string[]): void {
  touchDay();
  update((s) => {
    const p = s.progress[pkg]?.[part] ?? { done: false, answers: {} };
    const merged = Array.from(new Set([...s.badges, ...badges]));
    return {
      ...s,
      xp: s.xp + (p.done ? 0 : xp),
      badges: merged,
      progress: { ...s.progress, [pkg]: { ...s.progress[pkg], [part]: { ...p, done: true, cursor: undefined, completedAt: now() } } },
    };
  });
  enqueue({ type: 'part_complete', pkg, part });
}
export function resetPart(pkg: string, part: string): void {
  update((s) => {
    const prev = s.progress[pkg]?.[part];
    return { ...s, progress: { ...s.progress, [pkg]: { ...s.progress[pkg], [part]: { done: prev?.done ?? false, answers: {} } } } };
  });
}
export function addNote(n: Omit<Note, 'at'>): void {
  update((s) => ({ ...s, notes: [...s.notes, { ...n, at: now() }] }));
}
export function setNotices(list: Notice[]): void {
  update((s) => ({ ...s, notices: list }));
}
export function markNoticesRead(): void {
  update((s) => ({ ...s, notices: s.notices.map((n) => ({ ...n, read: true })) }));
}
export function replaceState(next: AppState): void {
  hydrate();
  commit(next);
}
export function drainQueue(): StudioEvent[] {
  const q = $state.get().queue;
  update((s) => ({ ...s, queue: [] }));
  return q;
}
export function requeue(events: StudioEvent[]): void {
  update((s) => ({ ...s, queue: [...events, ...s.queue].slice(-500) }));
}
