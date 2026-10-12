// Backup and restore for the local edition (data lives only in this browser).
import { $state, fresh, replaceState, type AppState, type PartProgress } from './store.ts';

export const BACKUP_FORMAT = 'fcity-backup';

export function exportBackup(state: AppState = $state.get()): string {
  const clean: AppState = { ...state, queue: [], notices: [] };
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), state: clean }, null, 1);
}

const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((v) => typeof v === 'string');
function isAppState(x: unknown): x is AppState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return s.v === 1 && typeof s.anonId === 'string' && Number.isFinite(s.xp) && isStrArr(s.days) && isStrArr(s.freezeDays) &&
    Number.isFinite(s.freezes) && isStrArr(s.badges) && !!s.progress && typeof s.progress === 'object' && Array.isArray(s.notes);
}

export type ParseResult = { ok: true; state: AppState } | { ok: false; reason: 'invalid' | 'version' };
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: 'invalid' }; }
  const d = data as { format?: string; version?: number; state?: unknown };
  if (!d || d.format !== BACKUP_FORMAT) return { ok: false, reason: 'invalid' };
  if (d.version !== 1) return { ok: false, reason: 'version' };
  if (!isAppState(d.state)) return { ok: false, reason: 'invalid' };
  return { ok: true, state: { ...d.state, queue: [], notices: [] } };
}

function mergeProgress(a: Record<string, PartProgress> = {}, b: Record<string, PartProgress> = {}): Record<string, PartProgress> {
  const out: Record<string, PartProgress> = { ...a };
  for (const [id, pb] of Object.entries(b)) {
    const pa = out[id];
    if (!pa) { out[id] = pb; continue; }
    const pick = pa.done !== pb.done ? (pa.done ? pa : pb) : Object.keys(pa.answers).length >= Object.keys(pb.answers).length ? pa : pb;
    out[id] = { ...pick, done: pa.done || pb.done };
  }
  return out;
}

// Union of two devices' data. XP cannot be summed safely (overlap is unknown), so the larger value wins.
export function mergeStates(a: AppState, b: AppState): AppState {
  const progress: AppState['progress'] = {};
  for (const slug of new Set([...Object.keys(a.progress), ...Object.keys(b.progress)])) progress[slug] = mergeProgress(a.progress[slug], b.progress[slug]);
  const seen = new Set<string>();
  const notes = [...a.notes, ...b.notes].filter((n) => { const k = `${n.pkg}|${n.kind}|${n.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return {
    ...a,
    xp: Math.max(a.xp, b.xp),
    days: Array.from(new Set([...a.days, ...b.days])).sort(),
    freezeDays: Array.from(new Set([...a.freezeDays, ...b.freezeDays])).sort(),
    freezes: Math.max(a.freezes, b.freezes),
    badges: Array.from(new Set([...a.badges, ...b.badges])),
    progress,
    notes,
    notices: [],
    queue: [],
  };
}

export function importBackup(text: string, mode: 'merge' | 'replace' = 'merge'): ParseResult {
  const r = parseBackup(text);
  if (!r.ok) return r;
  const next = mode === 'replace' ? { ...fresh(), ...r.state } : mergeStates($state.get(), r.state);
  replaceState(next);
  return { ok: true, state: next };
}
