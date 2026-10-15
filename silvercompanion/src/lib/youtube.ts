const ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Extracts the 11-character video id from any common YouTube URL form:
 * watch?v=, youtu.be/, /embed/, /shorts/, /live/, /v/, music. / m. hosts,
 * youtube-nocookie.com, with or without extra parameters — or a bare id.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (ID.test(raw)) return raw

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    return segments[0] && ID.test(segments[0]) ? segments[0] : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v')
    if (v && ID.test(v)) return v
    const [kind, id] = segments
    if (kind && id && ['embed', 'shorts', 'live', 'v', 'e'].includes(kind) && ID.test(id)) return id
    const attribution = url.searchParams.get('u')
    if (attribution) return parseYouTubeId(`https://youtube.com${attribution}`)
  }
  return null
}

export function youTubeEmbedUrl(id: string, autoplay = false) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1', cc_load_policy: '1', hl: 'zh-TW' })
  if (autoplay) params.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`
}

export function youTubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
