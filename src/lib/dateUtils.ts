import { getAppNow } from './clock'

/** Zona horaria de Ciudad de México */
const CDMX_TZ = 'America/Mexico_City'

/**
 * Fecha de hoy en CDMX (YYYY-MM-DD).
 * Usa `getAppNow()` (respeta `VITE_DEV_FIXED_NOW` en demos).
 */
export function todayCDMX(): string {
  return getAppNow().toLocaleDateString('en-CA', { timeZone: CDMX_TZ })
}

/**
 * Fecha de hoy en CDMX (YYYY-MM-DD) según el reloj del sistema.
 * Ignora `VITE_DEV_FIXED_NOW`. Úsala en filtros `type="date"` donde el usuario
 * espera el calendario real aunque el resto de la app esté congelada en una demo.
 */
export function todayWallClockCDMX(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CDMX_TZ })
}

/** Formatea fecha/hora ISO para visualización en CDMX */
export function formatDateTimeCDMX(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: CDMX_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** Primer día del mes (YYYY-MM-DD). */
export function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/** Último día del mes (YYYY-MM-DD). */
export function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Nombre del mes en español. */
export function monthName(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('es-MX', { month: 'long' })
}

/** Fecha calendario (YYYY-MM-DD) a partir de un ISO timestamptz, en zona Ciudad de México. */
export function dateOnlyCDMX(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: CDMX_TZ })
}

/** Suma días a una fecha YYYY-MM-DD (calendario local, sin UTC). */
export function addCalendarDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const next = new Date(y, m - 1, d + delta)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

/**
 * Domingo de la semana que contiene `ymd` (YYYY-MM-DD en calendario local del navegador).
 */
export function endOfWeekSundayFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = date.getDay()
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow
  const end = new Date(date)
  end.setDate(date.getDate() + daysUntilSunday)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

/** Preset de “acciones creadas hasta” alineado al corte de `fecha_creacion` del listado. */
export type CreationDatePresetKey = 'hoy' | 'semana' | 'mes' | 'todo' | 'custom'

export function matchCreationDatePreset(
  fechaCreacion: string | undefined,
  todayYmd: string
): CreationDatePresetKey {
  if (fechaCreacion === undefined || fechaCreacion === '') return 'todo'
  if (fechaCreacion === todayYmd) return 'hoy'
  if (fechaCreacion === endOfWeekSundayFromYmd(todayYmd)) return 'semana'
  const [y, m] = todayYmd.split('-').map(Number)
  if (fechaCreacion === lastDayOfMonth(y, m)) return 'mes'
  return 'custom'
}
