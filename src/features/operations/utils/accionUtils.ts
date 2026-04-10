import type { AccionDiaria } from '@/types'

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

/** Indica si la acción está en retraso: fecha límite pasada y no completada. */
export function isEnRetraso(a: AccionDiaria): boolean {
  if (a.estado === 'Hecho' || a.estado === 'Verificado') return false
  const hora = a.hora_limite?.slice(0, 5) ?? '23:59'
  const limite = new Date(`${a.fecha}T${hora}:00`)
  return limite.getTime() < Date.now()
}
