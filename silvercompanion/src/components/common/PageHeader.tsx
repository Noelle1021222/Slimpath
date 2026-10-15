import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: string | boolean
  className?: string
}

export function PageHeader({ title, eyebrow, description, actions, back, className }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className={cn('mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {back && (
          <button
            type="button"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            className="mb-3 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-4 pl-2 text-base font-bold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft className="size-5" /> 返回
          </button>
        )}
        {eyebrow && <p className="mb-2 text-sm font-bold tracking-[0.18em] text-primary-ink uppercase">{eyebrow}</p>}
        <h1 className="text-[32px] leading-[1.2] md:text-[44px]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  )
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-10', className)}>{children}</div>
}

export function SectionTitle({ children, action, className, id }: { children: ReactNode; action?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-3', className)}>
      <h2 id={id} className="text-2xl md:text-[28px]">
        {children}
      </h2>
      {action}
    </div>
  )
}
