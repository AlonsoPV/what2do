/**
 * Diálogo para crear o editar una acción diaria.
 * Usa AccionForm + useCreateAccion / useUpdateAccion.
 * Al crear, permite adjuntar evidencias (PDF, PNG, JPG, CSV, Excel) que se suben tras crear la acción.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AccionForm } from './AccionForm'
import { AccionFormSection } from './AccionFormSection'
import { AccionDialogHeaderMeta } from './AccionDialogHeaderMeta'
import { AccionEvidenciasSection } from './AccionEvidenciasSection'
import { AccionComentarios } from './AccionComentarios'
import { useCreateAccion, useDeleteAccion, useUpdateAccion, useAccion } from '../hooks'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import {
  isAnalystByRole,
  isDirectionByRole,
  isOperativeByRole,
  isSuperAdminByRole,
} from '@/features/auth/lib/permissions'
import { usersAdminService } from '@/features/users/services/users.service'
import { usersQueryKey } from '@/features/users/hooks/useUsers'
import { notificacionesService, sendNotificationEmail } from '@/services/notificaciones.service'
import { telegramIntegrationService } from '@/services/telegramIntegration.service'
import { EVIDENCIA_ACCEPTED_FORMATS_LABEL, EVIDENCIA_REJECTED_MESSAGE } from '@/lib/evidenciaFileTypes'
import {
  accionEvidenciasService,
  getAcceptedAccept,
  isAcceptedFile,
} from '@/services/accionEvidencias.service'
import { accionesService } from '@/services/acciones.service'
import { accionCheckpointsService } from '@/services/accionCheckpoints.service'
import type { AccionDiaria, ActionStatus } from '@/types'
import { DEFAULT_PRIORITY_NOMBRE } from '../utils/priorityLabels'
import type { AccionCreateInput, AccionFormInput } from '../schemas/accion.schema'
import { flattenDescripcionForForm } from '../utils/descripcionAccionTriada'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Download, ExternalLink, Paperclip, FileText, Image, Mail, Send, Trash2 } from 'lucide-react'
import {
  AccionChecklistEditor,
  type LocalCheckpointDraft,
} from './AccionChecklistEditor'
import { AccionChecklistManage } from './AccionChecklistManage'
import { ACCION_CHECKPOINTS_KEY } from '../hooks/useAccionCheckpoints'
import {
  dropdownOptionsByCatalogKeyQueryKey,
  fetchDropdownOptionsByCatalogKey,
} from '@/features/catalogs/hooks/useDropdownOptions'
import { areasQueryKey, fetchAreas } from '@/features/catalogs/hooks/useAreas'
import { fetchPriorities, prioritiesQueryKey, usePriorities } from '@/features/catalogs/hooks/usePriorities'
import { catalogKpisService } from '@/features/catalogs/services/kpis.service'
import { kpiQueryKeys } from '@/features/kpi/kpiQueryKeys'
import { listGaps } from '@/features/kpi/services/gaps.service'
import {
  fetchAccionCatalogKpiIds,
  fetchAccionGapIds,
  syncAccionO2cLinks,
} from '@/services/accionLinks.service'

import { todayWallClockCDMX } from '@/lib/dateUtils'
import { validateFutureDateTimeCDMX } from '@/lib/futureDateValidation'
import {
  downloadLocalFile,
  isPreviewableDocument,
  openLocalFile,
} from '@/lib/documentActions'
import {
  resolveAccionPrioridadId,
  resolveAccionPrioridadNombre,
} from '../utils/resolveAccionPrioridad'

/** Fecha de hoy en YYYY-MM-DD (calendario CDMX, no UTC). */
function todayISO(): string {
  return todayWallClockCDMX()
}

export interface AccionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accion?: AccionDiaria | null
  defaultFecha?: string
  onSuccess?: () => void
  /** Nombres de responsables para comentarios */
  responsableNames?: Record<string, string>
  /** Id opcional del contenedor del diálogo (ej. kanban-accion-dialog, dashboard-accion-dialog) */
  dialogId?: string
}

export function AccionFormDialog({
  open,
  onOpenChange,
  accion,
  defaultFecha,
  onSuccess,
  responsableNames = {},
  dialogId,
}: AccionFormDialogProps) {
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const createAccion = useCreateAccion()
  const updateAccion = useUpdateAccion()
  const deleteAccion = useDeleteAccion()
  const isEdit = !!accion?.id
  const accionFreshQuery = useAccion(accion?.id, { enabled: open && !!accion?.id })
  const accionLive = accionFreshQuery.data ?? accion ?? null
  const { data: priorities = [] } = usePriorities()
  const canDeleteAccion = isEdit && isSuperAdminByRole(currentUser?.rol)
  const isEditProtectedReadonly = isEdit
  const isAnalyst = isAnalystByRole(currentUser?.rol)
  const isActionCreator = !!accionLive?.created_by && accionLive.created_by === currentUser?.id
  const canManageChecklistStructure = isActionCreator
  // La autorizacion final del checklist vive en Supabase. El cliente solo evita
  // bloquear el click por caches o ids locales desfasados tras cambios de usuario.
  const canAttemptChecklistContribution = !!currentUser?.id && !isAnalyst
  const isMutating = createAccion.isPending || updateAccion.isPending || deleteAccion.isPending
  const canViewO2cImpactFields =
    !isAnalyst && !isDirectionByRole(currentUser?.rol) && !isOperativeByRole(currentUser?.rol)

  const o2cLinksQuery = useQuery({
    queryKey: ['accion-o2c-links', accion?.id] as const,
    queryFn: async () => {
      if (!accion?.id) return { gap_ids: [] as string[], catalog_kpi_ids: [] as string[] }
      const [fromGaps, fromKpis] = await Promise.all([
        fetchAccionGapIds(accion.id),
        fetchAccionCatalogKpiIds(accion.id),
      ])
      const gapSet = new Set(fromGaps)
      if (accion.gap_id) gapSet.add(accion.gap_id)
      const kpiSet = new Set(fromKpis)
      if (accion.catalog_kpi_id) kpiSet.add(accion.catalog_kpi_id)
      return { gap_ids: [...gapSet], catalog_kpi_ids: [...kpiSet] }
    },
    enabled: open && !!accion?.id && canViewO2cImpactFields,
    staleTime: 60_000,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingNewEvidencias, setPendingNewEvidencias] = useState<File[]>([])
  const [dragOverNew, setDragOverNew] = useState(false)
  const [checklistDrafts, setChecklistDrafts] = useState<LocalCheckpointDraft[]>([])
  /** Resumen de validación bajo los botones del pie (RHF/Zod y reglas del diálogo). */
  const [submitFooterErrors, setSubmitFooterErrors] = useState<string[] | null>(null)
  const [manualEmailPending, setManualEmailPending] = useState(false)
  const [manualTelegramPending, setManualTelegramPending] = useState(false)
  const [livePrioridad, setLivePrioridad] = useState<string | undefined>()

  useEffect(() => {
    if (open && !isEdit) {
      setPendingNewEvidencias([])
      setChecklistDrafts([])
    }
  }, [open, isEdit])

  useEffect(() => {
    setSubmitFooterErrors(null)
  }, [open, accion?.id])

  useEffect(() => {
    setLivePrioridad(
      accionLive
        ? resolveAccionPrioridadNombre(accionLive, priorities) || accionLive.prioridad
        : undefined
    )
  }, [accionLive, priorities, open])

  useEffect(() => {
    if (!open) return
    const prefetches = [
      qc.prefetchQuery({
        queryKey: dropdownOptionsByCatalogKeyQueryKey('evidencia_esperada'),
        queryFn: () => fetchDropdownOptionsByCatalogKey('evidencia_esperada'),
      }),
      qc.prefetchQuery({
        queryKey: areasQueryKey({ activo: true }),
        queryFn: () => fetchAreas({ activo: true }),
      }),
      qc.prefetchQuery({
        queryKey: prioritiesQueryKey(),
        queryFn: () => fetchPriorities(),
      }),
      qc.prefetchQuery({
        queryKey: [...usersQueryKey, { activo: true }],
        queryFn: () => usersAdminService.list({ activo: true }),
      }),
    ]
    if (canViewO2cImpactFields) {
      prefetches.push(
        qc.prefetchQuery({
          queryKey: [...kpiQueryKeys.gaps, JSON.stringify(isEdit ? {} : { activo: true })],
          queryFn: () => listGaps(isEdit ? {} : { activo: true }),
        }),
        qc.prefetchQuery({
          queryKey: ['catalogs', 'kpis', isEdit ? {} : { activo: true }],
          queryFn: () => catalogKpisService.list(isEdit ? {} : { activo: true }),
        })
      )
    }
    void Promise.allSettled(prefetches)
  }, [canViewO2cImpactFields, isEdit, open, qc])

  function userNameById(userId: string | null | undefined): string | null {
    if (!userId) return null
    if (userId === currentUser?.id) return currentUser.nombre ?? null
    if (responsableNames[userId]) return responsableNames[userId]
    const cached = qc.getQueryData<{ id: string; nombre: string }[]>([
      ...usersQueryKey,
      { activo: true },
    ])
    return cached?.find((u) => u.id === userId)?.nombre ?? null
  }

  function accionEmailPayload(input: {
    accionId: string
    tituloAccion: string
    descripcionAccion: string
    responsableId?: string | null
    fecha?: string | null
    horaLimite?: string | null
    creadorId?: string | null
    creadorNombre?: string | null
    checklist?: string[]
    titulo?: string
  }): Record<string, unknown> {
    const fechaCompromiso = [input.fecha, input.horaLimite?.slice(0, 5)].filter(Boolean).join(' ')
    const responsableNombre =
      userNameById(input.responsableId) ||
      (input.responsableId ? responsableNames[input.responsableId] : '') ||
      ''

    return {
      titulo: input.titulo ?? 'Te asignaron como responsable',
      titulo_accion: input.tituloAccion.trim() || undefined,
      descripcion_accion: flattenDescripcionForForm(input.descripcionAccion ?? '').trim().slice(0, 900) || undefined,
      responsable_id: input.responsableId ?? null,
      responsable_nombre: responsableNombre || undefined,
      fecha_compromiso: fechaCompromiso || undefined,
      checklist: input.checklist?.map((item) => item.trim()).filter(Boolean) ?? [],
      creador_id: input.creadorId ?? null,
      creador_nombre: input.creadorNombre ?? null,
      accion_id: input.accionId,
      asignador_id: currentUser?.id ?? null,
      asignador_nombre: currentUser?.nombre ?? null,
    }
  }

  async function notifyResponsable(
    usuarioId: string,
    accionId: string,
    meta: {
      titulo_accion: string
      descripcion_accion: string
      creador_id?: string | null
      creador_nombre?: string | null
      fecha?: string | null
      hora_limite?: string | null
      checklist?: string[]
    }
  ) {
    if (!usuarioId || !accionId) return
    try {
      const checklist =
        meta.checklist ??
        (await accionCheckpointsService
          .listByAccionId(accionId)
          .then((items) => items.map((item) => item.texto))
          .catch(() => [] as string[]))
      await notificacionesService.create({
        usuario_id: usuarioId,
        tipo: 'responsable',
        payload: {
          ...accionEmailPayload({
            accionId,
            tituloAccion: meta.titulo_accion,
            descripcionAccion: meta.descripcion_accion,
            responsableId: usuarioId,
            fecha: meta.fecha ?? accion?.fecha ?? null,
            horaLimite: meta.hora_limite ?? accion?.hora_limite ?? null,
            creadorId: meta.creador_id ?? null,
            creadorNombre: meta.creador_nombre ?? null,
            checklist,
          }),
          fecha_asignacion: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error('Error al crear notificación de responsable:', err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar la notificación al responsable. Si persiste, revisa permisos o contacta al administrador.'
      )
    }
  }

  async function handleSendActionEmail() {
    if (!accion?.id || !accion.responsable) {
      toast.error('La accion necesita un responsable para enviar el correo.')
      return
    }

    setManualEmailPending(true)
    try {
      const checkpoints = await accionCheckpointsService
        .listByAccionId(accion.id)
        .then((items) => items.map((item) => item.texto))
        .catch(() => [] as string[])
      await sendNotificationEmail({
        usuario_id: accion.responsable,
        tipo: 'responsable',
        payload: {
          ...accionEmailPayload({
            accionId: accion.id,
            tituloAccion: accion.titulo_accion ?? '',
            descripcionAccion: accion.descripcion_accion ?? '',
            responsableId: accion.responsable,
            fecha: accion.fecha,
            horaLimite: accion.hora_limite,
            creadorId: accion.created_by ?? null,
            creadorNombre: userNameById(accion.created_by),
            checklist: checkpoints,
            titulo: 'Te compartieron una accion',
          }),
          fecha_envio_manual: new Date().toISOString(),
        },
      })
      toast.success('Correo enviado al responsable')
    } catch (err) {
      console.error('Error al enviar correo de accion:', err)
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el correo')
    } finally {
      setManualEmailPending(false)
    }
  }

  async function handleSendActionTelegram() {
    const targetAccion = accionLive ?? accion
    if (!targetAccion?.id || !targetAccion.responsable) {
      toast.error('La accion necesita un responsable para enviar Telegram.')
      return
    }

    setManualTelegramPending(true)
    try {
      const result = await telegramIntegrationService.sendAction(targetAccion.id, targetAccion.responsable)
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success('Telegram enviado al responsable')
      }
    } catch (err) {
      console.error('Error al enviar Telegram de accion:', err)
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar Telegram')
    } finally {
      setManualTelegramPending(false)
    }
  }

  function refreshActionViews() {
    qc.invalidateQueries({ queryKey: ['acciones'], refetchType: 'active' })
    qc.invalidateQueries({ queryKey: ACCION_CHECKPOINTS_KEY, refetchType: 'active' })
  }

  function handleDeleteAccion() {
    if (!accion?.id || !canDeleteAccion) return

    deleteAccion.mutate(accion.id, {
      onSuccess: () => {
        toast.success('Accion eliminada correctamente')
        refreshActionViews()
        onOpenChange(false)
        onSuccess?.()
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la accion')
      },
    })
  }

  const defaultValues = useMemo((): Partial<AccionFormInput> | null => {
    if (!accionLive) {
      return {
        fecha: defaultFecha ?? todayISO(),
        titulo_accion: '',
        descripcion_modo: 'simple',
        descripcion_simple: '',
        descripcion_como: '',
        descripcion_quiero: '',
        descripcion_para_que: '',
        hora_limite: '17:00',
        prioridad: undefined,
        gap_ids: [],
        catalog_kpi_ids: [],
        tipo_accion: 'operativa',
        story_points: 0,
        sprint_id: null,
        responsable_bloqueo: null,
      }
    }
    const merged = o2cLinksQuery.data
    const gap_ids = merged?.gap_ids ?? (accionLive.gap_id ? [accionLive.gap_id] : [])
    const catalog_kpi_ids =
      merged?.catalog_kpi_ids ?? (accionLive.catalog_kpi_id ? [accionLive.catalog_kpi_id] : [])
    const prioridadResuelta = resolveAccionPrioridadNombre(accionLive, priorities)
    return {
      fecha: accionLive.fecha,
      titulo_accion: accionLive.titulo_accion ?? '',
      descripcion_modo: 'simple',
      descripcion_simple: flattenDescripcionForForm(accionLive.descripcion_accion ?? ''),
      descripcion_como: '',
      descripcion_quiero: '',
      descripcion_para_que: '',
      responsable: accionLive.responsable,
      hora_limite: accionLive.hora_limite?.slice(0, 5) ?? '17:00',
      evidencia_esperada: accionLive.evidencia_esperada,
      estado: accionLive.estado,
      prioridad: prioridadResuelta || accionLive.prioridad,
      area: accionLive.area ?? undefined,
      gap_ids,
      catalog_kpi_ids,
      tipo_accion: accionLive.tipo_accion ?? 'operativa',
      story_points:
        typeof accionLive.story_points === 'number' && Number.isFinite(accionLive.story_points)
          ? accionLive.story_points
          : Number(accionLive.story_points) || 0,
      sprint_id: accionLive.sprint_id ?? null,
      responsable_bloqueo: accionLive.responsable_bloqueo ?? null,
    }
  }, [accionLive, defaultFecha, o2cLinksQuery.data, priorities])

  const handleSubmit = (values: AccionCreateInput) => {
    setSubmitFooterErrors(null)
    const originalGapIds = defaultValues?.gap_ids ?? []
    const originalCatalogKpiIds = defaultValues?.catalog_kpi_ids ?? []
    const gapIds = isEditProtectedReadonly ? originalGapIds : (values.gap_ids ?? [])
    const catalogKpiIds = isEditProtectedReadonly ? originalCatalogKpiIds : (values.catalog_kpi_ids ?? [])
    const fecha = isEditProtectedReadonly && accionLive ? accionLive.fecha : (values.fecha ?? todayISO())
    if (!isEdit) {
      const futureError = validateFutureDateTimeCDMX(
        fecha,
        values.hora_limite,
        'La fecha y hora limite de la accion'
      )
      if (futureError) {
        setSubmitFooterErrors([futureError])
        toast.error(futureError)
        return
      }
    }
    const prioridad = (
      values.prioridad ??
      (accionLive ? resolveAccionPrioridadNombre(accionLive, priorities) : undefined) ??
      accionLive?.prioridad ??
      DEFAULT_PRIORITY_NOMBRE
    ).trim()
    const prioridad_id =
      priorities.find((p) => p.nombre === prioridad)?.id ??
      (accionLive ? resolveAccionPrioridadId(accionLive, priorities) : null)
    const estado = (values.estado ?? 'Pendiente') as ActionStatus
    const payload: Partial<AccionDiaria> =
      isEditProtectedReadonly && accionLive
        ? {
            descripcion_accion: values.descripcion_accion,
            prioridad,
            prioridad_id,
            updated_by: currentUser?.id ?? null,
          }
        : {
            fecha,
            titulo_accion: (values.titulo_accion ?? '').trim().slice(0, 70),
            descripcion_accion: values.descripcion_accion,
            responsable: values.responsable,
            hora_limite: values.hora_limite,
            evidencia_esperada: values.evidencia_esperada,
            prioridad,
            prioridad_id,
            estado,
            area: values.area ?? null,
            tipo_accion: values.tipo_accion ?? 'operativa',
            story_points: values.story_points ?? 0,
            gap_id: values.gap_id ?? null,
            catalog_kpi_id: values.catalog_kpi_id ?? null,
            sprint_id: values.sprint_id ?? null,
            responsable_bloqueo: values.responsable_bloqueo ?? null,
            ...(isEdit
              ? { updated_by: currentUser?.id ?? null }
              : { created_by: currentUser?.id ?? null }),
          }

    if (isEdit && accionLive) {
      const nuevoResponsable = payload.responsable ?? null
      const cambiaResponsable = nuevoResponsable && nuevoResponsable !== accionLive.responsable
      updateAccion.mutate(
        { id: accionLive.id, payload },
        {
          onSuccess: () => {
            if (cambiaResponsable && nuevoResponsable) {
              void notifyResponsable(nuevoResponsable, accionLive.id, {
                titulo_accion: payload.titulo_accion ?? accionLive.titulo_accion ?? '',
                descripcion_accion: payload.descripcion_accion ?? accionLive.descripcion_accion ?? '',
                creador_id: accionLive.created_by ?? null,
                creador_nombre: userNameById(accionLive.created_by),
                fecha: payload.fecha ?? accionLive.fecha,
                hora_limite: payload.hora_limite ?? accionLive.hora_limite,
              })
            }
            toast.success('Accion actualizada correctamente')
            onOpenChange(false)
            onSuccess?.()

            if (!isEditProtectedReadonly) {
              void syncAccionO2cLinks(accionLive.id, {
                gapIds,
                catalogKpiIds,
              })
                .then(() =>
                  Promise.allSettled([
                    qc.invalidateQueries({ queryKey: ['accion-o2c-links', accionLive.id] }),
                    qc.invalidateQueries({ queryKey: kpiQueryKeys.gapAcciones, refetchType: 'active' }),
                    qc.invalidateQueries({ queryKey: kpiQueryKeys.gaps, refetchType: 'active' }),
                    qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiAccionImpact, refetchType: 'active' }),
                  ])
                )
                .catch((e) => {
                  toast.error(
                    e instanceof Error
                      ? e.message
                      : 'No se pudieron guardar los vinculos con brechas/KPIs'
                  )
                })
            }
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : 'Error al actualizar'),
        }
      )
    } else {
      const badCheckpoint = checklistDrafts.some((d) => d.texto.trim().length < 3)
      if (badCheckpoint) {
        setSubmitFooterErrors([
          'Cada punto a validar debe tener al menos 3 caracteres o elimínalo.',
        ])
        return
      }
      const responsable = payload.responsable ?? null
      const filesToUpload = [...pendingNewEvidencias]
      createAccion.mutate(payload, {
        onSuccess: (created) => {
          if (!created?.id) {
            toast.error('La acción se creó, pero no se pudo confirmar el identificador.')
            refreshActionViews()
            onOpenChange(false)
            onSuccess?.()
            return
          }

          const createdId = created.id
          qc.invalidateQueries({ queryKey: ACCION_CHECKPOINTS_KEY, refetchType: 'active' })

          const deferredOps: Promise<unknown>[] = []

          deferredOps.push(
            (async () => {
              try {
                await syncAccionO2cLinks(createdId, { gapIds, catalogKpiIds })
                await Promise.allSettled([
                  qc.invalidateQueries({ queryKey: kpiQueryKeys.gapAcciones, refetchType: 'active' }),
                  qc.invalidateQueries({ queryKey: kpiQueryKeys.gaps, refetchType: 'active' }),
                  qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiAccionImpact, refetchType: 'active' }),
                ])
              } catch (e) {
                toast.error(
                  e instanceof Error
                    ? e.message
                    : 'No se pudieron guardar los vínculos con brechas/KPIs'
                )
              }
            })()
          )

          if (checklistDrafts.length > 0) {
            deferredOps.push(
              accionCheckpointsService.insertMany(
                createdId,
                checklistDrafts.map((d, i) => ({
                  texto: d.texto.trim(),
                  orden: i,
                  obligatorio: d.obligatorio,
                })),
                currentUser?.id ?? null
              )
            )
          }

          if (responsable) {
            deferredOps.push(
              notifyResponsable(responsable, createdId, {
                titulo_accion: payload.titulo_accion ?? '',
                descripcion_accion: payload.descripcion_accion ?? '',
                creador_id: currentUser?.id ?? null,
                creador_nombre: currentUser?.nombre ?? null,
                fecha: payload.fecha ?? null,
                hora_limite: payload.hora_limite ?? null,
                checklist: checklistDrafts.map((item) => item.texto),
              })
            )
          }

          if (filesToUpload.length > 0) {
            deferredOps.push(
              (async () => {
                await Promise.all(
                  filesToUpload.map((file) =>
                    accionEvidenciasService.upload(
                      createdId,
                      file,
                      currentUser?.id ?? null
                    )
                  )
                )
                await accionesService.update(createdId, { evidencia_cargada: true })
              })()
            )
          }

          setPendingNewEvidencias([])
          toast.success(
            filesToUpload.length > 0
              ? 'Acción creada. Procesando checklist/evidencias…'
              : 'Acción creada correctamente'
          )
          onOpenChange(false)
          onSuccess?.()

          if (deferredOps.length === 0) {
            refreshActionViews()
            return
          }

          void Promise.allSettled(deferredOps).then((results) => {
            const rejected = results.filter((r) => r.status === 'rejected')
            if (rejected.length > 0) {
              toast.error(
                'La acción se creó, pero algunas tareas secundarias no terminaron correctamente.'
              )
            } else if (filesToUpload.length > 0 || checklistDrafts.length > 0) {
              toast.success('Checklist y evidencias sincronizados')
            }
            refreshActionViews()
          })
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : 'Error al crear'),
      })
    }
  }

  const handleNewEvidenciaFile = (file: File) => {
    if (!isAcceptedFile(file)) {
      toast.error(EVIDENCIA_REJECTED_MESSAGE)
      return
    }
    setPendingNewEvidencias((prev) => [...prev, file].slice(0, 10))
  }

  const formBaseId = `${dialogId ?? 'accion-form-dialog'}-form`
  const showEmailButton = isEdit && !!accion
  const telegramAction = accionLive ?? accion
  const showTelegramButton = isEdit && !!telegramAction
  const isManualNotificationPending = manualEmailPending || manualTelegramPending
  const footerButtonCount =
    2 + (showEmailButton ? 1 : 0) + (showTelegramButton ? 1 : 0) + (canDeleteAccion ? 1 : 0)
  const footerActionsGridClass =
    footerButtonCount === 3 ? 'grid-cols-3' : footerButtonCount >= 4 ? 'grid-cols-2' : 'grid-cols-2'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={dialogId}
        className={cn(
          'accion-form-dialog !flex flex-col gap-0 overflow-hidden p-0',
          'fixed left-0 right-0 top-0 z-50 h-[100dvh] max-h-[100dvh] w-full max-w-none',
          'translate-x-0 translate-y-0 rounded-none border-x-0 border-t-0',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          'sm:left-[50%] sm:right-auto sm:top-[50%] sm:h-auto sm:max-h-[min(90dvh,900px)]',
          'sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border',
          'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]',
          'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
          '[&>button]:right-3 [&>button]:top-3 [&>button]:flex [&>button]:h-10 [&>button]:w-10 [&>button]:items-center [&>button]:justify-center',
          'sm:[&>button]:right-4 sm:[&>button]:top-4 sm:[&>button]:h-auto sm:[&>button]:w-auto'
        )}
        data-accion-dialog-mode={isEdit ? 'edit' : 'create'}
        data-accion-dialog-readonly-strategic={isEditProtectedReadonly ? 'true' : 'false'}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {isEdit ? 'Editar acción' : 'Nueva acción'}
        </DialogTitle>
        <div
          id={`${formBaseId}-dialog-header`}
          className="accion-form-dialog-header shrink-0 border-b border-border/60 bg-card px-3 py-2.5 pr-11 sm:px-4 sm:py-3 sm:pr-12"
        >
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 pr-1">
              <h2 className="text-sm font-semibold leading-tight tracking-tight sm:text-base" aria-hidden>
                {isEdit ? 'Editar acción' : 'Nueva acción'}
              </h2>
              {!isEdit ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground sm:text-xs">
                  Completa los datos para crear la acción
                </p>
              ) : null}
            </div>
            {isEdit && accionLive ? (
              <AccionDialogHeaderMeta
                accion={accionLive}
                prioridadNombre={livePrioridad}
                className="w-fit sm:max-w-[60%] sm:shrink-0"
              />
            ) : null}
          </div>
        </div>
        <div
          id={`${formBaseId}-dialog-body`}
          className="accion-form-dialog-body flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5"
        >
          <AccionForm
            key={`${accionLive?.id ?? 'new'}-${isEdit ? (o2cLinksQuery.isFetched ? 'o2c' : 'pending') : 'create'}-${defaultValues?.prioridad ?? ''}`}
            formId={formBaseId}
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            onSubmitInvalid={(messages) => setSubmitFooterErrors(messages)}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isMutating}
            isEdit={isEdit}
            readonlyStrategicFields={isEditProtectedReadonly}
            onPrioridadChange={setLivePrioridad}
            accionPrioridadId={
              accionLive
                ? resolveAccionPrioridadId(accionLive, priorities) ?? accionLive.prioridad_id ?? null
                : null
            }
            validationExtras={
              !isEdit ? (
                <>
                  <div id={`${formBaseId}-checklist-draft`}>
                    <AccionChecklistEditor
                      items={checklistDrafts}
                      onChange={setChecklistDrafts}
                      disabled={createAccion.isPending}
                    />
                  </div>
                  <AccionFormSection
                    sectionId={`${formBaseId}-evidencia-adjunta`}
                    icon={Paperclip}
                    eyebrow="Adjuntos"
                    title="Apoyo documental (opcional)"
                    subtitle={`${EVIDENCIA_ACCEPTED_FORMATS_LABEL}. Se sube al crear la acción.`}
                  >
                    <div className="space-y-3">
                      <input
                        id={`${formBaseId}-evidencia-file-input`}
                        ref={fileInputRef}
                        type="file"
                        accept={getAcceptedAccept()}
                        className="accion-form-evidencia-file-input hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleNewEvidenciaFile(file)
                          e.target.value = ''
                        }}
                      />
                      <div
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOverNew(true)
                        }}
                        onDragLeave={() => setDragOverNew(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOverNew(false)
                          const file = e.dataTransfer.files?.[0]
                          if (file) handleNewEvidenciaFile(file)
                        }}
                        className={`accion-form-evidencia-dropzone rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${dragOverNew ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20'}`}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          id={`${formBaseId}-evidencia-file-trigger`}
                          className="accion-form-evidencia-file-trigger h-10 w-full sm:w-auto"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="mr-2 h-4 w-4" />
                          Seleccionar archivo
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">o arrastra un archivo aquí</p>
                      </div>
                      {pendingNewEvidencias.length > 0 && (
                        <ul className="space-y-2">
                          {pendingNewEvidencias.map((f, i) => (
                            <li
                              key={`${f.name}-${i}`}
                              className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2"
                            >
                              {f.type.startsWith('image/') ? (
                                <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <button
                                type="button"
                                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-primary hover:underline"
                                onClick={() =>
                                  isPreviewableDocument({ fileName: f.name, contentType: f.type })
                                    ? openLocalFile(f)
                                    : downloadLocalFile(f)
                                }
                              >
                                {f.name}
                              </button>
                              {isPreviewableDocument({ fileName: f.name, contentType: f.type }) ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => openLocalFile(f)}
                                  aria-label="Abrir archivo"
                                  title="Abrir archivo"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={() => downloadLocalFile(f)}
                                aria-label="Descargar archivo"
                                title="Descargar archivo"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => setPendingNewEvidencias((p) => p.filter((_, j) => j !== i))}
                                aria-label="Quitar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AccionFormSection>
                </>
              ) : undefined
            }
          />
        {isEdit && accion && (
          <div className="accion-form-dialog-edit-extras mt-4 space-y-4 sm:mt-6 sm:space-y-5">
            <div
              id={`${formBaseId}-checklist-manage`}
              className="accion-form-dialog-checklist-manage border-t border-border/60 pt-4 sm:pt-5"
            >
              <AccionChecklistManage
                accionId={accion.id}
                currentUsuarioId={currentUser?.id ?? null}
                disabled={updateAccion.isPending}
                readOnly={!canAttemptChecklistContribution && !canManageChecklistStructure}
                canEditStructure={canManageChecklistStructure}
                canAddPoint={canAttemptChecklistContribution}
                canToggle={canAttemptChecklistContribution}
                responsableNames={responsableNames}
              />
            </div>
            <div
              id={`${formBaseId}-evidencias-section`}
              className="accion-form-dialog-evidencias border-t border-border/60 pt-4 sm:pt-5"
            >
              <AccionEvidenciasSection accionId={accion.id} readOnly={!isActionCreator} />
            </div>
            <div id={`${formBaseId}-comentarios`} className="accion-form-dialog-comentarios">
              <AccionComentarios
                accionId={accion.id}
                tituloAccion={accion.titulo_accion ?? ''}
                descripcionAccion={accion.descripcion_accion ?? ''}
                creadorId={accion.created_by}
                creadorNombre={userNameById(accion.created_by)}
                responsableId={accion.responsable}
                responsableNames={responsableNames}
              />
            </div>
          </div>
        )}
        </div>
        <div
          id={`${formBaseId}-dialog-footer`}
          className={cn(
            'accion-form-dialog-footer flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card/95 px-3 py-3 backdrop-blur-sm',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-5 sm:py-4 md:px-6'
          )}
        >
          {submitFooterErrors && submitFooterErrors.length > 0 ? (
            <div
              id={`${formBaseId}-submit-validation-summary`}
              role="alert"
              aria-live="assertive"
              className="order-first w-full rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-left text-xs text-destructive"
            >
              <p className="font-medium">No se puede guardar aún:</p>
              <ul className="mt-1.5 max-h-24 list-disc space-y-1 overflow-y-auto pl-4">
                {submitFooterErrors.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            id={`${formBaseId}-dialog-footer-actions`}
            className={cn(
              'accion-form-dialog-footer-actions grid w-full gap-2',
              footerActionsGridClass
            )}
          >
            {canDeleteAccion ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    id={`${formBaseId}-delete`}
                    className="accion-form-dialog-delete h-10 w-full gap-1.5 px-2 text-xs sm:h-9 sm:text-sm"
                    disabled={isMutating || isManualNotificationPending}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">Eliminar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar accion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta accion y sus datos relacionados se eliminaran. Esta operacion no se puede
                      deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteAccion.isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                      disabled={deleteAccion.isPending}
                      onClick={handleDeleteAccion}
                    >
                      {deleteAccion.isPending ? 'Eliminando...' : 'Eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {showEmailButton ? (
              <Button
                type="button"
                variant="outline"
                id={`${formBaseId}-send-email`}
                className="accion-form-dialog-send-email h-10 w-full gap-1.5 px-2 text-xs sm:h-9 sm:text-sm"
                onClick={handleSendActionEmail}
                disabled={isManualNotificationPending || isMutating || !accion.responsable}
                title={
                  accion.responsable
                    ? `Enviar correo a ${responsableNames[accion.responsable] ?? 'responsable asignado'}`
                    : 'Asigna un responsable para enviar correo'
                }
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{manualEmailPending ? 'Enviando…' : 'Correo'}</span>
              </Button>
            ) : null}
            {showTelegramButton ? (
              <Button
                type="button"
                variant="outline"
                id={`${formBaseId}-send-telegram`}
                className="accion-form-dialog-send-telegram h-10 w-full gap-1.5 px-2 text-xs sm:h-9 sm:text-sm"
                onClick={handleSendActionTelegram}
                disabled={isManualNotificationPending || isMutating || !telegramAction?.responsable}
                title={
                  telegramAction?.responsable
                    ? `Enviar Telegram a ${responsableNames[telegramAction.responsable] ?? 'responsable asignado'}`
                    : 'Asigna un responsable para enviar Telegram'
                }
              >
                <Send className="h-4 w-4 shrink-0" />
                <span className="truncate">{manualTelegramPending ? 'Enviando...' : 'Telegram'}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              id={`${formBaseId}-cancel`}
              className="accion-form-dialog-cancel h-10 w-full px-2 text-xs sm:h-9 sm:text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isMutating || isManualNotificationPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formBaseId}
              id={`${formBaseId}-submit`}
              variant="default"
              className="accion-form-dialog-submit h-10 w-full px-2 text-xs sm:h-9 sm:text-sm"
              disabled={isMutating || isManualNotificationPending}
            >
              {createAccion.isPending || updateAccion.isPending ? (
                'Guardando…'
              ) : (
                <>
                  <span className="sm:hidden">Guardar</span>
                  <span className="hidden sm:inline">Guardar acción</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
