/**
 * Formulario de creación/edición de acción diaria (spec §5.1, §6.1).
 * Diseño tipo app: secciones agrupadas, iconos, espaciado limpio.
 */

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  accionCreateSchema,
  type AccionCreateInput,
  type AccionFormInput,
} from '../schemas/accion.schema'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { useKpis } from '@/features/catalogs/hooks/useKpis'
import { useDropdownOptionsByKey } from '@/features/catalogs/hooks/useDropdownOptions'
import { useGaps } from '@/features/kpi/hooks/useGaps'
import { useSprints } from '../hooks/useSprint'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { isAnalystByRole } from '@/features/auth/lib/permissions'
import { InfoHint } from '@/components/InfoHint'
import { cn } from '@/lib/utils'
import { PRIORIDAD_NC } from '@/types'
import {
  ESFUERZO_ACCION_CONFIG,
  ESFUERZO_ACCION_OPTIONS,
  TIPO_ACCION_CONFIG,
  TIPO_ACCION_OPTIONS,
  STORY_POINTS_OPTIONS,
  type EsfuerzoAccion,
} from '../utils/tipoAccionConfig'
import { AccionImpactPreview } from './AccionImpactPreview'
import { SectionCardBody } from '@/components/SectionCard'
import { ChevronDown, FileText, User, FileCheck, Tags, Gauge } from 'lucide-react'

/** Mensajes de error de envío (Zod + RHF) para resumen fuera del scroll del formulario. */
function collectAccionFormErrorMessages(errors: FieldErrors<AccionFormInput>): string[] {
  const found: string[] = []
  const walk = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.length > 0) {
      found.push(o.message)
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === 'message' || k === 'type' || k === 'ref') continue
      if (v && typeof v === 'object') walk(v)
    }
  }
  walk(errors)
  return [...new Set(found)]
}

const inputBase =
  'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
const textareaBase =
  'flex min-h-[64px] w-full resize-y rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Valor interno del select cuando el catálogo no trae fila "otro" (evita colisión con `value` del catálogo).
 * El seed usa `value = 'otro'` en BD; no duplicar ese mismo `value` en otro SelectItem.
 */
const EVIDENCIA_OTRO_SPECIFY_INTERNAL = '__evidencia_otro__'

function catalogHasOtroOption(options: { value: string }[]): boolean {
  return options.some((o) => String(o.value).trim().toLowerCase() === 'otro')
}

/** Texto libre cuando no hay fila en catálogo o cuando la opción es "otro" (sintética o con value `otro` en BD). */
function evidenciaNeedsFreeText(
  selectValue: string,
  options: { value: string }[]
): boolean {
  if (selectValue === EVIDENCIA_OTRO_SPECIFY_INTERNAL) return true
  const opt = options.find((o) => o.value === selectValue)
  return !!opt && String(opt.value).trim().toLowerCase() === 'otro'
}

/** Texto del disparador del multi-select (lista desplegable). */
function o2cDropdownTriggerLabel(
  selected: { nombre: string }[],
  empty: string,
  pluralUnit: string
): string {
  if (selected.length === 0) return empty
  if (selected.length === 1) return selected[0].nombre
  return `${selected.length} ${pluralUnit}`
}

export interface AccionFormProps {
  defaultValues?: Partial<AccionFormInput> | null
  onSubmit: (values: AccionCreateInput) => void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
  /** Id del form para botón de envío externo (barra fija del diálogo). */
  formId?: string
  /** Si el envío falla por validación, se envían los mensajes (p. ej. pie del diálogo). */
  onSubmitInvalid?: (messages: string[]) => void
}

export function AccionForm({
  defaultValues,
  onSubmit,
  onCancel: _onCancel,
  isSubmitting: _isSubmitting = false,
  isEdit: _isEdit = false,
  formId,
  onSubmitInvalid,
}: AccionFormProps) {
  void _onCancel
  void _isSubmitting

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorObj,
    refetch: retryUsers,
  } = useUsers({ activo: true })
  const {
    data: areas = [],
    isLoading: areasLoading,
    isError: areasError,
    error: areasErrorObj,
    refetch: retryAreas,
  } = useAreas({ activo: true })
  const {
    data: gaps = [],
    isLoading: gapsLoading,
    isError: gapsError,
    error: gapsErrorObj,
    refetch: retryGaps,
  } = useGaps({ filters: { activo: true } })
  const { data: catalogKpis = [] } = useKpis({ activo: true })
  /** Catálogo dropdown con key 'evidencia_esperada': opciones para el select de evidencia esperada. */
  const {
    data: evidenciaOpciones = [],
    isLoading: evidenciaLoading,
    isFetching: evidenciaFetching,
    isError: evidenciaError,
    error: evidenciaErrorObj,
    refetch: retryEvidenciaCatalog,
  } = useDropdownOptionsByKey('evidencia_esperada')
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints()
  const { data: currentUser } = useCurrentUser()
  const isAnalyst = isAnalystByRole(currentUser?.rol)
  const [evidenciaSelect, setEvidenciaSelect] = useState<string>('__none__')
  const [esfuerzoSeleccionado, setEsfuerzoSeleccionado] = useState<EsfuerzoAccion>(() => {
    const pts = defaultValues?.story_points ?? 0
    if (pts >= 13) return 'automatizacion'
    if (pts >= 8) return 'dashboard'
    if (pts >= 5) return 'integracion'
    if (pts >= 3) return 'reporte'
    if (pts > 0) return 'configuracion'
    return 'otro'
  })
  const [descExpanded, setDescExpanded] = useState<boolean>(() => {
    const como = defaultValues?.descripcion_como ?? ''
    const quiero = defaultValues?.descripcion_quiero ?? ''
    const para = defaultValues?.descripcion_para_que ?? ''
    return como.length > 0 || quiero.length > 0 || para.length > 0
  })

  const form = useForm<AccionFormInput, unknown, AccionCreateInput>({
    resolver: zodResolver(accionCreateSchema) as Resolver<AccionFormInput, unknown, AccionCreateInput>,
    defaultValues: defaultValues ?? {
      titulo_accion: '',
      descripcion_como: '',
      descripcion_quiero: '',
      descripcion_para_que: '',
      responsable: '',
      fecha: new Date().toISOString().slice(0, 10),
      hora_limite: '17:00',
      evidencia_esperada: '',
      prioridad: 'P2_Media',
      area: undefined,
      gap_ids: [],
      catalog_kpi_ids: [],
      tipo_accion: 'operativa',
      story_points: 0,
      sprint_id: null,
    },
  })

  const gapById = useMemo(() => {
    const m = new Map<string, { area: string | null }>()
    for (const g of gaps) m.set(g.id, { area: g.area ?? null })
    return m
  }, [gaps])

  const gapIds = form.watch('gap_ids') ?? []
  const tipoSeleccionado = form.watch('tipo_accion') ?? 'operativa'
  const tipoConfig = TIPO_ACCION_CONFIG[tipoSeleccionado]
  const sprintId = form.watch('sprint_id')
  const storyPoints = form.watch('story_points') ?? 0
  const esEsfuerzoOtro = esfuerzoSeleccionado === 'otro'
  const hasSprints = sprints.length > 0
  const tipoAccionOptions = useMemo(
    () =>
      TIPO_ACCION_OPTIONS.filter((opt) => {
        if (opt.value === 'estrategica') return false
        if (opt.value === 'sprint') return hasSprints
        return true
      }),
    [hasSprints]
  )

  const selectedGaps = useMemo(
    () => gaps.filter((g) => gapIds.includes(g.id)),
    [gaps, gapIds]
  )

  useEffect(() => {
    if (tipoSeleccionado === 'sprint' && !sprintsLoading && !hasSprints) {
      form.setValue('tipo_accion', 'operativa')
      if (sprintId) form.setValue('sprint_id', null)
      return
    }
    if (tipoSeleccionado === 'operativa') {
      if (sprintId) form.setValue('sprint_id', null)
    }
  }, [form, hasSprints, sprintId, sprintsLoading, tipoSeleccionado])

  function toggleGap(id: string) {
    const cur = form.getValues('gap_ids') ?? []
    if (cur.includes(id)) {
      form.setValue('gap_ids', cur.filter((x) => x !== id))
      return
    }
    form.setValue('gap_ids', [...cur, id])
    const gapArea = gapById.get(id)?.area
    if (gapArea) form.setValue('area', gapArea)
  }

  const evidenciaSignature = evidenciaOpciones.map((o) => `${o.id}:${o.value}:${o.label}`).join('|')
  const hasCatalogOtro = catalogHasOtroOption(evidenciaOpciones)

  useEffect(() => {
    const val = (defaultValues?.evidencia_esperada ?? form.getValues('evidencia_esperada'))?.trim() ?? ''
    if (evidenciaOpciones.length === 0) {
      setEvidenciaSelect(val ? EVIDENCIA_OTRO_SPECIFY_INTERNAL : '__none__')
      return
    }
    const matchByLabel = evidenciaOpciones.find((o) => o.label === val)
    if (matchByLabel) {
      setEvidenciaSelect(matchByLabel.value)
      return
    }
    if (!val) {
      setEvidenciaSelect('__none__')
      return
    }
    const otroOpt = evidenciaOpciones.find((o) => String(o.value).trim().toLowerCase() === 'otro')
    setEvidenciaSelect(otroOpt ? otroOpt.value : EVIDENCIA_OTRO_SPECIFY_INTERNAL)
  }, [evidenciaSignature, defaultValues?.evidencia_esperada, form])

  useEffect(() => {
    const set = new Set(gapIds)
    const current = form.getValues('catalog_kpi_ids') ?? []
    const next = current.filter((id) => {
      const kpi = catalogKpis.find((k) => k.id === id)
      if (!kpi) return false
      if (!kpi.gap_id) return true
      return set.has(kpi.gap_id)
    })
    if (next.length !== current.length) form.setValue('catalog_kpi_ids', next)
  }, [gapIds, catalogKpis, form])

  const fid = formId ?? 'accion-form'
  const fieldId = (name: string) => `${fid}-${name}`

  const descPreviewLine =
    (form.watch('descripcion_como') ?? '').trim() ||
    (form.watch('descripcion_quiero') ?? '').trim() ||
    (form.watch('descripcion_para_que') ?? '').trim() ||
    ''

  return (
    <form
      id={fid}
      onSubmit={form.handleSubmit(onSubmit, (errors) => {
        const msgs = collectAccionFormErrorMessages(errors)
        onSubmitInvalid?.(msgs.length > 0 ? msgs : ['Revisa los campos obligatorios.'])
      })}
      className="accion-form space-y-5"
      data-accion-form-mode={_isEdit ? 'edit' : 'create'}
    >
      {/* Título (vista colapsada) */}
      <Card
        id={`${fid}-section-titulo`}
        className="accion-form-section accion-form-section--titulo border-border/60 bg-muted/5"
      >
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Título de la acción</h4>
            <p className="text-xs text-muted-foreground">Se muestra cuando la acción está colapsada (máx. 70 caracteres)</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Input
            id={fieldId('titulo_accion')}
            {...form.register('titulo_accion', {
              maxLength: { value: 70, message: 'Máximo 70 caracteres' },
              onChange: () => form.trigger('titulo_accion'),
            })}
            placeholder="Ej: Revisar informe mensual"
            maxLength={70}
            className={`accion-form-field accion-form-field-titulo_accion ${inputBase} h-10`}
          />
          <p className="text-xs text-muted-foreground">
            {(form.watch('titulo_accion') ?? '').length}/70
          </p>
          {((form.watch('titulo_accion') ?? '').length > 70 || form.formState.errors.titulo_accion) && (
            <p className="text-xs text-destructive">
              {form.formState.errors.titulo_accion?.message ?? 'Máximo 70 caracteres'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Descripción (formato Cómo / Quiero / Para qué) */}
      <div
        id={`${fid}-section-descripcion`}
        className="accion-form-section accion-form-section--descripcion overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
      >
        <button
          type="button"
          onClick={() => setDescExpanded((v) => !v)}
          className="flex w-full items-start justify-between gap-4 border-b border-border/50 px-5 py-4 text-left transition-colors hover:bg-muted/20 sm:px-6"
          aria-expanded={descExpanded}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Descripción
              </p>
              <h3 className="text-base font-semibold text-foreground">Descripción de la acción</h3>
              {!descExpanded && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {descPreviewLine ||
                    'Cómo, qué quiero lograr y para qué (opcional pero recomendado)'}
                </p>
              )}
              {descExpanded && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Responde en tres partes (cada una 5–400 caracteres).
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              descExpanded && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        {descExpanded && (
          <SectionCardBody className="space-y-4 pt-0">
            <div className="accion-form-field-group accion-form-field-group-descripcion_como space-y-2">
              <Label htmlFor={fieldId('descripcion_como')} className="text-xs font-medium text-foreground">
                ¿Cómo?
              </Label>
              <p className="text-xs text-muted-foreground">Cómo se llevará a cabo o qué proceso seguirás</p>
              <textarea
                id={fieldId('descripcion_como')}
                {...form.register('descripcion_como')}
                placeholder="Describe cómo…"
                rows={2}
                className={`accion-form-field accion-form-field-descripcion_como ${textareaBase}`}
              />
              {form.formState.errors.descripcion_como && (
                <p className="text-xs text-destructive">{form.formState.errors.descripcion_como.message}</p>
              )}
            </div>
            <div className="accion-form-field-group accion-form-field-group-descripcion_quiero space-y-2">
              <Label htmlFor={fieldId('descripcion_quiero')} className="text-xs font-medium text-foreground">
                ¿Quiero?
              </Label>
              <p className="text-xs text-muted-foreground">Qué resultado o cambio concreto buscas</p>
              <textarea
                id={fieldId('descripcion_quiero')}
                {...form.register('descripcion_quiero')}
                placeholder="Quiero que…"
                rows={2}
                className={`accion-form-field accion-form-field-descripcion_quiero ${textareaBase}`}
              />
              {form.formState.errors.descripcion_quiero && (
                <p className="text-xs text-destructive">{form.formState.errors.descripcion_quiero.message}</p>
              )}
            </div>
            <div className="accion-form-field-group accion-form-field-group-descripcion_para_que space-y-2">
              <Label htmlFor={fieldId('descripcion_para_que')} className="text-xs font-medium text-foreground">
                ¿Para qué?
              </Label>
              <p className="text-xs text-muted-foreground">Para qué sirve o qué impacto tendrá</p>
              <textarea
                id={fieldId('descripcion_para_que')}
                {...form.register('descripcion_para_que')}
                placeholder="Para que…"
                rows={2}
                className={`accion-form-field accion-form-field-descripcion_para_que ${textareaBase}`}
              />
              {form.formState.errors.descripcion_para_que && (
                <p className="text-xs text-destructive">{form.formState.errors.descripcion_para_que.message}</p>
              )}
            </div>
          </SectionCardBody>
        )}
      </div>

      {/* Responsable y fechas */}
      <Card
        id={`${fid}-section-responsable`}
        className="accion-form-section accion-form-section--responsable border-border/60 bg-muted/5"
      >
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Responsable y programación</h4>
            <p className="text-xs text-muted-foreground">Quién y cuándo</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="accion-form-grid-responsable-fechas grid gap-4 sm:grid-cols-3">
          <div className="accion-form-field-group accion-form-field-group-responsable space-y-2">
            <Label htmlFor={fieldId('responsable')} className="text-xs font-medium text-foreground">
              Responsable *
            </Label>
            {usersLoading && (
              <p className="text-xs text-muted-foreground">Cargando responsables…</p>
            )}
            {usersError && (
              <div className="accion-form-catalog-error accion-form-catalog-error-users rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-xs text-destructive">
                  No se pudo cargar el catálogo de responsables.
                  {usersErrorObj instanceof Error ? ` ${usersErrorObj.message}` : ''}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 px-2.5 text-xs"
                  onClick={() => void retryUsers()}
                >
                  Reintentar
                </Button>
              </div>
            )}
            <Select
              value={form.watch('responsable') ?? '__none__'}
              onValueChange={(v) => form.setValue('responsable', v === '__none__' ? '' : v)}
              disabled={usersLoading && users.length === 0}
            >
              <SelectTrigger
                id={fieldId('responsable')}
                className={`accion-form-field accion-form-field-responsable ${inputBase} h-10 border-input bg-muted/30`}
              >
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seleccionar responsable</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.responsable && (
              <p className="text-xs text-destructive">{form.formState.errors.responsable.message}</p>
            )}
          </div>
            <div className="accion-form-field-group accion-form-field-group-fecha space-y-2">
              <Label htmlFor={fieldId('fecha')} className="text-xs font-medium text-foreground">
                Día límite *
              </Label>
              <Input
                id={fieldId('fecha')}
                type="date"
                {...form.register('fecha')}
                className={`accion-form-field accion-form-field-fecha ${inputBase} h-10`}
              />
              {form.formState.errors.fecha && (
                <p className="text-xs text-destructive">{form.formState.errors.fecha.message}</p>
              )}
            </div>
            <div className="accion-form-field-group accion-form-field-group-hora_limite space-y-2">
              <Label htmlFor={fieldId('hora_limite')} className="text-xs font-medium text-foreground">
                Hora límite *
              </Label>
              <Input
                id={fieldId('hora_limite')}
                type="time"
                {...form.register('hora_limite')}
                step={60}
                className={`accion-form-field accion-form-field-hora_limite ${inputBase} h-10`}
              />
              {form.formState.errors.hora_limite && (
                <p className="text-xs text-destructive">{form.formState.errors.hora_limite.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clasificación */}
      <Card
        id={`${fid}-section-clasificacion`}
        className="accion-form-section accion-form-section--clasificacion border-border/60 bg-muted/5"
      >
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tags className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Clasificación y vinculación O2C</h4>
            <p className="text-xs text-muted-foreground">
              RUN mantiene la operacion; Sprint organiza CHANGE. La complejidad se captura por separado.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="accion-form-grid-clasificacion grid gap-4 sm:grid-cols-2">
            <div className="accion-form-field-group accion-form-field-group-tipo_accion space-y-2 sm:col-span-2">
              <Label className="text-xs font-medium text-foreground">Tipo de accion</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {tipoAccionOptions.map((opt) => {
                  const selected = tipoSeleccionado === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const nextTipo = opt.value === 'sprint' ? 'sprint' : 'operativa'
                        form.setValue('tipo_accion', nextTipo)
                        if (opt.value === 'operativa') form.setValue('sprint_id', null)
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                      )}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wide">
                        {opt.shortLabel}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium">{opt.label}</span>
                      <span
                        className={cn(
                          'mt-1 block text-xs leading-snug',
                          selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}
                      >
                        {opt.description}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!sprintsLoading && !hasSprints ? (
                <p className="text-xs text-muted-foreground">
                  La opcion Sprint aparece cuando exista al menos un sprint creado.
                </p>
              ) : null}
            </div>
            <div className="accion-form-field-group accion-form-field-group-prioridad space-y-2">
              <Label htmlFor={fieldId('prioridad')} className="text-xs font-medium text-foreground">
                Prioridad
              </Label>
              <Select
                value={form.watch('prioridad') ?? 'P2_Media'}
                onValueChange={(v) => form.setValue('prioridad', v as AccionFormInput['prioridad'])}
              >
                <SelectTrigger
                  id={fieldId('prioridad')}
                  className={`accion-form-field accion-form-field-prioridad ${inputBase} h-10 border-input bg-muted/30`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDAD_NC.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'P1_Critica' ? 'Crítica' : p === 'P2_Media' ? 'Media' : 'Baja'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="accion-form-field-group accion-form-field-group-area space-y-2">
              <Label htmlFor={fieldId('area')} className="text-xs font-medium text-foreground">
                Área
              </Label>
              {areasLoading && (
                <p className="text-xs text-muted-foreground">Cargando áreas…</p>
              )}
              {areasError && (
                <div className="accion-form-catalog-error accion-form-catalog-error-areas rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-xs text-destructive">
                    No se pudo cargar el catálogo de áreas.
                    {areasErrorObj instanceof Error ? ` ${areasErrorObj.message}` : ''}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 px-2.5 text-xs"
                    onClick={() => void retryAreas()}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              <Select
                value={form.watch('area') ?? '__none__'}
                onValueChange={(v) => form.setValue('area', v === '__none__' ? undefined : v)}
                disabled={areasLoading && areas.length === 0}
              >
                <SelectTrigger
                  id={fieldId('area')}
                  className={`accion-form-field accion-form-field-area ${inputBase} h-10 border-input bg-muted/30`}
                >
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin área</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.nombre}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tipoConfig.allowsSprint && hasSprints ? (
              <div className="accion-form-field-group accion-form-field-group-sprint space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-foreground">
                  Sprint {tipoConfig.requiresSprint ? '*' : '(opcional)'}
                </Label>
                <Select
                  value={form.watch('sprint_id') ?? '__none__'}
                  onValueChange={(v) => form.setValue('sprint_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger
                    id={fieldId('sprint_id')}
                    className={`accion-form-field accion-form-field-sprint ${inputBase} h-10 border-input bg-muted/30`}
                  >
                    <SelectValue placeholder="Selecciona sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {!tipoConfig.requiresSprint ? <SelectItem value="__none__">Sin sprint</SelectItem> : null}
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.sprint_id ? (
                  <p className="text-xs text-destructive">{form.formState.errors.sprint_id.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {tipoSeleccionado === 'sprint'
                      ? 'CHANGE: trabajo enfocado en un objetivo temporal.'
                      : 'Puede asociarse a un sprint si forma parte de una iniciativa.'}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div
            id={`${fid}-section-complejidad`}
            className="accion-form-subsection-complejidad space-y-4 border-t border-border/60 pt-4"
          >
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Gauge className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Complejidad
                </p>
                <h4 className="text-sm font-semibold text-foreground">Complejidad y esfuerzo</h4>
                <p className="text-xs text-muted-foreground">
                  Elige una complejidad para sugerir puntos. Usa Otro para ajustar el esfuerzo manualmente.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="accion-form-field-group accion-form-field-group-esfuerzo space-y-2">
                <Label htmlFor={fieldId('esfuerzo_accion')} className="text-xs font-medium text-foreground">
                  Complejidad
                </Label>
                <Select
                  value={esfuerzoSeleccionado}
                  onValueChange={(v) => {
                    const next = v as EsfuerzoAccion
                    setEsfuerzoSeleccionado(next)
                    const cfg = ESFUERZO_ACCION_CONFIG[next]
                    if (cfg.puntosSugerido > 0) form.setValue('story_points', cfg.puntosSugerido)
                  }}
                >
                  <SelectTrigger
                    id={fieldId('esfuerzo_accion')}
                    className={`accion-form-field accion-form-field-esfuerzo ${inputBase} h-10 border-input bg-muted/30`}
                  >
                    <SelectValue placeholder="Selecciona complejidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESFUERZO_ACCION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="font-medium">{opt.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {opt.puntosMin === opt.puntosMax
                            ? `${opt.puntosMin} pts`
                            : `${opt.puntosMin}-${opt.puntosMax} pts`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {esfuerzoSeleccionado && ESFUERZO_ACCION_CONFIG[esfuerzoSeleccionado] && (
                  <p className="truncate text-xs text-muted-foreground">
                    {ESFUERZO_ACCION_CONFIG[esfuerzoSeleccionado].description}
                  </p>
                )}
              </div>

              {esEsfuerzoOtro ? (
                  <div className="accion-form-field-group accion-form-field-group-story_points space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-medium text-foreground">Story points</Label>
                      <InfoHint text="Complejidad relativa (Fibonacci). En Otro no hay rango sugerido por tipo." />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Asigna el esfuerzo en puntos. RUN no contamina avance de sprint; Sprint si usa estos puntos.
                    </p>
                    <Controller
                      name="story_points"
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-1.5">
                          {STORY_POINTS_OPTIONS.map((pts) => {
                            const current = field.value ?? 0
                            return (
                              <button
                                key={pts}
                                type="button"
                                onClick={() => field.onChange(pts)}
                                className={cn(
                                  'h-9 w-9 rounded-lg border text-sm font-semibold transition-colors',
                                  current === pts
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background hover:border-primary/50'
                                )}
                                title={`${pts} pts`}
                              >
                                {pts}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    />
                    {form.formState.errors.story_points && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.story_points.message}
                      </p>
                    )}
                  </div>
              ) : null}
            </div>
          </div>

          {!isAnalyst ? (
          <div className="accion-form-grid-o2c space-y-4">
            <div className="accion-form-field-group accion-form-field-group-gap_ids space-y-2">
              <Label htmlFor={fieldId('gap_ids')} className="text-xs font-medium text-foreground">
                Brechas operativas a impactar
              </Label>
              <p id={fieldId('gap_ids-hint')} className="text-xs leading-relaxed text-muted-foreground">
                Vincula la accion con las brechas que contribuye a cerrar. El avance del gap alimenta el
                seguimiento del portafolio.
              </p>
              {gapsLoading && <p className="text-xs text-muted-foreground">Cargando brechas…</p>}
              {gapsError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-xs text-destructive">
                    No se pudo cargar el catálogo de brechas.
                    {gapsErrorObj instanceof Error ? ` ${gapsErrorObj.message}` : ''}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 px-2.5 text-xs"
                    onClick={() => void retryGaps()}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    id={fieldId('gap_ids')}
                    disabled={(gapsLoading && gaps.length === 0) || gaps.length === 0}
                    className={`accion-form-field accion-form-field-gap_ids ${inputBase} h-10 border-input bg-muted/30 font-normal justify-between gap-2`}
                    aria-label="Brechas operativas a impactar"
                    aria-describedby={fieldId('gap_ids-hint')}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {gaps.length === 0 && !gapsLoading
                        ? 'No hay brechas en catálogo'
                        : o2cDropdownTriggerLabel(selectedGaps, 'Elegir brechas…', 'brechas')}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="max-h-60 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
                  align="start"
                >
                  {gaps.map((g) => (
                    <DropdownMenuCheckboxItem
                      key={g.id}
                      checked={gapIds.includes(g.id)}
                      onCheckedChange={() => toggleGap(g.id)}
                    >
                      {g.nombre}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedGaps.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedGaps.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] text-foreground"
                    >
                      {g.nombre}
                    </span>
                  ))}
                </div>
              )}
              <AccionImpactPreview gapIds={gapIds} storyPoints={storyPoints} />
            </div>
          </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Evidencia */}
      <Card
        id={`${fid}-section-evidencia`}
        className="accion-form-section accion-form-section--evidencia border-border/60 bg-muted/5"
      >
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Evidencia esperada</h4>
            <p className="text-xs text-muted-foreground">Define qué se debe entregar al completar la acción</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {(evidenciaLoading || evidenciaFetching) && (
            <p className="text-xs text-muted-foreground">Cargando catálogo de evidencia…</p>
          )}
          {evidenciaError && (
            <div className="accion-form-catalog-error accion-form-catalog-error-evidencia rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive">
                No se pudo cargar el catálogo de evidencia.
                {evidenciaErrorObj instanceof Error ? ` ${evidenciaErrorObj.message}` : ''}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 px-2.5 text-xs"
                onClick={() => void retryEvidenciaCatalog()}
              >
                Reintentar
              </Button>
            </div>
          )}
          <Select
            value={evidenciaSelect}
            onValueChange={(v) => {
              setEvidenciaSelect(v)
              if (v === '__none__') form.setValue('evidencia_esperada', '')
              else if (v === EVIDENCIA_OTRO_SPECIFY_INTERNAL) form.setValue('evidencia_esperada', '')
              else {
                const opt = evidenciaOpciones.find((o) => o.value === v)
                if (opt) form.setValue('evidencia_esperada', opt.label)
              }
            }}
            disabled={evidenciaLoading && evidenciaOpciones.length === 0}
          >
            <SelectTrigger
              id={fieldId('evidencia_esperada')}
              className={`accion-form-field accion-form-field-evidencia_esperada ${inputBase} h-10 border-input bg-muted/30`}
            >
              <SelectValue placeholder="Tipo de evidencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccionar...</SelectItem>
              {evidenciaOpciones.map((o) => (
                <SelectItem key={o.id} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              {!hasCatalogOtro && (
                <SelectItem value={EVIDENCIA_OTRO_SPECIFY_INTERNAL}>Otro (especificar)</SelectItem>
              )}
            </SelectContent>
          </Select>
          {!evidenciaLoading && !evidenciaError && evidenciaOpciones.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay opciones configuradas para este catálogo. Puedes usar la opción "Otro".
            </p>
          )}
          {evidenciaNeedsFreeText(evidenciaSelect, evidenciaOpciones) && (
            <Input
              id={fieldId('evidencia_esperada_texto')}
              placeholder="Especificar (mín. 5 caracteres)"
              className={`accion-form-field accion-form-field-evidencia_esperada_texto ${inputBase} h-10`}
              {...form.register('evidencia_esperada')}
            />
          )}
          {form.formState.errors.evidencia_esperada && (
            <p className="text-xs text-destructive">{form.formState.errors.evidencia_esperada.message}</p>
          )}
        </CardContent>
      </Card>
    </form>
  )
}
