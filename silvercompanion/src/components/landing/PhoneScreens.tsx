import { Accessibility, BadgeCheck, Check, HandHelping, MapPin, MessageCircle, Phone, PersonStanding, Star, BedDouble } from 'lucide-react'
import type { ReactNode } from 'react'
import { MoodFace } from '@/components/common/MoodFace'
import { UserAvatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { MiniMap } from './art'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

/** A phone silhouette; the screens inside are miniature re-drawings of the real app. */
export function PhoneFrame({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <figure
      className={cn('relative w-[300px] shrink-0 rounded-[52px] bg-[#1d1714] p-[10px] shadow-[0_60px_100px_-40px_rgba(43,31,24,0.65)]', className)}
      aria-label={label}
    >
      <div className="relative h-[620px] overflow-hidden rounded-[42px] bg-bg" aria-hidden>
        <div className="absolute top-2.5 left-1/2 z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        <div className="relative z-10 flex h-11 items-end justify-between px-7 pb-1 text-[13px] font-bold">
          <span className="font-num">9:41</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[2px]">
              {[5, 7, 9, 11].map((h) => (
                <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />
              ))}
            </span>
            <span className="ml-1 h-[11px] w-[22px] rounded-[3px] border-[1.5px] border-ink/70 p-[1.5px]">
              <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
            </span>
          </span>
        </div>
        {children}
      </div>
    </figure>
  )
}

function ScreenTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-5 pt-3">
      <p className="text-xs font-bold tracking-[0.18em] text-primary-ink">{eyebrow}</p>
      <p className="mt-1 font-serif text-[26px] leading-tight font-black">{title}</p>
    </div>
  )
}

export function ScreenProfile() {
  const mobility = [
    { label: '可自理', icon: <PersonStanding /> },
    { label: '需攙扶', icon: <HandHelping />, on: true },
    { label: '需輪椅', icon: <Accessibility /> },
    { label: '臥床', icon: <BedDouble /> },
  ]
  return (
    <div>
      <ScreenTitle eyebrow="家庭照顧中心" title="長輩檔案" />
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-3xl bg-surface p-3.5 shadow-soft">
        <UserAvatar name="陳媽媽" size="sm" />
        <div>
          <p className="text-base font-black">陳媽媽・78 歲</p>
          <p className="text-[13px] text-ink-3">林秀英</p>
        </div>
      </div>
      <p className="mx-5 mt-5 text-[13px] font-bold text-ink-2">行動能力</p>
      <div className="mx-4 mt-2 grid grid-cols-4 gap-1.5">
        {mobility.map((m) => (
          <span
            key={m.label}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border py-2.5 text-xs font-bold [&_svg]:size-[18px]',
              m.on ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line bg-surface text-ink-3',
            )}
          >
            {m.icon}
            {m.label}
          </span>
        ))}
      </div>
      <p className="mx-5 mt-5 text-[13px] font-bold text-ink-2">慢性病與健康狀況</p>
      <div className="mx-4 mt-2 flex flex-wrap gap-1.5">
        {['高血壓', '輕微失智', '重聽'].map((d) => (
          <span
            key={d}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-3 py-1 text-[13px] font-bold text-primary-ink"
          >
            <Check className="size-3.5" strokeWidth={3} />
            {d}
          </span>
        ))}
        {['糖尿病', '關節退化'].map((d) => (
          <span key={d} className="rounded-full border border-line-strong px-3 py-1 text-[13px] font-bold text-ink-3">
            {d}
          </span>
        ))}
      </div>
      <p className="mx-5 mt-5 text-[13px] font-bold text-ink-2">照顧注意事項</p>
      <p className="mx-4 mt-2 rounded-2xl border border-line bg-surface p-3.5 font-serif text-[15px] leading-relaxed">
        右耳比較聽不清楚，請靠左側說話。喜歡聽鄧麗君，怕冷要帶外套。
      </p>
      <p className="mx-4 mt-3 flex items-center gap-1.5 rounded-2xl bg-success-soft px-3.5 py-2.5 text-[13px] font-bold text-success">
        <MapPin className="size-4" /> 台北市大安區仁愛路四段・已定位
      </p>
    </div>
  )
}

export function ScreenChoose() {
  const people = [
    { name: '小君', rating: '4.92', count: 79, tags: ['護理系畢業', '會講台語'], rate: 400, next: '明天 09:00 起可約' },
    { name: '阿哲', rating: '4.85', count: 52, tags: ['陪診經驗豐富', 'CPR 證照'], rate: 350, next: '明天 13:00 起可約' },
  ]
  return (
    <div>
      <ScreenTitle eyebrow="找陪伴" title="陪同就醫" />
      <div className="mt-3 flex gap-1.5 overflow-hidden px-4">
        {['大安區', '明天', '$500 以內'].map((c) => (
          <span key={c} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
            {c}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-3 px-4">
        {people.map((p, i) => (
          <div
            key={p.name}
            className={cn('rounded-[24px] border bg-surface p-4 shadow-soft', i === 0 ? 'border-primary/50 ring-2 ring-primary/15' : 'border-line')}
          >
            <div className="flex items-center gap-3">
              <UserAvatar name={p.name} size="sm" verified />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-serif text-lg font-black">
                  {p.name} <BadgeCheck className="size-4 text-success" />
                </p>
                <p className="flex items-center gap-1 text-[13px]">
                  <Star className="size-3.5 fill-star text-star" />
                  <b>{p.rating}</b>
                  <span className="text-ink-3">・{p.count} 則評價</span>
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-2">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-line pt-2.5">
              <p className="font-num text-xl font-semibold">
                ${p.rate}
                <span className="ml-0.5 font-sans text-xs font-bold text-ink-3">/ 小時</span>
              </p>
              <p className="text-xs font-bold text-success">{p.next}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-5 rounded-2xl bg-primary py-3.5 text-center text-base font-black text-on-primary shadow-glow">預約 小君</div>
    </div>
  )
}

export function ScreenLive() {
  return (
    <div className="absolute inset-0">
      <MiniMap animate className="absolute inset-0 size-full bg-[#f4ebdf]" />
      <div className="absolute inset-x-0 top-11 flex justify-center">
        <span className="rounded-full bg-surface/95 px-4 py-2 text-[13px] font-bold shadow-soft">● 即時位置・每 6 秒更新</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface p-5 pb-7 shadow-lift">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
        <div className="flex items-center gap-3">
          <UserAvatar name="小君" size="sm" />
          <div className="flex-1">
            <p className="text-base font-black">小君正在前往</p>
            <p className="text-[13px] text-ink-3">陪同就醫・媽媽家</p>
          </div>
          <div className="text-right">
            <p className="font-num text-2xl leading-none font-bold">6</p>
            <p className="text-xs font-bold text-ink-3">分鐘</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-[68%] rounded-full bg-primary" />
        </div>
        <p className="mt-2 flex justify-between text-xs font-bold text-ink-3">
          <span>已出發 08:52</span>
          <span>預計 09:10 抵達</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex items-center justify-center gap-1.5 rounded-2xl border border-line py-2.5 text-sm font-bold">
            <Phone className="size-4" /> 撥打
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-2xl border border-line py-2.5 text-sm font-bold">
            <MessageCircle className="size-4" /> 訊息
          </span>
        </div>
      </div>
    </div>
  )
}

export function ScreenLog() {
  return (
    <div>
      <ScreenTitle eyebrow="數位聯絡簿" title="10月15日（四）" />
      <div className="mx-4 mt-4 rounded-[26px] bg-surface p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <MoodFace mood="happy" className="size-14" label={false} />
          <div>
            <p className="text-[13px] font-bold text-ink-3">陳媽媽今天的心情</p>
            <p className="text-xl font-black text-success">開心</p>
          </div>
        </div>
        <p className="mt-3 font-serif text-[15px] leading-[1.8]">
          今天陪媽媽到台大醫院回診，醫師說血壓控制得很好，藥量不變。回程在巷口吃了碗湯麵，她說好久沒出門吃飯了。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <img src={asset('demo/hospital.svg')} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
          <img src={asset('demo/tea.svg')} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-3">
          <UserAvatar name="小君" size="xs" /> 陪伴者 小君・12:05
        </p>
      </div>
      <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl bg-surface p-3.5 shadow-soft">
        <span className="text-sm font-bold">為這次陪伴評分</span>
        <span className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-5 fill-star text-star" />
          ))}
        </span>
      </div>
    </div>
  )
}
