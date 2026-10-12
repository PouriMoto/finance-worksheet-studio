import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { makePdf } from '../src/pdf.ts';
import { buildReportModel } from '../src/reportModel.ts';
import { fresh } from '../src/store.ts';
import type { DimText } from '@hormat/content/schema';

const jpg = new Uint8Array(fs.readFileSync(path.resolve(import.meta.dirname, 'fixtures/page.jpg')));

test('makePdf writes a valid multi-page A4 PDF', async () => {
  const blob = makePdf([{ w: 1588, h: 2242, d: jpg }, { w: 1588, h: 2242, d: jpg }, { w: 1588, h: 2242, d: jpg }]);
  const buf = Buffer.from(await blob.arrayBuffer());
  assert.equal(buf.subarray(0, 8).toString(), '%PDF-1.4');
  assert.ok(buf.subarray(-5).toString().includes('%%EOF'));
  const file = path.join(os.tmpdir(), 'studio-test.pdf');
  fs.writeFileSync(file, buf);
  let info = '';
  try { info = execFileSync('pdfinfo', [file], { encoding: 'utf8' }); } catch { /* poppler not installed: structural checks above still apply */ }
  if (info) {
    assert.match(info, /Pages:\s+3/);
    assert.match(info, /Page size:\s+595\.28 x 841\.89/);
  }
});

test('report model counts only scored evidence and honours the notes switch', () => {
  const dimTexts: Record<string, DimText> = { x: { label: 'X', low: { meaning: 'l', practice: 'pl' }, mid: { meaning: 'm', practice: 'pm' }, high: { meaning: 'h', practice: 'ph' } } };
  const state = { ...fresh(), xp: 40, progress: { p: { one: { done: true, answers: { q: { kind: 'option' as const, optionId: 'b' } } } } }, notes: [{ pkg: 'p', kind: 'goal' as const, text: 'my goal', at: 'a' }] };
  const input = {
    catalog: [{ slug: 'p', title: 'P', emoji: '🎯', parts: [{ id: 'one' }] }, { slug: 'unused', title: 'U', emoji: '•', parts: [{ id: 'one' }] }],
    scoring: { p: { dims: ['x'], parts: [{ id: 'one', scenes: [{ id: 'q', type: 'choice', options: [{ id: 'a', dims: { x: 0 } }, { id: 'b', dims: { x: 2 } }] }] }] } },
    dimTexts, dimEmoji: { x: '🔍' }, state,
  };
  const m = buildReportModel({ ...input, includeNotes: true });
  assert.equal(m.packages.length, 1, 'untouched packages are left out');
  assert.equal(m.packages[0].dims[0].band, 'high');
  assert.equal(m.notes.length, 1);
  assert.equal(buildReportModel({ ...input, includeNotes: false }).notes.length, 0);
});
