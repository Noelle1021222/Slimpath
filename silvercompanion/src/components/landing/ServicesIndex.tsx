import { ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { SERVICES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EASE_OUT, SERVICE_MOMENTS } from './content'
import { Eyebrow, Reveal } from './shared'

/** A slow ribbon of the seven services — the page's typographic heartbeat. */
export function ServiceMarquee() {
  const reduce = useReducedMotion()
  const words = SERVICES.map((s) => s.label)
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {words.map((w, i) => (
        <Fragment key={w}>
          <span
            className={cn(
              'font-serif text-[clamp(2.75rem,7vw,6.5rem)] leading-none font-black whitespace-nowrap',
              i % 2 ? 'text-transparent [-webkit-text-stroke:1.5px_var(--ink-3)]' : 'text-ink',
            )}
          >
            {w}
          </span>
          <svg viewBox="0 0 24 24" className="size-8 shrink-0 text-accent md:size-12" aria-hidden>
            <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill="currentColor" />
          </svg>
        </Fragment>
      ))}
    </div>
  )
  return (
    <div className="group relative overflow-hidden border-y border-line bg-surface/60 py-7 md:py-10">
      <div className={cn('flex w-max', !reduce && 'animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused]')}>
        {row(false)}
        {row(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg to-transparent md:w-32" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg to-transparent md:w-32" aria-hidden />
    </div>
  )
}

/** Editorial index of the seven services; each row opens the search with that service selected. */
export function ServicesIndex() {
  const reduce = useReducedMotion()
  return (
    <section id="services" className="scroll-mt-20 py-24 md:py-36" aria-labelledby="services-title">
      <div className="mx-auto max-w-[1320px] px-4 md:px-10">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <Eyebrow index="01">服務項目</Eyebrow>
            <h2 id="services-title" className="mt-6 font-serif text-[2.25rem] leading-[1.2] font-black md:text-6xl md:leading-[1.15]">
              七種陪伴，
              <br />
              從聽懂需要開始。
            </h2>
          </Reveal>
          <Reveal className="self-end lg:col-span-6 lg:col-start-7" delay={0.1}>
            <p className="text-lg leading-[1.9] text-ink-2">
              有些需要很具體——掛號、領藥、換季整理；有些很難說出口——只是想有人聽他把話說完。陪伴者會在接單前先讀過長輩的檔案，知道該怎麼陪。
            </p>
          </Reveal>
        </div>

        <ol className="mt-16 border-t border-ink/15">
          {SERVICES.map((s, i) => (
            <motion.li
              key={s.id}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: (i % 4) * 0.06 }}
              className="border-b border-ink/15"
            >
              <Link
                to={`/seeker/search?service=${s.id}`}
                className="group relative isolate grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 overflow-hidden py-6 md:grid-cols-[88px_minmax(0,1.1fr)_minmax(0,1fr)_56px] md:gap-x-8 md:py-8"
                style={{ ['--tint' as string]: s.tint, ['--ink-s' as string]: s.ink }}
              >
                <span
                  className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-[var(--tint)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
                  aria-hidden
                />
                <span className="font-display text-2xl text-ink-3 italic transition-colors group-hover:text-[var(--ink-s)] md:pl-4 md:text-3xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--tint)] text-[var(--ink-s)] transition-transform duration-500 group-hover:scale-110 group-hover:bg-surface md:size-14">
                    <s.icon className="size-6 md:size-7" />
                  </span>
                  <span className="font-serif text-[1.75rem] leading-tight font-black md:text-[2.5rem]">{s.label}</span>
                </span>
                <span className="col-span-3 text-base leading-relaxed text-ink-2 md:col-span-1 md:text-[17px]">
                  <span className="block font-bold text-ink">{s.description}</span>
                  <span className="mt-1 block text-ink-3 transition-colors group-hover:text-ink-2">{SERVICE_MOMENTS[s.id]}</span>
                </span>
                <span className="col-start-3 row-start-1 grid size-12 place-items-center rounded-full border border-ink/15 transition-all duration-500 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-ink group-hover:text-white md:col-start-auto md:row-start-auto">
                  <ArrowUpRight className="size-5" />
                  <span className="sr-only">找{s.label}的陪伴者</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
