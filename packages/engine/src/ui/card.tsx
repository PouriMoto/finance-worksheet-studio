import type { HTMLAttributes } from 'react';
import { cn } from './cn.ts';

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-surface p-5', className)} {...p} />;
}
export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand', className)} {...p} />;
}
export const ACCENT: Record<string, string> = {
  teal: 'bg-[#DDF3EE] dark:bg-[#10332C]',
  violet: 'bg-[#E9E4FF] dark:bg-[#2A2350]',
  amber: 'bg-[#FFE9CC] dark:bg-[#40290C]',
  rose: 'bg-[#FFE0E3] dark:bg-[#40181D]',
  sky: 'bg-[#DCEEFF] dark:bg-[#12304D]',
};
export function EmojiTile({ emoji, accent = 'teal', size = 'md' }: { emoji: string; accent?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'size-20 text-4xl rounded-3xl' : size === 'sm' ? 'size-10 text-xl rounded-xl' : 'size-14 text-3xl rounded-2xl';
  return <div aria-hidden className={cn('flex shrink-0 items-center justify-center', s, ACCENT[accent] ?? ACCENT.teal)}>{emoji}</div>;
}
