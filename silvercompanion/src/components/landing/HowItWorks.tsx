import { Check } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { EASE_OUT, STEPS } from './content'
import { PhoneFrame, ScreenChoose, ScreenLive, ScreenLog, ScreenProfile } from './PhoneScreens'
import { Eyebrow, Reveal } from './shared'

const SCREENS: ComponentType[] = [ScreenProfile, ScreenChoose, ScreenLive, ScreenLog]

/** Four steps on the left; on desktop a phone stays put on the right and changes screen with the step you are reading. */
export function HowItWorks() {
  const [active, setActive] = useState(0)
  const reduce = useReducedMotion()
  const Screen = SCREENS[active]

  return (
    <section id="how" className="scroll-mt-20 bg-bg-deep/50 py-24 md:py-36" aria-labelledby="how-title">
      <div className="mx-auto max-w-[1320px] px-4 md:px-10">
        <Reveal className="max-w-3xl">
          <Eyebrow index="02">怎麼運作</Eyebrow>
          <h2 id="how-title" className="mt-6 font-serif text-[2.25rem] leading-[1.2] font-black md:text-6xl md:leading-[1.15]">
            從預約到聯絡簿，
            <br />
            每一步都看得見。
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-x-12 lg:mt-4 lg:grid-cols-12">
          <ol className="lg:col-span-6">
            {STEPS.map((s, i) => (
              <Step key={s.no} index={i} active={active === i} onActive={setActive}>
                <PhoneFrame className="mx-auto mt-10 lg:hidden" label={`${s.title}的畫面示意`}>
                  {(() => {
                    const Inline = SCREENS[i]
                    return <Inline />
                  })()}
                </PhoneFrame>
              </Step>
            ))}
          </ol>

          <div className="hidden lg:col-span-5 lg:col-start-8 lg:block">
            <div className="sticky top-[calc(50dvh-320px)] flex flex-col items-center py-10">
              <PhoneFrame label={`${STEPS[active].title}的畫面示意`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={active}
                    className="absolute inset-0 top-11"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.98 }}
                    transition={{ duration: 0.55, ease: EASE_OUT }}
                  >
                    <Screen />
                  </motion.div>
                </AnimatePresence>
              </PhoneFrame>
              <div className="mt-8 flex gap-2" aria-hidden>
                {STEPS.map((s, i) => (
                  <span key={s.no} className={cn('h-1.5 rounded-full transition-all duration-500', i === active ? 'w-10 bg-primary' : 'w-4 bg-line-strong')} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Step({ index, active, onActive, children }: { index: number; active: boolean; onActive: (i: number) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLLIElement>(null)
  // "Active" = the step crossing the middle band of the viewport.
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  const s = STEPS[index]
  useEffect(() => {
    if (inView) onActive(index)
  }, [inView, index, onActive])

  return (
    <li ref={ref} className="flex min-h-0 flex-col justify-center border-t border-ink/10 py-14 first:border-t-0 lg:min-h-[78vh] lg:border-t-0 lg:py-0">
      <Reveal>
        <p
          aria-hidden
          className={cn('font-display text-7xl leading-none italic transition-colors duration-500 md:text-8xl', active ? 'text-primary' : 'text-ink/55')}
        >
          {s.no}
        </p>
        <h3 className="mt-6 font-serif text-3xl leading-snug font-black md:text-[2.5rem]">{s.title}</h3>
        <p className="mt-4 max-w-lg text-lg leading-[1.9] text-ink-2">{s.body}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {s.facts.map((f) => (
            <li
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-surface/70 px-3.5 py-1.5 text-[15px] font-bold text-ink-2"
            >
              <Check className="size-4 text-primary" strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>
      </Reveal>
      {children}
    </li>
  )
}
