/**
 * Tipos de entidades según lovable-spec §8.
 * Campos opcionales donde la spec permite NULL o no los exige en todas las rutas.
 */

import type { TipoAccion } from '@/features/operations/utils/tipoAccionConfig'
import type { UserRole } from './enums'
import type { ActionStatus, PrioridadNc } from './enums'
import type { NombreKpi, KpiUnidad } from './enums'

export interface Usuario {
  id: string
  user_id: string
  nombre: string
  /** Nombre del rol; conectado con catalog_roles.nombre */
  rol: string
  area: string | null
  activo: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface AccionDiaria {
  id: string
  fecha: string // date YYYY-MM-DD
  /** Título breve (máx. 70 caracteres); se muestra en vista colapsada. */
  titulo_accion: string
  descripcion_accion: string
  responsable: string // FK usuarios.id (assigned_to)
  created_by?: string | null // FK usuarios.id (quién creó)
  updated_by?: string | null // FK usuarios.id (quién modificó)
  hora_limite: string // time HH:MM
  evidencia_esperada: string
  evidencia_cargada: boolean
  evidencia_adjunta: string | null
  estado: ActionStatus
  kpi_afectado: string | null
  /** Brecha O2C (catálogo); opcional; convive con kpi_afectado legacy */
  gap_id?: string | null
  /** Categoría de complejidad (requiere migración `tipo_accion_enum` en BD). */
  tipo_accion: TipoAccion | null
  story_points: number
  catalog_kpi_id?: string | null
  okr_impactado: string | null
  proceso: string | null
  area: string | null
  cliente_id: string | null
  prioridad: PrioridadNc
  causa_raiz: string | null
  responsable_bloqueo: string | null
  escalado: boolean
  fecha_escalamiento: string | null
  notas_escalamiento: string | null
  repeticion: boolean
  verificador_dato: string | null
  verificador_gobierno: string | null
  /** Auditoría opcional (migración 20260413120000): quién/cuándo cerró operativamente. */
  completed_at?: string | null
  completed_by?: string | null
  /** Auditoría opcional: verificación final. */
  verified_at?: string | null
  verified_by?: string | null
  created_at: string
  updated_at: string
}

/** Punto a validar (checklist) vinculado a una acción diaria. */
export interface AccionCheckpoint {
  id: string
  accion_id: string
  texto: string
  orden: number
  obligatorio: boolean
  activo: boolean
  completado: boolean
  checked_at: string | null
  checked_by: string | null
  created_at: string
  updated_at: string
}

export interface Kpi {
  id: string
  nombre_kpi: NombreKpi
  definicion_operable: string | null
  unidad: KpiUnidad
  owner_rol: UserRole
  formula: string | null
}

export interface Okr {
  id: string
  nombre_okr: string
  descripcion: string | null
  proceso: string | null
  owner_usuario: string | null
  periodo: string
  activo: boolean
}

export interface Proceso {
  id: string
  nombre_proceso: string
  owner_usuario: string | null
}

export interface Cliente {
  id: string
  nombre: string
  // TODO: más campos según catálogo real
}

/** Vista/join: acción con nombre del responsable (si RLS lo permite) */
export interface AccionDiariaConResponsable extends AccionDiaria {
  responsable_nombre?: string
}
