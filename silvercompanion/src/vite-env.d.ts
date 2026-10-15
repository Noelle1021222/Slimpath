/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_ENABLE_ROLE_PREVIEW?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string
  readonly VITE_OSRM_URL?: string
  readonly VITE_MAP_STYLE_URL?: string
  readonly VITE_LINE_LOGIN_CHANNEL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
