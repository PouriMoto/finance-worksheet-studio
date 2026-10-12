import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadContent } from '../src/node.ts';
import { awardPoints, bundleTokenCost, checkEconomy, maxPointsPerPart, pointsUnlockCost, tokenCost } from '../src/economy.ts';

const eco = loadContent(path.resolve(import.meta.dirname, '../../../content')).economy!;

test('shipped economy satisfies its design invariants', () => {
  assert.ok(eco);
  assert.deepEqual(checkEconomy(eco), []);
});
test('replays, speed-runs and low-effort runs earn nothing', () => {
  const base = { firstCompletion: true, perfect: true, streakDays: 5, elapsedSeconds: 300, answeredRatio: 1, earnedToday: 0 };
  assert.equal(awardPoints(eco, { ...base, firstCompletion: false }).reason, 'replay');
  assert.equal(awardPoints(eco, { ...base, elapsedSeconds: 10 }).reason, 'too_fast');
  assert.equal(awardPoints(eco, { ...base, answeredRatio: 0.2 }).reason, 'too_few_answers');
  assert.equal(awardPoints(eco, base).points, maxPointsPerPart(eco));
});
test('daily cap bounds heavy players', () => {
  let earned = 0;
  for (let i = 0; i < 30; i++) earned += awardPoints(eco, { firstCompletion: true, perfect: true, streakDays: 9, elapsedSeconds: 400, answeredRatio: 1, earnedToday: earned }).points;
  assert.equal(earned, eco.points.daily_cap);
});
test('farming simulation: points never pay for themselves', () => {
  // A user plays every free part once (best case), then rents premium parts with points and plays them once.
  const freeParts = 12;
  let points = 0, day = 0, earnedToday = 0, rentals = 0;
  const queue = Array.from({ length: freeParts }, () => 'free');
  while (queue.length || points >= pointsUnlockCost(eco, 1)) {
    if (points >= pointsUnlockCost(eco, 1)) { points -= pointsUnlockCost(eco, 1); rentals++; queue.push('rented'); continue; }
    queue.shift();
    const r = awardPoints(eco, { firstCompletion: true, perfect: true, streakDays: 9, elapsedSeconds: 400, answeredRatio: 1, earnedToday });
    earnedToday += r.points; points += r.points;
    if (earnedToday >= eco.points.daily_cap) { day++; earnedToday = 0; }
    assert.ok(day < 365, 'terminates');
  }
  // 12 free parts can fund at most floor(12*18/120) rentals, and each rental returns <= 18 points.
  assert.ok(rentals <= Math.floor((freeParts * maxPointsPerPart(eco)) / (pointsUnlockCost(eco, 1) - maxPointsPerPart(eco))) + 1);
  assert.ok(rentals <= 2);
});
test('subscription covers about four books but not an unlimited catalog', () => {
  assert.ok(eco.tokens.monthly_grant >= bundleTokenCost(eco, 1, 4));
  assert.ok(Math.floor(eco.tokens.monthly_grant / tokenCost(eco, 1)) <= 15);
});
test('broken economy is rejected', () => {
  const bad = structuredClone(eco);
  bad.points.unlock_cost = 40;
  assert.ok(checkEconomy(bad).length > 0);
});
