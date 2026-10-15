import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Calm empty state with a small line illustration. */
export function EmptyState({
  title,
  description,
  action,
  illustration = 'leaf',
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  illustration?: 'leaf' | 'calendar' | 'chat' | 'search' | 'book'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center', className)}>
      <svg viewBox="0 0 120 96" className="h-24 w-32 text-primary" fill="none" aria-hidden>
        <ellipse cx="60" cy="84" rx="38" ry="6" fill="currentColor" opacity=".08" />
        {illustration === 'leaf' && (
          <>
            <path d="M60 78c0-26 10-46 32-56-4 24-14 44-32 56Z" fill="currentColor" opacity=".16" />
            <path d="M60 78c0-22-8-38-26-46 2 20 10 36 26 46Z" fill="currentColor" opacity=".3" />
            <path d="M60 80V36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {illustration === 'calendar' && (
          <>
            <rect x="30" y="20" width="60" height="56" rx="10" fill="currentColor" opacity=".14" />
            <rect x="30" y="20" width="60" height="16" rx="8" fill="currentColor" opacity=".3" />
            <path d="M44 14v12M76 14v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="48" cy="52" r="4" fill="currentColor" />
            <circle cx="60" cy="52" r="4" fill="currentColor" opacity=".4" />
            <circle cx="72" cy="52" r="4" fill="currentColor" opacity=".4" />
          </>
        )}
        {illustration === 'chat' && (
          <>
            <path
              d="M24 30a12 12 0 0 1 12-12h40a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12H52l-14 12V60h-2a12 12 0 0 1-12-12V30Z"
              fill="currentColor"
              opacity=".16"
            />
            <circle cx="44" cy="39" r="3.5" fill="currentColor" />
            <circle cx="56" cy="39" r="3.5" fill="currentColor" />
            <circle cx="68" cy="39" r="3.5" fill="currentColor" />
          </>
        )}
        {illustration === 'search' && (
          <>
            <circle cx="54" cy="42" r="22" fill="currentColor" opacity=".14" stroke="currentColor" strokeWidth="3" />
            <path d="m70 58 16 16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </>
        )}
        {illustration === 'book' && (
          <>
            <path d="M24 22h28a8 8 0 0 1 8 8v48a8 8 0 0 0-8-8H24V22Z" fill="currentColor" opacity=".16" />
            <path d="M96 22H68a8 8 0 0 0-8 8v48a8 8 0 0 1 8-8h28V22Z" fill="currentColor" opacity=".3" />
          </>
        )}
      </svg>
      <h3 className="mt-4 text-xl">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
