import test from 'node:test';
import assert from 'node:assert/strict';
import { runSim } from '../src/models.ts';
import { applyDay, currentStreak } from '../src/streak.ts';
import { bandOf, computeEvidence } from '../src/profile.ts';
import { pickReward } from '../src/rewards.ts';
import type { ResolvedPart } from '@hormat/content/schema';

test('runway model', () => {
  assert.equal(runSim('runway', { savings: 75, expenses: 25 }).value, 3);
  assert.equal(runSim('runway', { savings: 75, expenses: 0 }).value, 0);
});
test('purchasing power matches the worked example', () => {
  const r = runSim('purchasing-power', { amount: 100, inflation: 30, years: 5 });
  assert.ok(Math.abs(r.value - 26.9) < 0.1);
});
test('margin of safety', () => {
  assert.equal(runSim('margin-of-safety', { value: 100, price: 70 }).value, 30);
  assert.ok(runSim('margin-of-safety', { value: 100, price: 120 }).value < 0);
});
test('rebalance drift', () => {
  const r = runSim('rebalance', { growth: 40 });
  assert.ok(Math.abs(r.value - 58.33) < 0.1);
});
test('streak counts consecutive days and uses a freeze for one missed day', () => {
  let s = { days: ['2026-10-01', '2026-10-02'], freezeDays: [] as string[], freezes: 1 };
  s = applyDay(s, '2026-10-04'); // missed the 3rd
  assert.deepEqual(s.freezeDays, ['2026-10-03']);
  assert.equal(s.freezes, 0);
  assert.equal(currentStreak(s, '2026-10-04'), 4);
  const lost = applyDay({ days: ['2026-10-01'], freezeDays: [], freezes: 0 }, '2026-10-04');
  assert.equal(currentStreak(lost, '2026-10-04'), 1);
});
test('streak grants a freeze every 7 days', () => {
  let s = { days: [] as string[], freezeDays: [] as string[], freezes: 0 };
  for (let d = 1; d <= 7; d++) s = applyDay(s, `2026-10-0${d}`);
  assert.equal(s.freezes, 1);
});
test('profile evidence uses only scored answers', () => {
  const part = {
    id: 'p', emoji: '', minutes: 1, title: '', summary: '',
    scenes: [{ id: 'q', type: 'choice', text: {}, options: [{ id: 'a', dims: { x: 0 } }, { id: 'b', dims: { x: 2 } }] }],
  } as unknown as ResolvedPart;
  const good = computeEvidence([part], { p: { q: { kind: 'option', optionId: 'b' } } }, ['x'])[0];
  assert.equal(good.band, 'high');
  assert.equal(good.count, 1);
  const none = computeEvidence([part], {}, ['x'])[0];
  assert.equal(none.count, 0);
  assert.equal(bandOf(0.5), 'mid');
});
test('variable reward is deterministic per answers', () => {
  const pool = ['a', 'b', 'c'];
  assert.equal(pickReward(pool, 'seed-1'), pickReward(pool, 'seed-1'));
  assert.equal(pickReward([], 'x'), null);
});
