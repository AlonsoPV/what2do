/**
 * Formulario de creacion/edicion de accion diaria alineado con Taskpool.
 */

import { useEffect, type ReactNode } from 'react'
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form'
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
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { isAnalystByRole } from '@/features/auth/lib/permissions'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import { DEFAULT_PRIORITY_NOMBRE } from '../utils/priorityLabels'
import { AccionFormField } from './AccionFormSection'
import { CatalogLoadError } from './form/CatalogLoadError'

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
  'flex h-10 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const textareaBase =
  'flex min-h-[104px] w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export interface AccionFormProps {
  defaultValues?: Partial<AccionFormInput> | null
  onSubmit: (values: AccionCreateInput) => void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
  readonlyStrategicFields?: boolean
  formId?: string
  onSubmitInvalid?: (messages: string[]) => void
  /** Extras opcionales; el checklist esta apagado desde el dialogo, se conserva para adjuntos. */
  validationExtras?: ReactNode
  onPrioridadChange?: (prioridad: string | undefined) => void
  accionPrioridadId?: string | null
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
  onPrioridadChange,
}: AccionFormProps) {
  void _onCancel
  void _isSubmitting
  void isEdit

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
  const { data: currentUser } = useCurrentUser()
  const isReadonly = readonlyStrategicFields || isAnalystByRole(currentUser?.rol)

  const form = useForm<AccionFormInput, unknown, AccionCreateInput>({
    resolver: zodResolver(accionCreateSchema) as Resolver<AccionFormInput, unknown, AccionCreateInput>,
    defaultValues: {
      no_actividad: '',
      titulo_accion: '',
      instrucciones_especificas: '',
      objetivo: '',
      responsable: '',
      fecha_inicio: todayWallClockCDMX(),
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

  useEffect(() => {
    form.setValue('tipo_accion', 'operativa')
    form.setValue('story_points', 0)
    form.setValue('sprint_id', null)
    form.setValue('responsable_bloqueo', null)
    if (!form.getValues('prioridad')) {
      form.setValue('prioridad', DEFAULT_PRIORITY_NOMBRE)
    }
  }, [form])

  useEffect(() => {
    onPrioridadChange?.(form.getValues('prioridad')?.trim() || DEFAULT_PRIORITY_NOMBRE)
  }, [form, onPrioridadChange])

  const fid = formId ?? 'accion-form'
  const fieldId = (name: string) => `${fid}-${name}`

  return (
    <form
      id={fid}
      onSubmit={form.handleSubmit(onSubmit, (errors) => {
        const msgs = collectAccionFormErrorMessages(errors)
        onSubmitInvalid?.(msgs.length > 0 ? msgs : ['Revisa los campos obligatorios.'])
      })}
      className="accion-form space-y-4"
      data-accion-form-mode={isEdit ? 'edit' : 'create'}
    >
      <fieldset className="space-y-4" disabled={isReadonly}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)]">
          <AccionFormField
            label="No. actividad"
            htmlFor={fieldId('no_actividad')}
            error={form.formState.errors.no_actividad?.message}
          >
            <Input
              id={fieldId('no_actividad')}
              {...form.register('no_actividad')}
              placeholder="Ej: TP-001"
              maxLength={40}
              className={inputBase}
            />
          </AccionFormField>

          <AccionFormField
            label="Titulo actividad"
            htmlFor={fieldId('titulo_accion')}
            required
            error={form.formState.errors.titulo_accion?.message}
          >
            <Input
              id={fieldId('titulo_accion')}
              {...form.register('titulo_accion', {
                maxLength: { value: 70, message: 'Maximo 70 caracteres' },
                onChange: () => form.trigger('titulo_accion'),
              })}
              placeholder="Ej: Revisar informe mensual"
              maxLength={70}
              className={inputBase}
            />
          </AccionFormField>
        </div>

        <AccionFormField
          label="Instrucciones específicas"
          htmlFor={fieldId('instrucciones_especificas')}
          required
          error={form.formState.errors.instrucciones_especificas?.message}
        >
          <textarea
            id={fieldId('instrucciones_especificas')}
            {...form.register('instrucciones_especificas')}
            placeholder="Describe qué hacer, cómo hacerlo y el resultado esperado."
            className={textareaBase}
          />
        </AccionFormField>

        <AccionFormField
          label="Objetivo"
          htmlFor={fieldId('objetivo')}
          error={form.formState.errors.objetivo?.message}
        >
          <textarea
            id={fieldId('objetivo')}
            {...form.register('objetivo')}
            placeholder="Resultado que esta actividad debe lograr."
            className={textareaBase}
          />
        </AccionFormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AccionFormField
            label="Area"
            htmlFor={fieldId('area')}
            error={form.formState.errors.area?.message}
          >
            {areasLoading && <p className="text-xs text-muted-foreground">Cargando areas...</p>}
            {areasError && (
              <CatalogLoadError
                message="No se pudo cargar areas."
                onRetry={() => void retryAreas()}
              />
            )}
            <Select
              value={form.watch('area') ?? '__none__'}
              onValueChange={(v) => form.setValue('area', v === '__none__' ? undefined : v)}
              disabled={areasLoading && areas.length === 0}
            >
              <SelectTrigger id={fieldId('area')} className={inputBase}>
                <SelectValue placeholder="Seleccionar area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin area</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.nombre}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccionFormField>

          <AccionFormField
            label="Responsable"
            htmlFor={fieldId('responsable')}
            required
            error={form.formState.errors.responsable?.message}
          >
            {usersLoading && <p className="text-xs text-muted-foreground">Cargando responsables...</p>}
            {usersError && (
              <CatalogLoadError
                message={`No se pudo cargar responsables.${usersErrorObj instanceof Error ? ` ${usersErrorObj.message}` : ''}`}
                onRetry={() => void retryUsers()}
              />
            )}
            <Select
              value={form.watch('responsable') ?? '__none__'}
              onValueChange={(v) => form.setValue('responsable', v === '__none__' ? '' : v)}
              disabled={usersLoading && users.length === 0}
            >
              <SelectTrigger id={fieldId('responsable')} className={inputBase}>
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AccionFormField
            label="Fecha de inicio"
            htmlFor={fieldId('fecha_inicio')}
            error={form.formState.errors.fecha_inicio?.message}
          >
            <Input
              id={fieldId('fecha_inicio')}
              type="date"
              {...form.register('fecha_inicio')}
              className={inputBase}
            />
          </AccionFormField>

          <AccionFormField
            label="Fecha de termino"
            htmlFor={fieldId('fecha')}
            required
            error={form.formState.errors.fecha?.message}
          >
            <Input
              id={fieldId('fecha')}
              type="date"
              min={isEdit ? undefined : todayWallClockCDMX()}
              {...form.register('fecha')}
              className={inputBase}
            />
          </AccionFormField>
        </div>

        <AccionFormField
          label="Evidencia"
          htmlFor={fieldId('evidencia_esperada')}
          required
          error={form.formState.errors.evidencia_esperada?.message}
        >
          <textarea
            id={fieldId('evidencia_esperada')}
            {...form.register('evidencia_esperada')}
            placeholder="Describe la evidencia esperada para comprobar la actividad."
            className={textareaBase}
          />
        </AccionFormField>
      </fieldset>

      <input type="hidden" {...form.register('hora_limite')} />
      <input type="hidden" {...form.register('prioridad')} />
      <input type="hidden" {...form.register('tipo_accion')} />

      {validationExtras ? <div className="space-y-4 border-t border-border/50 pt-4">{validationExtras}</div> : null}
    </form>
  )
}
