import { getAppNow } from './clock'

const CDMX_TZ = 'America/Mexico_City'

function cdmxNowParts(now = getAppNow()): { ymd: string; hm: string } {
  return {
    ymd: now.toLocaleDateString('en-CA', { timeZone: CDMX_TZ }),
    hm: now.toLocaleTimeString('en-GB', {
      timeZone: CDMX_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

function normalizeTime(time: string): string | null {
  const [hoursRaw, minutesRaw] = time.trim().split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function isFutureDateTimeCDMX(date: string | null | undefined, time: string | null | undefined): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (!time) return false
  const normalizedTime = normalizeTime(time)
  if (!normalizedTime) return false
  const now = cdmxNowParts()
  return `${date}T${normalizedTime}` > `${now.ymd}T${now.hm}`
}

export function isTodayOrFutureDateCDMX(date: string | null | undefined): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  return date >= cdmxNowParts().ymd
}

export function splitDateTimeLocal(value: string | null | undefined): { date: string; time: string } | null {
  if (!value) return null
  const [date, timeRaw] = value.split('T')
  const time = timeRaw?.slice(0, 5)
  if (!date || !time) return null
  return { date, time }
}

export function validateFutureDateTimeCDMX(
  date: string | null | undefined,
  time: string | null | undefined,
  label: string
): string | null {
  if (isFutureDateTimeCDMX(date, time)) return null
  return `${label} debe quedar despues del momento de creacion.`
}

export function validateTodayOrFutureDateCDMX(
  date: string | null | undefined,
  label: string
): string | null {
  if (isTodayOrFutureDateCDMX(date)) return null
  return `${label} debe ser hoy o una fecha posterior.`
}

export function validateFutureInstant(value: string | null | undefined, label: string): string | null {
  if (!value) return `${label} debe quedar despues del momento de creacion.`
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms) || ms <= getAppNow().getTime()) {
    return `${label} debe quedar despues del momento de creacion.`
  }
  return null
}

/** Valida `datetime-local` contra el reloj real (ignora `VITE_DEV_FIXED_NOW`). */
export function validateFutureDatetimeLocalWallClock(
  value: string | null | undefined,
  label: string
): string | null {
  if (!value) return `${label} debe quedar despues del momento de creacion.`
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms) || ms <= Date.now()) {
    return `${label} debe quedar despues del momento de creacion.`
  }
  return null
}
