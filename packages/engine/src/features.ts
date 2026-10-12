// Feature modules. The local edition turns every backend-dependent module off.
// Later modules (auth, sync, paywall, tokens, coupons, ai, serverPdf, push) are enabled by the cloud edition.
export interface Features {
  auth: boolean; sync: boolean; paywall: boolean; tokens: boolean; coupons: boolean; ai: boolean; serverPdf: boolean; push: boolean; backup: boolean;
}
export const LOCAL_FEATURES: Features = { auth: false, sync: false, paywall: false, tokens: false, coupons: false, ai: false, serverPdf: false, push: false, backup: true };
export function featuresFor(edition: string): Features {
  if (edition === 'local') return LOCAL_FEATURES;
  return { auth: true, sync: true, paywall: true, tokens: true, coupons: true, ai: true, serverPdf: true, push: true, backup: true };
}
