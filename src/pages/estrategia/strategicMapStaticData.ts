import type { StrategicNorthRow } from '@/features/kpi/types/kpi.types'

const VALORES_EXTENDIDOS =
  [
    'La misión eleva el servicio más allá de la logística: transportar salud implica urgencia y responsabilidad en cada envío.',
    'Innovación, excelencia y humanidad articulan la ventaja competitiva (visión).',
    'Desglose del BHAG: (1) Mayor confiabilidad operativa y financiera — socio predecible y estable para clientes y accionistas.',
    '(2) Entregas perfectas y cumplimiento regulatorio en tiempo real — estándar de oro en calidad y seguridad; conformidad integrada en vivo en cada etapa.',
    '(3) Decisiones basadas en datos — gestión proactiva y objetiva donde los datos en tiempo real informan decisiones operativas y estratégicas.',
  ].join('\n')

/** Copia local si la tabla `strategic_north` está vacía o hay error de red. */
export const STRATEGIC_NORTH_FALLBACK: StrategicNorthRow = {
  id: 'local-fallback',
  mision:
    'Por amor a México, llevamos cada medicamento con seguridad, puntualidad y excelencia, convencidos de que en cada envío realmente transportamos salud.',
  vision:
    'Ser la mejor empresa de logística farmacéutica en México, uniendo innovación, excelencia y humanidad para asegurar que cada entrega proteja la salud de cada paciente.',
  valores: VALORES_EXTENDIDOS,
  bhag:
    'Ser la empresa de logística farmacéutica en México con mayor confiabilidad operativa y financiera, reconocida por entregas perfectas, cumplimiento regulatorio en tiempo real y decisiones basadas en datos.',
  bhag_anio: 2030,
  updated_at: '1970-01-01T00:00:00.000Z',
}

export const STRATEGIC_LABEL_MISION = 'Misión'
export const STRATEGIC_LABEL_VISION = 'Visión'
export const STRATEGIC_LABEL_VALORES = 'Contexto estratégico'
export const STRATEGIC_TAGLINE =
  'Cada envío transporta salud — cumplimiento regulatorio en vivo, datos en tiempo real y ejecución impecable.'

export const O2C_CORE_PROCESSES = [
  'Calificar y aceptar cliente',
  'Planear y asignar viaje',
  'Validar flota y operador',
  'Ejecutar viaje monitoreado',
  'Capturar evidencia en sitio',
  'Facturar automáticamente',
  'Cobrar y medir margen',
  'Gobernar con datos',
] as const
