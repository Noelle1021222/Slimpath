import type { Profile } from '@/types'
import { compressImage } from '@/lib/image'
import type { ProfileService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, unwrap, unwrapMaybe } from './supabaseClient'

const supabaseProfiles: ProfileService = {
  async getMine() {
    const id = await currentUserId().catch(() => null)
    if (!id) return null
    return unwrapMaybe(await db().from('profiles').select('*').eq('id', id).maybeSingle())
  },
  async create(input) {
    const id = await currentUserId()
    return unwrap(
      await db()
        .from('profiles')
        .insert({ id, ...input })
        .select('*')
        .single(),
    )
  },
  async update(patch) {
    const id = await currentUserId()
    return unwrap(await db().from('profiles').update(patch).eq('id', id).select('*').single())
  },
  async switchRole(role) {
    return supabaseProfiles.update({ role }) as Promise<Profile>
  },
  async uploadAvatar(file) {
    const id = await currentUserId()
    const blob = await compressImage(file, 512, 0.85)
    const path = `${id}/avatar-${Date.now()}.jpg`
    const { error } = await db().storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const url = db().storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabaseProfiles.update({ avatar_url: url })
    return url
  },
}

export const profileService: ProfileService = isDemo ? demoBackend.profiles : supabaseProfiles
