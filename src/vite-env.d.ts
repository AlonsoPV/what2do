/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** URL base de la app (ej. https://tu-app.vercel.app). Usada para el enlace de recuperación de contraseña. Si no se define, se usa window.location.origin. */
  readonly VITE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
