import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EASE_OUT } from './content'

/** Fades content up the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  const Comp = as === 'li' ? motion.li : motion.div
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay }}
    >
      {children}
    </Comp>
  )
}

/** Section eyebrow: a hairline, an index number and a label. */
export function Eyebrow({ index, children, className, light }: { index?: string; children: ReactNode; className?: string; light?: boolean }) {
  return (
    <p className={cn('flex items-center gap-3 text-sm font-bold tracking-[0.2em]', light ? 'text-white/70' : 'text-primary-ink', className)}>
      {index && <span className="font-display text-base tracking-normal italic">{index}</span>}
      <span className={cn('h-px w-10', light ? 'bg-white/40' : 'bg-primary/40')} aria-hidden />
      <span>{children}</span>
    </p>
  )
}
