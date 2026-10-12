import { useRef, useState } from 'react';
import type { DimText } from '@hormat/content/schema';
import { Button } from './ui/button.tsx';
import { Card } from './ui/card.tsx';
import { BandScale } from './viz/index.tsx';
import { useStore } from '@nanostores/react';
import { $state, hydrate } from './store.ts';
import { useEffect } from 'react';
import { fmtDate, fmtNumber, dirOf, t } from './i18n.ts';
import { buildReportModel, type CatalogLite, type ReportModel, type ScoringIndex } from './reportModel.ts';
import { VAZIR_RANGES, downloadBlob, embedFontCss, fitSheet, makePdf, sharePdf, sheetJpeg } from './pdf.ts';
import { dayKey } from './streak.ts';

export type { ScoringIndex, ScoringPart } from './reportModel.ts';

const BAND_COLOR = { low: '#D93B3B', mid: '#F2780C', high: '#17803D' } as const;
const SHEET_CSS = `
.rp-sheet,.rp-sheet *{font-family:'ReportFont',Tahoma,sans-serif;box-sizing:border-box}
.rp-sheet{width:794px;height:1121px;overflow:hidden;background:#fff;padding:38px 40px 60px;position:relative;color:#10222B}
.rp-in{width:714px;font-size:14px;line-height:1.9}
.rp-h1{font-size:28px;font-weight:800;margin:0 0 4px}
.rp-muted{color:#5B6F78;font-size:12px}
.rp-card{border:1px solid #DCE6E4;border-radius:14px;padding:14px 16px;margin:0 0 12px;background:#fff}
.rp-row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.rp-bar{position:relative;height:8px;border-radius:4px;display:flex;gap:3px;margin:8px 0 4px;direction:ltr}
.rp-bar i{flex:1;border-radius:4px;opacity:.7}
.rp-dot{position:absolute;top:-4px;width:16px;height:16px;border-radius:50%;background:#10222B;border:2px solid #fff;margin-left:-8px}
.rp-foot{position:absolute;bottom:22px;left:40px;right:40px;display:flex;justify-content:space-between;font-size:11px;color:#5B6F78}
.rp-pill{display:inline-block;border-radius:999px;background:#DDF3EE;color:#0F766E;padding:2px 12px;font-weight:700;font-size:13px;margin-inline-end:6px}
`;

function Bar({ ratio, rtl }: { ratio: number; rtl: boolean }) {
  return (
    <div className="rp-bar">
      {['#D93B3B', '#F2780C', '#17803D'].map((c) => <i key={c} style={{ background: c }} />)}
      <span className="rp-dot" style={{ left: `${(rtl ? 1 - ratio : ratio) * 100}%` }} />
    </div>
  );
}

function Sheets({ locale, m, total }: { locale: string; m: ReportModel; total: number }) {
  const rtl = dirOf(locale) === 'rtl';
  const foot = (n: number) => <div className="rp-foot"><span>{t(locale, 'app.name')}</span><span>{t(locale, 'pdf.page', { n: fmtNumber(locale, n), total: fmtNumber(locale, total) })}</span></div>;
  let page = 1;
  return (
    <div id="rp-sheets" dir={rtl ? 'rtl' : 'ltr'} style={{ position: 'absolute', top: 0, insetInlineEnd: 0, width: 794, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}>
      <div className="rp-sheet"><div className="rp-in">
        <h1 className="rp-h1">{t(locale, 'pdf.cover_title')}</h1>
        <p className="rp-muted">{t(locale, 'report.generated')}: {fmtDate(locale, m.generatedAt)}</p>
        <div className="rp-card" style={{ marginTop: 16 }}>
          <b>{t(locale, 'pdf.summary')}</b><br />
          <span className="rp-pill">⭐ {fmtNumber(locale, m.xp)}</span>
          <span className="rp-pill">🔥 {fmtNumber(locale, m.streak)}</span>
          <span className="rp-pill">{t(locale, 'pdf.parts_done')}: {fmtNumber(locale, m.partsDone)}/{fmtNumber(locale, m.partsTotal)}</span>
        </div>
        {m.packages.map((p) => (
          <div key={p.slug} className="rp-card">
            <div className="rp-row"><b>{p.emoji} {p.title}</b><span className="rp-muted">{fmtNumber(locale, p.partsDone)}/{fmtNumber(locale, p.partsTotal)}</span></div>
            {p.dims.map((d) => <div key={d.dim} className="rp-row" style={{ fontSize: 12 }}><span>{d.emoji} {d.label}</span><span style={{ color: BAND_COLOR[d.band], fontWeight: 700 }}>{t(locale, `report.${d.band}`)}</span></div>)}
          </div>
        ))}
        <p className="rp-muted">{t(locale, 'report.disclaimer')}</p>
      </div>{foot(page++)}</div>
      {m.packages.filter((p) => p.dims.length > 0).map((p) => (
        <div key={p.slug} className="rp-sheet"><div className="rp-in">
          <h1 className="rp-h1">{p.emoji} {p.title}</h1>
          <p className="rp-muted">{t(locale, `report.conf.${p.confidence}`)}</p>
          {p.dims.map((d) => (
            <div key={d.dim} className="rp-card">
              <div className="rp-row"><b>{d.emoji} {d.label}</b><span className="rp-muted">{t(locale, 'report.basis', { n: fmtNumber(locale, d.count) })}</span></div>
              <Bar ratio={d.ratio} rtl={rtl} />
              <p style={{ margin: '4px 0' }}><b>{t(locale, 'report.meaning')}: </b>{d.meaning}</p>
              <p style={{ margin: '4px 0' }}><b>{t(locale, 'report.practice')}: </b>{d.practice}</p>
            </div>
          ))}
        </div>{foot(page++)}</div>
      ))}
      {m.notes.length > 0 && (
        <div className="rp-sheet"><div className="rp-in">
          <h1 className="rp-h1">🎯 {t(locale, 'me.goals')} / 📝 {t(locale, 'me.notes')}</h1>
          {m.notes.map((n, i) => <div key={i} className="rp-card"><div className="rp-muted">{n.pkgTitle}</div>{n.text}</div>)}
        </div>{foot(page++)}</div>
      )}
    </div>
  );
}

export const sheetCount = (m: ReportModel) => 1 + m.packages.filter((p) => p.dims.length > 0).length + (m.notes.length > 0 ? 1 : 0);

// Report screen: reading view + PDF (download, share) + print fallback.
export function ReportSheet({ locale, catalog, scoring, dimTexts, dimEmoji, fontUrls }: {
  locale: string; catalog: (CatalogLite & { parts: { id: string }[] })[]; scoring: ScoringIndex; dimTexts: Record<string, DimText>; dimEmoji: Record<string, string>;
  fontUrls?: { arabic: string; latin: string };
}) {
  const s = useStore($state);
  useEffect(() => { hydrate(); }, []);
  const [withNotes, setWithNotes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const rtl = dirOf(locale) === 'rtl';
  const model = buildReportModel({ catalog, scoring, dimTexts, dimEmoji, state: s, includeNotes: withNotes });
  const total = sheetCount(model);

  async function build(): Promise<Blob> {
    const root = wrap.current!.querySelector<HTMLElement>('#rp-sheets')!;
    await document.fonts.ready;
    const css = SHEET_CSS + (fontUrls ? await embedFontCss([{ url: fontUrls.arabic, range: VAZIR_RANGES.arabic }, { url: fontUrls.latin, range: VAZIR_RANGES.latin }]) : '');
    const pages = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('.rp-sheet'))) {
      fitSheet(el, rtl);
      pages.push(await sheetJpeg(el, css, locale, rtl));
    }
    return makePdf(pages);
  }
  async function run(kind: 'download' | 'share') {
    setBusy(true); setMsg(t(locale, 'pdf.working'));
    try {
      const blob = await build();
      const name = `report-${dayKey()}.pdf`;
      if (kind === 'download') { downloadBlob(blob, name); setMsg(''); }
      else { const r = await sharePdf(blob, name, t(locale, 'pdf.cover_title')); setMsg(r === 'downloaded' ? t(locale, 'pdf.shared_fallback') : ''); }
    } catch { setMsg(t(locale, 'pdf.failed')); } finally { setBusy(false); }
  }

  return (
    <div ref={wrap} className="relative space-y-6">
      <div className="space-y-2 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void run('download')} disabled={busy || model.packages.length === 0}>⬇️ {t(locale, 'pdf.download')}</Button>
          <Button variant="soft" onClick={() => void run('share')} disabled={busy || model.packages.length === 0}>📤 {t(locale, 'pdf.share')}</Button>
          <Button variant="outline" onClick={() => window.print()} disabled={model.packages.length === 0}>🖨️ {t(locale, 'pdf.print')}</Button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} />{t(locale, 'report.include_notes')}</label>
        {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
      </div>
      <header>
        <h1 className="text-2xl font-extrabold">{t(locale, 'report.sheet_title')}</h1>
        <p className="text-sm text-muted">{t(locale, 'report.generated')}: {fmtDate(locale, model.generatedAt)}</p>
      </header>
      {model.packages.length === 0 && <p className="text-muted">{t(locale, 'report.empty_all')}</p>}
      {model.packages.map((p) => (
        <section key={p.slug} className="space-y-3 break-inside-avoid">
          <h2 className="text-lg font-bold">{p.emoji} {p.title}</h2>
          {p.dims.length === 0 && <p className="text-sm text-muted">{t(locale, 'report.empty')}</p>}
          {p.dims.map((d) => (
            <Card key={d.dim} className="space-y-2 break-inside-avoid">
              <div className="flex justify-between gap-2"><b>{d.emoji} {d.label}</b><span className="text-xs text-muted">{t(locale, 'report.basis', { n: d.count })}</span></div>
              <BandScale locale={locale} ratio={d.ratio} />
              <p className="leading-8"><b>{t(locale, 'report.meaning')}: </b>{d.meaning}</p>
              <p className="leading-8"><b>{t(locale, 'report.practice')}: </b>{d.practice}</p>
            </Card>
          ))}
        </section>
      ))}
      {model.notes.length > 0 && (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="text-lg font-bold">🎯 {t(locale, 'me.goals')} / 📝 {t(locale, 'me.notes')}</h2>
          {model.notes.map((n, i) => <p key={i} className="rounded-xl border border-line p-3 leading-7"><span className="text-xs text-muted">{n.pkgTitle}</span><br />{n.text}</p>)}
        </section>
      )}
      <p className="text-xs leading-6 text-muted">{t(locale, 'report.disclaimer')}</p>
      <style>{SHEET_CSS}</style>
      <Sheets locale={locale} m={model} total={total} />
    </div>
  );
}
