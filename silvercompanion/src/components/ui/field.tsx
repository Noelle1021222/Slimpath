import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  optional?: boolean
  className?: string
  children: ReactElement<Record<string, unknown>>
  /** right side of the label row, e.g. a counter */
  aside?: ReactNode
}

/** Label + control + hint/error, wired with aria-describedby. */
export function Field({ label, hint, error, optional, className, children, aside }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: (children.props.id as string | undefined) ?? id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })
    : children
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={(children.props.id as string | undefined) ?? id} className="text-base font-bold text-ink">
          {label}
          {optional && <span className="ml-2 text-sm font-medium text-ink-3">選填</span>}
        </label>
        {aside}
      </div>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-sm leading-relaxed text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-sm font-bold text-danger-strong">
          <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="currentColor" aria-hidden>
            <path d="M10 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 11.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM10 5c-.62 0-1.1.5-1.06 1.12l.34 5a.72.72 0 0 0 1.44 0l.34-5C11.1 5.5 10.62 5 10 5Z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
