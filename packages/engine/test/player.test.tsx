// Integration test: auto-plays every part of every package in jsdom, in every declared locale.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
const g = globalThis as Record<string, unknown>;
for (const [k, v] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent })) {
  Object.defineProperty(g, k, { value: v, configurable: true, writable: true });
}
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react');
const React = await import('react');
const { loadContent, resolvePackage } = await import('@hormat/content/node');
const { PartPlayer, $state, t } = await import('../src/index.ts');

const content = loadContent(path.resolve(import.meta.dirname, '../../../content'));

function autoplay(locale: string, nextButtonGuard = 80) {
  for (let step = 0; step < nextButtonGuard; step++) {
    if (screen.queryByText(t(locale, 'done.title'))) return true;
    const lefts = Array.from(document.querySelectorAll('[data-left]')) as HTMLElement[];
    if (lefts.length && !screen.queryByText(t(locale, 'btn.continue'))) {
      for (const l of lefts) { fireEvent.click(l); fireEvent.click(document.querySelector(`[data-right="${l.getAttribute('data-left')}"]`)!); }
    }
    const radios = screen.queryAllByRole('radio').filter((r) => !(r as HTMLButtonElement).disabled);
    if (radios.length) { fireEvent.click(radios[0]); }
    else if (document.querySelector('textarea')) {
      fireEvent.change(document.querySelector('textarea')!, { target: { value: 'test note' } });
      fireEvent.click(screen.getByText(t(locale, 'btn.save')));
    } else if (screen.queryByText(t(locale, 'btn.check'))) {
      fireEvent.click(screen.getByText(t(locale, 'btn.check')));
    }
    const cont = screen.queryByText(t(locale, 'btn.continue')) ?? screen.queryByText(t(locale, 'btn.finish'));
    if (!cont) continue;
    fireEvent.click(cont);
  }
  return false;
}

for (const pkgData of content.packages) {
  for (const locale of pkgData.meta.locales) {
    test(`autoplay ${pkgData.meta.slug} [${locale}]`, () => {
      const pkg = resolvePackage(pkgData, locale)!;
      for (const part of pkg.parts) {
        const dimTexts = content.dimTexts[locale];
        const dimEmoji = Object.fromEntries(content.dims.map((d) => [d.id, d.emoji]));
        const view = render(React.createElement(PartPlayer, {
          locale, pkg: { meta: pkg.meta, title: pkg.title, author: pkg.author, rewards: pkg.rewards, parts: pkg.parts },
          partId: part.id, dimTexts, dimEmoji, nav: { packageHref: '/x/' },
        }));
        assert.ok(autoplay(locale), `${pkg.meta.slug}/${part.id} should reach the completion screen`);
        assert.ok(screen.queryByText(t(locale, 'done.xp', { n: locale === 'fa' ? '۳۰' : '30' })), 'xp shown');
        view.unmount();
        cleanup();
      }
      const s = $state.get();
      assert.ok(s.xp > 0);
      assert.ok(pkg.parts.every((p) => s.progress[pkg.meta.slug]?.[p.id]?.done));
    });
  }
}

test('report shows evidence labels after the last part', () => {
  const pkgData = content.packages.find((p) => p.meta.slug === 'runway-game')!;
  const pkg = resolvePackage(pkgData, 'en')!;
  localStorage.clear();
  render(React.createElement(PartPlayer, {
    locale: 'en', pkg: { meta: pkg.meta, title: pkg.title, author: pkg.author, rewards: pkg.rewards, parts: pkg.parts },
    partId: 'main', dimTexts: content.dimTexts.en, dimEmoji: {}, nav: { packageHref: '/x/' },
  }));
  // stop right before finishing: play until the report heading appears
  for (let i = 0; i < 60 && !screen.queryByText(new RegExp(t('en', 'report.title'))); i++) {
    const radios = screen.queryAllByRole('radio').filter((r) => !(r as HTMLButtonElement).disabled);
    if (radios.length) fireEvent.click(radios[0]);
    else if (screen.queryByText(t('en', 'btn.check'))) fireEvent.click(screen.getByText(t('en', 'btn.check')));
    const cont = screen.queryByText(t('en', 'btn.continue'));
    if (cont) fireEvent.click(cont);
  }
  assert.ok(screen.queryByText(/Risk awareness/), 'report lists the risk dimension');
  assert.ok(screen.queryByText(/Long-term thinking/));
  cleanup();
});

test('printable report lists behaviour evidence from saved answers and no scene text', async () => {
  const { ReportSheet } = await import('../src/index.ts');
  localStorage.clear();
  const pkgData = content.packages.find((p) => p.meta.slug === 'runway-game')!;
  const pkg = resolvePackage(pkgData, 'en')!;
  render(React.createElement(PartPlayer, {
    locale: 'en', pkg: { meta: pkg.meta, title: pkg.title, author: pkg.author, rewards: pkg.rewards, parts: pkg.parts },
    partId: 'main', dimTexts: content.dimTexts.en, dimEmoji: {}, nav: { packageHref: '/x/' },
  }));
  assert.ok(autoplay('en'));
  cleanup();
  const scoring = Object.fromEntries([pkg].map((p) => [p.meta.slug, {
    dims: p.meta.dims,
    parts: p.parts.map((pt) => ({ id: pt.id, scenes: pt.scenes.filter((s) => s.type === 'choice' || s.type === 'quiz' || s.type === 'sort').map((s) => ({ id: s.id, type: s.type, ...(s.type === 'sort' ? { dims: s.dims } : { options: (s as { options: { id: string; dims?: Record<string, number> }[] }).options.map((o) => ({ id: o.id, dims: o.dims })) }) })) })),
  }]));
  assert.ok(!JSON.stringify(scoring).includes('Imagine no income'), 'scoring index carries no scene text');
  const catalog = [{ slug: pkg.meta.slug, title: pkg.title, emoji: '🛟', accent: 'amber', type: 'game', minutes: 8, level: 'beginner', tags: [], description: '', parts: pkg.parts.map((p) => ({ id: p.id, title: p.title, locked: false })), href: '/x/', category: 'money', featured: false, access: 'free' as const }];
  render(React.createElement(ReportSheet, { locale: 'en', catalog, scoring, dimTexts: content.dimTexts.en, dimEmoji: {} }));
  assert.ok(screen.queryAllByText(/Risk awareness/).length > 0);
  assert.ok(screen.queryAllByText(t('en', 'pdf.download'), { exact: false }).length > 0);
  cleanup();
});
