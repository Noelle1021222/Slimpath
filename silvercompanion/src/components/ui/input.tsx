import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const fieldBase = cn(
  'w-full rounded-2xl border border-line-strong bg-surface text-ink placeholder:text-ink-3',
  'transition-[border-color,box-shadow] duration-200',
  'hover:border-ink-3 focus:border-primary focus:ring-4 focus:ring-[var(--ring)] focus:outline-none',
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20',
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, 'h-14 px-4 text-lg', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-32 resize-y px-4 py-3 text-lg leading-relaxed', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, 'h-14 cursor-pointer appearance-none px-4 pr-11 text-lg', className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="m5 8 5 5 5-5" />
      </svg>
    </div>
  )
})
