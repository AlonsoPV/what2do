import { getAppNow } from '@/lib/clock'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import type { AccionDiaria, ActionStatus } from '@/types'

const CDMX_TZ = 'America/Mexico_City'

export const ACCION_ESTADOS_CERRADOS: ActionStatus[] = ['Completada']

/**
 * Código público `emx_XXXXX` (5 dígitos) derivado del UUID.
 * Para UUID estándar se usan los últimos 12 hex del id (mismo criterio que el seed demo: 00001…0000a).
 */
export function accionIdPublico(id: string): string {
  const hex = id.replace(/-/g, '').toLowerCase()
  if (/^[0-9a-f]{32}$/.test(hex)) {
    const last12 = hex.slice(20)
    const n = BigInt('0x' + last12) % 100000n
    return `emx_${String(n).padStart(5, '0')}`
  }
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  const n = Math.abs(h) % 100000
  return `emx_${String(n).padStart(5, '0')}`
}

/** @deprecated Usar `accionIdPublico` (mismo comportamiento: `emx_XXXXX`). */
export const accionIdCorto = accionIdPublico

export type FechaCompromisoSlot = 'past' | 'today' | 'future'

function normalizeFechaCompromiso(fecha: string): string {
  return fecha.trim().slice(0, 10)
}

/** Compara la fecha compromiso (YYYY-MM-DD) contra hoy en Ciudad de México (reloj real). */
export function getFechaCompromisoSlot(fecha: string): FechaCompromisoSlot {
  const ymd = normalizeFechaCompromiso(fecha)
  const today = todayWallClockCDMX()
  if (ymd < today) return 'past'
  if (ymd > today) return 'future'
  return 'today'
}

function normalizeHoraLimite(hora: string | undefined | null): string {
  const { hours, minutes } = (() => {
    const raw = (hora ?? '23:59').trim()
    const [hoursRaw, minutesRaw] = raw.split(':')
    const h = Number(hoursRaw)
    const m = Number(minutesRaw)
    return {
      hours: Number.isFinite(h) ? h : 23,
      minutes: Number.isFinite(m) ? m : 59,
    }
  })()
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getCdmxWallClock(date: Date): { ymd: string; hm: string } {
  return {
    ymd: date.toLocaleDateString('en-CA', { timeZone: CDMX_TZ }),
    hm: date.toLocaleTimeString('en-GB', {
      timeZone: CDMX_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

/** Comparación lexicográfica de HH:MM (24h). */
function isAfterCdmxTime(currentHm: string, deadlineHm: string): boolean {
  return currentHm > deadlineHm
}

function isPastAccionDeadline(accion: AccionDiaria, now = getAppNow()): boolean {
  const fecha = normalizeFechaCompromiso(accion.fecha)
  const { ymd, hm } = getCdmxWallClock(now)
  if (ymd > fecha) return true
  if (ymd < fecha) return false
  return isAfterCdmxTime(hm, normalizeHoraLimite(accion.hora_limite))
}

/** Epoch ms de fecha + hora_limite (compatibilidad con countdown del Kanban). */
export function getAccionDeadlineMs(
  accion: Pick<AccionDiaria, 'fecha' | 'hora_limite'>
): number {
  const [year, month, day] = normalizeFechaCompromiso(accion.fecha).split('-').map(Number)
  const [hours, minutes] = normalizeHoraLimite(accion.hora_limite).split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

function isAutoSyncEligible(accion: AccionDiaria): boolean {
  return !ACCION_ESTADOS_CERRADOS.includes(accion.estado)
}

/**
 * Retrasa si la fecha compromiso ya pasó o si hoy superó fecha + hora_limite (CDMX).
 */
export function isEnRetraso(a: AccionDiaria): boolean {
  if (ACCION_ESTADOS_CERRADOS.includes(a.estado)) return false
  return isPastAccionDeadline(a)
}

/** Estado objetivo según fecha compromiso y hora límite en CDMX; null si no aplica cambio automático. */
export function getAutoEstadoPorFechaCompromiso(accion: AccionDiaria): ActionStatus | null {
  if (!isAutoSyncEligible(accion)) return null

  if (isPastAccionDeadline(accion)) {
    return accion.estado === 'Retrasa' ? null : 'Retrasa'
  }

  if (accion.estado === 'Retrasa') {
    return 'En_Pausa'
  }

  return null
}

/** Columna Kanban efectiva según fecha compromiso (CDMX). */
export function getAccionKanbanColumn(accion: AccionDiaria): ActionStatus {
  if (ACCION_ESTADOS_CERRADOS.includes(accion.estado)) return accion.estado
  const target = getAutoEstadoPorFechaCompromiso(accion)
  if (target) return target
  if (isEnRetraso(accion) && accion.estado !== 'Retrasa') return 'Retrasa'
  return accion.estado
}
