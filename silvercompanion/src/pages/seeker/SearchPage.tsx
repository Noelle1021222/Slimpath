import { CalendarDays, Clock, MapPin, RotateCcw, SlidersHorizontal, Wallet, Wifi } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageContainer, PageHeader } from '@/components/common/PageHeader'
import { CompanionCard } from '@/components/seeker/CompanionCard'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/input'
import { RangeSlider } from '@/components/ui/range-slider'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useProviderSearch } from '@/hooks/queries'
import { SERVICES } from '@/lib/constants'
import { formatMonthDay, formatWeekday, relativeDayLabel } from '@/lib/format'
import { RATE_MAX, RATE_MIN, RATE_STEP } from '@/lib/pricing'
import { CITY_NAMES, districtsOf } from '@/lib/taiwan'
import { hourLabel, nextDays } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { SearchFilters, ServiceType } from '@/types'

function useFilters(): [SearchFilters, (patch: Partial<SearchFilters>) => void, () => void] {
  const [params, setParams] = useSearchParams()
  const filters: SearchFilters = {
    service: (params.get('service') as ServiceType | null) ?? null,
    city: params.get('city'),
    district: params.get('district'),
    online: params.get('online') === '1',
    date: params.get('date'),
    hour: params.get('hour') != null ? Number(params.get('hour')) : null,
    maxRate: Number(params.get('max') ?? RATE_MAX),
  }
  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch }
    const p = new URLSearchParams()
    if (next.service) p.set('service', next.service)
    if (next.online) p.set('online', '1')
    else {
      if (next.city) p.set('city', next.city)
      if (next.district) p.set('district', next.district)
    }
    if (next.date) p.set('date', next.date)
    if (next.date && next.hour != null) p.set('hour', String(next.hour))
    if (next.maxRate < RATE_MAX) p.set('max', String(next.maxRate))
    setParams(p, { replace: true })
  }
  return [filters, update, () => setParams(new URLSearchParams(), { replace: true })]
}

const dayLabel = (d: string) => `${relativeDayLabel(d) ?? formatWeekday(d)} ${formatMonthDay(d)}`

export default function SearchPage() {
  const [filters, update, clear] = useFilters()
  const [budget, setBudget] = useState(filters.maxRate)
  const reset = () => {
    clear()
    setBudget(RATE_MAX)
  }
  const [sheet, setSheet] = useState(false)
  // Typing on the slider should not refetch on every step.
  const deferred = useDeferredValue({ ...filters, maxRate: budget })
  const { data, isLoading, isFetching } = useProviderSearch(deferred)
  const days = useMemo(() => nextDays(14), [])
  const activeCount = [filters.city || filters.online, filters.district, filters.date, filters.hour != null, filters.maxRate < RATE_MAX].filter(Boolean).length

  const panel = (
    <FilterFields
      filters={filters}
      update={update}
      budget={budget}
      setBudget={(v) => {
        setBudget(v)
        update({ maxRate: v })
      }}
      days={days}
    />
  )

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Find a companion"
        title="找一位好陪伴"
        description="每一位陪伴者都通過實名與良民證審核。依需求、地區、時間與預算，找到最合適的人。"
      />

      <div className="-mx-4 mb-5 scrollbar-none flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="服務需求">
        <Chip size="lg" selected={!filters.service} onClick={() => update({ service: null })}>
          全部服務
        </Chip>
        {SERVICES.map((s) => (
          <Chip
            key={s.id}
            size="lg"
            selected={filters.service === s.id}
            icon={<s.icon />}
            onClick={() => update({ service: filters.service === s.id ? null : s.id })}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      {/* Desktop / tablet: the full grid of filters is always visible (spec 4.2.2) */}
      <section className="hidden rounded-[28px] border border-line bg-surface p-6 shadow-soft md:block lg:p-7" aria-label="篩選條件">
        {panel}
      </section>

      {/* Phone: a single button opens the same filters in a bottom sheet */}
      <div className="flex items-center gap-3 md:hidden">
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => setSheet(true)}>
          <SlidersHorizontal /> 篩選條件
          {activeCount > 0 && <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-on-primary">{activeCount}</span>}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="lg" onClick={reset} aria-label="清除篩選">
            <RotateCcw />
          </Button>
        )}
      </div>
      <ResponsiveModal
        open={sheet}
        onOpenChange={setSheet}
        title="篩選條件"
        size="lg"
        footer={
          <Button size="lg" block onClick={() => setSheet(false)}>
            查看 {data?.length ?? 0} 位陪伴者
          </Button>
        }
      >
        {panel}
      </ResponsiveModal>

      <div className="mt-8 mb-4 flex items-end justify-between gap-3" aria-live="polite">
        <p className="text-lg text-ink-2">
          {isLoading ? (
            '尋找中…'
          ) : (
            <>
              找到 <b className="font-num text-2xl text-ink">{data?.length ?? 0}</b> 位陪伴者
              {filters.date && (
                <span className="ml-2 text-base">
                  ・{dayLabel(filters.date)}
                  {filters.hour != null && ` ${hourLabel(filters.hour)}`} 有空
                </span>
              )}
            </>
          )}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-base font-bold text-primary-ink hover:bg-primary-soft md:inline-flex"
          >
            <RotateCcw className="size-4" /> 清除篩選
          </button>
        )}
      </div>

      <div className={cn('grid gap-5 transition-opacity md:grid-cols-2 lg:grid-cols-3', isFetching && !isLoading && 'opacity-60')}>
        {isLoading && Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} lines={4} />)}
        <AnimatePresence mode="popLayout">
          {data?.map((p, i) => (
            <motion.div
              key={p.provider_id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03 }}
            >
              <CompanionCard provider={p} highlight={filters.service} className="h-full" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!isLoading && data?.length === 0 && (
        <EmptyState
          illustration="search"
          title="這個條件下暫時沒有陪伴者"
          description="試試放寬時段或預算，或改選「線上服務」，也可以換個行政區看看。"
          action={
            <Button size="lg" variant="secondary" onClick={reset}>
              <RotateCcw /> 清除篩選
            </Button>
          }
        />
      )}
    </PageContainer>
  )
}

function FilterFields({
  filters,
  update,
  budget,
  setBudget,
  days,
}: {
  filters: SearchFilters
  update: (patch: Partial<SearchFilters>) => void
  budget: number
  setBudget: (v: number) => void
  days: string[]
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <FilterField icon={<MapPin className="size-4" />} label="縣市">
          <Select
            aria-label="縣市"
            value={filters.online ? '' : (filters.city ?? '')}
            disabled={filters.online}
            onChange={(e) => update({ city: e.target.value || null, district: null })}
          >
            <option value="">全台灣</option>
            {CITY_NAMES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField icon={<MapPin className="size-4" />} label="行政區">
          <Select
            aria-label="行政區"
            value={filters.district ?? ''}
            disabled={filters.online || !filters.city}
            onChange={(e) => update({ district: e.target.value || null })}
          >
            <option value="">{filters.city ? '全部行政區' : '請先選縣市'}</option>
            {districtsOf(filters.city).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField icon={<CalendarDays className="size-4" />} label="日期">
          <Select
            aria-label="日期"
            value={filters.date ?? ''}
            onChange={(e) => update({ date: e.target.value || null, hour: e.target.value ? filters.hour : null })}
          >
            <option value="">不限日期</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField icon={<Clock className="size-4" />} label="時段（24 小時）">
          <Select
            aria-label="時段"
            value={filters.hour ?? ''}
            disabled={!filters.date}
            onChange={(e) => update({ hour: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">{filters.date ? '整天都可以' : '請先選日期'}</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {hourLabel(h)} – {hourLabel(h + 1)}
              </option>
            ))}
          </Select>
        </FilterField>
      </div>

      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface-2 px-4 py-3">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-info-soft text-info">
            <Wifi className="size-5" />
          </span>
          <span>
            <span className="block text-base font-bold">線上服務</span>
            <span className="block text-sm text-ink-3">視訊陪聊、手機教學，不限地區</span>
          </span>
        </span>
        <Switch checked={filters.online} onCheckedChange={(v) => update({ online: v, city: null, district: null })} aria-label="只看提供線上服務的陪伴者" />
      </label>

      <div>
        <p className="flex items-center gap-1.5 text-base font-bold text-ink">
          <Wallet className="size-4" /> 最高時薪預算
        </p>
        <RangeSlider
          value={budget}
          onChange={setBudget}
          min={RATE_MIN}
          max={RATE_MAX}
          step={RATE_STEP}
          label="最高時薪預算"
          format={(v) => `$${v}`}
          suffix=" / 小時"
          marks={[600]}
        />
      </div>
    </div>
  )
}

function FilterField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-base font-bold text-ink">
        {icon}
        {label}
      </p>
      {children}
    </div>
  )
}
