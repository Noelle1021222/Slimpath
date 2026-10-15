import { ArrowRight, Phone, Plus } from 'lucide-react'
import { Accordion } from 'radix-ui'
import { Link } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { useEntry } from '@/hooks/useEntry'
import { SUPPORT_PHONE } from '@/lib/constants'
import { isDemo } from '@/services'
import { FAQ, LANDING_LINKS } from './content'
import { Eyebrow, Reveal } from './shared'

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24 md:py-36" aria-labelledby="faq-title">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 md:px-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <Eyebrow index="07">常見問題</Eyebrow>
          <h2 id="faq-title" className="mt-6 font-serif text-[2.25rem] leading-[1.2] font-black md:text-6xl md:leading-[1.15]">
            還想
            <br className="hidden lg:block" />
            多問一點？
          </h2>
          <p className="mt-6 text-lg leading-[1.9] text-ink-2">
            找不到答案，歡迎撥打客服專線
            <a
              href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
              className="mx-1 font-num font-bold whitespace-nowrap text-primary-ink underline-offset-4 hover:underline"
            >
              {SUPPORT_PHONE}
            </a>
            ，每天 8:00–22:00 都有真人接聽。
          </p>
        </Reveal>

        <Reveal className="lg:col-span-7 lg:col-start-6" delay={0.1}>
          <Accordion.Root type="single" collapsible defaultValue="item-0" className="border-t border-ink/15">
            {FAQ.map((f, i) => (
              <Accordion.Item key={f.q} value={`item-${i}`} className="border-b border-ink/15">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center gap-6 py-6 text-left font-serif text-xl leading-snug font-bold transition-colors hover:text-primary-ink focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none md:py-7 md:text-2xl">
                    <span className="flex-1">{f.q}</span>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 transition-all duration-500 group-hover:border-primary group-data-[state=open]:rotate-45 group-data-[state=open]:border-primary group-data-[state=open]:bg-primary group-data-[state=open]:text-on-primary">
                      <Plus className="size-5" />
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_0.3s_ease] data-[state=open]:animate-[accordion-down_0.45s_cubic-bezier(0.16,1,0.3,1)]">
                  <p className="max-w-2xl pr-14 pb-7 text-lg leading-[1.9] text-ink-2">{f.a}</p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Reveal>
      </div>
    </section>
  )
}

export function FinalCta() {
  const { seekerHref, providerHref } = useEntry()
  return (
    <section className="px-4 pb-6 md:px-6" aria-labelledby="cta-title">
      <div className="grain relative mx-auto max-w-[1400px] overflow-hidden rounded-[40px] bg-[radial-gradient(120%_140%_at_85%_-10%,#ee8a47_0%,#d0602a_26%,#b5481b_52%,#8e3510_100%)] px-6 py-24 text-center text-white md:px-12 md:py-36">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,228,190,0.2),transparent_65%)]"
          aria-hidden
        />
        <Reveal className="relative">
          <h2 id="cta-title" className="font-serif text-[2.25rem] leading-[1.25] font-black text-white sm:text-5xl md:text-7xl md:leading-[1.15]">
            今天，
            <br />
            就讓爸媽
            <br className="sm:hidden" />
            多一個伴。
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-[1.9] text-balance text-white">
            註冊免費，建立長輩檔案只要三分鐘。第一次預約，就從一場午後的聊天開始。
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" className="bg-white text-[#8e3510] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.45)] hover:bg-white/90">
              <Link to={seekerHref}>
                幫爸媽找陪伴 <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="xl" variant="ghost" className="border border-white/40 text-white hover:bg-white/10 hover:text-white">
              <Link to={providerHref}>成為陪伴者</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="overflow-hidden bg-bg pt-16" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        網站資訊
      </h2>
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-sm font-serif text-xl leading-relaxed font-bold text-ink-2">柿柿如意，陪伴如常。</p>
          <a
            href="tel:119"
            className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-2.5 text-base font-bold text-danger-strong transition-colors hover:bg-[#f9d3cf]"
          >
            <Phone className="size-5" /> 遇到緊急狀況，請直接撥打 119
          </a>
        </div>
        <nav className="grid grid-cols-2 gap-8 md:col-span-6 md:col-start-7 md:grid-cols-3" aria-label="頁尾導覽">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-ink-3">認識銀髮伴</p>
            <ul className="mt-4 space-y-1">
              {LANDING_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-flex min-h-11 items-center text-base font-bold text-ink-2 hover:text-ink">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-ink-3">開始使用</p>
            <ul className="mt-4 space-y-1">
              {[
                { to: '/auth', label: '登入' },
                { to: '/auth?mode=signup', label: '免費註冊' },
                { to: '/auth?role=provider&mode=signup', label: '申請成為陪伴者' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="inline-flex min-h-11 items-center text-base font-bold text-ink-2 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-sm font-bold tracking-[0.2em] text-ink-3">客服專線</p>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
              className="mt-4 inline-flex min-h-11 items-center font-num text-2xl font-semibold text-ink hover:text-primary-ink"
            >
              {SUPPORT_PHONE}
            </a>
            <p className="text-[15px] text-ink-3">每天 8:00–22:00</p>
          </div>
        </nav>
      </div>
      <div className="mx-auto mt-16 max-w-[1320px] px-4 md:px-10">
        <div className="flex flex-col gap-2 border-t border-line pt-6 text-sm text-ink-3 md:flex-row md:justify-between">
          <p>© 2026 銀髮伴 SilverCompanion</p>
          <p>{isDemo ? '示範模式：資料只存在你的瀏覽器，不會送出到任何伺服器。' : '以溫柔的科技，陪伴每一位長輩。'}</p>
        </div>
      </div>
      {/* Decorative wordmark, drawn with CSS content so it stays out of the document text. */}
      <div
        className="pointer-events-none mt-10 -mb-[0.32em] overflow-hidden text-center font-serif text-[29vw] leading-none font-black tracking-[0.04em] whitespace-nowrap text-[#f1e5d5] select-none before:content-['銀髮伴'] md:text-[24vw]"
        aria-hidden
      />
    </footer>
  )
}
