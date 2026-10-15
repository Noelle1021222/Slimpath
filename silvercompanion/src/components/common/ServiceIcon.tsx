import { SERVICE_MAP } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ServiceType } from '@/types'

export function ServiceIcon({ type, size = 'md', className }: { type: ServiceType; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = SERVICE_MAP[type]
  const Icon = s.icon
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center',
        size === 'sm' && 'size-9 rounded-xl [&_svg]:size-[18px]',
        size === 'md' && 'size-12 rounded-2xl [&_svg]:size-6',
        size === 'lg' && 'size-14 rounded-2xl [&_svg]:size-7',
        size === 'xl' && 'size-16 rounded-[20px] [&_svg]:size-8',
        className,
      )}
      style={{ background: s.tint, color: s.ink }}
      aria-hidden
    >
      <Icon strokeWidth={2} />
    </span>
  )
}

export function ServiceLabel({ type, className }: { type: ServiceType; className?: string }) {
  const s = SERVICE_MAP[type]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold', className)} style={{ background: s.tint, color: s.ink }}>
      <s.icon className="size-4" />
      {s.label}
    </span>
  )
}
