import type { KinshipService } from './contracts'
import { demoBackend } from './demo/backend'
import { isDemo } from './env'
import { currentUserId, db, unwrap } from './supabaseClient'

const supabaseKinship: KinshipService = {
  async list() {
    return unwrap(await db().from('kinship_recipients').select('*').order('id'))
  },
  async create(input) {
    const seeker_id = await currentUserId()
    return unwrap(
      await db()
        .from('kinship_recipients')
        .insert({ ...input, seeker_id })
        .select('*')
        .single(),
    )
  },
  async update(id, input) {
    return unwrap(await db().from('kinship_recipients').update(input).eq('id', id).select('*').single())
  },
  async remove(id) {
    const { error } = await db().from('kinship_recipients').delete().eq('id', id)
    if (error) throw error
  },
}

export const kinshipService: KinshipService = isDemo ? demoBackend.kinship : supabaseKinship
