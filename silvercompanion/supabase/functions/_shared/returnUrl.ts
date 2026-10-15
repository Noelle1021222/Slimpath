import { HttpError } from './http.ts'

/**
 * The browser tells us where to come back to (dev, staging, production, a
 * GitHub Pages sub-path…) but only origins we trust are accepted.
 */
export function resolveReturnUrl(requested: unknown, env: { get(key: string): string | undefined } = Deno.env): URL {
  const site = env.get('SITE_URL')
  const allowed = new Set<string>(
    [site, ...(env.get('ALLOWED_ORIGINS') ?? '').split(',')]
      .map((v) => v?.trim())
      .filter((v): v is string => Boolean(v))
      .map((v) => {
        try {
          return new URL(v).origin
        } catch {
          return ''
        }
      })
      .filter(Boolean),
  )

  if (typeof requested === 'string' && requested) {
    let url: URL
    try {
      url = new URL(requested)
    } catch {
      throw new HttpError(400, 'returnUrl 格式錯誤。', 'bad_request')
    }
    if (!allowed.has(url.origin)) throw new HttpError(400, '不允許的返回網址。', 'return_url_not_allowed')
    url.search = ''
    url.hash = ''
    return url
  }
  if (!site) throw new HttpError(500, '尚未設定 SITE_URL。', 'misconfigured')
  return new URL('payment/confirm', site.endsWith('/') ? site : `${site}/`)
}
