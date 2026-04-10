/**
 * Formulario de creación/edición de acción diaria (spec §5.1, §6.1).
 * Diseño tipo app: secciones agrupadas, iconos, espaciado limpio.
 */

import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { PRIORIDAD_NC } from '@/types'
import { ChevronDown, FileText, User, FileCheck, Tags, Link2 } from 'lucide-react'

const inputBase =
  'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
const textareaBase =
  'flex min-h-[88px] w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

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
}

export function AccionForm({
  defaultValues,
  onSubmit,
  onCancel: _onCancel,
  isSubmitting: _isSubmitting = false,
  isEdit: _isEdit = false,
  formId,
}: AccionFormProps) {
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
  const {
    data: catalogKpis = [],
    isLoading: catalogKpisLoading,
    isError: catalogKpisError,
    error: catalogKpisErrorObj,
    refetch: retryCatalogKpis,
  } = useKpis({ activo: true })
  /** Catálogo dropdown con key 'evidencia_esperada': opciones para el select de evidencia esperada. */
  const {
    data: evidenciaOpciones = [],
    isLoading: evidenciaLoading,
    isFetching: evidenciaFetching,
    isError: evidenciaError,
    error: evidenciaErrorObj,
    refetch: retryEvidenciaCatalog,
  } = useDropdownOptionsByKey('evidencia_esperada')
  const [evidenciaSelect, setEvidenciaSelect] = useState<string>('__none__')

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
    },
  })

  const gapById = useMemo(() => {
    const m = new Map<string, { area: string | null }>()
    for (const g of gaps) m.set(g.id, { area: g.area ?? null })
    return m
  }, [gaps])

  const gapIds = form.watch('gap_ids') ?? []
  const catalogKpiIds = form.watch('catalog_kpi_ids') ?? []
  const gapIdSet = useMemo(() => new Set(gapIds), [gapIds])

  const selectedGaps = useMemo(
    () => gaps.filter((g) => gapIds.includes(g.id)),
    [gaps, gapIds]
  )
  const selectedCatalogKpis = useMemo(
    () => catalogKpis.filter((k) => catalogKpiIds.includes(k.id)),
    [catalogKpis, catalogKpiIds]
  )

  const availableCatalogKpis = useMemo(() => {
    if (gapIds.length === 0) return catalogKpis
    return catalogKpis.filter((k) => !k.gap_id || gapIdSet.has(k.gap_id))
  }, [catalogKpis, gapIdSet, gapIds])

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

  function toggleCatalogKpi(id: string) {
    const cur = form.getValues('catalog_kpi_ids') ?? []
    if (cur.includes(id)) {
      form.setValue('catalog_kpi_ids', cur.filter((x) => x !== id))
      return
    }
    const kpi = catalogKpis.find((k) => k.id === id)
    if (kpi?.gap_id && !gapIdSet.has(kpi.gap_id)) {
      const gids = form.getValues('gap_ids') ?? []
      form.setValue('gap_ids', [...gids, kpi.gap_id])
      const gapArea = gapById.get(kpi.gap_id)?.area
      if (gapArea) form.setValue('area', gapArea)
    }
    form.setValue('catalog_kpi_ids', [...cur, id])
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

  return (
    <form
      id={fid}
      onSubmit={form.handleSubmit(onSubmit)}
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
      <Card
        id={`${fid}-section-descripcion`}
        className="accion-form-section accion-form-section--descripcion border-border/60 bg-muted/5"
      >
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Descripción de la acción</h4>
            <p className="text-xs text-muted-foreground">
              Responde en tres partes (cada una 5–400 caracteres)
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="accion-form-field-group accion-form-field-group-descripcion_como space-y-2">
            <Label htmlFor={fieldId('descripcion_como')} className="text-xs font-medium text-foreground">
              ¿Cómo?
            </Label>
            <p className="text-xs text-muted-foreground">Cómo se llevará a cabo o qué proceso seguirás</p>
            <textarea
              id={fieldId('descripcion_como')}
              {...form.register('descripcion_como')}
              placeholder="Describe cómo…"
              rows={3}
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
              rows={3}
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
              rows={3}
              className={`accion-form-field accion-form-field-descripcion_para_que ${textareaBase}`}
            />
            {form.formState.errors.descripcion_para_que && (
              <p className="text-xs text-destructive">{form.formState.errors.descripcion_para_que.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

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
          <div className="accion-form-field-group accion-form-field-group-responsable space-y-2">
            <Label htmlFor={fieldId('responsable')} className="text-xs font-medium text-muted-foreground">
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
          <div className="accion-form-grid-fechas grid gap-4 sm:grid-cols-2">
            <div className="accion-form-field-group accion-form-field-group-fecha space-y-2">
              <Label htmlFor={fieldId('fecha')} className="text-xs font-medium text-muted-foreground">
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
              <Label htmlFor={fieldId('hora_limite')} className="text-xs font-medium text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">Prioridad, área, gap y KPI de catálogo</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="accion-form-grid-clasificacion grid gap-4 sm:grid-cols-2">
            <div className="accion-form-field-group accion-form-field-group-prioridad space-y-2">
              <Label htmlFor={fieldId('prioridad')} className="text-xs font-medium text-muted-foreground">
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
              <Label htmlFor={fieldId('area')} className="text-xs font-medium text-muted-foreground">
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
          </div>
          <div className="accion-form-grid-o2c grid gap-4 sm:grid-cols-2">
            <div className="accion-form-field-group accion-form-field-group-gap_ids space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Brechas O2C (gaps) a impactar
              </Label>
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
                    aria-label="Brechas O2C a impactar"
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
            </div>
            <div className="accion-form-field-group accion-form-field-group-catalog_kpi_ids space-y-2">
              <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                KPIs de catálogo (O2C)
                <Link2 className="h-3.5 w-3.5" />
              </Label>
              {catalogKpisLoading && (
                <p className="text-xs text-muted-foreground">Cargando KPIs de catálogo…</p>
              )}
              {catalogKpisError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-xs text-destructive">
                    No se pudo cargar el catálogo de KPIs.
                    {catalogKpisErrorObj instanceof Error ? ` ${catalogKpisErrorObj.message}` : ''}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 px-2.5 text-xs"
                    onClick={() => void retryCatalogKpis()}
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
                    id={fieldId('catalog_kpi_ids')}
                    disabled={
                      (catalogKpisLoading && catalogKpis.length === 0) ||
                      availableCatalogKpis.length === 0
                    }
                    className={`accion-form-field accion-form-field-catalog_kpi_ids ${inputBase} h-10 border-input bg-muted/30 font-normal justify-between gap-2`}
                    aria-label="KPIs de catálogo O2C"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {availableCatalogKpis.length === 0 && !catalogKpisLoading
                        ? gapIds.length > 0
                          ? 'No hay KPIs para las brechas elegidas'
                          : 'No hay KPIs en catálogo'
                        : o2cDropdownTriggerLabel(
                            selectedCatalogKpis,
                            'Elegir KPIs…',
                            'KPIs'
                          )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="max-h-60 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
                  align="start"
                >
                  {availableCatalogKpis.map((k) => (
                    <DropdownMenuCheckboxItem
                      key={k.id}
                      checked={catalogKpiIds.includes(k.id)}
                      onCheckedChange={() => toggleCatalogKpi(k.id)}
                    >
                      {k.nombre}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground">
                Si eliges brechas, solo se listan KPIs de esas brechas (o sin brecha). Al marcar un KPI se
                añade su brecha si faltaba.
              </p>
            </div>
          </div>
          {(selectedGaps.length > 0 || selectedCatalogKpis.length > 0) && (
            <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2 text-xs">
              <p className="mb-1 font-medium text-foreground">Resumen de vinculación</p>
              <div className="flex flex-wrap gap-2">
                {selectedGaps.map((g) => (
                  <Badge key={g.id} variant="outline" className="text-foreground">
                    Gap: {g.nombre}
                  </Badge>
                ))}
                {selectedCatalogKpis.map((k) => (
                  <Badge key={k.id} variant="outline" className="text-foreground">
                    KPI: {k.nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
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
