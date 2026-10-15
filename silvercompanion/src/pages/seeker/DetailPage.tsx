import { BadgeCheck, CalendarHeart, ChevronLeft, Clock3, HeartHandshake, MapPin, ShieldCheck, Sparkles, Wifi } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PageContainer, SectionTitle } from '@/components/common/PageHeader'
import { ServiceIcon } from '@/components/common/ServiceIcon'
import { AvailabilityCalendar } from '@/components/seeker/AvailabilityCalendar'
import { BookingFormModal } from '@/components/seeker/BookingFormModal'
import { ReviewCard } from '@/components/seeker/ReviewCard'
import { YouTubeEmbed } from '@/components/seeker/YouTubeEmbed'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StarRating } from '@/components/ui/star-rating'
import { useProviderPublic, useProviderReviews } from '@/hooks/queries'
import { SERVICE_MAP } from '@/lib/constants'
import type { ServiceType } from '@/types'

export default function DetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const provider = useProviderPublic(id)
  const reviews = useProviderReviews(id)
  const [slot, setSlot] = useState<{ date: string; hour: number } | null>(null)
  const [booking, setBooking] = useState(false)
  const service = params.get('service') as ServiceType | null

  if (provider.isLoading)
    return (
      <PageContainer>
        <Skeleton className="h-10 w-24" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
          <Skeleton className="h-[520px] rounded-[28px]" />
          <Skeleton className="h-[520px] rounded-[28px]" />
        </div>
      </PageContainer>
    )

  const p = provider.data
  if (!p)
    return (
      <PageContainer>
        <EmptyState
          title="找不到這位陪伴者"
          description="可能已暫停服務。看看其他同樣用心的陪伴者吧。"
          action={
            <Button asChild size="lg">
              <Link to="/seeker/search">回到搜尋</Link>
            </Button>
          }
        />
      </PageContainer>
    )

  const months = Math.max(1, Math.round((Date.now() - new Date(p.member_since).getTime()) / (30.4 * 86_400_000)))
  const tenure = months >= 12 ? { value: (months / 12).toFixed(months % 12 ? 1 : 0), unit: '年' } : { value: String(months), unit: '個月' }
  const pick = (date: string, hour: number) => {
    setSlot({ date, hour })
    setBooking(true)
  }

  return (
    <PageContainer className="pb-28 md:pb-0">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/seeker/search'))}
        className="mb-5 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-4 pl-2 text-base font-bold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeft className="size-5" /> 返回
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_420px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[32px] border border-line bg-surface p-6 shadow-soft md:p-9"
          >
            <div
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,var(--primary-soft),transparent_70%)]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <UserAvatar name={p.nickname} src={p.avatar_url} size="2xl" online={p.service_switch_is_online} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-[40px] leading-none font-black md:text-5xl">{p.nickname}</h1>
                  {p.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success">
                      <BadgeCheck className="size-4" /> 實名認證
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
                  <StarRating value={p.rating_avg} />
                  <span className="font-num text-xl font-bold">{Number(p.rating_avg).toFixed(2)}</span>
                  <span className="text-ink-3">{p.review_count} 則評價</span>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-ink-2">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" />
                    {p.city}
                    {p.districts.length ? `・${p.districts.join('、')}` : ''}
                  </span>
                  {p.offers_online && (
                    <span className="inline-flex items-center gap-1 text-info">
                      <Wifi className="size-4" /> 可線上服務
                    </span>
                  )}
                </p>
              </div>
            </div>

            <dl className="relative mt-7 grid grid-cols-3 divide-x divide-line rounded-3xl bg-surface-2 py-4 text-center">
              <div>
                <dt className="text-sm font-bold text-ink-3">已服務</dt>
                <dd className="font-num text-2xl font-bold md:text-3xl">
                  {p.completed_orders}
                  <span className="ml-0.5 font-sans text-sm text-ink-3">次</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-ink-3">時薪</dt>
                <dd className="font-num text-2xl font-bold md:text-3xl">${p.hourly_rate}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-ink-3">加入銀髮伴</dt>
                <dd className="font-num text-2xl font-bold md:text-3xl">
                  {tenure.value}
                  <span className="ml-0.5 font-sans text-sm text-ink-3">{tenure.unit}</span>
                </dd>
              </div>
            </dl>

            {p.tags.length > 0 && (
              <div className="relative mt-6 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-[15px] font-bold text-ink-2"
                  >
                    <Sparkles className="size-4 text-accent" /> {t}
                  </span>
                ))}
              </div>
            )}
          </motion.section>

          {p.youtube_video_id && (
            <section aria-labelledby="video-title">
              <SectionTitle id="video-title">自我介紹影片</SectionTitle>
              <YouTubeEmbed videoId={p.youtube_video_id} name={p.nickname} avatar={p.avatar_url} />
            </section>
          )}

          {p.bio && (
            <section className="rounded-[28px] border border-line bg-surface p-6 shadow-soft md:p-8" aria-labelledby="bio-title">
              <h2 id="bio-title" className="flex items-center gap-2 text-2xl">
                <HeartHandshake className="size-6 text-primary" /> 關於我
              </h2>
              <p className="mt-4 font-serif text-xl leading-[1.9] text-ink">{p.bio}</p>
            </section>
          )}

          <section aria-labelledby="services-title">
            <SectionTitle id="services-title">提供的服務</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {p.service_types.map((s) => (
                <div key={s} className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-4">
                  <ServiceIcon type={s} size="lg" />
                  <div>
                    <p className="text-lg font-bold">{SERVICE_MAP[s].label}</p>
                    <p className="text-[15px] leading-snug text-ink-2">{SERVICE_MAP[s].description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="reviews-title">
            <SectionTitle id="reviews-title">家屬怎麼說</SectionTitle>
            {reviews.isLoading ? (
              <Skeleton className="h-32 rounded-3xl" />
            ) : reviews.data?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.data.slice(0, 6).map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            ) : (
              <p className="rounded-3xl bg-surface-2 px-5 py-6 text-base text-ink-3">還沒有公開評價。</p>
            )}
          </section>
        </div>

        <aside id="booking" className="lg:sticky lg:top-28" aria-labelledby="booking-title">
          <div className="rounded-[32px] border border-line bg-surface p-6 shadow-lift">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 id="booking-title" className="flex items-center gap-2 text-2xl">
                  <CalendarHeart className="size-6 text-primary" /> 預約時段
                </h2>
                <p className="mt-1 text-[15px] text-ink-3">未來 7 天・24 小時</p>
              </div>
              <p className="text-right">
                <span className="font-num text-[34px] leading-none font-semibold">${p.hourly_rate}</span>
                <span className="block text-sm font-bold text-ink-3">每小時</span>
              </p>
            </div>
            <div className="mt-5">
              {p.service_switch_is_online ? (
                <AvailabilityCalendar providerId={p.provider_id} slots={p.availability_slots} onPick={pick} selected={slot} />
              ) : (
                <p className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-5 text-base text-ink-2">
                  <Clock3 className="size-5" /> {p.nickname} 目前休息中，暫停接受新預約。
                </p>
              )}
            </div>
            <Button size="lg" block className="mt-6" disabled={!p.service_switch_is_online} onClick={() => setBooking(true)}>
              立即預約
            </Button>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-ink-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> 銀髮伴已核對 {p.nickname} 的身分證、良民證與相關證照。
            </p>
          </div>
        </aside>
      </div>

      {/* Phone: a booking bar that never scrolls away */}
      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <p className="flex-1">
            <span className="font-num text-2xl font-semibold">${p.hourly_rate}</span>
            <span className="text-sm font-bold text-ink-3"> / 小時</span>
          </p>
          <Button size="lg" disabled={!p.service_switch_is_online} onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
            選擇時段
          </Button>
        </div>
      </div>

      <BookingFormModal open={booking} onOpenChange={setBooking} provider={p} initial={slot} initialService={service} />
    </PageContainer>
  )
}
