import test from 'node:test';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { convertLegacy } from '../src/migrate.ts';
import { PackageMetaSchema, PartSchema } from '../src/schema.ts';

const legacy = [
  { id: 's1-intro', type: 'narrative', narrationText: 'intro text', next: 's2' },
  { id: 's2-sort', type: 'sort', narrationText: 'order these', config: { items: ['a', 'b', 'c'], correctOrder: [2, 0, 1] } },
  { id: 's3-q', type: 'quiz', config: { question: 'q?', options: [{ text: 'x', correct: true, feedback: 'ok' }, { text: 'y', correct: false }] } },
  { id: 's4-t', type: 'tangle', narrationText: 'slide it', config: { outputTemplate: 'result' } },
  { id: 's5-x', type: 'radar' },
];

test('legacy conversion produces schema-valid files and reports what it dropped', () => {
  const r = convertLegacy(legacy, { slug: 'old-game', title: 'Old', chunk: 3 });
  assert.equal(r.parts, 2);
  assert.ok(r.warnings.some((w) => w.includes('radar')));
  assert.ok(r.warnings.some((w) => w.includes('tangle')));
  PackageMetaSchema.parse(YAML.parse(r.files['package.yaml']));
  for (const k of Object.keys(r.files).filter((f) => f.startsWith('parts/'))) PartSchema.parse(YAML.parse(r.files[k]));
  const p1 = YAML.parse(r.files['parts/part-1.yaml']);
  const sort = p1.scenes.find((s: { type: string }) => s.type === 'sort');
  assert.deepEqual(sort.correctOrder, ['i3', 'i1', 'i2'], 'index order becomes id order');
  const quiz = p1.scenes.find((s: { type: string }) => s.type === 'quiz');
  assert.equal(quiz.options.filter((o: { correct?: boolean }) => o.correct).length, 1);
});
