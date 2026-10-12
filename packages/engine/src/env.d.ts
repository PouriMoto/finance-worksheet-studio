interface ImportMetaEnv { readonly PUBLIC_VAPID_KEY?: string }
interface ImportMeta { readonly env?: ImportMetaEnv }
declare module '*.json' { const value: Record<string, string>; export default value; }
