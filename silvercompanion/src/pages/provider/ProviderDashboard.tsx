import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarRange,
  Clock3,
  HandCoins,
  Hourglass,
  Inbox,
  Landmark,
  Navigation,
  Star,
  Wallet,
  Youtube,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { PageContainer, SectionTitle } from '@/components/common/PageHeader'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { AvailabilityEditorModal } from '@/components/provider/AvailabilityEditorModal'
import { BankSetupModal } from '@/components/provider/BankSetupModal'
import { OnlineToggle } from '@/components/provider/OnlineToggle'
import { RateSettingModal } from '@/components/provider/RateSettingModal'
import { StatCard } from '@/components/provider/StatCard'
import { VerificationCard } from '@/components/provider/VerificationCard'
import { WithdrawModal } from '@/components/provider/WithdrawModal'
import { YoutubeLinkModal } from '@/components/provider/YoutubeLinkModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyOrders, useMyProvider, useProviderRequests, useProviderStats, useWithdrawals } from '@/hooks/queries'
import { useAuth } from '@/hooks/useAuth'
import { useCountUp } from '@/hooks/useCountUp'
import { bankName } from '@/lib/banks'
import { SERVICE_MAP } from '@/lib/constants'
import { formatDateLong, formatMoney, formatMonthDay, formatTimeRange, formatWeekday, greeting, maskAccount, shortName } from '@/lib/format'
import { todayISO } from '@/lib/time'
import { getWithdrawState } from '@/lib/withdraw'
import { cn } from '@/lib/utils'
import { isDemo } from '@/services'
import { useTrackingStore } from '@/store/useTrackingStore'
import { useUIStore } from '@/store/useUIStore'

type Sheet = 'withdraw' | 'bank' | 'rate' | 'video' | 'slots' | null

export default function ProviderDashboard() {
  const { profile } = useAuth()
  const details = useMyProvider()
  const stats = useProviderStats()
  const orders = useMyOrders('provider')
  const requests = useProviderRequests()
  const withdrawals = useWithdrawals()
  const tracking = useTrackingStore()
  const openTracking = useUIStore((s) => s.openTracking)
  const [sheet, setSheet] = useState<Sheet>(null)
  const d = details.data
  const today = todayISO()
  const trips = (orders.data ?? [])
    .filter((o) => ['accepted', 'navigating', 'in_progress'].includes(o.order_status))
    .sort((a, b) => a.service_date.localeCompare(b.service_date) || a.start_time.localeCompare(b.start_time))
  const todayTrips = trips.filter((o) => o.service_date === today)
  const navigating = trips.find((o) => o.order_status === 'navigating')
  const next = trips[0]

  return (
    <PageContainer>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="grain relative overflow-hidden rounded-[32px] bg-hero p-6 text-hero-ink md:p-10"
      >
        <div
          className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(47,181,165,0.45),transparent_65%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 left-1/3 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(143,227,214,0.18),transparent_65%)]"
          aria-hidden
        />
        <div className="relative grid items-end gap-6 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-base font-bold text-hero-ink/65">
              {formatMonthDay(today)} {formatWeekday(today)}
            </p>
            <h1 className="mt-2 text-[34px] leading-tight text-white md:text-5xl">
              {greeting()}，{profile ? shortName(profile.full_name, profile.nickname) : ''}
            </h1>
            <p className="mt-3 text-lg text-pretty text-hero-ink/80">
              {todayTrips.length
                ? `今天有 ${todayTrips.length} 個行程・下一個 ${todayTrips[0].start_time.slice(0, 5)} ${SERVICE_MAP[todayTrips[0].service_type].label}`
                : next
                  ? `下一個行程：${formatDateLong(next.service_date)} ${next.start_time.slice(0, 5)}`
                  : '今天沒有行程，好好休息，也記得更新空檔時段。'}
            </p>
          </div>
          {d ? <OnlineToggle details={d} /> : <Skeleton className="h-24 rounded-3xl opacity-20" />}
        </div>
      </motion.section>

      {d && !d.is_verified && <VerificationCard className="mt-5" />}

      {navigating && (
        <button
          type="button"
          onClick={() => {
            if (tracking.orderId !== navigating.id) tracking.start(navigating.id, isDemo)
            openTracking({ orderId: navigating.id, mode: 'sender' })
          }}
          className="mt-5 flex w-full items-center gap-4 rounded-[28px] border border-info/30 bg-info-soft p-5 text-left transition-transform hover:-translate-y-0.5"
        >
          <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-info text-white">
            <span className="absolute inset-0 animate-sos-ring rounded-2xl bg-info" />
            <Navigation className="relative size-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-black text-info">前往 {navigating.recipient_nickname ?? navigating.recipient_name} 家</span>
            <span className="block text-[15px] text-ink-2">
              {tracking.orderId === navigating.id ? '正在分享位置給家屬・點此開啟導航地圖' : '點此繼續分享即時位置'}
            </span>
          </span>
          <ArrowRight className="size-6 text-info" />
        </button>
      )}

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="本月數據">
        {stats.isLoading || !stats.data ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-[28px]" />)
        ) : (
          <>
            <StatCard icon={<Hourglass />} label="本月服務時數" value={stats.data.month_hours} unit="小時" />
            <StatCard
              icon={<CalendarClock />}
              label="本月完成訂單"
              value={stats.data.month_orders}
              unit="筆"
              hint={`收入 ${formatMoney(stats.data.month_earning)}`}
            />
            <StatCard icon={<Inbox />} label="累積訂單數" value={stats.data.total_orders} unit="筆" />
            <StatCard
              icon={<Star />}
              label="平均評分"
              value={Number(stats.data.rating_avg)}
              format={(n) => n.toFixed(2)}
              hint={`${stats.data.review_count} 則評價`}
            />
          </>
        )}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {d ? (
          <WalletCard
            balance={d.available_balance}
            bankCode={d.bank_code}
            bankAccount={d.bank_account}
            lastMonth={d.last_withdraw_month}
            onWithdraw={() => setSheet('withdraw')}
            onBank={() => setSheet('bank')}
          />
        ) : (
          <Skeleton className="h-72 rounded-[32px]" />
        )}

        <section className="flex flex-col rounded-[32px] border border-line bg-surface p-6 shadow-soft" aria-labelledby="next-trip">
          <div className="flex items-center justify-between gap-3">
            <h2 id="next-trip" className="text-2xl">
              下一個行程
            </h2>
            <Link
              to="/provider/schedule"
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-bold text-primary-ink hover:bg-primary-soft"
            >
              全部行程 <ArrowRight className="size-4" />
            </Link>
          </div>
          {orders.isLoading ? (
            <Skeleton className="mt-5 h-36" />
          ) : next ? (
            <Link
              to="/provider/schedule"
              className="mt-5 flex flex-1 flex-col justify-between rounded-3xl bg-surface-2 p-5 transition-colors hover:bg-surface-3"
            >
              <div className="flex items-start gap-4">
                <ServiceIcon type={next.service_type} size="lg" />
                <div>
                  <p className="text-xl font-bold">
                    {SERVICE_MAP[next.service_type].label}・{next.recipient_nickname ?? next.recipient_name}
                  </p>
                  <p className="mt-1 text-base text-ink-2">
                    {formatDateLong(next.service_date)}・{formatTimeRange(next.start_time, next.end_time)}
                  </p>
                  <p className="mt-1 text-[15px] text-ink-3">{next.is_online ? '線上服務' : next.location_address}</p>
                </div>
              </div>
              <p className="mt-4 flex items-center justify-between text-base">
                <span className="text-ink-2">
                  {next.payment_method === 'cash' ? '現場收現' : '已付款'}・家屬 {next.seeker_name}
                </span>
                <span className="font-num text-2xl font-extrabold text-primary-ink">{formatMoney(next.provider_earning)}</span>
              </p>
            </Link>
          ) : (
            <div className="mt-5 grid flex-1 place-items-center rounded-3xl bg-surface-2 p-6 text-center text-base text-ink-3">
              目前沒有行程。開啟上線接案、更新空檔，新的預約很快就會來！
            </div>
          )}
        </section>
      </div>

      <section className="mt-10" aria-labelledby="requests-title">
        <SectionTitle
          id="requests-title"
          action={
            <Link
              to="/provider/requests"
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-bold text-primary-ink hover:bg-primary-soft"
            >
              接案大廳 <ArrowRight className="size-4" />
            </Link>
          }
        >
          新的預約請求 {requests.data?.length ? <span className="font-num text-primary">{requests.data.length}</span> : null}
        </SectionTitle>
        {requests.isLoading ? (
          <Skeleton className="h-24 rounded-3xl" />
        ) : requests.data?.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">
            {requests.data.slice(0, 3).map((r) => (
              <li key={r.order_id}>
                <Link to="/provider/requests" className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2 md:p-5">
                  <ServiceIcon type={r.service_type} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold">
                      {SERVICE_MAP[r.service_type].label}・{r.recipient_name} {r.recipient_age} 歲
                    </span>
                    <span className="block truncate text-[15px] text-ink-2">
                      {formatDateLong(r.service_date)} {formatTimeRange(r.start_time, r.end_time)}・{r.area}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-num text-2xl font-extrabold text-primary-ink">{formatMoney(r.provider_earning)}</span>
                    <span className={cn('text-sm font-bold', r.is_open ? 'text-info' : 'text-primary-ink')}>{r.is_open ? '公開媒合' : '指定給您'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[28px] border border-dashed border-line-strong p-6 text-center text-base text-ink-3">目前沒有新的請求。</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="quick-title">
        <SectionTitle id="quick-title">快捷功能</SectionTitle>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <QuickAction
            icon={<CalendarRange />}
            title="設定空檔時間"
            text={d ? `未來兩週開放 ${Object.values(d.availability_slots ?? {}).reduce((n, h) => n + h.length, 0)} 小時` : ''}
            onClick={() => setSheet('slots')}
          />
          <QuickAction icon={<HandCoins />} title="調整時薪" text={d ? `目前 $${d.hourly_rate} / 小時` : ''} onClick={() => setSheet('rate')} />
          <QuickAction
            icon={<Youtube />}
            title="自我介紹影片"
            text={d?.youtube_video_id ? '已上傳・點此更換' : '還沒有影片'}
            onClick={() => setSheet('video')}
          />
          <QuickAction
            icon={<Landmark />}
            title="收款帳戶"
            text={d?.bank_account ? `${bankName(d.bank_code)} ${maskAccount(d.bank_account)}` : '尚未設定'}
            onClick={() => setSheet('bank')}
          />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="withdrawals-title">
        <SectionTitle id="withdrawals-title">提領紀錄</SectionTitle>
        {withdrawals.data?.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">
            {withdrawals.data.map((w) => (
              <li key={w.id} className="flex items-center gap-4 p-4 md:p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success">
                  <Wallet className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{Number(w.month.slice(5))} 月提領</span>
                  <span className="block text-sm text-ink-3">
                    {bankName(w.bank_code)} {maskAccount(w.bank_account)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-num text-xl font-extrabold">{formatMoney(w.amount)}</span>
                  <span className={cn('text-sm font-bold', w.status === 'paid' ? 'text-success' : 'text-warning')}>
                    {w.status === 'paid' ? '已入帳' : w.status === 'rejected' ? '退回' : '處理中'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[28px] border border-dashed border-line-strong p-6 text-center text-base text-ink-3">還沒有提領紀錄。</p>
        )}
      </section>

      {d && (
        <>
          <WithdrawModal open={sheet === 'withdraw'} onOpenChange={(v) => setSheet(v ? 'withdraw' : null)} details={d} />
          <BankSetupModal open={sheet === 'bank'} onOpenChange={(v) => setSheet(v ? 'bank' : null)} details={d} />
          <RateSettingModal open={sheet === 'rate'} onOpenChange={(v) => setSheet(v ? 'rate' : null)} details={d} />
          <YoutubeLinkModal open={sheet === 'video'} onOpenChange={(v) => setSheet(v ? 'video' : null)} details={d} />
          <AvailabilityEditorModal open={sheet === 'slots'} onOpenChange={(v) => setSheet(v ? 'slots' : null)} details={d} />
        </>
      )}
    </PageContainer>
  )
}

function WalletCard({
  balance,
  bankCode,
  bankAccount,
  lastMonth,
  onWithdraw,
  onBank,
}: {
  balance: number
  bankCode: string | null
  bankAccount: string | null
  lastMonth: string | null
  onWithdraw: () => void
  onBank: () => void
}) {
  const shown = useCountUp(balance, 1200)
  const state = getWithdrawState({ bankCode, bankAccount, balance, lastWithdrawMonth: lastMonth })
  return (
    <section
      className="relative overflow-hidden rounded-[32px] p-6 text-white shadow-lift md:p-8"
      style={{ background: 'linear-gradient(135deg, #0f6670 0%, #0b4a52 55%, #0b2531 100%)' }}
      aria-labelledby="wallet-title"
    >
      <div className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full border-[28px] border-white/[0.06]" aria-hidden />
      <div className="pointer-events-none absolute -top-10 right-24 size-28 rounded-full border-[14px] border-white/[0.05]" aria-hidden />
      <p id="wallet-title" className="flex items-center gap-2 text-base font-bold text-white/75">
        <Wallet className="size-5" /> 本月可提領餘額
      </p>
      <p className="mt-2 font-num text-[52px] leading-none font-extrabold tracking-tight tabular md:text-6xl">
        {(balance < 0 ? '−$' : '$') + Math.abs(Math.round(shown)).toLocaleString('zh-TW')}
      </p>
      <p className="mt-3 flex items-center gap-2 text-[15px] text-white/75">
        <Clock3 className="size-4" />
        {state.blocker === 'already_withdrawn'
          ? `本月已提領，下次可提領日 ${state.nextOpenDate ? formatMonthDay(state.nextOpenDate) : ''}`
          : '每月可提領一次，全額轉出'}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" className="bg-white text-[#0b4a52] shadow-none hover:bg-white/90" onClick={onWithdraw}>
          <HandCoins /> 申請提領
        </Button>
        <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onBank}>
          <Landmark />
          {bankAccount ? `${bankName(bankCode)} ${maskAccount(bankAccount)}` : '設定收款帳戶'}
        </Button>
      </div>
      {state.blocker === null && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
          <BadgeCheck className="size-4" /> 本月尚未提領，隨時可以申請
        </p>
      )}
    </section>
  )
}

function QuickAction({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-[28px] border border-line bg-surface p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-ink transition-transform group-hover:scale-110 [&_svg]:size-6">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-bold">{title}</span>
        <span className="block text-[15px] text-ink-3">{text}</span>
      </span>
    </button>
  )
}
