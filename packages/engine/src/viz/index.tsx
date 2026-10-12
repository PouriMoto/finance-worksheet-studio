// Semantic visuals: the shape of each chart is the meaning of the concept (no generic battery bars).
import { cn } from '../ui/cn.ts';
import { fmtNumber, t } from '../i18n.ts';

interface L { locale: string }
const bandColor = (b: 'low' | 'mid' | 'high') => (b === 'low' ? 'bg-bad' : b === 'mid' ? 'bg-flame' : 'bg-good');

// Runway: one block per month of expenses covered.
export function RunwayViz({ locale, months, band }: L & { months: number; band: 'low' | 'mid' | 'high' }) {
  const cells = 12;
  return (
    <div dir="ltr" role="img" aria-label={`${fmtNumber(locale, months, 1)} ${t(locale, 'viz.months')}`}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tabular-nums">{fmtNumber(locale, months, 1)}</span>
        <span className="text-muted">{t(locale, 'viz.months')}</span>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: cells }, (_, i) => {
          const fill = Math.max(0, Math.min(1, months - i));
          return (
            <div key={i} className="relative h-10 overflow-hidden rounded-md border border-line bg-bg">
              <div className={cn('absolute inset-y-0 left-0', bandColor(band))} style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{t(locale, 'viz.today')}</span><span>12{months > 12 ? '+' : ''}</span></div>
    </div>
  );
}

// Purchasing power: the coin shrinks as inflation eats value.
export function CoinViz({ locale, amount, real, years, unit }: L & { amount: number; real: number; years: number; unit: string }) {
  const ratio = amount > 0 ? Math.max(0.05, Math.min(1, real / amount)) : 0;
  const big = 112;
  const small = Math.round(big * Math.sqrt(ratio));
  return (
    <div dir="ltr" className="flex items-center justify-around gap-4">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center rounded-full border-4 border-flame bg-[#FFE9CC] text-2xl dark:bg-[#40290C]" style={{ width: big, height: big }}>🪙</div>
        <div className="mt-2 text-sm text-muted">{t(locale, 'viz.today')}</div>
        <div className="font-bold tabular-nums">{fmtNumber(locale, amount)} {unit}</div>
      </div>
      <div className="text-2xl text-muted">→</div>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center rounded-full border-4 border-flame bg-[#FFE9CC] dark:bg-[#40290C]" style={{ width: small, height: small, fontSize: Math.max(12, small / 3) }}>🪙</div>
        <div className="mt-2 text-sm text-muted">{t(locale, 'viz.after_years', { n: fmtNumber(locale, years) })}</div>
        <div className="font-bold tabular-nums">{fmtNumber(locale, real, 1)} {unit}</div>
      </div>
    </div>
  );
}

// Margin of safety: estimated value vs price on one axis; the gap is the room for error.
export function PriceValueViz({ locale, value, price, margin }: L & { value: number; price: number; margin: number }) {
  const max = Math.max(value, price, 1) * 1.15;
  const pos = (x: number) => `${(x / max) * 100}%`;
  const lo = Math.min(value, price);
  const hi = Math.max(value, price);
  const good = price <= value;
  return (
    <div dir="ltr">
      <div className="relative mx-2 my-10 h-3 rounded-full bg-line">
        <div className={cn('absolute inset-y-0 rounded-full', good ? 'bg-good' : 'bg-bad')} style={{ left: pos(lo), width: `${((hi - lo) / max) * 100}%` }} />
        <div className="absolute -top-7 -translate-x-1/2 text-center text-xs font-semibold" style={{ left: pos(value) }}>
          <div>{t(locale, 'viz.value')}</div><div className="tabular-nums">{fmtNumber(locale, value)}</div>
          <div className="mx-auto mt-0.5 size-3 rotate-45 bg-ink" />
        </div>
        <div className="absolute top-5 -translate-x-1/2 text-center text-xs font-semibold" style={{ left: pos(price) }}>
          <div className="mx-auto mb-0.5 size-3 rounded-full bg-brand" />
          <div>{t(locale, 'viz.price')}</div><div className="tabular-nums">{fmtNumber(locale, price)}</div>
        </div>
      </div>
      <div className={cn('mt-14 text-center text-lg font-bold', good ? 'text-good' : 'text-bad')}>
        {t(locale, 'viz.margin')}: <span className="tabular-nums">{fmtNumber(locale, margin, 1)}{t(locale, 'unit.percent')}</span>
        {!good && <div className="text-sm font-normal">{t(locale, 'viz.margin_negative')}</div>}
      </div>
    </div>
  );
}

// Allocation: stacked share bar with a target marker.
export function StackViz({ locale, share, target }: L & { share: number; target: number }) {
  return (
    <div dir="ltr">
      <div className="relative h-12 overflow-hidden rounded-xl border border-line">
        <div className="absolute inset-y-0 left-0 bg-reward" style={{ width: `${share}%` }} />
        <div className="absolute inset-y-0 bg-brand-soft" style={{ left: `${share}%`, right: 0 }} />
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${target}%` }} />
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted"><span className="absolute -translate-x-1/2" style={{ left: `${target}%` }}>{t(locale, 'viz.target')} {fmtNumber(locale, target)}{t(locale, 'unit.percent')}</span></div>
      <div className="mt-2 flex justify-between text-sm font-semibold">
        <span className="text-reward">{t(locale, 'viz.stock')} {fmtNumber(locale, share, 1)}{t(locale, 'unit.percent')}</span>
        <span className="text-brand">{t(locale, 'viz.bonds')} {fmtNumber(locale, 100 - share, 1)}{t(locale, 'unit.percent')}</span>
      </div>
    </div>
  );
}

// Three-step scale with a marker: low, medium, high.
export function BandScale({ locale, ratio }: L & { ratio: number }) {
  return (
    <div dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <div className="relative grid grid-cols-3 gap-1">
        {['bg-bad', 'bg-flame', 'bg-good'].map((c) => <div key={c} className={cn('h-2 rounded-full opacity-70', c)} />)}
        <div className="absolute -top-1 size-4 -translate-x-1/2 rtl:translate-x-1/2 rounded-full border-2 border-surface bg-ink" style={{ insetInlineStart: `${ratio * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{t(locale, 'report.low')}</span><span>{t(locale, 'report.high')}</span></div>
    </div>
  );
}
