import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * 柿子 mark — 柿柿如意 (may all things go as you wish), a blessing every
 * Taiwanese elder knows. The calyx is two leaves leaning together: two people,
 * side by side.
 */
export function LogoMark({ className, mono }: { className?: string; mono?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10', className)} aria-hidden>
      <defs>
        <radialGradient id={`${id}-b`} cx="34%" cy="30%" r="80%">
          <stop offset="0" stopColor="#f7b267" />
          <stop offset="0.55" stopColor="#ea7d3c" />
          <stop offset="1" stopColor="#c4541f" />
        </radialGradient>
      </defs>
      <path d="M24 14.5c10.2 0 18 6.6 18 15.6C42 39.4 34.4 45 24 45S6 39.4 6 30.1C6 21.1 13.8 14.5 24 14.5Z" fill={mono ? 'currentColor' : `url(#${id}-b)`} />
      {!mono && <ellipse cx="16.5" cy="25" rx="4.2" ry="2.6" fill="#fff" opacity=".35" transform="rotate(-28 16.5 25)" />}
      <path d="M24 17.2c-1.6-5.9-7.2-9.2-13.3-8.2 1.5 5.6 6.9 9 13.3 8.2Z" fill={mono ? 'currentColor' : '#3e6b3a'} opacity={mono ? 0.7 : 1} />
      <path d="M24 17.2c1.6-5.9 7.2-9.2 13.3-8.2-1.5 5.6-6.9 9-13.3 8.2Z" fill={mono ? 'currentColor' : '#557f45'} opacity={mono ? 0.7 : 1} />
      <path d="M24 17.5V9.8" stroke={mono ? 'currentColor' : '#3e6b3a'} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, compact, tone = 'ink' }: { className?: string; compact?: boolean; tone?: 'ink' | 'light' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={compact ? 'size-9' : 'size-11'} />
      <span className="flex flex-col leading-none">
        <span className={cn('font-serif text-[22px] font-black tracking-[0.08em]', tone === 'light' ? 'text-white' : 'text-ink', compact && 'text-xl')}>
          銀髮伴
        </span>
        {!compact && <span className={cn('mt-1 text-xs font-bold tracking-[0.22em]', tone === 'light' ? 'text-white/70' : 'text-ink-3')}>SILVERCOMPANION</span>}
      </span>
    </span>
  )
}
