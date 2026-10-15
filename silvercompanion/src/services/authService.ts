import type { User } from '@supabase/supabase-js'
import type { SessionUser } from '@/types'
import { normalizePhone } from '@/lib/format'
import type { AuthService } from './contracts'
import { demoBackend } from './demo/backend'
import { DEMO_PASSWORD } from './demo/seed'
import { appUrl, env, isDemo } from './env'
import { db, invokeFunction } from './supabaseClient'

function mapUser(user: User | null | undefined): SessionUser | null {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    suggestedName: (meta.full_name as string) ?? (meta.name as string) ?? null,
    suggestedAvatar: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  }
}

/** +886 for Taiwanese mobiles, as Supabase / Twilio expect E.164. */
function toE164(phone: string) {
  const digits = normalizePhone(phone)
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0')) return `+886${digits.slice(1)}`
  return `+${digits}`
}

const LINE_STATE_KEY = 'silvercompanion:line-login'

function base64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomToken(bytes = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

const supabaseAuth: AuthService = {
  async getSessionUser() {
    const { data } = await db().auth.getSession()
    return mapUser(data.session?.user)
  },
  onAuthChange(callback) {
    const { data } = db().auth.onAuthStateChange((_event, session) => callback(mapUser(session?.user)))
    return () => data.subscription.unsubscribe()
  },
  async signInWithPassword(email, password) {
    const { error } = await db().auth.signInWithPassword({ email: email.trim(), password })
    if (error)
      throw Object.assign(new Error(error.message === 'Invalid login credentials' ? 'Email 或密碼不正確。' : error.message), { hint: 'invalid_credentials' })
  },
  async signUpWithPassword(email, password) {
    const { data, error } = await db().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: appUrl('/auth/callback') },
    })
    if (error) throw error
    return { needsConfirmation: !data.session }
  },
  async sendPhoneOtp(phone) {
    const { error } = await db().auth.signInWithOtp({ phone: toE164(phone) })
    if (error) throw error
  },
  async verifyPhoneOtp(phone, token) {
    const { error } = await db().auth.verifyOtp({ phone: toE164(phone), token, type: 'sms' })
    if (error) throw Object.assign(new Error('驗證碼不正確或已過期。'), { hint: 'invalid_otp' })
  },
  async signInWithGoogle() {
    const { error } = await db().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl('/auth/callback'), queryParams: { prompt: 'select_account' } },
    })
    if (error) throw error
  },
  async startLineLogin() {
    if (!env.lineLoginChannelId) throw Object.assign(new Error('LINE 登入尚未開放。'), { hint: 'line_login_not_configured' })
    const state = randomToken(16)
    const nonce = randomToken(16)
    const verifier = randomToken(48)
    const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
    sessionStorage.setItem(LINE_STATE_KEY, JSON.stringify({ state, nonce, verifier }))
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.lineLoginChannelId,
      redirect_uri: appUrl('/auth/line'),
      state,
      scope: 'openid profile email',
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      ui_locales: 'zh-TW',
    })
    window.location.assign(`https://access.line.me/oauth2/v2.1/authorize?${params}`)
  },
  async completeLineLogin({ code, state }) {
    const saved = JSON.parse(sessionStorage.getItem(LINE_STATE_KEY) ?? 'null') as { state: string; nonce: string; verifier: string } | null
    sessionStorage.removeItem(LINE_STATE_KEY)
    if (!saved || saved.state !== state) throw Object.assign(new Error('登入連結已失效，請重新使用 LINE 登入。'), { hint: 'state_mismatch' })
    const { tokenHash } = await invokeFunction<{ tokenHash: string }>('line-login', {
      code,
      redirectUri: appUrl('/auth/line'),
      codeVerifier: saved.verifier,
      nonce: saved.nonce,
    })
    const first = await db().auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (first.error) {
      const second = await db().auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
      if (second.error) throw second.error
    }
  },
  async resetPassword(email) {
    const { error } = await db().auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/auth/callback?type=recovery') })
    if (error) throw error
  },
  async signOut() {
    await db().auth.signOut()
  },
  async previewAs(role) {
    // Staging databases seeded with supabase/seed.sql share these accounts.
    const email = role === 'seeker' ? 'yijun@silvercompanion.test' : 'xiaojun@silvercompanion.test'
    await supabaseAuth.signInWithPassword(email, DEMO_PASSWORD)
  },
}

export const authService: AuthService = isDemo ? demoBackend.auth : supabaseAuth

/** Sets a new password after following a recovery e-mail (Supabase only). */
export async function updatePassword(password: string) {
  if (isDemo) return
  const { error } = await db().auth.updateUser({ password })
  if (error) throw error
}
