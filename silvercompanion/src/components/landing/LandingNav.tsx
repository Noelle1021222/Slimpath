import { ArrowRight, Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { useEntry } from '@/hooks/useEntry'
import { cn } from '@/lib/utils'
import { homePathFor } from '@/store/useUserStore'
import { EASE_OUT, LANDING_LINKS } from './content'

export function LandingNav() {
  const { signedIn, profile } = useEntry()
  const [scrolled, setScrolled] = useState(false)
  const [dark, setDark] = useState(false)
  const [open, setOpen] = useState(false)

  // Over a dark section (marked data-nav="dark") the bar turns to dark glass.
  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      setScrolled(window.scrollY > 24)
      const probe = 40
      setDark(
        [...document.querySelectorAll<HTMLElement>('[data-nav="dark"]')].some((el) => {
          const r = el.getBoundingClientRect()
          return r.top <= probe && r.bottom >= probe
        }),
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 pt-safe transition-[background-color,box-shadow,backdrop-filter] duration-500',
        dark
          ? 'bg-[#120c09]/55 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl'
          : scrolled
            ? 'bg-bg/80 shadow-[0_1px_0_var(--line)] backdrop-blur-xl'
            : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-6 px-4 md:h-20 md:px-10" aria-label="主要導覽">
        <Link to="/" className="shrink-0 rounded-xl">
          <span className="sr-only">回到首頁：</span>
          <Logo compact tone={dark ? 'light' : 'ink'} className="md:hidden" />
          <Logo tone={dark ? 'light' : 'ink'} className="hidden md:inline-flex" />
        </Link>

        <ul className="ml-auto hidden items-center gap-1 lg:flex">
          {LANDING_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  'relative rounded-full px-4 py-2.5 text-[15px] font-bold transition-colors',
                  dark ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          {signedIn && profile ? (
            <Button asChild pill>
              <Link to={homePathFor(profile.role)}>
                進入我的{profile.role === 'provider' ? '工作台' : '首頁'} <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" pill className={cn('hidden sm:inline-flex', dark && 'text-white/85 hover:bg-white/10 hover:text-white')}>
                <Link to="/auth">登入</Link>
              </Button>
              <Button asChild pill>
                <Link to="/auth?mode=signup">免費註冊</Link>
              </Button>
            </>
          )}

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button
                variant="secondary"
                size="icon"
                pill
                className={cn('lg:hidden', dark && 'border-white/20 bg-white/10 text-white hover:bg-white/15')}
                aria-label="開啟選單"
              >
                <Menu />
              </Button>
            </Dialog.Trigger>
            <AnimatePresence>
              {open && (
                <Dialog.Portal forceMount>
                  <Dialog.Overlay asChild forceMount>
                    <motion.div
                      className="fixed inset-0 z-50 bg-[rgb(28_18_12/0.45)] backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  </Dialog.Overlay>
                  <Dialog.Content asChild forceMount aria-describedby={undefined}>
                    <motion.div
                      className="fixed inset-x-3 top-3 z-50 rounded-[32px] bg-bg p-6 pt-safe shadow-lift"
                      initial={{ opacity: 0, y: -24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.45, ease: EASE_OUT }}
                    >
                      <div className="flex items-center justify-between">
                        <Dialog.Title asChild>
                          <span>
                            <Logo compact />
                          </span>
                        </Dialog.Title>
                        <Dialog.Close asChild>
                          <Button variant="secondary" size="icon" pill aria-label="關閉選單">
                            <X />
                          </Button>
                        </Dialog.Close>
                      </div>
                      <ul className="mt-6 divide-y divide-line">
                        {LANDING_LINKS.map((l, i) => (
                          <motion.li key={l.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i + 0.1 }}>
                            <a
                              href={l.href}
                              onClick={() => setOpen(false)}
                              className="flex min-h-16 items-center justify-between font-serif text-2xl font-bold"
                            >
                              {l.label}
                              <ArrowRight className="size-5 text-primary" />
                            </a>
                          </motion.li>
                        ))}
                      </ul>
                      {!signedIn && (
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <Button asChild variant="secondary" size="lg">
                            <Link to="/auth">登入</Link>
                          </Button>
                          <Button asChild size="lg">
                            <Link to="/auth?mode=signup">免費註冊</Link>
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  </Dialog.Content>
                </Dialog.Portal>
              )}
            </AnimatePresence>
          </Dialog.Root>
        </div>
      </nav>
    </header>
  )
}
