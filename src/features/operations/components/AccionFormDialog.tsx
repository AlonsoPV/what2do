/**
 * Diálogo para crear o editar una acción diaria.
 * Usa AccionForm + useCreateAccion / useUpdateAccion.
 * Al crear, permite adjuntar evidencias (PDF, PNG, JPG) que se suben tras crear la acción.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AccionForm } from './AccionForm'
import { AccionIdDisplay } from './AccionIdDisplay'
import { AccionEvidenciasSection } from './AccionEvidenciasSection'
import { AccionComentarios } from './AccionComentarios'
import { useCreateAccion, useUpdateAccion } from '../hooks'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { usersAdminService } from '@/features/users/services/users.service'
import { usersQueryKey } from '@/features/users/hooks/useUsers'
import { notificacionesService } from '@/services/notificaciones.service'
import {
  accionEvidenciasService,
  getAcceptedAccept,
  isAcceptedFile,
} from '@/services/accionEvidencias.service'
import { accionesService } from '@/services/acciones.service'
import { accionCheckpointsService } from '@/services/accionCheckpoints.service'
import type { AccionDiaria, ActionStatus, PrioridadNc } from '@/types'
import type { AccionCreateInput, AccionFormInput } from '../schemas/accion.schema'
import { parseDescripcionTriada } from '../utils/descripcionAccionTriada'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Paperclip, FileText, Image, Trash2 } from 'lucide-react'
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
import { catalogKpisService } from '@/features/catalogs/services/kpis.service'
import { kpiQueryKeys } from '@/features/kpi/kpiQueryKeys'
import { listGaps } from '@/features/kpi/services/gaps.service'
import {
  fetchAccionCatalogKpiIds,
  fetchAccionGapIds,
  syncAccionO2cLinks,
} from '@/services/accionLinks.service'

/** Fecha de hoy en YYYY-MM-DD */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
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
  const isEdit = !!accion?.id

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
    enabled: open && !!accion?.id,
    staleTime: 60_000,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingNewEvidencias, setPendingNewEvidencias] = useState<File[]>([])
  const [dragOverNew, setDragOverNew] = useState(false)
  const [checklistDrafts, setChecklistDrafts] = useState<LocalCheckpointDraft[]>([])
  /** Resumen de validación bajo los botones del pie (RHF/Zod y reglas del diálogo). */
  const [submitFooterErrors, setSubmitFooterErrors] = useState<string[] | null>(null)

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
    if (!open) return
    void Promise.allSettled([
      qc.prefetchQuery({
        queryKey: dropdownOptionsByCatalogKeyQueryKey('evidencia_esperada'),
        queryFn: () => fetchDropdownOptionsByCatalogKey('evidencia_esperada'),
      }),
      qc.prefetchQuery({
        queryKey: areasQueryKey({ activo: true }),
        queryFn: () => fetchAreas({ activo: true }),
      }),
      qc.prefetchQuery({
        queryKey: [...kpiQueryKeys.gaps, JSON.stringify({ activo: true })],
        queryFn: () => listGaps({ activo: true }),
      }),
      qc.prefetchQuery({
        queryKey: ['catalogs', 'kpis', { activo: true }],
        queryFn: () => catalogKpisService.list({ activo: true }),
      }),
      qc.prefetchQuery({
        queryKey: [...usersQueryKey, { activo: true }],
        queryFn: () => usersAdminService.list({ activo: true }),
      }),
    ])
  }, [open, qc])

  async function notifyResponsable(usuarioId: string, accionId: string, descripcion: string) {
    if (!usuarioId || !accionId) return
    try {
      await notificacionesService.create({
        usuario_id: usuarioId,
        tipo: 'responsable',
        payload: {
          titulo: 'Te asignaron como responsable',
          mensaje: descripcion?.slice(0, 200) ?? '',
          accion_id: accionId,
          asignador_id: currentUser?.id ?? null,
          asignador_nombre: currentUser?.nombre ?? null,
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

  function refreshActionViews() {
    qc.invalidateQueries({ queryKey: ['acciones'], refetchType: 'active' })
    qc.invalidateQueries({ queryKey: ACCION_CHECKPOINTS_KEY, refetchType: 'active' })
  }

  const defaultValues = useMemo((): Partial<AccionFormInput> | null => {
    if (!accion) {
      return {
        fecha: defaultFecha ?? todayISO(),
        titulo_accion: '',
        descripcion_como: '',
        descripcion_quiero: '',
        descripcion_para_que: '',
        hora_limite: '17:00',
        prioridad: 'P2_Media',
        gap_ids: [],
        catalog_kpi_ids: [],
        tipo_accion: 'operativa',
        story_points: 0,
        sprint_id: null,
      }
    }
    const tri = parseDescripcionTriada(accion.descripcion_accion)
    const merged = o2cLinksQuery.data
    const gap_ids = merged?.gap_ids ?? (accion.gap_id ? [accion.gap_id] : [])
    const catalog_kpi_ids =
      merged?.catalog_kpi_ids ?? (accion.catalog_kpi_id ? [accion.catalog_kpi_id] : [])
    return {
      fecha: accion.fecha,
      titulo_accion: accion.titulo_accion ?? '',
      descripcion_como: tri.descripcion_como,
      descripcion_quiero: tri.descripcion_quiero,
      descripcion_para_que: tri.descripcion_para_que,
      responsable: accion.responsable,
      hora_limite: accion.hora_limite?.slice(0, 5) ?? '17:00',
      evidencia_esperada: accion.evidencia_esperada,
      estado: accion.estado,
      prioridad: accion.prioridad,
      area: accion.area ?? undefined,
      gap_ids,
      catalog_kpi_ids,
      tipo_accion: accion.tipo_accion === 'sprint' ? 'sprint' : 'operativa',
      story_points:
        typeof accion.story_points === 'number' && Number.isFinite(accion.story_points)
          ? accion.story_points
          : Number(accion.story_points) || 0,
      sprint_id: accion.sprint_id ?? null,
    }
  }, [accion, defaultFecha, o2cLinksQuery.data])

  const handleSubmit = (values: AccionCreateInput) => {
    setSubmitFooterErrors(null)
    const gapIds = values.gap_ids ?? []
    const catalogKpiIds = values.catalog_kpi_ids ?? []
    const fecha = values.fecha ?? todayISO()
    const prioridad = (values.prioridad ?? 'P2_Media') as PrioridadNc
    const estado = (values.estado ?? 'Pendiente') as ActionStatus
    const payload: Partial<AccionDiaria> = {
      fecha,
      titulo_accion: (values.titulo_accion ?? '').trim().slice(0, 70),
      descripcion_accion: values.descripcion_accion,
      responsable: values.responsable,
      hora_limite: values.hora_limite,
      evidencia_esperada: values.evidencia_esperada,
      prioridad,
      estado,
      area: values.area ?? null,
      tipo_accion: values.tipo_accion ?? 'operativa',
      story_points: values.story_points ?? 0,
      gap_id: values.gap_id ?? null,
      catalog_kpi_id: values.catalog_kpi_id ?? null,
      sprint_id: values.sprint_id ?? null,
      ...(isEdit
        ? { updated_by: currentUser?.id ?? null }
        : { created_by: currentUser?.id ?? null }),
    }

    if (isEdit && accion) {
      const nuevoResponsable = payload.responsable ?? null
      const cambiaResponsable = nuevoResponsable && nuevoResponsable !== accion.responsable
      updateAccion.mutate(
        { id: accion.id, payload },
        {
          onSuccess: () => {
            if (cambiaResponsable && nuevoResponsable) {
              void notifyResponsable(nuevoResponsable, accion.id, payload.descripcion_accion ?? '')
            }
            toast.success('Accion actualizada correctamente')
            onOpenChange(false)
            onSuccess?.()

            void syncAccionO2cLinks(accion.id, {
              gapIds,
              catalogKpiIds,
            })
              .then(() =>
                Promise.allSettled([
                  qc.invalidateQueries({ queryKey: ['accion-o2c-links', accion.id] }),
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
                }))
              )
            )
          }

          if (responsable) {
            deferredOps.push(
              notifyResponsable(responsable, createdId, payload.descripcion_accion ?? '')
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
      toast.error('Solo PDF, PNG o JPG (máx. 10 MB)')
      return
    }
    setPendingNewEvidencias((prev) => [...prev, file].slice(0, 10))
  }

  const formBaseId = `${dialogId ?? 'accion-form-dialog'}-form`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={dialogId}
        className="accion-form-dialog max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden flex flex-col p-0 gap-0"
        data-accion-dialog-mode={isEdit ? 'edit' : 'create'}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {isEdit ? 'Editar acción' : 'Nueva acción'}
        </DialogTitle>
        <div
          id={`${formBaseId}-dialog-header`}
          className="accion-form-dialog-header shrink-0 border-b border-border/60 px-6 pr-12 py-4"
        >
          <h2 className="text-lg font-semibold tracking-tight" aria-hidden>
            {isEdit ? 'Editar acción' : 'Nueva acción'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? 'Actualiza los campos y guarda los cambios' : 'Completa los datos para crear la acción'}
          </p>
          {isEdit && accion && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">ID </span>
                <AccionIdDisplay id={accion.id} variant="full" />
              </p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                  accion.estado === 'Hecho' || accion.estado === 'Verificado'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : accion.estado === 'Bloqueado' || accion.estado === 'Retraso'
                      ? 'bg-destructive/10 text-destructive'
                      : accion.estado === 'En_Ejecucion' || accion.estado === 'Hoy'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                )}
              >
                {accion.estado}
              </span>
            </div>
          )}
        </div>
        <div
          id={`${formBaseId}-dialog-body`}
          className="accion-form-dialog-body flex-1 min-h-0 overflow-y-auto px-6 py-5"
        >
          <AccionForm
            key={`${accion?.id ?? 'new'}-${isEdit ? (o2cLinksQuery.isFetched ? 'o2c' : 'pending') : 'create'}`}
            formId={formBaseId}
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            onSubmitInvalid={(messages) => setSubmitFooterErrors(messages)}
            onCancel={() => onOpenChange(false)}
            isSubmitting={createAccion.isPending || updateAccion.isPending}
            isEdit={isEdit}
          />
          {!isEdit && (
            <div
              id={`${formBaseId}-checklist-draft`}
              className="accion-form-dialog-checklist mt-6 border-t border-border/60 pt-5"
            >
              <AccionChecklistEditor
                items={checklistDrafts}
                onChange={setChecklistDrafts}
                disabled={createAccion.isPending}
              />
            </div>
          )}
          {!isEdit && (
            <div
              id={`${formBaseId}-section-evidencia-adjunta`}
              className="accion-form-dialog-evidencia-adjunta mt-6 border-t border-border/60 pt-5"
            >
              <Card className="accion-form-section accion-form-section--evidencia-adjunta border-border/60 bg-muted/5">
                <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Evidencia adjunta (opcional)</h4>
                    <p className="text-xs text-muted-foreground">PDF, PNG o JPG (máx. 10 MB)</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
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
                    onDragOver={(e) => { e.preventDefault(); setDragOverNew(true) }}
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
                      className="accion-form-evidencia-file-trigger"
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
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
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
                </CardContent>
              </Card>
            </div>
          )}
        {isEdit && accion && (
          <>
            <div
              id={`${formBaseId}-checklist-manage`}
              className="accion-form-dialog-checklist-manage mt-6 border-t border-border/60 pt-5"
            >
              <AccionChecklistManage
                accionId={accion.id}
                currentUsuarioId={currentUser?.id ?? null}
                disabled={updateAccion.isPending}
                responsableNames={responsableNames}
              />
            </div>
            <div
              id={`${formBaseId}-evidencias-section`}
              className="accion-form-dialog-evidencias mt-6 border-t border-border/60 pt-5"
            >
              <AccionEvidenciasSection accionId={accion.id} />
            </div>
            <div
              id={`${formBaseId}-comentarios`}
              className="accion-form-dialog-comentarios mt-6 border-t border-border/60 pt-5"
            >
              <AccionComentarios
                accionId={accion.id}
                responsableId={accion.responsable}
                responsableNames={responsableNames}
              />
            </div>
          </>
        )}
        </div>
        <div
          id={`${formBaseId}-dialog-footer`}
          className="accion-form-dialog-footer flex shrink-0 flex-col gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6"
        >
          <div className="flex w-full justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              id={`${formBaseId}-cancel`}
              className="accion-form-dialog-cancel"
              onClick={() => onOpenChange(false)}
              disabled={createAccion.isPending || updateAccion.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formBaseId}
              id={`${formBaseId}-submit`}
              variant="default"
              className="accion-form-dialog-submit"
              disabled={createAccion.isPending || updateAccion.isPending}
            >
              {createAccion.isPending || updateAccion.isPending
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Crear acción'}
            </Button>
          </div>
          {submitFooterErrors && submitFooterErrors.length > 0 ? (
            <div
              id={`${formBaseId}-submit-validation-summary`}
              role="alert"
              aria-live="assertive"
              className="w-full rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-left text-xs text-destructive"
            >
              <p className="font-medium">No se puede guardar aún:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {submitFooterErrors.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
