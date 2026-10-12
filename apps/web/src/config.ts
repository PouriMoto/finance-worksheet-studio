export const LOCALES = ['fa', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fa';
export const SITE = process.env.SITE_URL ?? 'https://example.com';

export type Edition = 'local' | 'cloud';
export const EDITION: Edition = (process.env.PUBLIC_EDITION ?? 'local') as Edition;
// The cloud edition needs server-side content gating first (docs/MODULES.md). Fail loudly instead of leaking premium content.
if (EDITION !== 'local') throw new Error('PUBLIC_EDITION=cloud is not implemented yet: premium content gating is a later module');
