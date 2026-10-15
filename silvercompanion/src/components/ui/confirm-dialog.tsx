import { AnimatePresence, motion } from 'motion/react'
import { AlertDialog } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  tone?: 'primary' | 'danger'
  icon?: ReactNode
  /** Optional free-text reason (e.g. why a booking is declined). */
  reasonOptions?: string[]
}

interface ConfirmState {
  options: ConfirmOptions | null
  resolve: ((value: { confirmed: boolean; reason: string }) => void) | null
  open: (options: ConfirmOptions) => Promise<{ confirmed: boolean; reason: string }>
  close: (confirmed: boolean, reason?: string) => void
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,
  open: (options) =>
    new Promise((resolve) => {
      get().resolve?.({ confirmed: false, reason: '' })
      set({ options, resolve })
    }),
  close: (confirmed, reason = '') => {
    get().resolve?.({ confirmed, reason })
    set({ options: null, resolve: null })
  },
}))

/** Spec 7.3 — replaces window.confirm with an accessible, on-brand dialog. */
export function useConfirm() {
  const open = useConfirmStore((s) => s.open)
  return async (options: ConfirmOptions) => (await open(options)).confirmed
}

export function useConfirmWithReason() {
  return useConfirmStore((s) => s.open)
}

export function ConfirmHost() {
  const { options, close } = useConfirmStore()
  const [reason, setReason] = useState('')
  const opened = options !== null

  return (
    <AlertDialog.Root
      open={opened}
      onOpenChange={(next) => {
        if (!next) close(false)
      }}
    >
      <AnimatePresence>
        {opened && (
          <AlertDialog.Portal forceMount>
            <AlertDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-[rgb(28_18_12/0.5)] backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </AlertDialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-6">
              <AlertDialog.Content asChild forceMount onCloseAutoFocus={() => setReason('')}>
                <motion.div
                  className="pointer-events-auto w-full rounded-t-3xl bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift md:max-w-md md:rounded-3xl md:p-8"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                >
                  {options.icon && <div className="mb-4">{options.icon}</div>}
                  <AlertDialog.Title className="font-heading text-2xl leading-tight font-[var(--heading-weight)] text-ink">{options.title}</AlertDialog.Title>
                  {options.description ? (
                    <AlertDialog.Description className="mt-2 text-base leading-relaxed text-ink-2">{options.description}</AlertDialog.Description>
                  ) : (
                    <AlertDialog.Description className="sr-only">請確認是否繼續</AlertDialog.Description>
                  )}
                  {options.reasonOptions && (
                    <fieldset className="mt-5">
                      <legend className="mb-2 text-sm font-bold text-ink-2">原因（選填）</legend>
                      <div className="flex flex-wrap gap-2">
                        {options.reasonOptions.map((r) => (
                          <button
                            key={r}
                            type="button"
                            aria-pressed={reason === r}
                            onClick={() => setReason(reason === r ? '' : r)}
                            className={cn(
                              'min-h-11 rounded-full border px-4 text-base font-bold transition-colors',
                              reason === r ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line-strong text-ink-2 hover:bg-surface-2',
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <AlertDialog.Cancel asChild>
                      <Button variant="secondary" size="lg">
                        {options.cancelText ?? '再想想'}
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} size="lg" onClick={() => close(true, reason)}>
                        {options.confirmText ?? '確定'}
                      </Button>
                    </AlertDialog.Action>
                  </div>
                </motion.div>
              </AlertDialog.Content>
            </div>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  )
}
