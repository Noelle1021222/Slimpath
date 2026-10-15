import { ArrowRight, BadgeCheck, CalendarRange, HandCoins, NotebookPen, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { LogoMark } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { RangeSlider } from '@/components/ui/range-slider'
import { useCountUp } from '@/hooks/useCountUp'
import { useEntry } from '@/hooks/useEntry'
import { formatMoney } from '@/lib/format'
import { computePrice, PLATFORM_FEE_RATE, RATE_MAX, RATE_MIN, RATE_STEP } from '@/lib/pricing'
import { Eyebrow, Reveal } from './shared'

const WEEKS_PER_MONTH = 52 / 12

/** The two identities of the product, side by side: 暖陽 for families, 靜海 for companions. */
export function DualPaths() {
  const { seekerHref, providerHref } = useEntry()
  return (
    <section className="py-24 md:py-36" aria-labelledby="paths-title">
      <div className="mx-auto max-w-[1320px] px-4 md:px-10">
        <Reveal className="max-w-3xl">
          <Eyebrow index="03">兩種角色</Eyebrow>
          <h2 id="paths-title" className="mt-6 font-serif text-[2.25rem] leading-[1.2] font-black md:text-6xl md:leading-[1.15]">
            同一份心意，
            <br />
            從兩端出發。
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <article className="group relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[36px] bg-[linear-gradient(160deg,#fff6ec_0%,#fde3cc_55%,#f8c9a3_100%)] p-8 text-[#3a2112] md:p-12">
              <LogoMark className="pointer-events-none absolute -right-10 -bottom-12 size-44 opacity-90 transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-4 group-hover:rotate-[-8deg] md:-right-16 md:-bottom-20 md:size-[340px]" />
              <p className="text-sm font-bold tracking-[0.2em] text-[#8e3510]">給家屬・暖陽</p>
              <h3 className="mt-5 font-serif text-[2.1rem] leading-[1.3] font-black md:text-5xl md:leading-[1.25]">
                把爸媽，交給
                <br />
                讀過他檔案的人。
              </h3>
              <ul className="relative mt-8 space-y-3 text-[17px] leading-relaxed">
                <li>依地區、服務、日期與預算篩選</li>
                <li>看自我介紹影片，讀其他家屬的評價</li>
                <li>出發、抵達即時通知，服務後收到聯絡簿</li>
              </ul>
              <div className="relative mt-auto pt-10">
                <Button asChild size="xl" className="group/b">
                  <Link to={seekerHref}>
                    開始找陪伴 <ArrowRight className="transition-transform group-hover/b:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.12}>
            <article
              data-theme="provider"
              className="group relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[36px] bg-[linear-gradient(160deg,#0f3a45_0%,#0b2b36_50%,#0b2531_100%)] p-8 text-hero-ink md:p-12"
            >
              <div
                className="pointer-events-none absolute -right-24 -bottom-24 size-[380px] rounded-full border-[46px] border-[#2fb5a5]/20 transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                aria-hidden
              />
              <div className="pointer-events-none absolute right-24 -bottom-6 size-40 rounded-full border-[22px] border-[#8fe3d6]/15" aria-hidden />
              <p className="text-sm font-bold tracking-[0.2em] text-[#8fe3d6]">給陪伴者・靜海</p>
              <h3 className="mt-5 text-[2.1rem] leading-[1.3] font-black text-white md:text-5xl md:leading-[1.25]">
                把你的時間，
                <br />
                變成某人的期待。
              </h3>
              <ul className="relative mt-8 space-y-3 text-[17px] leading-relaxed text-hero-ink/85">
                <li>自己決定時薪與每週的空檔</li>
                <li>家屬預約或附近有需求時，立刻收到通知</li>
                <li>服務完成即入帳，每月提領一次</li>
              </ul>
              <div className="relative mt-auto pt-10">
                <Button asChild size="xl" className="group/b bg-[#0f7c74] text-white shadow-none hover:bg-[#0c6b64]">
                  <Link to={providerHref}>
                    成為陪伴者 <ArrowRight className="transition-transform group-hover/b:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const PERKS = [
  { icon: <HandCoins />, title: '自訂時薪', text: `$${RATE_MIN}–$${RATE_MAX.toLocaleString()}，每 $${RATE_STEP} 一級` },
  { icon: <CalendarRange />, title: '自己排空檔', text: '開放未來兩週的時段，家屬只會在你方便時預約' },
  { icon: <NotebookPen />, title: '完成即入帳', text: '送出聯絡簿的那一刻，收入就進到可提領餘額' },
  { icon: <Wallet />, title: '每月提領', text: '每月一次，全額轉入你設定的銀行帳戶' },
  { icon: <BadgeCheck />, title: '認證標章', text: '通過實名與良民證審核，家屬一眼就能看見' },
]

/** For companions: what the work looks like, and what it pays. */
export function CompanionSection() {
  const { providerHref } = useEntry()
  const [rate, setRate] = useState(400)
  const [hours, setHours] = useState(12)
  const weekly = computePrice(rate, hours)
  const monthly = Math.round((weekly.providerEarning * WEEKS_PER_MONTH) / 10) * 10
  const shown = useCountUp(monthly, 600)

  return (
    <section
      id="companions"
      data-nav="dark"
      data-theme="provider"
      className="grain relative scroll-mt-16 overflow-hidden bg-hero py-24 text-hero-ink md:py-36"
      aria-labelledby="companions-title"
    >
      <div
        className="pointer-events-none absolute -top-40 -left-40 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(47,181,165,0.28),transparent_65%)]"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-[1320px] gap-14 px-4 md:px-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <Reveal>
            <Eyebrow index="04" light>
              成為陪伴者
            </Eyebrow>
            <h2 id="companions-title" className="mt-6 text-[2.25rem] leading-[1.2] font-black text-white md:text-6xl md:leading-[1.15]">
              陪伴，也可以是
              <br />
              一份有尊嚴的工作。
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-[1.9] text-hero-ink/80">
              退休教師、護理系學生、照服員、想多陪陪長輩的你——在銀髮伴，你決定什麼時候接案、收多少錢，我們負責把對的家庭帶到你面前。
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {PERKS.map((p, i) => (
              <Reveal as="li" key={p.title} delay={0.05 * i} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.08] text-[#8fe3d6] [&_svg]:size-6">{p.icon}</span>
                <span>
                  <span className="block text-lg font-black text-white">{p.title}</span>
                  <span className="block text-[15px] leading-relaxed text-hero-ink/70">{p.text}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="lg:col-span-5 lg:col-start-8" delay={0.1}>
          <div className="rounded-[36px] bg-surface p-6 text-ink shadow-[0_50px_100px_-30px_rgba(0,0,0,0.6)] md:p-9">
            <p className="text-sm font-bold tracking-[0.2em] text-primary-ink">收入試算</p>
            <p className="mt-2 text-2xl font-black">一個月大約可以有</p>
            <p className="mt-3 font-num text-[3.5rem] leading-none font-extrabold tracking-tight text-primary-ink tabular md:text-7xl" aria-live="polite">
              {formatMoney(Math.round(shown))}
            </p>
            <p className="mt-3 text-[15px] text-ink-3">
              每週 {hours} 小時 × ${rate}，扣除平台服務費 {Math.round(PLATFORM_FEE_RATE * 100)}%
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-base font-bold">時薪</p>
                <RangeSlider
                  value={rate}
                  onChange={setRate}
                  min={RATE_MIN}
                  max={RATE_MAX}
                  step={RATE_STEP}
                  label="時薪"
                  format={formatMoney}
                  suffix=" / 小時"
                />
              </div>
              <div>
                <p className="text-base font-bold">每週陪伴時數</p>
                <RangeSlider value={hours} onChange={setHours} min={2} max={40} step={1} label="每週陪伴時數" format={(v) => `${v}`} suffix=" 小時" />
              </div>
            </div>

            <Button asChild size="xl" block className="mt-8">
              <Link to={providerHref}>
                加入陪伴者 <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 text-center text-sm text-ink-3">試算僅供參考，實際收入依接案情況而定。</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
