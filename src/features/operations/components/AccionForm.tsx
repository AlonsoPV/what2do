/**
 * Formulario de creación/edición de acción diaria.
 * Arquitectura en 3 bloques (acordeón): principal → impacto → evidencia/validación.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, type FieldErrors, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  accionCreateSchema,
  type AccionCreateInput,
  type AccionFormInput,
} from '../schemas/accion.schema'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { usePriorities } from '@/features/catalogs/hooks/usePriorities'
import { useKpis } from '@/features/catalogs/hooks/useKpis'
import { useDropdownOptionsByKey } from '@/features/catalogs/hooks/useDropdownOptions'
import { useGaps } from '@/features/kpi/hooks/useGaps'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { isAnalystByRole, isDirectionByRole } from '@/features/auth/lib/permissions'
import { cn } from '@/lib/utils'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import { STORY_POINTS_OPTIONS } from '../utils/tipoAccionConfig'
import { DEFAULT_PRIORITY_NOMBRE, priorityDisplayLabel } from '../utils/priorityLabels'
import type { Priority } from '@/features/catalogs/types/catalogs.types'
import { AccionFormField } from './AccionFormSection'
import { AccionFormBlock } from './form/AccionFormBlock'
import { CatalogSearchMultiSelect } from './form/CatalogSearchMultiSelect'
import { EvidenceOptionPicker } from './form/EvidenceOptionPicker'
import { CatalogLoadError } from './form/CatalogLoadError'
import { StoryPointsHelper } from './form/StoryPointsHelper'
import {
  CalendarClock,
  FileCheck,
  Target,
} from 'lucide-react'

function collectAccionFormErrorMessages(errors: FieldErrors<AccionFormInput>): string[] {
  const found: string[] = []
  const walk = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.length > 0) found.push(o.message)
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

const EVIDENCIA_OTRO_SPECIFY_INTERNAL = '__evidencia_otro__'

function catalogHasOtroOption(options: { value: string }[]): boolean {
  return options.some((o) => String(o.value).trim().toLowerCase() === 'otro')
}

function evidenciaNeedsFreeText(selectValue: string, options: { value: string }[]): boolean {
  if (selectValue === EVIDENCIA_OTRO_SPECIFY_INTERNAL) return true
  const opt = options.find((o) => o.value === selectValue)
  return !!opt && String(opt.value).trim().toLowerCase() === 'otro'
}

function ReadonlyValue({
  label,
  value,
}: {
  label: string
  value?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 min-h-5 text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground">Sin dato</span>}
      </div>
    </div>
  )
}

function ReadonlyList({
  label,
  values,
}: {
  label: string
  values: string[]
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex max-w-full rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-medium text-foreground"
            >
              <span className="truncate">{value}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Sin dato</p>
      )}
    </div>
  )
}

export interface AccionFormProps {
  defaultValues?: Partial<AccionFormInput> | null
  onSubmit: (values: AccionCreateInput) => void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
  readonlyStrategicFields?: boolean
  formId?: string
  onSubmitInvalid?: (messages: string[]) => void
  /** Checklist borrador y adjuntos opcionales (bloque 3, solo creación). */
  validationExtras?: ReactNode
}

export function AccionForm({
  defaultValues,
  onSubmit,
  onCancel: _onCancel,
  isSubmitting: _isSubmitting = false,
  isEdit = false,
  readonlyStrategicFields = false,
  formId,
  onSubmitInvalid,
  validationExtras,
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
    refetch: retryAreas,
  } = useAreas({ activo: true })
  const {
    data: priorities = [],
    isLoading: prioritiesLoading,
    isError: prioritiesError,
    refetch: retryPriorities,
  } = usePriorities({ activo: true })
  const { data: currentUser } = useCurrentUser()
  const isAnalyst = isAnalystByRole(currentUser?.rol)
  const canViewO2cImpactFields = !isAnalyst && !isDirectionByRole(currentUser?.rol)
  const {
    data: gaps = [],
    isLoading: gapsLoading,
    isError: gapsError,
    refetch: retryGaps,
  } = useGaps({ filters: isEdit ? undefined : { activo: true }, enabled: canViewO2cImpactFields })
  const {
    data: catalogKpis = [],
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: retryKpis,
  } = useKpis(isEdit ? {} : { activo: true }, { enabled: canViewO2cImpactFields })
  const {
    data: evidenciaOpciones = [],
    isLoading: evidenciaLoading,
    isFetching: evidenciaFetching,
    isError: evidenciaError,
    refetch: retryEvidenciaCatalog,
  } = useDropdownOptionsByKey('evidencia_esperada')
  const isEditProtectedReadonly = isEdit || readonlyStrategicFields || (isEdit && isAnalyst)

  const [evidenciaSelect, setEvidenciaSelect] = useState<string>('__none__')

  const [blocksOpen, setBlocksOpen] = useState({
    principal: true,
    impacto: isEdit,
    validacion: isEdit,
  })

  const form = useForm<AccionFormInput, unknown, AccionCreateInput>({
    resolver: zodResolver(accionCreateSchema) as Resolver<AccionFormInput, unknown, AccionCreateInput>,
    defaultValues: {
      titulo_accion: '',
      descripcion_modo: 'simple',
      descripcion_simple: '',
      descripcion_como: '',
      descripcion_quiero: '',
      descripcion_para_que: '',
      responsable: '',
      fecha: todayWallClockCDMX(),
      hora_limite: '17:00',
      evidencia_esperada: '',
      prioridad: DEFAULT_PRIORITY_NOMBRE,
      area: undefined,
      gap_ids: [],
      catalog_kpi_ids: [],
      tipo_accion: 'operativa',
      story_points: 0,
      sprint_id: null,
      responsable_bloqueo: null,
      ...defaultValues,
    },
  })

  const gapById = useMemo(() => {
    const m = new Map<string, { area: string | null }>()
    for (const g of gaps) m.set(g.id, { area: g.area ?? null })
    return m
  }, [gaps])

  const watchedGapIds = form.watch('gap_ids')
  const watchedCatalogKpiIds = form.watch('catalog_kpi_ids')
  const selectedStoryPoints = form.watch('story_points') ?? 0
  const gapIds = useMemo(() => watchedGapIds ?? [], [watchedGapIds])
  const catalogKpiIds = useMemo(() => watchedCatalogKpiIds ?? [], [watchedCatalogKpiIds])
  const prioridadSeleccionada = form.watch('prioridad')

  const priorityOptions = useMemo((): Priority[] => {
    const sorted = [...priorities].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    const nombre = (prioridadSeleccionada ?? '').trim()
    if (nombre && !sorted.some((p) => p.nombre === nombre)) {
      return [
        {
          id: `legacy-${nombre}`,
          nombre,
          descripcion: null,
          orden: 999,
          activo: false,
          created_at: '',
          updated_at: '',
        },
        ...sorted,
      ]
    }
    return sorted
  }, [priorities, prioridadSeleccionada])

  const defaultPrioridadNombre = useMemo(() => {
    const sorted = [...priorities].sort((a, b) => a.orden - b.orden)
    return (
      sorted.find((p) => p.nombre === DEFAULT_PRIORITY_NOMBRE)?.nombre ??
      sorted[0]?.nombre ??
      DEFAULT_PRIORITY_NOMBRE
    )
  }, [priorities])

  const gapSearchItems = useMemo(
    () =>
      gaps.map((g) => ({
        id: g.id,
        label: g.activo ? g.nombre : `${g.nombre} (inactivo)`,
        description: g.descripcion,
        code: g.id.slice(0, 8),
      })),
    [gaps]
  )

  const kpiSearchItems = useMemo(() => {
    const gapSet = new Set(gapIds)
    return catalogKpis
      .filter((k) => !k.gap_id || gapSet.has(k.gap_id))
      .map((k) => ({
        id: k.id,
        label: k.activo ? k.nombre : `${k.nombre} (inactivo)`,
        description: k.descripcion,
        code: k.tipo ?? k.unidad,
      }))
  }, [catalogKpis, gapIds])

  const principalSummary = useMemo(() => {
    const titulo = (form.watch('titulo_accion') ?? '').trim()
    const resp = users.find((u) => u.id === form.watch('responsable'))?.nombre
    const fecha = form.watch('fecha')
    if (!titulo && !resp) return undefined
    return [titulo || 'Sin título', resp, fecha].filter(Boolean).join(' · ')
  }, [form, users])

  useEffect(() => {
    if (prioritiesLoading || priorities.length === 0) return
    const current = form.getValues('prioridad')
    if (!current || !priorityOptions.some((p) => p.nombre === current)) {
      form.setValue('prioridad', defaultPrioridadNombre, { shouldValidate: true })
    }
  }, [prioritiesLoading, priorities.length, defaultPrioridadNombre, priorityOptions, form])

  useEffect(() => {
    form.setValue('descripcion_modo', 'simple')
  }, [form])

  /** Por ahora todas las acciones nuevas/editadas en formulario son RUN (operativa). */
  useEffect(() => {
    form.setValue('tipo_accion', 'operativa')
    form.setValue('sprint_id', null)
    form.setValue('responsable_bloqueo', null)
  }, [form])

  const setGapIds = useCallback(
    (ids: string[]) => {
      form.setValue('gap_ids', ids)
      const added = ids.find((id) => !gapIds.includes(id))
      if (added) {
        const gapArea = gapById.get(added)?.area
        if (gapArea) form.setValue('area', gapArea)
      }
    },
    [form, gapById, gapIds]
  )

  useEffect(() => {
    if (isEditProtectedReadonly) return
    const set = new Set(gapIds)
    const current = form.getValues('catalog_kpi_ids') ?? []
    const next = current.filter((id) => {
      const kpi = catalogKpis.find((k) => k.id === id)
      if (!kpi) return false
      if (!kpi.gap_id) return true
      return set.has(kpi.gap_id)
    })
    if (next.length !== current.length) form.setValue('catalog_kpi_ids', next)
  }, [gapIds, catalogKpis, form, isEditProtectedReadonly])

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
  }, [evidenciaSignature, evidenciaOpciones, defaultValues?.evidencia_esperada, form])

  const fid = formId ?? 'accion-form'
  const fieldId = (name: string) => `${fid}-${name}`

  const evidenceCards = useMemo(
    () =>
      evidenciaOpciones.map((o) => ({
        id: o.id,
        value: o.value,
        label: o.label,
      })),
    [evidenciaOpciones]
  )
  const readonlyResponsableNombre =
    users.find((u) => u.id === form.watch('responsable'))?.nombre ??
    form.watch('responsable') ??
    ''
  const readonlyGapLabels = gapIds.map(
    (id) => gapSearchItems.find((g) => g.id === id)?.label ?? id
  )
  const readonlyKpiLabels = catalogKpiIds.map(
    (id) => kpiSearchItems.find((k) => k.id === id)?.label ?? id
  )
  return (
    <form
      id={fid}
      onSubmit={form.handleSubmit(onSubmit, (errors) => {
        const msgs = collectAccionFormErrorMessages(errors)
        onSubmitInvalid?.(msgs.length > 0 ? msgs : ['Revisa los campos obligatorios.'])
      })}
      className="accion-form space-y-3 sm:space-y-4"
      data-accion-form-mode={isEdit ? 'edit' : 'create'}
    >
      <AccionFormBlock
        blockId={`${fid}-block-principal`}
        step={1}
        title="Información principal"
        subtitle="¿Qué se hará, quién lo hará y para cuándo?"
        icon={CalendarClock}
        expanded={blocksOpen.principal}
        onToggle={() => setBlocksOpen((b) => ({ ...b, principal: !b.principal }))}
        collapsedSummary={principalSummary}
        editProtected
      >
        {isEditProtectedReadonly ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadonlyValue label="Título de la acción" value={form.watch('titulo_accion')} />
            <ReadonlyValue label="Responsable de ejecutar" value={readonlyResponsableNombre} />
            <ReadonlyValue label="Fecha compromiso" value={form.watch('fecha')} />
            <ReadonlyValue label="Hora límite" value={form.watch('hora_limite')} />
            <ReadonlyValue label="Prioridad" value={priorityDisplayLabel(form.watch('prioridad') ?? '')} />
          </div>
        ) : (
        <fieldset className="space-y-4">
        <AccionFormField label="Título de la acción" htmlFor={fieldId('titulo_accion')} required>
          <Input
            id={fieldId('titulo_accion')}
            {...form.register('titulo_accion', {
              maxLength: { value: 70, message: 'Máximo 70 caracteres' },
              onChange: () => form.trigger('titulo_accion'),
            })}
            placeholder="Ej: Revisar informe mensual"
            maxLength={70}
            disabled={isEditProtectedReadonly}
            className={`${inputBase} h-10`}
          />
          <p className="text-xs text-muted-foreground">
            {(form.watch('titulo_accion') ?? '').length}/70
          </p>
          {form.formState.errors.titulo_accion && (
            <p className="text-xs text-destructive">{form.formState.errors.titulo_accion.message}</p>
          )}
        </AccionFormField>

        <AccionFormField
          label="Responsable de ejecutar"
          htmlFor={fieldId('responsable')}
          hint="Persona que ejecuta y cierra la acción."
          hintAsIcon
          required
          error={form.formState.errors.responsable?.message}
        >
          {usersLoading && <p className="text-xs text-muted-foreground">Cargando responsables…</p>}
          {usersError && (
            <CatalogLoadError
              message={`No se pudo cargar responsables.${usersErrorObj instanceof Error ? ` ${usersErrorObj.message}` : ''}`}
              onRetry={() => void retryUsers()}
            />
          )}
          <Select
            value={form.watch('responsable') ?? '__none__'}
            onValueChange={(v) => form.setValue('responsable', v === '__none__' ? '' : v)}
            disabled={isEditProtectedReadonly || (usersLoading && users.length === 0)}
          >
            <SelectTrigger id={fieldId('responsable')} className={`${inputBase} h-10`}>
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
        </AccionFormField>

        <div className="grid gap-3 min-[380px]:grid-cols-2 min-[380px]:gap-4">
          <AccionFormField
            label="Fecha compromiso"
            htmlFor={fieldId('fecha')}
            required
            error={form.formState.errors.fecha?.message}
          >
            <Input
              id={fieldId('fecha')}
              type="date"
              {...form.register('fecha')}
              disabled={isEditProtectedReadonly}
              className={`${inputBase} h-10`}
            />
          </AccionFormField>
          <AccionFormField
            label="Hora límite"
            htmlFor={fieldId('hora_limite')}
            required
            error={form.formState.errors.hora_limite?.message}
          >
            <Input
              id={fieldId('hora_limite')}
              type="time"
              {...form.register('hora_limite')}
              step={60}
              disabled={isEditProtectedReadonly}
              className={`${inputBase} h-10`}
            />
          </AccionFormField>
        </div>

        <AccionFormField label="Prioridad" htmlFor={fieldId('prioridad')} hintAsIcon hint="Según catálogo de prioridades.">
          {prioritiesLoading && <p className="text-xs text-muted-foreground">Cargando prioridades…</p>}
          {prioritiesError && (
            <CatalogLoadError
              message="No se pudo cargar el catálogo de prioridades."
              onRetry={() => void retryPriorities()}
            />
          )}
          <Select
            value={prioridadSeleccionada ?? defaultPrioridadNombre}
            onValueChange={(v) => form.setValue('prioridad', v, { shouldValidate: true })}
            disabled={isEditProtectedReadonly || prioritiesLoading || priorityOptions.length === 0}
          >
            <SelectTrigger id={fieldId('prioridad')} className={`${inputBase} h-10`}>
              <SelectValue placeholder="Selecciona prioridad" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p.id} value={p.nombre}>
                  {priorityDisplayLabel(p.nombre)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AccionFormField>
        </fieldset>
        )}
      </AccionFormBlock>

      <AccionFormBlock
        blockId={`${fid}-block-impacto`}
        step={2}
        title="Impacto estratégico"
        subtitle="Brechas, indicadores y estimación."
        icon={Target}
        expanded={blocksOpen.impacto}
        onToggle={() => setBlocksOpen((b) => ({ ...b, impacto: !b.impacto }))}
        editProtected
        collapsedSummary={
          [
            canViewO2cImpactFields && gapIds.length ? `${gapIds.length} brecha(s)` : null,
            canViewO2cImpactFields && catalogKpiIds.length ? `${catalogKpiIds.length} KPI` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
      >
        {isEditProtectedReadonly ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {canViewO2cImpactFields ? (
              <>
                <ReadonlyList label="Brecha que atiende" values={readonlyGapLabels} />
                <ReadonlyList label="Indicador impactado" values={readonlyKpiLabels} />
              </>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <ReadonlyValue label="Story points" value={String(selectedStoryPoints)} />
              <StoryPointsHelper points={selectedStoryPoints} />
            </div>
            <ReadonlyValue label="Área" value={form.watch('area')} />
          </div>
        ) : (
        <fieldset className="space-y-4">
        {/*
          Tipo de acción (RUN / Sprint / Estratégica / Desbloqueo) — oculto por ahora.
          Todas las acciones se registran como operativa (RUN).
        */}

        {canViewO2cImpactFields && (
          <>
            <AccionFormField label="Brecha que atiende" htmlFor={fieldId('gap_ids')}>
              {gapsLoading && <p className="text-xs text-muted-foreground">Cargando brechas…</p>}
              {gapsError && (
                <CatalogLoadError
                  message="No se pudo cargar el catálogo de brechas."
                  onRetry={() => void retryGaps()}
                />
              )}
              <CatalogSearchMultiSelect
                id={fieldId('gap_ids')}
                items={gapSearchItems}
                selectedIds={gapIds}
                onChange={setGapIds}
                placeholder="Buscar brecha por nombre o código…"
                emptyLabel="Sin brechas en catálogo"
                loading={gapsLoading}
                disabled={isEditProtectedReadonly || (gapsLoading && gaps.length === 0)}
              />
            </AccionFormField>

            <AccionFormField label="Indicador impactado" htmlFor={fieldId('catalog_kpi_ids')}>
              {kpisLoading && <p className="text-xs text-muted-foreground">Cargando indicadores…</p>}
              {kpisError && (
                <CatalogLoadError
                  message="No se pudo cargar el catálogo de KPIs."
                  onRetry={() => void retryKpis()}
                />
              )}
              <CatalogSearchMultiSelect
                id={fieldId('catalog_kpi_ids')}
                items={kpiSearchItems}
                selectedIds={catalogKpiIds}
                onChange={(ids) => form.setValue('catalog_kpi_ids', ids)}
                placeholder="Buscar KPI por nombre o tipo…"
                emptyLabel={
                  gapIds.length > 0 ? 'Sin KPIs para las brechas seleccionadas' : 'Buscar en catálogo'
                }
                loading={kpisLoading}
                disabled={isEditProtectedReadonly || (kpisLoading && catalogKpis.length === 0)}
              />
            </AccionFormField>
          </>
        )}

        <AccionFormField
          label="Story points"
          hint="Estima el esfuerzo relativo de la acción. Elige 0 si no aplica."
          hintAsIcon
        >
          <Controller
            name="story_points"
            control={form.control}
            render={({ field }) => (
              <div className="-mx-0.5 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible">
                {[0, ...STORY_POINTS_OPTIONS].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    disabled={isEditProtectedReadonly}
                    aria-pressed={(field.value ?? 0) === pts}
                    onClick={() => field.onChange(pts)}
                    className={cn(
                      'h-10 min-w-10 shrink-0 rounded-lg border px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-w-9',
                      (field.value ?? 0) === pts
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
                    )}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            )}
          />
          <StoryPointsHelper points={selectedStoryPoints} />
          {form.formState.errors.story_points && (
            <p className="text-xs text-destructive">{form.formState.errors.story_points.message}</p>
          )}
        </AccionFormField>

        <AccionFormField label="Área (opcional)" htmlFor={fieldId('area')} hintAsIcon hint="Puede autocompletarse al elegir brecha.">
          {areasLoading && <p className="text-xs text-muted-foreground">Cargando áreas…</p>}
          {areasError && (
            <CatalogLoadError
              message="No se pudo cargar áreas."
              onRetry={() => void retryAreas()}
            />
          )}
          <Select
            value={form.watch('area') ?? '__none__'}
            onValueChange={(v) => form.setValue('area', v === '__none__' ? undefined : v)}
            disabled={isEditProtectedReadonly || (areasLoading && areas.length === 0)}
          >
            <SelectTrigger id={fieldId('area')} className={`${inputBase} h-10`}>
              <SelectValue placeholder="Sin área" />
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
        </AccionFormField>
        </fieldset>
        )}
      </AccionFormBlock>

      <AccionFormBlock
        blockId={`${fid}-block-validacion`}
        step={3}
        title="Evidencia y validación"
        subtitle="Qué comprobará el cierre y cómo se describe el trabajo."
        icon={FileCheck}
        expanded={blocksOpen.validacion}
        onToggle={() => setBlocksOpen((b) => ({ ...b, validacion: !b.validacion }))}
        editProtected
      >
        {isEditProtectedReadonly ? (
          <div className="grid gap-3">
            <ReadonlyValue
              label="Evidencia esperada"
              value={form.watch('evidencia_esperada')}
            />
            {isEdit ? (
              <AccionFormField label="Descripción" htmlFor={fieldId('descripcion_simple')} required>
                <textarea
                  id={fieldId('descripcion_simple')}
                  {...form.register('descripcion_simple')}
                  placeholder="Describe la acción: qué implica, qué buscas lograr y para qué (mín. 15 caracteres)."
                  rows={4}
                  className={textareaBase}
                />
                {form.formState.errors.descripcion_simple && (
                  <p className="text-xs text-destructive">{form.formState.errors.descripcion_simple.message}</p>
                )}
              </AccionFormField>
            ) : (
              <ReadonlyValue label="Descripción" value={form.watch('descripcion_simple')} />
            )}
          </div>
        ) : (
        <>
        {(evidenciaLoading || evidenciaFetching) && (
          <p className="text-xs text-muted-foreground">Cargando catálogo de evidencia…</p>
        )}
        {evidenciaError && (
          <CatalogLoadError
            message="No se pudo cargar el catálogo de evidencia."
            onRetry={() => void retryEvidenciaCatalog()}
          />
        )}

        <AccionFormField
          label="¿Qué evidencia comprobará que se hizo?"
          required
          error={form.formState.errors.evidencia_esperada?.message}
        >
          {evidenceCards.length > 0 ? (
            <EvidenceOptionPicker
              options={evidenceCards}
              selectedValue={evidenciaSelect === '__none__' ? '' : evidenciaSelect}
              otherInternalValue={hasCatalogOtro ? undefined : EVIDENCIA_OTRO_SPECIFY_INTERNAL}
              disabled={evidenciaLoading && evidenciaOpciones.length === 0}
              onSelect={(value, label) => {
                setEvidenciaSelect(value)
                if (value === EVIDENCIA_OTRO_SPECIFY_INTERNAL) form.setValue('evidencia_esperada', '')
                else form.setValue('evidencia_esperada', label, { shouldValidate: true })
              }}
            />
          ) : (
            !evidenciaLoading &&
            !evidenciaError && (
              <p className="text-xs text-muted-foreground">
                Sin opciones en catálogo; describe la evidencia abajo.
              </p>
            )
          )}
          {evidenciaNeedsFreeText(evidenciaSelect, evidenciaOpciones) && (
            <Input
              id={fieldId('evidencia_esperada_texto')}
              placeholder="Especificar (mín. 5 caracteres)"
              className={`${inputBase} mt-2 h-10`}
              {...form.register('evidencia_esperada')}
            />
          )}
        </AccionFormField>

        <AccionFormField label="Descripción" htmlFor={fieldId('descripcion_simple')} required>
          <textarea
            id={fieldId('descripcion_simple')}
            {...form.register('descripcion_simple')}
            placeholder="Describe la acción: qué implica, qué buscas lograr y para qué (mín. 15 caracteres)."
            rows={4}
            className={textareaBase}
          />
          {form.formState.errors.descripcion_simple && (
            <p className="text-xs text-destructive">{form.formState.errors.descripcion_simple.message}</p>
          )}
        </AccionFormField>

        {validationExtras ? <div className="space-y-4 border-t border-border/50 pt-4">{validationExtras}</div> : null}
        </>
        )}
      </AccionFormBlock>
    </form>
  )
}
