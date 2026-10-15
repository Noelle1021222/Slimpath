import { Camera } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { profileService } from '@/services'

export function AvatarUploader({ size = 'xl' as const }: { size?: 'lg' | 'xl' | '2xl' }) {
  const { profile, refreshProfile } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  if (!profile) return null
  return (
    <div className="relative inline-flex w-fit">
      <UserAvatar name={profile.nickname ?? profile.full_name} src={profile.avatar_url} size={size} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="absolute -right-1 -bottom-1 grid size-11 place-items-center rounded-full border-4 border-surface bg-ink text-white shadow-soft transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        aria-label="更換大頭貼"
      >
        {busy ? <Spinner className="size-4" /> : <Camera className="size-5" />}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="選擇大頭貼照片"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          if (file.size > 10 * 1024 * 1024) return toast.error('照片太大了，請選擇 10MB 以內的照片。')
          setBusy(true)
          try {
            await profileService.uploadAvatar(file)
            await refreshProfile()
            toast.success('大頭貼已更新')
          } catch (err) {
            toast.error(errorMessage(err))
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
