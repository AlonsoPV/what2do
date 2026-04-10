/** Zona horaria de Ciudad de México */
const CDMX_TZ = 'America/Mexico_City'

/**
 * Fecha de hoy en CDMX (YYYY-MM-DD).
 */
export function todayCDMX(): string {
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
