import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useGaps } from '@/features/kpi/hooks/useGaps'
import { useUsers } from '@/features/users/hooks/useUsers'
import {
  kpiFormSchema,
  type KpiFormValues,
  KPI_UNITS,
  KPI_TYPES,
  KPI_PERIODICITIES,
  KPI_CALC_TYPES,
} from '../schemas/kpi.schema'

interface KpiFormProps {
  defaultValues?: Partial<KpiFormValues> | null
  onSubmit: (values: KpiFormValues) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const sectionClass = 'space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4'
const sectionTitleClass = 'text-sm font-semibold text-foreground'

export function KpiForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: KpiFormProps) {
  const { data: gaps = [] } = useGaps()
  const { data: users = [] } = useUsers({ activo: true })

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: defaultValues ?? {
      nombre: '',
      descripcion: undefined,
      unidad: 'porcentaje',
      tipo: 'manual',
      meta_objetivo: null,
      periodicidad: 'mensual',
      orden: 0,
      activo: true,
      gap_id: null,
      weight: null,
      baseline: null,
      target_m3: null,
      target_m6: null,
      target_m12: null,
      target_m18: null,
      calc_type: 'maximize',
      in_global_portfolio: true,
      threshold_green: null,
      threshold_yellow: null,
      owner_usuario: null,
    },
  })
  const selectedGapId = form.watch('gap_id')

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-h-[min(85vh,720px)] space-y-6 overflow-y-auto pr-1"
    >
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Identidad</h3>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" {...form.register('nombre')} placeholder="Nombre del KPI" />
          {form.formState.errors.nombre && (
            <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            {...form.register('descripcion')}
            placeholder="Opcional"
            rows={2}
            className={cn(
              'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Unidad</Label>
            <Select
              value={form.watch('unidad')}
              onValueChange={(v) => form.setValue('unidad', v as KpiFormValues['unidad'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KPI_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo (catálogo)</Label>
            <Select
              value={form.watch('tipo')}
              onValueChange={(v) => form.setValue('tipo', v as KpiFormValues['tipo'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KPI_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meta_objetivo">Meta objetivo (legacy)</Label>
            <Input
              id="meta_objetivo"
              type="number"
              step="any"
              {...form.register('meta_objetivo', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Periodicidad</Label>
            <Select
              value={form.watch('periodicidad')}
              onValueChange={(v) => form.setValue('periodicidad', v as KpiFormValues['periodicidad'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KPI_PERIODICITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="orden">Orden</Label>
            <Input id="orden" type="number" {...form.register('orden')} min={0} />
          </div>
          <label className="flex items-center gap-2 pt-8">
            <input
              type="checkbox"
              {...form.register('activo')}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm font-medium">Activo</span>
          </label>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Gap y portafolio O2C</h3>
        <p className="text-xs text-muted-foreground">
          Los KPIs en el portafolio global deben tener gap y la suma de pesos de los activos en portfolio
          debe ser 1.0 (validación en base de datos).
        </p>
        <div className="space-y-2">
          <Label>Gap</Label>
          <Select
            value={form.watch('gap_id') ?? '__none__'}
            onValueChange={(v) => form.setValue('gap_id', v === '__none__' ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin gap" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin gap</SelectItem>
              {gaps.map((g) => (
                <SelectItem key={g.id} value={g.id} disabled={!g.activo && selectedGapId !== g.id}>
                  {g.nombre}{g.activo ? '' : ' (inactivo)'}
                  {g.area ? ` · ${g.area}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.gap_id && (
            <p className="text-sm text-destructive">{form.formState.errors.gap_id.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Peso (0–1)</Label>
          <Input
            id="weight"
            type="number"
            step="0.0001"
            {...form.register('weight', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.watch('in_global_portfolio')}
            onChange={(e) => form.setValue('in_global_portfolio', e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm font-medium">Incluir en portafolio global</span>
        </label>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Cálculo de cumplimiento</h3>
        <div className="space-y-2">
          <Label>Modo de cálculo</Label>
          <Select
            value={form.watch('calc_type') ?? 'maximize'}
            onValueChange={(v) => form.setValue('calc_type', v as KpiFormValues['calc_type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KPI_CALC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            maximize/minimize usan baseline y meta (M6/M12/M18). binary: valor medido igual a la meta
            efectiva → 100% cumplimiento.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="baseline">Baseline</Label>
            <Input
              id="baseline"
              type="number"
              step="any"
              {...form.register('baseline', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_m18">Meta M18</Label>
            <Input
              id="target_m18"
              type="number"
              step="any"
              {...form.register('target_m18', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="target_m3">Meta M3</Label>
            <Input
              id="target_m3"
              type="number"
              step="any"
              {...form.register('target_m3', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_m6">Meta M6</Label>
            <Input
              id="target_m6"
              type="number"
              step="any"
              {...form.register('target_m6', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="target_m12">Meta M12</Label>
            <Input
              id="target_m12"
              type="number"
              step="any"
              {...form.register('target_m12', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Con <code className="rounded bg-muted px-1">VITE_O2C_PROGRAM_START</code> (fecha ISO{' '}
          <code className="rounded bg-muted px-1">YYYY-MM-DD</code>, primer día del primer mes del programa O2C)
          se calcula el mes 1–18 y la meta activa en documento (M3 en 1–3, M6 en 4–6, M12 en 7–12, M18 en 13–18).
          Sin esa variable, la vista documento usa solo M18.
        </p>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Semáforo (sobre cumplimiento 0–1)</h3>
        <p className="text-xs text-muted-foreground">
          Dejar vacío para usar 0.85 (verde) y 0.65 (amarillo). Verde ≥ umbral verde; amarillo ≥ umbral
          amarillo; debajo = rojo.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="threshold_green">Umbral verde (mín.)</Label>
            <Input
              id="threshold_green"
              type="number"
              step="0.01"
              min={0}
              max={1}
              {...form.register('threshold_green', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
            {form.formState.errors.threshold_green && (
              <p className="text-sm text-destructive">{form.formState.errors.threshold_green.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold_yellow">Umbral amarillo (mín.)</Label>
            <Input
              id="threshold_yellow"
              type="number"
              step="0.01"
              min={0}
              max={1}
              {...form.register('threshold_yellow', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Responsable</h3>
        <div className="space-y-2">
          <Label>Usuario responsable (KPI)</Label>
          <Select
            value={form.watch('owner_usuario') ?? '__none__'}
            onValueChange={(v) => form.setValue('owner_usuario', v === '__none__' ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
