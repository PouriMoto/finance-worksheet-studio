// Variable reward: the insight shown after a part depends on the user's own answers (deterministic, not random).
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function pickReward<T>(pool: T[], seed: string): T | null {
  if (!pool.length) return null;
  return pool[hashSeed(seed) % pool.length];
}
export const BADGES = { PERFECT_PART: 'perfect-part', FIRST_PART: 'first-part', WEEK_STREAK: 'week-streak' } as const;
