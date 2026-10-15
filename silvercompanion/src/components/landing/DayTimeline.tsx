import { Bell, Home } from 'lucide-react'
import { LogoMark } from '@/components/common/Logo'
import { cn } from '@/lib/utils'
import { DAY } from './content'
import { Eyebrow, Reveal } from './shared'

type Event = (typeof DAY)[number]

/** One illustrative morning told in two lanes: what happens at Mum's, and what reaches you at work. */
export function DayTimeline() {
  const times = [...new Set(DAY.map((e) => e.time))]
  const rows = times.map((time) => ({
    time,
    home: DAY.find((e) => e.time === time && e.lane === 'home'),
    you: DAY.find((e) => e.time === time && e.lane === 'you'),
  }))

  return (
    <section className="bg-surface py-24 md:py-36" aria-labelledby="day-title">
      <div className="mx-auto max-w-[1320px] px-4 md:px-10">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow index="06" className="justify-center">
            一天的樣子
          </Eyebrow>
          <h2 id="day-title" className="mt-6 font-serif text-[2.25rem] leading-[1.2] font-black md:text-6xl md:leading-[1.15]">
            一個平常的週四上午。
          </h2>
          <p className="mt-5 text-lg leading-[1.9] text-ink-2">
            你在辦公室，媽媽要回診。這是同一個上午，在兩個地方發生的事。
            <span className="ml-2 inline-block rounded-full bg-surface-2 px-3 py-0.5 align-middle text-sm font-bold text-ink-3">情境示意</span>
          </p>
        </Reveal>

        <div className="mt-16 hidden grid-cols-[1fr_140px_1fr] text-sm font-bold tracking-[0.2em] text-ink-3 md:grid">
          <p className="flex items-center justify-end gap-2">
            <Home className="size-4 text-primary" /> 媽媽家・台北市大安區
          </p>
          <span />
          <p className="flex items-center gap-2">
            <Bell className="size-4 text-info" /> 你・信義區的辦公室
          </p>
        </div>

        <ol className="relative mt-8 md:mt-6">
          <span className="absolute top-2 bottom-2 left-[15px] w-px bg-line-strong md:left-1/2" aria-hidden />
          {rows.map((r, i) => (
            <Reveal as="li" key={r.time} delay={0.04 * i} className="relative grid gap-3 pb-10 pl-12 last:pb-0 md:grid-cols-[1fr_140px_1fr] md:gap-0 md:pl-0">
              <span
                className="absolute top-1.5 left-[9px] size-[13px] rounded-full border-[3px] border-surface bg-primary ring-1 ring-primary/30 md:left-[calc(50%-6.5px)]"
                aria-hidden
              />
              <div className="md:order-1 md:pr-10">{r.home && <HomeCard event={r.home} />}</div>
              <p className="order-first font-display text-3xl leading-none text-ink md:order-2 md:text-center md:text-4xl">
                <span className="relative top-[-2px] md:inline-block md:bg-surface md:px-3">{r.time}</span>
              </p>
              <div className="md:order-3 md:pl-10">{r.you && <YouCard event={r.you} />}</div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

function HomeCard({ event }: { event: Event }) {
  return (
    <div className={cn('rounded-[24px] border border-primary/15 bg-[#fdf3ea] p-5 md:ml-auto md:max-w-md md:text-right')}>
      <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] text-primary-ink md:hidden">
        <Home className="size-3.5" /> 媽媽家
      </p>
      <p className="font-serif text-xl font-black">{event.title}</p>
      <p className="mt-1 text-base leading-relaxed text-ink-2">{event.detail}</p>
    </div>
  )
}

function YouCard({ event }: { event: Event }) {
  return (
    <div className="rounded-[24px] border border-line bg-bg p-4 shadow-soft md:max-w-md">
      <p className="flex items-center gap-2 text-xs font-bold text-ink-3">
        {'notify' in event ? (
          <>
            <LogoMark className="size-5" /> 銀髮伴通知
          </>
        ) : (
          <>
            <Bell className="size-4 text-info" /> 你
          </>
        )}
      </p>
      <p className="mt-1.5 text-lg font-black">{event.title}</p>
      <p className="text-[15px] leading-relaxed text-ink-2">{event.detail}</p>
    </div>
  )
}
