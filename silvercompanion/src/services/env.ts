const e = import.meta.env

export const env = {
  supabaseUrl: e.VITE_SUPABASE_URL?.trim() || '',
  supabaseAnonKey: e.VITE_SUPABASE_ANON_KEY?.trim() || '',
  googleMapsKey: e.VITE_GOOGLE_MAPS_API_KEY?.trim() || '',
  googleMapId: e.VITE_GOOGLE_MAPS_MAP_ID?.trim() || 'DEMO_MAP_ID',
  osrmUrl: (e.VITE_OSRM_URL?.trim() || 'https://router.project-osrm.org').replace(/\/$/, ''),
  mapStyleUrl: e.VITE_MAP_STYLE_URL?.trim() || 'https://tiles.openfreemap.org/styles/positron',
  lineLoginChannelId: e.VITE_LINE_LOGIN_CHANNEL_ID?.trim() || '',
}

/**
 * Demo mode keeps every table in this browser (localStorage) and fakes
 * realtime across tabs, so the whole product can be explored without a
 * Supabase project, LINE Pay merchant or SMS gateway.
 */
export const isDemo = e.VITE_DEMO_MODE === 'true' || !env.supabaseUrl || !env.supabaseAnonKey

/** 「快速預覽身分」(spec 4.1.3: allowed in test environments only). */
export const rolePreviewEnabled = isDemo || e.VITE_ENABLE_ROLE_PREVIEW === 'true'

/** Absolute URL of an in-app route, honouring the deploy base path. */
export function appUrl(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}${path.startsWith('/') ? path : `/${path}`}`
}
