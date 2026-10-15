import { Accessibility, BedDouble, HandHelping, MapPinned, PersonStanding, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { Segmented } from '@/components/ui/segmented'
import { qk, useInvalidate } from '@/hooks/queries'
import { CHRONIC_SUGGESTIONS, MOBILITY_OPTIONS } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { geoService, kinshipService } from '@/services'
import type { KinshipRecipient, Mobility } from '@/types'

const MOBILITY_ICONS: Record<Mobility, React.ReactNode> = {
  可自理: <PersonStanding />,
  需攙扶: <HandHelping />,
  需輪椅: <Accessibility />,
  臥床: <BedDouble />,
}

/** Spec 4.2.4 — create / edit an elder's care profile. */
export function KinshipFormModal({
  open,
  onOpenChange,
  recipient,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient?: KinshipRecipient | null
  onSaved?: (recipient: KinshipRecipient) => void
}) {
  const invalidate = useInvalidate()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [age, setAge] = useState('')
  const [mobility, setMobility] = useState<Mobility | null>(null)
  const [diseases, setDiseases] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [notes, setNotes] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(recipient?.name ?? '')
    setNickname(recipient?.nickname ?? '')
    setAge(recipient?.age?.toString() ?? '')
    setMobility(recipient?.mobility ?? null)
    setDiseases(recipient?.chronic_diseases ?? [])
    setNotes(recipient?.notes ?? '')
    setAddress(recipient?.address ?? '')
    setCustom('')
    setErrors({})
  }, [open, recipient])

  const toggleDisease = (d: string) => setDiseases((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
  const addCustom = () => {
    const v = custom.trim()
    if (v && !diseases.includes(v)) setDiseases((cur) => [...cur, v])
    setCustom('')
  }

  const save = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '請填寫長輩的姓名。'
    const ageNum = Number(age)
    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 130) e.age = '請填寫正確的年齡。'
    if (!mobility) e.mobility = '請選擇行動能力，陪伴者才能做好準備。'
    if (address.trim().length < 4) e.address = '請填寫完整的服務地址。'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      // Coordinates power distance and navigation; geocode only when the address changed.
      let lat = recipient?.lat ?? null
      let lng = recipient?.lng ?? null
      if (!recipient || recipient.address !== address.trim() || lat == null) {
        const hit = await geoService.geocode(address)
        lat = hit?.point.lat ?? null
        lng = hit?.point.lng ?? null
      }
      const input = {
        name: name.trim(),
        nickname: nickname.trim() || null,
        age: ageNum,
        mobility: mobility!,
        chronic_diseases: diseases,
        notes: notes.trim() || null,
        address: address.trim(),
        lat,
        lng,
      }
      const saved = recipient ? await kinshipService.update(recipient.id, input) : await kinshipService.create(input)
      await invalidate(qk.kinship)
      toast.success(recipient ? '已更新照顧檔案' : `已建立 ${saved.nickname ?? saved.name} 的照顧檔案`)
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={recipient ? `編輯 ${recipient.nickname ?? recipient.name}` : '新增長輩檔案'}
      description="這些資訊會在預約時自動帶給陪伴者，讓每次陪伴都更貼心。"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="lg" className="flex-[2]" onClick={save} loading={saving}>
            儲存檔案
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_120px]">
          <Field label="姓名" error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="林秀英" autoComplete="off" />
          </Field>
          <Field label="稱呼" optional>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="陳媽媽" maxLength={20} />
          </Field>
          <Field label="年齡" error={errors.age}>
            <Input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="78" min={1} max={130} />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2.5 text-base font-bold">行動能力</legend>
          <Segmented
            label="行動能力"
            value={mobility}
            onChange={setMobility}
            columns={4}
            size="lg"
            options={MOBILITY_OPTIONS.map((m) => ({ value: m.id, label: m.id, hint: m.hint, icon: MOBILITY_ICONS[m.id] }))}
          />
          {errors.mobility && <p className="mt-2 text-sm font-bold text-danger-strong">{errors.mobility}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-base font-bold">
            慢性病與健康狀況 <span className="ml-1 text-sm font-medium text-ink-3">可複選</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...CHRONIC_SUGGESTIONS, ...diseases])].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={diseases.includes(d)}
                onClick={() => toggleDisease(d)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-bold transition-colors',
                  diseases.includes(d) ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line-strong text-ink-2 hover:border-ink-3',
                )}
              >
                {d}
                {diseases.includes(d) && <X className="size-4" />}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  addCustom()
                }
              }}
              placeholder="其他狀況，例如：氣喘"
              className="h-12 text-base"
              aria-label="新增其他健康狀況"
            />
            <Button variant="secondary" onClick={addCustom} disabled={!custom.trim()}>
              <Plus /> 加入
            </Button>
          </div>
        </fieldset>

        <Field label="照顧注意事項" optional hint="例如：重聽請靠左側說話、喜歡聽老歌、怕冷要帶外套">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </Field>

        <Field
          label="預設服務地址"
          error={errors.address}
          hint={
            <span className="inline-flex items-center gap-1">
              <MapPinned className="size-4" /> 儲存時會自動定位，供導航與距離計算使用
            </span>
          }
        >
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="台北市大安區仁愛路四段 300 巷 12 號 3 樓"
            autoComplete="street-address"
          />
        </Field>
      </div>
    </ResponsiveModal>
  )
}
