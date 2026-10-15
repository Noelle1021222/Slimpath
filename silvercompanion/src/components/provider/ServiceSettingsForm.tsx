import { Plus, Wifi, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useUpdateProvider } from '@/hooks/useProviderMutations'
import { PROVIDER_TAG_SUGGESTIONS, SERVICES } from '@/lib/constants'
import { CITY_NAMES, districtsOf } from '@/lib/taiwan'
import { cn } from '@/lib/utils'
import type { ProviderDetails, ServiceType } from '@/types'

const MAX_TAGS = 12
const MAX_BIO = 1000

/** Services, area, tags and bio — everything families filter and read on the detail page. */
export function ServiceSettingsForm({ details, className }: { details: ProviderDetails; className?: string }) {
  const update = useUpdateProvider('已儲存服務設定')
  const [services, setServices] = useState<ServiceType[]>(details.service_types)
  const [city, setCity] = useState(details.city ?? '台北市')
  const [districts, setDistricts] = useState<string[]>(details.districts)
  const [online, setOnline] = useState(details.offers_online)
  const [tags, setTags] = useState<string[]>(details.tags)
  const [customTag, setCustomTag] = useState('')
  const [bio, setBio] = useState(details.bio ?? '')
  const [error, setError] = useState<string | null>(null)

  // Re-sync when the saved row changes elsewhere (another tab, a modal).
  useEffect(() => {
    setServices(details.service_types)
    setCity(details.city ?? '台北市')
    setDistricts(details.districts)
    setOnline(details.offers_online)
    setTags(details.tags)
    setBio(details.bio ?? '')
  }, [details])

  const dirty = useMemo(
    () =>
      services.join() !== details.service_types.join() ||
      city !== (details.city ?? '台北市') ||
      districts.join() !== details.districts.join() ||
      online !== details.offers_online ||
      tags.join() !== details.tags.join() ||
      bio.trim() !== (details.bio ?? '').trim(),
    [services, city, districts, online, tags, bio, details],
  )

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  const addTag = () => {
    const v = customTag.trim().slice(0, 12)
    if (v && !tags.includes(v) && tags.length < MAX_TAGS) setTags([...tags, v])
    setCustomTag('')
  }

  const save = () => {
    if (!services.length) return setError('至少選擇一項服務，家屬才找得到您。')
    setError(null)
    update.mutate({ service_types: services, city, districts, offers_online: online, tags, bio: bio.trim() || null })
  }

  return (
    <section className={cn('rounded-[32px] border border-line bg-surface shadow-soft', className)} aria-labelledby="service-settings-title">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-6 md:px-8">
        <div>
          <h2 id="service-settings-title" className="text-2xl">
            服務與自我介紹
          </h2>
          <p className="mt-1 text-[15px] text-ink-3">家屬搜尋時依這些條件篩選，也會在您的頁面看到。</p>
        </div>
      </header>

      <div className="space-y-8 p-6 md:p-8">
        <fieldset>
          <legend className="mb-3 text-base font-bold">提供的服務</legend>
          <div className="flex flex-wrap gap-2.5">
            {SERVICES.map((s) => (
              <Chip key={s.id} size="lg" selected={services.includes(s.id)} icon={<s.icon />} onClick={() => setServices((cur) => toggle(cur, s.id))}>
                {s.label}
              </Chip>
            ))}
          </div>
          {error && <p className="mt-2 text-sm font-bold text-danger-strong">{error}</p>}
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="服務縣市">
            <Select
              value={city}
              onChange={(e) => {
                setCity(e.target.value)
                setDistricts([])
              }}
            >
              {CITY_NAMES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="主要服務區域" hint="可複選，留白表示整個縣市">
            <Select value="" onChange={(e) => e.target.value && setDistricts((d) => (d.includes(e.target.value) ? d : [...d, e.target.value]))}>
              <option value="">新增行政區…</option>
              {districtsOf(city)
                .filter((d) => !districts.includes(d))
                .map((d) => (
                  <option key={d}>{d}</option>
                ))}
            </Select>
          </Field>
        </div>
        {districts.length > 0 && (
          <div className="-mt-4 flex flex-wrap gap-2">
            {districts.map((d) => (
              <Chip key={d} selected onClick={() => setDistricts((cur) => cur.filter((x) => x !== d))} aria-label={`移除 ${d}`}>
                {d} <X />
              </Chip>
            ))}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-4 rounded-3xl border border-line p-4 md:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-info-soft text-info">
            <Wifi className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">也提供線上服務</span>
            <span className="block text-[15px] text-ink-3">視訊聊天、手機教學等，全台家屬都能預約</span>
          </span>
          <Switch checked={online} onCheckedChange={setOnline} aria-label="也提供線上服務" />
        </label>

        <fieldset>
          <legend className="mb-3 text-base font-bold">
            特色標籤{' '}
            <span className="ml-1 text-sm font-medium text-ink-3">
              {tags.length}/{MAX_TAGS}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...tags, ...PROVIDER_TAG_SUGGESTIONS])].map((t) => (
              <Chip
                key={t}
                selected={tags.includes(t)}
                showCheck
                disabled={!tags.includes(t) && tags.length >= MAX_TAGS}
                onClick={() => setTags((cur) => toggle(cur, t))}
                className="disabled:opacity-40"
              >
                {t}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  addTag()
                }
              }}
              maxLength={12}
              placeholder="自訂標籤，例如：會做復健操"
              className="h-12 text-base"
              aria-label="自訂特色標籤"
            />
            <Button variant="secondary" onClick={addTag} disabled={!customTag.trim() || tags.length >= MAX_TAGS}>
              <Plus /> 加入
            </Button>
          </div>
        </fieldset>

        <Field
          label="關於我"
          optional
          hint={
            <span className={cn('tabular', bio.length > MAX_BIO * 0.9 && 'font-bold text-warning')}>
              {bio.length}/{MAX_BIO} 字・分享您的經歷，以及為什麼喜歡陪伴長輩
            </span>
          }
        >
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO}
            className="field-sizing-content max-h-[60vh] min-h-36 font-serif text-lg leading-relaxed"
          />
        </Field>
      </div>

      <footer
        className={cn(
          'flex items-center justify-end gap-3 rounded-b-[32px] border-t border-line bg-surface/95 px-6 py-4 md:px-8',
          // Pin the save bar to the bottom edge (above the phone nav) only while there is something to save.
          dirty &&
            'sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 shadow-[0_-12px_28px_-18px_rgb(var(--shadow-rgb)/0.35)] backdrop-blur md:bottom-0',
        )}
      >
        <p className={cn('mr-auto text-[15px] font-bold transition-opacity', dirty ? 'text-warning opacity-100' : 'opacity-0')} aria-live="polite">
          {dirty ? '有尚未儲存的變更' : ''}
        </p>
        <Button size="lg" onClick={save} loading={update.isPending} disabled={!dirty}>
          儲存變更
        </Button>
      </footer>
    </section>
  )
}
