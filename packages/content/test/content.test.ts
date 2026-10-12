import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateContent, lintI18n } from '../src/validate.ts';
import { defaultContentRoot } from '../src/node.ts';

test('shipped content has zero errors', () => {
  const { issues } = validateContent(path.resolve(import.meta.dirname, '../../../content'));
  assert.deepEqual(issues.filter((i) => i.level === 'error'), []);
});
test('code contains no hardcoded Persian', () => {
  assert.deepEqual(lintI18n(path.resolve(import.meta.dirname, '../../..')), []);
});
test('validator catches a missing translation and a broken link', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
  fs.cpSync(path.resolve(import.meta.dirname, '../../../content'), tmp, { recursive: true });
  const f = path.join(tmp, 'packages/runway-game/locales/en.yaml');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('first-move:', 'first-moved:'));
  const pkg = path.join(tmp, 'packages/runway-game/package.yaml');
  fs.writeFileSync(pkg, fs.readFileSync(pkg, 'utf8').replace('next: hooked-book', 'next: nope'));
  const { issues } = validateContent(tmp);
  const msgs = issues.filter((i) => i.level === 'error').map((i) => i.message).join('\n');
  assert.match(msgs, /missing scene text/);
  assert.match(msgs, /next "nope" does not exist/);
});
void defaultContentRoot;

test('local edition locks premium parts: no scenes, no scene text', async () => {
  const { loadContent, resolvePackage } = await import('../src/node.ts');
  const c = loadContent(path.resolve(import.meta.dirname, '../../../content'));
  const base = c.packages.find((p) => p.meta.slug === 'investor-book')!;
  const mixed = { ...base, parts: base.parts.map((p, i) => ({ ...p, access: i === 0 ? ('free' as const) : ('premium' as const) })) };
  const local = resolvePackage(mixed, 'fa', 'local')!;
  assert.equal(local.parts[0].locked, false);
  assert.ok(local.parts[0].scenes.length > 0);
  assert.ok(local.parts[0].sceneKinds[0].title, 'free scenes may show a title excerpt');
  const locked = local.parts[1];
  assert.equal(locked.locked, true);
  assert.equal(locked.scenes.length, 0);
  assert.ok(locked.sceneCount > 0 && locked.sceneKinds.length === locked.sceneCount);
  assert.ok(locked.sceneKinds.every((k) => k.title === undefined));
  const blob = JSON.stringify(locked);
  assert.ok(!blob.includes('قدرت خرید به پول امروز'), 'premium text is absent');
  const cloud = resolvePackage(mixed, 'fa', 'cloud')!;
  assert.ok(cloud.parts.every((p) => !p.locked && p.scenes.length > 0));
});
