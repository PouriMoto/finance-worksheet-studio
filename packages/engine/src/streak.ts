// Streak with freezes. Days are local YYYY-MM-DD strings.
export interface StreakState { days: string[]; freezeDays: string[]; freezes: number }

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function currentStreak(s: StreakState, today: string): number {
  const set = new Set([...s.days, ...s.freezeDays]);
  let cur = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cur)) {
    n += 1;
    cur = addDays(cur, -1);
  }
  return n;
}

// Call once when the user does something today. A single missed day is covered by a freeze if one is available.
export function applyDay(s: StreakState, today: string): StreakState {
  if (s.days.includes(today)) return s;
  let next: StreakState = { days: [...s.days, today], freezeDays: [...s.freezeDays], freezes: s.freezes };
  const yesterday = addDays(today, -1);
  const dayBefore = addDays(today, -2);
  const had = new Set([...s.days, ...s.freezeDays]);
  if (!had.has(yesterday) && had.has(dayBefore) && s.freezes > 0) {
    next = { ...next, freezeDays: [...next.freezeDays, yesterday], freezes: s.freezes - 1 };
  }
  const streak = currentStreak(next, today);
  if (streak > 0 && streak % FREEZE_EVERY === 0 && next.freezes < MAX_FREEZES) next = { ...next, freezes: next.freezes + 1 };
  return next;
}
