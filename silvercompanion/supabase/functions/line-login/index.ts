/**
 * POST /functions/v1/line-login   { code, redirectUri, codeVerifier, nonce }
 *
 * LINE Login (OIDC) for Supabase Auth, which has no built-in LINE provider:
 *   1. exchange the authorization code with LINE (PKCE),
 *   2. verify the ID token (signature, audience, nonce) via LINE's verify API,
 *   3. find-or-create the Supabase user,
 *   4. return a one-time magic-link token hash; the browser exchanges it with
 *      supabase.auth.verifyOtp({ type: 'magiclink', token_hash }) for a session.
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts'
import { resolveReturnUrl } from '../_shared/returnUrl.ts'
import { adminClient } from '../_shared/supabase.ts'

interface LineIdToken {
  sub: string
  name?: string
  picture?: string
  email?: string
  nonce?: string
}

serve(async (req) => {
  const body = await readJson<{ code: string; redirectUri: string; codeVerifier: string; nonce: string }>(req)
  const channelId = Deno.env.get('LINE_LOGIN_CHANNEL_ID')
  const channelSecret = Deno.env.get('LINE_LOGIN_CHANNEL_SECRET')
  if (!channelId || !channelSecret) throw new HttpError(503, 'LINE 登入尚未開放。', 'line_login_not_configured')
  if (typeof body.code !== 'string' || typeof body.redirectUri !== 'string') {
    throw new HttpError(400, '缺少登入參數。', 'bad_request')
  }
  // Only our own callback pages may receive tokens.
  const redirectUri = resolveReturnUrl(body.redirectUri).toString()

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
      ...(body.codeVerifier ? { code_verifier: String(body.codeVerifier) } : {}),
    }),
  })
  const tokens = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokens.id_token) throw new HttpError(401, 'LINE 登入失敗，請再試一次。', 'line_token_failed')

  const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: tokens.id_token,
      client_id: channelId,
      ...(body.nonce ? { nonce: String(body.nonce) } : {}),
    }),
  })
  const idToken = (await verifyRes.json().catch(() => null)) as LineIdToken | null
  if (!verifyRes.ok || !idToken?.sub) throw new HttpError(401, 'LINE 身分驗證失敗。', 'line_verify_failed')

  const email = (idToken.email ?? `line_${idToken.sub.toLowerCase()}@users.line.silvercompanion.app`).toLowerCase()
  const db = adminClient()
  const { error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: idToken.name ?? null, avatar_url: idToken.picture ?? null, line_sub: idToken.sub, provider: 'line' },
    app_metadata: { provider: 'line', providers: ['line'] },
  })
  if (createError && !/already|registered|exists/i.test(createError.message)) {
    console.error('createUser failed', createError)
    throw new HttpError(500, '建立帳號失敗，請稍後再試。', 'create_user_failed')
  }

  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !link?.properties?.hashed_token) throw new HttpError(500, '登入失敗，請稍後再試。', 'link_failed')

  return json({ tokenHash: link.properties.hashed_token, email })
})
