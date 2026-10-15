import { ArrowRight, Check, CornerDownLeft, Lock, PhoneCall } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MiniMap } from './art'
import { Eyebrow, Reveal } from './shared'

/** Six safety guarantees, each with a small visual of how it actually works. */
export function SafetyBento() {
  const reduce = useReducedMotion()
  return (
    <section id="safety" className="scroll-mt-20 py-24 md:py-36" aria-labelledby="safety-title">
      <div className="mx-auto max-w-[1320px] px-4 md:px-10">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <Eyebrow index="05">安全機制</Eyebrow>
            <h2 id="safety-title" className="mt-6 font-serif text-[2.25rem] leading-[1.2] font-black md:text-6xl md:leading-[1.15]">
              放心，
              <br />
              是一項一項
              <br className="md:hidden" />
              做出來的。
            </h2>
          </Reveal>
          <Reveal className="self-end lg:col-span-5 lg:col-start-8" delay={0.1}>
            <p className="text-lg leading-[1.9] text-ink-2">
              我們把「安全」拆成看得見的機制：誰能接案、誰看得到地址、出事時按哪裡、錢什麼時候付——每一項都寫在系統裡，不靠口頭承諾。
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid auto-rows-auto gap-4 md:grid-cols-6 md:gap-5">
          <Tile
            className="md:col-span-6 lg:col-span-3 lg:row-span-2"
            title="實名與背景審核"
            text="身分證、警察刑事紀錄證明（良民證）與專業證照逐一核對，通過後才能上線接案。"
          >
            <div className="relative mx-auto mt-10 mb-6 h-64 w-full max-w-sm">
              {['國民身分證', '良民證', '照顧服務員證'].map((d, i) => (
                <div
                  key={d}
                  className="absolute inset-x-0 top-0 rounded-2xl border border-line bg-surface p-4 shadow-soft"
                  style={{ transform: `translateY(${i * 52}px) rotate(${(i - 1) * 2.5}deg)` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-3 font-serif text-lg font-black text-ink-3">證</span>
                    <span className="flex-1">
                      <span className="block font-bold">{d}</span>
                      <span className="mt-1.5 block h-2 w-2/3 rounded-full bg-surface-3" />
                    </span>
                    <span className="grid size-8 place-items-center rounded-full bg-success text-white">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  </div>
                </div>
              ))}
              <span className="absolute right-2 -bottom-2 rotate-[-10deg] rounded-xl border-[3px] border-success px-4 py-1.5 font-serif text-xl font-black tracking-[0.2em] text-success">
                已核對
              </span>
            </div>
          </Tile>

          <Tile className="md:col-span-3" title="即時位置，只在服務中分享" text="陪伴者出發後，每 6 秒更新一次位置；抵達、服務結束就停止分享。">
            <div className="mt-6 overflow-hidden rounded-2xl border border-line">
              <MiniMap animate={!reduce} />
            </div>
          </Tile>

          <Tile className="md:col-span-3" title="一鍵 SOS" text="一按就能撥打 119，同時把當下位置傳給緊急聯絡人。家屬與陪伴者的畫面都有。">
            <div className="mt-6 flex items-center gap-5">
              <span className="relative grid size-24 shrink-0 place-items-center">
                {!reduce && <span className="absolute inset-0 animate-sos-ring rounded-full bg-danger" />}
                <span className="relative grid size-24 place-items-center rounded-full bg-danger font-sans text-2xl font-black tracking-wider text-white shadow-[0_18px_40px_-12px_rgba(198,47,43,0.7)]">
                  SOS
                </span>
              </span>
              <ul className="space-y-2 text-[15px] font-bold text-ink-2">
                <li className="flex items-center gap-2">
                  <PhoneCall className="size-4 text-danger" /> 撥打 119
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-danger" /> 通知緊急聯絡人
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="size-4 text-danger" /> 附上 GPS 位置
                </li>
              </ul>
            </div>
          </Tile>

          <Tile className="md:col-span-2" title="付款有保障" text="LINE Pay 在接單前完成付款；取消或被婉拒，款項原路全額退回。">
            <div className="mt-6 space-y-2 text-[15px] font-bold">
              <p className="flex items-center gap-2">
                <span className="rounded-full bg-line-green px-3 py-1 text-white">LINE Pay 付款</span>
                <ArrowRight className="size-4 text-ink-3" />
                <span className="rounded-full bg-surface-2 px-3 py-1">陪伴者接單</span>
              </p>
              <p className="flex items-center gap-2 text-ink-2">
                <CornerDownLeft className="size-4 text-ink-3" /> 取消・婉拒 → 原路全額退回
              </p>
            </div>
          </Tile>

          <Tile className="md:col-span-2" title="地址與健康資料不外流" text="接單前只看得到大略區域；健康紀錄在接單後才開放，服務完成就關閉。">
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <Lock className="size-5 shrink-0 text-primary" />
              <span className="text-[15px] font-bold">
                台北市大安區
                <span className="mx-1 inline-block rounded bg-ink/80 px-1 text-transparent blur-[3px] select-none" aria-hidden>
                  仁愛路四段300巷
                </span>
                <span className="sr-only">（詳細地址已隱藏）</span>
              </span>
            </div>
          </Tile>

          <Tile className="md:col-span-2" title="給長輩的大字介面" text="三段字級一鍵切換，所有按鈕至少 44 像素，看得清楚、按得準。">
            <div className="mt-6 flex items-end gap-4 font-serif font-black" aria-hidden>
              <span className="text-2xl text-ink-3">字</span>
              <span className="text-4xl text-ink-2">字</span>
              <span className="text-6xl leading-none text-primary">字</span>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  )
}

function Tile({ title, text, children, className }: { title: string; text: string; children: ReactNode; className?: string }) {
  return (
    <Reveal className={cn('flex flex-col rounded-[32px] border border-line bg-surface p-7 shadow-soft md:p-8', className)}>
      <h3 className="font-sans text-2xl font-black">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-ink-2">{text}</p>
      {children}
    </Reveal>
  )
}
