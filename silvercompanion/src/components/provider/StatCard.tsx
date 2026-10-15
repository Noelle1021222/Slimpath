import type { ReactNode } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

export function StatCard({
  icon,
  label,
  value,
  format = (n) => Math.round(n).toLocaleString('zh-TW'),
  unit,
  hint,
  className,
}: {
  icon: ReactNode
  label: string
  value: number
  format?: (n: number) => string
  unit?: string
  hint?: ReactNode
  className?: string
}) {
  const shown = useCountUp(value)
  return (
    <div className={cn('rounded-[28px] border border-line bg-surface p-5 shadow-soft', className)}>
      <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-ink [&_svg]:size-5">{icon}</span>
      <p className="mt-4 text-[15px] font-bold text-ink-3">{label}</p>
      <p className="mt-0.5 font-num text-[34px] leading-none font-extrabold tracking-tight text-ink tabular" aria-label={`${format(value)}${unit ?? ''}`}>
        {format(shown)}
        {unit && <span className="ml-1 font-sans text-base font-bold text-ink-3">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-sm text-ink-3">{hint}</p>}
    </div>
  )
}
