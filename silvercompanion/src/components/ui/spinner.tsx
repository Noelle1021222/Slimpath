import { cn } from '@/lib/utils'

export function Spinner({ className, label = '載入中' }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 animate-spin', className)} role="status" aria-label={label}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
