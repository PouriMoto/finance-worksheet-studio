// Tokens/points rules. Pure functions: the same logic is mirrored by PocketBase hooks (server is the authority).
import { z } from 'zod';

const ByTier = z.record(z.string(), z.number().positive());

export const EconomySchema = z.object({
  version: z.number().int(),
  tokens: z.object({
    monthly_grant: z.number().int().positive(),
    rollover_cap: z.number().int().min(0),
    rental_days: z.number().int().positive(),
    part_cost: ByTier,
    bundle_discount: z.number().min(0).max(0.5),
    daily_unlock_cap: z.number().int().positive(),
  }),
  points: z.object({
    first_completion: z.number().positive(),
    perfect_bonus: z.number().min(0),
    streak_bonus: z.object({ min_days: z.number().int().positive(), bonus: z.number().min(0) }),
    daily_cap: z.number().positive(),
    min_seconds_per_part: z.number().min(0),
    min_answered_ratio: z.number().min(0).max(1),
    unlock_cost: z.number().positive(),
    tier_multiplier: ByTier,
    rental_days: z.number().int().positive(),
    expire_days: z.number().int().positive(),
    max_balance: z.number().positive(),
  }),
  ai: z.object({ summary_credits: z.number().int().positive(), summaries_per_day: z.number().int().positive() }),
  limits: z.object({
    pdf_per_day: z.number().int().positive(),
    otp_per_hour: z.number().int().positive(),
    break_nudge_minutes: z.number().int().positive(),
  }),
});
export type Economy = z.infer<typeof EconomySchema>;

export const maxPointsPerPart = (e: Economy) => e.points.first_completion + e.points.perfect_bonus + e.points.streak_bonus.bonus;
export const tokenCost = (e: Economy, tier: number) => e.tokens.part_cost[String(tier)] ?? e.tokens.part_cost['1'];
export const bundleTokenCost = (e: Economy, tier: number, parts: number) => Math.round(tokenCost(e, tier) * parts * (1 - e.tokens.bundle_discount));
export const pointsUnlockCost = (e: Economy, tier: number) => Math.round(e.points.unlock_cost * (e.points.tier_multiplier[String(tier)] ?? 1));

export type AwardReason = 'ok' | 'replay' | 'too_fast' | 'too_few_answers' | 'daily_cap';
export interface AwardInput {
  firstCompletion: boolean;
  perfect: boolean;
  streakDays: number;
  elapsedSeconds: number;
  answeredRatio: number;
  earnedToday: number;
}
export function awardPoints(e: Economy, i: AwardInput): { points: number; reason: AwardReason } {
  const p = e.points;
  if (!i.firstCompletion) return { points: 0, reason: 'replay' };
  if (i.elapsedSeconds < p.min_seconds_per_part) return { points: 0, reason: 'too_fast' };
  if (i.answeredRatio < p.min_answered_ratio) return { points: 0, reason: 'too_few_answers' };
  let pts = p.first_completion + (i.perfect ? p.perfect_bonus : 0) + (i.streakDays >= p.streak_bonus.min_days ? p.streak_bonus.bonus : 0);
  const room = Math.max(0, p.daily_cap - i.earnedToday);
  if (room === 0) return { points: 0, reason: 'daily_cap' };
  pts = Math.min(pts, room);
  return { points: pts, reason: 'ok' };
}

// Design invariants. A broken economy must fail the build, not production.
export function checkEconomy(e: Economy): string[] {
  const out: string[] = [];
  const minUnlock = Math.min(...Object.keys(e.points.tier_multiplier).map((t) => pointsUnlockCost(e, Number(t))));
  if (minUnlock < 5 * maxPointsPerPart(e)) out.push(`cheapest points unlock (${minUnlock}) must be >= 5x the max points per part (${maxPointsPerPart(e)}): otherwise replaying unlocked parts can farm free access`);
  if (e.points.daily_cap < maxPointsPerPart(e)) out.push('points.daily_cap is below the points of a single part');
  if (e.points.max_balance < minUnlock) out.push('points.max_balance is below the cheapest unlock: points could never be spent');
  if (e.tokens.monthly_grant < bundleTokenCost(e, 1, 4)) out.push('tokens.monthly_grant cannot cover one 4-part tier-1 package');
  if (e.tokens.rollover_cap > e.tokens.monthly_grant) out.push('tokens.rollover_cap should not exceed monthly_grant (hoarding)');
  return out;
}
