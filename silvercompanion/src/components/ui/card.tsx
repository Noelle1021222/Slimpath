import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { interactive?: boolean }>(function Card(
  { className, interactive, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[28px] border border-line bg-surface shadow-soft',
        interactive && 'transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift',
        className,
      )}
      {...props}
    />
  )
})

export function CardHeader({
  title,
  action,
  eyebrow,
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  eyebrow?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-bold tracking-wider text-ink-3">{eyebrow}</p>}
        <h2 className="text-xl md:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}
