/**
 * Loads the Google Maps JavaScript API once (with the routes, geocoding and
 * marker libraries). Only used when VITE_GOOGLE_MAPS_API_KEY is set.
 */
let pending: Promise<typeof google.maps> | null = null

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window !== 'undefined' && window.google?.maps?.Map) return Promise.resolve(window.google.maps)
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const callback = `__silverCompanionMaps${Date.now()}`
    ;(window as unknown as Record<string, () => void>)[callback] = () => {
      resolve(window.google.maps)
      delete (window as unknown as Record<string, unknown>)[callback]
    }
    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      language: 'zh-TW',
      region: 'TW',
      libraries: 'routes,geocoding,marker,geometry',
      loading: 'async',
      callback,
    })
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`
    script.async = true
    script.onerror = () => {
      pending = null
      reject(new Error('Google Maps 載入失敗'))
    }
    document.head.appendChild(script)
  })
  return pending
}
