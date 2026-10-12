import test from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, mergeStates, parseBackup } from '../src/backup.ts';
import { fresh } from '../src/store.ts';
import { featuresFor } from '../src/features.ts';

const base = () => ({ ...fresh(), anonId: 'a' });

test('backup round-trips and strips queue and notices', () => {
  const s = { ...base(), xp: 120, days: ['2026-10-01'], badges: ['first-part'], queue: [{ type: 'x', at: 'now' }] };
  const r = parseBackup(exportBackup(s));
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.state.xp, 120); assert.deepEqual(r.state.queue, []); }
});
test('invalid or foreign files are rejected', () => {
  assert.deepEqual(parseBackup('not json'), { ok: false, reason: 'invalid' });
  assert.deepEqual(parseBackup(JSON.stringify({ format: 'other', version: 1, state: {} })), { ok: false, reason: 'invalid' });
  assert.deepEqual(parseBackup(JSON.stringify({ format: 'fcity-backup', version: 9, state: {} })), { ok: false, reason: 'version' });
  assert.deepEqual(parseBackup(JSON.stringify({ format: 'fcity-backup', version: 1, state: { v: 1, xp: 'x' } })), { ok: false, reason: 'invalid' });
});
test('merge keeps the union of two devices', () => {
  const a = { ...base(), xp: 50, days: ['2026-10-01'], notes: [{ pkg: 'p', kind: 'goal' as const, text: 'g', at: '1' }], progress: { p: { one: { done: false, answers: { s1: { kind: 'text' as const, text: 'x' } } } } } };
  const b = { ...base(), anonId: 'b', xp: 80, days: ['2026-10-02'], notes: [{ pkg: 'p', kind: 'goal' as const, text: 'g', at: '2' }], progress: { p: { one: { done: true, answers: {} }, two: { done: false, answers: {} } } } };
  const m = mergeStates(a, b);
  assert.equal(m.xp, 80);
  assert.deepEqual(m.days, ['2026-10-01', '2026-10-02']);
  assert.equal(m.notes.length, 1, 'duplicate goal merged');
  assert.equal(m.progress.p.one.done, true);
  assert.ok(m.progress.p.two);
  assert.equal(m.anonId, 'a');
});
test('local edition disables every backend module', () => {
  const f = featuresFor('local');
  assert.deepEqual(Object.entries(f).filter(([, v]) => v).map(([k]) => k), ['backup']);
});

import { normalizeSearch } from '../src/i18n.ts';
test('search normalisation unifies Persian and Arabic letters, digits and half-spaces', () => {
  assert.equal(normalizeSearch('كتاب'), normalizeSearch('کتاب'));
  assert.equal(normalizeSearch('مي‌خواهم'), normalizeSearch('میخواهم'));
  assert.equal(normalizeSearch('۱۲ ماه'), '12 ماه');
  assert.equal(normalizeSearch('  Hooked '), 'hooked');
});
