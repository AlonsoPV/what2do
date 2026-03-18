/**
 * Formulario de creación/edición de acción diaria (spec §5.1, §6.1).
 * Diseño tipo app: secciones agrupadas, iconos, espaciado limpio.
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  accionCreateSchema,
  type AccionCreateInput,
} from '../schemas/accion.schema'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { useDropdownOptionsByKey } from '@/features/catalogs/hooks/useDropdownOptions'
import { PRIORIDAD_NC } from '@/types'
import { FileText, User, FileCheck, Tags } from 'lucide-react'

const inputBase =
  'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
const textareaBase =
  'flex min-h-[88px] w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

/** Valor en el catálogo evidencia_esperada para "Otro especificar" (texto libre). */
const EVIDENCIA_OTRO_VALUE = 'otro'

export interface AccionFormProps {
  defaultValues?: Partial<AccionCreateInput> | null
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
  const { data: users = [] } = useUsers({ activo: true })
  const { data: areas = [] } = useAreas({ activo: true })
  /** Catálogo dropdown con key 'evidencia_esperada': opciones para el select de evidencia esperada. */
  const { data: evidenciaOpciones = [] } = useDropdownOptionsByKey('evidencia_esperada')
  const [evidenciaSelect, setEvidenciaSelect] = useState<string>('__none__')

  const form = useForm<AccionCreateInput>({
    resolver: zodResolver(accionCreateSchema),
    defaultValues: defaultValues ?? {
      titulo_accion: '',
      descripcion_accion: '',
      responsable: '',
      fecha: new Date().toISOString().slice(0, 10),
      hora_limite: '17:00',
      evidencia_esperada: '',
      prioridad: 'P2_Media',
      area: undefined,
    },
  })

  useEffect(() => {
    const val = (defaultValues?.evidencia_esperada ?? form.getValues('evidencia_esperada'))?.trim() ?? ''
    if (evidenciaOpciones.length === 0) {
      setEvidenciaSelect(val ? EVIDENCIA_OTRO_VALUE : '__none__')
      return
    }
    const match = evidenciaOpciones.find((o) => o.label === val)
    setEvidenciaSelect(match ? match.value : val ? EVIDENCIA_OTRO_VALUE : '__none__')
  }, [evidenciaOpciones.length, defaultValues?.evidencia_esperada])

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Título (vista colapsada) */}
      <Card className="border-border/60 bg-muted/5">
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
            id="titulo_accion"
            {...form.register('titulo_accion', {
              maxLength: { value: 70, message: 'Máximo 70 caracteres' },
              onChange: () => form.trigger('titulo_accion'),
            })}
            placeholder="Ej: Revisar informe mensual"
            maxLength={70}
            className={inputBase + ' h-10'}
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

      {/* Descripción */}
      <Card className="border-border/60 bg-muted/5">
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Descripción</h4>
            <p className="text-xs text-muted-foreground">Detalle de la acción a realizar</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <textarea
            id="descripcion_accion"
            {...form.register('descripcion_accion')}
            placeholder="¿Qué debe hacerse? (10–500 caracteres)"
            rows={3}
            className={textareaBase}
          />
          {form.formState.errors.descripcion_accion && (
            <p className="text-xs text-destructive">{form.formState.errors.descripcion_accion.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Responsable y fechas */}
      <Card className="border-border/60 bg-muted/5">
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
          <div className="space-y-2">
            <Label htmlFor="responsable" className="text-xs font-medium text-muted-foreground">
              Responsable *
            </Label>
            <Select
              value={form.watch('responsable') ?? '__none__'}
              onValueChange={(v) => form.setValue('responsable', v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="responsable" className={inputBase + ' h-10 border-input bg-muted/30'}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha" className="text-xs font-medium text-muted-foreground">
                Día límite *
              </Label>
              <Input
                id="fecha"
                type="date"
                {...form.register('fecha')}
                className={inputBase + ' h-10'}
              />
              {form.formState.errors.fecha && (
                <p className="text-xs text-destructive">{form.formState.errors.fecha.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_limite" className="text-xs font-medium text-muted-foreground">
                Hora límite *
              </Label>
              <Input
                id="hora_limite"
                type="time"
                {...form.register('hora_limite')}
                step={60}
                className={inputBase + ' h-10'}
              />
              {form.formState.errors.hora_limite && (
                <p className="text-xs text-destructive">{form.formState.errors.hora_limite.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidencia */}
      <Card className="border-border/60 bg-muted/5">
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Evidencia esperada</h4>
            <p className="text-xs text-muted-foreground">Qué entregar al completar</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Select
            value={evidenciaSelect}
            onValueChange={(v) => {
              setEvidenciaSelect(v)
              if (v === '__none__') form.setValue('evidencia_esperada', '')
              else if (v === EVIDENCIA_OTRO_VALUE) form.setValue('evidencia_esperada', '')
              else {
                const opt = evidenciaOpciones.find((o) => o.value === v)
                if (opt) form.setValue('evidencia_esperada', opt.label)
              }
            }}
          >
            <SelectTrigger className={inputBase + ' h-10 border-input bg-muted/30'}>
              <SelectValue placeholder="Tipo de evidencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccionar...</SelectItem>
              {evidenciaOpciones.map((o) => (
                <SelectItem key={o.id} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {evidenciaSelect === EVIDENCIA_OTRO_VALUE && (
            <Input
              placeholder="Especificar (mín. 5 caracteres)"
              className={inputBase + ' h-10'}
              {...form.register('evidencia_esperada')}
            />
          )}
          {form.formState.errors.evidencia_esperada && (
            <p className="text-xs text-destructive">{form.formState.errors.evidencia_esperada.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Clasificación */}
      <Card className="border-border/60 bg-muted/5">
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tags className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Clasificación</h4>
            <p className="text-xs text-muted-foreground">Prioridad y área</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Prioridad</Label>
              <Select
                value={form.watch('prioridad') ?? 'P2_Media'}
                onValueChange={(v) => form.setValue('prioridad', v as AccionCreateInput['prioridad'])}
              >
                <SelectTrigger className={inputBase + ' h-10 border-input bg-muted/30'}>
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
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Área</Label>
              <Select
                value={form.watch('area') ?? '__none__'}
                onValueChange={(v) => form.setValue('area', v === '__none__' ? undefined : v)}
              >
                <SelectTrigger className={inputBase + ' h-10 border-input bg-muted/30'}>
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
        </CardContent>
      </Card>
    </form>
  )
}
