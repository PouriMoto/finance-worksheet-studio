import fa from './locales/fa.json';
import en from './locales/en.json';

export type Dict = Record<string, string>;
const dicts: Record<string, Dict> = { fa, en };
export const UI_LOCALES = Object.keys(dicts);
export const DEFAULT_LOCALE = 'fa';

export function getDict(locale: string): Dict {
  return dicts[locale] ?? dicts[DEFAULT_LOCALE];
}
export function t(locale: string, key: string, params: Record<string, string | number> = {}): string {
  const d = getDict(locale);
  let s = d[key] ?? dicts[DEFAULT_LOCALE][key] ?? key;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export function dirOf(locale: string): 'rtl' | 'ltr' {
  return ['fa', 'ar', 'he', 'ur'].includes(locale) ? 'rtl' : 'ltr';
}
const intlTag = (locale: string) => (locale === 'fa' ? 'fa-IR' : locale);
export function fmtNumber(locale: string, n: number, digits = 0): string {
  return new Intl.NumberFormat(intlTag(locale), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}
export function fmtDate(locale: string, iso: string): string {
  const tag = locale === 'fa' ? 'fa-IR-u-ca-persian' : locale;
  return new Intl.DateTimeFormat(tag, { dateStyle: 'medium' }).format(new Date(iso));
}

// Search normalisation: unify Arabic/Persian letter variants, drop ZWNJ/tatweel/diacritics, map digits to ASCII.
export function normalizeSearch(input: string): string {
  return input
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u200C\u200D\u0640\u064B-\u065F\u0670]/g, '')
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .trim();
}
