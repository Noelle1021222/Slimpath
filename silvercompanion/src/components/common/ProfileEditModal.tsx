import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { isValidTaiwanPhone, normalizePhone } from '@/lib/format'
import { profileService } from '@/services'

/** Personal details + emergency contact (used by SOS). */
export function ProfileEditModal({ open, onOpenChange, nameLocked }: { open: boolean; onOpenChange: (open: boolean) => void; nameLocked?: boolean }) {
  const { profile, setProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !profile) return
    setFullName(profile.full_name)
    setNickname(profile.nickname ?? '')
    setPhone(profile.phone)
    setContactName(profile.emergency_contact_name ?? '')
    setContactPhone(profile.emergency_contact_phone ?? '')
    setErrors({})
  }, [open, profile])

  const save = async () => {
    const e: Record<string, string> = {}
    if (fullName.trim().length < 2) e.fullName = '請填寫真實姓名。'
    if (!isValidTaiwanPhone(phone)) e.phone = '電話格式不正確。'
    if (contactPhone && !isValidTaiwanPhone(contactPhone)) e.contactPhone = '電話格式不正確。'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const next = await profileService.update({
        ...(nameLocked ? {} : { full_name: fullName.trim() }),
        nickname: nickname.trim() || null,
        phone: normalizePhone(phone),
        emergency_contact_name: contactName.trim() || null,
        emergency_contact_phone: contactPhone ? normalizePhone(contactPhone) : null,
      })
      setProfile(next)
      toast.success('已更新個人資料')
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
      title="個人資料"
      size="lg"
      footer={
        <Button size="lg" block onClick={save} loading={saving}>
          儲存
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="真實姓名"
            error={errors.fullName}
            hint={
              nameLocked ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-4" /> 已完成實名認證，如需修改請聯絡客服
                </span>
              ) : undefined
            }
          >
            <Input value={fullName} disabled={nameLocked} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="稱呼" optional>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
          </Field>
        </div>
        <Field label="聯絡電話" error={errors.phone}>
          <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
        <div className="rounded-3xl bg-danger-soft/60 p-5">
          <p className="text-base font-bold text-danger-strong">緊急聯絡人</p>
          <p className="mt-1 text-sm text-ink-2">按下 SOS 時，我們會傳送含定位的簡訊給這位聯絡人。</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="姓名">
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="陳志明（哥哥）" />
            </Field>
            <Field label="電話" error={errors.contactPhone}>
              <Input type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0922-111-222" />
            </Field>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  )
}
