import { X } from 'lucide-react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

const SIZES = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl', xl: 'md:max-w-4xl' } as const

export interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** visually hide the title row (still announced to screen readers) */
  bare?: boolean
  size?: keyof typeof SIZES
  footer?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** prevent closing by outside click / escape (e.g. while paying) */
  locked?: boolean
}

/**
 * Spec 6.2 — a bottom sheet on phones (drag the handle down to dismiss) that
 * becomes a centred dialog from 768px up. Built on Radix Dialog for focus
 * trapping, escape handling and screen-reader semantics.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  bare,
  size = 'md',
  footer,
  children,
  className,
  bodyClassName,
  locked,
}: ResponsiveModalProps) {
  const desktop = useIsDesktop()
  const drag = useDragControls()
  const guard = (e: Event) => {
    if (locked) e.preventDefault()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!locked || next) && onOpenChange(next)}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgb(28_18_12/0.46)] backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
              <Dialog.Content
                asChild
                forceMount
                {...(description ? {} : { 'aria-describedby': undefined })}
                onPointerDownOutside={guard}
                onEscapeKeyDown={guard}
              >
                <motion.div
                  className={cn(
                    'pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-lift',
                    'rounded-t-3xl md:max-h-[86dvh] md:rounded-3xl',
                    SIZES[size],
                    className,
                  )}
                  initial={desktop ? { opacity: 0, y: 18, scale: 0.97 } : { y: '100%' }}
                  animate={desktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
                  exit={desktop ? { opacity: 0, y: 10, scale: 0.98 } : { y: '100%' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }}
                  drag={desktop || locked ? false : 'y'}
                  dragControls={drag}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.04, bottom: 0.7 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 140 || info.velocity.y > 700) onOpenChange(false)
                  }}
                >
                  <div
                    className="shrink-0 touch-none md:touch-auto"
                    onPointerDown={(e) => {
                      if (!desktop) drag.start(e)
                    }}
                  >
                    <div className="flex justify-center pt-3 md:hidden" aria-hidden>
                      <span className="h-1.5 w-12 rounded-full bg-line-strong" />
                    </div>
                    <div className={cn('flex items-start gap-4 px-6 pt-4 pb-3 md:px-8 md:pt-7', bare && 'sr-only')}>
                      <div className="min-w-0 flex-1">
                        <Dialog.Title className="font-heading text-2xl leading-tight font-[var(--heading-weight)] text-ink">{title}</Dialog.Title>
                        {description && <Dialog.Description className="mt-1.5 text-base leading-relaxed text-ink-2">{description}</Dialog.Description>}
                      </div>
                      {!locked && (
                        <Dialog.Close
                          className="-mt-1 -mr-2 grid size-12 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                          aria-label="關閉"
                        >
                          <X className="size-6" />
                        </Dialog.Close>
                      )}
                    </div>
                  </div>
                  <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 md:px-8', bodyClassName)}>{children}</div>
                  {footer && (
                    <div className="shrink-0 border-t border-line bg-surface/95 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:px-8 md:pb-6">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
