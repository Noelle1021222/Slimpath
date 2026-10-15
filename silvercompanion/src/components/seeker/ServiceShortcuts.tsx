import { motion } from 'motion/react'
import { Link } from 'react-router'
import { SERVICES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/** Spec 4.2.1 — seven services; each jumps to search with the filter applied. */
export function ServiceShortcuts({ className }: { className?: string }) {
  return (
    <ul className={cn('grid grid-cols-4 gap-2.5 sm:gap-3 lg:grid-cols-7', className)}>
      {SERVICES.map((s, i) => (
        <motion.li key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.4 }}>
          <Link
            to={`/seeker/search?service=${s.id}`}
            className="group flex h-full flex-col items-center gap-2.5 rounded-3xl border border-line bg-surface px-1.5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-lift focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none sm:py-5"
          >
            <span
              className="grid size-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 sm:size-14"
              style={{ background: s.tint, color: s.ink }}
            >
              <s.icon className="size-6 sm:size-7" />
            </span>
            <span className="text-[15px] leading-tight font-bold text-ink sm:text-base">{s.label}</span>
          </Link>
        </motion.li>
      ))}
    </ul>
  )
}
